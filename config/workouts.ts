// Your exercises for each day of the split in config/profile.ts.
// Rest is written as minutes: "2 min", "1.5 min" or a range like "2-3 min" (the midpoint is used for the timer).
// `ss` groups exercises into a superset: give two neighbouring exercises the same letter.

export type Exercise = { n: string; sets: number; rest: string; ss?: string };

export const WORKOUTS: Record<string, { length?: string; ex: Exercise[] }> = {
  Push: {
    ex: [
      { n: "Bench press", sets: 3, rest: "2-3 min" },
      { n: "Shoulder press", sets: 3, rest: "2 min" },
      { n: "Incline dumbbell press", sets: 2, rest: "2 min" },
      { n: "Triceps pushdown", sets: 2, rest: "1.5 min" },
    ],
  },
  Pull: {
    ex: [
      { n: "Lat pulldown", sets: 3, rest: "2 min" },
      { n: "Seated row", sets: 3, rest: "2 min" },
      { n: "Face pull", sets: 2, rest: "1.5 min" },
      { n: "Biceps curl", sets: 2, rest: "1.5 min" },
    ],
  },
  Legs: {
    ex: [
      { n: "Squat", sets: 3, rest: "3 min" },
      { n: "Romanian deadlift", sets: 3, rest: "2-3 min" },
      { n: "Leg extension", sets: 2, rest: "2 min" },
      { n: "Calf raise", sets: 3, rest: "1.5 min" },
    ],
  },
  Upper: {
    length: "about 45 min",
    ex: [
      { n: "Chest-supported row", sets: 2, rest: "2 min" },
      { n: "Incline press", sets: 2, rest: "2 min" },
      { n: "Lateral raise", sets: 2, rest: "1 min", ss: "A" },
      { n: "Reverse pec-deck", sets: 2, rest: "1 min", ss: "A" },
    ],
  },
  Lower: {
    length: "about 40 min",
    ex: [
      { n: "Leg press", sets: 3, rest: "3 min" },
      { n: "Leg curl", sets: 2, rest: "2 min" },
      { n: "Hip thrust", sets: 2, rest: "2 min" },
    ],
  },
};
