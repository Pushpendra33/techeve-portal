"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/queries";
import type { CapstoneStatus } from "./supabase/types";

export async function submitCapstoneReview(
  capstoneId: string,
  reviewerId: string,
  score: number | null,
  feedback: string | null
) {
  await requirePermission("manage_capstones");
  const supabase = await createClient();

  // Upsert the review in capstone_reviews. reviewer_id + capstone_id has unique constraint.
  const { error: reviewError } = await supabase
    .from("capstone_reviews")
    .upsert(
      {
        capstone_id: capstoneId,
        reviewer_id: reviewerId,
        score,
        feedback,
        updated_at: new Date().toISOString()
      },
      { onConflict: "capstone_id,reviewer_id" }
    );

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  // Optional: automatically update capstone status to 'reviewed'
  await supabase
    .from("capstones")
    .update({
      status: "reviewed",
      updated_at: new Date().toISOString()
    })
    .eq("id", capstoneId);

  revalidatePath("/admin/capstones");
  revalidatePath(`/admin/capstones/${capstoneId}`);
  revalidatePath(`/dashboard/capstone`);
}

export async function updateCapstoneStatus(
  capstoneId: string,
  status: CapstoneStatus
) {
  await requirePermission("manage_capstones");
  const supabase = await createClient();

  const { error } = await supabase
    .from("capstones")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", capstoneId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/capstones");
  revalidatePath(`/admin/capstones/${capstoneId}`);
  revalidatePath(`/dashboard/capstone`);
}

export async function deleteCapstoneReview(reviewId: string, capstoneId: string) {
  await requirePermission("manage_capstones");
  const supabase = await createClient();

  const { error } = await supabase
    .from("capstone_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/capstones");
  revalidatePath(`/admin/capstones/${capstoneId}`);
  revalidatePath(`/dashboard/capstone`);
}
