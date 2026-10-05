"use client";

import { useEffect, useRef } from "react";
import { Person, entryLabel } from "@/lib/tv/timeline";
import { parseClock } from "@/lib/tv/schedule";

// A side panel beside the TV with the person's whole day. The entry for the
// current moment is highlighted and kept in view; the others stay readable.
export function TimelinePanel({
  person,
  nowSec,
  className = "",
}: {
  person: Person;
  nowSec: number | null;
  className?: string;
}) {
  const currentIndex =
    nowSec === null ? -1 : person.entries.findLastIndex((e) => parseClock(e.from) <= nowSec);
  const current = currentIndex >= 0 ? person.entries[currentIndex] : undefined;
  // A range is "now" until it ends; a single time for the first 45 minutes.
  const live =
    current !== undefined &&
    nowSec !== null &&
    (current.to !== undefined
      ? nowSec < parseClock(current.to)
      : current.onward || nowSec - parseClock(current.from) <= 45 * 60);

  // Scroll the list (not the page) so the current entry is visible.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>("[data-current]");
    if (!list || !item) return;
    // The list is the item's offset parent (it is position: relative).
    const top = item.offsetTop;
    if (top < list.scrollTop || top + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: Math.max(0, top - 12), behavior: "smooth" });
    }
  }, [currentIndex]);

  return (
    <aside
      aria-label={person.title}
      className={`flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-900/80 p-2 pt-0 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] max-h-[70dvh] sm:gap-3 sm:p-4 sm:pt-0 lg:max-h-[min(78dvh,680px)] lg:w-64 lg:shrink-0 xl:w-72 ${className}`}
    >
      {/* Portrait with the panel title over its lower edge. */}
      <div className="relative -mx-2 h-28 shrink-0 sm:-mx-4 sm:h-44 lg:h-40 xl:h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={person.photo} alt={person.name} className="h-full w-full object-cover object-[50%_20%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
        <h2 className="absolute inset-x-2 bottom-1.5 text-sm font-bold leading-snug text-balance drop-shadow sm:inset-x-4 sm:bottom-2 sm:text-base">
          {person.title}
        </h2>
      </div>

      <ol ref={listRef} className="relative flex min-h-0 flex-col gap-1 overflow-y-auto">
        {person.entries.map((entry, index) => {
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          return (
            <li
              key={entry.from}
              data-current={isCurrent || undefined}
              aria-current={isCurrent ? "time" : undefined}
              className={`flex flex-col gap-1 rounded-xl px-2 py-1.5 transition-colors duration-500 sm:px-3 sm:py-2 ${
                isCurrent ? "bg-neutral-800 ring-1 ring-amber-400/50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    isCurrent ? "text-amber-300" : isPast ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {entryLabel(entry)}
                </span>
                {isCurrent && live && (
                  <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[11px] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                    עכשיו
                  </span>
                )}
              </div>
              <p
                className={`leading-relaxed ${
                  isCurrent ? "text-[13px] text-white sm:text-sm" : isPast ? "text-xs text-neutral-300" : "text-xs text-neutral-500"
                }`}
              >
                {entry.text}
              </p>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
