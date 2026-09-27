"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import {
  BROADCAST_DATE_SHORT,
  Channel,
  Durations,
  SlideChannel,
  VideoChannel,
  parseClock,
  resolveSchedule,
  segmentKey,
} from "@/lib/tv/schedule";
import { formatClock } from "@/lib/tv/clock";
import { SyncPlayer, createPlayer } from "@/lib/tv/players";

// How far a player may drift from the schedule before it is re-seeked.
const MAX_DRIFT_SEC = 4;
const SEEK_COOLDOWN_MS = 6000;

type TileProps = {
  channel: Channel;
  nowSec: number | null;
  getNow: () => number;
  durations: Durations;
  onDuration: (key: string, seconds: number) => void;
  powered: boolean;
  muted: boolean;
  focused: boolean;
  thumbnail: boolean;
  style: CSSProperties;
  /** Click on the picture: turns this channel's sound on (split view) or switches to it (thumbnail). */
  onSelect: () => void;
  /** Shown in split view only. */
  onEnlarge?: () => void;
};

export function ChannelTile({
  channel,
  nowSec,
  getNow,
  durations,
  onDuration,
  powered,
  muted,
  focused,
  thumbnail,
  style,
  onSelect,
  onEnlarge,
}: TileProps) {
  const split = !focused && !thumbnail;
  const audible = !muted && channel.kind === "video";
  return (
    <div className="tv-tile absolute p-[1px]" style={style}>
      <div
        className={`@container relative h-full w-full overflow-hidden bg-black ${
          thumbnail ? "rounded-md ring-2 ring-white/70 shadow-2xl shadow-black" : ""
        }`}
      >
        {channel.kind === "video" ? (
          <VideoBody
            channel={channel}
            nowSec={nowSec}
            getNow={getNow}
            durations={durations}
            onDuration={onDuration}
            powered={powered}
            muted={muted}
          />
        ) : (
          <SlideBody channel={channel} nowSec={nowSec} />
        )}

        {/* Click shield: the viewer can pick a channel but never touch the player itself. */}
        <button
          type="button"
          onClick={onSelect}
          aria-label={split ? `${channel.name} – ${audible ? "השתקה" : "שמיעה"}` : channel.name}
          aria-pressed={split ? audible : undefined}
          className={`group absolute inset-0 z-10 ${focused ? "cursor-default" : "cursor-pointer"}`}
        >
          {split && (
            <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/70 px-3 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {channel.kind === "slide" ? "ערוץ ללא שמע" : audible ? "לחצו להשתקה" : "לחצו לשמיעה"}
            </span>
          )}
        </button>

        {split && audible && <div className="pointer-events-none absolute inset-0 z-10 ring-4 ring-inset" style={{ ["--tw-ring-color" as string]: channel.accent }} />}

        {split && onEnlarge && (
          <button
            type="button"
            onClick={onEnlarge}
            aria-label={`הגדלת ${channel.name}`}
            className="absolute bottom-2 left-2 z-20 rounded bg-black/70 px-2 py-1 text-xs text-white transition hover:bg-black/90 sm:bottom-3 sm:left-3 sm:text-sm"
          >
            ⛶ הגדלה
          </button>
        )}

        <ChannelBug channel={channel} large={focused} audible={audible} small={thumbnail} />
      </div>
    </div>
  );
}

function ChannelBug({
  channel,
  large,
  audible,
  small,
}: {
  channel: Channel;
  large: boolean;
  audible: boolean;
  small: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-20 flex items-center gap-1.5 ${
        small ? "right-1 top-1" : "right-2 top-2 sm:right-3 sm:top-3"
      }`}
    >
      <span
        className={`rounded font-black leading-none text-black shadow ${
          small ? "px-1 py-0.5 text-[10px]" : large ? "px-2.5 py-1.5 text-lg sm:text-2xl" : "px-1.5 py-1 text-xs sm:text-sm"
        }`}
        style={{ background: channel.accent }}
      >
        {channel.number}
      </span>
      {large && (
        <span className="rounded bg-black/60 px-2 py-1 text-sm font-semibold text-white sm:text-base">
          {channel.name}
        </span>
      )}
      {audible && (
        <span className="rounded bg-black/60 px-1.5 py-1 text-xs text-white" aria-label="שמע פעיל">
          🔊
        </span>
      )}
    </div>
  );
}

function VideoBody({
  channel,
  nowSec,
  getNow,
  durations,
  onDuration,
  powered,
  muted,
}: {
  channel: VideoChannel;
  nowSec: number | null;
  getNow: () => number;
  durations: Durations;
  onDuration: (key: string, seconds: number) => void;
  powered: boolean;
  muted: boolean;
}) {
  if (nowSec === null) return <Static label="" />;
  const schedule = resolveSchedule(channel, nowSec, durations);
  if (schedule.status !== "on") {
    return (
      <OffAir
        channel={channel}
        nowSec={nowSec}
        message={schedule.status === "before" ? `השידור יתחיל ב-${schedule.startsAt}` : "סוף השידורים להיום"}
      />
    );
  }
  if (!powered) return <Static label="" />;
  return (
    <VideoFeed
      key={schedule.segmentIndex}
      channel={channel}
      segmentIndex={schedule.segmentIndex}
      startSec={schedule.startSec}
      nowSec={nowSec}
      getNow={getNow}
      onDuration={onDuration}
      muted={muted}
    />
  );
}

function VideoFeed({
  channel,
  segmentIndex,
  startSec,
  nowSec,
  getNow,
  onDuration,
  muted,
}: {
  channel: VideoChannel;
  segmentIndex: number;
  /** Clock time (seconds since midnight) at which this segment's `offset` plays. */
  startSec: number;
  nowSec: number;
  getNow: () => number;
  onDuration: (key: string, seconds: number) => void;
  muted: boolean;
}) {
  const segment = channel.segments[segmentIndex];
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SyncPlayer | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [readySource, setReadySource] = useState(-1);
  const [ended, setEnded] = useState(false);
  const source = segment.sources[sourceIndex];
  const ready = readySource === sourceIndex;

  const videoTimeNow = () => getNow() - startSec + (segment.offset ?? 0);

  // Only the primary source's length decides when the next part starts.
  const reportDuration = (seconds: number) => {
    if (sourceIndex === 0 && segment.duration === undefined) onDuration(segmentKey(segment), seconds);
  };

  const videoTimeRef = useRef(videoTimeNow);
  const reportDurationRef = useRef(reportDuration);
  useEffect(() => {
    videoTimeRef.current = videoTimeNow;
    reportDurationRef.current = reportDuration;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!source || !mount) return;
    const player = createPlayer(source, mount, videoTimeRef.current(), {
      onReady: () => {
        playerRef.current = player;
        setReadySource(sourceIndex);
      },
      onError: () => setSourceIndex((i) => (i === sourceIndex ? i + 1 : i)),
    });
    return () => {
      playerRef.current = null;
      player.destroy();
    };
  }, [source, sourceIndex]);

  // Keep the player locked to the clock: no seeking, no pausing.
  useEffect(() => {
    if (!ready) return;
    let lastSeek = 0;
    const sync = () => {
      const player = playerRef.current;
      if (!player) return;
      const target = videoTimeRef.current();
      const duration = player.duration();
      if (duration !== null) reportDurationRef.current(duration);
      const pastEnd = duration !== null && target >= duration - 1;
      setEnded(pastEnd);
      if (pastEnd) return;
      const current = player.currentTime();
      if (current !== null && Math.abs(current - target) > MAX_DRIFT_SEC && Date.now() - lastSeek > SEEK_COOLDOWN_MS) {
        player.seek(target);
        lastSeek = Date.now();
      }
      if (!player.isPlaying()) player.play();
    };
    sync();
    const id = window.setInterval(sync, 1000);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (ready) playerRef.current?.setMuted(muted || ended);
  }, [ready, muted, ended]);

  if (!source) return <OffAir channel={channel} nowSec={nowSec} message="השידור אינו זמין כרגע" />;

  return (
    <>
      <div ref={mountRef} className="tv-player absolute inset-0" />
      {!ready && <Static label="מכוון ערוץ…" />}
      {ended && <OffAir channel={channel} nowSec={nowSec} message="הקלטת השידור לשעה זו טרם הועלתה" />}
    </>
  );
}

function SlideBody({ channel, nowSec }: { channel: SlideChannel; nowSec: number | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (nowSec === null) return <Static label="" />;
  if (nowSec < parseClock(channel.start)) {
    return <OffAir channel={channel} nowSec={nowSec} message={`השידור יתחיל ב-${channel.start}`} />;
  }
  if (nowSec >= parseClock(channel.end)) {
    return <OffAir channel={channel} nowSec={nowSec} message="סוף השידורים להיום" />;
  }
  return (
    <div className="absolute inset-0 bg-neutral-900">
      {imageFailed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-blue-950 to-neutral-950 text-center text-white">
          <span className="text-[18cqw] font-black leading-none" style={{ color: channel.accent }}>
            {channel.number}
          </span>
          <span className="text-[3.2cqw] text-white/60">השידור יחודש בהקדם</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={channel.image}
          alt={`${channel.name} – שקופית`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
      <div dir="ltr" className="absolute left-[3%] top-[4%] rounded bg-black/75 px-[0.6em] py-[0.25em] font-mono text-[3.2cqw] font-bold tabular-nums tracking-wider text-white shadow-lg">
        {BROADCAST_DATE_SHORT} {formatClock(nowSec)}
      </div>
    </div>
  );
}

function OffAir({ channel, nowSec, message }: { channel: Channel; nowSec: number; message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex flex-[3]">
        {["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"].map((c) => (
          <div key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex flex-1 items-center justify-center gap-3 bg-neutral-950 px-2 text-center text-white">
        <span className="text-[3.4cqw] font-semibold">
          {channel.name} · {message}
        </span>
        <span className="font-mono text-[3.4cqw] tabular-nums text-white/70">{formatClock(nowSec)}</span>
      </div>
    </div>
  );
}

function Static({ label }: { label: string }) {
  return (
    <div className="tv-static absolute inset-0 flex items-center justify-center">
      {label && <span className="rounded bg-black/70 px-[0.8em] py-[0.3em] text-[clamp(9px,3.4cqw,16px)] text-white">{label}</span>}
    </div>
  );
}
