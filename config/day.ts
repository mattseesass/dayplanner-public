// Your daily template: the blocks that make up an ordinary day. Edit freely.
// A day is built from this the first time you open it, then stored, so changes here apply to
// days you have not opened yet. Days already opened keep what was saved.
//
// Block fields:
//   title  - shown on the timeline. Titles that match a meal in config/meals.ts show that meal's macros.
//            A title starting "Gym" opens the workout tracker. A title starting "Cardio" opens the phone-tasks page.
//   start/end - minutes after midnight; t(7, 30) is 07:30.
//   area   - colour group: "training" | "mind" | "work" | "appointment" | "rest"
//   kind   - "anchor" (fixed) or "flex" (work that can move)
//   reason - details shown when you tap the block
// Blocks must not overlap.

import type { Area, Block, Kind } from "@/lib/day";
import { workoutText } from "@/lib/workouts";

const t = (h: number, m = 0) => h * 60 + m;

const blk = (
  title: string,
  start: number,
  end: number,
  area: Area,
  kind: Kind = "anchor",
  reason?: string,
): Block => ({ id: title, title, start, end, area, kind, status: "pending", reason });

// `split` is today's entry from the rotation ("Push", "Rest", ...). `training` is true on lifting days.
export const buildDay = ({ split, training }: { split: string; training: boolean }): Block[] => [
  blk("Wake", t(7), t(7, 10), "rest"),
  blk("Morning routine", t(7, 10), t(7, 40), "mind", "anchor", "Water, stretch, plan the day."),
  blk("Cardio", t(7, 40), t(8, 25), "training", "anchor", "A good slot for tasks you can do from your phone."),
  blk("Breakfast", t(8, 30), t(9), "rest"),
  blk("Work", t(9), t(12), "work", "flex", "Deep work while focus is highest."),
  blk("Lunch", t(12), t(12, 45), "rest"),
  blk("Work", t(12, 45), t(15), "work", "flex"),
  training
    ? blk(`Gym · ${split}`, t(15), t(16), "training", "anchor", workoutText(split))
    : blk("Work", t(15), t(16), "work", "flex"),
  blk("Work", t(16), t(18, 30), "work", "flex"),
  blk("Dinner", t(18, 30), t(19, 15), "rest"),
  blk("Free time", t(19, 15), t(21), "rest", "flex"),
  blk("Plan tomorrow", t(21), t(21, 15), "work"),
  blk("Wind-down", t(21, 15), t(21, 45), "mind", "anchor", "Screens off, read, get ready for bed."),
];
