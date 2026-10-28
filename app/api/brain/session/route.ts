import { saveItem } from "@/lib/brain";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Called by the Claude Code Stop hook. Stores the session's closing summary as a note in the
// project's area. Task extraction from the summary needs the Anthropic key and comes with quick-add.
export async function POST(req: Request) {
  if (!authed(req)) return new Response("unauthorized", { status: 401 });
  const { project, summary, session } = (await req.json().catch(() => ({}))) as {
    project?: string;
    summary?: string;
    session?: string;
  };
  if (!project || !summary?.trim()) return Response.json({ skipped: true });

  const day = new Date().toISOString().slice(0, 10);
  const item = await saveItem({
    kind: "note",
    title: `Code session: ${project} (${day})`,
    body: summary.trim().slice(0, 4000),
    area: project,
    source: "claude-code",
    source_ref: session ? `${project} · ${session.slice(0, 8)}` : project,
  });
  return Response.json(item);
}
