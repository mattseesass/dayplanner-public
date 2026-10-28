# Set up Day Planner with your AI assistant

This is for you if you already use an AI that can work in a project folder and run commands (Claude Code, Cursor, Codex and similar). You do the few things only you can do (accounts, pasting your own secrets, choosing a passcode). The AI does everything else.

## What only you can do

1. **Create three free accounts:** GitHub, Supabase, Vercel.
2. **Make your own copy of this project:** on GitHub, click **Fork**, then set your fork to **Private**. Clone it to your computer and open that folder in your AI tool.
3. **Paste your own secrets into `.env.local` yourself**, in a text editor, not in the chat. The AI will tell you which ones and where to find them. Never paste a key, token or password into the AI chat.
4. **Choose your own passcode** and type it into `.env.local` yourself.

## Paste this to your AI

```
I want to set up "Day Planner", a self-hosted personal planner. Read README.md, SETUP-WITH-AI.md,
AGENTS.md and the files in config/ first. Then help me set it up, following these rules.

RULES
- Only edit the files in config/ (and the admin settings in the app) to personalise it. Do not
  change the rest of the code unless something is broken.
- Never ask me to paste secrets into this chat, and never print them. I put the values in .env.local
  myself. You may read the NAMES of the variables in .env.local, never the values.
- You may not create accounts or sign in for me. Tell me exactly what to click and I will do it.
- Keep my repository private and never commit .env.local.
- Before running a command that changes anything outside this folder, say what it does.

STEP 1. INTERVIEW ME (ask in small groups, one group at a time, and wait for my answers)
  a. My time zone (an IANA name such as Europe/London) and the hours I want the timeline to cover.
  b. My ordinary day: wake time, morning routine, meal times, work blocks, when I'm free, wind-down, bedtime.
  c. Whether I do cardio, and when. (A block titled "Cardio" opens a page for phone-friendly tasks.)
  d. Whether I lift or train. If so: which days, what each session is called, and the exercises with sets and
     rest times. (Blocks titled "Gym · <session name>" open the workout tracker.)
  e. Whether I want meal and macro tracking. If so: what I typically eat at each meal, with amounts.
     If not, leave MEALS empty.
  f. Any recurring reminders (medication, supplements, anything) with how often, and the date each was last done.

STEP 2. WRITE MY CONFIG
  - config/profile.ts: time zone, timeline hours, training rotation, the date the rotation starts, lights-out marker.
  - config/day.ts: my ordinary day. Blocks must not overlap. Titles matter: "Gym ·" opens the tracker,
    "Cardio" opens phone tasks, and a title that matches a key in config/meals.ts shows that meal's macros.
  - config/workouts.ts: an entry for every non-"Rest" name in the rotation.
  - config/meals.ts: foods per 100 g (or per piece) and the meals. Warn me that the macro numbers are estimates
    and I should check them against my packaging. Leave MEALS as {} if I said no.
  Show me a readable summary of my day and my week, and let me correct it before moving on.

STEP 3. ACCOUNTS AND KEYS (I do the clicking; you give me instructions and check my work)
  - Supabase: tell me how to create a project, and where to find the Project URL, the secret (service_role)
    key, and the Session pooler connection string. Remind me to keep the database password.
  - Copy .env.example to .env.local, then tell me which lines to fill in. For SESSION_SECRET and (if I want
    the connector) BRAIN_TOKEN, give me the command that generates a random value and tell me to paste the
    result into .env.local myself.
  - Check, without reading values, that every required variable name has a non-empty value.

STEP 4. BUILD AND TEST LOCALLY
  - npm install, npm run db:migrate, npm run lint, npm run build, npm run dev.
  - Walk me through signing in at http://localhost:3000 and what I should see: my day on the timeline, the
    workout tracker opening from the Gym block, and the Admin page. Fix anything broken.
  - In Admin: check the training rotation, and add my reminders with the date each was last done.

STEP 5. DEPLOY
  - Make sure git's user.email matches the email on my GitHub account (Vercel's free plan refuses other authors).
  - Help me push my private fork, then tell me how to import it in Vercel and which environment variables to add
    (everything in .env.local EXCEPT SUPABASE_DB_URL). Remind me to redeploy after adding variables.
  - Check that my Vercel address shows the sign-in page, and that signing in works.
  - Tell me how to add it to my phone's home screen.

STEP 6. WRAP UP
  - Summarise what you changed, what I need to remember, and how to change my day later (edit config/day.ts,
    then it applies to days I haven't opened yet).
```

## Questions your AI will ask, and where the answers go

| Your answer | Where it ends up |
| --- | --- |
| Time zone, timeline hours, lights-out time | `config/profile.ts` |
| Training days and the repeating order | `config/profile.ts` (`SPLIT`, `SPLIT_START`), editable later in **Admin** |
| Your ordinary day, hour by hour | `config/day.ts` |
| Exercises, sets and rest times | `config/workouts.ts` |
| Foods and what you eat at each meal | `config/meals.ts` (optional) |
| Recurring reminders and when each was last done | **Admin** page (stored in your database) |
| Supabase URL, secret key, connection string | `.env.local`, then Vercel's environment settings (you paste these yourself) |
| Your passcode and the random secrets | `.env.local`, then Vercel's environment settings |

## Checklist: everything the app needs from you

**Accounts (free):** GitHub, Supabase, Vercel.

**Secrets (you paste these, never the AI):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: your Supabase secret key
- [ ] `SUPABASE_DB_URL`: the Session pooler connection string (local only, for creating the tables)
- [ ] `APP_PASSCODE`: your passcode, long
- [ ] `SESSION_SECRET`: a long random string
- [ ] `BRAIN_TOKEN`: optional, only if you use the AI connector

**Personal information:**
- [ ] Time zone
- [ ] Your ordinary day (blocks and times)
- [ ] Training rotation and exercises (if you train)
- [ ] Meals and foods (optional)
- [ ] Reminders and when each was last done (optional)

## If something goes wrong

- **A blank page or a database error:** the tables probably don't exist yet, or a variable is missing. Run `npm run db:migrate` and check the names in `.env.local` against `.env.example`.
- **Signing in fails or loops:** `SESSION_SECRET` is missing or empty, or `APP_PASSCODE` is unset in that environment.
- **Vercel won't build or refuses a commit:** the git author email doesn't match your GitHub account.
- **Changed a variable on Vercel and nothing happened:** redeploy.
- **Today shows the wrong date or times:** check `TIMEZONE` in `config/profile.ts`.
