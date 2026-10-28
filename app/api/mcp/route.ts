import { authed } from "@/lib/auth";
import { addToDrop, getToday, saveItem, searchBrain } from "@/lib/brain";

export const dynamic = "force-dynamic";

// Minimal MCP server over streamable HTTP (JSON responses only).
// Auth: BRAIN_TOKEN as "Authorization: Bearer <token>" or "?token=<token>".

const tools = [
  {
    name: "save_item",
    description:
      "Save a task, idea or note to the Brain. Choose the area yourself (e.g. Work, Health, Reading). Saves once per item; duplicates of an open item are ignored.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["task", "idea", "note"] },
        title: { type: "string" },
        body: { type: "string", description: "Details, context, the decision made" },
        area: { type: "string", description: "Topic or work stream; created automatically if new" },
        due_on: { type: "string", description: "Optional date, YYYY-MM-DD" },
        est_minutes: { type: "integer", description: "Optional size estimate" },
        phone: { type: "boolean", description: "true if it can be done from a phone (replies, calls, research, reading, admin); these are shown during morning cardio" },
        source: { type: "string", description: "claude-chat or claude-code" },
        source_ref: { type: "string", description: "Chat title or project, so the user can find where it came from" },
      },
      required: ["kind", "title"],
    },
  },
  {
    name: "search_brain",
    description: "Find Brain items by text, area or kind. Use before asking the user for context.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        area: { type: "string" },
        kind: { type: "string", enum: ["task", "idea", "note"] },
        status: { type: "string", enum: ["open", "done", "archived", "all"] },
        phone: { type: "boolean", description: "Only phone-friendly tasks" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_today",
    description: "Today's plan, so any chat knows what the user is doing and when.",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD, default today" } } },
  },
  {
    name: "add_to_drop",
    description: "Queue an item for tomorrow's plan. Pass an existing item_id, or a title to save a new task first.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string" },
        title: { type: "string" },
        area: { type: "string" },
      },
    },
  },
];

type Args = Record<string, unknown>;

async function call(name: string, a: Args) {
  switch (name) {
    case "save_item":
      return saveItem(a as Parameters<typeof saveItem>[0]);
    case "search_brain": {
      const items = await searchBrain(a as Parameters<typeof searchBrain>[0]);
      return items.map((i) => ({
        id: i.id,
        kind: i.kind,
        title: i.title,
        body: i.body.slice(0, 400),
        area: i.areas?.name ?? null,
        status: i.status,
        source: i.source_ref ?? i.source,
        created: i.created_at.slice(0, 10),
      }));
    }
    case "get_today":
      return getToday(a.date as string | undefined);
    case "add_to_drop":
      return addToDrop(a as Parameters<typeof addToDrop>[0]);
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

async function handle(m: Rpc) {
  if (m.id === undefined) return null; // notification
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: m.id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: m.id, error: { code, message } });

  switch (m.method) {
    case "initialize":
      return ok({
        protocolVersion: (m.params?.protocolVersion as string) ?? "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "day-planner-brain", version: "0.1.0" },
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools });
    case "tools/call": {
      try {
        const out = await call(m.params?.name as string, (m.params?.arguments as Args) ?? {});
        return ok({ content: [{ type: "text", text: JSON.stringify(out) }] });
      } catch (e) {
        return ok({ isError: true, content: [{ type: "text", text: (e as Error).message }] });
      }
    }
    default:
      return err(-32601, `method not found: ${m.method}`);
  }
}

export async function POST(req: Request) {
  if (!authed(req)) return new Response("unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return new Response("bad request", { status: 400 });
  const batch = Array.isArray(body);
  const replies = (await Promise.all((batch ? body : [body]).map(handle))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202 });
  return Response.json(batch ? replies : replies[0]);
}

export async function GET() {
  return new Response("POST only", { status: 405 });
}
