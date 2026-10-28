import Link from "next/link";
import { getPlan } from "@/lib/plan";
import { todayLocal } from "@/lib/brain";
import { blankData, prevMap } from "@/lib/training-core";
import { getMachines, getSession, loadHistory } from "@/lib/training";
import Workout from "./workout";

export const dynamic = "force-dynamic";

export default async function WorkoutPage(props: PageProps<"/workout">) {
  const { date } = await props.searchParams;
  const iso = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayLocal();
  const gym = (await getPlan(iso)).find((b) => b.title.startsWith("Gym"));

  if (!gym) {
    return (
      <main className="phone">
        <header className="head">
          <h1>Workout</h1>
          <Link className="mono back" href={`/?date=${iso}`}>
            Today
          </Link>
        </header>
        <p className="empty">No gym session planned for this day.</p>
      </main>
    );
  }

  const split = gym.title.replace(/^Gym\s*·\s*/, "");
  const [session, history, machines] = await Promise.all([getSession(iso, split), loadHistory(), getMachines()]);

  return (
    <Workout
      key={`${iso}-${split}`}
      date={iso}
      split={split}
      gymStatus={gym.status}
      initial={session}
      blank={blankData(split)}
      prev={prevMap(history.filter((h) => h.id !== session?.id))}
      machines={machines}
    />
  );
}
