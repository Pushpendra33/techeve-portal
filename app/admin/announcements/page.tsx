import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/queries";
import { AnnouncementListClient } from "@/components/admin/AnnouncementListClient";

export const revalidate = 0; // live event data loading

export default async function AdminAnnouncementsPage() {
  await requirePermission("manage_announcements");
  const supabase = await createClient();

  // Load announcements, joined with interests and profiles (so we know who RSVP'd)
  const { data } = await supabase
    .from("announcements")
    .select("*, announcement_interests(*, profiles(*))")
    .order("created_at", { ascending: false });

  const announcements = (data as any[]) ?? [];

  return <AnnouncementListClient announcements={announcements} />;
}
