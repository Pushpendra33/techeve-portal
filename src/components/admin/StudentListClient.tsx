"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Settings,
  CheckCircle,
  XCircle,
  UserCheck,
  UserMinus,
  Mail,
  Phone,
  Bookmark,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { inviteStudent } from "@/lib/invite-actions";
import { formatDateString } from "@/lib/date-utils";
import { updateStudentProfile, updateStudentEnrollment, removeStudentFromCourse } from "@/lib/admin-student-actions";
import type { Database, UserRole, AccountStatus, EnrollmentStatus, EnrollmentTrackType } from "@/lib/supabase/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"];

type StudentWithEnrollment = {
  id: string; // enrollment id
  profileId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  college: string | null;
  yearOfStudy: string | null;
  notes: string | null;
  courseId: string;
  courseTitle: string;
  trackType: EnrollmentTrackType;
  status: EnrollmentStatus;
  enrolledAt: string;
  role: UserRole;
  profileStatus: AccountStatus;
  attendancePercentage?: number;
  attendancePresent?: number;
  attendanceTotal?: number;
  progressPercentage?: number;
  completedLessons?: number;
  totalLessons?: number;
};

export function StudentListClient({
  students,
  courses,
  currentUserRole
}: {
  students: StudentWithEnrollment[];
  courses: CourseRow[];
  currentUserRole: UserRole;
}) {
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterTrack, setFilterTrack] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [prevSearch, setPrevSearch] = useState("");
  const [prevCourse, setPrevCourse] = useState("");
  const [prevTrack, setPrevTrack] = useState("");
  const [prevStatus, setPrevStatus] = useState("");

  if (search !== prevSearch || filterCourse !== prevCourse || filterTrack !== prevTrack || filterStatus !== prevStatus) {
    setPrevSearch(search);
    setPrevCourse(filterCourse);
    setPrevTrack(filterTrack);
    setPrevStatus(filterStatus);
    setCurrentPage(1);
  }

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithEnrollment | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<StudentWithEnrollment | null>(null);
  const [invitingPending, setInvitingPending] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof StudentWithEnrollment>("fullName");
  const [sortAsc, setSortAsc] = useState(true);

  // Filter students
  const filtered = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.toLowerCase().includes(search.toLowerCase())) ||
      (s.college && s.college.toLowerCase().includes(search.toLowerCase()));

    const matchesCourse = filterCourse ? s.courseId === filterCourse : true;
    const matchesTrack = filterTrack ? s.trackType === filterTrack : true;
    const matchesStatus = filterStatus ? s.status === filterStatus : true;

    return matchesSearch && matchesCourse && matchesTrack && matchesStatus;
  });

  // Sort students
  const sorted = [...filtered].sort((a, b) => {
    const valA = (a[sortField] as any) ?? "";
    const valB = (b[sortField] as any) ?? "";
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof StudentWithEnrollment) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "College",
      "Year",
      "Course",
      "Track",
      "Enrollment Status",
      "Account Status",
      "Role",
      "Enrolled Date"
    ];

    const rows = sorted.map((s) => [
      s.fullName,
      s.email || "",
      s.phone || "",
      s.college || "",
      s.yearOfStudy || "",
      s.courseTitle,
      s.trackType === "short" ? "Short (45 days)" : "Extended (4 months)",
      s.status,
      s.profileStatus,
      s.role,
      formatDateString(s.enrolledAt)
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Export started!");
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvitingPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      const { inviteStudent } = await import("@/lib/invite-actions");
      const res = await inviteStudent({ error: null, message: null }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Student invited successfully!");
        setShowInviteModal(false);
      }
    } catch (err: any) {
      toast.error("Failed to send invite: " + err.message);
    } finally {
      setInvitingPending(false);
    }
  };

  const handleStudentProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;
    const formData = new FormData(e.currentTarget);
    try {
      await updateStudentProfile(editingStudent.profileId, formData);
      toast.success("Student profile updated successfully");
      setEditingStudent(null);
    } catch (err: any) {
      toast.error("Error updating profile: " + err.message);
    }
  };

  const handleStudentEnrollmentUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEnrollment) return;
    const formData = new FormData(e.currentTarget);
    try {
      await updateStudentEnrollment(editingEnrollment.id, formData);
      toast.success("Student enrollment updated successfully");
      setEditingEnrollment(null);
    } catch (err: any) {
      toast.error("Error updating enrollment: " + err.message);
    }
  };

  const handleRemoveStudent = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to remove "${name}" from this course? This deletes their enrollment record, but doesn't delete their auth profile.`
      )
    ) {
      try {
        await removeStudentFromCourse(id);
        toast.success(`${name} has been removed from course.`);
      } catch (err: any) {
        toast.error("Error removing student: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your student registry, monitor enrollment statuses, and invite new learners.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/attendance"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-2xs transition-all hover:bg-muted active:scale-95"
          >
            <CalendarCheck className="size-4 text-teal-600" />
            Attendance Hub
          </Link>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
          >
            <UserPlus className="size-4" />
            Invite Student
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
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
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-teal-500 outline-none"
          >
            <option value="">All Tracks</option>
            <option value="short">Short (45d)</option>
            <option value="extended">Extended (4m)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-teal-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border hover:bg-muted bg-card px-3 py-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase font-bold tracking-wider text-muted-foreground select-none">
              <tr>
                <th onClick={() => handleSort("fullName")} className="px-5 py-4 cursor-pointer hover:bg-muted">
                  Student {sortField === "fullName" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th className="px-5 py-4">College & Year</th>
                <th onClick={() => handleSort("courseTitle")} className="px-5 py-4 cursor-pointer hover:bg-muted">
                  Course {sortField === "courseTitle" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th className="px-5 py-4">Attendance</th>
                <th className="px-5 py-4">Syllabus Progress</th>
                <th onClick={() => handleSort("status")} className="px-5 py-4 cursor-pointer hover:bg-muted">
                  Status {sortField === "status" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    No students matching the current filters.
                  </td>
                </tr>
              ) : (
                (() => {
                  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
                  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                  return paginated.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/10">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{s.fullName}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="size-3" /> {s.email || "No email"}
                          </span>
                          {s.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="size-3" /> {s.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <div className="text-sm font-medium">{s.college || "Not Set"}</div>
                        <div className="text-xs text-muted-foreground">Year: {s.yearOfStudy || "N/A"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{s.courseTitle}</div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {s.trackType === "short" ? "Short (45d)" : "Extended (4m)"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                              (s.attendancePercentage ?? 100) < 80
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                            }`}
                          >
                            {s.attendancePercentage ?? 100}%
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({s.attendancePresent ?? 0}/{s.attendanceTotal ?? 0})
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-foreground">{s.progressPercentage ?? 0}%</span>
                            <span className="text-muted-foreground text-[10px]">
                              {s.completedLessons ?? 0}/{s.totalLessons ?? 0}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${s.progressPercentage ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                              s.status === "active"
                                ? "bg-teal-50 text-teal-700 border border-teal-100"
                                : s.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}
                          >
                            {s.status}
                          </span>
                          {s.profileStatus === "disabled" && (
                            <span className="w-fit rounded-full bg-red-50 text-red-700 border border-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              Blocked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href="/admin/attendance"
                            className="p-2 text-muted-foreground hover:text-teal-600 hover:bg-muted rounded-xl transition-all"
                            title="View Attendance & Progress Hub"
                          >
                            <CalendarCheck className="size-4" />
                          </Link>
                          <button
                            onClick={() => setEditingStudent(s)}
                            className="p-2 text-muted-foreground hover:text-teal-600 hover:bg-muted rounded-xl transition-all"
                            title="Edit student details"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => setEditingEnrollment(s)}
                            className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-xl transition-all"
                            title="Manage enrollment"
                          >
                            <Settings className="size-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveStudent(s.id, s.fullName)}
                            className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-muted rounded-xl transition-all"
                            title="Remove from course"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
        {Math.ceil(sorted.length / ITEMS_PER_PAGE) > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-4 flex-wrap gap-4">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sorted.length)}</span> to{" "}
              <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)}</span> of{" "}
              <span className="font-semibold">{sorted.length}</span> students
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.ceil(sorted.length / ITEMS_PER_PAGE) }).map((_, idx) => {
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
                disabled={currentPage === Math.ceil(sorted.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Student Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Invite Student</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Student Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="student@email.com"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Select Course</label>
                <select
                  name="courseId"
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  <option value="">Choose course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Internship Track</label>
                <select
                  name="trackType"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  <option value="short">Short Internship (45 days)</option>
                  <option value="extended">Extended Internship (4 months)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitingPending}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {invitingPending ? "Sending Invite…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Details Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Edit Student Details</h2>
              <button onClick={() => setEditingStudent(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleStudentProfileUpdate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <input
                  name="full_name"
                  required
                  defaultValue={editingStudent.fullName}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                <input
                  name="phone"
                  defaultValue={editingStudent.phone ?? ""}
                  placeholder="e.g. +91 9876543210"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">College Name</label>
                  <input
                    name="college"
                    defaultValue={editingStudent.college ?? ""}
                    placeholder="e.g. IIT Delhi"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Year of Study</label>
                  <input
                    name="year_of_study"
                    defaultValue={editingStudent.yearOfStudy ?? ""}
                    placeholder="e.g. 3rd Year"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Internal Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingStudent.notes ?? ""}
                  placeholder="Admin/instructor notes..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Super Admin only settings */}
              {currentUserRole === "super_admin" && (
                <div className="border-t border-border pt-4 mt-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-teal-600">Access Role</label>
                    <select
                      name="role"
                      defaultValue={editingStudent.role}
                      className="w-full rounded-xl border border-teal-200 bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-teal-600">Account Status</label>
                    <select
                      name="status"
                      defaultValue={editingStudent.profileStatus}
                      className="w-full rounded-xl border border-teal-200 bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    >
                      <option value="active">Active (Access allowed)</option>
                      <option value="disabled">Disabled (Revoke Access)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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

      {/* Edit Student Enrollment Status Modal */}
      {editingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Manage Enrollment</h2>
              <button onClick={() => setEditingEnrollment(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleStudentEnrollmentUpdate} className="p-6 space-y-4">
              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">Course</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{editingEnrollment.courseTitle}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Internship Track</label>
                <select
                  name="track_type"
                  defaultValue={editingEnrollment.trackType}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  <option value="short">Short Internship (45 days)</option>
                  <option value="extended">Extended Internship (4 months)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Enrollment Status</label>
                <select
                  name="status"
                  defaultValue={editingEnrollment.status}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  <option value="active">Active (In progress)</option>
                  <option value="completed">Completed (Issued certificate)</option>
                  <option value="dropped">Dropped out</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingEnrollment(null)}
                  className="rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
