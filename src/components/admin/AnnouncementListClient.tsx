"use client";

import React, { useState } from "react";
import {
  Plus,
  Megaphone,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Globe,
  Lock,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { formatDateString } from "@/lib/date-utils";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementPublish
} from "@/lib/admin-announcement-actions";
import type { Database } from "@/lib/supabase/types";

type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type InterestWithProfile = {
  id: string;
  student_id: string;
  created_at: string;
  profiles: ProfileRow | null;
};

type AnnouncementWithInterests = AnnouncementRow & {
  announcement_interests: InterestWithProfile[];
};

export function AnnouncementListClient({
  announcements
}: {
  announcements: AnnouncementWithInterests[];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<AnnouncementRow | null>(null);
  const [viewingRegistrations, setViewingRegistrations] = useState<InterestWithProfile[] | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      const formData = new FormData();
      formData.append("id", id);
      try {
        await deleteAnnouncement(formData);
        toast.success("Announcement deleted successfully");
      } catch (err: any) {
        toast.error("Failed to delete announcement: " + err.message);
      }
    }
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    try {
      await toggleAnnouncementPublish(id, current);
      toast.success(current ? "Changed to Draft" : "Published successfully!");
    } catch (err: any) {
      toast.error("Failed to change publish status: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Announcements & Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish events, workshops, or career opportunities for your students or the public website.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
        >
          <Plus className="size-4" />
          Create Event
        </button>
      </div>

      {/* Grid */}
      {announcements.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <Megaphone className="mx-auto size-12 text-muted-foreground opacity-30" />
          <h3 className="mt-4 text-sm font-semibold">No announcements yet</h3>
          <p className="text-xs text-muted-foreground mt-1">Get started by creating your first announcement or event.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {(() => {
              const totalPages = Math.ceil(announcements.length / ITEMS_PER_PAGE);
              const paginated = announcements.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              );
              return paginated.map((ann) => {
                const interestCount = ann.announcement_interests?.length ?? 0;
                return (
                  <div
                    key={ann.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Event Cover Photo if available */}
                    {ann.cover_image_url && (
                      <div className="h-48 w-full bg-slate-100 overflow-hidden">
                        <img
                          src={ann.cover_image_url}
                          alt={ann.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                        />
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 bg-teal-50 border border-teal-100 rounded px-2 py-0.5">
                            {ann.type}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            {ann.is_public ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded" title="Visible on public website">
                                <Globe className="size-3" /> Public
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-muted-foreground bg-muted px-2 py-0.5 rounded" title="Visible inside academy portal only">
                                <Lock className="size-3" /> Portal Only
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-foreground line-clamp-1">{ann.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {ann.body || "No details provided."}
                        </p>
                      </div>

                      {/* Dates & Location */}
                      <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                        {ann.event_date && (
                          <p className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-teal-600" />
                            <span>
                              Starts: {formatDateString(ann.event_date, true)}
                            </span>
                          </p>
                        )}
                        {ann.location && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-teal-600" />
                            <span>{ann.location}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 cursor-pointer hover:underline text-teal-700 font-medium" onClick={() => setViewingRegistrations(ann.announcement_interests)}>
                          <Users className="size-3.5" />
                          <span>
                            Interest: {interestCount} RSVP'd {ann.capacity ? `/ ${ann.capacity} max` : ""}
                          </span>
                        </p>
                      </div>

                      {/* Footer buttons */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <button
                          onClick={() => handleTogglePublish(ann.id, ann.is_published)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-xs ${
                            ann.is_published
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                          }`}
                        >
                          {ann.is_published ? (
                            <>
                              <CheckCircle className="size-3.5" /> Published
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3.5" /> Draft
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          {ann.link && (
                            <a
                              href={ann.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-muted-foreground hover:text-teal-600 hover:bg-muted rounded-lg transition-colors"
                              title="Reference Link"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setEditingAnn(ann)}
                            className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-lg transition-colors"
                            title="Edit event"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ann.id)}
                            className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-muted rounded-lg transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {Math.ceil(announcements.length / ITEMS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between border border-border bg-card px-5 py-4 rounded-2xl shadow-2xs flex-wrap gap-4">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, announcements.length)}</span> to{" "}
                <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, announcements.length)}</span> of{" "}
                <span className="font-semibold">{announcements.length}</span> announcements
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(announcements.length / ITEMS_PER_PAGE) }).map((_, idx) => {
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
                  disabled={currentPage === Math.ceil(announcements.length / ITEMS_PER_PAGE)}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Create Announcement / Event</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await createAnnouncement(formData);
                  toast.success("Announcement created successfully!");
                  setShowAddModal(false);
                } catch (err: any) {
                  toast.error("Failed to create: " + err.message);
                }
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Title</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Workshop: Advanced TypeScript Patterns"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Type</label>
                  <select
                    name="type"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="general">General announcement</option>
                    <option value="workshop">Interactive Workshop</option>
                    <option value="opportunity">Career Opportunity</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Location</label>
                  <input
                    name="location"
                    placeholder="e.g. Zoom or TechEve Office"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Start Date & Time</label>
                  <input
                    name="eventDate"
                    type="datetime-local"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">End Date & Time</label>
                  <input
                    name="endDate"
                    type="datetime-local"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Details / Body</label>
                  <textarea
                    name="body"
                    rows={4}
                    placeholder="Provide full description, curriculum points, requirements..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Cover Image URL</label>
                  <input
                    name="coverImageUrl"
                    placeholder="https://images.unsplash.com/... or relative path"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">External Link URL (e.g. Register form)</label>
                  <input
                    name="link"
                    type="url"
                    placeholder="https://..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Seat Capacity (optional)</label>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                
                <div className="space-y-2 pt-2 flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPublished"
                      value="true"
                      defaultChecked
                      className="size-4 rounded text-teal-600 focus:ring-teal-500 border-input"
                    />
                    Publish & Notify immediately
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPublic"
                      value="true"
                      className="size-4 rounded text-teal-600 focus:ring-teal-500 border-input"
                    />
                    Show on marketing website (techeve.in)
                  </label>
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Announcement / Event</h2>
              <button onClick={() => setEditingAnn(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await updateAnnouncement(editingAnn.id, formData);
                  toast.success("Event updated successfully!");
                  setEditingAnn(null);
                } catch (err: any) {
                  toast.error("Failed to update: " + err.message);
                }
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Title</label>
                  <input
                    name="title"
                    required
                    defaultValue={editingAnn.title}
                    placeholder="e.g. Workshop: Advanced TypeScript Patterns"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Type</label>
                  <select
                    name="type"
                    defaultValue={editingAnn.type}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="general">General announcement</option>
                    <option value="workshop">Interactive Workshop</option>
                    <option value="opportunity">Career Opportunity</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Location</label>
                  <input
                    name="location"
                    defaultValue={editingAnn.location ?? ""}
                    placeholder="e.g. Zoom or TechEve Office"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Start Date & Time</label>
                  <input
                    name="eventDate"
                    type="datetime-local"
                    defaultValue={
                      editingAnn.event_date
                        ? new Date(editingAnn.event_date).toISOString().slice(0, 16)
                        : ""
                    }
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">End Date & Time</label>
                  <input
                    name="endDate"
                    type="datetime-local"
                    defaultValue={
                      editingAnn.end_date
                        ? new Date(editingAnn.end_date).toISOString().slice(0, 16)
                        : ""
                    }
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Details / Body</label>
                  <textarea
                    name="body"
                    rows={4}
                    defaultValue={editingAnn.body ?? ""}
                    placeholder="Provide full description..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Cover Image URL</label>
                  <input
                    name="coverImageUrl"
                    defaultValue={editingAnn.cover_image_url ?? ""}
                    placeholder="https://images.unsplash.com/... or relative path"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">External Link URL</label>
                  <input
                    name="link"
                    type="url"
                    defaultValue={editingAnn.link ?? ""}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Seat Capacity (optional)</label>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={editingAnn.capacity ?? ""}
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                
                <div className="space-y-2 pt-2 flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPublished"
                      value="true"
                      defaultChecked={editingAnn.is_published}
                      className="size-4 rounded text-teal-600 focus:ring-teal-500 border-input"
                    />
                    Event is Published
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPublic"
                      value="true"
                      defaultChecked={editingAnn.is_public}
                      className="size-4 rounded text-teal-600 focus:ring-teal-500 border-input"
                    />
                    Show on marketing website (techeve.in)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingAnn(null)}
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

      {/* Viewing registrations list modal */}
      {viewingRegistrations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Registered Students ({viewingRegistrations.length})</h2>
              <button onClick={() => setViewingRegistrations(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {viewingRegistrations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nobody has RSVP'd yet.</p>
              ) : (
                <div className="space-y-3">
                  {viewingRegistrations.map((interest) => (
                    <div key={interest.id} className="flex flex-col border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="font-semibold text-foreground">{interest.profiles?.full_name || "Anonymous student"}</span>
                      <span className="text-xs text-muted-foreground">{interest.profiles?.email || "No email info"}</span>
                      {interest.profiles?.phone && (
                        <span className="text-[11px] text-teal-600 mt-0.5">{interest.profiles.phone}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border bg-muted/10 text-right">
              <button
                onClick={() => setViewingRegistrations(null)}
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
