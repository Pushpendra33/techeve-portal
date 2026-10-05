"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Layers, CheckCircle2, XCircle, Search, Edit3, Trash2, Globe, Clock, Award } from "lucide-react";
import { toast } from "sonner";
import { toggleCoursePublish, deleteCourse, createCourse, updateCourse } from "@/lib/admin-course-actions";
import type { Database } from "@/lib/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseWithCounts = CourseRow & {
  moduleCount: number;
  lessonCount: number;
};

export function CourseListClient({ courses }: { courses: CourseWithCounts[] }) {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const [prevSearch, setPrevSearch] = useState("");
  if (search !== prevSearch) {
    setPrevSearch(search);
    setCurrentPage(1);
  }

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    c.track.toLowerCase().includes(search.toLowerCase())
  );

  async function handleTogglePublish(id: string, current: boolean) {
    try {
      await toggleCoursePublish(id, current);
      toast.success(current ? "Course changed to Draft" : "Course Published successfully");
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (confirm(`Are you sure you want to delete "${title}"? This will delete all its modules and lessons.`)) {
      try {
        await deleteCourse(id);
        toast.success("Course deleted successfully");
      } catch (e: any) {
        toast.error("Failed to delete course: " + e.message);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage courses, modules, and lessons for your students.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
        >
          <Plus className="size-4" />
          Create Course
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <BookOpen className="mx-auto size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No courses found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try refining your search or add a new course.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
              const paginated = filtered.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              );
              return paginated.map((course) => (
                <div
                  key={course.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Cover Image */}
                  <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-600">
                        <BookOpen className="size-12 opacity-40" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center rounded-lg bg-white/95 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-teal-800 shadow-sm border border-teal-100 uppercase tracking-wider">
                      {course.track === "mern" ? "MERN Stack" : "Data Science"}
                    </span>
                  </div>

                  {/* Course Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className="text-lg font-bold text-foreground hover:text-teal-600 transition-colors line-clamp-1"
                        >
                          {course.title}
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-2.5 border-t border-border/60 pt-3.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Layers className="size-4 text-teal-600" />
                        <span>
                          {course.moduleCount} Modules / {course.lessonCount} Lessons
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5 text-teal-600" /> {course.duration_weeks || 12} Weeks
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <Award className="size-3.5 text-teal-600" /> {course.level || "intermediate"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-3">
                      <button
                        onClick={() => handleTogglePublish(course.id, course.is_published)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-xs ${
                          course.is_published
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        {course.is_published ? (
                          <>
                            <CheckCircle2 className="size-3.5" /> Published
                          </>
                        ) : (
                          <>
                            <XCircle className="size-3.5" /> Draft
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingCourse(course)}
                          className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-lg transition-colors"
                          title="Edit course settings"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(course.id, course.title)}
                          className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-muted rounded-lg transition-colors"
                          title="Delete course"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          {Math.ceil(filtered.length / ITEMS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between border border-border bg-card px-5 py-4 rounded-2xl shadow-2xs flex-wrap gap-4">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}</span> to{" "}
                <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
                <span className="font-semibold">{filtered.length}</span> courses
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(filtered.length / ITEMS_PER_PAGE) }).map((_, idx) => {
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
                  disabled={currentPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)}
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

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Create New Course</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await createCourse(formData);
                  toast.success("Course created successfully!");
                  setShowAddModal(false);
                } catch (err: any) {
                  toast.error("Failed to create course: " + err.message);
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Course Title</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Full Stack Web Development with MERN"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Slug URL</label>
                  <input
                    name="slug"
                    required
                    placeholder="e.g. mern-full-stack"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Track</label>
                  <select
                    name="track"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="mern">MERN Full Stack</option>
                    <option value="data_science">Data Science with AI</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Provide a detailed summary of the course topics and outcomes..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Cover Image URL</label>
                  <input
                    name="cover_image_url"
                    placeholder="https://images.unsplash.com/... or relative path"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Duration (weeks)</label>
                  <input
                    name="duration_weeks"
                    type="number"
                    min={1}
                    placeholder="e.g. 12"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Level</label>
                  <select
                    name="level"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1 flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_published_new"
                    name="is_published"
                    value="true"
                    defaultChecked
                    className="size-4 rounded text-teal-600 focus:ring-teal-500 border-input"
                  />
                  <label htmlFor="is_published_new" className="text-sm font-semibold cursor-pointer">
                    Publish immediately
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
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Course Settings</h2>
              <button onClick={() => setEditingCourse(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await updateCourse(editingCourse.id, formData);
                  toast.success("Course settings updated!");
                  setEditingCourse(null);
                } catch (err: any) {
                  toast.error("Failed to update course: " + err.message);
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Course Title</label>
                  <input
                    name="title"
                    required
                    defaultValue={editingCourse.title}
                    placeholder="e.g. Full Stack Web Development with MERN"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Slug URL</label>
                  <input
                    name="slug"
                    required
                    defaultValue={editingCourse.slug}
                    placeholder="e.g. mern-full-stack"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Track</label>
                  <select
                    name="track"
                    defaultValue={editingCourse.track}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="mern">MERN Full Stack</option>
                    <option value="data_science">Data Science with AI</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingCourse.description ?? ""}
                    placeholder="Provide a detailed summary of the course..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Cover Image URL</label>
                  <input
                    name="cover_image_url"
                    defaultValue={editingCourse.cover_image_url ?? ""}
                    placeholder="https://images.unsplash.com/... or relative path"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Duration (weeks)</label>
                  <input
                    name="duration_weeks"
                    type="number"
                    min={1}
                    defaultValue={editingCourse.duration_weeks ?? ""}
                    placeholder="e.g. 12"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Level</label>
                  <select
                    name="level"
                    defaultValue={editingCourse.level ?? "Beginner"}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1 flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_published_edit"
                    name="is_published"
                    value="true"
                    defaultChecked={editingCourse.is_published}
                    className="size-4 rounded text-teal-600 focus:ring-teal-500 border-input"
                  />
                  <label htmlFor="is_published_edit" className="text-sm font-semibold cursor-pointer">
                    Course is Published
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
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
    </div>
  );
}
