"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BROADCAST_DATE_LABEL,
  CHANNELS,
  Calibration,
  Durations,
  applyCalibration,
  parseClock,
} from "@/lib/tv/schedule";
import { loadCalibration } from "@/lib/tv/calibration";
import { broadcastSecondsOfDay, formatClock } from "@/lib/tv/clock";
import { ChannelTile } from "./ChannelTile";
import { TimeControls } from "./TimeControls";
import { TimelinePanel } from "./TimelinePanel";
import { PEOPLE } from "@/lib/tv/timeline";

// Temporary: shows a bar under the TV for moving the clock while checking the sync.
const SHOW_TIME_CONTROLS = true;

const DURATIONS_STORAGE_KEY = "tv-video-durations";
// Per-channel fine-tuning set from the time bar, in seconds, kept in this browser.
const SHIFTS_STORAGE_KEY = "tv-channel-shifts";
const DAY = 24 * 3600;

function loadShifts(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(SHIFTS_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function loadDurations(): Durations {
  try {
    return JSON.parse(window.localStorage.getItem(DURATIONS_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

// Tiles are only ever repositioned, never re-mounted, so the embedded players
// keep playing while switching between split view and a single channel.
function tileStyle(index: number, focusedIndex: number | null): CSSProperties {
  if (focusedIndex === null) {
    return {
      right: `${(index % 2) * 50}%`,
      top: `${Math.floor(index / 2) * 50}%`,
      width: "50%",
      height: "50%",
      zIndex: 1,
    };
  }
  // One channel enlarged: the other three sit in a row above it, so they never
  // cover it. Both keep the screen's 16:9 shape.
  if (index === focusedIndex) {
    return { right: "12.5%", top: "24%", width: "75%", height: "75%", zIndex: 1 };
  }
  const slot = index < focusedIndex ? index : index - 1;
  return { right: `${16.5 + slot * 23}%`, top: "1.5%", width: "21%", height: "21%", zIndex: 2 };
}

export function TvScreen() {
  const [powered, setPowered] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  // The one channel whose sound is on; the others keep playing muted.
  const [audio, setAudio] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  // Subtitles of the recordings; off by default so the split screen stays clean.
  const [captions, setCaptions] = useState(false);
  // Full screen: the browser's own when it allows it for the screen element,
  // otherwise the screen is stretched over the window (e.g. iPhone).
  const screenRef = useRef<HTMLDivElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const isFullscreen = nativeFullscreen || pseudoFullscreen;
  const [nowSec, setNowSec] = useState<number | null>(null);
  const [previewTime, setPreviewTime] = useState<string | null>(null);
  // Video lengths reported by the players; they place the parts that follow.
  const [durations, setDurations] = useState<Durations>({});
  // Anchors set on /tv/calibrate in this browser, applied on top of the schedule.
  const [calibration, setCalibration] = useState<Calibration>({});
  const channels = useMemo(() => applyCalibration(CHANNELS, calibration), [calibration]);
  const offsetRef = useRef(0);
  const [shifted, setShifted] = useState(false);

  const reportDuration = useCallback((key: string, seconds: number) => {
    setDurations((current) => {
      if (Math.abs((current[key] ?? 0) - seconds) < 1) return current;
      const next = { ...current, [key]: seconds };
      try {
        window.localStorage.setItem(DURATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const getNow = useCallback(() => (broadcastSecondsOfDay() + offsetRef.current + 86400) % 86400, []);

  const [localShifts, setLocalShifts] = useState<Record<string, number>>({});
  const shiftOf = useCallback(
    (index: number) => {
      const channel = channels[index];
      return (channel.kind === "video" ? (channel.shift ?? 0) : 0) + (localShifts[channel.number] ?? 0);
    },
    [channels, localShifts],
  );
  // Each channel runs on the shared clock plus its own fine-tuning.
  const channelClocks = useMemo(
    () => channels.map((_, index) => () => (getNow() + shiftOf(index) + DAY) % DAY),
    [channels, getNow, shiftOf],
  );

  const nudgeChannel = useCallback((number: string, delta: number | null) => {
    setLocalShifts((current) => {
      const next = { ...current };
      if (delta === null) delete next[number];
      else next[number] = (next[number] ?? 0) + delta;
      try {
        window.localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setClock = useCallback(
    (secondsOfDay: number) => {
      offsetRef.current = secondsOfDay - broadcastSecondsOfDay();
      setShifted(true);
      setNowSec(getNow());
    },
    [getNow],
  );

  const resetClock = useCallback(() => {
    offsetRef.current = 0;
    setShifted(false);
    setPreviewTime(null);
    setNowSec(getNow());
  }, [getNow]);

  useEffect(() => {
    // ?time=HH:MM starts the clock at another time of day, for previewing.
    const requested = new URLSearchParams(window.location.search).get("time");
    if (requested && /^\d{1,2}:\d{2}(:\d{2})?$/.test(requested)) {
      offsetRef.current = parseClock(requested) - broadcastSecondsOfDay();
    }
    const tick = () => setNowSec(getNow());
    const frame = requestAnimationFrame(() => {
      setDurations(loadDurations());
      setCalibration(loadCalibration());
      setLocalShifts(loadShifts());
      tick();
      if (requested) {
        setPreviewTime(requested);
        setShifted(true);
      }
    });
    const id = window.setInterval(tick, 500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(id);
    };
  }, [getNow]);

  const enlarge = useCallback((index: number) => {
    setPowered(true);
    setFocused(index);
    setAudio(index);
  }, []);

  // In split view a click switches the sound to that channel (or mutes it
  // again); on a thumbnail it switches the enlarged channel.
  const pick = useCallback(
    (index: number) => {
      setPowered(true);
      if (focused === null) setAudio((current) => (current === index ? null : index));
      else enlarge(index);
    },
    [focused, enlarge],
  );

  const toggleFullscreen = useCallback(() => {
    const el = screenRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    setPowered(true);
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else doc.webkitExitFullscreen?.();
      return;
    }
    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }
    if (el.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen().catch(() => setPseudoFullscreen(true));
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      setPseudoFullscreen(true);
    }
  }, [pseudoFullscreen]);

  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setNativeFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= String(CHANNELS.length)) pick(Number(e.key) - 1);
      else if (e.key === "Escape" && pseudoFullscreen) setPseudoFullscreen(false);
      else if (e.key === "Escape" || e.key === "0") setFocused(null);
      else if (e.key.toLowerCase() === "m") setSoundOn((s) => !s);
      else if (e.key.toLowerCase() === "c") setCaptions((c) => !c);
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick, toggleFullscreen, pseudoFullscreen]);

  return (
    <main
      dir="rtl"
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[radial-gradient(ellipse_at_top,#2a2522,#0c0b0a_70%)] px-4 py-6 text-white"
    >
      {/* Page clock: the same broadcast clock the channels and panels follow. */}
      <header className="flex flex-col items-center gap-0.5 text-center">
        <time
          aria-label="השעה בשידור"
          className="font-mono text-4xl font-bold tabular-nums tracking-wider text-white drop-shadow sm:text-5xl"
        >
          {nowSec === null ? "--:--:--" : formatClock(nowSec)}
        </time>
        <span className="text-sm text-neutral-400">{BROADCAST_DATE_LABEL}</span>
      </header>

      {/* Golan beside the TV on the right, Netanyahu on the left; below it on narrow screens. */}
      <div className="flex w-full max-w-[1600px] flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-5">
      <TimelinePanel person={PEOPLE[0]} nowSec={nowSec} className="order-2 lg:order-none" />
      <div
        className="order-1 w-full lg:order-none lg:min-w-0 lg:flex-1"
        style={{
          maxWidth: `min(100%, calc((100dvh - ${SHOW_TIME_CONTROLS ? 460 : 310}px) * 16 / 9))`,
          minWidth: "min(100%, 320px)",
        }}
      >
        {/* TV set */}
        <div className="rounded-[22px] border border-neutral-700/60 bg-gradient-to-b from-neutral-800 to-neutral-950 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[30px] sm:p-4">
          <div
            ref={screenRef}
            className={`tv-screen relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-black sm:rounded-xl ${
              pseudoFullscreen ? "tv-screen-pseudo" : ""
            }`}
          >
            <div className="tv-screen-inner relative h-full w-full">
            <div className={`absolute inset-0 ${powered ? "tv-power-on" : ""}`}>
              {channels.map((channel, index) => (
                <ChannelTile
                  key={channel.number}
                  channel={channel}
                  nowSec={nowSec === null ? null : (nowSec + shiftOf(index) + DAY) % DAY}
                  getNow={channelClocks[index]}
                  durations={durations}
                  onDuration={reportDuration}
                  powered={powered}
                  muted={!soundOn || audio !== index}
                  captions={captions}
                  focused={focused === index}
                  thumbnail={focused !== null && focused !== index}
                  style={tileStyle(index, focused)}
                  onSelect={() => pick(index)}
                  onEnlarge={() => enlarge(index)}
                />
              ))}
            </div>

            <div className="tv-glass pointer-events-none absolute inset-0 z-30" />

            {!powered && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 p-4 text-center">
                <p className="text-lg font-bold sm:text-3xl">ארבעה ערוצים. אותו רגע.</p>
                <p className="max-w-md text-xs text-white/70 sm:text-base">
                  מה ששודר בכאן 11, 12, 13 ו-14 ב-7 באוקטובר 2023 – בדיוק בשעה הזו. אי אפשר להריץ קדימה או
                  אחורה, רק לצפות במה שמשודר עכשיו.
                </p>
                <button
                  type="button"
                  onClick={() => setPowered(true)}
                  className="mt-1 flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold shadow-lg shadow-red-900/50 transition hover:bg-red-500 sm:text-base"
                >
                  <span aria-hidden>⏻</span> הדלקה
                </button>
              </div>
            )}
            </div>

            {isFullscreen && (
              <div className="absolute left-3 top-3 z-50 flex gap-2 opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100">
                {focused !== null && (
                  <button
                    type="button"
                    onClick={() => setFocused(null)}
                    className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 hover:bg-black/90"
                  >
                    מסך מפוצל
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 hover:bg-black/90"
                >
                  ✕ יציאה ממסך מלא
                </button>
              </div>
            )}
          </div>

          {/* Bottom bezel */}
          <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-neutral-400 sm:pt-3 sm:text-sm">
            <span className="font-semibold tracking-wide">{BROADCAST_DATE_LABEL}</span>
            <span className="font-mono tabular-nums text-neutral-200">{nowSec === null ? "--:--:--" : formatClock(nowSec)}</span>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${powered ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-red-500"}`} />
            </span>
          </div>
        </div>
        {/* Stand */}
        <div className="mx-auto h-3 w-1/4 rounded-b-lg bg-gradient-to-b from-neutral-800 to-neutral-900 sm:h-5" />
        <div className="mx-auto h-1.5 w-2/5 rounded-full bg-neutral-800 sm:h-2" />
      </div>
      <TimelinePanel person={PEOPLE[1]} nowSec={nowSec} className="order-3 lg:order-none" />
      </div>

      {/* Remote */}
      <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="בחירת ערוץ">
        <RemoteButton active={focused === null} onClick={() => setFocused(null)}>
          מסך מפוצל
        </RemoteButton>
        {CHANNELS.map((channel, index) => (
          <RemoteButton key={channel.number} active={focused === index} onClick={() => enlarge(index)} accent={channel.accent}>
            {channel.number}
          </RemoteButton>
        ))}
        <RemoteButton active={isFullscreen} onClick={toggleFullscreen} label="מסך מלא">
          ⛶ מסך מלא
        </RemoteButton>
        <RemoteButton active={captions} onClick={() => setCaptions((c) => !c)} label={captions ? "הסתרת כתוביות" : "הצגת כתוביות"}>
          כתוביות
        </RemoteButton>
        <RemoteButton active={false} onClick={() => setSoundOn((s) => !s)} label={soundOn ? "השתקה" : "הפעלת שמע"}>
          {soundOn ? "🔊" : "🔇"}
        </RemoteButton>
      </nav>

      {SHOW_TIME_CONTROLS && (
        <TimeControls
          nowSec={nowSec}
          shifted={shifted}
          onSet={setClock}
          onReset={resetClock}
          channels={channels
            .filter((c) => c.kind === "video")
            .map((c) => ({ number: c.number, name: c.name, shift: shiftOf(channels.indexOf(c)) }))}
          onNudge={nudgeChannel}
        />
      )}

      <p className="text-center text-xs text-neutral-500">
        {focused === null
          ? "לחצו על ערוץ כדי לשמוע אותו · ⛶ להגדלה · מקשים 1–4"
          : "מקשים 1–4 להחלפת ערוץ · Esc למסך מפוצל"}
        {previewTime && <span className="mr-2 text-amber-400">· תצוגה מקדימה משעה {previewTime}</span>}
        {Object.keys(calibration).length > 0 && (
          <a href="/tv/calibrate" className="mr-2 text-sky-400 underline">
            · כיול מקומי פעיל
          </a>
        )}
      </p>

      <footer className="text-center text-xs text-neutral-400">
        הסרטונים הובאו מערוץ היוטיוב{" "}
        <a
          href="https://www.youtube.com/@OldNewsIsrael"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-neutral-200 underline underline-offset-2 hover:text-white"
        >
          ״החדשות הישנות״
        </a>
      </footer>
    </main>
  );
}

function RemoteButton({
  active,
  onClick,
  accent,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`min-w-11 rounded-full border px-4 py-2 text-sm font-bold transition ${
        active ? "border-white bg-white text-black" : "border-neutral-600 bg-neutral-900 text-white hover:border-neutral-400"
      }`}
      style={active && accent ? { background: accent, borderColor: accent } : undefined}
    >
      {children}
    </button>
  );
}
