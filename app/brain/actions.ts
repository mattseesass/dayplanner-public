"use server";

import { revalidatePath } from "next/cache";
import { addToDrop } from "@/lib/brain";
import { db } from "@/lib/supabase";

export async function sendToTomorrow(formData: FormData) {
  await addToDrop({ item_id: String(formData.get("id")) });
  revalidatePath("/brain");
}

export async function makeTask(formData: FormData) {
  const { error } = await db()
    .from("items")
    .update({ kind: "task", updated_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/brain");
}

export async function setItemStatus(formData: FormData) {
  const { error } = await db()
    .from("items")
    .update({ status: String(formData.get("status")), updated_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/brain");
}

export async function addNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const { saveItem } = await import("@/lib/brain");
  await saveItem({
    kind: String(formData.get("kind") ?? "idea") as "task" | "idea" | "note",
    title,
    area: String(formData.get("area") ?? "") || undefined,
  });
  revalidatePath("/brain");
}

export async function togglePhone(formData: FormData) {
  const { error } = await db()
    .from("items")
    .update({ phone: formData.get("phone") === "1", updated_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/brain");
  revalidatePath("/cardio");
}
