"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
  Users,
  FlaskConical,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { updateStaffMember } from "@/lib/invite-actions";
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from "@/lib/permissions";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const PERMISSION_ICONS: Record<PermissionKey, any> = {
  manage_courses: BookOpen,
  manage_students: Users,
  manage_capstones: FlaskConical,
  manage_announcements: Megaphone,
};

export function StaffPermissionsRow({ staff }: { staff: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Local form state
  const [role, setRole] = useState<string>(staff.role);
  const [status, setStatus] = useState<string>(staff.status);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach((key) => {
      initial[key] = staff.permissions?.[key] === true;
    });
    return initial;
  });

  const handleTogglePerm = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.append("id", staff.id);
    formData.append("role", role);
    formData.append("status", status);

    PERMISSION_KEYS.forEach((key) => {
      if (permissions[key]) {
        formData.append(`perm_${key}`, "on");
      }
    });

    try {
      const res = await updateStaffMember(formData);
      toast.success(
        res?.message || `Permissions updated for ${staff.full_name || staff.email || "staff member"}!`
      );
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to update staff member: " + err.message);
    } finally {
      setIsPending(false);
    }
  };

  const activePermCount = PERMISSION_KEYS.filter((k) => staff.permissions?.[k] === true).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-all">
      {/* Row Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex size-10 items-center justify-center rounded-xl border ${
              staff.status === "disabled"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                : staff.role === "admin"
                ? "bg-teal-500/10 border-teal-500/20 text-teal-600"
                : "bg-blue-500/10 border-blue-500/20 text-blue-600"
            }`}
          >
            {staff.status === "disabled" ? (
              <ShieldAlert className="size-5" />
            ) : staff.role === "admin" ? (
              <ShieldCheck className="size-5" />
            ) : (
              <Shield className="size-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">
                {staff.full_name || "(no name yet)"}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  staff.role === "admin"
                    ? "bg-teal-500/10 text-teal-700 border border-teal-500/20"
                    : "bg-blue-500/10 text-blue-700 border border-blue-500/20"
                }`}
              >
                {staff.role}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  staff.status === "active"
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                }`}
              >
                {staff.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {staff.email || "No email"} • {activePermCount} of {PERMISSION_KEYS.length} permissions active
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          {open ? (
            <>
              <span>Close</span>
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              <span>Edit Permissions</span>
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Permissions Drawer */}
      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 border-t border-border bg-muted/20 p-5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Role & Status Pickers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Staff Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-teal-500 outline-none"
              >
                <option value="admin">Admin (Full or granular delegation)</option>
                <option value="instructor">Instructor (Batch lectures & student reviews)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-teal-500 outline-none"
              >
                <option value="active">Active (Permitted to log in)</option>
                <option value="disabled">Disabled (Revoke portal access)</option>
              </select>
            </div>
          </div>

          {/* Granular Permission Toggles */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Granular Module Permissions
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PERMISSION_KEYS.map((key) => {
                const Icon = PERMISSION_ICONS[key];
                const isChecked = !!permissions[key];

                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                      isChecked
                        ? "bg-teal-500/10 border-teal-500/40 shadow-xs"
                        : "bg-background border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePerm(key)}
                      className="mt-0.5 size-4 rounded border-input text-teal-600 focus:ring-teal-500"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`size-3.5 ${isChecked ? "text-teal-600" : "text-muted-foreground"}`} />
                        <span className="text-xs font-bold text-foreground">
                          {PERMISSION_LABELS[key]}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {key === "manage_courses" && "Create/edit courses, modules, lessons, and video content."}
                        {key === "manage_students" && "Invite students, edit student profiles, and log daily batch attendance."}
                        {key === "manage_capstones" && "Review project code submissions, evaluate scores, and leave feedback."}
                        {key === "manage_announcements" && "Post workshop alerts, internships, and calendar announcements."}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Save Permissions
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
