"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  Award,
  CheckCircle,
  Clock,
  FlaskConical,
  AlertTriangle,
  Code
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { Database } from "@/lib/supabase/types";

type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"] & {
  courses: Database["public"]["Tables"]["courses"]["Row"] | null;
};
type CapstoneRow = Database["public"]["Tables"]["capstones"]["Row"];
type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];

export function StudentDashboardClient({
  profile,
  enrollment,
  percentComplete,
  completedLessons,
  totalLessons,
  attendancePercentage,
  capstones,
  announcements,
  chartData
}: {
  profile: any;
  enrollment: EnrollmentRow | null;
  percentComplete: number;
  completedLessons: number;
  totalLessons: number;
  attendancePercentage: number;
  capstones: CapstoneRow[];
  announcements: AnnouncementRow[];
  chartData: { name: string; completed: number }[];
}) {
  const isAttendanceWarning = attendancePercentage < 80;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is your learning summary and upcoming batch events.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Course Completion */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Syllabus Progress</span>
            <h3 className="text-2xl font-bold text-foreground">{percentComplete}%</h3>
            <p className="text-xs text-muted-foreground">
              {completedLessons} of {totalLessons} completed
            </p>
          </div>
          <div className="relative size-14">
            {/* SVG Progress Circle */}
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
                className="stroke-teal-600 fill-none transition-all duration-500"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - percentComplete / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-800">
              {percentComplete}%
            </div>
          </div>
        </div>

        {/* Attendance */}
        <Link
          href="/dashboard/attendance"
          className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-2xs hover:border-teal-500/40 hover:shadow-xs transition-all group cursor-pointer"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Attendance</span>
              <span className="text-[10px] font-semibold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                View Calendar →
              </span>
            </div>
            <h3 className={`text-2xl font-bold ${isAttendanceWarning ? "text-amber-600" : "text-foreground"}`}>
              {attendancePercentage}%
            </h3>
            <p className="text-xs text-muted-foreground">Threshold: 80% for certs</p>
          </div>
          <div>
            {isAttendanceWarning ? (
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-full border border-amber-200 group-hover:scale-105 transition-transform" title="Below certification threshold!">
                <AlertTriangle className="size-6 animate-pulse" />
              </div>
            ) : (
              <div className="bg-teal-50 text-teal-600 p-2.5 rounded-full border border-teal-200 group-hover:scale-105 transition-transform">
                <CheckCircle className="size-6" />
              </div>
            )}
          </div>
        </Link>

        {/* Capstone Projects */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Capstone Projects</span>
            <h3 className="text-2xl font-bold text-foreground">{capstones.length}</h3>
            <p className="text-xs text-muted-foreground">
              {capstones.filter(c => c.status === "reviewed").length} completed / reviewed
            </p>
          </div>
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-full border border-blue-200">
            <FlaskConical className="size-6" />
          </div>
        </div>

        {/* Certifications status */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Certification</span>
            <h3 className="text-2xl font-bold text-foreground">
              {percentComplete >= 100 && !isAttendanceWarning ? "Eligible" : "Pending"}
            </h3>
            <p className="text-xs text-muted-foreground">Requires 100% course + 80% att</p>
          </div>
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-full border border-purple-200">
            <Award className="size-6" />
          </div>
        </div>
      </div>

      {/* Warning block if below threshold */}
      {isAttendanceWarning && enrollment && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <strong>Certification Alert:</strong> Your current attendance is at <strong>{attendancePercentage}%</strong>, which is below the 80% threshold required for certification. Please attend upcoming sessions to regain eligibility.
            </div>
          </div>
          <Link
            href="/dashboard/attendance"
            className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            Check Schedule
          </Link>
        </div>
      )}

      {/* Main Section: Chart & Capstones */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recharts chart */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Learning Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Lessons completed per week</p>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Lessons Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capstone Projects Strip */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">My Capstones</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Project status overview</p>
            </div>
            <Link
              href="/dashboard/capstone"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-0.5"
            >
              Manage
            </Link>
          </div>

          {capstones.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
              <FlaskConical className="size-8 mx-auto opacity-30" />
              <p>No projects submitted yet.</p>
              <Link href="/dashboard/capstone" className="text-teal-600 hover:underline">Start a Capstone Project</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {capstones.slice(0, 3).map((c) => (
                <div key={c.id} className="p-3 border border-border rounded-xl bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground line-clamp-1">{c.title || "Untitled Project"}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        c.status === "reviewed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : c.status === "submitted"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                  {c.tech_stack && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Code className="size-3" /> {c.tech_stack}
                    </span>
                  )}
                  {c.score !== null && (
                    <div className="text-xs text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded w-fit font-semibold">
                      Score: {c.score}/100
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Course curriculum & Events Strip */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Curriculm link card */}
        {enrollment && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs md:col-span-1 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-widest block">Active Enrollment</span>
              <h3 className="text-lg font-bold text-foreground line-clamp-2">{enrollment.courses?.title}</h3>
              <p className="text-xs text-muted-foreground capitalize">
                Track: {enrollment.track_type === "extended" ? "Extended (4 Months)" : "Short (45 Days)"}
              </p>
            </div>
            <Link
              href="/dashboard/course"
              className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
            >
              Resume Course
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Events Strip */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs md:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upcoming Academy Events</h3>
            <Link
              href="/dashboard/announcements"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              View All
            </Link>
          </div>

          {announcements.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No events scheduled.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="flex gap-3 items-start border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="bg-teal-50 text-teal-700 border border-teal-100 rounded-lg p-2 flex flex-col items-center justify-center size-12 shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-widest">
                      {a.event_date ? new Date(a.event_date).toLocaleString("en-US", { month: "short" }) : "EVT"}
                    </span>
                    <span className="text-sm font-bold">
                      {a.event_date ? new Date(a.event_date).getDate() : ""}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-teal-600 bg-teal-50 px-1 rounded">
                        {a.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground truncate">{a.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{a.body}</p>
                  </div>
                  {a.link && (
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-foreground hover:text-teal-600 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
