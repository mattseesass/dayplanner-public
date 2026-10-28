import { db } from "./supabase";
import { defaultConfig, type PlanConfig } from "./day";

// The training rotation can be changed from the Admin page; until then the defaults come from config/profile.ts.
export async function getSettings() {
  const { data, error } = await db().from("settings").select("key,value");
  if (error) throw new Error(error.message);
  const m = Object.fromEntries(data.map((r) => [r.key, r.value]));
  const cfg: PlanConfig = {
    split: m.split ?? defaultConfig.split,
    splitEpoch: m.split_epoch ?? defaultConfig.splitEpoch,
  };
  return { cfg };
}
