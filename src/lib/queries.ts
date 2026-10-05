import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ModuleWithLessons, Database } from "./supabase/types";
import type { PermissionKey } from "./permissions";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];
type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"] & { courses: Course | null };

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<{ user: Awaited<ReturnType<typeof requireUser>>; profile: Profile | null }> {
  const supabase = await createClient();
  const user = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { user, profile: profile as Profile | null };
}

// Any staff role (student is redirected away). Doesn't check individual
// permissions — use requirePermission() for that inside a specific page.
export async function requireStaff(): Promise<Profile> {
  const { profile } = await getProfile();
  if (!profile || profile.status === "disabled") redirect("/login");
  if (profile.role !== "admin" && profile.role !== "instructor" && profile.role !== "super_admin") {
    redirect("/dashboard");
  }
  return profile;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireStaff();
  if (profile.role !== "super_admin") redirect("/admin");
  return profile;
}

// super_admin passes every check; admin/instructor need the specific
// permission flag set true on their profile.
export function hasPermission(profile: Profile, key: PermissionKey): boolean {
  return profile.role === "super_admin" || profile.permissions?.[key] === true;
}

export async function requirePermission(key: PermissionKey): Promise<Profile> {
  const profile = await requireStaff();
  if (!hasPermission(profile, key)) redirect("/admin");
  return profile;
}

// A student's primary active enrollment, with the course it belongs to.
export async function getActiveEnrollment(studentId: string): Promise<Enrollment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Enrollment | null;
}

export async function getModulesWithLessons(courseId: string): Promise<ModuleWithLessons[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  return (data as ModuleWithLessons[] | null) ?? [];
}

export async function getCompletedLessonIds(studentId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("student_id", studentId)
    .eq("completed", true);
  return new Set(((data as { lesson_id: string }[] | null) ?? []).map((r) => r.lesson_id));
}

export async function getUpcomingAnnouncements(limit = 5): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Announcement[] | null) ?? [];
}

export async function getAllCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*").order("title");
  return (data as Course[] | null) ?? [];
}
