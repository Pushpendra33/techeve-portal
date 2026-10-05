import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FlaskConical,
  Award,
  Megaphone,
  LogOut,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { getProfile } from "@/lib/queries";
import { logout } from "@/lib/supabase/auth-actions";

import { DashboardSidebarLinks } from "@/components/dashboard/DashboardSidebarLinks";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile();
  const isStaff = profile && ["super_admin", "admin", "instructor"].includes(profile.role);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed / Sticky Left Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col sticky top-0 h-screen z-30 select-none">
        {/* Sidebar Header & Logo */}
        <div className="shrink-0 px-6 pt-6 pb-2">
          <Link href="/dashboard" className="flex items-center">
            <Image src="/techevelogo.png" alt="TechEve" width={130} height={30} className="h-7 w-auto object-contain" style={{ width: "auto" }} priority />
          </Link>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Student Academy
          </p>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto py-2">
          <DashboardSidebarLinks />
        </div>

        {/* Sidebar Footer Area (Portal Switch & User Profile) */}
        <div className="shrink-0 border-t border-border bg-card/50 p-4 space-y-3">
          {isStaff && (
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-xl bg-teal-500/10 border border-teal-500/20 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-teal-600" />
                Admin Portal
              </span>
              <ArrowRight className="size-3.5" />
            </Link>
          )}

          <div>
            <p className="truncate text-sm font-medium text-foreground">{profile?.full_name || "Student"}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">Role: {profile?.role?.replace("_", " ") ?? "student"}</p>
            <form action={logout} className="mt-2.5">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <Image src="/techevelogo.png" alt="TechEve" width={110} height={26} className="h-6 w-auto object-contain" style={{ width: "auto" }} />
          <div className="flex items-center gap-3">
            {isStaff && (
              <Link
                href="/admin"
                className="rounded-lg bg-teal-500/10 px-2 py-1 text-xs font-bold text-teal-700"
              >
                Admin
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className="text-xs text-muted-foreground">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
