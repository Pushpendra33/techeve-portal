"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  FlaskConical,
  Award,
  Megaphone,
  User,
} from "lucide-react";

export function DashboardSidebarLinks() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/course", label: "My Course", icon: BookOpen },
    { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/dashboard/capstone", label: "Capstone", icon: FlaskConical },
    { href: "/dashboard/certificate", label: "Certificate", icon: Award },
    { href: "/dashboard/announcements", label: "Events & Opportunities", icon: Megaphone },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
  ];

  return (
    <nav className="flex-1 space-y-1 px-3">
      {navItems.map((item) => {
        // Highlight logic
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
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
