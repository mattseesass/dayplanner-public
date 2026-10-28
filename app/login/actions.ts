"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, SESSION_SECONDS, makeSession } from "@/lib/session";

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return { error: "No passcode is set on the server." };

  const given = String(formData.get("passcode") ?? "");
  if (!same(given, expected)) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return { error: "Wrong passcode." };
  }

  (await cookies()).set(COOKIE, await makeSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
