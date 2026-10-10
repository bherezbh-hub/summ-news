"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_CHANNELS } from "@/lib/live/channels";
import { broadcastSecondsOfDay, formatClock } from "@/lib/tv/clock";
import { BrandBanner } from "@/components/tv/BrandBanner";
import { tileStyle } from "@/components/tv/tileLayout";
import { LiveTile } from "./LiveTile";

const todayLabel = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// The live counterpart of the 7.10 screen: the news channels as they air now.
export function LiveScreen() {
  const [focused, setFocused] = useState<number | null>(null);
  // The one channel whose sound is on; the others keep playing muted.
  const [audio, setAudio] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [now, setNow] = useState<{ sec: number; date: string } | null>(null);

  useEffect(() => {
    const tick = () => setNow({ sec: broadcastSecondsOfDay(), date: todayLabel.format(new Date()) });
    const frame = requestAnimationFrame(tick);
    const id = window.setInterval(tick, 500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(id);
    };
  }, []);

  const enlarge = useCallback((index: number) => {
    setFocused(index);
    if (LIVE_CHANNELS[index].kind === "hls") setAudio(index);
  }, []);

  const pick = useCallback(
    (index: number) => {
      if (focused !== null) return enlarge(index);
      if (LIVE_CHANNELS[index].kind !== "hls") return;
      setAudio((current) => (current === index ? null : index));
    },
    [focused, enlarge],
  );

  // Full screen: the browser's own when it allows it for the screen element,
  // otherwise the screen is stretched over the window (e.g. iPhone).
  const screenRef = useRef<HTMLDivElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const isFullscreen = nativeFullscreen || pseudoFullscreen;

  const toggleFullscreen = useCallback(() => {
    const el = screenRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else doc.webkitExitFullscreen?.();
    } else if (pseudoFullscreen) {
      setPseudoFullscreen(false);
    } else if (el.requestFullscreen && document.fullscreenEnabled) {
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
      if (e.key >= "1" && e.key <= String(LIVE_CHANNELS.length)) pick(Number(e.key) - 1);
      else if (e.key === "Escape" && pseudoFullscreen) setPseudoFullscreen(false);
      else if (e.key === "Escape" || e.key === "0") setFocused(null);
      else if (e.key.toLowerCase() === "m") setSoundOn((s) => !s);
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
      <header className="flex w-full max-w-[1600px] flex-col items-center gap-8">
        <BrandBanner className="mt-6 hidden max-w-5xl lg:block" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <time aria-label="השעה עכשיו" className="font-mono text-4xl font-bold tabular-nums tracking-wider drop-shadow sm:text-5xl">
            {now === null ? "--:--:--" : formatClock(now.sec)}
          </time>
          <span className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
              שידור חי
            </span>
            {now?.date}
          </span>
        </div>
      </header>

      <div className="w-full" style={{ maxWidth: "min(100%, calc((100dvh - 470px) * 16 / 9))", minWidth: "min(100%, 320px)" }}>
        <div className="rounded-[22px] border border-neutral-700/60 bg-gradient-to-b from-neutral-800 to-neutral-950 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[30px] sm:p-4">
          <div
            ref={screenRef}
            className={`tv-screen relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-black sm:rounded-xl ${
              pseudoFullscreen ? "tv-screen-pseudo" : ""
            }`}
          >
            <div className="tv-screen-inner relative h-full w-full">
              {LIVE_CHANNELS.map((channel, index) => (
                <LiveTile
                  key={channel.number}
                  channel={channel}
                  muted={!soundOn || audio !== index}
                  focused={focused === index}
                  thumbnail={focused !== null && focused !== index}
                  style={tileStyle(index, focused)}
                  onSelect={() => pick(index)}
                  onEnlarge={() => enlarge(index)}
                  onFullscreen={toggleFullscreen}
                />
              ))}
              <div className="tv-glass pointer-events-none absolute inset-0 z-30" />
            </div>

            {isFullscreen && (
              <div className="absolute left-3 top-3 z-50 flex gap-2 opacity-60 transition-opacity focus-within:opacity-100 hover:opacity-100">
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
        </div>
        <div className="mx-auto h-3 w-1/4 rounded-b-lg bg-gradient-to-b from-neutral-800 to-neutral-900 sm:h-5" />
        <div className="mx-auto h-1.5 w-2/5 rounded-full bg-neutral-800 sm:h-2" />
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="בחירת ערוץ">
        <RemoteButton active={focused === null} onClick={() => setFocused(null)}>
          מסך מפוצל
        </RemoteButton>
        {LIVE_CHANNELS.map((channel, index) => (
          <RemoteButton key={channel.number} active={focused === index} onClick={() => enlarge(index)} accent={channel.accent}>
            {channel.number}
          </RemoteButton>
        ))}
        <RemoteButton active={isFullscreen} onClick={toggleFullscreen} label="מסך מלא">
          ⛶ מסך מלא
        </RemoteButton>
        <RemoteButton active={false} onClick={() => setSoundOn((s) => !s)} label={soundOn ? "השתקה" : "הפעלת שמע"}>
          {soundOn ? "🔊" : "🔇"}
        </RemoteButton>
      </nav>

      <p className="text-center text-xs text-neutral-500">
        {focused === null ? "לחצו על ערוץ כדי לשמוע אותו · ⛶ להגדלה · מקשים 1–4" : "מקשים 1–4 להחלפת ערוץ · Esc למסך מפוצל"}
      </p>

      <BrandBanner className="mb-6 mt-8 lg:hidden" />
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
