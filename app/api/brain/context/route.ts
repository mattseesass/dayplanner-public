import { searchBrain } from "@/lib/brain";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Called by the Claude Code SessionStart hook: open items for a project's area, as plain text.
export async function GET(req: Request) {
  if (!authed(req)) return new Response("unauthorized", { status: 401 });
  const area = new URL(req.url).searchParams.get("area") ?? "";
  const items = area ? await searchBrain({ area, limit: 15 }) : [];
  if (!items.length) return new Response("", { headers: { "content-type": "text/plain" } });

  const lines = items.map(
    (i) => `- [${i.kind}] ${i.title}${i.body ? `: ${i.body.replace(/\s+/g, " ").slice(0, 160)}` : ""}`,
  );
  return new Response(`Brain items for "${area}":\n${lines.join("\n")}`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
