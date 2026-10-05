"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { inviteStaff } from "@/lib/invite-actions";
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from "@/lib/permissions";

export function InviteStaffForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "instructor">("admin");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    manage_courses: true,
    manage_students: true,
    manage_capstones: true,
    manage_announcements: true,
  });

  const handleTogglePerm = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("role", role);
    PERMISSION_KEYS.forEach((key) => {
      if (permissions[key]) {
        formData.append(`perm_${key}`, "on");
      }
    });

    try {
      const res = await inviteStaff({ error: null, message: null }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || `Staff invitation sent to ${email}!`);
        setEmail("");
        router.refresh();
      }
    } catch (err: any) {
      toast.error("Failed to send staff invitation: " + err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
          <ShieldPlus className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Invite an Admin or Instructor
          </h2>
          <p className="text-xs text-muted-foreground">
            Invited staff will receive a set-password link with pre-assigned permissions.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Staff Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@techeve.org"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Staff Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:border-teal-500 outline-none"
          >
            <option value="admin">Admin (Operational & Academic Delegation)</option>
            <option value="instructor">Instructor (Batch Teacher & Mentor)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Initial Permissions Granted
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PERMISSION_KEYS.map((key) => {
            const isChecked = !!permissions[key];
            return (
              <label
                key={key}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition-all ${
                  isChecked
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTogglePerm(key)}
                  className="size-4 rounded border-input text-teal-600 focus:ring-teal-500"
                />
                {PERMISSION_LABELS[key]}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending || !email}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all"
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Sending Invite...
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              Send Staff Invitation
            </>
          )}
        </button>
      </div>
    </form>
  );
}
