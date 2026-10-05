"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Video,
  FileText,
  HelpCircle,
  Clock,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import {
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson
} from "@/lib/admin-course-actions";
import type { Database } from "@/lib/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

type ModuleWithLessons = ModuleRow & {
  lessons: LessonRow[];
};

export function CourseDetailClient({
  course,
  modules
}: {
  course: CourseRow;
  modules: ModuleWithLessons[];
}) {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(
    modules.length > 0 ? modules[0].id : null
  );

  // Modals state
  const [showAddMod, setShowAddMod] = useState(false);
  const [editingMod, setEditingMod] = useState<ModuleRow | null>(null);

  const [showAddLess, setShowAddLess] = useState<string | null>(null); // moduleId
  const [editingLess, setEditingLess] = useState<LessonRow | null>(null);

  // Reference Links state for Add/Edit Lesson
  const [refLinks, setRefLinks] = useState<{ label: string; url: string }[]>([]);

  function addRefLink() {
    setRefLinks([...refLinks, { label: "", url: "" }]);
  }

  function updateRefLink(index: number, key: "label" | "url", val: string) {
    const updated = [...refLinks];
    updated[index][key] = val;
    setRefLinks(updated);
  }

  function removeRefLink(index: number) {
    setRefLinks(refLinks.filter((_, i) => i !== index));
  }

  async function handleAddModule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createModule(formData);
      toast.success("Module created successfully");
      setShowAddMod(false);
    } catch (err: any) {
      toast.error("Error creating module: " + err.message);
    }
  }

  async function handleEditModule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingMod) return;
    const formData = new FormData(e.currentTarget);
    try {
      await updateModule(editingMod.id, course.id, formData);
      toast.success("Module updated successfully");
      setEditingMod(null);
    } catch (err: any) {
      toast.error("Error updating module: " + err.message);
    }
  }

  async function handleDeleteModule(id: string) {
    if (confirm("Are you sure you want to delete this module and all its lessons?")) {
      try {
        await deleteModule(id, course.id);
        toast.success("Module deleted successfully");
        if (activeModuleId === id) {
          setActiveModuleId(null);
        }
      } catch (err: any) {
        toast.error("Error deleting module: " + err.message);
      }
    }
  }

  async function handleAddLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("referenceLinks", JSON.stringify(refLinks.filter(l => l.label && l.url)));
    try {
      await createLesson(formData);
      toast.success("Lesson added successfully");
      setShowAddLess(null);
      setRefLinks([]);
    } catch (err: any) {
      toast.error("Error adding lesson: " + err.message);
    }
  }

  async function handleEditLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingLess) return;
    const formData = new FormData(e.currentTarget);
    formData.append("referenceLinks", JSON.stringify(refLinks.filter(l => l.label && l.url)));
    try {
      await updateLesson(editingLess.id, course.id, formData);
      toast.success("Lesson updated successfully");
      setEditingLess(null);
      setRefLinks([]);
    } catch (err: any) {
      toast.error("Error updating lesson: " + err.message);
    }
  }

  async function handleDeleteLesson(id: string) {
    if (confirm("Are you sure you want to delete this lesson?")) {
      try {
        await deleteLesson(id, course.id);
        toast.success("Lesson deleted successfully");
      } catch (err: any) {
        toast.error("Error deleting lesson: " + err.message);
      }
    }
  }

  const activeModule = modules.find((m) => m.id === activeModuleId);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="space-y-3">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
          <ArrowLeft className="size-4" />
          Back to Courses
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-1 rounded-md">
              Curriculum Manager
            </span>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{course.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">/{course.slug} · Manage course syllabus details</p>
          </div>
          <button
            onClick={() => {
              setRefLinks([]);
              setShowAddMod(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
          >
            <Plus className="size-4" />
            Add Module
          </button>
        </div>
      </div>

      {/* Curriculum Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules Sidebar list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Modules</h2>
            {modules.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No modules created yet.</p>
            ) : (
              <div className="space-y-2">
                {modules
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((mod) => (
                    <div
                      key={mod.id}
                      className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        activeModuleId === mod.id
                          ? "bg-teal-50/70 border-teal-200 text-teal-900 font-semibold"
                          : "bg-background border-border hover:bg-muted/50 text-foreground"
                      }`}
                      onClick={() => setActiveModuleId(mod.id)}
                    >
                      <div className="flex-1 truncate pr-12">
                        <span className="text-xs text-teal-600 block">Module {mod.order_index}</span>
                        <span className="truncate block text-sm">{mod.title}</span>
                      </div>
                      
                      {/* Action buttons (only show hover or active) */}
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMod(mod);
                          }}
                          className="p-1 text-muted-foreground hover:text-blue-600 hover:bg-white rounded-md border border-transparent hover:border-border transition-colors bg-card shadow-xs"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModule(mod.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-white rounded-md border border-transparent hover:border-border transition-colors bg-card shadow-xs"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Lessons content pane */}
        <div className="lg:col-span-2 space-y-4">
          {activeModule ? (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Module {activeModule.order_index}</span>
                  <h2 className="text-xl font-bold">{activeModule.title}</h2>
                  {activeModule.description && (
                    <p className="text-xs text-muted-foreground mt-1">{activeModule.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setRefLinks([]);
                    setShowAddLess(activeModule.id);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  <Plus className="size-3.5" />
                  Add Lesson
                </button>
              </div>

              {/* Lessons List */}
              {activeModule.lessons.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto size-12 text-muted-foreground opacity-30" />
                  <h3 className="text-sm font-semibold mt-4">No lessons in this module</h3>
                  <p className="text-xs text-muted-foreground mt-1">Get started by creating a lesson.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeModule.lessons
                    .slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((lesson) => (
                      <div
                        key={lesson.id}
                        className="rounded-xl border border-border p-4 hover:border-teal-100 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 hover:bg-muted/40"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-1.5 py-0.5">
                              {lesson.order_index}.
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 py-0.5 rounded bg-white border border-border">
                              {lesson.lesson_type}
                            </span>
                            {lesson.duration_minutes && (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="size-3" /> {lesson.duration_minutes} min
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-foreground">{lesson.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {lesson.content || "No content summary provided."}
                          </p>

                          {/* Quick links summary */}
                          {((lesson.reference_links as any[])?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1.5">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground inline-flex items-center gap-0.5">
                                <LinkIcon className="size-2.5" /> References:
                              </span>
                              {(lesson.reference_links as any[]).map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-teal-600 hover:underline inline-flex items-center gap-0.5"
                                >
                                  {link.label} <ExternalLink className="size-2" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingLess(lesson);
                              setRefLinks(lesson.reference_links || []);
                            }}
                            className="p-2 text-muted-foreground hover:text-teal-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-border bg-card shadow-2xs"
                            title="Edit lesson"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-border bg-card shadow-2xs"
                            title="Delete lesson"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <BookOpen className="mx-auto size-12 text-muted-foreground opacity-30" />
              <h3 className="text-sm font-semibold mt-4">Select a module</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a module from the list on the left to manage its lessons, or create a new module.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Module Modal */}
      {showAddMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Add Module</h2>
              <button onClick={() => setShowAddMod(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleAddModule} className="p-6 space-y-4">
              <input type="hidden" name="courseId" value={course.id} />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Module Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Getting Started with React"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="e.g. Fundamentals of state, props, and lifecycle"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Order Index (Sort Order)</label>
                <input
                  name="orderIndex"
                  type="number"
                  defaultValue={modules.length + 1}
                  className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMod(false)}
                  className="rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {editingMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Module</h2>
              <button onClick={() => setEditingMod(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleEditModule} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Module Title</label>
                <input
                  name="title"
                  required
                  defaultValue={editingMod.title}
                  placeholder="e.g. Getting Started with React"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingMod.description ?? ""}
                  placeholder="e.g. Fundamentals of state, props, and lifecycle"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Order Index</label>
                <input
                  name="orderIndex"
                  type="number"
                  defaultValue={editingMod.order_index}
                  className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingMod(null)}
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

      {/* Add Lesson Modal */}
      {showAddLess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Add Lesson</h2>
              <button onClick={() => setShowAddLess(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleAddLesson} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <input type="hidden" name="moduleId" value={showAddLess} />
              <input type="hidden" name="courseId" value={course.id} />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Lesson Title</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Core concepts of Props & State"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Lesson Type</label>
                  <select
                    name="lessonType"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="lesson">Lesson (Standard)</option>
                    <option value="video">Video Lecture</option>
                    <option value="article">Article / Reading</option>
                    <option value="quiz">Interactive Quiz</option>
                    <option value="project">Project Work</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Duration (minutes)</label>
                  <input
                    name="durationMinutes"
                    type="number"
                    min={1}
                    placeholder="e.g. 45"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Content / Description</label>
                  <textarea
                    name="content"
                    rows={3}
                    placeholder="Provide lesson details, outline, or markdown content..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Video Embed URL (optional)</label>
                  <input
                    name="videoUrl"
                    type="url"
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Primary Resource URL (optional)</label>
                  <input
                    name="resourceUrl"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Order Index</label>
                  <input
                    name="orderIndex"
                    type="number"
                    defaultValue={
                      (modules.find((m) => m.id === showAddLess)?.lessons.length ?? 0) + 1
                    }
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Reference Links Form Section */}
              <div className="border-t border-border pt-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="size-3.5" /> Additional Reference Links
                  </label>
                  <button
                    type="button"
                    onClick={addRefLink}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-0.5"
                  >
                    + Add Link
                  </button>
                </div>
                <div className="space-y-2">
                  {refLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        placeholder="Label (e.g. React Docs)"
                        value={link.label}
                        onChange={(e) => updateRefLink(idx, "label", e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                        required
                      />
                      <input
                        placeholder="URL (https://...)"
                        type="url"
                        value={link.url}
                        onChange={(e) => updateRefLink(idx, "url", e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeRefLink(idx)}
                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLess(null)}
                  className="rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {editingLess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Lesson</h2>
              <button onClick={() => setEditingLess(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleEditLesson} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <input type="hidden" name="courseId" value={course.id} />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Lesson Title</label>
                  <input
                    name="title"
                    required
                    defaultValue={editingLess.title}
                    placeholder="e.g. Core concepts of Props & State"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Lesson Type</label>
                  <select
                    name="lessonType"
                    defaultValue={editingLess.lesson_type}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="lesson">Lesson (Standard)</option>
                    <option value="video">Video Lecture</option>
                    <option value="article">Article / Reading</option>
                    <option value="quiz">Interactive Quiz</option>
                    <option value="project">Project Work</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Duration (minutes)</label>
                  <input
                    name="durationMinutes"
                    type="number"
                    min={1}
                    defaultValue={editingLess.duration_minutes ?? ""}
                    placeholder="e.g. 45"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Content / Description</label>
                  <textarea
                    name="content"
                    rows={3}
                    defaultValue={editingLess.content ?? ""}
                    placeholder="Provide lesson details, outline, or markdown content..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Video Embed URL (optional)</label>
                  <input
                    name="videoUrl"
                    type="url"
                    defaultValue={editingLess.video_url ?? ""}
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Primary Resource URL (optional)</label>
                  <input
                    name="resourceUrl"
                    type="url"
                    defaultValue={editingLess.resource_url ?? ""}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Order Index</label>
                  <input
                    name="orderIndex"
                    type="number"
                    defaultValue={editingLess.order_index}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Reference Links Form Section */}
              <div className="border-t border-border pt-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="size-3.5" /> Additional Reference Links
                  </label>
                  <button
                    type="button"
                    onClick={addRefLink}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-0.5"
                  >
                    + Add Link
                  </button>
                </div>
                <div className="space-y-2">
                  {refLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        placeholder="Label (e.g. React Docs)"
                        value={link.label}
                        onChange={(e) => updateRefLink(idx, "label", e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                        required
                      />
                      <input
                        placeholder="URL (https://...)"
                        type="url"
                        value={link.url}
                        onChange={(e) => updateRefLink(idx, "url", e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeRefLink(idx)}
                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingLess(null)}
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
