import { BROADCAST_TIME_ZONE } from "./schedule";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BROADCAST_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Seconds since midnight in the broadcast time zone, with sub-second precision. */
export function broadcastSecondsOfDay(ms: number = Date.now()): number {
  let h = 0;
  let m = 0;
  let s = 0;
  for (const part of partsFormatter.formatToParts(new Date(ms))) {
    if (part.type === "hour") h = Number(part.value);
    else if (part.type === "minute") m = Number(part.value);
    else if (part.type === "second") s = Number(part.value);
  }
  return h * 3600 + m * 60 + s + (ms % 1000) / 1000;
}

export function formatClock(secondsOfDay: number, withSeconds = true): string {
  const total = Math.floor(((secondsOfDay % 86400) + 86400) % 86400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hms = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  return (withSeconds ? hms : hms.slice(0, 2)).map(pad).join(":");
}
