"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

const put = async (key: string, value: unknown) => {
  const { error } = await db()
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
};

// The training rotation. Applies to days that haven't been opened yet.
export async function saveSchedule(formData: FormData) {
  const split = String(formData.get("split") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const epoch = String(formData.get("epoch") ?? "");

  if (split.length) await put("split", split);
  if (/^\d{4}-\d{2}-\d{2}$/.test(epoch)) await put("split_epoch", epoch);
  revalidatePath("/admin");
  revalidatePath("/");
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "reminder";

// A recurring reminder: due every N days, counted from the last time it was ticked off.
export async function addReminder(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const every = Math.round(Number(formData.get("every")));
  if (!name || !Number.isFinite(every) || every < 1) return;

  const s = db();
  const existing = await s.from("reminders").select("key,position");
  const keys = new Set((existing.data ?? []).map((r) => r.key));
  let key = slug(name);
  for (let n = 2; keys.has(key); n++) key = `${slug(name)}-${n}`;
  const position = Math.max(0, ...(existing.data ?? []).map((r) => r.position)) + 1;

  const { error } = await s.from("reminders").insert({
    key,
    name,
    detail: detail || `Every ${every} day${every > 1 ? "s" : ""}`,
    every_days: every,
    position,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function removeReminder(formData: FormData) {
  const { error } = await db().from("reminders").delete().eq("key", String(formData.get("key")));
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}
