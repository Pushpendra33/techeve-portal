"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Fallback safety net. The *correct* flow verifies invite/recovery tokens
// server-side via /auth/confirm (see that route's comments for why). But if
// the "Invite user" email template in the Supabase dashboard hasn't been
// customized yet (see setup guide, step 5), Supabase falls back to its own
// hosted confirmation page, which redirects back here with the session
// tokens sitting in the URL hash fragment instead — e.g.
//   http://localhost:3000/#access_token=...&refresh_token=...&type=invite
// A hash fragment never reaches the server, so nothing server-side can act
// on it. This component runs client-side, notices the leftover fragment,
// establishes the session from it directly, and routes to the right place —
// so invites still work even before the email template is fixed.
export function HashTokenBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!window.location.hash) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      // Strip the tokens out of the URL either way — they should never
      // linger in the address bar or browser history.
      window.history.replaceState(null, "", window.location.pathname);

      router.replace(error ? "/login?error=invite_link_invalid" : "/set-password");
    });
  }, [router]);

  return null;
}
