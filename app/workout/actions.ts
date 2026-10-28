"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { blankData, findPrs, type Session, type SessionData } from "@/lib/training-core";
import { getMachines, loadHistory } from "@/lib/training";
import { setBlockStatus } from "../actions";

const gymBlockId = async (date: string) => {
  const { data } = await db().from("blocks").select("id").eq("plan_date", date).like("title", "Gym%").maybeSingle();
  return data?.id as string | undefined;
};

// `data` carries any swaps or extra sets made before starting; it falls back to the preset.
export async function startWorkout(date: string, split: string, data?: SessionData): Promise<Session> {
  const s = db();
  await s
    .from("workout_sessions")
    .upsert({ plan_date: date, split, data: data ?? blankData(split) }, { onConflict: "plan_date,split", ignoreDuplicates: true });
  const { data: row, error } = await s.from("workout_sessions").select("*").eq("plan_date", date).eq("split", split).single();
  if (error) throw new Error(error.message);
  return row as Session;
}

export async function saveWorkout(id: string, data: SessionData) {
  const { error } = await db().from("workout_sessions").update({ data }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function finishWorkout(id: string, date: string, data: SessionData): Promise<Session> {
  const s = db();
  const history = (await loadHistory()).filter((h) => h.id !== id);
  const prs = findPrs(data, history);
  const { data: row, error } = await s
    .from("workout_sessions")
    .update({ data, prs, ended_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const block = await gymBlockId(date);
  if (block) await setBlockStatus(block, "done");
  revalidatePath("/workout");
  return row as Session;
}

// Back to editing a finished workout, for a mis-tapped Finish.
export async function reopenWorkout(id: string, date: string): Promise<Session> {
  const { data, error } = await db()
    .from("workout_sessions")
    .update({ ended_at: null, prs: [] })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const block = await gymBlockId(date);
  if (block) await setBlockStatus(block, "pending");
  revalidatePath("/workout");
  return data as Session;
}

export async function skipWorkout(date: string) {
  const block = await gymBlockId(date);
  if (block) await setBlockStatus(block, "skipped");
  revalidatePath("/workout");
}

export async function unskipWorkout(date: string) {
  const block = await gymBlockId(date);
  if (block) await setBlockStatus(block, "pending");
  revalidatePath("/workout");
}

export async function saveMachine(name: string, text: string) {
  const machines = await getMachines();
  const key = name.toLowerCase();
  if (text.trim()) machines[key] = text.trim();
  else delete machines[key];
  const { error } = await db()
    .from("settings")
    .upsert({ key: "machines", value: machines, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
