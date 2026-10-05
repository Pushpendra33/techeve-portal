"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Plus,
  Github,
  Link2,
  AlertCircle,
  Edit2,
  Trash2,
  Award,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Code
} from "lucide-react";
import { toast } from "sonner";
import { createCapstone, updateCapstone, deleteCapstone } from "@/lib/capstone-actions";
import { formatDateString } from "@/lib/date-utils";
import type { Database, CapstoneStatus } from "@/lib/supabase/types";

type CapstoneRow = Database["public"]["Tables"]["capstones"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ReviewWithReviewer = Database["public"]["Tables"]["capstone_reviews"]["Row"] & {
  reviewer: ProfileRow | null;
};

type CapstoneWithReviews = CapstoneRow & {
  capstone_reviews: ReviewWithReviewer[];
};

export function StudentCapstoneClient({
  capstones,
  enrollmentId
}: {
  capstones: CapstoneWithReviews[];
  enrollmentId: string;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProj, setEditingProj] = useState<CapstoneRow | null>(null);
  const [activeProjectReviews, setActiveProjectReviews] = useState<ReviewWithReviewer[] | null>(null);
  const [activeProjectTitle, setActiveProjectTitle] = useState("");

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete the project "${title}"? This cannot be undone.`)) {
      try {
        await deleteCapstone(id);
        toast.success("Project deleted successfully");
      } catch (err: any) {
        toast.error("Failed to delete project: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-teal-100/70 text-teal-800">
            <FlaskConical className="size-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Capstones</h1>
            <p className="text-sm text-muted-foreground">Manage and submit your development projects for review.</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
        >
          <Plus className="size-4" />
          Add Project
        </button>
      </div>

      {/* Projects Grid */}
      {capstones.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <FlaskConical className="mx-auto size-12 text-muted-foreground opacity-30" />
          <h3 className="mt-4 text-sm font-semibold">No capstone projects started</h3>
          <p className="text-xs text-muted-foreground mt-1">Get started by creating your first capstone project submission.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {capstones.map((c) => {
            const reviewCount = c.capstone_reviews?.length ?? 0;
            const scoreAvg = reviewCount > 0 
              ? Math.round(c.capstone_reviews.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / reviewCount) 
              : null;

            return (
              <div
                key={c.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-xs transition-all duration-300"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-foreground line-clamp-1">{c.title || "Untitled Project"}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border ${
                        c.status === "reviewed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : c.status === "submitted"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : c.status === "in_progress"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </div>

                  {c.tech_stack && (
                    <div className="flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded w-fit border border-teal-100/60 font-semibold">
                      <Code className="size-3" /> {c.tech_stack}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {c.description || "No description provided."}
                  </p>

                  {/* Links */}
                  <div className="flex flex-wrap gap-3.5 text-xs font-semibold pt-1">
                    {c.repo_url && (
                      <a
                        href={c.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700"
                      >
                        <Github className="size-3.5" /> Code Repo
                      </a>
                    )}
                    {c.deploy_url && (
                      <a
                        href={c.deploy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700"
                      >
                        <Link2 className="size-3.5" /> Live Link
                      </a>
                    )}
                    {c.jira_url && (
                      <a
                        href={c.jira_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700"
                      >
                        <AlertCircle className="size-3.5" /> Jira Link
                      </a>
                    )}
                  </div>
                </div>

                {/* Review summary info */}
                <div className="border-t border-border pt-3 mt-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setActiveProjectTitle(c.title || "Project Review");
                      setActiveProjectReviews(c.capstone_reviews);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-colors"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>{reviewCount} Feedbacks</span>
                    {scoreAvg !== null && (
                      <span className="font-extrabold ml-1 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                        Avg: {scoreAvg}/100
                      </span>
                    )}
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditingProj(c)}
                      className="p-1.5 text-muted-foreground hover:text-teal-600 hover:bg-muted rounded-lg transition-all"
                      title="Edit project details"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.title || "")}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-muted rounded-lg transition-all"
                      title="Delete project"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Add Capstone Project</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await createCapstone(formData);
                  toast.success("Project submitted successfully!");
                  setShowAddModal(false);
                } catch (err: any) {
                  toast.error("Failed to submit: " + err.message);
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Project Title</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Chat App using WebSockets"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Tech Stack</label>
                  <input
                    name="techStack"
                    placeholder="e.g. React, Node.js, Express, Socket.io"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Detail the problem solved, implementation architecture, features..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">GitHub Code Repo URL</label>
                  <input
                    name="repoUrl"
                    type="url"
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Live Deployed URL (optional)</label>
                  <input
                    name="deployUrl"
                    type="url"
                    placeholder="https://..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Jira Issue Link (optional)</label>
                  <input
                    name="jiraUrl"
                    type="url"
                    placeholder="https://techeve.atlassian.net/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Submission Status</label>
                  <select
                    name="status"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none font-semibold"
                  >
                    <option value="in_progress">In Progress (Draft)</option>
                    <option value="submitted">Submit for Review</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Project Settings</h2>
              <button onClick={() => setEditingProj(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await updateCapstone(editingProj.id, formData);
                  toast.success("Project updated successfully!");
                  setEditingProj(null);
                } catch (err: any) {
                  toast.error("Failed to update: " + err.message);
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Project Title</label>
                  <input
                    name="title"
                    required
                    defaultValue={editingProj.title ?? ""}
                    placeholder="e.g. Chat App using WebSockets"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Tech Stack</label>
                  <input
                    name="techStack"
                    defaultValue={editingProj.tech_stack ?? ""}
                    placeholder="e.g. React, Node.js, Express, Socket.io"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={editingProj.description ?? ""}
                    placeholder="Detail the problem solved, implementation details..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">GitHub Code Repo URL</label>
                  <input
                    name="repoUrl"
                    type="url"
                    defaultValue={editingProj.repo_url ?? ""}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Live Deployed URL</label>
                  <input
                    name="deployUrl"
                    type="url"
                    defaultValue={editingProj.deploy_url ?? ""}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Jira Issue Link</label>
                  <input
                    name="jiraUrl"
                    type="url"
                    defaultValue={editingProj.jira_url ?? ""}
                    placeholder="https://techeve.atlassian.net/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Submission Status</label>
                  <select
                    name="status"
                    defaultValue={editingProj.status}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none font-semibold"
                  >
                    <option value="in_progress">In Progress (Draft)</option>
                    <option value="submitted">Submit for Review</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingProj(null)}
                  className="rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews list modal */}
      {activeProjectReviews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold truncate pr-6">{activeProjectTitle} Feedbacks</h2>
              <button onClick={() => setActiveProjectReviews(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {activeProjectReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No reviews submitted yet by instructors.</p>
              ) : (
                <div className="space-y-4">
                  {activeProjectReviews.map((rev) => (
                    <div key={rev.id} className="border-b border-border pb-3 last:border-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{rev.reviewer?.full_name || "Instructor Reviewer"}</span>
                        {rev.score !== null && (
                          <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded px-2 py-0.5 inline-flex items-center gap-0.5">
                            <Award className="size-3.5" /> Score: {rev.score}/100
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {rev.feedback || "No comment."}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Reviewed: {formatDateString(rev.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border bg-muted/10 text-right">
              <button
                onClick={() => setActiveProjectReviews(null)}
                className="rounded-xl border border-input px-4 py-1.5 text-xs font-semibold bg-card"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
