// Live news channels for /live. Kan 11, Reshet 13 and Now 14 are played straight
// from the channels' HLS streams (listed in the public iptv-org index, checked to
// allow playback from other sites; each one played end to end before being added).
//
// Keshet 12 has no usable source: mako's own HLS URLs return 403 without the
// player's access token, and the only open copy is an unofficial http-only
// restream (blocked as mixed content on an https page, and not authorised).
// Its tile links to the official mako player instead.

export type LiveChannel = {
  number: string;
  name: string;
  /** Accent color of the on-screen channel bug. */
  accent: string;
} & ({ kind: "hls"; src: string } | { kind: "external"; url: string; site: string });

export const LIVE_CHANNELS: LiveChannel[] = [
  {
    number: "11",
    name: "כאן 11",
    accent: "#e5e7eb",
    kind: "hls",
    src: "https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8",
  },
  {
    number: "12",
    name: "חדשות 12",
    accent: "#f59e0b",
    kind: "external",
    url: "https://www.mako.co.il/culture-tv/articles/Article-c75a4149b6ef091027.htm",
    site: "mako",
  },
  {
    number: "13",
    name: "חדשות 13",
    accent: "#38bdf8",
    kind: "hls",
    src: "https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8",
  },
  {
    number: "14",
    name: "עכשיו 14",
    accent: "#facc15",
    kind: "hls",
    src: "https://r.il.cdn-redge.media/livehls/oil/ch14/live/ch14/live.livx/playlist.m3u8",
  },
];
