import type { CSSProperties } from "react";

// Tiles are only ever repositioned, never re-mounted, so the embedded players
// keep playing while switching between split view and a single channel.
export function tileStyle(index: number, focusedIndex: number | null): CSSProperties {
  if (focusedIndex === null) {
    return {
      right: `${(index % 2) * 50}%`,
      top: `${Math.floor(index / 2) * 50}%`,
      width: "50%",
      height: "50%",
      zIndex: 1,
    };
  }
  // One channel enlarged: the other three sit in a row above it, so they never
  // cover it. Both keep the screen's 16:9 shape.
  if (index === focusedIndex) {
    return { right: "12.5%", top: "24%", width: "75%", height: "75%", zIndex: 1 };
  }
  const slot = index < focusedIndex ? index : index - 1;
  return { right: `${16.5 + slot * 23}%`, top: "1.5%", width: "21%", height: "21%", zIndex: 2 };
}
