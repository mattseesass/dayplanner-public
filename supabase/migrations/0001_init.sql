-- Day Planner schema. Single user. All timestamps are timestamptz (UTC); the app shows them in the
-- time zone set in config/profile.ts.
-- Row-level security is on for every table with no policies, so only the server's secret key can read or write.

create extension if not exists pgcrypto;

-- Topics and work streams for the Brain. Created automatically the first time one is seen.
create table areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- The Brain: tasks, ideas and notes from any source.
create table items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('task','idea','note')),
  title text not null,
  body text not null default '',
  source text not null default 'app', -- app, claude-chat, claude-code, import
  source_ref text,                    -- chat or session reference
  area_id uuid references areas(id) on delete set null,
  status text not null default 'open' check (status in ('open','done','archived')),
  est_minutes int,
  due_on date,
  phone boolean not null default false, -- can be done from a phone, shown on the Cardio page
  search tsvector generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_search_idx on items using gin (search);
create index items_area_idx on items (area_id, status);
create index items_phone_idx on items (phone) where phone;

create table item_links (
  from_id uuid not null references items(id) on delete cascade,
  to_id uuid not null references items(id) on delete cascade,
  note text,
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

-- Fixed appointments.
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  item_id uuid references items(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_starts_idx on events (starts_at);

-- Raw end-of-day dump for a given plan date, before it is turned into a plan.
create table drops (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  raw text not null,
  created_at timestamptz not null default now()
);
create index drops_date_idx on drops (plan_date);

-- Items queued for a given day's plan.
create table drop_items (
  drop_id uuid references drops(id) on delete cascade,
  plan_date date not null,
  item_id uuid not null references items(id) on delete cascade,
  primary key (plan_date, item_id)
);

-- The planned day. One row per block, per plan date. Created from config/day.ts the first time a day is opened.
create table blocks (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  area text not null check (area in ('training','mind','work','appointment','rest')),
  kind text not null check (kind in ('anchor','flex','appointment')),
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  reason text,
  event_id uuid references events(id) on delete set null,
  item_id uuid references items(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index blocks_date_idx on blocks (plan_date, starts_at);
-- Opening a day twice at once must not create it twice.
create unique index blocks_unique_idx on blocks (plan_date, title, starts_at);

-- Every skip, drag and completion.
create table overrides (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete set null,
  plan_date date not null,
  action text not null check (action in ('done','skipped','moved','resized')),
  title text not null,
  from_start timestamptz,
  to_start timestamptz,
  area text,
  created_at timestamptz not null default now()
);
create index overrides_date_idx on overrides (plan_date);

-- Key/value settings (the training rotation, remembered machine settings).
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Logged workouts. The exercise list is preset by the split; `data` holds the sets as entered:
-- { "exercises": [{ "name", "ss", "restSec", "sets": [{ "w", "reps", "rpe", "done", "warm" }] }], "note": "" }
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  split text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  data jsonb not null,
  prs jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (plan_date, split)
);
create index workout_sessions_done_idx on workout_sessions (ended_at desc) where ended_at is not null;

-- Recurring reminders (medication, supplements, anything). Due dates come from when each was last ticked off.
-- Add them from the Admin page. every_days: due that many days after the last time. after_key + after_count:
-- due on every Nth taking of another reminder instead.
create table reminders (
  key text primary key,
  name text not null,
  detail text not null default '',
  every_days int,
  after_key text,
  after_count int,
  position int not null default 0
);

create table reminder_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_key text not null references reminders(key) on delete cascade,
  taken_on date not null,
  created_at timestamptz not null default now(),
  unique (reminder_key, taken_on)
);

alter table areas enable row level security;
alter table items enable row level security;
alter table item_links enable row level security;
alter table events enable row level security;
alter table drops enable row level security;
alter table drop_items enable row level security;
alter table blocks enable row level security;
alter table overrides enable row level security;
alter table settings enable row level security;
alter table workout_sessions enable row level security;
alter table reminders enable row level security;
alter table reminder_logs enable row level security;
