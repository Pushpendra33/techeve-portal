import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";
import { StudentAnnouncementsClient } from "@/components/dashboard/StudentAnnouncementsClient";

export const revalidate = 0; // Live event RSVPs

export default async function AnnouncementsPage() {
  const { user } = await getProfile();
  const supabase = await createClient();

  // Load only published events/announcements (whether public or portal-only)
  const { data } = await supabase
    .from("announcements")
    .select("*, announcement_interests(*)")
    .eq("is_published", true)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const announcements = (data as any[]) ?? [];

  return (
    <StudentAnnouncementsClient
      announcements={announcements}
      currentStudentId={user.id}
    />
  );
}
