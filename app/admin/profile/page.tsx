import { getProfile } from "@/lib/queries";
import { redirect } from "next/navigation";
import { AdminProfileClient } from "@/components/admin/AdminProfileClient";

export const revalidate = 0; // Live settings profile load

export default async function AdminProfilePage() {
  const { profile } = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return <AdminProfileClient profile={profile} />;
}
