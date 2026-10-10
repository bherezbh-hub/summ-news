"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { LiveChannel } from "@/lib/live/channels";

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
// under the page's control. It is drawn at desktop size and scaled down so more
// of it fits the tile; viewers can scroll and click inside it (e.g. to play).
// The page isn't allowed to go full screen itself – that would take over the
// whole display – so enlarging goes through the TV's own controls instead.
function EmbeddedPage({
  channel,
  focused,
  thumbnail,
}: {
  channel: Extract<LiveChannel, { kind: "embed" }>;
  focused: boolean;
  thumbnail: boolean;
}) {
  const scale = focused ? 0.85 : 0.6;
  return (
    <>
      <iframe
        src={channel.url}
        title={`${channel.name} – השידור הרשמי ב־${channel.site}`}
        allow="autoplay; encrypted-media"
        className="absolute right-0 top-0 origin-top-right border-0 bg-white"
        style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})` }}
      />
      {!thumbnail && (
        <a
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-2 top-2 z-20 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/30 hover:bg-black sm:left-3 sm:top-3"
        >
          פתיחה ב־{channel.site} ↗
        </a>
      )}
    </>
  );
}
