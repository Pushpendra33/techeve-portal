import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getActiveEnrollment,
  getModulesWithLessons,
  getCompletedLessonIds,
} from "@/lib/queries";
import { StudentAttendanceClient } from "@/components/dashboard/StudentAttendanceClient";
import type { Database } from "@/lib/supabase/types";

export const revalidate = 0; // Live attendance updates

export default async function StudentAttendancePage() {
  const { user, profile } = await getProfile();
  const enrollment = await getActiveEnrollment(user.id);
  const supabase = await createClient();

  if (!enrollment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card border border-border rounded-2xl">
        <h2 className="text-xl font-bold">No Active Enrollment</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          You are not currently enrolled in any active course. Attendance tracking will appear here once an instructor assigns you to a batch.
        </p>
      </div>
    );
  }

  // 1. Fetch attendance records
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("*")
    .eq("enrollment_id", enrollment.id)
    .order("session_date", { ascending: false });

  const attendanceRecords = (attendanceData || []) as Database["public"]["Tables"]["attendance"]["Row"][];

  // 2. Fetch syllabus progress summary
  const modules = await getModulesWithLessons(enrollment.course_id);
  const completed = await getCompletedLessonIds(user.id);
  const totalLessons = modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
  const completedLessons = modules.reduce(
    (n, m) => n + (m.lessons?.filter((l) => completed.has(l.id)).length ?? 0),
    0
  );
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <StudentAttendanceClient
      profile={profile}
      enrollment={enrollment}
      records={attendanceRecords}
      courseTitle={enrollment.courses?.title || "TechEve Academy Course"}
      progressPercentage={progressPercentage}
      completedLessons={completedLessons}
      totalLessons={totalLessons}
    />
  );
}
