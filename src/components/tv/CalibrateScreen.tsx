"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHANNELS,
  Calibration,
  Durations,
  Segment,
  VideoChannel,
  applyCalibration,
  formatClockShort,
  segmentKey,
  segmentWindows,
} from "@/lib/tv/schedule";
import { formatClock } from "@/lib/tv/clock";
import { loadCalibration, saveCalibration, setAnchor } from "@/lib/tv/calibration";
import { loadYouTubeApi } from "@/lib/tv/players";

function parseVideoTime(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.map(Number).reduce((total, n) => total * 60 + n, 0);
}

function formatVideoTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

const CLOCK_PATTERN = /^\d{1,2}:\d{2}(:\d{2})?$/;

function loadDurations(): Durations {
  try {
    return JSON.parse(window.localStorage.getItem("tv-video-durations") ?? "{}");
  } catch {
    return {};
  }
}

export function CalibrateScreen() {
  const [calibration, setCalibration] = useState<Calibration>({});
  const [durations, setDurations] = useState<Durations>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCalibration(loadCalibration());
      setDurations(loadDurations());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const channels = useMemo(
    () => applyCalibration(CHANNELS, calibration).filter((c): c is VideoChannel => c.kind === "video"),
    [calibration],
  );

  const summary = channels
    .flatMap((channel) =>
      channel.segments
        .filter((seg) => calibration[segmentKey(seg)])
        .map((seg) => {
          const anchor = calibration[segmentKey(seg)];
          return `${channel.name} · ${seg.label} (${segmentKey(seg)}): בסרטון ${formatVideoTime(anchor.video)} = שעון ${anchor.clock}`;
        }),
    )
    .join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-dvh bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold">כיול הערוצים לפי השעון שעל המסך</h1>
            <a href="/tv" className="text-sm text-sky-400 underline">
              חזרה לטלוויזיה
            </a>
          </div>
          <ol className="list-decimal space-y-1 pr-5 text-sm leading-relaxed text-neutral-300">
            <li>פותחים סרטון ומריצים אותו לרגע שבו רואים את השעון של הערוץ על המסך.</li>
            <li>
              הכי מדויק: עוצרים בדיוק כשהדקה בשעון מתחלפת, ורושמים את השעה עם <b>:00</b> בסוף (למשל 07:31:00).
            </li>
            <li>לוחצים &quot;קח מהנגן&quot;, כותבים את השעה שעל המסך ולוחצים &quot;שמירה&quot;.</li>
            <li>מספיק רגע אחד לכל סרטון. חלק בלי כיול ממשיך מהרגע שהחלק הקודם נגמר.</li>
          </ol>
          <p className="text-sm text-neutral-400">
            הכיול נשמר בדפדפן הזה ומופעל מיד בטלוויזיה שלך. כדי שיחול על כולם, העתיקו את הסיכום בתחתית העמוד
            ושלחו אותו.
          </p>
        </header>

        {channels.map((channel) => {
          const windows = segmentWindows(channel, durations);
          return (
            <section key={channel.number} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span className="rounded px-2 py-0.5 text-black" style={{ background: channel.accent }}>
                  {channel.number}
                </span>
                {channel.name}
              </h2>
              {channel.segments.map((seg, i) => (
                <SegmentCard
                  key={segmentKey(seg)}
                  segment={seg}
                  calibrated={Boolean(calibration[segmentKey(seg)])}
                  begin={windows[i].begin}
                  end={windows[i].end}
                  onSave={(anchor) => setCalibration((c) => setAnchor(c, segmentKey(seg), anchor))}
                />
              ))}
            </section>
          );
        })}

        <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-bold">סיכום הכיול</h2>
          {summary ? (
            <>
              <textarea
                id="calibration-summary"
                readOnly
                value={summary}
                rows={Math.min(10, summary.split("\n").length + 1)}
                className="w-full rounded bg-neutral-950 p-2 font-mono text-xs leading-relaxed text-neutral-200"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="rounded bg-sky-600 px-3 py-1.5 text-sm font-semibold hover:bg-sky-500">
                  {copied ? "הועתק" : "העתקת הסיכום"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveCalibration({});
                    setCalibration({});
                  }}
                  className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
                >
                  מחיקת כל הכיול
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-400">עדיין לא כוילו סרטונים.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function SegmentCard({
  segment,
  calibrated,
  begin,
  end,
  onSave,
}: {
  segment: Segment;
  calibrated: boolean;
  begin: number | null;
  end: number | null;
  onSave: (anchor: { video: number; clock: string } | null) => void;
}) {
  const source = segment.sources[0];
  const videoId = source.type === "youtube" ? source.id : null;
  const [open, setOpen] = useState(false);
  const [videoInput, setVideoInput] = useState("");
  const [clockInput, setClockInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!open || !videoId || !mountRef.current) return;
    const target = document.createElement("div");
    const mount = mountRef.current;
    mount.appendChild(target);
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(target, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { controls: 1, rel: 0, playsinline: 1, modestbranding: 1 },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      mount.innerHTML = "";
    };
  }, [open, videoId]);

  const takeFromPlayer = () => {
    const player = playerRef.current;
    if (!player?.getCurrentTime) return;
    player.pauseVideo?.();
    setVideoInput(formatVideoTime(player.getCurrentTime()));
  };

  const save = () => {
    const video = parseVideoTime(videoInput);
    const clock = clockInput.trim();
    if (video === null) return setError("זמן בסרטון לא תקין. כתבו למשל 1:02:13.");
    if (!CLOCK_PATTERN.test(clock)) return setError("שעה לא תקינה. כתבו למשל 07:31 או 07:31:00.");
    setError(null);
    onSave({ video, clock: clock.length <= 5 ? `${clock}:00` : clock });
  };

  const idBase = `cal-${videoId ?? segment.label}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-semibold">{segment.label}</span>
          <span className="text-xs text-neutral-400">
            {begin === null ? "מתחיל כשהחלק הקודם נגמר" : `מתחיל ${formatClock(begin)}`}
            {" · "}
            {end === null ? "עד סוף הסרטון" : `נגמר ${formatClockShort(end)}`}
            {" · "}
            <span className={calibrated ? "text-emerald-400" : segment.anchor ? "text-amber-400" : "text-neutral-400"}>
              {calibrated ? "מכויל" : segment.anchor ? "הנחה, לא מכויל" : "ממשיך את החלק הקודם"}
            </span>
          </span>
        </div>
        {videoId && (
          <div className="flex gap-2">
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
            >
              ב-YouTube
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-black hover:bg-white"
            >
              {open ? "סגירת הסרטון" : "פתיחת הסרטון"}
            </button>
          </div>
        )}
      </div>

      {open && <div ref={mountRef} className="aspect-video w-full overflow-hidden rounded bg-black [&_iframe]:h-full [&_iframe]:w-full" />}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-400" htmlFor={`${idBase}-video`}>
          זמן בסרטון
          <div className="flex gap-1">
            <input
              id={`${idBase}-video`}
              dir="ltr"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="1:02:13"
              className="w-28 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 font-mono text-sm text-neutral-100"
            />
            {open && (
              <button
                type="button"
                onClick={takeFromPlayer}
                className="rounded border border-neutral-700 px-2 text-xs text-neutral-200 hover:border-neutral-500"
              >
                קח מהנגן
              </button>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400" htmlFor={`${idBase}-clock`}>
          השעה על המסך
          <input
            id={`${idBase}-clock`}
            dir="ltr"
            value={clockInput}
            onChange={(e) => setClockInput(e.target.value)}
            placeholder="07:31:00"
            className="w-28 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 font-mono text-sm text-neutral-100"
          />
        </label>
        <button type="button" onClick={save} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500">
          שמירה
        </button>
        {calibrated && (
          <button
            type="button"
            onClick={() => onSave(null)}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
          >
            ביטול הכיול
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
