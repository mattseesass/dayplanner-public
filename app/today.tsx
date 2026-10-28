"use client";

import { useEffect, useMemo, useState } from "react";
import { TIMEZONE } from "@/config/profile";
import { moveBlock, setBlockStatus } from "./actions";
import { setTaken } from "./reminders-actions";
import type { Due } from "@/lib/reminders";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import {
  DAY_END,
  DAY_START,
  SNAP,
  fmt,
  type Marker,
  overlaps,
  type Area,
  type Block,
  type Status,
} from "@/lib/day";

const PX = 1.5; // pixels per minute
const y = (m: number) => (m - DAY_START) * PX;

const nowLocal = () => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, min: Number(g("hour")) * 60 + Number(g("minute")) };
};

const areaVar: Record<Area, string> = {
  training: "var(--training)",
  mind: "var(--mind)",
  work: "var(--work)",
  appointment: "var(--appointment)",
  rest: "var(--rest)",
};

export default function Today({
  date,
  initial,
  label,
  macros,
  markers,
  due,
}: {
  date: string;
  initial: Block[];
  label: string;
  macros: string;
  markers: Marker[];
  due: Due[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [now, setNow] = useState<{ date: string; min: number } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const router = useRouter();
  const [taken, setTakenState] = useState<Record<string, boolean>>(() => Object.fromEntries(due.map((d) => [d.key, d.taken])));
  // Overdue reminders ask "did you take it?": the answer is the date it was really taken (null = not answered yet).
  const [answered, setAnswered] = useState<Record<string, string | null>>({});
  const answer = (key: string, takenOn: string | null, previous?: string) => {
    setAnswered({ ...answered, [key]: takenOn });
    if (takenOn) void setTaken(key, takenOn, true);
    else if (previous) void setTaken(key, previous, false);
  };
  const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const toggleTaken = (key: string) => {
    const next = !taken[key];
    setTakenState({ ...taken, [key]: next });
    void setTaken(key, date, next);
  };

  // Client-only: the server runs in UTC, so the marker appears once the real local time is known.
  useEffect(() => {
    setNow(nowLocal());
    const i = setInterval(() => setNow(nowLocal()), 15_000);
    return () => clearInterval(i);
  }, []);

  const open = blocks.find((b) => b.id === openId) ?? null;
  const height = y(DAY_END) + 8;
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = Math.ceil(DAY_START / 60); h * 60 < DAY_END; h++) out.push(h * 60);
    return out;
  }, []);

  const setStatus = (id: string, status: Status) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    setOpenId(null);
    void setBlockStatus(id, status);
  };

  const move = (id: string, deltaPx: number) => {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    const dur = b.end - b.start;
    let start = Math.round((b.start + deltaPx / PX) / SNAP) * SNAP;
    start = Math.max(DAY_START, Math.min(DAY_END - dur, start));
    if (start === b.start || overlaps(blocks, id, start, start + dur)) return;
    setBlocks((bs) => bs.map((x) => (x.id === id ? { ...x, start, end: start + dur } : x)));
    void moveBlock(id, date, start, start + dur);
  };

  const today = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <main className="phone">
      <header className="head">
        <h1>Today</h1>
        <Link className="mono back" href="/brain">
          Brain
        </Link>
        <Link className="mono back" href="/admin">
          Admin
        </Link>
        <span className="mono">
          {today}
          <br />
          {label}
          {macros && (
            <>
              <br />
              {macros}
            </>
          )}
        </span>
      </header>

      {due.length > 0 && (
        <section className="rems" aria-label="Reminders due today">
          {due.map((d) =>
            d.late && !answered[d.key] ? (
              <div key={d.key} className="rem late" role="group" aria-label={`${d.name} was due ${d.dueDate}`}>
                <span className="what">
                  <span className="t">{d.name}</span>
                  <span className="mono d">Was due {shortDate(d.dueDate!)}. Did you take it?</span>
                  <span className="ask">
                    <button type="button" onClick={() => answer(d.key, d.dueDate!)}>
                      Took it {shortDate(d.dueDate!)}
                    </button>
                    <button type="button" onClick={() => answer(d.key, date)}>
                      Took it today
                    </button>
                  </span>
                </span>
              </div>
            ) : d.late && answered[d.key] ? (
              <div key={d.key} className="rem on">
                <span className="tick" aria-hidden="true">✓</span>
                <span className="what">
                  <span className="t">{d.name}</span>
                  <span className="mono d">Taken {shortDate(answered[d.key]!)}</span>
                </span>
                <button type="button" className="mono state" onClick={() => answer(d.key, null, answered[d.key]!)}>
                  Undo
                </button>
              </div>
            ) : (
            <button key={d.key} type="button" className={`rem ${taken[d.key] ? "on" : ""}`} aria-pressed={!!taken[d.key]} onClick={() => toggleTaken(d.key)}>
              <span className="tick" aria-hidden="true">{taken[d.key] ? "✓" : ""}</span>
              <span className="what">
                <span className="t">{d.name}</span>
                <span className="mono d">{d.detail}</span>
              </span>
              <span className="mono state">{taken[d.key] ? "Taken" : "Due"}</span>
            </button>
            ),
          )}
        </section>
      )}

      <div className="track" style={{ height }}>
        {hours.map((m) => (
          <div key={m} className="hour mono" style={{ top: y(m) }}>
            {fmt(m)}
          </div>
        ))}

        {markers.map((k) => (
          <div key={k.id} className="marker mono" style={{ top: y(k.at) }}>
            <span>
              {fmt(k.at)} {k.title.toLowerCase()}
            </span>
          </div>
        ))}

        {blocks.map((b) => (
          <BlockRow
            key={b.id}
            b={b}
            dragging={dragId === b.id}
            reduce={!!reduce}
            onOpen={() =>
              b.title.startsWith("Gym")
                ? router.push(`/workout?date=${date}`)
                : b.title.startsWith("Cardio")
                  ? router.push(`/cardio?date=${date}`)
                  : setOpenId(b.id)
            }
            onDragStart={() => setDragId(b.id)}
            onDragEnd={(dy) => {
              setDragId(null);
              move(b.id, dy);
            }}
          />
        ))}

        {now && now.date === date && now.min >= DAY_START && now.min <= DAY_END && (
          <div className="now mono" style={{ top: y(now.min) }}>
            <span>{fmt(now.min)}</span>
          </div>
        )}
      </div>

      <nav className="bar" aria-label="Actions">
        <div className="bar-inner">
          <button type="button" className="primary">
            Add, e.g. dentist thu 15:00
          </button>
          <button type="button">Live</button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
            />
            <motion.div
              className="sheet"
              style={{ "--c": areaVar[open.area] } as React.CSSProperties}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}
              role="dialog"
              aria-label={open.title}
            >
              <div className="grip" />
              <h2>{open.title}</h2>
              <p className="meta mono">
                {fmt(open.start)}–{fmt(open.end)} · {open.end - open.start} min
              </p>
              {open.reason && <p className="why">{linkify(open.reason)}</p>}
              <div className="actions">
                {open.status !== "skipped" && (
                  <button type="button" onClick={() => setStatus(open.id, "skipped")}>
                    Skip
                  </button>
                )}
                {open.status !== "pending" && (
                  <button type="button" onClick={() => setStatus(open.id, "pending")}>
                    Reopen
                  </button>
                )}
                {open.status !== "done" && (
                  <button type="button" className="go" onClick={() => setStatus(open.id, "done")}>
                    Done
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

// Turns web addresses in a block's details into links.
function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part.length > 40 ? `${part.slice(0, 37)}…` : part}
      </a>
    ) : (
      part
    ),
  );
}

// Dragging starts only from the grip on the right edge, so touching the rest of a block scrolls the day.
function BlockRow({
  b,
  dragging,
  reduce,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  b: Block;
  dragging: boolean;
  reduce: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: (dy: number) => void;
}) {
  const controls = useDragControls();
  const short = (b.end - b.start) * PX < 36;
  return (
    <motion.button
      type="button"
      className={`block ${b.kind === "flex" ? "flex" : ""} ${b.status} ${dragging ? "dragging" : ""} ${short ? "short" : ""}`}
      style={{ "--c": areaVar[b.area] } as React.CSSProperties}
      initial={false}
      animate={{ top: y(b.start), height: (b.end - b.start) * PX - 2 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => onDragEnd(info.offset.y)}
      onTap={(e) => {
        if (!(e.target as HTMLElement).closest(".grip-handle")) onOpen();
      }}
    >
      <span className="title">{b.title}</span>
      {(b.end - b.start) * PX > 44 && (
        <span className="when mono">
          {fmt(b.start)}–{fmt(b.end)}
        </span>
      )}
      <span
        className="grip-handle"
        role="presentation"
        aria-hidden="true"
        onPointerDown={(e) => controls.start(e)}
      />
    </motion.button>
  );
}
