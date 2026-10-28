// Applies supabase/migrations/*.sql in order, once each. Reads SUPABASE_DB_URL from .env.local.
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("create table if not exists _migrations (name text primary key, applied_at timestamptz default now())");

const done = new Set((await client.query("select name from _migrations")).rows.map((r) => r.name));
for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  console.log("applying", f);
  await client.query("begin");
  try {
    await client.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
    await client.query("insert into _migrations (name) values ($1)", [f]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    console.error("failed:", e.message);
    process.exit(1);
  }
}
const { rows } = await client.query("select table_name from information_schema.tables where table_schema='public' order by 1");
console.log("tables:", rows.map((r) => r.table_name).join(", "));
await client.end();
