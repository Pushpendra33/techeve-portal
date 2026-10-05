"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Award,
  Sparkles,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  Flame,
  User,
  FlaskConical,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  markStudentAttendance,
  batchSaveAttendance,
  deleteAttendanceRecord,
  getStudentProgressDossier,
} from "@/lib/attendance-actions";
import { formatDateString } from "@/lib/date-utils";
import type { Database, UserRole, EnrollmentTrackType, EnrollmentStatus } from "@/lib/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];

export interface StudentProgressItem {
  enrollmentId: string;
  profileId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  college: string | null;
  yearOfStudy: string | null;
  courseId: string;
  courseTitle: string;
  trackType: EnrollmentTrackType;
  status: EnrollmentStatus;
  enrolledAt: string;
  attendance: {
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    percentage: number;
    records: AttendanceRow[];
  };
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
  capstones: {
    total: number;
    reviewed: number;
    submitted: number;
  };
}

interface AdminAttendanceClientProps {
  students: StudentProgressItem[];
  courses: CourseRow[];
  allAttendanceRecords: AttendanceRow[];
  currentUserRole: UserRole;
}

export function AdminAttendanceClient({
  students: initialStudents,
  courses,
  allAttendanceRecords: initialRecords,
  currentUserRole,
}: AdminAttendanceClientProps) {
  // Local state for optimistic updates
  const [students, setStudents] = useState<StudentProgressItem[]>(initialStudents);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRow[]>(initialRecords);

  // Active View Tab: 'daily' | 'matrix' | 'directory'
  const [activeTab, setActiveTab] = useState<"daily" | "matrix" | "directory">("daily");

  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [warningFilterOnly, setWarningFilterOnly] = useState<boolean>(false);

  // Daily Marker Date
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [savingBatch, setSavingBatch] = useState<boolean>(false);

  // Matrix View Month/Year
  const [matrixDate, setMatrixDate] = useState<Date>(() => new Date());

  // Dossier Modal State
  const [dossierStudent, setDossierStudent] = useState<StudentProgressItem | null>(null);
  const [dossierData, setDossierData] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);
  const [dossierTab, setDossierTab] = useState<"attendance" | "curriculum" | "capstones">("attendance");
  const [dossierMarkDate, setDossierMarkDate] = useState<string>(todayStr);

  // Global KPI Metrics
  const kpis = useMemo(() => {
    const totalStudents = students.length;
    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        avgAttendance: 100,
        warningCount: 0,
        avgProgress: 0,
        totalSessionsLogged: attendanceRecords.length,
      };
    }

    const totalAttPct = students.reduce((acc, s) => acc + s.attendance.percentage, 0);
    const avgAttendance = Math.round(totalAttPct / totalStudents);

    const warningCount = students.filter((s) => s.attendance.percentage < 80).length;

    const totalProgPct = students.reduce((acc, s) => acc + s.progress.percentage, 0);
    const avgProgress = Math.round(totalProgPct / totalStudents);

    // Unique session dates
    const uniqueDates = new Set(attendanceRecords.map((r) => r.session_date));

    return {
      totalStudents,
      avgAttendance,
      warningCount,
      avgProgress,
      totalSessionsLogged: uniqueDates.size,
    };
  }, [students, attendanceRecords]);

  // Filtered Students for Daily Marker / Directory
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedCourse && s.courseId !== selectedCourse) return false;
      if (selectedTrack && s.trackType !== selectedTrack) return false;
      if (warningFilterOnly && s.attendance.percentage >= 80) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(query);
        const matchesEmail = s.email?.toLowerCase().includes(query);
        const matchesCollege = s.college?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesCollege) return false;
      }
      return true;
    });
  }, [students, selectedCourse, selectedTrack, warningFilterOnly, searchTerm]);

  // Attendance for selected date mapped by enrollment_id
  const dateAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    attendanceRecords
      .filter((r) => r.session_date === selectedDate)
      .forEach((r) => {
        map.set(r.enrollment_id, r);
      });
    return map;
  }, [attendanceRecords, selectedDate]);

  // Daily stats for selected date
  const dailyDateStats = useMemo(() => {
    const relevantEnrollments = filteredStudents.map((s) => s.enrollmentId);
    let present = 0;
    let absent = 0;
    let unmarked = 0;

    relevantEnrollments.forEach((enrollId) => {
      const record = dateAttendanceMap.get(enrollId);
      if (!record) {
        unmarked++;
      } else if (record.present) {
        present++;
      } else {
        absent++;
      }
    });

    const total = relevantEnrollments.length;
    const rate = total > 0 && present + absent > 0 ? Math.round((present / (present + absent)) * 100) : 0;

    return { total, present, absent, unmarked, rate };
  }, [filteredStudents, dateAttendanceMap]);

  // Handle marking individual student on selected date
  const handleToggleAttendance = async (
    enrollmentId: string,
    present: boolean | null,
    targetDate: string = selectedDate
  ) => {
    try {
      if (present === null) {
        // Delete record
        await deleteAttendanceRecord(enrollmentId, targetDate);
        setAttendanceRecords((prev) =>
          prev.filter((r) => !(r.enrollment_id === enrollmentId && r.session_date === targetDate))
        );
        updateStudentLocalStats(enrollmentId, targetDate, null);
        toast.info("Attendance record removed");
      } else {
        // Upsert record
        const saved = await markStudentAttendance(enrollmentId, targetDate, present);
        setAttendanceRecords((prev) => {
          const filtered = prev.filter(
            (r) => !(r.enrollment_id === enrollmentId && r.session_date === targetDate)
          );
          return [saved, ...filtered];
        });
        updateStudentLocalStats(enrollmentId, targetDate, present);
        toast.success(`Marked ${present ? "Present" : "Absent"}`);
      }
    } catch (err: any) {
      toast.error("Error updating attendance: " + err.message);
    }
  };

  // Helper to recompute local student stats after single toggle
  const updateStudentLocalStats = (enrollmentId: string, date: string, present: boolean | null) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId) return s;
        const newRecords = s.attendance.records.filter((r) => r.session_date !== date);
        if (present !== null) {
          newRecords.push({
            id: `temp-${Date.now()}`,
            enrollment_id: enrollmentId,
            session_date: date,
            present,
          });
        }
        const total = newRecords.length;
        const pCount = newRecords.filter((r) => r.present).length;
        const aCount = total - pCount;
        const pct = total > 0 ? Math.round((pCount / total) * 100) : 100;
        return {
          ...s,
          attendance: {
            totalSessions: total,
            presentCount: pCount,
            absentCount: aCount,
            percentage: pct,
            records: newRecords,
          },
        };
      })
    );
  };

  // Bulk mark all filtered students
  const handleBulkMark = async (present: boolean) => {
    if (filteredStudents.length === 0) {
      toast.error("No students in current filter");
      return;
    }

    setSavingBatch(true);
    try {
      const updates = filteredStudents.map((s) => ({
        enrollmentId: s.enrollmentId,
        present,
      }));

      await batchSaveAttendance(selectedDate, updates);

      // Optimistic update
      const newMap = new Map<string, AttendanceRow>();
      updates.forEach((u) => {
        newMap.set(u.enrollmentId, {
          id: `batch-${Date.now()}-${u.enrollmentId}`,
          enrollment_id: u.enrollmentId,
          session_date: selectedDate,
          present: u.present,
        });
      });

      setAttendanceRecords((prev) => {
        const withoutDate = prev.filter(
          (r) =>
            r.session_date !== selectedDate ||
            !updates.some((u) => u.enrollmentId === r.enrollment_id)
        );
        return [...Array.from(newMap.values()), ...withoutDate];
      });

      // Update student stats
      setStudents((prev) =>
        prev.map((s) => {
          if (!newMap.has(s.enrollmentId)) return s;
          const without = s.attendance.records.filter((r) => r.session_date !== selectedDate);
          const updated = [...without, newMap.get(s.enrollmentId)!];
          const total = updated.length;
          const pCount = updated.filter((r) => r.present).length;
          return {
            ...s,
            attendance: {
              totalSessions: total,
              presentCount: pCount,
              absentCount: total - pCount,
              percentage: total > 0 ? Math.round((pCount / total) * 100) : 100,
              records: updated,
            },
          };
        })
      );

      toast.success(
        `Marked all ${filteredStudents.length} students as ${present ? "Present" : "Absent"} for ${formatDateString(selectedDate)}`
      );
    } catch (err: any) {
      toast.error("Batch update failed: " + err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // Bulk clear records for date
  const handleBulkClear = async () => {
    if (!confirm(`Are you sure you want to clear attendance for all students on ${formatDateString(selectedDate)}?`)) {
      return;
    }

    setSavingBatch(true);
    try {
      for (const s of filteredStudents) {
        await deleteAttendanceRecord(s.enrollmentId, selectedDate);
      }

      setAttendanceRecords((prev) =>
        prev.filter(
          (r) =>
            r.session_date !== selectedDate ||
            !filteredStudents.some((s) => s.enrollmentId === r.enrollment_id)
        )
      );

      setStudents((prev) =>
        prev.map((s) => {
          if (!filteredStudents.some((f) => f.enrollmentId === s.enrollmentId)) return s;
          const updated = s.attendance.records.filter((r) => r.session_date !== selectedDate);
          const total = updated.length;
          const pCount = updated.filter((r) => r.present).length;
          return {
            ...s,
            attendance: {
              totalSessions: total,
              presentCount: pCount,
              absentCount: total - pCount,
              percentage: total > 0 ? Math.round((pCount / total) * 100) : 100,
              records: updated,
            },
          };
        })
      );

      toast.success(`Cleared records for ${formatDateString(selectedDate)}`);
    } catch (err: any) {
      toast.error("Failed to clear attendance: " + err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // Open Full Student Dossier Modal
  const handleOpenDossier = async (student: StudentProgressItem) => {
    setDossierStudent(student);
    setLoadingDossier(true);
    try {
      const data = await getStudentProgressDossier(student.profileId, student.enrollmentId);
      setDossierData(data);
    } catch (err: any) {
      toast.error("Failed to load student dossier: " + err.message);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Monthly Matrix Math
  const matrixYear = matrixDate.getFullYear();
  const matrixMonth = matrixDate.getMonth();
  const matrixMonthName = matrixDate.toLocaleString("default", { month: "long" });
  const daysInMatrixMonth = new Date(matrixYear, matrixMonth + 1, 0).getDate();

  // Export CSV
  const exportProgressCSV = () => {
    const headers = [
      "Student Name",
      "Email",
      "College",
      "Course",
      "Track",
      "Attendance %",
      "Attended Sessions",
      "Total Sessions",
      "Syllabus Progress %",
      "Completed Lessons",
      "Total Lessons",
      "Capstones Submitted",
      "Capstones Reviewed",
      "Enrollment Status",
    ];

    const rows = filteredStudents.map((s) => [
      s.fullName,
      s.email || "",
      s.college || "",
      s.courseTitle,
      s.trackType === "short" ? "Short (45d)" : "Extended (4m)",
      `${s.attendance.percentage}%`,
      s.attendance.presentCount,
      s.attendance.totalSessions,
      `${s.progress.percentage}%`,
      s.progress.completedLessons,
      s.progress.totalLessons,
      s.capstones.submitted,
      s.capstones.reviewed,
      s.status,
    ]);

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
      `student_progress_attendance_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Progress CSV exported successfully!");
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Attendance & Progress
            </h1>
            <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-3 py-0.5 text-xs font-bold text-teal-600 uppercase tracking-wider">
              Staff Portal
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Record batch attendance, monitor syllabus completion rates, and inspect detailed student dossiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportProgressCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-2xs transition-all hover:bg-muted active:scale-95"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Export Progress CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Students
          </span>
          <h3 className="text-2xl font-bold text-foreground">{kpis.totalStudents}</h3>
          <p className="text-xs text-muted-foreground">Enrolled across all tracks</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Avg Attendance Rate
          </span>
          <h3 className="text-2xl font-bold text-teal-600">{kpis.avgAttendance}%</h3>
          <p className="text-xs text-muted-foreground">Academy-wide average</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            At-Risk Attendance
          </span>
          <h3 className={`text-2xl font-bold ${kpis.warningCount > 0 ? "text-amber-600" : "text-foreground"}`}>
            {kpis.warningCount}
          </h3>
          <p className="text-xs text-muted-foreground">Students &lt; 80% threshold</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Avg Syllabus Progress
          </span>
          <h3 className="text-2xl font-bold text-blue-600">{kpis.avgProgress}%</h3>
          <p className="text-xs text-muted-foreground">Completed course lessons</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Session Dates Logged
          </span>
          <h3 className="text-2xl font-bold text-purple-600">{kpis.totalSessionsLogged}</h3>
          <p className="text-xs text-muted-foreground">Unique lecture days</p>
        </div>
      </div>

      {/* Global Filter Bar & Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
          {/* Main Mode Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("daily")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "daily"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="size-4" />
              Daily Attendance Marker
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "matrix"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CalendarIcon className="size-4" />
              Monthly Matrix View
            </button>

            <button
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "directory"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <TrendingUp className="size-4" />
              Student Progress Directory ({students.length})
            </button>
          </div>

          {/* Quick Warning Toggle */}
          <button
            onClick={() => setWarningFilterOnly(!warningFilterOnly)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
              warningFilterOnly
                ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <AlertTriangle className="size-3.5" />
            {warningFilterOnly ? "Showing <80% Warning Only" : "Filter <80% Attendance"}
          </button>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student, email, college..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-input rounded-xl focus:border-teal-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-teal-500 outline-none"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-teal-500 outline-none"
            >
              <option value="">All Tracks</option>
              <option value="short">Short (45 Days)</option>
              <option value="extended">Extended (4 Months)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE MARKER */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Date Picker & Batch Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xs">
            {/* Date Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Session Date:
                </span>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:border-teal-500 outline-none"
              />
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y.toISOString().split("T")[0]);
                }}
                className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Yesterday
              </button>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={savingBatch || filteredStudents.length === 0}
                onClick={() => handleBulkMark(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Check className="size-3.5" />
                Mark All Present
              </button>

              <button
                disabled={savingBatch || filteredStudents.length === 0}
                onClick={() => handleBulkMark(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                <X className="size-3.5" />
                Mark All Absent
              </button>

              <button
                disabled={savingBatch || filteredStudents.length === 0}
                onClick={handleBulkClear}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-50 transition-all"
                title="Clear attendance for this date"
              >
                <Trash2 className="size-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Date Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-4 text-xs font-semibold">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Session Summary for <strong className="text-foreground">{formatDateString(selectedDate)}</strong>:
              </span>
              <span className="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5">
                {dailyDateStats.present} Present
              </span>
              <span className="rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5">
                {dailyDateStats.absent} Absent
              </span>
              <span className="rounded-md bg-muted text-muted-foreground border border-border px-2 py-0.5">
                {dailyDateStats.unmarked} Unmarked
              </span>
            </div>

            <div className="text-muted-foreground">
              Attendance Rate for Date:{" "}
              <strong className="text-teal-600 font-bold">{dailyDateStats.rate}%</strong> ({filteredStudents.length} students)
            </div>
          </div>

          {/* Student Daily Marker Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground select-none">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Course & Track</th>
                    <th className="px-5 py-4">Overall Attendance</th>
                    <th className="px-5 py-4">Syllabus Progress</th>
                    <th className="px-5 py-4 text-center">Status for {formatDateString(selectedDate)}</th>
                    <th className="px-5 py-4 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                        No students match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const record = dateAttendanceMap.get(s.enrollmentId);
                      const isPresent = record ? record.present : null;

                      return (
                        <tr key={s.enrollmentId} className="hover:bg-muted/10 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{s.fullName}</span>
                              <span className="text-xs text-muted-foreground">{s.email || "No email"}</span>
                              {s.college && (
                                <span className="text-[11px] text-muted-foreground/80">{s.college}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-foreground">{s.courseTitle}</div>
                            <span className="text-xs text-muted-foreground uppercase font-semibold">
                              {s.trackType === "short" ? "Short (45d)" : "Extended (4m)"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                  s.attendance.percentage < 80
                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                    : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                                }`}
                              >
                                {s.attendance.percentage}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({s.attendance.presentCount}/{s.attendance.totalSessions} sessions)
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="w-36 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-foreground">{s.progress.percentage}%</span>
                                <span className="text-muted-foreground">
                                  {s.progress.completedLessons}/{s.progress.totalLessons}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-teal-600 rounded-full transition-all duration-300"
                                  style={{ width: `${s.progress.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Interactive Toggle Buttons for Date */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(s.enrollmentId, true)}
                                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                                  isPresent === true
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30"
                                    : "border-border bg-card text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                }`}
                              >
                                <Check className="size-3.5" />
                                Present
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(s.enrollmentId, false)}
                                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                                  isPresent === false
                                    ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30"
                                    : "border-border bg-card text-muted-foreground hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                }`}
                              >
                                <X className="size-3.5" />
                                Absent
                              </button>

                              {isPresent !== null && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(s.enrollmentId, null)}
                                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted text-xs"
                                  title="Clear record for this date"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleOpenDossier(s)}
                              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition-all"
                            >
                              <User className="size-3.5" />
                              View Dossier
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY ATTENDANCE MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xs">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {matrixMonthName} {matrixYear} Attendance Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click on any cell in the grid to quick-toggle attendance: Unmarked → Present → Absent → Unmarked
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMatrixDate(new Date())}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Current Month
              </button>
              <button
                onClick={() => setMatrixDate(new Date(matrixYear, matrixMonth - 1, 1))}
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setMatrixDate(new Date(matrixYear, matrixMonth + 1, 1))}
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Next Month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border font-bold uppercase tracking-wider text-muted-foreground select-none">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-muted/90 backdrop-blur z-10 min-w-[180px]">
                      Student Name
                    </th>
                    <th className="px-3 py-3 text-center">Month Rate</th>
                    {Array.from({ length: daysInMatrixMonth }).map((_, index) => {
                      const dayNum = index + 1;
                      const dateObj = new Date(matrixYear, matrixMonth, dayNum);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                      return (
                        <th
                          key={`day-header-${dayNum}`}
                          className={`px-2 py-2 text-center min-w-[34px] ${
                            isWeekend ? "bg-muted/80 text-muted-foreground/60" : ""
                          }`}
                        >
                          <div>{dayNum}</div>
                          <div className="text-[9px] font-normal opacity-70">
                            {dateObj.toLocaleDateString("en-US", { weekday: "narrow" })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={daysInMatrixMonth + 2}
                        className="text-center py-12 text-sm text-muted-foreground"
                      >
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      // Calculate this month's stats for student
                      const monthPrefix = `${matrixYear}-${String(matrixMonth + 1).padStart(2, "0")}`;
                      const studentMonthRecords = s.attendance.records.filter((r) =>
                        r.session_date.startsWith(monthPrefix)
                      );
                      const monthTotal = studentMonthRecords.length;
                      const monthPresent = studentMonthRecords.filter((r) => r.present).length;
                      const monthPct = monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 100;

                      return (
                        <tr key={s.enrollmentId} className="hover:bg-muted/20">
                          <td className="px-4 py-3 sticky left-0 bg-card/95 backdrop-blur z-10 border-r border-border font-semibold text-foreground">
                            <button
                              onClick={() => handleOpenDossier(s)}
                              className="hover:text-teal-600 text-left truncate max-w-[160px] block"
                              title={s.fullName}
                            >
                              {s.fullName}
                            </button>
                            <span className="text-[10px] text-muted-foreground block font-normal truncate">
                              {s.courseTitle}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-center border-r border-border">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                monthPct < 80
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                              }`}
                            >
                              {monthTotal > 0 ? `${monthPct}%` : "N/A"}
                            </span>
                          </td>

                          {Array.from({ length: daysInMatrixMonth }).map((_, index) => {
                            const dayNum = index + 1;
                            const cellDateStr = `${matrixYear}-${String(matrixMonth + 1).padStart(
                              2,
                              "0"
                            )}-${String(dayNum).padStart(2, "0")}`;
                            const cellRecord = s.attendance.records.find(
                              (r) => r.session_date === cellDateStr
                            );
                            const cellState = cellRecord ? (cellRecord.present ? "present" : "absent") : "unmarked";

                            const cycleNextState = () => {
                              if (cellState === "unmarked") {
                                handleToggleAttendance(s.enrollmentId, true, cellDateStr);
                              } else if (cellState === "present") {
                                handleToggleAttendance(s.enrollmentId, false, cellDateStr);
                              } else {
                                handleToggleAttendance(s.enrollmentId, null, cellDateStr);
                              }
                            };

                            return (
                              <td
                                key={`cell-${s.enrollmentId}-${dayNum}`}
                                onClick={cycleNextState}
                                className="px-1 py-2 text-center cursor-pointer border-r border-border/40 hover:bg-teal-500/10 transition-colors select-none"
                                title={`${s.fullName} on ${cellDateStr}: ${cellState}`}
                              >
                                <div className="flex items-center justify-center">
                                  {cellState === "present" ? (
                                    <div className="size-5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                                      <Check className="size-3" />
                                    </div>
                                  ) : cellState === "absent" ? (
                                    <div className="size-5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                                      <X className="size-3" />
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-[10px]">-</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT PROGRESS DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground select-none">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Course & Track</th>
                    <th className="px-5 py-4">Attendance Rate</th>
                    <th className="px-5 py-4">Syllabus Completion</th>
                    <th className="px-5 py-4">Capstones</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.enrollmentId} className="hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{s.fullName}</span>
                            <span className="text-xs text-muted-foreground">{s.email || "No email"}</span>
                            {s.college && (
                              <span className="text-[11px] text-muted-foreground/80">{s.college}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground">{s.courseTitle}</div>
                          <span className="text-xs text-muted-foreground uppercase font-semibold">
                            {s.trackType === "short" ? "Short (45d)" : "Extended (4m)"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                s.attendance.percentage < 80
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                              }`}
                            >
                              {s.attendance.percentage}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({s.attendance.presentCount}/{s.attendance.totalSessions} sessions)
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="w-40 space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="font-bold text-foreground">{s.progress.percentage}%</span>
                              <span className="text-muted-foreground">
                                {s.progress.completedLessons}/{s.progress.totalLessons} lessons
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                                style={{ width: `${s.progress.percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <FlaskConical className="size-3.5 text-blue-600" />
                            <span>{s.capstones.total} submitted</span>
                            {s.capstones.reviewed > 0 && (
                              <span className="text-emerald-600 font-semibold">
                                ({s.capstones.reviewed} reviewed)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                              s.status === "active"
                                ? "bg-teal-500/10 text-teal-700 border border-teal-500/20"
                                : s.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenDossier(s)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition-all"
                          >
                            <TrendingUp className="size-3.5" />
                            View Full Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PROGRESS & ATTENDANCE DOSSIER MODAL */}
      {dossierStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {dossierStudent.fullName}
                  </h2>
                  <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-xs font-bold text-teal-600 uppercase">
                    Student Dossier
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dossierStudent.email || "No email"} • {dossierStudent.courseTitle} ({dossierStudent.trackType} track)
                </p>
              </div>

              <button
                onClick={() => {
                  setDossierStudent(null);
                  setDossierData(null);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content */}
            {loadingDossier ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="size-8 mx-auto animate-spin text-teal-600" />
                <p className="text-sm font-semibold text-muted-foreground">
                  Loading comprehensive student analytics...
                </p>
              </div>
            ) : dossierData ? (
              <div className="space-y-6">
                {/* Dossier Quick KPI Row */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Attendance Rate
                    </span>
                    <p
                      className={`text-xl font-extrabold ${
                        dossierData.attendance.percentage < 80 ? "text-amber-600" : "text-teal-600"
                      }`}
                    >
                      {dossierData.attendance.percentage}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dossierData.attendance.presentCount} of {dossierData.attendance.totalSessions} sessions
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Syllabus Progress
                    </span>
                    <p className="text-xl font-extrabold text-blue-600">
                      {dossierData.progress.percentage}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dossierData.progress.completedLessonsCount} of {dossierData.progress.totalLessons} lessons
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Capstones
                    </span>
                    <p className="text-xl font-extrabold text-purple-600">
                      {dossierData.capstones.length}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dossierData.capstones.filter((c: any) => c.status === "reviewed").length} reviewed
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Certification Status
                    </span>
                    <p className="text-base font-bold text-foreground">
                      {dossierData.progress.percentage >= 100 && dossierData.attendance.percentage >= 80
                        ? "🎓 Ready to Issue"
                        : "⏳ In Progress"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Requires 80% att + 100% course</p>
                  </div>
                </div>

                {/* Dossier Tabs */}
                <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-bold">
                  <button
                    onClick={() => setDossierTab("attendance")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      dossierTab === "attendance"
                        ? "bg-teal-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Attendance Records ({dossierData.attendance.records.length})
                  </button>

                  <button
                    onClick={() => setDossierTab("curriculum")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      dossierTab === "curriculum"
                        ? "bg-teal-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Curriculum Lessons ({dossierData.progress.completedLessonsCount}/{dossierData.progress.totalLessons})
                  </button>

                  <button
                    onClick={() => setDossierTab("capstones")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      dossierTab === "capstones"
                        ? "bg-teal-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Capstones & Projects ({dossierData.capstones.length})
                  </button>
                </div>

                {/* Dossier Tab 1: Attendance History & Mark Single Date */}
                {dossierTab === "attendance" && (
                  <div className="space-y-4">
                    {/* Mark / Edit specific date for this student */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Record / Update Date:</span>
                        <input
                          type="date"
                          value={dossierMarkDate}
                          onChange={(e) => setDossierMarkDate(e.target.value)}
                          className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            await handleToggleAttendance(dossierStudent.enrollmentId, true, dossierMarkDate);
                            // Refresh dossier data
                            const updated = await getStudentProgressDossier(
                              dossierStudent.profileId,
                              dossierStudent.enrollmentId
                            );
                            setDossierData(updated);
                          }}
                          className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 font-bold hover:bg-emerald-700"
                        >
                          Mark Present
                        </button>
                        <button
                          onClick={async () => {
                            await handleToggleAttendance(dossierStudent.enrollmentId, false, dossierMarkDate);
                            const updated = await getStudentProgressDossier(
                              dossierStudent.profileId,
                              dossierStudent.enrollmentId
                            );
                            setDossierData(updated);
                          }}
                          className="rounded-lg bg-rose-600 text-white px-2.5 py-1 font-bold hover:bg-rose-700"
                        >
                          Mark Absent
                        </button>
                        <button
                          onClick={async () => {
                            await handleToggleAttendance(dossierStudent.enrollmentId, null, dossierMarkDate);
                            const updated = await getStudentProgressDossier(
                              dossierStudent.profileId,
                              dossierStudent.enrollmentId
                            );
                            setDossierData(updated);
                          }}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold text-muted-foreground hover:bg-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Attendance Logs Table */}
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-muted/60 border-b border-border font-bold uppercase text-muted-foreground sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5 text-right">Quick Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {dossierData.attendance.records.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center py-6 text-muted-foreground">
                                No attendance sessions recorded yet for this student.
                              </td>
                            </tr>
                          ) : (
                            dossierData.attendance.records.map((rec: AttendanceRow) => (
                              <tr key={rec.id} className="hover:bg-muted/10">
                                <td className="px-4 py-2.5 font-semibold text-foreground">
                                  {formatDateString(rec.session_date)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                                      rec.present
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                    }`}
                                  >
                                    {rec.present ? <Check className="size-3" /> : <X className="size-3" />}
                                    {rec.present ? "Present" : "Absent"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={async () => {
                                      await handleToggleAttendance(
                                        dossierStudent.enrollmentId,
                                        !rec.present,
                                        rec.session_date
                                      );
                                      const updated = await getStudentProgressDossier(
                                        dossierStudent.profileId,
                                        dossierStudent.enrollmentId
                                      );
                                      setDossierData(updated);
                                    }}
                                    className="text-teal-600 hover:underline font-semibold"
                                  >
                                    Toggle to {rec.present ? "Absent" : "Present"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Dossier Tab 2: Curriculum & Lessons Checklist */}
                {dossierTab === "curriculum" && (
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {dossierData.progress.modules.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No modules created for this course.
                      </p>
                    ) : (
                      dossierData.progress.modules.map((mod: any, idx: number) => {
                        const modLessons = mod.lessons || [];
                        const modCompleted = modLessons.filter(
                          (l: any) => dossierData.progress.completedMap[l.id]
                        ).length;

                        return (
                          <div
                            key={mod.id}
                            className="rounded-xl border border-border bg-card p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-foreground">
                                Module {idx + 1}: {mod.title}
                              </h4>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {modCompleted} / {modLessons.length} completed
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {modLessons.map((les: any) => {
                                const isDone = !!dossierData.progress.completedMap[les.id];
                                const completedAt = dossierData.progress.completedMap[les.id];

                                return (
                                  <div
                                    key={les.id}
                                    className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-1.5 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isDone ? (
                                        <CheckCircle2 className="size-4 text-teal-600 shrink-0" />
                                      ) : (
                                        <div className="size-4 rounded-full border border-muted-foreground/40 shrink-0" />
                                      )}
                                      <span className={isDone ? "font-semibold text-foreground" : "text-muted-foreground"}>
                                        {les.title}
                                      </span>
                                    </div>
                                    {completedAt && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Completed {formatDateString(completedAt)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Dossier Tab 3: Capstones */}
                {dossierTab === "capstones" && (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {dossierData.capstones.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No capstone projects submitted by this student.
                      </p>
                    ) : (
                      dossierData.capstones.map((cap: any) => (
                        <div
                          key={cap.id}
                          className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-foreground text-sm">
                              {cap.title || "Untitled Project"}
                            </h4>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                cap.status === "reviewed"
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-700 border border-blue-500/20"
                              }`}
                            >
                              {cap.status}
                            </span>
                          </div>

                          {cap.description && (
                            <p className="text-muted-foreground">{cap.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
                            {cap.repo_url && (
                              <a
                                href={cap.repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-teal-600 hover:underline"
                              >
                                <ExternalLink className="size-3" /> GitHub Repo
                              </a>
                            )}
                            {cap.deploy_url && (
                              <a
                                href={cap.deploy_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-teal-600 hover:underline"
                              >
                                <ExternalLink className="size-3" /> Live Demo
                              </a>
                            )}
                            {cap.score !== null && (
                              <span className="font-bold text-foreground ml-auto">
                                Score: {cap.score}/100
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
