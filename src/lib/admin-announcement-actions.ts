"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/queries";
import { sendAnnouncementNotifications } from "./notification-actions";

export async function createAnnouncement(formData: FormData) {
  await requirePermission("manage_announcements");
  const user = await requireUser();
  const supabase = await createClient();

  const type = String(formData.get("type") ?? "general");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const isPublished = formData.get("isPublished") === "true";
  const isPublic = formData.get("isPublic") === "true";

  const { data, error } = await supabase.from("announcements").insert({
    type: type as "workshop" | "opportunity" | "general",
    title,
    body: body || null,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location: location || null,
    cover_image_url: coverImageUrl || null,
    link: link || null,
    capacity,
    is_published: isPublished,
    is_public: isPublic,
    created_by: user.id,
  }).select().single();

  if (error) {
    throw new Error(error.message);
  }

  // Asynchronously trigger notifications if published immediately
  if (isPublished && data) {
    sendAnnouncementNotifications(data.id).catch((err) => {
      console.error("Failed to run sendAnnouncementNotifications in background: ", err);
    });
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard");
}

export async function updateAnnouncement(id: string, formData: FormData) {
  await requirePermission("manage_announcements");
  const supabase = await createClient();

  const type = String(formData.get("type") ?? "general");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const isPublished = formData.get("isPublished") === "true";
  const isPublic = formData.get("isPublic") === "true";

  const { error } = await supabase.from("announcements").update({
    type: type as "workshop" | "opportunity" | "general",
    title,
    body: body || null,
    event_date: eventDate ? new Date(eventDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location: location || null,
    cover_image_url: coverImageUrl || null,
    link: link || null,
    capacity,
    is_published: isPublished,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // Trigger notifications if published now (checks internally if already sent)
  if (isPublished) {
    sendAnnouncementNotifications(id).catch((err) => {
      console.error("Failed to run sendAnnouncementNotifications in background: ", err);
    });
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(formData: FormData) {
  await requirePermission("manage_announcements");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  
  await supabase.from("announcements").delete().eq("id", id);
  
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard");
}

export async function toggleAnnouncementPublish(id: string, currentStatus: boolean) {
  await requirePermission("manage_announcements");
  const supabase = await createClient();

  await supabase
    .from("announcements")
    .update({ is_published: !currentStatus })
    .eq("id", id);

  if (!currentStatus) {
    // If we are publishing it now, notify recipients
    sendAnnouncementNotifications(id).catch((err) => {
      console.error("Failed to run sendAnnouncementNotifications: ", err);
    });
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard/announcements");
}
