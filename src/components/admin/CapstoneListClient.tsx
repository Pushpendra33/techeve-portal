"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquare, Code, ClipboardList } from "lucide-react";
import { formatDateString } from "@/lib/date-utils";
import type { Database } from "@/lib/supabase/types";

type CapstoneRow = Database["public"]["Tables"]["capstones"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ReviewRow = Database["public"]["Tables"]["capstone_reviews"]["Row"];

type CapstoneWithRelations = CapstoneRow & {
  profiles: ProfileRow | null;
  capstone_reviews: ReviewRow[];
};

export function CapstoneListClient({ capstones }: { capstones: CapstoneWithRelations[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.ceil(capstones.length / ITEMS_PER_PAGE);
  const paginated = capstones.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Capstones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor student capstone project submissions, check tech stacks, and review feedback.
        </p>
      </div>

      {capstones.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <ClipboardList className="mx-auto size-12 text-muted-foreground opacity-30" />
          <h3 className="mt-4 text-sm font-semibold">No capstone projects yet</h3>
          <p className="text-xs text-muted-foreground mt-1">Students haven't submitted any projects yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground select-none">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Project Title</th>
                  <th className="px-5 py-4">Tech Stack</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Reviews</th>
                  <th className="px-5 py-4">Last Updated</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((c) => {
                  const studentName = c.profiles?.full_name || "Unknown Student";
                  const reviewCount = (c.capstone_reviews ?? []).length;
                  const scoreAvg = reviewCount > 0 
                    ? Math.round(c.capstone_reviews.reduce((acc: number, curr: any) => acc + (curr.score ?? 0), 0) / reviewCount) 
                    : null;

                  return (
                    <tr key={c.id} className="hover:bg-muted/10">
                      <td className="px-5 py-4">
                        <span className="font-semibold text-foreground">{studentName}</span>
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">
                        <Link href={`/admin/capstones/${c.id}`} className="hover:text-teal-600 transition-colors">
                          {c.title || "Untitled Project"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">
                        {c.tech_stack ? (
                          <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border">
                            <Code className="size-3 text-teal-600" /> {c.tech_stack}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            c.status === "reviewed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : c.status === "submitted"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : c.status === "in_progress"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MessageSquare className="size-3.5 text-muted-foreground" />
                          <span className="font-semibold">{reviewCount} reviews</span>
                          {scoreAvg !== null && (
                            <span className="text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                              Avg: {scoreAvg}/100
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {formatDateString(c.updated_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/capstones/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                          Review <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-4 flex-wrap gap-4">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, capstones.length)}</span> to{" "}
                <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, capstones.length)}</span> of{" "}
                <span className="font-semibold">{capstones.length}</span> capstones
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        currentPage === pageNum
                          ? "bg-teal-600 text-white font-bold"
                          : "border border-border bg-card hover:bg-muted"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
