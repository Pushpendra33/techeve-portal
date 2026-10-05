import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/queries";
import { CourseDetailClient } from "@/components/admin/CourseDetailClient";

export const revalidate = 0; // Disable server component caching to ensure accurate listing

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseDetailPage({ params }: PageProps) {
  await requirePermission("manage_courses");
  const { id } = await params;
  const supabase = await createClient();

  // Fetch course details
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // Fetch modules and lessons
  const { data: rawModules } = await supabase
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  const modules = (rawModules as any[]) ?? [];

  return <CourseDetailClient course={course} modules={modules} />;
}
