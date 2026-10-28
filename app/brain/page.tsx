import Link from "next/link";
import { searchBrain, type Item, type ItemKind, type ItemStatus } from "@/lib/brain";
import { addNote, makeTask, sendToTomorrow, setItemStatus, togglePhone } from "./actions";

export const dynamic = "force-dynamic";

const kinds: (ItemKind | "all")[] = ["all", "task", "idea", "note"];
const statuses: ItemStatus[] = ["open", "done", "archived"];

export default async function Brain(props: PageProps<"/brain">) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const q = one("q");
  const kind = kinds.includes(one("kind") as ItemKind) && one("kind") !== "all" ? (one("kind") as ItemKind) : undefined;
  const status = statuses.includes(one("status") as ItemStatus) ? (one("status") as ItemStatus) : "open";

  const items = await searchBrain({ q, kind, status });
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    const key = i.areas?.name ?? "No area";
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { q, kind, status, ...over };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "status" && v === "open")) p.set(k, v);
    const s = p.toString();
    return s ? `/brain?${s}` : "/brain";
  };

  return (
    <main className="phone brain">
      <header className="head">
        <h1>Brain</h1>
        <Link className="mono back" href="/">
          Today
        </Link>
      </header>

      <form className="search" action="/brain">
        <input name="q" defaultValue={q} placeholder="Search everything" aria-label="Search" />
        {kind && <input type="hidden" name="kind" value={kind} />}
        {status !== "open" && <input type="hidden" name="status" value={status} />}
      </form>

      <nav className="filters mono" aria-label="Filters">
        {kinds.map((k) => (
          <Link key={k} href={href({ kind: k === "all" ? undefined : k })} aria-current={(kind ?? "all") === k}>
            {k}
          </Link>
        ))}
        <span className="gap" />
        {statuses.map((s) => (
          <Link key={s} href={href({ status: s })} aria-current={status === s}>
            {s}
          </Link>
        ))}
      </nav>

      {items.length === 0 && <p className="empty">Nothing here yet. Claude saves items as you chat.</p>}

      {[...groups].map(([area, list]) => (
        <section key={area} className="area">
          <h2>{area}</h2>
          <ul>
            {list.map((i) => (
              <li key={i.id} className={i.status}>
                <div className="row">
                  <span className="mono kind">{i.kind}</span>
                  <span className="t">{i.title}</span>
                </div>
                {i.body && <p className="body">{i.body.length > 180 ? `${i.body.slice(0, 180)}…` : i.body}</p>}
                <p className="mono meta">
                  {i.created_at.slice(0, 10)} · {i.source_ref ?? i.source}
                </p>
                <div className="acts">
                  {i.status === "open" && (
                    <form action={sendToTomorrow}>
                      <input type="hidden" name="id" value={i.id} />
                      <button>Tomorrow</button>
                    </form>
                  )}
                  {i.kind === "task" && i.status === "open" && (
                    <form action={togglePhone}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="phone" value={i.phone ? "0" : "1"} />
                      <button>{i.phone ? "Not phone" : "Phone"}</button>
                    </form>
                  )}
                  {i.kind === "idea" && (
                    <form action={makeTask}>
                      <input type="hidden" name="id" value={i.id} />
                      <button>Make task</button>
                    </form>
                  )}
                  <form action={setItemStatus}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="status" value={i.status === "archived" ? "open" : "archived"} />
                    <button>{i.status === "archived" ? "Restore" : "Archive"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <form className="add" action={addNote}>
        <input name="title" placeholder="Jot an idea" aria-label="New item" required />
        <input type="hidden" name="kind" value="idea" />
        <button>Save</button>
      </form>
    </main>
  );
}
