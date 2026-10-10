// Shared, persisted "crop" for an embedded channel page (channel 12 / mako).
//
// We can't lift the live video out of the broadcaster's own page, so instead we
// show that page and zoom into the player: the page is laid out at a fixed
// logical width (PAGE_W) and a window onto it — the player rectangle — is scaled
// to fill the tile. The rectangle is calibrated once on the screen that shows it
// and remembered in the browser, so every tile of the channel (split, enlarged,
// full screen) frames the player the same way.

export const PAGE_W = 1280; // logical CSS width the page is laid out to
export const PAGE_H = 2200; // tall enough that the player fits after panning

/** The player window in the page's own pixels: its top-left and width. */
export type EmbedView = { x: number; y: number; w: number };

// Default: show the page from the top at full width. That is the starting point
// for calibration — zoom in and pan until only the player is left.
const DEFAULT: EmbedView = { x: 0, y: 0, w: PAGE_W };

const key = (id: string) => `live.embedView.${id}`;
const stores = new Map<string, { value: EmbedView; subs: Set<() => void> }>();

function load(id: string): EmbedView {
  try {
    const raw = localStorage.getItem(key(id));
    if (raw) {
      const v = JSON.parse(raw) as Partial<EmbedView>;
      if (typeof v.x === "number" && typeof v.y === "number" && typeof v.w === "number") {
        return { x: v.x, y: v.y, w: v.w };
      }
    }
  } catch {
    // Private mode or blocked storage: fall back to the default.
  }
  return DEFAULT;
}

function store(id: string) {
  let s = stores.get(id);
  if (!s) {
    s = { value: typeof window === "undefined" ? DEFAULT : load(id), subs: new Set() };
    stores.set(id, s);
  }
  return s;
}

export function getEmbedView(id: string): EmbedView {
  return store(id).value;
}

export function setEmbedView(id: string, value: EmbedView) {
  const s = store(id);
  s.value = value;
  try {
    localStorage.setItem(key(id), JSON.stringify(value));
  } catch {
    // Ignore: the value still lives in memory for this session.
  }
  s.subs.forEach((fn) => fn());
}

export function resetEmbedView(id: string) {
  setEmbedView(id, DEFAULT);
}

export function subscribeEmbedView(id: string, fn: () => void): () => void {
  const s = store(id);
  s.subs.add(fn);
  return () => s.subs.delete(fn);
}
