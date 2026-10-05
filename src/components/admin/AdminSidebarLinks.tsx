"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarCheck,
  FlaskConical,
  Megaphone,
  ShieldCheck,
  User,
} from "lucide-react";

interface AdminSidebarLinksProps {
  canManageCourses: boolean;
  canManageStudents: boolean;
  canManageCapstones: boolean;
  canManageAnnouncements: boolean;
  isSuperAdmin: boolean;
}

export function AdminSidebarLinks({
  canManageCourses,
  canManageStudents,
  canManageCapstones,
  canManageAnnouncements,
  isSuperAdmin
}: AdminSidebarLinksProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, show: true },
    { href: "/admin/courses", label: "Courses", icon: BookOpen, show: canManageCourses },
    { href: "/admin/students", label: "Students", icon: Users, show: canManageStudents },
    { href: "/admin/attendance", label: "Attendance & Progress", icon: CalendarCheck, show: canManageStudents },
    { href: "/admin/capstones", label: "Capstones", icon: FlaskConical, show: canManageCapstones },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone, show: canManageAnnouncements },
    { href: "/admin/staff", label: "Staff & Permissions", icon: ShieldCheck, show: isSuperAdmin },
    { href: "/admin/profile", label: "My Profile", icon: User, show: true },
  ].filter((i) => i.show);

  return (
    <nav className="mt-3 flex-1 space-y-1 px-3">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all border ${
              isActive
                ? "bg-teal-50/70 border-teal-100/60 text-teal-600 font-semibold"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className={`size-4 ${isActive ? "text-teal-600" : "text-muted-foreground"}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
