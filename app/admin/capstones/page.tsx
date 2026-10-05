import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/queries";
import { CapstoneListClient } from "@/components/admin/CapstoneListClient";

export const revalidate = 0; // Live capstones listing

export default async function AdminCapstonesPage() {
  await requirePermission("manage_capstones");
  const supabase = await createClient();

  // Load all capstones, their profiles, and their reviews
  const { data } = await supabase
    .from("capstones")
    .select("*, profiles(*), capstone_reviews(*)")
    .order("updated_at", { ascending: false });

  const capstones = (data as any[]) ?? [];

  return <CapstoneListClient capstones={capstones} />;
}
