import { db } from "./supabase";

// `dueDate` is when it was scheduled; `late` means that date has passed without it being ticked off.
export type Due = { key: string; name: string; detail: string; taken: boolean; dueDate?: string; late?: boolean };

type Reminder = {
  key: string;
  name: string;
  detail: string;
  every_days: number | null;
  after_key: string | null;
  after_count: number | null;
};

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// Which reminders are due on `date`, and which of those are already ticked off.
// Time-based ones are due `every_days` after the last time taken (or right away if never taken).
// A reminder with after_key is instead due on every Nth taking of another reminder, counting today's if it is still to come.
export async function dueOn(date: string): Promise<Due[]> {
  const s = db();
  const [rem, logs] = await Promise.all([
    s.from("reminders").select("*").order("position"),
    s.from("reminder_logs").select("reminder_key,taken_on").lte("taken_on", date),
  ]);
  if (rem.error) throw new Error(rem.error.message);
  if (logs.error) throw new Error(logs.error.message);

  const taken = new Map<string, string[]>();
  for (const l of logs.data) taken.set(l.reminder_key, [...(taken.get(l.reminder_key) ?? []), l.taken_on]);
  const last = (key: string) => (taken.get(key) ?? []).reduce((a, b) => (a > b ? a : b), "");
  const takenToday = (key: string) => (taken.get(key) ?? []).includes(date);

  const reminders = rem.data as Reminder[];
  const timeDue = (r: Reminder) => {
    if (takenToday(r.key)) return true; // shown as taken
    const l = last(r.key);
    return !l || date >= addDays(l, r.every_days ?? 1);
  };

  const out: Due[] = [];
  for (const r of reminders) {
    if (r.every_days) {
      if (timeDue(r)) {
        const l = last(r.key);
        const dueDate = l ? addDays(l, r.every_days) : undefined;
        const isTaken = takenToday(r.key);
        out.push({ key: r.key, name: r.name, detail: r.detail, taken: isTaken, dueDate, late: !isTaken && !!dueDate && dueDate < date });
      }
    } else if (r.after_key && r.after_count) {
      const parent = reminders.find((x) => x.key === r.after_key);
      if (!parent) continue;
      const parentToday = timeDue(parent); // due today, or already taken today
      if (!parentToday) continue;
      const since = last(r.key);
      const pins = (taken.get(parent.key) ?? []).filter((d) => d > since).length;
      const counting = pins + (takenToday(parent.key) ? 0 : 1);
      if (takenToday(r.key) || counting >= r.after_count) {
        out.push({ key: r.key, name: r.name, detail: r.detail, taken: takenToday(r.key) });
      }
    }
  }
  return out;
}

export async function lastTaken(): Promise<Record<string, string>> {
  const { data } = await db().from("reminder_logs").select("reminder_key,taken_on").order("taken_on", { ascending: false });
  const out: Record<string, string> = {};
  for (const l of data ?? []) out[l.reminder_key] ??= l.taken_on;
  return out;
}
