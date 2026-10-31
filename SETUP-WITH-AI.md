# Set up Day Planner with Claude

## For the person setting it up

Open **Claude Code** (the Code tab in the Claude desktop app, or `claude` in a terminal), and paste one line:

```
Set up Day Planner for me from https://github.com/OWNER/REPO and follow its SETUP-WITH-AI.md
```

(Use the address of the repository you were sent.) Claude downloads it, asks you about your day, writes your settings, and walks you through the rest. Plan on about 30 minutes.

What you'll do yourself, because only you can:
- sign up for three free accounts (GitHub, Supabase, Vercel) and sign in when a browser window opens;
- paste two values from Supabase into a file Claude opens for you, and choose your passcode. **Never paste keys or passwords into the chat.** Claude will tell you exactly where they go.

Everything below is instructions for Claude.

---

## For Claude: the setup playbook

You are setting up a self-hosted, single-user planner for the person you're talking to. They may not be technical. Work through the phases in order. Keep each message short, ask one small group of questions at a time, and say what you're about to do before doing it. Track progress with a checklist the user can see.

### Rules (always)
- **Secrets never pass through the chat.** Don't ask for keys, passwords or connection strings, and never print values from `.env.local`. You may write *random* values you generate straight into `.env.local` without displaying them. You may check that a variable is present and non-empty, but never show its value.
- You can't create accounts or sign in for the user. Give exact click-by-click instructions and wait.
- Personalise only through `config/` and the app's Admin page. Don't change other code unless something is broken.
- Their repository must be **private**, because `config/` holds their routine. Never commit `.env.local`.
- Before any command that reaches outside the project folder (creating a repo, deploying), say what it will do and get a yes.
- The macro numbers are estimates and the meals are the user's choice. Don't give diet, training or medical advice beyond writing down what they tell you.

### Phase 0. Get the code
1. Check for `node -v` (20 or newer) and `git --version`. If either is missing, tell them where to install it (nodejs.org, git-scm.com) and wait.
2. Ask where they'd like the project (default: a `day-planner` folder in their home or Documents folder). Clone the repository there, then work inside that folder.
3. Detach it from the source so their copy is their own: `git remote remove origin`.
4. Run `npm install`.

### Phase 1. Interview (one group at a time, then wait)
a. Their time zone (convert a city to an IANA name such as `Europe/London`), and which hours the timeline should cover.
b. An ordinary weekday: wake time, morning routine, meals, work or study blocks, free time, wind-down, bedtime. Ask whether weekends differ.
c. Cardio: do they do it, and when? (A block titled `Cardio` opens a page of phone-friendly tasks.)
d. Training: do they lift or train? If yes, which days, what each session is called, and the exercises with sets and rest. Offer to suggest a simple starting list if they don't have one, and say it's a generic example, not a programme made for them.
e. Meals and macros: do they want them? If yes, what they usually eat at each meal, with rough amounts. If no, leave `MEALS` empty.
f. Recurring reminders (medication, supplements, plants, anything): what, how often, and when each was last done.

### Phase 2. Write their config
- `config/profile.ts`: time zone, timeline hours, training rotation (`SPLIT`), the Monday it starts from (`SPLIT_START`), lights-out marker.
- `config/day.ts`: their day as blocks. Blocks must not overlap. Titles matter: `Gym · <session>` opens the tracker, `Cardio` opens phone tasks, and a title that matches a key in `config/meals.ts` shows that meal's macros.
- `config/workouts.ts`: an entry for every rotation name that isn't `Rest`.
- `config/meals.ts`: foods per 100 g or per piece, and the meals. Tell them to check the numbers against their packaging.
- Run `npx tsc --noEmit`. Then show a plain-language summary of a training day, a rest day and the weekly rotation, and let them correct it before you continue.

### Phase 3. Database and secrets
1. Copy `.env.example` to `.env.local`.
2. Generate `SESSION_SECRET` (and `BRAIN_TOKEN`, if they want the AI connector) and write them into `.env.local` without printing them, for example:
   `node -e "const f='.env.local',c=require('crypto');let s=require('fs').readFileSync(f,'utf8');s=s.replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+c.randomBytes(32).toString('hex'));require('fs').writeFileSync(f,s)"`
3. Walk them through Supabase: sign up at supabase.com, create a new project (any name, the nearest region), and **save the database password somewhere safe**. Wait until the project is ready.
4. Open `.env.local` in their editor (or tell them the full path) and have them paste in three values themselves:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project Settings → Data API → Project URL;
   - `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API Keys → the secret / `service_role` key;
   - `SUPABASE_DB_URL`: the **Connect** button → Session pooler → the URI, with their database password in place of `[YOUR-PASSWORD]`.
   Also have them type a long `APP_PASSCODE`. That's what they'll sign in with.
5. Check that every required name is non-empty, without showing values:
   `node -e "const t=require('fs').readFileSync('.env.local','utf8');for(const k of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_DB_URL','APP_PASSCODE','SESSION_SECRET'])console.log(k,new RegExp('^'+k+'=.+','m').test(t)?'ok':'MISSING')"`
6. Run `npm run db:migrate`.

### Phase 4. Try it locally
1. Run `npm run lint` and `npm run build`. Fix anything that fails.
2. Start `npm run dev`, then have them open http://localhost:3000 and sign in with their passcode. Confirm together that:
   - today's timeline is right;
   - tapping a block marks it done or skipped;
   - the Gym block opens the tracker (on a training day);
   - Admin shows the rotation.
3. In **Admin**, help them add each reminder and set when it was last done.

### Phase 5. Put it online
1. Make sure `git config user.email` matches the email on their GitHub account. Vercel's free plan won't build commits from any other author.
2. Commit their config, but never `.env.local` (it's already in `.gitignore`; check with `git status`).
3. Create their **private** GitHub repository and push. If the GitHub CLI is installed, `gh auth login` followed by `gh repo create day-planner --private --source . --push`. Otherwise, have them create an empty private repository on github.com, then add it as `origin` and push.
4. Vercel: have them sign in at vercel.com with GitHub, choose **Add New → Project**, import the repository, and add the environment variables from `.env.local` **except `SUPABASE_DB_URL`**. They copy the values across themselves. Then **Deploy**. If they add or change a variable later, they must redeploy.
5. Have them open their new `https://….vercel.app` address and sign in.
6. On their phone, open that address and use **Add to Home Screen** (Safari's Share menu on iPhone, the ⋮ menu in Chrome on Android).

### Phase 6. Wrap up
Tell them, briefly:
- their app address, and that the passcode keeps them signed in for 7 days;
- how to change their day later: ask Claude in this folder to edit `config/`, then commit and push. Vercel redeploys on its own. Days they've already opened keep their saved version;
- that the Supabase key and passcode protect everything, so they should never share them or screenshot `.env.local`.

### If something goes wrong
- **Blank page or database error:** the tables are missing or a variable is empty. Run the Phase 3 check and `npm run db:migrate`.
- **Sign-in fails or loops:** `SESSION_SECRET` or `APP_PASSCODE` is missing in that environment (local or Vercel).
- **`db:migrate` can't connect:** use the *Session pooler* string, not the direct one, and check the password is in it with no brackets.
- **Vercel refuses or skips a commit:** the git author email doesn't match their GitHub account.
- **Changed a variable on Vercel and nothing happened:** redeploy.
- **Wrong date or times:** `TIMEZONE` in `config/profile.ts`.

---

## Everything the app needs, at a glance

| Item | Where it goes | Who enters it |
| --- | --- | --- |
| Time zone, hours, lights-out | `config/profile.ts` | Claude, from the interview |
| Training rotation and start date | `config/profile.ts`, later in Admin | Claude |
| Ordinary day | `config/day.ts` | Claude |
| Exercises | `config/workouts.ts` | Claude (only if you train) |
| Foods and meals | `config/meals.ts` | Claude (optional) |
| Reminders and when each was last done | Admin page | You, with Claude's help |
| Supabase URL, secret key, connection string | `.env.local`, then Vercel | **You** |
| Passcode | `.env.local`, then Vercel | **You** |
| Session secret, connector token | `.env.local`, then Vercel | Claude generates; you copy them to Vercel |
