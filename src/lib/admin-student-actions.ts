"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, getProfile } from "@/lib/queries";
import type { UserRole, AccountStatus, EnrollmentStatus, EnrollmentTrackType } from "./supabase/types";

// Update student profile details. If super admin, role and status can also be changed.
export async function updateStudentProfile(
  studentId: string,
  formData: FormData
) {
  await requirePermission("manage_students");
  const { profile: currentUserProfile } = await getProfile();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const college = String(formData.get("college") ?? "").trim();
  const yearOfStudy = String(formData.get("year_of_study") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const updateData: any = {
    full_name: fullName,
    phone: phone || null,
    college: college || null,
    year_of_study: yearOfStudy || null,
    notes: notes || null,
    updated_at: new Date().toISOString()
  };

  // If super admin, allow updating role and account status
  if (currentUserProfile?.role === "super_admin") {
    const role = formData.get("role") as UserRole;
    const status = formData.get("status") as AccountStatus;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", studentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
}

// Update student enrollment details (status, course track type, etc.)
export async function updateStudentEnrollment(
  enrollmentId: string,
  formData: FormData
) {
  await requirePermission("manage_students");
  const supabase = await createClient();

  const trackType = formData.get("track_type") as EnrollmentTrackType;
  const status = formData.get("status") as EnrollmentStatus;

  const { error } = await supabase
    .from("enrollments")
    .update({
      track_type: trackType,
      status: status
    })
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
}

// Remove enrollment from course
export async function removeStudentFromCourse(enrollmentId: string) {
  await requirePermission("manage_students");
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
}
