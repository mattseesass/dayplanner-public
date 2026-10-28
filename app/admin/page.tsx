import Link from "next/link";
import { db } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { logout } from "../login/actions";
import { addReminder, removeReminder, saveSchedule } from "./actions";
import { lastTaken } from "@/lib/reminders";
import { setLastTaken } from "../reminders-actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const s = db();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ cfg }, overrides, reminders, last] = await Promise.all([
    getSettings(),
    s.from("overrides").select("action,title,plan_date,created_at").gte("created_at", since).order("created_at", { ascending: false }),
    s.from("reminders").select("key,name,detail").order("position"),
    lastTaken(),
  ]);

  const rows = overrides.data ?? [];
  const count = (a: string) => rows.filter((r) => r.action === a).length;

  return (
    <main className="phone admin">
      <header className="head">
        <h1>Admin</h1>
        <Link className="mono back" href="/">
          Today
        </Link>
      </header>

      <section>
        <h2>Training rotation</h2>
        <form action={saveSchedule}>
          <label className="lbl" htmlFor="split">
            One entry per day, comma separated. Use Rest for a day off. Each name needs exercises in config/workouts.ts.
          </label>
          <input id="split" name="split" defaultValue={cfg.split.join(", ")} />
          <label className="lbl" htmlFor="epoch">
            Rotation starts on (first entry)
          </label>
          <input id="epoch" name="epoch" type="date" defaultValue={cfg.splitEpoch} />
          <button>Save rotation</button>
          <p className="note">Applies to days not planned yet. Days already opened keep their plan.</p>
        </form>
      </section>

      <section>
        <h2>Reminders</h2>
        <p className="note">
          Recurring things like medication or supplements. Each is due every N days, counted from the last time you ticked it off on the Today screen. Set when it was last done so the schedule starts from the right day.
        </p>
        {(reminders.data ?? []).map((r) => (
          <div key={r.key} className="remrow">
            <form action={setLastTaken} className="lastrow">
              <input type="hidden" name="key" value={r.key} />
              <label htmlFor={`last-${r.key}`}>
                {r.name} <span className="mono">{r.detail}</span>
              </label>
              <input id={`last-${r.key}`} name="date" type="date" defaultValue={last[r.key] ?? ""} required />
              <button>Save</button>
            </form>
            <form action={removeReminder}>
              <input type="hidden" name="key" value={r.key} />
              <button className="rm">Remove {r.name}</button>
            </form>
          </div>
        ))}
        <form action={addReminder} className="addrem">
          <label className="lbl" htmlFor="rem-name">
            Add a reminder
          </label>
          <input id="rem-name" name="name" placeholder="Name, for example Vitamin D" required />
          <input name="detail" placeholder="Note (optional)" aria-label="Note" />
          <input name="every" type="number" min="1" defaultValue="1" aria-label="Every how many days" required />
          <button>Add (every N days)</button>
        </form>
      </section>

      <section>
        <h2>Last 14 days</h2>
        <p className="mono sum">
          {count("done")} done · {count("skipped")} skipped · {count("moved")} moved
        </p>
        <ul className="plain">
          {rows.slice(0, 10).map((r, i) => (
            <li key={i} className="mono">
              {r.plan_date} {r.action} <span className="t">{r.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <form action={logout} className="signout">
        <button>Sign out</button>
      </form>
    </main>
  );
}
