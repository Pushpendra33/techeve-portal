import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEnrollment } from "@/lib/queries";
import { StudentCapstoneClient } from "@/components/dashboard/StudentCapstoneClient";

export const revalidate = 0; // live capstones listing

export default async function CapstonePage() {
  const { user } = await getProfile();
  const enrollment = await getActiveEnrollment(user.id);

  if (!enrollment) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-card">
        You are not enrolled in an active course yet.
      </div>
    );
  }

  const supabase = await createClient();

  // Load student capstones, joined with reviews and reviewer profiles
  const { data: capstones } = await supabase
    .from("capstones")
    .select("*, capstone_reviews(*, reviewer:profiles(*))")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const mappedCapstones = (capstones as any[]) ?? [];

  return (
    <StudentCapstoneClient
      capstones={mappedCapstones}
      enrollmentId={enrollment.id}
    />
  );
}
