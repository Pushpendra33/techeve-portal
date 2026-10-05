import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the service role key, which bypasses Row Level Security
// entirely — never import this into a Client Component, and never call it
// from anywhere that isn't already gated by requireSuperAdmin() or an
// equivalent permission check. This is what talks to Supabase's admin API
// (inviting users, deleting accounts, etc.) since those endpoints require
// service-role auth, not a regular user session.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (see .env.local.example).",
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
