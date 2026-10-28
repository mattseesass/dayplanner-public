// Passcode session: a signed expiry timestamp in an httpOnly cookie. Web Crypto only, so the proxy can use it too.
export const COOKIE = "dp_session";
export const SESSION_DAYS = 7;
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

const enc = new TextEncoder();

const key = () => {
  const secret = process.env.SESSION_SECRET || process.env.BRAIN_TOKEN || "";
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
};

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const sign = async (payload: string) => hex(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));

export const makeSession = async () => {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${exp}.${await sign(exp)}`;
};

export const validSession = async (value?: string) => {
  if (!value || !(process.env.SESSION_SECRET || process.env.BRAIN_TOKEN)) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const expected = await sign(exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
};

// With no passcode configured, local development stays open and production stays locked.
export const authDisabled = () => !process.env.APP_PASSCODE && process.env.NODE_ENV === "development";
