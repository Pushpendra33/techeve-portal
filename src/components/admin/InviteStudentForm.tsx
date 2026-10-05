"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { inviteStudent, type InviteState } from "@/lib/invite-actions";
import type { Database } from "@/lib/supabase/types";

type Course = Database["public"]["Tables"]["courses"]["Row"];

const initialState: InviteState = { error: null, message: null };

export function InviteStudentForm({ courses }: { courses: Course[] }) {
  const [state, formAction, pending] = useActionState(inviteStudent, initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <UserPlus className="size-4 text-primary" />
        Invite a student
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          name="email"
          type="email"
          required
          placeholder="student@email.com"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-1"
        />
        <select name="courseId" required className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select name="trackType" className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="short">Short Internship (45 days)</option>
          <option value="extended">Extended Internship (4 months)</option>
        </select>
      </div>

      {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
      {state.message ? <p className="mt-3 text-sm text-primary">{state.message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending invite…" : "Send invite"}
      </button>
    </form>
  );
}
