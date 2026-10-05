"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; message?: string | null };

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  if (data?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.status === "disabled") {
      await supabase.auth.signOut();
      return { error: "Your account has been disabled. Please contact an administrator." };
    }

    revalidatePath("/", "layout");

    if (profile && ["super_admin", "admin", "instructor"].includes(profile.role)) {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// Used on /set-password — the user already has a session at this point
// (created server-side by /auth/confirm via verifyOtp), they're just
// choosing their real password for the first time.
export async function setPassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "User session not found. Please try again." };

  // Update password in auth system
  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) return { error: authError.message };

  // Retrieve details
  const fullName = formData.get("fullName") ? String(formData.get("fullName")) : null;
  const phone = formData.get("phone") ? String(formData.get("phone")) : null;
  const college = formData.get("college") ? String(formData.get("college")) : null;
  const yearOfStudy = formData.get("yearOfStudy") ? String(formData.get("yearOfStudy")) : null;
  const githubUrl = formData.get("githubUrl") ? String(formData.get("githubUrl")) : null;
  const linkedinUrl = formData.get("linkedinUrl") ? String(formData.get("linkedinUrl")) : null;
  const twitterUrl = formData.get("twitterUrl") ? String(formData.get("twitterUrl")) : null;
  const portfolioUrl = formData.get("portfolioUrl") ? String(formData.get("portfolioUrl")) : null;

  // Update profile
  const { data: profile, error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || "User",
      phone,
      college,
      year_of_study: yearOfStudy,
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      twitter_url: twitterUrl,
      portfolio_url: portfolioUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("role")
    .single();

  if (profileUpdateError) {
    // Non-blocking but logged error
    console.error("Profile details update failed:", profileUpdateError);
  }

  revalidatePath("/", "layout");

  // Route intelligently based on role
  if (profile && (profile.role === "admin" || profile.role === "super_admin" || profile.role === "instructor")) {
    redirect("/admin");
  } else {
    redirect("/dashboard");
  }
}
