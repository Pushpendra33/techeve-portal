"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin, requirePermission } from "@/lib/queries";
import { PERMISSION_KEYS } from "@/lib/permissions";

// The invite email's "Confirmation URL" template in the Supabase dashboard
// must point here — see the setup guide for the exact template to paste in.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type InviteState = { error: string | null; message: string | null };

// Super-admin only: invite a new admin or instructor with a specific set of
// permissions.
export async function inviteStaff(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const me = await requireSuperAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "admin") as "admin" | "instructor";
  const permissions: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) {
    permissions[key] = formData.get(`perm_${key}`) === "on";
  }

  if (!email) return { error: "Email is required.", message: null };

  const { error: inviteRowError } = await supabase
    .from("invites")
    .insert({ email, role, permissions, invited_by: me.id });
  if (inviteRowError) return { error: inviteRowError.message, message: null };

  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/set-password`,
  });
  if (emailError) return { error: emailError.message, message: null };

  revalidatePath("/admin/staff");
  return { error: null, message: `Invite sent to ${email}.` };
}

// Requires manage_students (or super_admin): invite a student for a specific
// course + track. Their enrollment row is created automatically the moment
// they accept the invite (see the handle_new_user trigger in schema.sql).
export async function inviteStudent(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const me = await requirePermission("manage_students");
  const supabase = await createClient();
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const courseId = String(formData.get("courseId") ?? "");
  const trackType = String(formData.get("trackType") ?? "short");

  if (!email || !courseId) return { error: "Email and course are required.", message: null };

  const { error: inviteRowError } = await supabase.from("invites").insert({
    email,
    role: "student",
    course_id: courseId,
    track_type: trackType,
    invited_by: me.id,
  });
  if (inviteRowError) return { error: inviteRowError.message, message: null };

  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/set-password`,
  });
  if (emailError) return { error: emailError.message, message: null };

  revalidatePath("/admin/students");
  return { error: null, message: `Invite sent to ${email}.` };
}

// Super-admin only: change an existing staff member's role/permissions, or
// disable/re-enable their account.
export async function updateStaffMember(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const role = formData.get("role") as "admin" | "instructor" | undefined;
  const status = String(formData.get("status") ?? "active") as "active" | "disabled";
  const permissions: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) {
    permissions[key] = formData.get(`perm_${key}`) === "on";
  }

  const updateData: any = {
    status,
    permissions,
    updated_at: new Date().toISOString(),
  };
  if (role) {
    updateData.role = role;
  }

  const { error } = await supabase.from("profiles").update(updateData).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin");
  return { success: true, message: "Staff member permissions updated successfully!" };
}

export async function revokeInviteById(inviteId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("invites").update({ status: "revoked" }).eq("id", inviteId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/students");
  return { success: true, message: "Invite revoked successfully." };
}

export async function revokeInvite(formData: FormData) {
  const id = String(formData.get("id"));
  return revokeInviteById(id);
}
