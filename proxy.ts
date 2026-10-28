import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authDisabled, validSession } from "@/lib/session";

// Everything needs the passcode session, except the login page and the token-protected machine routes
// (/api/mcp and /api/brain/*), which check BRAIN_TOKEN themselves.
export async function proxy(req: NextRequest) {
  if (authDisabled()) return NextResponse.next();
  if (await validSession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/mcp|api/brain|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
