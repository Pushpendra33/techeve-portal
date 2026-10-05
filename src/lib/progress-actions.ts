"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/queries";

export async function toggleLessonComplete(lessonId: string, completed: boolean) {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase.from("lesson_progress").upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "student_id,lesson_id" },
  );

  revalidatePath("/dashboard/course");
  revalidatePath("/dashboard");
}
