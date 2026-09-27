// Broadcast schedule for the 7.10 "four channels" TV screen.
//
// Every channel plays in sync with the current time of day in Israel.
//
// Each video is placed on the day by an anchor: a moment in the video and the
// clock time the channel's on-screen clock shows at that moment. From it, the
// video's second 0 falls at `anchor.clock - anchor.video`. Anchors are best
// set on the calibration page (/tv/calibrate) by reading the on-screen clock.
//
// A segment without an anchor follows the previous one: it begins the moment
// the previous video ends. A segment ends at `end`, when its video ends
// (`duration`, or the length reported by the player), or when the next
// anchored segment begins, whichever comes first.
//
// Each segment can list several sources: if the first cannot be embedded or
// fails to load, the next one is used.
//
// Other recordings, not used (a different cut, or no player that can be synced):
//   כאן 11  – https://www.facebook.com/100064467291406/videos/1053680356460383/
//   כאן 11  – https://www.kan.org.il/content/kan/kan-actual/october7/769174/
//   ערוץ 12 – https://www.mako.co.il/mako-vod-keshet/october_7

export const BROADCAST_TIME_ZONE = "Asia/Jerusalem";
export const BROADCAST_DATE_LABEL = "שבת, 7 באוקטובר 2023";
export const BROADCAST_DATE_SHORT = "07.10.2023";

export type Source =
  | { type: "youtube"; id: string }
  | { type: "facebook"; href: string };

export type Anchor = {
  /** Seconds into the video. */
  video: number;
  /** What the on-screen clock shows at that moment, "HH:MM" or "HH:MM:SS". */
  clock: string;
};

export type Segment = {
  /** Shown on the calibration page, e.g. "חלק א". */
  label: string;
  /** Places the video on the day. Omit to follow the previous segment. */
  anchor?: Anchor;
  /** Clock time (Israel) after which this segment stops, if earlier than the video's end. */
  end?: string;
  /** Length of the video in seconds, when known. */
  duration?: number;
  sources: Source[];
};

type ChannelBase = {
  number: string;
  name: string;
  /** Accent color of the on-screen channel bug. */
  accent: string;
};

export type VideoChannel = ChannelBase & {
  kind: "video";
  segments: Segment[];
  /** Fine-tuning in seconds for the whole channel: negative plays it behind the clock. */
  shift?: number;
};

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
        // The night broadcast before the attack. Assumed to start at 00:00.
        label: "לילה, לפני המתקפה",
        anchor: { video: 0, clock: "00:00" },
        sources: [{ type: "youtube", id: "NHl3QpflwQY" }],
      },
      {
        // 10:30:55 long. Assumed to start at 06:29.
        label: "חלק א",
        anchor: { video: 0, clock: "06:29" },
        duration: 10 * 3600 + 30 * 60 + 55,
        sources: [{ type: "youtube", id: "0j3y7j-Jkgw" }],
      },
      {
        // 7:19:40 long, follows part 1.
        label: "חלק ב",
        duration: 7 * 3600 + 19 * 60 + 40,
        sources: [{ type: "youtube", id: "8ETKqE81YlU" }],
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
        // The night broadcast before the attack. Assumed to start at 00:00.
        label: "לילה, לפני המתקפה",
        anchor: { video: 0, clock: "00:00" },
        sources: [{ type: "youtube", id: "BLUqgw6yh5Q" }],
      },
      {
        // 8:30:55 long. Starts exactly at 06:29.
        label: "חלק א",
        anchor: { video: 0, clock: "06:29" },
        duration: 8 * 3600 + 30 * 60 + 55,
        sources: [{ type: "youtube", id: "WvvsUzeA_CE" }],
      },
      {
        // 9:01:25 long, follows part 1.
        label: "חלק ב",
        duration: 9 * 3600 + 1 * 60 + 25,
        sources: [{ type: "youtube", id: "a_7bknTP8Rs" }],
      },
    ],
  },
  {
    number: "13",
    name: "ערוץ 13",
    accent: "#38bdf8",
    kind: "video",
    segments: [
      {
        // The night broadcast before the attack. Assumed to start at 00:00.
        label: "לילה, לפני המתקפה",
        anchor: { video: 0, clock: "00:00" },
        sources: [{ type: "youtube", id: "2OZP-wU-aW4" }],
      },
      {
        // 8:31:43 long. Assumed to start at 06:29.
        label: "חלק א",
        anchor: { video: 0, clock: "06:29" },
        duration: 8 * 3600 + 31 * 60 + 43,
        sources: [{ type: "youtube", id: "agry5NpSGAE" }],
      },
      {
        // 8:56:35 long, follows part 1.
        label: "חלק ב",
        duration: 8 * 3600 + 56 * 60 + 35,
        sources: [{ type: "youtube", id: "DN915_qbKA4" }],
      },
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

/** Anchors set on the calibration page, by segment key. */
export type Calibration = Record<string, Anchor>;

export function applyCalibration(channels: Channel[], calibration: Calibration): Channel[] {
  if (Object.keys(calibration).length === 0) return channels;
  return channels.map((channel) =>
    channel.kind !== "video"
      ? channel
      : {
          ...channel,
          segments: channel.segments.map((seg) => {
            const anchor = calibration[segmentKey(seg)];
            return anchor ? { ...seg, anchor } : seg;
          }),
        },
  );
}

const DAY = 24 * 3600;

/**
 * Clock time (seconds since midnight; negative means the evening before) at
 * which the video's second 0 plays. On the first segment of a channel, a clock
 * reading after 18:00 belongs to the evening before.
 */
export function anchorBegin(anchor: Anchor, firstSegment: boolean): number {
  let clock = parseClock(anchor.clock);
  if (firstSegment && clock >= 18 * 3600) clock -= DAY;
  return clock - anchor.video;
}

export type SegmentWindow = { begin: number | null; end: number | null };

/** When each segment plays, as far as it is known. */
export function segmentWindows(channel: VideoChannel, durations: Durations = {}): SegmentWindow[] {
  const windows: SegmentWindow[] = [];
  let cursor: number | null = null;
  channel.segments.forEach((seg, i) => {
    const begin: number | null = seg.anchor ? anchorBegin(seg.anchor, i === 0) : cursor;
    const candidates: number[] = [];
    if (seg.end !== undefined) candidates.push(parseClock(seg.end));
    const duration = seg.duration ?? durations[segmentKey(seg)];
    if (begin !== null && duration !== undefined) candidates.push(begin + duration);
    const next = channel.segments[i + 1];
    if (next?.anchor) candidates.push(anchorBegin(next.anchor, false));
    const end = candidates.length ? Math.min(...candidates) : null;
    windows.push({ begin, end });
    cursor = end;
  });
  return windows;
}

export type ScheduleState =
  | { status: "before"; startsAt: string }
  | { status: "after" }
  /** `beginSec`: clock time (seconds since today's midnight) at which the video's second 0 plays. */
  | { status: "on"; segmentIndex: number; beginSec: number; videoTime: number };

/**
 * Where a video channel should be at `nowSec` (seconds since midnight). A
 * broadcast that runs past midnight carries on into the small hours.
 */
export function resolveSchedule(channel: VideoChannel, nowSec: number, durations: Durations = {}): ScheduleState {
  const windows = segmentWindows(channel, durations);
  const state = resolveAt(windows, nowSec);
  if (state.status === "before") {
    const overnight = resolveAt(windows, nowSec + DAY);
    if (overnight.status === "on") return { ...overnight, beginSec: overnight.beginSec - DAY };
  }
  return state;
}

function resolveAt(windows: SegmentWindow[], nowSec: number): ScheduleState {
  for (let i = 0; i < windows.length; i++) {
    const { begin, end } = windows[i];
    // The previous segment's length is still unknown: its player will report it.
    if (begin === null) break;
    if (end !== null && end <= begin) continue;
    if (nowSec < begin) return { status: "before", startsAt: formatClockShort(begin) };
    if (end === null || nowSec < end) {
      return { status: "on", segmentIndex: i, beginSec: begin, videoTime: nowSec - begin };
    }
  }
  return { status: "after" };
}

export function formatClockShort(sec: number): string {
  const t = ((Math.floor(sec) % DAY) + DAY) % DAY;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}`;
}
