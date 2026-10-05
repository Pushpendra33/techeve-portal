"use client";

import React, { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { setPassword, type AuthState } from "@/lib/supabase/auth-actions";
import { createClient } from "@/lib/supabase/client";
import { Github, Linkedin, Twitter, Globe, Phone, Award, School } from "lucide-react";

const initialState: AuthState = { error: null };

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState(setPassword, initialState);
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setRole(data.role);
            setLoadingRole(false);
          });
      } else {
        setLoadingRole(false);
      }
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-16 text-slate-100">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-xl">
        <div className="flex justify-center">
          <Image
            src="/techevelogo.png"
            alt="TechEve"
            width={140}
            height={32}
            priority
            className="h-8 w-auto object-contain brightness-0 invert"
            style={{ width: "auto" }}
          />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight">Complete Your Profile</h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Set up your credentials and details to activate your account.
        </p>

        <form action={formAction} className="mt-8 space-y-6">
          {/* Account Details Group */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
              1. Personal Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <input
                  name="fullName"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Phone / Mobile</label>
                <input
                  name="phone"
                  placeholder="e.g. +91 9999999999"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Student Fields Group (only if role is student) */}
          {!loadingRole && role === "student" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
                2. Academic Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">College Name</label>
                  <input
                    name="college"
                    required
                    placeholder="e.g. Delhi Technological University"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Year of Study</label>
                  <select
                    name="yearOfStudy"
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 font-semibold"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduate">Graduate</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Social Links Group */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
              {role === "student" ? "3. Professional Links" : "2. Professional Links"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Github className="size-4 text-slate-400" /> GitHub URL
                </label>
                <input
                  name="githubUrl"
                  type="url"
                  placeholder="https://github.com/username"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Linkedin className="size-4 text-slate-400" /> LinkedIn URL
                </label>
                <input
                  name="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Twitter className="size-4 text-slate-400" /> Twitter URL (Optional)
                </label>
                <input
                  name="twitterUrl"
                  type="url"
                  placeholder="https://twitter.com/username"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="size-4 text-slate-400" /> Personal Portfolio URL (Optional)
                </label>
                <input
                  name="portfolioUrl"
                  type="url"
                  placeholder="https://myportfolio.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Password Group */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
              {role === "student" ? "4. Account Credentials" : "3. Account Credentials"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Type it again"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {state.error ? (
            <p className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-400">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition-all hover:bg-teal-700 active:scale-99 disabled:opacity-60"
          >
            {pending ? "Saving details…" : "Activate Account & Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
