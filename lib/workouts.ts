// Turns the exercises in config/workouts.ts into what the planner and tracker use.

import { WORKOUTS } from "@/config/workouts";

// "2 min" -> 120, "2-3 min" -> 150 (midpoint), "1.5 min" -> 90.
export const restSeconds = (rest: string) => {
  const nums = (rest.match(/[\d.]+/g) ?? []).map(Number);
  if (!nums.length) return 90;
  return Math.round(((nums[0] + (nums[1] ?? nums[0])) / 2) * 60);
};

export type PresetExercise = { name: string; sets: number; rest: string; restSec: number; ss?: string };

export const presetFor = (split: string): PresetExercise[] =>
  (WORKOUTS[split]?.ex ?? []).map((e) => ({ name: e.n, sets: e.sets, rest: e.rest, ss: e.ss, restSec: restSeconds(e.rest) }));

export const workoutText = (split: string) => {
  const w = WORKOUTS[split];
  if (!w) return undefined;
  const lines = w.ex.map((e) => `${e.n}: ${e.sets} sets, rest ${e.rest}${e.ss ? ` (superset ${e.ss})` : ""}`);
  return `${w.length ? `${w.length}\n` : ""}${lines.join("\n")}`;
};

export type DayType = "training" | "rest";

export const dayType = (split: string): DayType => (split === "Rest" ? "rest" : "training");
