// The set of grantable permissions for role = admin/instructor. super_admin
// implicitly has all of these — this list is only what a super_admin can
// individually toggle on/off for a staff member.
export const PERMISSION_KEYS = [
  "manage_courses",
  "manage_students",
  "manage_capstones",
  "manage_announcements",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_courses: "Manage courses, modules & lessons",
  manage_students: "Manage students & invite new students",
  manage_capstones: "Review capstone projects",
  manage_announcements: "Post events & opportunities",
};
