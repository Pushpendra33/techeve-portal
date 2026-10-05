"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/queries";

export async function updateProfileSettings(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const fullName = formData.get("fullName") ? String(formData.get("fullName")) : "User";
  const phone = formData.get("phone") ? String(formData.get("phone")) : null;
  const avatarUrl = formData.get("avatarUrl") ? String(formData.get("avatarUrl")) : null;
  const college = formData.get("college") ? String(formData.get("college")) : null;
  const yearOfStudy = formData.get("yearOfStudy") ? String(formData.get("yearOfStudy")) : null;
  const githubUrl = formData.get("githubUrl") ? String(formData.get("githubUrl")) : null;
  const linkedinUrl = formData.get("linkedinUrl") ? String(formData.get("linkedinUrl")) : null;
  const twitterUrl = formData.get("twitterUrl") ? String(formData.get("twitterUrl")) : null;
  const portfolioUrl = formData.get("portfolioUrl") ? String(formData.get("portfolioUrl")) : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      avatar_url: avatarUrl,
      college,
      year_of_study: yearOfStudy,
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      twitter_url: twitterUrl,
      portfolio_url: portfolioUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/profile");
  revalidatePath("/dashboard/profile");
  revalidatePath("/", "layout");
}

export async function updateProfilePassword(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (password !== confirm) {
    throw new Error("Passwords do not match.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message);
  }
}
