"use client";

import React, { useState, useTransition } from "react";
import {
  BookOpen,
  Layers,
  Link as LinkIcon,
  Video,
  FileText,
  HelpCircle,
  Clock,
  ExternalLink,
  CheckCircle2,
  ListCollapse,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { toggleLessonComplete } from "@/lib/progress-actions";
import type { Database } from "@/lib/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

type ModuleWithLessons = ModuleRow & {
  lessons: LessonRow[];
};

export function StudentCourseClient({
  course,
  modules,
  completedLessonIds
}: {
  course: CourseRow;
  modules: ModuleWithLessons[];
  completedLessonIds: string[];
}) {
  const [activeTab, setActiveTab] = useState<"curriculum" | "content" | "resources">("curriculum");
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set(completedLessonIds));
  const [pending, startTransition] = useTransition();

  // Sorting for Content Table
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination for Content Table
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Expanded Modules State
  const [expandedMods, setExpandedMods] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (modules.length > 0) initial[modules[0].id] = true;
    return initial;
  });

  const toggleExpand = (modId: string) => {
    setExpandedMods((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Toggle lesson complete callback
  const handleToggleLesson = async (lessonId: string) => {
    const nextSet = new Set(completedSet);
    const isCompleted = nextSet.has(lessonId);
    
    if (isCompleted) {
      nextSet.delete(lessonId);
    } else {
      nextSet.add(lessonId);
    }
    setCompletedSet(nextSet);

    startTransition(async () => {
      try {
        await toggleLessonComplete(lessonId, !isCompleted);
        toast.success(isCompleted ? "Marked lesson incomplete" : "Marked lesson completed!");
      } catch (err: any) {
        toast.error("Failed to update status: " + err.message);
        // Rollback on failure
        const rollbackSet = new Set(completedSet);
        setCompletedSet(rollbackSet);
      }
    });
  };

  // 1. Curriculum Calculations
  const calculatedModules = modules
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((mod) => {
      const lessons = mod.lessons || [];
      const totalLessons = lessons.length;
      const completedCount = lessons.filter((l) => completedSet.has(l.id)).length;
      const totalDuration = lessons.reduce((acc, curr) => acc + (curr.duration_minutes ?? 0), 0);

      let completionStatus: "Not Started" | "In Progress" | "Completed" = "Not Started";
      if (completedCount === totalLessons && totalLessons > 0) {
        completionStatus = "Completed";
      } else if (completedCount > 0) {
        completionStatus = "In Progress";
      }

      return {
        ...mod,
        lessons,
        totalLessons,
        completedCount,
        totalDuration,
        completionStatus
      };
    });

  // 2. Flattened Content Table data
  const flatLessons: {
    lesson: LessonRow;
    moduleTitle: string;
    moduleOrder: number;
  }[] = [];

  modules.forEach((mod) => {
    (mod.lessons ?? []).forEach((les) => {
      flatLessons.push({
        lesson: les,
        moduleTitle: mod.title,
        moduleOrder: mod.order_index
      });
    });
  });

  const sortedLessons = flatLessons.sort((a, b) => {
    if (a.moduleOrder !== b.moduleOrder) {
      return sortAsc ? a.moduleOrder - b.moduleOrder : b.moduleOrder - a.moduleOrder;
    }
    return sortAsc ? a.lesson.order_index - b.lesson.order_index : b.lesson.order_index - a.lesson.order_index;
  });

  // 3. Flattened Resources list
  const flatResources: {
    lessonTitle: string;
    label: string;
    url: string;
    moduleTitle: string;
  }[] = [];

  modules.forEach((mod) => {
    (mod.lessons ?? []).forEach((les) => {
      const links = (les.reference_links as any[]) ?? [];
      links.forEach((l) => {
        if (l.label && l.url) {
          flatResources.push({
            lessonTitle: les.title,
            label: l.label,
            url: l.url,
            moduleTitle: mod.title
          });
        }
      });
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
          Syllabus & Materials
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight mt-2">{course.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{course.description || "Course details and curriculum."}</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border gap-6 text-sm font-semibold select-none">
        <button
          onClick={() => setActiveTab("curriculum")}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === "curriculum"
              ? "border-teal-600 text-teal-600 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Layers className="size-4" /> Curriculum
          </span>
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === "content"
              ? "border-teal-600 text-teal-600 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4" /> Lessons Table
          </span>
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`pb-3 px-1 border-b-2 transition-all ${
            activeTab === "resources"
              ? "border-teal-600 text-teal-600 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <LinkIcon className="size-4" /> Resources Flat List ({flatResources.length})
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "curriculum" && (
        <div className="space-y-4">
          {calculatedModules.map((mod, i) => (
            <div key={mod.id} className="border border-border bg-card rounded-2xl overflow-hidden shadow-2xs">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => toggleExpand(mod.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded px-2 py-0.5">
                    Mod {mod.order_index}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mod.totalLessons} lessons · {mod.totalDuration} mins
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border ${
                      mod.completionStatus === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : mod.completionStatus === "In Progress"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {mod.completionStatus}
                  </span>
                  {expandedMods[mod.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>

              {expandedMods[mod.id] && (
                <div className="border-t border-border bg-muted/5 divide-y divide-border/60">
                  {mod.lessons.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No lessons added to this module yet.</p>
                  ) : (
                    mod.lessons
                      .slice()
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((les) => {
                        const isCompleted = completedSet.has(les.id);
                        return (
                          <div
                            key={les.id}
                            className="flex items-start justify-between p-4 gap-4 transition-colors hover:bg-muted/10"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <button
                                onClick={() => handleToggleLesson(les.id)}
                                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                  isCompleted
                                    ? "bg-teal-600 border-teal-600 text-white"
                                    : "border-muted-foreground/30 hover:border-teal-600 bg-background"
                                }`}
                              >
                                {isCompleted && <CheckCircle2 className="size-3" />}
                              </button>

                              <div className="min-w-0 space-y-1">
                                <p className={`text-sm font-semibold leading-none ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
                                  {les.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{les.content}</p>
                                <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-muted-foreground">
                                  <span className="uppercase font-bold text-teal-600">{les.lesson_type}</span>
                                  {les.duration_minutes && (
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="size-3" /> {les.duration_minutes} min
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Reference attachments */}
                            <div className="flex gap-2">
                              {les.video_url && (
                                <a
                                  href={les.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-border bg-card text-teal-600 hover:bg-teal-50"
                                  title="Watch video"
                                >
                                  <Video className="size-4" />
                                </a>
                              )}
                              {les.resource_url && (
                                <a
                                  href={les.resource_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-border bg-card text-teal-600 hover:bg-teal-50"
                                  title="Study guide / materials"
                                >
                                  <FileText className="size-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "content" && (
        <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">Done</th>
                  <th onClick={() => setSortAsc(!sortAsc)} className="px-5 py-4 cursor-pointer hover:bg-muted/40">
                    Lesson Title {sortAsc ? "▲" : "▼"}
                  </th>
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4 text-right">Reference Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedLessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      No lessons found.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const paginated = sortedLessons.slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    );
                    return paginated.map(({ lesson, moduleTitle }) => {
                      const isCompleted = completedSet.has(lesson.id);
                      const links = (lesson.reference_links as any[]) ?? [];

                      return (
                        <tr key={lesson.id} className="hover:bg-muted/10">
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleToggleLesson(lesson.id)}
                              className={`inline-flex size-5 items-center justify-center rounded-full border transition-all ${
                                isCompleted
                                  ? "bg-teal-600 border-teal-600 text-white"
                                  : "border-muted-foreground/30 hover:border-teal-600 bg-background"
                              }`}
                            >
                              {isCompleted && <CheckCircle2 className="size-3" />}
                            </button>
                          </td>
                          <td className="px-5 py-4 font-semibold">
                            <div className="flex flex-col">
                              <span className={isCompleted ? "text-muted-foreground line-through" : ""}>
                                {lesson.title}
                              </span>
                              <span className="text-xs text-muted-foreground font-normal line-clamp-1 max-w-sm">
                                {lesson.content}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">{moduleTitle}</td>
                          <td className="px-5 py-4">
                            <span className="text-[10px] uppercase font-bold text-teal-600 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">
                              {lesson.lesson_type}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">
                            {lesson.duration_minutes ? `${lesson.duration_minutes} mins` : "--"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex gap-1.5 justify-end">
                              {lesson.video_url && (
                                <a
                                  href={lesson.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:underline text-xs inline-flex items-center gap-0.5"
                                >
                                  Video <ExternalLink className="size-3" />
                                </a>
                              )}
                              {lesson.resource_url && (
                                <a
                                  href={lesson.resource_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:underline text-xs inline-flex items-center gap-0.5"
                                >
                                  Resource <ExternalLink className="size-3" />
                                </a>
                              )}
                              {links.map((link, lIdx) => (
                                <a
                                  key={lIdx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:underline text-xs inline-flex items-center gap-0.5"
                                >
                                  {link.label} <ExternalLink className="size-3" />
                                </a>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
          {Math.ceil(sortedLessons.length / ITEMS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-4 flex-wrap gap-4">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedLessons.length)}</span> to{" "}
                <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, sortedLessons.length)}</span> of{" "}
                <span className="font-semibold">{sortedLessons.length}</span> lessons
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(sortedLessons.length / ITEMS_PER_PAGE) }).map((_, idx) => {
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
                  disabled={currentPage === Math.ceil(sortedLessons.length / ITEMS_PER_PAGE)}
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

      {activeTab === "resources" && (
        <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Resource Label</th>
                  <th className="px-5 py-4">From Lesson</th>
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flatResources.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      No reference links found in this course.
                    </td>
                  </tr>
                ) : (
                  flatResources.map((res, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/10">
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <LinkIcon className="size-3.5 text-teal-600" /> {res.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{res.lessonTitle}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">{res.moduleTitle}</td>
                      <td className="px-5 py-4 text-right">
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
                        >
                          Open Resource <ExternalLink className="size-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
