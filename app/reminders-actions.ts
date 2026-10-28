"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

export async function setTaken(key: string, date: string, taken: boolean) {
  const s = db();
  const { error } = taken
    ? await s.from("reminder_logs").upsert({ reminder_key: key, taken_on: date }, { onConflict: "reminder_key,taken_on" })
    : await s.from("reminder_logs").delete().eq("reminder_key", key).eq("taken_on", date);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
}

// Set when something was last taken, so the schedule starts from the right place.
export async function setLastTaken(formData: FormData) {
  const key = String(formData.get("key"));
  const date = String(formData.get("date"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await setTaken(key, date, true);
}
