import { createClient } from "@/lib/supabase/server";
import { requirePermission, getAllCourses, getProfile } from "@/lib/queries";
import { StudentListClient } from "@/components/admin/StudentListClient";

export const revalidate = 0; // Disable caching to fetch live registry status

export default async function AdminStudentsPage() {
  await requirePermission("manage_students");
  
  const { profile: currentStaff } = await getProfile();
  const courses = await getAllCourses();
  const supabase = await createClient();

  // Load all enrollments joined with profiles and courses.
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, profiles(*), courses(*)")
    .order("enrolled_at", { ascending: false });

  // Fetch attendance records
  const { data: allAttendance } = await supabase
    .from("attendance")
    .select("enrollment_id, present");

  const attendanceMap: Record<string, { total: number; present: number }> = {};
  (allAttendance || []).forEach((a) => {
    if (!attendanceMap[a.enrollment_id]) {
      attendanceMap[a.enrollment_id] = { total: 0, present: 0 };
    }
    attendanceMap[a.enrollment_id].total++;
    if (a.present) attendanceMap[a.enrollment_id].present++;
  });

  // Fetch lessons counts per course
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, module_id, modules(course_id)");

  const courseLessonCountMap: Record<string, number> = {};
  (allLessons || []).forEach((les: any) => {
    const courseId = les.modules?.course_id;
    if (courseId) {
      courseLessonCountMap[courseId] = (courseLessonCountMap[courseId] || 0) + 1;
    }
  });

  // Fetch progress counts
  const { data: allProgress } = await supabase
    .from("lesson_progress")
    .select("student_id, completed")
    .eq("completed", true);

  const studentProgressCountMap: Record<string, number> = {};
  (allProgress || []).forEach((p) => {
    studentProgressCountMap[p.student_id] = (studentProgressCountMap[p.student_id] || 0) + 1;
  });

  const mappedStudents = ((enrollments as any[]) ?? []).map((e) => {
    const p = e.profiles ?? {};
    const c = e.courses ?? {};
    const att = attendanceMap[e.id] || { total: 0, present: 0 };
    const attendancePercentage = att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;

    const totalLessons = courseLessonCountMap[e.course_id] || 0;
    const completedLessons = studentProgressCountMap[p.id] || 0;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: e.id,
      profileId: p.id || "",
      fullName: p.full_name || "(no name yet)",
      email: p.email || "",
      phone: p.phone || "",
      college: p.college || "",
      yearOfStudy: p.year_of_study || "",
      notes: p.notes || "",
      courseId: e.course_id || "",
      courseTitle: c.title || "Unknown Course",
      trackType: e.track_type,
      status: e.status,
      enrolledAt: e.enrolled_at,
      role: p.role || "student",
      profileStatus: p.status || "active",
      attendancePercentage,
      attendancePresent: att.present,
      attendanceTotal: att.total,
      progressPercentage,
      completedLessons,
      totalLessons,
    };
  });

  return (
    <StudentListClient
      students={mappedStudents}
      courses={courses}
      currentUserRole={currentStaff?.role || "admin"}
    />
  );
}
