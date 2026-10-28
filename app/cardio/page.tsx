import Link from "next/link";
import { getPlan } from "@/lib/plan";
import { todayLocal, searchBrain } from "@/lib/brain";
import { fmt } from "@/lib/day";
import { addPhoneTask, cardioStatus, completeTask, setPhone } from "./actions";

export const dynamic = "force-dynamic";

export default async function Cardio(props: PageProps<"/cardio">) {
  const { date } = await props.searchParams;
  const iso = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayLocal();
  const block = (await getPlan(iso)).find((b) => b.title.startsWith("Cardio"));
  const [phone, others] = await Promise.all([
    searchBrain({ kind: "task", status: "open", phone: true, limit: 50 }),
    searchBrain({ kind: "task", status: "open", phone: false, limit: 8 }),
  ]);

  return (
    <main className="phone cardio">
      <header className="head">
        <h1>Cardio</h1>
        <Link className="mono back" href={`/?date=${iso}`}>
          Today
        </Link>
        {block && (
          <span className="mono">
            {fmt(block.start)}–{fmt(block.end)}
            <br />
            {block.status === "done" ? "Done" : block.status === "skipped" ? "Skipped" : "Planned"}
          </span>
        )}
      </header>

      <p className="lead">Tasks you can do from your phone while you do cardio.</p>

      <form action={addPhoneTask} className="addrow">
        <input name="title" placeholder="Add a phone task" aria-label="New phone task" required />
        <button>Add</button>
      </form>

      <section>
        <h2>Phone tasks</h2>
        {phone.length === 0 ? (
          <p className="empty">
            Nothing queued. Good phone tasks: replying to messages, research, reading, quick admin, planning tomorrow.
          </p>
        ) : (
          <ul>
            {phone.map((t) => (
              <li key={t.id}>
                <form action={completeTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="tick" aria-label={`Mark done: ${t.title}`} />
                </form>
                <div className="what">
                  <span className="t">{t.title}</span>
                  {t.areas?.name && <span className="mono area">{t.areas.name}</span>}
                </div>
                <form action={setPhone}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="phone" value="0" />
                  <button className="later">Not now</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2>From the Brain</h2>
          <ul>
            {others.map((t) => (
              <li key={t.id}>
                <div className="what">
                  <span className="t">{t.title}</span>
                  {t.areas?.name && <span className="mono area">{t.areas.name}</span>}
                </div>
                <form action={setPhone}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="phone" value="1" />
                  <button className="later">Do on phone</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {block && (
        <nav className="bar" aria-label="Cardio">
          <form action={cardioStatus} className="bar-inner">
            <input type="hidden" name="id" value={block.id} />
            {block.status === "pending" ? (
              <>
                <button name="status" value="skipped">
                  Skip
                </button>
                <button name="status" value="done" className="go primary">
                  Cardio done
                </button>
              </>
            ) : (
              <button name="status" value="pending">
                Reopen
              </button>
            )}
          </form>
        </nav>
      )}
    </main>
  );
}
