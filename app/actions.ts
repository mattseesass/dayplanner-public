"use server";

import { db } from "@/lib/supabase";
import { localToUtc } from "@/lib/time";
import type { Status } from "@/lib/day";

export async function setBlockStatus(id: string, status: Status) {
  const s = db();
  if (status === "pending") {
    // Reopened: undo the block and forget the skip or completion it logged.
    const { error } = await s.from("blocks").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    await s.from("overrides").delete().eq("block_id", id).in("action", ["done", "skipped"]);
    return;
  }
  const { data, error } = await s
    .from("blocks")
    .update({ status })
    .eq("id", id)
    .select("plan_date,title,area,starts_at")
    .single();
  if (error) throw new Error(error.message);
  await s.from("overrides").delete().eq("block_id", id).in("action", ["done", "skipped"]);
  await s.from("overrides").insert({
    block_id: id,
    plan_date: data.plan_date,
    action: status,
    title: data.title,
    from_start: data.starts_at,
    area: data.area,
  });
}

export async function moveBlock(id: string, date: string, start: number, end: number) {
  const s = db();
  const before = await s.from("blocks").select("title,area,starts_at").eq("id", id).single();
  if (before.error) throw new Error(before.error.message);
  const to = localToUtc(date, start);
  const { error } = await s
    .from("blocks")
    .update({ starts_at: to, ends_at: localToUtc(date, end) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await s.from("overrides").insert({
    block_id: id,
    plan_date: date,
    action: "moved",
    title: before.data.title,
    from_start: before.data.starts_at,
    to_start: to,
    area: before.data.area,
  });
}
