"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type Hls from "hls.js";
import type { LiveChannel } from "@/lib/live/channels";
import {
  EmbedView,
  PAGE_H,
  PAGE_W,
  getEmbedView,
  resetEmbedView,
  setEmbedView,
  subscribeEmbedView,
} from "@/lib/live/embedView";

type Status = "loading" | "playing" | "error";

// How long to wait before trying a stream again after it fails.
const RETRY_MS = 10_000;
// A playing stream whose picture hasn't moved for this long is nudged back to
// the live edge; if it is still frozen after STALL_RELOAD_MS it is reloaded.
const STALL_NUDGE_MS = 6_000;
const STALL_RELOAD_MS = 20_000;

export function LiveTile({
  channel,
  muted,
  focused,
  thumbnail,
  style,
  onSelect,
  onEnlarge,
  onFullscreen,
}: {
  channel: LiveChannel;
  muted: boolean;
  focused: boolean;
  thumbnail: boolean;
  style: CSSProperties;
  /** Split view: turns this channel's sound on (or off). Thumbnail: switches to it. */
  onSelect: () => void;
  onEnlarge: () => void;
  /** Toggles full screen for the whole TV (not for the channel's own player). */
  onFullscreen: () => void;
}) {
  const split = !focused && !thumbnail;
  const playable = channel.kind === "hls";
  const audible = playable && !muted;

  return (
    <div className="tv-tile absolute p-[1px]" style={style}>
      <div
        className={`@container relative h-full w-full overflow-hidden bg-black ${
          thumbnail ? "rounded-md ring-2 ring-white/70 shadow-2xl shadow-black" : ""
        }`}
      >
        {channel.kind === "hls" ? (
          <HlsVideo src={channel.src} muted={muted} />
        ) : (
          <EmbeddedPage channel={channel} focused={focused} thumbnail={thumbnail} />
        )}

        {playable && (
          <button
            type="button"
            onClick={onSelect}
            aria-label={split ? `${channel.name} – ${audible ? "השתקה" : "שמיעה"}` : channel.name}
            aria-pressed={split ? audible : undefined}
            className={`group absolute inset-0 z-10 ${focused ? "cursor-default" : "cursor-pointer"}`}
          >
            {split && (
              <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/70 px-3 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {audible ? "לחצו להשתקה" : "לחצו לשמיעה"}
              </span>
            )}
          </button>
        )}
        {!playable && thumbnail && (
          <button type="button" onClick={onSelect} aria-label={channel.name} className="absolute inset-0 z-10" />
        )}

        {split && audible && (
          <div
            className="pointer-events-none absolute inset-0 z-10 ring-4 ring-inset"
            style={{ ["--tw-ring-color" as string]: channel.accent }}
          />
        )}

        {split && (
          <button
            type="button"
            onClick={onEnlarge}
            aria-label={`הגדלת ${channel.name}`}
            className="absolute bottom-2 left-2 z-20 rounded bg-black/70 px-2 py-1 text-xs text-white transition hover:bg-black/90 sm:bottom-3 sm:left-3 sm:text-sm"
          >
            ⛶ הגדלה
          </button>
        )}

        {focused && !playable && (
          <button
            type="button"
            onClick={onFullscreen}
            className="absolute bottom-2 left-2 z-20 rounded bg-black/75 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-black sm:bottom-3 sm:left-3 sm:text-sm"
          >
            ⛶ מסך מלא
          </button>
        )}

        <div
          className={`pointer-events-none absolute z-20 flex items-center gap-1.5 ${
            thumbnail ? "right-1 top-1" : "right-2 top-2 sm:right-3 sm:top-3"
          }`}
        >
          <span
            className={`rounded font-black leading-none text-black shadow ${
              thumbnail ? "px-1 py-0.5 text-[10px]" : focused ? "px-2.5 py-1.5 text-lg sm:text-2xl" : "px-1.5 py-1 text-xs sm:text-sm"
            }`}
            style={{ background: channel.accent }}
          >
            {channel.number}
          </span>
          {focused && (
            <span className="rounded bg-black/60 px-2 py-1 text-sm font-semibold text-white sm:text-base">{channel.name}</span>
          )}
          {!thumbnail && playable && (
            <span className="flex items-center gap-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white sm:text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
              LIVE
            </span>
          )}
          {audible && !thumbnail && (
            <span className="rounded bg-black/60 px-1.5 py-1 text-xs text-white" aria-label="שמע פעיל">
              🔊
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HlsVideo({ src, muted }: { src: string; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    let retry: number | undefined;
    let cancelled = false;
    const fail = () => {
      if (cancelled) return;
      setStatus("error");
      retry = window.setTimeout(() => setAttempt((a) => a + 1), RETRY_MS);
    };
    const play = () => video.play().catch(() => {});

    // Watchdog: live streams sometimes freeze without any error (a missed
    // segment, a buffer gap). Watch the playhead and kick it when it stops.
    let lastTime = -1;
    let stuckSince = 0;
    let nudged = false;
    const watchdog = window.setInterval(() => {
      if (cancelled || video.paused || video.ended) {
        stuckSince = 0;
        return;
      }
      const now = Date.now();
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        stuckSince = 0;
        nudged = false;
        return;
      }
      if (!stuckSince) stuckSince = now;
      const stuck = now - stuckSince;
      if (stuck >= STALL_RELOAD_MS) {
        stuckSince = 0;
        setStatus("loading");
        setAttempt((a) => a + 1);
      } else if (stuck >= STALL_NUDGE_MS && !nudged) {
        nudged = true;
        if (hls) {
          hls.startLoad();
          const edge = hls.liveSyncPosition;
          if (edge !== null && edge > video.currentTime) video.currentTime = edge;
        } else if (video.seekable.length) {
          video.currentTime = video.seekable.end(video.seekable.length - 1) - 3;
        }
        play();
      }
    }, 1_000);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari and iOS play HLS natively.
      video.src = src;
      video.addEventListener("error", fail);
      play();
    } else {
      import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled) return;
        if (!HlsLib.isSupported()) return fail();
        hls = new HlsLib({
          capLevelToPlayerSize: true,
          // Sit a little further back from the live edge so a late segment
          // doesn't drain the buffer, and jump forward if we fall far behind.
          liveSyncDurationCount: 4,
          liveMaxLatencyDurationCount: 12,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          lowLatencyMode: false,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,
        });
        hls.on(HlsLib.Events.ERROR, (_e, data) => {
          if (!data.fatal || !hls) return;
          if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            hls.destroy();
            hls = null;
            fail();
          }
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(HlsLib.Events.MANIFEST_PARSED, play);
      });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      window.clearInterval(watchdog);
      video.removeEventListener("error", fail);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, attempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (!muted) video.play().catch(() => {});
  }, [muted]);

  return (
    <>
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full bg-black object-contain"
        onPlaying={() => setStatus("playing")}
        onWaiting={() => setStatus((s) => (s === "error" ? s : "loading"))}
      />
      {status !== "playing" && (
        <div className="tv-static absolute inset-0 flex items-center justify-center">
          <span className="rounded bg-black/70 px-[0.8em] py-[0.3em] text-[clamp(9px,3.4cqw,16px)] text-white">
            {status === "error" ? "השידור לא זמין כרגע · מנסה שוב…" : "מכוון ערוץ…"}
          </span>
        </div>
      )}
    </>
  );
}

// The broadcaster's own page, shown as is: its player, cookies and sound stay
// under the page's control. The live video can't be taken out of the page, so
// the page is laid out at a fixed logical width and a window onto it — the
// player, calibrated once and remembered — is scaled to fill the tile, hiding
// the rest of the site. The page isn't allowed to go full screen itself (that
// would take over the whole display); enlarging goes through the TV's controls.
function EmbeddedPage({
  channel,
  focused,
  thumbnail,
}: {
  channel: Extract<LiveChannel, { kind: "embed" }>;
  focused: boolean;
  thumbnail: boolean;
}) {
  const id = channel.number;
  const view = useSyncExternalStore(
    useCallback((cb) => subscribeEmbedView(id, cb), [id]),
    useCallback(() => getEmbedView(id), [id]),
    useCallback(() => getEmbedView(id), [id]),
  );

  // Measure the tile so the player window scales to fill it exactly, whatever
  // the tile's size (split quadrant, enlarged, full screen).
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Show the whole page temporarily (to press play or dismiss a banner).
  const [showFull, setShowFull] = useState(false);
  const active: EmbedView = showFull ? { x: 0, y: 0, w: PAGE_W } : view;
  const scale = box.w > 0 ? box.w / active.w : box.w / PAGE_W || 0.3;

  const showControls = focused && !thumbnail;
  const panStep = () => Math.max(20, active.w * 0.06);
  const zoom = (factor: number) =>
    setEmbedView(id, { ...view, w: Math.min(PAGE_W * 1.5, Math.max(240, view.w * factor)) });
  const pan = (dx: number, dy: number) => setEmbedView(id, { x: view.x + dx, y: view.y + dy, w: view.w });

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        src={channel.url}
        title={`${channel.name} – השידור הרשמי ב־${channel.site}`}
        allow="autoplay; encrypted-media"
        className="absolute left-0 top-0 origin-top-left border-0 bg-white"
        style={{
          width: `${PAGE_W}px`,
          height: `${PAGE_H}px`,
          transform: `scale(${scale}) translate(${-active.x}px, ${-active.y}px)`,
        }}
      />

      {showControls && (
        <div className="absolute inset-x-2 bottom-2 z-30 flex flex-wrap items-center justify-center gap-1 rounded-lg bg-black/80 p-1.5 text-white ring-1 ring-white/20">
          <span className="px-1 text-[11px] text-neutral-300">מיקוד הנגן:</span>
          <CalBtn onClick={() => zoom(1 / 1.15)} label="הקטנה">−</CalBtn>
          <CalBtn onClick={() => zoom(1.15)} label="הגדלה">+</CalBtn>
          <CalBtn onClick={() => pan(0, -panStep())} label="למעלה">↑</CalBtn>
          <CalBtn onClick={() => pan(0, panStep())} label="למטה">↓</CalBtn>
          <CalBtn onClick={() => pan(-panStep(), 0)} label="שמאלה">←</CalBtn>
          <CalBtn onClick={() => pan(panStep(), 0)} label="ימינה">→</CalBtn>
          <CalBtn onClick={() => resetEmbedView(id)} label="איפוס">איפוס</CalBtn>
          <CalBtn onClick={() => setShowFull((v) => !v)} label="דף מלא" pressed={showFull}>
            {showFull ? "מיקוד" : "דף מלא"}
          </CalBtn>
        </div>
      )}
    </div>
  );
}

function CalBtn({
  onClick,
  label,
  pressed,
  children,
}: {
  onClick: () => void;
  label: string;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`min-w-7 rounded px-2 py-1 text-xs font-bold leading-none transition ${
        pressed ? "bg-white text-black" : "bg-white/15 hover:bg-white/30"
      }`}
    >
      {children}
    </button>
  );
}
