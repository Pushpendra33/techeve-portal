import { getProfile } from "@/lib/queries";
import { redirect } from "next/navigation";
import { StudentProfileClient } from "@/components/dashboard/StudentProfileClient";

export const revalidate = 0; // Live settings profile load

export default async function StudentProfilePage() {
  const { profile } = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return <StudentProfileClient profile={profile} />;
}
