import { db } from "./supabase";
import { dayInfo, seedBlocks, type Block, type PlanConfig } from "./day";
import { foodDetail } from "./food";
import { dayType } from "./workouts";
import { getSettings } from "./settings";
import { localToUtc, utcToLocal } from "./time";

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  area: Block["area"];
  kind: Block["kind"];
  status: Block["status"];
  reason: string | null;
};

const toBlock = (r: Row, iso: string): Block => ({
  id: r.id,
  title: r.title,
  start: utcToLocal(r.starts_at, iso),
  end: utcToLocal(r.ends_at, iso),
  area: r.area,
  kind: r.kind,
  status: r.status,
  reason: r.reason ?? undefined,
});

// Returns the stored plan for a date. First visit seeds it from the template.
// Until the planner exists, the template stands in for Claude's output.
export async function getPlan(iso: string, cfgIn?: PlanConfig): Promise<Block[]> {
  const s = db();
  const cfg = cfgIn ?? (await getSettings()).cfg;
  const type = dayType(dayInfo(iso, cfg).split);
  // Food blocks show their macros, worked out from the plan rather than stored, so every day gets them.
  const withFood = (bs: Block[]) =>
    bs.map((b) => ({
      ...b,
      reason:
        // A reason starting "Ate:" is what you actually ate, so the planned macros must not replace it.
        (b.reason?.startsWith("Ate:") ? b.reason : undefined) ??
        foodDetail(b.title, type) ??
        b.reason,
    }));
  const load = () =>
    s.from("blocks").select("*").eq("plan_date", iso).order("starts_at");

  const first = await load();
  if (first.error) throw new Error(first.error.message);
  if (first.data.length) return withFood(first.data.map((r) => toBlock(r as Row, iso)));

  const rows = seedBlocks(iso, cfg).map((b) => ({
    plan_date: iso,
    title: b.title,
    starts_at: localToUtc(iso, b.start),
    ends_at: localToUtc(iso, b.end),
    area: b.area,
    kind: b.kind,
    status: "pending",
    reason: b.reason ?? null,
  }));
  // A parallel request may seed the same day; the unique index makes that a no-op.
  const ins = await s
    .from("blocks")
    .upsert(rows, { onConflict: "plan_date,title,starts_at", ignoreDuplicates: true });
  if (ins.error) throw new Error(ins.error.message);
  const again = await load();
  if (again.error) throw new Error(again.error.message);
  return withFood(again.data.map((r) => toBlock(r as Row, iso)));
}
