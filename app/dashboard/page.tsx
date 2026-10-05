import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getActiveEnrollment,
  getModulesWithLessons,
  getCompletedLessonIds,
  getUpcomingAnnouncements
} from "@/lib/queries";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";

export const revalidate = 0; // Ensure live dashboard metrics

export default async function DashboardHome() {
  const { user, profile } = await getProfile();
  const enrollment = await getActiveEnrollment(user.id);
  const announcements = await getUpcomingAnnouncements(4);
  const supabase = await createClient();

  let percentComplete = 0;
  let totalLessons = 0;
  let completedLessons = 0;
  let attendancePercentage = 100; // default to 100 if no sessions exist yet
  let capstones: any[] = [];
  let chartData: { name: string; completed: number }[] = [
    { name: "Week 1", completed: 0 },
    { name: "Week 2", completed: 0 },
    { name: "Week 3", completed: 0 },
    { name: "Week 4", completed: 0 }
  ];

  if (enrollment) {
    // 1. Fetch modules & lessons
    const modules = await getModulesWithLessons(enrollment.course_id);
    const completed = await getCompletedLessonIds(user.id);
    totalLessons = modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
    completedLessons = modules.reduce(
      (n, m) => n + (m.lessons?.filter((l) => completed.has(l.id)).length ?? 0),
      0
    );
    percentComplete = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // 2. Fetch attendance
    const { data: attData } = await supabase
      .from("attendance")
      .select("*")
      .eq("enrollment_id", enrollment.id);
    
    if (attData && attData.length > 0) {
      const present = attData.filter((a) => a.present).length;
      attendancePercentage = Math.round((present / attData.length) * 100);
    }

    // 3. Fetch student capstone projects
    const { data: capData } = await supabase
      .from("capstones")
      .select("*")
      .eq("student_id", user.id)
      .order("updated_at", { ascending: false });
    
    capstones = capData ?? [];

    // 4. Fetch learning activity over time (lesson completions)
    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select("completed_at")
      .eq("student_id", user.id)
      .eq("completed", true);

    if (progressData && progressData.length > 0) {
      // Group completions into 4 weekly buckets relative to current date
      const now = new Date();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      
      const counts = [0, 0, 0, 0]; // [W4, W3, W2, W1]
      progressData.forEach((p) => {
        if (!p.completed_at) return;
        const diffMs = now.getTime() - new Date(p.completed_at).getTime();
        const weekIndex = Math.floor(diffMs / oneWeekMs);
        if (weekIndex >= 0 && weekIndex < 4) {
          counts[3 - weekIndex]++; // increment from oldest to newest week
        }
      });

      chartData = [
        { name: "3 Wks Ago", completed: counts[0] },
        { name: "2 Wks Ago", completed: counts[1] },
        { name: "1 Wk Ago", completed: counts[2] },
        { name: "This Week", completed: counts[3] }
      ];
    }
  }

  return (
    <StudentDashboardClient
      profile={profile}
      enrollment={enrollment}
      percentComplete={percentComplete}
      completedLessons={completedLessons}
      totalLessons={totalLessons}
      attendancePercentage={attendancePercentage}
      capstones={capstones}
      announcements={announcements}
      chartData={chartData}
    />
  );
}
