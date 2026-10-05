import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/queries";
import { InviteStaffForm } from "@/components/admin/InviteStaffForm";
import { StaffPermissionsRow } from "@/components/admin/StaffPermissionsRow";
import { RevokeInviteButton } from "@/components/admin/RevokeInviteButton";
import { ShieldCheck, Mail, Users } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

export const revalidate = 0;

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function AdminStaffPage() {
  const me = await requireSuperAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["super_admin", "admin", "instructor"])
    .order("role");
  const staffList = (data as Profile[] | null) ?? [];

  const { data: pendingStaffInvites } = await supabase
    .from("invites")
    .select("*")
    .in("role", ["admin", "instructor", "super_admin"])
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Staff & Permissions</h1>
          <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-3 py-0.5 text-xs font-bold text-teal-600 uppercase tracking-wider">
            Super Admin Only
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite academy team members, delegate module permissions, promote/demote roles, and manage access.
        </p>
      </div>

      <InviteStaffForm />

      {pendingStaffInvites && pendingStaffInvites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Pending Staff Invitations ({pendingStaffInvites.length})
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pendingStaffInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4 text-xs shadow-2xs"
              >
                <div>
                  <p className="font-bold text-foreground">{inv.email}</p>
                  <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                    Invited Role: <strong>{inv.role}</strong>
                  </p>
                </div>
                <RevokeInviteButton inviteId={inv.id} email={inv.email} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Current Staff Roster ({staffList.length})
          </h2>
        </div>

        <div className="space-y-3">
          {staffList.map((s) =>
            s.role === "super_admin" ? (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {s.full_name || "(no name yet)"} {s.id === me.id ? "(You)" : ""}
                      </p>
                      <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-700 uppercase">
                        Super Admin
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.email || "Primary Super Admin"} • Unrestricted system access across all modules
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <StaffPermissionsRow key={s.id} staff={s} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
