"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateProfileSettings, updateProfilePassword } from "@/lib/profile-actions";
import { User, Phone, Mail, Shield, Lock, Key, Github, Linkedin, Twitter, Globe, School, GraduationCap } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function StudentProfileClient({ profile }: { profile: ProfileRow }) {
  const [settingsPending, startSettingsTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSettingsTransition(async () => {
      try {
        await updateProfileSettings(formData);
        toast.success("Profile settings updated successfully!");
      } catch (err: any) {
        toast.error("Failed to update profile: " + err.message);
      }
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startPasswordTransition(async () => {
      try {
        await updateProfilePassword(formData);
        toast.success("Password changed successfully!");
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        toast.error("Failed to change password: " + err.message);
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100/60 shadow-2xs">
          <User className="size-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your student details, academic fields, and social portfolio.</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Settings (Left / Center) */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdateSettings} className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-muted/20">
              <h2 className="text-base font-bold text-foreground">Profile Information</h2>
              <p className="text-xs text-muted-foreground">Update your details to be displayed on capstone submissions.</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Avatar Photo and Email Info */}
              <div className="flex items-center gap-4 border-b border-border/60 pb-5">
                <div className="size-16 rounded-2xl bg-teal-100/60 text-teal-700 flex items-center justify-center font-extrabold text-xl border border-teal-200 shadow-2xs overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                  ) : (
                    profile.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">{profile.full_name}</span>
                    <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-100 uppercase tracking-widest">
                      Student
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                </div>
              </div>

              {/* Grid fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <input
                    name="fullName"
                    required
                    defaultValue={profile.full_name || ""}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Mobile Phone</label>
                  <input
                    name="phone"
                    placeholder="e.g. +91 9999999999"
                    defaultValue={profile.phone || ""}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Avatar Image URL (Optional)</label>
                  <input
                    name="avatarUrl"
                    placeholder="https://..."
                    defaultValue={profile.avatar_url || ""}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Academic details */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-teal-600 flex items-center gap-1">
                  <School className="size-4" /> Academic Background
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">College Name</label>
                    <input
                      name="college"
                      placeholder="e.g. Delhi Technological University"
                      defaultValue={profile.college || ""}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Year of Study</label>
                    <select
                      name="yearOfStudy"
                      defaultValue={profile.year_of_study || "1st Year"}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none font-semibold"
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

              {/* Social URLs */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-teal-600 flex items-center gap-1">
                  <GraduationCap className="size-4" /> Portfolios & Social Links
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Github className="size-3.5" /> GitHub Profile URL
                    </label>
                    <input
                      name="githubUrl"
                      type="url"
                      placeholder="https://github.com/..."
                      defaultValue={profile.github_url || ""}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Linkedin className="size-3.5" /> LinkedIn Profile URL
                    </label>
                    <input
                      name="linkedinUrl"
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      defaultValue={profile.linkedin_url || ""}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Twitter className="size-3.5" /> Twitter URL (Optional)
                    </label>
                    <input
                      name="twitterUrl"
                      type="url"
                      placeholder="https://twitter.com/..."
                      defaultValue={profile.twitter_url || ""}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Globe className="size-3.5" /> Portfolio URL (Optional)
                    </label>
                    <input
                      name="portfolioUrl"
                      type="url"
                      placeholder="https://..."
                      defaultValue={profile.portfolio_url || ""}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border p-4 bg-muted/10 text-right">
              <button
                type="submit"
                disabled={settingsPending}
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition-all"
              >
                {settingsPending ? "Saving Profile..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password (Right) */}
        <div className="space-y-6">
          <form onSubmit={handleUpdatePassword} className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-muted/20">
              <h2 className="text-base font-bold text-foreground">Change Password</h2>
              <p className="text-xs text-muted-foreground">Keep your academy account secure.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Key className="size-3.5" /> New Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock className="size-3.5" /> Confirm Password
                </label>
                <input
                  name="confirm"
                  type="password"
                  required
                  placeholder="Type password again"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
            <div className="border-t border-border p-4 bg-muted/10 text-right">
              <button
                type="submit"
                disabled={passwordPending}
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition-all"
              >
                {passwordPending ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
