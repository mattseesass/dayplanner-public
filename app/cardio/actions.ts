"use server";

import { revalidatePath } from "next/cache";
import { saveItem } from "@/lib/brain";
import { db } from "@/lib/supabase";
import { setBlockStatus } from "../actions";

const id = (f: FormData) => String(f.get("id"));

export async function addPhoneTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await saveItem({ kind: "task", title, phone: true, source: "app" });
  revalidatePath("/cardio");
}

export async function setPhone(formData: FormData) {
  const { error } = await db()
    .from("items")
    .update({ phone: formData.get("phone") === "1", updated_at: new Date().toISOString() })
    .eq("id", id(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/cardio");
  revalidatePath("/brain");
}

export async function completeTask(formData: FormData) {
  const { error } = await db()
    .from("items")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", id(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/cardio");
  revalidatePath("/brain");
}

export async function cardioStatus(formData: FormData) {
  await setBlockStatus(id(formData), String(formData.get("status")) as "pending" | "done" | "skipped");
  revalidatePath("/cardio");
}
