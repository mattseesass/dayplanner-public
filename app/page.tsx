import Today from "./today";
import { TIMEZONE } from "@/config/profile";
import { getPlan } from "@/lib/plan";
import { getSettings } from "@/lib/settings";
import { dayInfo, markersFor } from "@/lib/day";
import { dayMacros, macroLine } from "@/lib/food";
import { dayType } from "@/lib/workouts";
import { todayLocal } from "@/lib/brain";
import { dueOn } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// ?date=YYYY-MM-DD previews any day of the rotation.
export default async function Page(props: PageProps<"/">) {
  const { date } = await props.searchParams;
  const iso =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
  const { cfg } = await getSettings();
  const blocks = await getPlan(iso, cfg);
  const info = dayInfo(iso, cfg);
  const macros = macroLine(dayMacros(dayType(info.split)));
  // Recurring reminders (medication, supplements, anything) only make sense for today.
  const due = iso === todayLocal() ? await dueOn(iso) : [];
  return <Today key={iso} date={iso} initial={blocks} label={info.label} macros={macros} markers={markersFor()} due={due} />;
}
