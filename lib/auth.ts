// Shared-secret check for the Brain's machine endpoints (MCP, hooks).
export const authed = (req: Request) => {
  const token = process.env.BRAIN_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === token || new URL(req.url).searchParams.get("token") === token;
};
