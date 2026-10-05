import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/queries";
import { CourseListClient } from "@/components/admin/CourseListClient";

export const revalidate = 0; // Disable server component caching to ensure accurate listing

export default async function AdminCoursesPage() {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const { data } = await supabase
    .from("courses")
    .select("*, modules(*, lessons(*))")
    .order("title");

  const rawCourses = data ?? [];
  const coursesWithCounts = rawCourses.map((c: any) => {
    let lessonCount = 0;
    (c.modules ?? []).forEach((m: any) => {
      lessonCount += (m.lessons ?? []).length;
    });

    return {
      ...c,
      moduleCount: (c.modules ?? []).length,
      lessonCount: lessonCount,
    };
  });

  return <CourseListClient courses={coursesWithCounts} />;
}
