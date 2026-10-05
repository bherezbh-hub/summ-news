"use client";

import { Person, entryLabel } from "@/lib/tv/timeline";
import { parseClock } from "@/lib/tv/schedule";

// A side panel beside the TV: the entry for the current moment, with the
// earlier ones of the day below it. Later entries stay hidden until their time.
export function TimelinePanel({
  person,
  nowSec,
  className = "",
}: {
  person: Person;
  nowSec: number | null;
  className?: string;
}) {
  const past = nowSec === null ? [] : person.entries.filter((e) => parseClock(e.from) <= nowSec);
  const current = past.at(-1);
  const earlier = past.slice(0, -1).reverse();
  // A range is "now" until it ends; a single time for the first 45 minutes.
  const ended =
    current !== undefined &&
    nowSec !== null &&
    (current.to !== undefined
      ? nowSec >= parseClock(current.to)
      : !current.onward && nowSec - parseClock(current.from) > 45 * 60);

  return (
    <aside
      aria-label={person.title}
      aria-live="polite"
      className={`flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-900/80 p-4 pt-0 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] lg:max-h-[min(78dvh,680px)] lg:w-64 lg:shrink-0 xl:w-72 ${className}`}
    >
      {/* Portrait with the panel title over its lower edge. */}
      <div className="relative -mx-4 h-36 shrink-0 sm:h-44 lg:h-40 xl:h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={person.photo} alt={person.name} className="h-full w-full object-cover object-[50%_20%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
        <h2 className="absolute inset-x-4 bottom-2 text-base font-bold leading-snug text-balance drop-shadow">{person.title}</h2>
      </div>

      {current ? (
        <div key={current.from} className="tv-timeline-enter flex flex-col gap-1.5 rounded-xl bg-neutral-800/80 p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums text-amber-300">{entryLabel(current)}</span>
            {!ended && (
              <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[11px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                עכשיו
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-neutral-100">{current.text}</p>
        </div>
      ) : (
        <p className="rounded-xl bg-neutral-800/60 p-3 text-sm text-neutral-400">
          {nowSec === null ? "…" : `עדיין אין עדכון. העדכון הראשון בשעה ${person.entries[0].from}.`}
        </p>
      )}

      {earlier.length > 0 && (
        <ol className="flex min-h-0 flex-col gap-2 overflow-y-auto border-t border-neutral-800 pt-3">
          {earlier.map((entry) => (
            <li key={entry.from} className="flex flex-col gap-0.5 text-xs leading-relaxed text-neutral-400">
              <span className="font-mono tabular-nums text-neutral-500">{entryLabel(entry)}</span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
