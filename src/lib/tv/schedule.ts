// Broadcast schedule for the 7.10 "four channels" TV screen.
//
// Every channel plays in sync with the current time of day in Israel. For a
// video segment, the position in the video is:
//
//   videoTime = (now - segment.start) + segment.offset
//
// Calibrating: find a moment in the video where you know the real clock time
// (most news channels show a clock on screen). If at second 754 of the video
// the on-screen clock reads 06:43:10, set start: "06:43:10", offset: 754.
//
// Each segment can list several sources: if the first cannot be embedded or
// fails to load, the next one is used.
//
// A segment without `start` follows the previous one: it begins the moment the
// previous video ends. Its length comes from `duration` when set, otherwise
// from the player (reported once it loads, then cached in the browser).
//
// Reference pages that cannot be embedded (no player API / blocked in iframes):
//   כאן 11  – https://www.kan.org.il/content/kan/kan-actual/october7/769174/
//   ערוץ 12 – https://www.mako.co.il/mako-vod-keshet/october_7

export const BROADCAST_TIME_ZONE = "Asia/Jerusalem";
export const BROADCAST_DATE_LABEL = "שבת, 7 באוקטובר 2023";
export const BROADCAST_DATE_SHORT = "07.10.2023";

export type Source =
  | { type: "youtube"; id: string }
  | { type: "facebook"; href: string };

export type Segment = {
  /** Clock time (Israel) when this segment begins, "HH:MM" or "HH:MM:SS". Omit to follow the previous segment. */
  start?: string;
  /** Clock time (Israel) when this segment ends. Omit to run until the video ends. */
  end?: string;
  /** Length of the video in seconds, when known. */
  duration?: number;
  /** Seconds into the video that correspond to `start`. Defaults to 0. */
  offset?: number;
  sources: Source[];
};

type ChannelBase = {
  number: string;
  name: string;
  /** Accent color of the on-screen channel bug. */
  accent: string;
};

export type VideoChannel = ChannelBase & { kind: "video"; segments: Segment[] };

export type SlideChannel = ChannelBase & {
  kind: "slide";
  /** Image shown full-screen; put the file in /public. */
  image: string;
  /** Clock time the slide goes on air and off air. */
  start: string;
  end: string;
};

export type Channel = VideoChannel | SlideChannel;

export const CHANNELS: Channel[] = [
  {
    number: "11",
    name: "כאן 11",
    accent: "#e5e7eb",
    kind: "video",
    segments: [
      {
        // Facebook upload of the full broadcast day, 06:29 until 00:00.
        start: "06:29",
        end: "23:59:59",
        offset: 0,
        sources: [
          {
            type: "facebook",
            href: "https://www.facebook.com/100064467291406/videos/1053680356460383/",
          },
          { type: "youtube", id: "tvuVM2-g5GA" },
        ],
      },
    ],
  },
  {
    number: "12",
    name: "ערוץ 12",
    accent: "#f59e0b",
    kind: "video",
    segments: [
      {
        // Part 1 starts exactly at 06:29.
        start: "06:29",
        offset: 0,
        sources: [{ type: "youtube", id: "WvvsUzeA_CE" }],
      },
      { sources: [{ type: "youtube", id: "a_7bknTP8Rs" }] },
    ],
  },
  {
    number: "13",
    name: "ערוץ 13",
    accent: "#38bdf8",
    kind: "video",
    segments: [
      {
        start: "06:29",
        offset: 0,
        sources: [{ type: "youtube", id: "agry5NpSGAE" }],
      },
      { sources: [{ type: "youtube", id: "DN915_qbKA4" }] },
    ],
  },
  {
    number: "14",
    name: "ערוץ 14",
    accent: "#facc15",
    kind: "slide",
    image: "/tv/ch14-slide.jpg",
    start: "06:29",
    end: "23:59:59",
  },
];

export function parseClock(value: string): number {
  const [h = 0, m = 0, s = 0] = value.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** Key under which a segment's video length is reported and cached. */
export function segmentKey(segment: Segment): string {
  const source = segment.sources[0];
  return source.type === "youtube" ? `yt:${source.id}` : `fb:${source.href}`;
}

export type Durations = Record<string, number>;

export type ScheduleState =
  | { status: "before"; startsAt: string }
  | { status: "after" }
  | { status: "on"; segmentIndex: number; startSec: number; videoTime: number };

/** Where a video channel should be at `nowSec` (seconds since midnight). */
export function resolveSchedule(channel: VideoChannel, nowSec: number, durations: Durations = {}): ScheduleState {
  let cursor: number | null = null;
  for (let i = 0; i < channel.segments.length; i++) {
    const seg = channel.segments[i];
    const offset = seg.offset ?? 0;
    const start: number | null = seg.start !== undefined ? parseClock(seg.start) : cursor;
    // The previous segment's length is still unknown: its player will report it.
    if (start === null) break;
    if (nowSec < start) return { status: "before", startsAt: formatStart(start) };
    const duration = seg.duration ?? durations[segmentKey(seg)];
    const end: number | null = seg.end !== undefined ? parseClock(seg.end) : duration !== undefined ? start + duration - offset : null;
    if (end === null || nowSec < end) {
      return { status: "on", segmentIndex: i, startSec: start, videoTime: nowSec - start + offset };
    }
    cursor = end;
  }
  return { status: "after" };
}

function formatStart(sec: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}`;
}
