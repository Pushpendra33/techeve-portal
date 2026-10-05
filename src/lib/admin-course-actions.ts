"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/queries";

export async function createCourse(formData: FormData) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const track = String(formData.get("track") ?? "mern");
  const description = String(formData.get("description") ?? "").trim();
  const cover_image_url = String(formData.get("cover_image_url") ?? "").trim() || null;
  const duration_weeks = formData.get("duration_weeks") ? Number(formData.get("duration_weeks")) : null;
  const level = String(formData.get("level") ?? "beginner").trim();
  const is_published = formData.get("is_published") === "true";

  await supabase.from("courses").insert({
    title,
    slug,
    track: track as "mern" | "data_science",
    description: description || null,
    cover_image_url,
    duration_weeks,
    level,
    is_published,
  });

  revalidatePath("/admin/courses");
}

export async function updateCourse(id: string, formData: FormData) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const track = String(formData.get("track") ?? "mern");
  const description = String(formData.get("description") ?? "").trim();
  const cover_image_url = String(formData.get("cover_image_url") ?? "").trim() || null;
  const duration_weeks = formData.get("duration_weeks") ? Number(formData.get("duration_weeks")) : null;
  const level = String(formData.get("level") ?? "beginner").trim();
  const is_published = formData.get("is_published") === "true";

  await supabase
    .from("courses")
    .update({
      title,
      slug,
      track: track as "mern" | "data_science",
      description: description || null,
      cover_image_url,
      duration_weeks,
      level,
      is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
}

export async function deleteCourse(id: string) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  await supabase.from("courses").delete().eq("id", id);

  revalidatePath("/admin/courses");
}

export async function createModule(formData: FormData) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const courseId = String(formData.get("courseId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const orderIndex = Number(formData.get("orderIndex") ?? 0);

  await supabase.from("modules").insert({
    course_id: courseId,
    title,
    description,
    order_index: orderIndex,
  });

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
}

export async function updateModule(id: string, courseId: string, formData: FormData) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const orderIndex = Number(formData.get("orderIndex") ?? 0);

  await supabase
    .from("modules")
    .update({
      title,
      description,
      order_index: orderIndex,
    })
    .eq("id", id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteModule(id: string, courseId: string) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  await supabase.from("modules").delete().eq("id", id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createLesson(formData: FormData) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const moduleId = String(formData.get("moduleId"));
  const courseId = String(formData.get("courseId"));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim() || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;
  const resourceUrl = String(formData.get("resourceUrl") ?? "").trim() || null;
  const orderIndex = Number(formData.get("orderIndex") ?? 0);
  const durationMinutes = formData.get("durationMinutes") ? Number(formData.get("durationMinutes")) : null;
  const lessonType = String(formData.get("lessonType") ?? "lesson").trim();
  
  // Parse reference links from JSON
  let referenceLinks = [];
  try {
    const rawLinks = String(formData.get("referenceLinks") ?? "[]");
    referenceLinks = JSON.parse(rawLinks);
  } catch (e) {
    referenceLinks = [];
  }

  await supabase.from("lessons").insert({
    module_id: moduleId,
    title,
    content,
    video_url: videoUrl,
    resource_url: resourceUrl,
    order_index: orderIndex,
    duration_minutes: durationMinutes,
    lesson_type: lessonType,
    reference_links: referenceLinks,
  });

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateLesson(id: string, courseId: string, formData: FormData) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim() || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;
  const resourceUrl = String(formData.get("resourceUrl") ?? "").trim() || null;
  const orderIndex = Number(formData.get("orderIndex") ?? 0);
  const durationMinutes = formData.get("durationMinutes") ? Number(formData.get("durationMinutes")) : null;
  const lessonType = String(formData.get("lessonType") ?? "lesson").trim();

  // Parse reference links from JSON
  let referenceLinks = [];
  try {
    const rawLinks = String(formData.get("referenceLinks") ?? "[]");
    referenceLinks = JSON.parse(rawLinks);
  } catch (e) {
    referenceLinks = [];
  }

  await supabase
    .from("lessons")
    .update({
      title,
      content,
      video_url: videoUrl,
      resource_url: resourceUrl,
      order_index: orderIndex,
      duration_minutes: durationMinutes,
      lesson_type: lessonType,
      reference_links: referenceLinks,
    })
    .eq("id", id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteLesson(id: string, courseId: string) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  await supabase.from("lessons").delete().eq("id", id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function toggleCoursePublish(id: string, currentStatus: boolean) {
  await requirePermission("manage_courses");
  const supabase = await createClient();

  await supabase
    .from("courses")
    .update({ is_published: !currentStatus })
    .eq("id", id);

  revalidatePath("/admin/courses");
}
