"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="phone login">
      <h1>Day</h1>
      <form action={action}>
        <input
          name="passcode"
          type="password"
          autoComplete="current-password"
          placeholder="Passcode"
          aria-label="Passcode"
          autoFocus
          required
        />
        <button disabled={pending}>{pending ? "Checking" : "Enter"}</button>
        {state?.error && <p role="alert">{state.error}</p>}
      </form>
    </main>
  );
}
