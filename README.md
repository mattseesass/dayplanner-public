# Day Planner

A private, phone-first day planner that you host yourself. One screen shows your whole day as a vertical timeline with a live "now" line. Tap a block to finish or skip it, drag it to move it. A built-in workout tracker, optional meal macros, recurring reminders and a small "second brain" for tasks and notes sit on top.

It is **single-user and self-hosted**: your data lives in your own free database, the app runs on your own free hosting account, and nobody else, including the person who shared this with you, can see or host any of it.

## The quick way: let Claude set it up

Open **Claude Code** (the Code tab in the Claude desktop app) and paste:

```
Set up Day Planner for me from https://github.com/OWNER/REPO and follow its SETUP-WITH-AI.md
```

Claude downloads the project, asks about your day, and walks you through everything else. See [SETUP-WITH-AI.md](SETUP-WITH-AI.md) for what to expect. The rest of this page is the manual route.


## What you get

| Part | What it does |
| --- | --- |
| **Today** | The day as a timeline built from your template. Done, skip, reopen, drag to move (from the grip on the right edge), live "now" marker, day totals for meals. |
| **Workout tracker** | Tap the Gym block. Preset exercises for the day's split, weight / reps / RPE, "last time" numbers, rest timer with a ping, warm-up sets, add or replace exercises, notes, machine settings, automatic personal records. |
| **Meals and macros** (optional) | Meals show calories and macros per food, with "swap for the same carbs" suggestions. |
| **Reminders** | Recurring things (medication, supplements, anything) that come due every N days, counted from the last time you ticked them off. Overdue ones ask "did you take it?". |
| **Brain** | A list of tasks, ideas and notes with search. Optional connector so an AI assistant can save to it. Tasks flagged "phone" show on the Cardio page, for things you can do while you exercise. |
| **Admin** | Training rotation, reminders, and a summary of the last two weeks. |

Not built: automatic planning by an AI, quick-add parsing, push notifications, offline mode. The day comes from a template you write once (see below).

## What you need

- A computer with **Node.js 20 or newer** and **Git** (only for setup)
- Free accounts at **GitHub**, **Supabase** (database) and **Vercel** (hosting)
- About 30 minutes. If you use an AI assistant such as Claude Code, it can do most of it: see [SETUP-WITH-AI.md](SETUP-WITH-AI.md).

Free tiers change, so check each provider's current terms. At the time of writing, a single-user planner fits comfortably in the free plans. Supabase pauses free projects that go unused for a while, which daily use prevents.

## Set it up

1. **Get the code.** Click **Use this template → Create a new repository** and make it **Private**, because your schedule lives in it. (Don't fork: a fork of a public repository can't be private.) Clone your copy and run `npm install`.
2. **Make it yours.** Edit the files in [`config/`](config/): see "Your information" below.
3. **Create a Supabase project** (supabase.com, free). Remember the database password you choose.
4. **Fill in `.env.local`.** Copy `.env.example` to `.env.local` and fill in each value. The comments next to each one say where to find it.
5. **Create the tables:** `npm run db:migrate`
6. **Try it locally:** `npm run dev`, open http://localhost:3000 and sign in with your passcode.
7. **Deploy:** push your copy to GitHub, import it at vercel.com, add the environment variables from `.env.local` (all except `SUPABASE_DB_URL`), then deploy.
8. **Put it on your phone:** open your Vercel address in the phone's browser, sign in, and choose Add to Home Screen.

Two things that catch people out:
- **Vercel's free plan only builds commits written by the account owner.** Make sure `git config user.email` matches the email on your GitHub account.
- **Changing an environment variable on Vercel does nothing until you redeploy.**

## Your information

Everything personal is in [`config/`](config/). The rest of the code does not need to change.

| File | What goes in it | Needed? |
| --- | --- | --- |
| `config/profile.ts` | Your time zone, the hours the timeline covers, your training rotation, a "lights out" line | Yes (time zone at least) |
| `config/day.ts` | Your ordinary day as blocks: wake, routine, meals, work, gym, wind-down | Yes |
| `config/workouts.ts` | Exercises, sets and rest times for each training day | If you train |
| `config/meals.ts` | Foods with their macros and the meals built from them | Optional (leave `MEALS` empty to switch it off) |

Then, in the app, open **Admin** once:
- check the training rotation and the date it starts from;
- add your recurring **reminders** (name, every N days) and set when each was last done.

A day is created from `config/day.ts` the first time you open it, then saved. Editing the template changes days you haven't opened yet. Days already opened keep what was saved.

## Security, in short

- The passcode is the only thing protecting the app. Make it long.
- `SUPABASE_SERVICE_ROLE_KEY` gives full access to your database. It lives only in `.env.local` and in Vercel's environment settings. Never put it in the code, in a chat or in a screenshot.
- Every table has row-level security switched on with no public policies, so the database is reachable only with that key.
- Keep your copy private, because your schedule, meals and exercises are in `config/`.

## The optional Brain connector

`/api/mcp` is a small MCP server (tools: `save_item`, `search_brain`, `get_today`, `add_to_drop`) protected by `BRAIN_TOKEN`. You can add it to an AI assistant that supports custom connectors, using `https://YOUR-APP.vercel.app/api/mcp?token=YOUR_TOKEN`. Anyone with that address can read and write your Brain, so treat it like a password. Skip it if you don't need it.

## Developing

```bash
npm run dev          # local server
npm run db:migrate   # apply new files from supabase/migrations
npm run lint
npm run build
```

Built with Next.js 16 (App Router), React 19, TypeScript, Supabase and Motion. Next.js 16 differs from older versions, so read the notes in `AGENTS.md` before changing framework-level code.

## License

MIT. See [LICENSE](LICENSE).
