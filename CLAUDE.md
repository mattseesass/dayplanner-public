@AGENTS.md

# Day Planner

A self-hosted, single-user personal planner (Next.js 16, TypeScript, Supabase). Read README.md for what it does.

## If the user asks you to set it up
Follow SETUP-WITH-AI.md step by step: interview the user, write their answers into config/, help them create their own
Supabase and Vercel projects, run the migration, test locally, then deploy.

## Rules
- Personal choices live only in `config/` (time zone, day template, workouts, meals, rotation). Reminders are added in the
  app's Admin page. Do not change the rest of the code unless something is broken or the user asks.
- Never ask the user to paste secrets into the chat, and never print values from `.env.local`. They edit that file
  themselves. You may check that variable names are present and non-empty without displaying the values.
- You cannot create accounts or sign in for the user. Give them exact instructions and let them do it.
- Never commit `.env.local`, and keep the user's repository private (their schedule is in `config/`).
- The database changes only through new numbered files in `supabase/migrations/`, applied with `npm run db:migrate`.
- Check changes with `npx tsc --noEmit`, `npm run lint` and `npm run build`.
