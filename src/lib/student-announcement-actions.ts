"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/queries";

export async function toggleEventInterest(announcementId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  // Check if student already registered interest
  const { data: existing } = await supabase
    .from("announcement_interests")
    .select("id")
    .eq("announcement_id", announcementId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already interested -> remove RSVP
    await supabase
      .from("announcement_interests")
      .delete()
      .eq("id", existing.id);
  } else {
    // Check capacity before allowing RSVP
    const { data: announcement } = await supabase
      .from("announcements")
      .select("capacity")
      .eq("id", announcementId)
      .single();

    if (announcement && announcement.capacity !== null) {
      const { count } = await supabase
        .from("announcement_interests")
        .select("*", { count: "exact", head: true })
        .eq("announcement_id", announcementId);

      if (count !== null && count >= announcement.capacity) {
        throw new Error("This event has reached its maximum seat capacity.");
      }
    }

    // Add RSVP interest
    await supabase
      .from("announcement_interests")
      .insert({
        announcement_id: announcementId,
        student_id: user.id
      });
  }

  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard");
}
