"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getActiveEnrollment } from "@/lib/queries";

export async function createCapstone(formData: FormData) {
  const user = await requireUser();
  const enrollment = await getActiveEnrollment(user.id);
  
  if (!enrollment) {
    throw new Error("You must be actively enrolled in a course to submit a capstone.");
  }

  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const techStack = String(formData.get("techStack") ?? "").trim() || null;
  const repoUrl = String(formData.get("repoUrl") ?? "").trim() || null;
  const deployUrl = String(formData.get("deployUrl") ?? "").trim() || null;
  const jiraUrl = String(formData.get("jiraUrl") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "in_progress") as "in_progress" | "submitted";

  if (!title) {
    throw new Error("Project title is required.");
  }

  const { error } = await supabase.from("capstones").insert({
    enrollment_id: enrollment.id,
    student_id: user.id,
    title,
    description: description || null,
    tech_stack: techStack,
    repo_url: repoUrl,
    deploy_url: deployUrl,
    jira_url: jiraUrl,
    status,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/capstone");
  revalidatePath("/dashboard");
}

export async function updateCapstone(id: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const techStack = String(formData.get("techStack") ?? "").trim() || null;
  const repoUrl = String(formData.get("repoUrl") ?? "").trim() || null;
  const deployUrl = String(formData.get("deployUrl") ?? "").trim() || null;
  const jiraUrl = String(formData.get("jiraUrl") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "in_progress") as "in_progress" | "submitted";

  if (!title) {
    throw new Error("Project title is required.");
  }

  const { error } = await supabase
    .from("capstones")
    .update({
      title,
      description: description || null,
      tech_stack: techStack,
      repo_url: repoUrl,
      deploy_url: deployUrl,
      jira_url: jiraUrl,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("student_id", user.id); // Security: ensure the student owns this capstone

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/capstone");
  revalidatePath("/dashboard");
}

export async function deleteCapstone(id: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("capstones")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id); // Security: ensure the student owns this capstone

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/capstone");
  revalidatePath("/dashboard");
}
