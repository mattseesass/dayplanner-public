import { TIMEZONE } from "@/config/profile";
import { db } from "./supabase";
import { getPlan } from "./plan";
import { fmt } from "./day";

export type ItemKind = "task" | "idea" | "note";
export type ItemStatus = "open" | "done" | "archived";

export type Item = {
  id: string;
  kind: ItemKind;
  title: string;
  body: string;
  source: string;
  source_ref: string | null;
  status: ItemStatus;
  est_minutes: number | null;
  due_on: string | null;
  phone: boolean;
  created_at: string;
  areas: { name: string } | null;
};

// Today (or an offset from it) as YYYY-MM-DD in your time zone.
export const todayLocal = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// Areas are created the first time Claude sees one.
export async function ensureArea(name?: string | null): Promise<string | null> {
  const n = name?.trim();
  if (!n) return null;
  const s = db();
  const find = () => s.from("areas").select("id").ilike("name", escapeLike(n)).maybeSingle();
  const hit = await find();
  if (hit.data) return hit.data.id;
  const ins = await s.from("areas").insert({ name: n }).select("id").single();
  if (ins.data) return ins.data.id;
  const again = await find(); // lost a race with another insert
  if (again.data) return again.data.id;
  throw new Error(ins.error?.message ?? "could not create area");
}

export type SaveInput = {
  kind: ItemKind;
  title: string;
  body?: string;
  area?: string;
  source?: string;
  source_ref?: string;
  due_on?: string;
  est_minutes?: number;
  phone?: boolean; // can be done from a phone, so it shows up during cardio
};

// Saves once per item: an open item of the same kind, area and title is returned instead of duplicated.
export async function saveItem(input: SaveInput) {
  const s = db();
  const title = input.title.trim();
  if (!title) throw new Error("title is required");
  const area_id = await ensureArea(input.area);

  let dupe = s
    .from("items")
    .select("id,kind,title,status")
    .eq("kind", input.kind)
    .eq("status", "open")
    .ilike("title", escapeLike(title));
  dupe = area_id ? dupe.eq("area_id", area_id) : dupe.is("area_id", null);
  const found = await dupe.limit(1).maybeSingle();
  if (found.data) return { ...found.data, duplicate: true };

  const { data, error } = await s
    .from("items")
    .insert({
      kind: input.kind,
      title,
      body: input.body ?? "",
      area_id,
      source: input.source ?? "app",
      source_ref: input.source_ref ?? null,
      due_on: input.due_on ?? null,
      est_minutes: input.est_minutes ?? null,
      phone: input.phone ?? false,
    })
    .select("id,kind,title,status")
    .single();
  if (error) throw new Error(error.message);
  return { ...data, duplicate: false };
}

export type SearchInput = {
  q?: string;
  area?: string;
  kind?: ItemKind;
  status?: ItemStatus | "all";
  phone?: boolean;
  limit?: number;
};

export async function searchBrain({ q, area, kind, status = "open", phone, limit = 100 }: SearchInput): Promise<Item[]> {
  const s = db();
  let query = s
    .from("items")
    .select("id,kind,title,body,source,source_ref,status,est_minutes,due_on,phone,created_at,areas(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) query = query.eq("kind", kind);
  if (phone !== undefined) query = query.eq("phone", phone);
  if (status !== "all") query = query.eq("status", status);
  if (q?.trim()) query = query.textSearch("search", q.trim(), { type: "websearch", config: "english" });
  if (area?.trim()) {
    const id = await s.from("areas").select("id").ilike("name", escapeLike(area.trim())).maybeSingle();
    if (!id.data) return [];
    query = query.eq("area_id", id.data.id);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as unknown as Item[];
}

export async function getToday(date = todayLocal()) {
  const blocks = await getPlan(date);
  return {
    date,
    blocks: blocks.map((b) => ({
      title: b.title,
      time: `${fmt(b.start)}-${fmt(b.end)}`,
      status: b.status,
      reason: b.reason ?? null,
    })),
  };
}

// Queues an item for tomorrow's plan. Pass an existing item_id, or a title to save a task first.
export async function addToDrop(input: { item_id?: string; title?: string; area?: string; source?: string; date?: string }) {
  const s = db();
  let item_id = input.item_id;
  if (!item_id) {
    if (!input.title) throw new Error("item_id or title is required");
    item_id = (await saveItem({ kind: "task", title: input.title, area: input.area, source: input.source })).id;
  }
  const plan_date = input.date ?? todayLocal(1);
  const { error } = await s
    .from("drop_items")
    .upsert({ plan_date, item_id }, { onConflict: "plan_date,item_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return { item_id, plan_date };
}
