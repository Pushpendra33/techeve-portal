import { notFound } from "next/navigation";
import {
  getProfile,
  getActiveEnrollment,
  getModulesWithLessons,
  getCompletedLessonIds
} from "@/lib/queries";
import { StudentCourseClient } from "@/components/dashboard/StudentCourseClient";

export const revalidate = 0; // live syllabus status loading

export default async function CoursePage() {
  const { user } = await getProfile();
  const enrollment = await getActiveEnrollment(user.id);

  if (!enrollment) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-card">
        You are not enrolled in an active course yet. Once your enrollment is confirmed by an admin, your course syllabus will appear here.
      </div>
    );
  }

  // Load modules and lessons for course
  const modules = await getModulesWithLessons(enrollment.course_id);
  
  // Load student completed lesson IDs
  const completedSet = await getCompletedLessonIds(user.id);
  const completedLessonIds = Array.from(completedSet);

  return (
    <StudentCourseClient
      course={enrollment.courses as any}
      modules={modules as any}
      completedLessonIds={completedLessonIds}
    />
  );
}
