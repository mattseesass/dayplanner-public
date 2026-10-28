import { DAY_END_HOUR, DAY_START_HOUR, MARKERS, SPLIT, SPLIT_START } from "@/config/profile";
import { buildDay } from "@/config/day";
import { dayType } from "./workouts";

export type Area = "training" | "mind" | "work" | "appointment" | "rest";
export type Kind = "anchor" | "flex" | "appointment";
export type Status = "pending" | "done" | "skipped";

export type Block = {
  id: string;
  title: string;
  start: number; // minutes from midnight, local
  end: number;
  area: Area;
  kind: Kind;
  status: Status;
  reason?: string;
};

export type Marker = { id: string; title: string; at: number };

export const DAY_START = DAY_START_HOUR * 60;
export const DAY_END = DAY_END_HOUR * 60;
export const SNAP = 5;

export const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Thin lines on the timeline (config/profile.ts).
export const markersFor = (): Marker[] => MARKERS;

const DAY_MS = 86_400_000;

export type PlanConfig = {
  split: string[]; // training rotation, one entry per day of the cycle; "Rest" = no lifting
  splitEpoch: string; // the date on which the cycle is at entry 0
};

export const defaultConfig: PlanConfig = { split: SPLIT, splitEpoch: SPLIT_START };

export type DayInfo = { split: string; label: string };

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const dayInfo = (iso: string, cfg: PlanConfig = defaultConfig): DayInfo => {
  const n = cfg.split.length;
  const split = cfg.split[((Math.round((parse(iso) - parse(cfg.splitEpoch)) / DAY_MS) % n) + n) % n];
  return { split, label: split === "Rest" ? "Rest day" : split };
};

// Adds an appointment and trims any flexible block it lands on, splitting the block if it sits in the middle.
export const carve = (blocks: Block[], appt: Block): Block[] => {
  const out: Block[] = [];
  for (const x of blocks) {
    if (x.kind !== "flex" || x.end <= appt.start || x.start >= appt.end) {
      out.push(x);
      continue;
    }
    if (x.start < appt.start) out.push({ ...x, end: appt.start });
    if (x.end > appt.end) out.push({ ...x, start: appt.end });
  }
  return [...out, appt];
};

// The blocks for a day that hasn't been opened yet, from config/day.ts.
export const seedBlocks = (iso: string, cfg: PlanConfig = defaultConfig): Block[] => {
  const { split } = dayInfo(iso, cfg);
  return buildDay({ split, training: dayType(split) === "training" }).sort((x, y) => x.start - y.start);
};

export const overlaps = (blocks: Block[], id: string, start: number, end: number) =>
  blocks.some((b) => b.id !== id && start < b.end && end > b.start);
