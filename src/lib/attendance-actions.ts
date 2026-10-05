"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, getProfile, requireUser } from "@/lib/queries";
import type { Database } from "./supabase/types";

type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];

// Mark or update attendance for a single student on a specific date
export async function markStudentAttendance(
  enrollmentId: string,
  sessionDate: string,
  present: boolean
) {
  await requirePermission("manage_students");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance")
    .upsert(
      {
        enrollment_id: enrollmentId,
        session_date: sessionDate,
        present,
      },
      { onConflict: "enrollment_id,session_date" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");

  return data as AttendanceRow;
}

// Batch save attendance records for a specific date or multiple students
export async function batchSaveAttendance(
  sessionDate: string,
  updates: { enrollmentId: string; present: boolean }[]
) {
  await requirePermission("manage_students");
  const supabase = await createClient();

  if (!updates || updates.length === 0) return { count: 0 };

  const records = updates.map((u) => ({
    enrollment_id: u.enrollmentId,
    session_date: sessionDate,
    present: u.present,
  }));

  const { data, error } = await supabase
    .from("attendance")
    .upsert(records, { onConflict: "enrollment_id,session_date" })
    .select();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");

  return { count: data?.length ?? 0 };
}

// Remove an attendance record for a student on a specific date
export async function deleteAttendanceRecord(
  enrollmentId: string,
  sessionDate: string
) {
  await requirePermission("manage_students");
  const supabase = await createClient();

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("enrollment_id", enrollmentId)
    .eq("session_date", sessionDate);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");

  return { success: true };
}

// Fetch a student's comprehensive progress and attendance dossier
export async function getStudentProgressDossier(
  studentId: string,
  enrollmentId: string
) {
  const { profile: callerProfile } = await getProfile();
  const isStaffMember =
    callerProfile?.role === "super_admin" ||
    callerProfile?.role === "admin" ||
    callerProfile?.role === "instructor";

  // If not staff, student can only view their own dossier
  if (!isStaffMember && callerProfile?.id !== studentId) {
    throw new Error("Unauthorized to access student dossier");
  }

  const supabase = await createClient();

  // 1. Fetch enrollment with course details & student profile
  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("*, profiles(*), courses(*)")
    .eq("id", enrollmentId)
    .single();

  if (enrollError || !enrollment) {
    throw new Error(enrollError?.message || "Enrollment not found");
  }

  const courseId = enrollment.course_id;

  // 2. Fetch all modules & lessons for the course
  const { data: modulesData } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  const modules = (modulesData || []).map((m: any) => ({
    ...m,
    lessons: (m.lessons || []).sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    ),
  }));

  // 3. Fetch completed lessons
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, completed_at")
    .eq("student_id", studentId)
    .eq("completed", true);

  const completedMap: Record<string, string | null> = {};
  (progressData || []).forEach((p: any) => {
    completedMap[p.lesson_id] = p.completed_at;
  });

  // Calculate syllabus stats
  let totalLessons = 0;
  let completedLessonsCount = 0;
  modules.forEach((mod: any) => {
    (mod.lessons || []).forEach((les: any) => {
      totalLessons++;
      if (completedMap[les.id]) {
        completedLessonsCount++;
      }
    });
  });

  const progressPercentage =
    totalLessons > 0
      ? Math.round((completedLessonsCount / totalLessons) * 100)
      : 0;

  // 4. Fetch attendance records
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("session_date", { ascending: true });

  const attendanceRecords = (attendanceData || []) as AttendanceRow[];
  const totalSessions = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((a) => a.present).length;
  const absentCount = totalSessions - presentCount;
  const attendancePercentage =
    totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

  // Compute streak
  let currentStreak = 0;
  for (let i = attendanceRecords.length - 1; i >= 0; i--) {
    if (attendanceRecords[i].present) {
      currentStreak++;
    } else {
      break;
    }
  }

  // 5. Fetch Capstone Projects
  const { data: capstones } = await supabase
    .from("capstones")
    .select("*, capstone_reviews(*)")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false });

  // 6. Fetch Quiz Attempts
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("*, quizzes(title, module_id)")
    .eq("student_id", studentId)
    .order("attempted_at", { ascending: false });

  return {
    student: enrollment.profiles,
    enrollment,
    course: enrollment.courses,
    progress: {
      totalLessons,
      completedLessonsCount,
      percentage: progressPercentage,
      modules,
      completedMap,
    },
    attendance: {
      records: attendanceRecords,
      totalSessions,
      presentCount,
      absentCount,
      percentage: attendancePercentage,
      streak: currentStreak,
      isWarning: attendancePercentage < 80,
    },
    capstones: capstones || [],
    quizAttempts: quizAttempts || [],
  };
}
