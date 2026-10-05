import { createClient } from "@/lib/supabase/server";
import { requirePermission, getAllCourses, getProfile } from "@/lib/queries";
import { AdminAttendanceClient } from "@/components/admin/AdminAttendanceClient";

export const revalidate = 0; // Live attendance registry

export default async function AdminAttendancePage() {
  await requirePermission("manage_students");
  const { profile: currentStaff } = await getProfile();
  const courses = await getAllCourses();
  const supabase = await createClient();

  // 1. Fetch all enrollments joined with profiles and courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, profiles(*), courses(*)")
    .order("enrolled_at", { ascending: false });

  // 2. Fetch all attendance records
  const { data: allAttendance } = await supabase
    .from("attendance")
    .select("*")
    .order("session_date", { ascending: false });

  // 3. Fetch all modules & lessons to calculate course lesson counts
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, module_id, modules(course_id)");

  const courseLessonCountMap: Record<string, number> = {};
  (allLessons || []).forEach((les: any) => {
    const courseId = les.modules?.course_id;
    if (courseId) {
      courseLessonCountMap[courseId] =
        (courseLessonCountMap[courseId] || 0) + 1;
    }
  });

  // 4. Fetch all lesson progress
  const { data: allProgress } = await supabase
    .from("lesson_progress")
    .select("student_id, completed")
    .eq("completed", true);

  const studentProgressCountMap: Record<string, number> = {};
  (allProgress || []).forEach((p) => {
    studentProgressCountMap[p.student_id] =
      (studentProgressCountMap[p.student_id] || 0) + 1;
  });

  // 5. Fetch all capstones
  const { data: allCapstones } = await supabase
    .from("capstones")
    .select("id, enrollment_id, student_id, status, score");

  const capstoneMap: Record<string, any[]> = {};
  (allCapstones || []).forEach((c) => {
    if (c.enrollment_id) {
      if (!capstoneMap[c.enrollment_id]) capstoneMap[c.enrollment_id] = [];
      capstoneMap[c.enrollment_id].push(c);
    }
  });

  // Map students with comprehensive progress and attendance stats
  const mappedStudents = ((enrollments as any[]) ?? []).map((e) => {
    const p = e.profiles ?? {};
    const c = e.courses ?? {};
    const studentAttendance = (allAttendance || []).filter(
      (a) => a.enrollment_id === e.id,
    );

    const totalSessions = studentAttendance.length;
    const presentCount = studentAttendance.filter((a) => a.present).length;
    const absentCount = totalSessions - presentCount;
    const attendancePercentage =
      totalSessions > 0
        ? Math.round((presentCount / totalSessions) * 100)
        : 100;

    const totalLessons = courseLessonCountMap[e.course_id] || 0;
    const completedLessons = studentProgressCountMap[p.id] || 0;
    const syllabusPercentage =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    const studentCapstones = capstoneMap[e.id] || [];

    return {
      enrollmentId: e.id,
      profileId: p.id || "",
      fullName: p.full_name || "(no name yet)",
      email: p.email || "",
      phone: p.phone || "",
      college: p.college || "",
      yearOfStudy: p.year_of_study || "",
      courseId: e.course_id || "",
      courseTitle: c.title || "Unknown Course",
      trackType: e.track_type,
      status: e.status,
      enrolledAt: e.enrolled_at,
      attendance: {
        totalSessions,
        presentCount,
        absentCount,
        percentage: attendancePercentage,
        records: studentAttendance,
      },
      progress: {
        totalLessons,
        completedLessons,
        percentage: syllabusPercentage,
      },
      capstones: {
        total: studentCapstones.length,
        reviewed: studentCapstones.filter((cap) => cap.status === "reviewed")
          .length,
        submitted: studentCapstones.filter((cap) => cap.status === "submitted")
          .length,
      },
    };
  });

  return (
    <AdminAttendanceClient
      students={mappedStudents}
      courses={courses}
      allAttendanceRecords={allAttendance || []}
      currentUserRole={currentStaff?.role || "admin"}
    />
  );
}
