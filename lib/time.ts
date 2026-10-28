import { TIMEZONE } from "@/config/profile";

const TZ = TIMEZONE;

const wall = (ms: number) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
};

// Plan date (YYYY-MM-DD) plus minutes after local midnight, to a UTC ISO string. 1440 = next midnight.
export const localToUtc = (iso: string, min: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, min);
  return new Date(guess - (wall(guess) - guess)).toISOString();
};

// UTC ISO string to minutes after local midnight of the plan date.
export const utcToLocal = (utc: string, iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((wall(new Date(utc).getTime()) - Date.UTC(y, m - 1, d)) / 60000);
};
