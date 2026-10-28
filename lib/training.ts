import { db } from "./supabase";
import type { Session } from "./training-core";

export async function getSession(date: string, split: string): Promise<Session | null> {
  const { data, error } = await db()
    .from("workout_sessions")
    .select("*")
    .eq("plan_date", date)
    .eq("split", split)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Session | null) ?? null;
}

export async function loadHistory(): Promise<Session[]> {
  const { data, error } = await db()
    .from("workout_sessions")
    .select("*")
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(150);
  if (error) throw new Error(error.message);
  return data as Session[];
}

// Machine settings (seat height, pin, angle) are remembered per exercise name across sessions.
export async function getMachines(): Promise<Record<string, string>> {
  const { data } = await db().from("settings").select("value").eq("key", "machines").maybeSingle();
  return (data?.value as Record<string, string> | undefined) ?? {};
}
