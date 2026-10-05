"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  FileSpreadsheet,
  ListFilter,
  Check,
  X,
  Info,
  Sparkles,
} from "lucide-react";
import { formatDateString } from "@/lib/date-utils";
import type { Database } from "@/lib/supabase/types";

type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];
type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"] & {
  courses: Database["public"]["Tables"]["courses"]["Row"] | null;
};

interface StudentAttendanceClientProps {
  profile: any;
  enrollment: EnrollmentRow;
  records: AttendanceRow[];
  courseTitle: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
}

export function StudentAttendanceClient({
  profile,
  enrollment,
  records,
  courseTitle,
  progressPercentage,
  completedLessons,
  totalLessons,
}: StudentAttendanceClientProps) {
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayRecord, setSelectedDayRecord] = useState<{
    dateStr: string;
    record?: AttendanceRow;
  } | null>(null);

  // View Mode: 'calendar' | 'list'
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // List Filter State
  const [listStatusFilter, setListStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [listSearch, setListSearch] = useState("");

  // Map records by session_date string (YYYY-MM-DD)
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    records.forEach((r) => {
      map.set(r.session_date, r);
    });
    return map;
  }, [records]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.present).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    const isWarning = percentage < 80;

    // Consecutive streak (sorted chronologically)
    const sortedAsc = [...records].sort(
      (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    );
    let streak = 0;
    for (let i = sortedAsc.length - 1; i >= 0; i--) {
      if (sortedAsc[i].present) {
        streak++;
      } else {
        break;
      }
    }

    // Sessions needed to reach 80% if below
    let sessionsNeeded = 0;
    if (isWarning && total > 0) {
      // (present + x) / (total + x) >= 0.8  => present + x >= 0.8 total + 0.8 x => 0.2 x >= 0.8 total - present
      // x >= (4 * total - 5 * present)
      const needed = Math.ceil(4 * total - 5 * present);
      sessionsNeeded = needed > 0 ? needed : 1;
    }

    return {
      total,
      present,
      absent,
      percentage,
      isWarning,
      streak,
      sessionsNeeded,
    };
  }, [records]);

  // Calendar Math for Current Month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monthly stats
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthRecords = records.filter((r) => r.session_date.startsWith(monthPrefix));
    const total = monthRecords.length;
    const present = monthRecords.filter((r) => r.present).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, absent: total - present, pct };
  }, [records, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ["Session Date", "Day", "Course", "Attendance Status"];
    const rows = records.map((r) => {
      const d = new Date(r.session_date);
      const dayName = isNaN(d.getTime())
        ? ""
        : d.toLocaleDateString("en-US", { weekday: "long" });
      return [
        r.session_date,
        dayName,
        courseTitle,
        r.present ? "Present" : "Absent",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `my_attendance_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list records
  const filteredListRecords = useMemo(() => {
    return records.filter((r) => {
      if (listStatusFilter === "present" && !r.present) return false;
      if (listStatusFilter === "absent" && r.present) return false;
      if (listSearch) {
        const d = new Date(r.session_date);
        const dayStr = d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        if (
          !r.session_date.includes(listSearch) &&
          !dayStr.toLowerCase().includes(listSearch.toLowerCase())
        ) {
          return false;
        }
      }
      return true;
    });
  }, [records, listStatusFilter, listSearch]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Attendance & Sessions
            </h1>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                stats.isWarning
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
              }`}
            >
              {stats.percentage}% Overall
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your daily academy attendance, check certification eligibility, and inspect calendar session logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-2xs transition-all hover:bg-muted active:scale-95"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Export CSV
          </button>
          <Link
            href="/dashboard/course"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
          >
            <BookOpen className="size-4" />
            Resume Syllabus
          </Link>
        </div>
      </div>

      {/* Course & Track Overview Pill */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enrolled Course
            </p>
            <h2 className="text-base font-bold text-foreground">
              {courseTitle}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="rounded-lg bg-muted px-3 py-1.5 text-muted-foreground">
            Track:{" "}
            <strong className="text-foreground">
              {enrollment.track_type === "extended"
                ? "Extended (4 Months)"
                : "Short (45 Days)"}
            </strong>
          </span>
          <span className="rounded-lg bg-muted px-3 py-1.5 text-muted-foreground">
            Syllabus:{" "}
            <strong className="text-teal-600 font-bold">
              {progressPercentage}% ({completedLessons}/{totalLessons} lessons)
            </strong>
          </span>
          <span className="rounded-lg bg-muted px-3 py-1.5 text-muted-foreground">
            Status:{" "}
            <strong className="capitalize text-foreground">
              {enrollment.status}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Rate */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance Rate
            </span>
            <h3
              className={`text-3xl font-extrabold ${
                stats.isWarning ? "text-amber-600" : "text-teal-600"
              }`}
            >
              {stats.percentage}%
            </h3>
            <p className="text-xs text-muted-foreground">
              Requirement: 80% minimum
            </p>
          </div>
          <div className="relative size-14">
            <svg className="size-full -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                className="stroke-muted fill-none"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                className={`fill-none transition-all duration-500 ${
                  stats.isWarning ? "stroke-amber-500" : "stroke-teal-600"
                }`}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${
                  2 * Math.PI * 24 * (1 - stats.percentage / 100)
                }`}
              />
            </svg>
            <div
              className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
                stats.isWarning ? "text-amber-700" : "text-teal-800"
              }`}
            >
              {stats.percentage}%
            </div>
          </div>
        </div>

        {/* Sessions Attended */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions Attended
            </span>
            <h3 className="text-3xl font-extrabold text-foreground">
              {stats.present}
            </h3>
            <p className="text-xs text-muted-foreground">
              Out of {stats.total} recorded sessions
            </p>
          </div>
          <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600">
            <CheckCircle2 className="size-6" />
          </div>
        </div>

        {/* Absences */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Missed Sessions
            </span>
            <h3 className="text-3xl font-extrabold text-rose-600">
              {stats.absent}
            </h3>
            <p className="text-xs text-muted-foreground">
              {stats.absent === 0
                ? "Flawless record!"
                : `${stats.absent} session(s) absent`}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-600">
            <XCircle className="size-6" />
          </div>
        </div>

        {/* Streak & Certification */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Streak
            </span>
            <div className="flex items-center gap-1.5">
              <h3 className="text-3xl font-extrabold text-foreground">
                {stats.streak}
              </h3>
              <span className="text-sm font-semibold text-amber-500 flex items-center">
                <Flame className="size-4 fill-amber-500 text-amber-500" /> Days
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.percentage >= 80 && progressPercentage >= 100
                ? "🎓 Certification Eligible"
                : stats.percentage >= 80
                ? "✅ Attendance On Track"
                : "⚠️ Attendance Alert"}
            </p>
          </div>
          <div
            className={`rounded-2xl p-3 ${
              stats.percentage >= 80 && progressPercentage >= 100
                ? "bg-purple-500/10 text-purple-600"
                : stats.percentage >= 80
                ? "bg-teal-500/10 text-teal-600"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            <Award className="size-6" />
          </div>
        </div>
      </div>

      {/* Attendance Warning / Guidance Banner */}
      {stats.isWarning ? (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200 shadow-2xs">
          <AlertTriangle className="size-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-bold">
              Attendance Alert: You are below the 80% certification criteria
            </h3>
            <p className="text-sm opacity-90">
              Your current attendance rate is <strong>{stats.percentage}%</strong>. TechEve Academy requires at least <strong>80% attendance</strong> along with complete syllabus completion to issue official course credentials and certificates.
            </p>
            {stats.sessionsNeeded > 0 && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2">
                Tip: Attending your next <strong>{stats.sessionsNeeded} upcoming session{stats.sessionsNeeded > 1 ? "s" : ""}</strong> without absence will bring your attendance back to the 80% threshold!
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 text-teal-900 dark:text-teal-200">
          <Sparkles className="size-5 text-teal-600 shrink-0" />
          <p className="text-xs sm:text-sm">
            <strong>Great job!</strong> Your attendance meets the <strong>80% minimum standard</strong> for graduation and certificates. Keep maintaining your streak!
          </p>
        </div>
      )}

      {/* Main Content Area: View Toggle (Calendar Grid vs List View) */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CalendarIcon className="size-4" />
              Calendar View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ListFilter className="size-4" />
              Session History List ({records.length})
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/30 inline-block" />
              <span>No Session</span>
            </div>
          </div>
        </div>

        {/* View 1: Calendar View */}
        {viewMode === "calendar" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar Grid Container */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs lg:col-span-2 space-y-6">
              {/* Calendar Month Selector Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {monthName} {year}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {monthStats.total} session{monthStats.total === 1 ? "" : "s"} scheduled this month ({monthStats.present} attended • {monthStats.pct}% attendance)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToday}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Next month"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Column Headers */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Month Days Matrix */}
              <div className="grid grid-cols-7 gap-2">
                {/* Blank days before start of month */}
                {Array.from({ length: startDayOfWeek }).map((_, index) => (
                  <div
                    key={`blank-${index}`}
                    className="min-h-[72px] sm:min-h-[88px] rounded-xl bg-muted/20 border border-transparent p-1.5 opacity-30"
                  />
                ))}

                {/* Days of the Month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const dayNum = index + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(
                    2,
                    "0"
                  )}-${String(dayNum).padStart(2, "0")}`;
                  const record = recordsMap.get(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSelected = selectedDayRecord?.dateStr === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() =>
                        setSelectedDayRecord({
                          dateStr,
                          record,
                        })
                      }
                      className={`min-h-[72px] sm:min-h-[88px] rounded-xl p-2 text-left flex flex-col justify-between transition-all border ${
                        isSelected
                          ? "ring-2 ring-teal-500 border-teal-500 bg-teal-500/5 shadow-xs"
                          : isToday
                          ? "border-teal-500/50 bg-teal-500/5"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold rounded-md size-6 flex items-center justify-center ${
                            isToday
                              ? "bg-teal-600 text-white"
                              : "text-foreground"
                          }`}
                        >
                          {dayNum}
                        </span>

                        {record && (
                          <span
                            className={`size-2 rounded-full ${
                              record.present ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                        )}
                      </div>

                      {/* Status chip inside cell */}
                      <div className="w-full mt-1">
                        {record ? (
                          <div
                            className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] sm:text-xs font-bold truncate ${
                              record.present
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {record.present ? (
                              <>
                                <Check className="size-3 shrink-0" />
                                <span className="hidden sm:inline">Present</span>
                              </>
                            ) : (
                              <>
                                <X className="size-3 shrink-0" />
                                <span className="hidden sm:inline">Absent</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic hidden sm:block">
                            --
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Calendar Footer Info */}
              <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground flex-wrap gap-2">
                <span>
                  Tip: Click on any day tile to inspect the session log details.
                </span>
                <span>
                  Showing {monthName} {year}
                </span>
              </div>
            </div>

            {/* Selected Date Inspector Sidebar Card */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CalendarIcon className="size-4 text-teal-600" />
                    Session Details
                  </h3>
                  {selectedDayRecord && (
                    <button
                      onClick={() => setSelectedDayRecord(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedDayRecord ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Selected Date
                      </span>
                      <p className="text-lg font-bold text-foreground">
                        {formatDateString(selectedDayRecord.dateStr)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedDayRecord.dateStr).toLocaleDateString(
                          "en-US",
                          { weekday: "long" }
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Status Log
                      </span>
                      {selectedDayRecord.record ? (
                        <div className="space-y-2">
                          <div
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold ${
                              selectedDayRecord.record.present
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {selectedDayRecord.record.present ? (
                              <>
                                <CheckCircle2 className="size-4" />
                                Marked Present
                              </>
                            ) : (
                              <>
                                <XCircle className="size-4" />
                                Marked Absent
                              </>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedDayRecord.record.present
                              ? "Your attendance was verified and recorded for this training session."
                              : "You were logged as absent for this session. Contact your instructor if you believe this was an error."}
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">
                            No session recorded on this date
                          </p>
                          <p>
                            Either no batch lecture took place, or attendance was not scheduled for this calendar date.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t border-border">
                      <div className="flex justify-between">
                        <span>Course:</span>
                        <span className="font-semibold text-foreground truncate max-w-[180px]">
                          {courseTitle}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Track:</span>
                        <span className="font-semibold text-foreground capitalize">
                          {enrollment.track_type}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
                    <CalendarIcon className="size-8 mx-auto opacity-30 text-teal-600" />
                    <p className="font-semibold text-foreground">
                      Select a date from the calendar
                    </p>
                    <p>
                      Click on any day in the monthly calendar to inspect its attendance log and verification status.
                    </p>
                  </div>
                )}
              </div>

              {/* Attendance Policy Guidance */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-4 text-teal-600" />
                  TechEve Attendance Policy
                </h4>
                <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
                  <li>
                    A minimum of <strong>80% attendance</strong> is mandatory for graduation & certificates.
                  </li>
                  <li>
                    Attendance is logged during live sessions by assigned batch instructors.
                  </li>
                  <li>
                    In case of medical or unavoidable absence, notify your mentor to request review.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Chronological List View */}
        {viewMode === "list" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6">
            {/* List Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by date (e.g. 2026-10 or Oct)..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-teal-500 outline-none w-64"
                />
                <select
                  value={listStatusFilter}
                  onChange={(e) => setListStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-teal-500 outline-none"
                >
                  <option value="all">All Statuses ({records.length})</option>
                  <option value="present">Present ({stats.present})</option>
                  <option value="absent">Absent ({stats.absent})</option>
                </select>
              </div>

              <p className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{filteredListRecords.length}</strong> of {records.length} session logs
              </p>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground select-none">
                  <tr>
                    <th className="px-5 py-3.5">Session Date</th>
                    <th className="px-5 py-3.5">Day of Week</th>
                    <th className="px-5 py-3.5">Course</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredListRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                        No attendance records match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredListRecords.map((rec) => {
                      const d = new Date(rec.session_date);
                      const dayName = isNaN(d.getTime())
                        ? ""
                        : d.toLocaleDateString("en-US", { weekday: "long" });

                      return (
                        <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4 font-semibold text-foreground">
                            {formatDateString(rec.session_date)}
                          </td>
                          <td className="px-5 py-4 text-muted-foreground text-xs font-medium">
                            {dayName}
                          </td>
                          <td className="px-5 py-4 text-foreground text-xs font-medium">
                            {courseTitle}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                rec.present
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {rec.present ? (
                                <>
                                  <Check className="size-3" />
                                  Present
                                </>
                              ) : (
                                <>
                                  <X className="size-3" />
                                  Absent
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right text-xs text-muted-foreground">
                            {rec.present ? "Verified" : "Missed"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
