import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// This verifies invite/recovery tokens SERVER-SIDE. Don't switch this to a
// client-side exchangeCodeForSession() flow — inviteUserByEmail can't use PKCE
// because the admin who sends the invite and the person who clicks it are on
// two different browsers/devices, which breaks PKCE's code-verifier binding.
// verifyOtp() here is the correct approach for invite links.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirectTo = searchParams.get("redirect_to") ?? "/set-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invite_link_invalid", request.url));
}
