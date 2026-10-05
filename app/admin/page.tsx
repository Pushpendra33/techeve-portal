import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, hasPermission } from "@/lib/queries";
import {
  Users,
  BookOpen,
  CalendarCheck,
  FlaskConical,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

export const revalidate = 0;

export default async function AdminHome() {
  const staff = await requireStaff();
  const supabase = await createClient();

  const canManageCourses = hasPermission(staff, "manage_courses");
  const canManageStudents = hasPermission(staff, "manage_students");
  const canManageCapstones = hasPermission(staff, "manage_capstones");
  const canManageAnnouncements = hasPermission(staff, "manage_announcements");
  const isSuperAdmin = staff.role === "super_admin";

  const [
    { count: students },
    { count: courses },
    { count: pendingCapstones },
    { count: announcements },
    { data: attendanceRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase
      .from("capstones")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase.from("announcements").select("*", { count: "exact", head: true }),
    supabase.from("attendance").select("present"),
  ]);

  // Compute overall attendance rate
  let avgAttendanceRate = 100;
  if (attendanceRows && attendanceRows.length > 0) {
    const presentCount = attendanceRows.filter((a) => a.present).length;
    avgAttendanceRate = Math.round(
      (presentCount / attendanceRows.length) * 100,
    );
  }

  const allStats = [
    {
      label: "Enrolled Students",
      value: students ?? 0,
      icon: Users,
      href: "/admin/students",
      color: "text-teal-600 bg-teal-500/10 border-teal-500/20",
      show: canManageStudents,
    },
    {
      label: "Active Courses",
      value: courses ?? 0,
      icon: BookOpen,
      href: "/admin/courses",
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
      show: canManageCourses,
    },
    {
      label: "Avg Attendance Rate",
      value: `${avgAttendanceRate}%`,
      icon: CalendarCheck,
      href: "/admin/attendance",
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      show: canManageStudents,
    },
    {
      label: "Capstones to Review",
      value: pendingCapstones ?? 0,
      icon: FlaskConical,
      href: "/admin/capstones",
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
      show: canManageCapstones,
    },
    {
      label: "Academy Announcements",
      value: announcements ?? 0,
      icon: Megaphone,
      href: "/admin/announcements",
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      show: canManageAnnouncements,
    },
  ];

  const visibleStats = allStats.filter((s) => s.show);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Staff Overview
            </h1>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isSuperAdmin
                  ? "bg-purple-500/10 border border-purple-500/20 text-purple-700"
                  : staff.role === "admin"
                    ? "bg-teal-500/10 border border-teal-500/20 text-teal-700"
                    : "bg-blue-500/10 border border-blue-500/20 text-blue-700"
              }`}
            >
              {staff.role.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Welcome back, {staff.full_name || "Staff Member"}. Here is your
            operational control center.
          </p>
        </div>

        {canManageStudents && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
            >
              <CalendarCheck className="size-4" />
              Mark Batch Attendance
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div
        className={`grid gap-6 sm:grid-cols-2 ${visibleStats.length >= 4 ? "lg:grid-cols-4" : `lg:grid-cols-${Math.max(visibleStats.length, 2)}`}`}
      >
        {visibleStats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-teal-500/40 hover:shadow-xs transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {s.label}
              </span>
              <p className="text-3xl font-extrabold text-foreground">
                {s.value}
              </p>
              <span className="text-[10px] text-teal-600 font-semibold inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                Manage →
              </span>
            </div>
            <div className={`rounded-2xl border p-3.5 ${s.color}`}>
              <s.icon className="size-6" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Access Panels based on permissions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance & Progress Hub Card */}
        {canManageStudents && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wider">
                <CalendarCheck className="size-4" />
                Attendance & Progress Engine
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Daily Batch Attendance & Student Matrix
              </h3>
              <p className="text-xs text-muted-foreground">
                Log daily session attendance date-by-date, view monthly student
                heatmaps, check certification criteria (80% minimum), and drill
                down into individual student curriculum completion dossiers.
              </p>
            </div>
            <Link
              href="/admin/attendance"
              className="inline-flex items-center justify-between rounded-xl bg-teal-500/10 border border-teal-500/20 px-4 py-3 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-all group"
            >
              <span>Open Attendance Hub</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Student Registry Hub Card */}
        {canManageStudents && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                <Users className="size-4" />
                Student Registry & Invitations
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Student Directory & Course Assignments
              </h3>
              <p className="text-xs text-muted-foreground">
                Invite new students, track enrollment status (Short 45-day track
                vs Extended 4-month track), update contact info, college, and
                notes.
              </p>
            </div>
            <Link
              href="/admin/students"
              className="inline-flex items-center justify-between rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-all group"
            >
              <span>Manage Student Registry</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Courses & Curriculum Hub Card */}
        {canManageCourses && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="size-4" />
                Course & Curriculum Manager
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Manage Courses, Modules & Lessons
              </h3>
              <p className="text-xs text-muted-foreground">
                Create new course tracks, structure curriculum modules, upload
                lessons, attach learning resources, and organize content.
              </p>
            </div>
            <Link
              href="/admin/courses"
              className="inline-flex items-center justify-between rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-all group"
            >
              <span>Manage Courses</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Capstone Projects Hub Card */}
        {canManageCapstones && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
                <FlaskConical className="size-4" />
                Capstone Review Hub
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Review Student Capstone Projects
              </h3>
              <p className="text-xs text-muted-foreground">
                Evaluate student submissions, inspect GitHub code repositories,
                test deployed projects, and assign grades & feedback.
              </p>
            </div>
            <Link
              href="/admin/capstones"
              className="inline-flex items-center justify-between rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all group"
            >
              <span>Review Capstones</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Staff & Permissions Hub Card for Super Admin */}
        {isSuperAdmin && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="size-4" />
                Staff Access & Permissions
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Team Roles & Delegation
              </h3>
              <p className="text-xs text-muted-foreground">
                Invite team instructors and administrators, customize granular
                module permissions, enable or disable portal accounts.
              </p>
            </div>
            <Link
              href="/admin/staff"
              className="inline-flex items-center justify-between rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all group"
            >
              <span>Manage Staff Team</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
