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

const DURATIONS_STORAGE_KEY = "tv-video-durations";

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
  if (index === focusedIndex) {
    return { right: 0, top: 0, width: "100%", height: "100%", zIndex: 1 };
  }
  const slot = index < focusedIndex ? index : index - 1;
  return { right: `${2 + slot * 20}%`, top: "76%", width: "18%", height: "18%", zIndex: 2 };
}

export function TvScreen() {
  const [powered, setPowered] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  // The one channel whose sound is on; the others keep playing muted.
  const [audio, setAudio] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [nowSec, setNowSec] = useState<number | null>(null);
  const [previewTime, setPreviewTime] = useState<string | null>(null);
  // Video lengths reported by the players; they place the parts that follow.
  const [durations, setDurations] = useState<Durations>({});
  // Anchors set on /tv/calibrate in this browser, applied on top of the schedule.
  const [calibration, setCalibration] = useState<Calibration>({});
  const channels = useMemo(() => applyCalibration(CHANNELS, calibration), [calibration]);
  const offsetRef = useRef(0);

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
      tick();
      if (requested) setPreviewTime(requested);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= String(CHANNELS.length)) pick(Number(e.key) - 1);
      else if (e.key === "Escape" || e.key === "0") setFocused(null);
      else if (e.key.toLowerCase() === "m") setSoundOn((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick]);

  return (
    <main
      dir="rtl"
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[radial-gradient(ellipse_at_top,#2a2522,#0c0b0a_70%)] px-4 py-6 text-white"
    >
      <div className="w-full" style={{ maxWidth: "min(100%, calc((100dvh - 230px) * 16 / 9))", minWidth: "min(100%, 320px)" }}>
        {/* TV set */}
        <div className="rounded-[22px] border border-neutral-700/60 bg-gradient-to-b from-neutral-800 to-neutral-950 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[30px] sm:p-4">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-black sm:rounded-xl">
            <div className={`absolute inset-0 ${powered ? "tv-power-on" : ""}`}>
              {channels.map((channel, index) => (
                <ChannelTile
                  key={channel.number}
                  channel={channel}
                  nowSec={nowSec}
                  getNow={getNow}
                  durations={durations}
                  onDuration={reportDuration}
                  powered={powered}
                  muted={!soundOn || audio !== index}
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
        <RemoteButton active={false} onClick={() => setSoundOn((s) => !s)} label={soundOn ? "השתקה" : "הפעלת שמע"}>
          {soundOn ? "🔊" : "🔇"}
        </RemoteButton>
      </nav>

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
