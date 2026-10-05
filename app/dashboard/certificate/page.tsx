import { Award, Download, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEnrollment } from "@/lib/queries";

export default async function CertificatePage() {
  const { user } = await getProfile();
  const enrollment = await getActiveEnrollment(user.id);

  if (!enrollment) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        You&apos;re not enrolled in an active course yet.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select("*")
    .eq("enrollment_id", enrollment.id)
    .maybeSingle();

  const issued = certificate?.issued ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Certificate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Requires 80% attendance, a passing quiz average, and a reviewed capstone.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-12 text-center">
        <span
          className={`grid size-16 place-items-center rounded-full ${
            issued ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {issued ? <Award className="size-7" /> : <Lock className="size-7" />}
        </span>
        <div>
          <p className="text-lg font-semibold">{issued ? "Certificate issued 🎉" : "Not issued yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {issued
              ? "Congratulations — you've met the criteria."
              : "Keep going with lessons, assignments and your capstone. This updates automatically once you qualify."}
          </p>
        </div>
        {issued && certificate?.credential_url ? (
          <a
            href={certificate.credential_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Download className="size-4" />
            Download certificate
          </a>
        ) : null}
      </div>
    </div>
  );
}
