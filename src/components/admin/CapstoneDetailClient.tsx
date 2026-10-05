"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Github, Link2, MessageSquare, Award, AlertCircle, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { submitCapstoneReview, updateCapstoneStatus, deleteCapstoneReview } from "@/lib/admin-capstone-actions";
import type { Database, CapstoneStatus } from "@/lib/supabase/types";

type CapstoneRow = Database["public"]["Tables"]["capstones"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ReviewRow = Database["public"]["Tables"]["capstone_reviews"]["Row"] & {
  reviewer: ProfileRow | null;
};

export function CapstoneDetailClient({
  capstone,
  student,
  reviews,
  currentStaffId
}: {
  capstone: CapstoneRow;
  student: ProfileRow;
  reviews: ReviewRow[];
  currentStaffId: string;
}) {
  const [status, setStatus] = useState<CapstoneStatus>(capstone.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Find if current staff member already left a review
  const myReview = reviews.find((r) => r.reviewer_id === currentStaffId);

  const [score, setScore] = useState<string>(myReview?.score?.toString() ?? "");
  const [feedback, setFeedback] = useState<string>(myReview?.feedback ?? "");
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleStatusChange = async (newStatus: CapstoneStatus) => {
    setUpdatingStatus(true);
    try {
      await updateCapstoneStatus(capstone.id, newStatus);
      setStatus(newStatus);
      toast.success(`Capstone status changed to ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    const parsedScore = score !== "" ? Number(score) : null;
    const parsedFeedback = feedback.trim() || null;

    try {
      await submitCapstoneReview(capstone.id, currentStaffId, parsedScore, parsedFeedback);
      toast.success(myReview ? "Review updated successfully!" : "Review submitted successfully!");
    } catch (err: any) {
      toast.error("Failed to submit review: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm("Are you sure you want to delete your review?")) {
      try {
        await deleteCapstoneReview(reviewId, capstone.id);
        setScore("");
        setFeedback("");
        toast.success("Review deleted successfully!");
      } catch (err: any) {
        toast.error("Failed to delete review: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Back breadcrumb */}
      <div>
        <Link
          href="/admin/capstones"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Capstones
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Project Info Block */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-md">
                  Capstone Project
                </span>
                <h1 className="text-2xl font-bold text-foreground mt-2">{capstone.title || "Untitled Project"}</h1>
                <p className="text-sm text-muted-foreground mt-1">Submitted by: <span className="font-semibold text-foreground">{student.full_name}</span></p>
              </div>

              {/* Status Manager */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                <select
                  value={status}
                  disabled={updatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as CapstoneStatus)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none disabled:opacity-60"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
            </div>

            {capstone.tech_stack && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-teal-700 bg-teal-50/50 border border-teal-100/60 rounded-xl px-3 py-1.5 w-fit">
                <span className="font-bold text-xs uppercase text-teal-600">Tech Stack:</span>
                <span>{capstone.tech_stack}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Project Details</h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-xl border border-border/60">
                {capstone.description || "No project description provided."}
              </p>
            </div>

            {/* Links Block */}
            <div className="pt-2 border-t border-border flex flex-wrap gap-4 text-sm font-semibold">
              {capstone.repo_url && (
                <a
                  href={capstone.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 hover:underline"
                >
                  <Github className="size-4" /> Github Repository <ExternalLink className="size-3" />
                </a>
              )}
              {capstone.deploy_url && (
                <a
                  href={capstone.deploy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 hover:underline"
                >
                  <Link2 className="size-4" /> Live Deployment <ExternalLink className="size-3" />
                </a>
              )}
              {capstone.jira_url && (
                <a
                  href={capstone.jira_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 hover:underline"
                >
                  <AlertCircle className="size-4" /> Jira Issue Link <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>

          {/* Reviews Thread Display */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-lg font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <MessageSquare className="size-5 text-teal-600" />
              Reviewer Feedbacks Thread
            </h2>

            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No reviews yet. Be the first to leave a feedback!
              </p>
            ) : (
              <div className="space-y-6 divide-y divide-border">
                {reviews.map((r, idx) => (
                  <div key={r.id} className={`pt-4 first:pt-0 space-y-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-9 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                          {r.reviewer?.full_name?.substring(0, 2) || "AD"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {r.reviewer?.full_name || "Academy Staff"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Display Score */}
                      {r.score !== null && (
                        <div className="flex items-center gap-1 bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs">
                          <Award className="size-3.5" /> Score: {r.score}/100
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed pl-12">
                      {r.feedback || "No comment provided."}
                    </p>

                    {/* Delete my own review */}
                    {r.reviewer_id === currentStaffId && (
                      <div className="pl-12 flex justify-start">
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(r.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="size-3" /> Remove my review
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Review Panel (Current User) */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4 sticky top-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {myReview ? "Edit Your Review" : "Add Your Review"}
            </h3>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Score (/100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="e.g. 85"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Review Feedback</label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write clear, constructive feedback for the student..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-700 disabled:opacity-60 active:scale-95 shadow-sm"
              >
                {submittingReview ? "Saving..." : myReview ? "Update Review" : "Save Review"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
