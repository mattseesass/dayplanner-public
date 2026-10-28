import { presetFor } from "./workouts";

export type SetRow = { w: string; reps: string; rpe: string; done: boolean; warm?: boolean };
export type ExRow = { name: string; ss?: string; restSec: number; sets: SetRow[]; note?: string; orig?: string };
export type SessionData = { exercises: ExRow[]; note: string };
export type Pr = { name: string; type: "e1rm" | "weight"; value: number };
export type Session = {
  id: string;
  plan_date: string;
  split: string;
  started_at: string;
  ended_at: string | null;
  data: SessionData;
  prs: Pr[];
};
// Last logged sets per exercise (keyed by lowercase name), newest session first.
export type Prev = Record<string, { w: string; reps: string; rpe: string }[]>;

const num = (v: string) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// Epley estimated one-rep max. Unreliable past about 12 reps, so those are ignored.
export const e1rm = (w: string, reps: string) => {
  const a = num(w);
  const r = num(reps);
  return a && r && r <= 12 ? a * (1 + (r - 1) / 30) : null;
};

export const doneSets = (e: ExRow) => e.sets.filter((s) => s.done);
// Warm-up sets count as logged but are left out of volume, previous-session numbers and PRs.
export const workSets = (e: ExRow) => e.sets.filter((s) => s.done && !s.warm);

export const volumeOf = (d: SessionData) =>
  d.exercises.reduce(
    (sum, e) => sum + workSets(e).reduce((s, x) => s + (num(x.w) ?? 0) * (num(x.reps) ?? 0), 0),
    0,
  );

export const blankData = (split: string): SessionData => ({
  note: "",
  exercises: presetFor(split).map((p) => ({
    name: p.name,
    ss: p.ss,
    restSec: p.restSec,
    sets: Array.from({ length: p.sets }, () => ({ w: "", reps: "", rpe: "", done: false })),
  })),
});

export function prevMap(history: Session[]): Prev {
  const out: Prev = {};
  for (const s of history) {
    for (const e of s.data.exercises) {
      const key = e.name.toLowerCase();
      const sets = workSets(e);
      if (!out[key] && sets.length) out[key] = sets.map(({ w, reps, rpe }) => ({ w, reps, rpe }));
    }
  }
  return out;
}

// Personal records for a finished session, against everything logged before it.
export function findPrs(data: SessionData, history: Session[]): Pr[] {
  const prs: Pr[] = [];
  for (const e of data.exercises) {
    const before = history.flatMap((h) => h.data.exercises.filter((x) => x.name === e.name));
    if (!before.length) continue;
    const sets = (x: ExRow) => workSets(x);
    const bestE = Math.max(0, ...before.flatMap((x) => sets(x).map((s) => e1rm(s.w, s.reps) ?? 0)));
    const bestW = Math.max(0, ...before.flatMap((x) => sets(x).map((s) => num(s.w) ?? 0)));
    const nowE = Math.max(0, ...sets(e).map((s) => e1rm(s.w, s.reps) ?? 0));
    const nowW = Math.max(0, ...sets(e).map((s) => num(s.w) ?? 0));
    if (nowE > bestE + 0.01) prs.push({ name: e.name, type: "e1rm", value: Math.round(nowE * 10) / 10 });
    else if (nowW > bestW) prs.push({ name: e.name, type: "weight", value: nowW });
  }
  return prs;
}
