import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the secret key, so never import this from a client component.
export const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
