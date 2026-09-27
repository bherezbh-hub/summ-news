"use client";

import { useState } from "react";
import { parseClock } from "@/lib/tv/schedule";
import { formatClock } from "@/lib/tv/clock";

// Temporary: a bar for moving the broadcast clock while checking the sync.
// Turn it off in TvScreen (SHOW_TIME_CONTROLS) once the schedule is calibrated.

const DAY = 24 * 3600;
const MARKS = ["00:00", "06:29", "12:00", "18:00", "23:59"];
const STEPS = [
  { label: "−10 דק׳", delta: -600 },
  { label: "−1 דק׳", delta: -60 },
  { label: "−10 שנ׳", delta: -10 },
  { label: "+10 שנ׳", delta: 10 },
  { label: "+1 דק׳", delta: 60 },
  { label: "+10 דק׳", delta: 600 },
];

export function TimeControls({
  nowSec,
  shifted,
  onSet,
  onReset,
}: {
  nowSec: number | null;
  /** Whether the clock differs from the real time. */
  shifted: boolean;
  onSet: (secondsOfDay: number) => void;
  onReset: () => void;
}) {
  const [typed, setTyped] = useState("");
  const value = nowSec === null ? 0 : Math.floor(nowSec);
  const set = (sec: number) => onSet(((sec % DAY) + DAY) % DAY);

  const jump = () => {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(typed.trim())) {
      set(parseClock(typed.trim()));
      setTyped("");
    }
  };

  return (
    <section
      aria-label="שליטה בזמן (זמני)"
      className="flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-amber-300">שליטה בזמן · זמני, לבדיקות</span>
        <span className="font-mono text-base tabular-nums text-white">{nowSec === null ? "--:--:--" : formatClock(nowSec)}</span>
      </div>

      <div dir="ltr" className="flex flex-col gap-1">
        <input
          id="tv-time-slider"
          type="range"
          min={0}
          max={DAY - 1}
          step={1}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="שעה בשידור"
          className="w-full accent-amber-400"
        />
        <div className="relative h-4 text-[11px] text-neutral-400">
          {MARKS.map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={() => set(parseClock(mark))}
              className="absolute -translate-x-1/2 font-mono hover:text-white"
              style={{ left: `${(parseClock(mark) / DAY) * 100}%` }}
            >
              {mark}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
        {STEPS.map((step) => (
          <button
            key={step.label}
            type="button"
            onClick={() => set(value + step.delta)}
            dir="rtl"
            className="rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-xs text-white hover:border-neutral-400"
          >
            {step.label}
          </button>
        ))}
        <input
          id="tv-time-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") jump();
          }}
          placeholder="07:31:00"
          aria-label="מעבר לשעה"
          className="w-24 rounded border border-neutral-600 bg-neutral-950 px-2 py-1 font-mono text-xs text-white"
        />
        <button type="button" onClick={jump} className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-black hover:bg-amber-400">
          מעבר
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!shifted}
          className="rounded border border-neutral-600 px-2 py-1 text-xs text-white hover:border-neutral-400 disabled:opacity-40"
        >
          חזרה לשעה האמיתית
        </button>
      </div>
    </section>
  );
}
