"use client";

import React, { useState, useTransition } from "react";
import {
  Megaphone,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  ExternalLink,
  Info,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { formatDateString } from "@/lib/date-utils";
import { toggleEventInterest } from "@/lib/student-announcement-actions";
import type { Database } from "@/lib/supabase/types";

type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];

type AnnouncementWithInterests = AnnouncementRow & {
  announcement_interests: { student_id: string }[];
};

export function StudentAnnouncementsClient({
  announcements,
  currentStudentId
}: {
  announcements: AnnouncementWithInterests[];
  currentStudentId: string;
}) {
  const [pending, startTransition] = useTransition();

  // Keep a local state of RSVPs for immediate UI update (optimistic state)
  const [localRSVPs, setLocalRSVPs] = useState<Record<string, { interested: boolean; count: number }>>(() => {
    const initial: Record<string, { interested: boolean; count: number }> = {};
    announcements.forEach((a) => {
      const interests = a.announcement_interests || [];
      initial[a.id] = {
        interested: interests.some((i) => i.student_id === currentStudentId),
        count: interests.length
      };
    });
    return initial;
  });

  const handleToggleInterest = (announcementId: string) => {
    const current = localRSVPs[announcementId];
    const nextInterested = !current.interested;
    const nextCount = nextInterested ? current.count + 1 : current.count - 1;

    // Optimistic Update
    setLocalRSVPs((prev) => ({
      ...prev,
      [announcementId]: { interested: nextInterested, count: nextCount }
    }));

    startTransition(async () => {
      try {
        await toggleEventInterest(announcementId);
        toast.success(nextInterested ? "RSVP saved! You'll be notified of event updates." : "RSVP removed.");
      } catch (err: any) {
        toast.error(err.message || "Failed to update RSVP");
        // Rollback
        setLocalRSVPs((prev) => ({
          ...prev,
          [announcementId]: current
        }));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Events & Opportunities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse upcoming academy workshops, career openings, and networking sessions.
        </p>
      </div>

      {/* Grid */}
      {announcements.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <Megaphone className="mx-auto size-12 text-muted-foreground opacity-30" />
          <h3 className="mt-4 text-sm font-semibold">No upcoming events</h3>
          <p className="text-xs text-muted-foreground mt-1">There are no announcements scheduled right now.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((ann) => {
            const { interested, count } = localRSVPs[ann.id] || { interested: false, count: 0 };
            const isFull = ann.capacity !== null && count >= ann.capacity;

            return (
              <div
                key={ann.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-2xs hover:shadow-xs transition-all duration-300"
              >
                {/* Event Cover Image */}
                <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                  {ann.cover_image_url ? (
                    <img
                      src={ann.cover_image_url}
                      alt={ann.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center text-teal-600">
                      <Megaphone className="size-12 opacity-30" />
                    </div>
                  )}

                  <span className="absolute left-3 top-3 inline-flex items-center rounded-lg bg-white/95 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-teal-800 shadow-sm border border-teal-100 uppercase tracking-widest">
                    {ann.type}
                  </span>
                </div>

                {/* Body details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-foreground line-clamp-1">{ann.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {ann.body || "No details description provided."}
                    </p>
                  </div>

                  {/* Date, Location, Capacity info */}
                  <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                    {ann.event_date && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-teal-600 shrink-0" />
                        <span>
                          {formatDateString(ann.event_date, true)}
                        </span>
                      </p>
                    )}
                    {ann.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{ann.location}</span>
                      </p>
                    )}
                    {ann.capacity !== null ? (
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-teal-600 shrink-0" />
                          <span>
                            {count} RSVP'd / {ann.capacity} seats max
                          </span>
                        </p>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? "bg-rose-500" : "bg-teal-600"
                            }`}
                            style={{ width: `${Math.min((count / ann.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-teal-600 shrink-0" />
                        <span>{count} Registered RSVP interests</span>
                      </p>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
                    {ann.link ? (
                      <a
                        href={ann.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        Info Link <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5">
                        <Info className="size-3" /> Portal Event
                      </span>
                    )}

                    <button
                      onClick={() => handleToggleInterest(ann.id)}
                      disabled={pending || (isFull && !interested)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                        interested
                          ? "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                          : isFull
                          ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                          : "bg-teal-600 text-white hover:bg-teal-700 active:scale-95"
                      }`}
                    >
                      {interested ? (
                        <>
                          <CheckCircle className="size-3.5" /> Registered
                        </>
                      ) : isFull ? (
                        "Fully Booked"
                      ) : (
                        "RSVP / I'm Interested"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
