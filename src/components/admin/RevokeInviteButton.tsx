"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revokeInviteById } from "@/lib/invite-actions";

export function RevokeInviteButton({ inviteId, email }: { inviteId: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to revoke the invite for ${email}?`)) {
      return;
    }

    setPending(true);
    try {
      await revokeInviteById(inviteId);
      toast.success(`Invite revoked for ${email}`);
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to revoke invite: " + err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleRevoke}
      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50 transition-colors"
    >
      {pending ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Revoking...
        </>
      ) : (
        <>
          <Trash2 className="size-3" />
          Revoke Invite
        </>
      )}
    </button>
  );
}
