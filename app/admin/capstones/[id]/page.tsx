import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, getProfile } from "@/lib/queries";
import { CapstoneDetailClient } from "@/components/admin/CapstoneDetailClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCapstoneDetailPage({ params }: PageProps) {
  await requirePermission("manage_capstones");
  const { id } = await params;
  
  const { profile: currentStaff } = await getProfile();
  if (!currentStaff) notFound();

  const supabase = await createClient();

  // Load the capstone project
  const { data: capstone, error: capError } = await supabase
    .from("capstones")
    .select("*")
    .eq("id", id)
    .single();

  if (capError || !capstone) {
    notFound();
  }

  // Load student profile
  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", capstone.student_id)
    .single();

  if (!student) {
    notFound();
  }

  // Load reviews thread joined with profiles
  const { data: rawReviews } = await supabase
    .from("capstone_reviews")
    .select("*, reviewer:profiles(*)")
    .eq("capstone_id", id)
    .order("created_at", { ascending: true });

  const reviews = (rawReviews as any[]) ?? [];

  return (
    <CapstoneDetailClient
      capstone={capstone}
      student={student}
      reviews={reviews}
      currentStaffId={currentStaff.id}
    />
  );
}
