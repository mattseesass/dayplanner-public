"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COMMON_EXERCISES } from "@/lib/exercises";
import { doneSets, volumeOf, type ExRow, type Prev, type Session, type SessionData, type SetRow as SetData } from "@/lib/training-core";
import {
  finishWorkout,
  reopenWorkout,
  saveMachine,
  saveWorkout,
  skipWorkout,
  startWorkout,
  unskipWorkout,
} from "./actions";

const clock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const restLabel = (sec: number) => `${sec / 60} min`;
const WARMUP_REST = 60;
const NEW_EXERCISE_REST = 120;

// Audio. Browsers only start sound after a tap, so the context is created and resumed on taps
// (Start, completing a set). The ping plays at the exact end of the rest, driven by the page clock.
// A second ping is scheduled on the audio clock 1.5 s later as a backup for when the page's timers
// are throttled (screen off); it is cancelled whenever the on-time ping plays.
let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
const unlockAudio = () => {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // A compressor lets the ping run at full level without clipping, which makes it louder on phone speakers.
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      out = comp;
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
};

// Two bursts of three rising notes. Triangle waves carry well through small speakers.
const NOTES: [number, number][] = [
  [0, 1047], [0.26, 1319], [0.52, 1568],
  [1.0, 1047], [1.26, 1319], [1.52, 1568],
];

const schedulePing = (afterSeconds: number) => {
  const c = ctx;
  if (!c || !out) return () => {};
  const t0 = c.currentTime + Math.max(0, afterSeconds);
  const nodes: OscillatorNode[] = [];
  for (const [d, f] of NOTES) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(1, t0 + d + 0.015);
    g.gain.setValueAtTime(1, t0 + d + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.23);
    o.connect(g).connect(out);
    o.start(t0 + d);
    o.stop(t0 + d + 0.25);
    nodes.push(o);
  }
  return () =>
    nodes.forEach((o) => {
      try {
        o.stop();
      } catch {}
    });
};

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

type Picker = { kind: "replace"; ei: number; q: string } | { kind: "add"; q: string };

export default function Workout({
  date,
  split,
  gymStatus,
  initial,
  blank,
  prev,
  machines,
}: {
  date: string;
  split: string;
  gymStatus: "pending" | "done" | "skipped";
  initial: Session | null;
  blank: SessionData;
  prev: Prev;
  machines: Record<string, string>;
}) {
  const [session, setSession] = useState<Session | null>(initial);
  const [data, setData] = useState<SessionData>(initial?.data ?? blank);
  const [skipped, setSkipped] = useState(gymStatus === "skipped");
  const [now, setNow] = useState<number | null>(null);
  const [rest, setRest] = useState<{ end: number; total: number; rang: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [placing, setPlacing] = useState<string | null>(null); // movement chosen, waiting for its number
  const [menu, setMenu] = useState<{ ei: number; si: number } | null>(null);
  const [machineText, setMachineText] = useState<Record<string, string>>(machines);
  const [machineOpen, setMachineOpen] = useState<string | null>(null);
  const [headH, setHeadH] = useState(64);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPing = useRef<() => void>(() => {});
  const headRef = useRef<HTMLElement | null>(null);

  const phase = !session ? "idle" : session.ended_at ? "done" : "active";
  const canEdit = phase !== "done";
  const canLog = phase === "active";

  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  // The header is fixed so it stays put while scrolling. With the phone keyboard open the visible
  // area can shift, so the header follows the visual viewport instead of the page.
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight));
    ro.observe(el);
    setHeadH(el.offsetHeight);
    const vv = window.visualViewport;
    const follow = () => document.documentElement.style.setProperty("--vv-top", `${vv?.offsetTop ?? 0}px`);
    vv?.addEventListener("resize", follow);
    vv?.addEventListener("scroll", follow);
    follow();
    return () => {
      ro.disconnect();
      vv?.removeEventListener("resize", follow);
      vv?.removeEventListener("scroll", follow);
      document.documentElement.style.removeProperty("--vv-top");
    };
  }, []);

  // Rest ended: ping on time, buzz, and cancel the backup ping.
  useEffect(() => {
    if (rest && !rest.rang && now && now >= rest.end) {
      setRest({ ...rest, rang: true });
      if (now - rest.end < 2000) {
        cancelPing.current();
        unlockAudio();
        cancelPing.current = schedulePing(0);
      }
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
    }
  }, [now, rest]);

  const startRest = (seconds: number) => {
    cancelPing.current();
    cancelPing.current = schedulePing(seconds + 1.5); // backup only
    setRest({ end: Date.now() + seconds * 1000, total: seconds, rang: false });
  };
  const stopRest = () => {
    cancelPing.current();
    setRest(null);
  };

  const persist = useCallback(
    (next: SessionData, immediate = false) => {
      if (!session || session.ended_at) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const run = () => void saveWorkout(session.id, next);
      if (immediate) run();
      else saveTimer.current = setTimeout(run, 500);
    },
    [session],
  );

  // Compute from the current data, then save outside the state updater (updaters must stay pure).
  const update = (fn: (d: SessionData) => SessionData, immediate = false) => {
    const next = fn(data);
    setData(next);
    persist(next, immediate);
  };

  const patchEx = (ei: number, fn: (e: ExRow) => ExRow, immediate = false) =>
    update((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === ei ? fn(e) : e)) }), immediate);

  const setField = (ei: number, si: number, field: "w" | "reps" | "rpe", value: string) =>
    patchEx(ei, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, [field]: value } : s)) }));

  // Position of a set among the working sets, which is how "Last" numbers line up (warm-ups don't count).
  const workIndex = (e: ExRow, si: number) => e.sets.slice(0, si).filter((s) => !s.warm).length;

  const toggleDone = (ei: number, si: number) => {
    unlockAudio();
    const e = data.exercises[ei];
    const s0 = e.sets[si];
    const wasDone = s0.done;
    const p = s0.warm ? undefined : prev[e.name.toLowerCase()]?.[workIndex(e, si)];
    patchEx(
      ei,
      (x) => ({
        ...x,
        sets: x.sets.map((s, j) =>
          j !== si
            ? s
            : {
                ...s,
                done: !wasDone,
                // Logging a set with empty boxes keeps last time's numbers.
                w: !wasDone && s.w === "" && p ? p.w : s.w,
                reps: !wasDone && s.reps === "" && p ? p.reps : s.reps,
                rpe: !wasDone && s.rpe === "" && p ? p.rpe : s.rpe,
              },
        ),
      }),
      true,
    );
    if (!wasDone) {
      // In a superset the rest comes after the last exercise of the pair. Warm-ups get a short rest.
      const next = data.exercises[ei + 1];
      const midPair = e.ss && next?.ss === e.ss;
      if (midPair) stopRest();
      else startRest(s0.warm ? WARMUP_REST : e.restSec);
    } else {
      stopRest();
    }
  };

  const addSet = (ei: number) =>
    patchEx(ei, (e) => ({ ...e, sets: [...e.sets, { w: "", reps: "", rpe: "", done: false }] }), true);

  const removeSet = (ei: number, si?: number) =>
    patchEx(
      ei,
      (e) => (e.sets.length > 1 ? { ...e, sets: e.sets.filter((_, j) => j !== (si ?? e.sets.length - 1)) } : e),
      true,
    );

  const toggleWarm = (ei: number, si: number) =>
    patchEx(ei, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, warm: !s.warm } : s)) }), true);

  const replaceWith = (ei: number, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    patchEx(
      ei,
      (e) => {
        const orig = e.orig ?? e.name;
        return { ...e, name: clean, orig: clean === orig ? undefined : orig };
      },
      true,
    );
    setPicker(null);
  };

  // Insert a new movement so it becomes number `index + 1`.
  const insertExercise = (name: string, index: number) => {
    const fresh: ExRow = {
      name,
      restSec: NEW_EXERCISE_REST,
      sets: [0, 1].map(() => ({ w: "", reps: "", rpe: "", done: false })),
    };
    update((d) => ({ ...d, exercises: [...d.exercises.slice(0, index), fresh, ...d.exercises.slice(index)] }), true);
    setPlacing(null);
  };

  const saveMachineText = (name: string) => {
    void saveMachine(name, machineText[name.toLowerCase()] ?? "");
  };

  const start = async () => {
    unlockAudio();
    setBusy(true);
    try {
      const s = await startWorkout(date, split, data);
      setSession(s);
      setData(s.data);
      setSkipped(false);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    setBusy(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const s = await finishWorkout(session.id, date, data);
      setSession(s);
      stopRest();
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const s = await reopenWorkout(session.id, date);
      setSession(s);
      setData(s.data);
    } finally {
      setBusy(false);
    }
  };

  const toggleSkip = async () => {
    setBusy(true);
    try {
      if (skipped) await unskipWorkout(date);
      else await skipWorkout(date);
      setSkipped(!skipped);
    } finally {
      setBusy(false);
    }
  };

  const total = data.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = data.exercises.reduce((n, e) => n + doneSets(e).length, 0);
  const elapsed =
    session && now
      ? ((session.ended_at ? new Date(session.ended_at).getTime() : now) - new Date(session.started_at).getTime()) / 1000
      : 0;
  const left = rest && now ? (rest.end - now) / 1000 : 0;
  const resting = phase === "active" && rest && !rest.rang && left > 0;

  const adjustRest = (deltaSec: number) => {
    if (!rest) return;
    const end = rest.end + deltaSec * 1000;
    const remaining = (end - Date.now()) / 1000;
    cancelPing.current();
    cancelPing.current = schedulePing(remaining + 1.5);
    setRest({ ...rest, end });
  };

  const q = picker?.q.trim().toLowerCase() ?? "";
  const matches = picker ? COMMON_EXERCISES.filter((n) => !q || n.toLowerCase().includes(q)).slice(0, 60) : [];
  const choose = (name: string) => {
    if (!picker) return;
    if (picker.kind === "replace") replaceWith(picker.ei, name);
    else {
      setPicker(null);
      setPlacing(name.trim());
    }
  };

  const menuEx = menu ? data.exercises[menu.ei] : null;
  const menuSet = menu && menuEx ? menuEx.sets[menu.si] : null;

  return (
    <main className="phone wk">
      <header className="wk-head" ref={headRef}>
        <div className="row1">
          <h1>{split}</h1>
          <span className="mono clock" aria-label="Elapsed workout time">
            {phase === "idle" ? "" : clock(elapsed)}
          </span>
          <span className="spacer" />
          <span className="mono prog">
            {done}/{total}
          </span>
          <Link className="mono back" href={`/?date=${date}`}>
            Today
          </Link>
        </div>
        {resting && rest && (
          <div className="rest" role="timer" aria-label="Rest timer">
            <span className="mono left">{clock(left)}</span>
            <span className="line">
              <i style={{ width: `${Math.max(0, Math.min(100, (left / rest.total) * 100))}%` }} />
            </span>
            <button type="button" onClick={() => adjustRest(-15)}>
              −15
            </button>
            <button type="button" onClick={() => adjustRest(15)}>
              +15
            </button>
            <button type="button" onClick={stopRest}>
              Skip
            </button>
          </div>
        )}
        {phase === "active" && rest && !resting && (
          <div className="rest over" role="status">
            <span className="mono left">Rest over</span>
            <span className="spacer" />
            <button type="button" onClick={stopRest}>
              Dismiss
            </button>
          </div>
        )}
      </header>
      <div style={{ height: headH }} aria-hidden="true" />

      {phase === "done" && session && (
        <section className="wk-sum">
          <div className="mono stats">
            <span>
              <b>{Math.max(1, Math.round(elapsed / 60))}</b> min
            </span>
            <span>
              <b>{done}</b> sets
            </span>
            <span>
              <b>{Math.round(volumeOf(data)).toLocaleString("en-US")}</b> kg
            </span>
          </div>
          {session.prs.length > 0 && (
            <ul className="prs">
              {session.prs.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <span className="mono">
                    {p.type === "e1rm" ? "est. 1RM" : "heaviest"} {p.value} kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {data.exercises.map((e, ei) => {
        const key = e.name.toLowerCase();
        const sameAsPrev = ei > 0 && data.exercises[ei - 1].ss === e.ss && e.ss;
        const setting = machineText[key];
        let working = 0;
        return (
          <section key={ei} className={`ex ${e.ss ? "ss" : ""}`}>
            {e.ss && !sameAsPrev && <p className="mono tag">Superset {e.ss}</p>}
            <div className="exhead">
              <h2>
                <span className="num mono">{ei + 1}</span>
                {e.name}
              </h2>
              <div className="exact">
                <button
                  type="button"
                  className={`icon ${setting ? "has" : ""}`}
                  aria-label={`Machine settings for ${e.name}`}
                  aria-expanded={machineOpen === key}
                  onClick={() => setMachineOpen(machineOpen === key ? null : key)}
                >
                  <GearIcon />
                </button>
                {canEdit && (
                  <button type="button" className="text" onClick={() => setPicker({ kind: "replace", ei, q: "" })}>
                    Replace
                  </button>
                )}
              </div>
            </div>
            <p className="mono meta">
              {e.sets.length} sets · rest {restLabel(e.restSec)}
              {e.orig ? ` · replaces ${e.orig}` : ""}
            </p>
            {setting && machineOpen !== key && <p className="mono setting">{setting}</p>}
            {machineOpen === key && (
              <input
                className="machine"
                aria-label={`Machine settings for ${e.name}`}
                placeholder="Seat height, pin, angle…"
                value={setting ?? ""}
                onChange={(ev) => setMachineText({ ...machineText, [key]: ev.target.value })}
                onBlur={() => saveMachineText(e.name)}
                autoFocus
              />
            )}

            <div className="sets">
              <span className="h mono">Set</span>
              <span className="h mono">Last</span>
              <span className="h mono">kg</span>
              <span className="h mono">Reps</span>
              <span className="h mono">RPE</span>
              <span className="h mono" />
              {e.sets.map((s, si) => {
                const label = s.warm ? "W" : String(++working);
                const p = s.warm ? undefined : prev[key]?.[working - 1];
                return (
                  <SetRow
                    key={si}
                    label={label}
                    warm={!!s.warm}
                    set={s}
                    prev={p}
                    locked={!canLog}
                    menuLocked={!canEdit}
                    onMenu={() => setMenu({ ei, si })}
                    onField={(f, v) => setField(ei, si, f, v)}
                    onToggle={() => toggleDone(ei, si)}
                  />
                );
              })}
            </div>

            {canEdit && (
              <div className="setctl">
                <button type="button" onClick={() => addSet(ei)}>
                  + Set
                </button>
                {e.sets.length > 1 && (
                  <button type="button" onClick={() => removeSet(ei)}>
                    − Set
                  </button>
                )}
              </div>
            )}

            <textarea
              className="note"
              rows={1}
              aria-label={`Notes for ${e.name}`}
              placeholder="Notes"
              value={e.note ?? ""}
              disabled={phase === "done"}
              onChange={(ev) => patchEx(ei, (x) => ({ ...x, note: ev.target.value }))}
            />
          </section>
        );
      })}

      {canEdit && (
        <button type="button" className="addex" onClick={() => setPicker({ kind: "add", q: "" })}>
          + Add exercise
        </button>
      )}

      <nav className="bar wk-bar" aria-label="Workout">
        <div className="bar-inner">
          {phase === "idle" && (
            <>
              <button type="button" onClick={toggleSkip} disabled={busy}>
                {skipped ? "Unskip" : "Skip"}
              </button>
              <button type="button" className="go primary" onClick={start} disabled={busy || skipped}>
                Start workout
              </button>
            </>
          )}
          {phase === "active" && (
            <>
              <span className="mono prog">
                {done}/{total} sets
              </span>
              <button type="button" className="go primary" onClick={finish} disabled={busy}>
                Finish
              </button>
            </>
          )}
          {phase === "done" && (
            <>
              <button type="button" onClick={reopen} disabled={busy}>
                Edit
              </button>
              <Link className="btnlink go primary" href={`/?date=${date}`}>
                Back to Today
              </Link>
            </>
          )}
        </div>
      </nav>

      {picker && (
        <div className="picker" role="dialog" aria-label={picker.kind === "replace" ? "Replace movement" : "Add exercise"}>
          <div className="pickhead">
            <input
              autoFocus
              placeholder={picker.kind === "replace" ? "Replace with…" : "Search or type a movement"}
              aria-label="Search movements"
              value={picker.q}
              onChange={(ev) => setPicker({ ...picker, q: ev.target.value })}
            />
            <button type="button" onClick={() => setPicker(null)}>
              Cancel
            </button>
          </div>
          <ul>
            {picker.q.trim() && !matches.some((n) => n.toLowerCase() === q) && (
              <li>
                <button type="button" onClick={() => choose(picker.q)}>
                  Use “{picker.q.trim()}”
                </button>
              </li>
            )}
            {matches.map((n) => (
              <li key={n}>
                <button type="button" onClick={() => choose(n)}>
                  {n}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {placing && (
        <div className="picker" role="dialog" aria-label="Choose position">
          <div className="pickhead">
            <p className="placing">
              <span className="mono">Place</span> {placing}
            </p>
            <button type="button" onClick={() => setPlacing(null)}>
              Cancel
            </button>
          </div>
          <ul className="positions">
            {data.exercises.map((e, i) => (
              <li key={i}>
                <button type="button" onClick={() => insertExercise(placing, i)}>
                  <span className="num mono">{i + 1}</span>
                  <span>
                    Before <b>{e.name}</b>
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => insertExercise(placing, data.exercises.length)}>
                <span className="num mono">{data.exercises.length + 1}</span>
                <span>At the end</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      {menu && menuEx && menuSet && (
        <>
          <button type="button" className="scrim" aria-label="Close menu" onClick={() => setMenu(null)} />
          <div className="setmenu" role="menu" aria-label={`Set ${menu.si + 1} options`}>
            <p className="mono">
              {menuEx.name} · set {menu.si + 1}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleWarm(menu.ei, menu.si);
                setMenu(null);
              }}
            >
              {menuSet.warm ? "Make it a working set" : "Make it a warm-up (W)"}
            </button>
            {menuEx.sets.length > 1 && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  removeSet(menu.ei, menu.si);
                  setMenu(null);
                }}
              >
                Remove this set
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => setMenu(null)}>
              Cancel
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function SetRow({
  label,
  warm,
  set,
  prev,
  locked,
  menuLocked,
  onMenu,
  onField,
  onToggle,
}: {
  label: string;
  warm: boolean;
  set: SetData;
  prev?: { w: string; reps: string; rpe: string };
  locked: boolean;
  menuLocked: boolean;
  onMenu: () => void;
  onField: (f: "w" | "reps" | "rpe", v: string) => void;
  onToggle: () => void;
}) {
  const cls = set.done ? "done" : "";
  return (
    <>
      <button
        type="button"
        className={`idx mono ${warm ? "warm" : ""}`}
        aria-label={`Set ${label} options`}
        disabled={menuLocked}
        onClick={onMenu}
      >
        {label}
      </button>
      <span className="prev mono">{prev ? `${prev.w || "–"}×${prev.reps || "–"}` : "—"}</span>
      <input
        className={cls}
        inputMode="decimal"
        aria-label={`Set ${label} weight in kilograms`}
        value={set.w}
        placeholder={prev?.w ?? ""}
        disabled={locked}
        onChange={(e) => onField("w", e.target.value)}
      />
      <input
        className={cls}
        inputMode="numeric"
        aria-label={`Set ${label} reps`}
        value={set.reps}
        placeholder={prev?.reps ?? ""}
        disabled={locked}
        onChange={(e) => onField("reps", e.target.value)}
      />
      <input
        className={cls}
        inputMode="decimal"
        aria-label={`Set ${label} RPE`}
        value={set.rpe}
        placeholder={prev?.rpe ?? ""}
        disabled={locked}
        onChange={(e) => onField("rpe", e.target.value)}
      />
      <button
        type="button"
        className={`check ${set.done ? "on" : ""}`}
        aria-label={set.done ? `Undo set ${label}` : `Complete set ${label}`}
        aria-pressed={set.done}
        disabled={locked}
        onClick={onToggle}
      >
        {set.done ? "✓" : ""}
      </button>
    </>
  );
}
