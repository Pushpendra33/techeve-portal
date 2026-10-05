-- ============================================================================
-- TechEve Portal — Database Schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query
-- ============================================================================

-- ---------- ENUMS ----------
create type user_role as enum ('super_admin', 'admin', 'instructor', 'student');
create type account_status as enum ('active', 'disabled');
create type invite_status as enum ('pending', 'accepted', 'revoked');
create type course_track as enum ('mern', 'data_science');
create type enrollment_track_type as enum ('short', 'extended');
create type enrollment_status as enum ('active', 'completed', 'dropped');
create type submission_status as enum ('submitted', 'reviewed');
create type capstone_status as enum ('not_started', 'in_progress', 'submitted', 'reviewed');
create type announcement_type as enum ('workshop', 'opportunity', 'general');

-- ---------- PROFILES ----------
-- One row per auth.users row, created automatically by the trigger below.
-- `permissions` only matters for role = admin/instructor. super_admin
-- implicitly has every permission; student ignores this column entirely.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'student',
  status account_status not null default 'active',
  permissions jsonb not null default '{}'::jsonb,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- COURSES / MODULES / LESSONS ----------
-- (Declared before `invites` since invites.course_id references courses.)
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  track course_track not null,
  created_at timestamptz not null default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  resource_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- INVITES ----------
-- Created by staff BEFORE the invited person has an account. The signup
-- trigger below looks up a pending invite by email to decide what role,
-- permissions, and (for students) course/track to assign on account creation.
create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role user_role not null,
  permissions jsonb not null default '{}'::jsonb, -- used when role = admin/instructor
  course_id uuid references courses(id),
  track_type enrollment_track_type,
  invited_by uuid references profiles(id),
  status invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- ---------- ENROLLMENTS / PROGRESS ----------
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  track_type enrollment_track_type not null,
  status enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (student_id, lesson_id)
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  session_date date not null,
  present boolean not null default false,
  unique (enrollment_id, session_date)
);

-- ---------- ASSIGNMENTS / SUBMISSIONS ----------
create table assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  max_score int not null default 100,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  content_url text,
  content_text text,
  submitted_at timestamptz not null default now(),
  score int,
  feedback text,
  status submission_status not null default 'submitted',
  unique (assignment_id, student_id)
);

-- ---------- QUIZZES ----------
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  order_index int not null default 0
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  score int not null default 0,
  answers jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default now()
);

-- ---------- CAPSTONES ----------
create table capstones (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade unique,
  title text,
  description text,
  repo_url text,
  deploy_url text,
  status capstone_status not null default 'not_started',
  feedback text,
  score int,
  updated_at timestamptz not null default now()
);

-- ---------- CERTIFICATES ----------
create table certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade unique,
  issued boolean not null default false,
  issued_at timestamptz,
  credential_url text
);

-- ---------- ANNOUNCEMENTS ----------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  type announcement_type not null default 'general',
  title text not null,
  body text,
  event_date timestamptz,
  link text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Signup trigger — consumes a matching pending invite to assign role,
-- permissions, and (for students) an enrollment. If no invite matches, the
-- account defaults to role='student' with no course — this should only ever
-- happen for the very first super_admin, which you create manually (see the
-- setup guide).
-- ============================================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  matched_invite invites%rowtype;
begin
  select * into matched_invite
  from invites
  where email = new.email and status = 'pending'
  order by created_at desc
  limit 1;

  if found then
    insert into public.profiles (id, full_name, role, permissions)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      matched_invite.role,
      matched_invite.permissions
    );

    if matched_invite.role = 'student' and matched_invite.course_id is not null then
      insert into public.enrollments (student_id, course_id, track_type)
      values (new.id, matched_invite.course_id, coalesce(matched_invite.track_type, 'short'));
    end if;

    update invites set status = 'accepted', accepted_at = now() where id = matched_invite.id;
  else
    insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Guard against privilege escalation: the "users can update their own
-- profile" RLS policy below only restricts which ROW can be touched, not
-- which COLUMNS. Without this, a student could call `.update({ role:
-- 'super_admin' })` on their own row and it would pass RLS. This trigger
-- silently reverts role/status/permissions changes unless the actor is
-- already a super_admin (who has a separate, explicit write policy anyway).
-- ============================================================================
create function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only enforce this against a real end-user API session (auth.uid() is set
  -- when the request comes through PostgREST with a user's JWT). SQL Editor,
  -- Table Editor, and anything using the service role key run with no JWT at
  -- all — auth.uid() is null there — and are already trusted/admin contexts,
  -- so they're allowed through. Without this check, you'd never be able to
  -- manually bootstrap your first super_admin (see setup guide, step 7):
  -- the trigger would silently revert the role change right back.
  if auth.uid() is not null and not public.is_super_admin() then
    new.role := old.role;
    new.status := old.status;
    new.permissions := old.permissions;
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileges_trigger
  before update on profiles
  for each row execute procedure public.protect_profile_privileges();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table invites enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table enrollments enable row level security;
alter table lesson_progress enable row level security;
alter table attendance enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;
alter table capstones enable row level security;
alter table certificates enable row level security;
alter table announcements enable row level security;

-- Helpers
create function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$;

create function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin', 'admin', 'instructor')
  );
$$;

-- Permission check e.g. select has_permission('manage_courses')
create function public.has_permission(perm text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (role = 'super_admin' or (permissions->>perm)::boolean is true)
  );
$$;

-- profiles
create policy "profiles_select" on profiles for select using (auth.uid() = id or is_staff());
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_super_admin_write" on profiles for update using (is_super_admin());

-- invites — only super_admin manages staff invites; staff with manage_students
-- can create student invites; everyone on staff can view invites.
create policy "invites_select" on invites for select using (is_staff());
create policy "invites_super_admin_write_staff" on invites for insert
  with check (role in ('admin','instructor','super_admin') and is_super_admin());
create policy "invites_staff_write_student" on invites for insert
  with check (role = 'student' and has_permission('manage_students'));
create policy "invites_update" on invites for update using (is_staff());

-- courses/modules/lessons
create policy "courses_read_all" on courses for select using (auth.role() = 'authenticated');
create policy "courses_write" on courses for all using (has_permission('manage_courses')) with check (has_permission('manage_courses'));

create policy "modules_read_all" on modules for select using (auth.role() = 'authenticated');
create policy "modules_write" on modules for all using (has_permission('manage_courses')) with check (has_permission('manage_courses'));

create policy "lessons_read_all" on lessons for select using (auth.role() = 'authenticated');
create policy "lessons_write" on lessons for all using (has_permission('manage_courses')) with check (has_permission('manage_courses'));

-- enrollments
create policy "enrollments_select" on enrollments for select using (student_id = auth.uid() or is_staff());
create policy "enrollments_write" on enrollments for all using (has_permission('manage_students')) with check (has_permission('manage_students'));

-- lesson_progress
create policy "progress_select" on lesson_progress for select using (student_id = auth.uid() or is_staff());
create policy "progress_student_write" on lesson_progress for all
  using (student_id = auth.uid() or is_staff())
  with check (student_id = auth.uid() or is_staff());

-- attendance
create policy "attendance_select" on attendance for select using (
  is_staff() or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
);
create policy "attendance_write" on attendance for all using (has_permission('manage_students')) with check (has_permission('manage_students'));

-- assignments
create policy "assignments_read_all" on assignments for select using (auth.role() = 'authenticated');
create policy "assignments_write" on assignments for all using (has_permission('manage_courses')) with check (has_permission('manage_courses'));

-- submissions
create policy "submissions_select" on submissions for select using (student_id = auth.uid() or is_staff());
create policy "submissions_student_insert" on submissions for insert with check (student_id = auth.uid());
create policy "submissions_update" on submissions for update using (
  student_id = auth.uid() or has_permission('manage_submissions')
);

-- quizzes/questions
create policy "quizzes_read_all" on quizzes for select using (auth.role() = 'authenticated');
create policy "quizzes_write" on quizzes for all using (has_permission('manage_courses')) with check (has_permission('manage_courses'));
create policy "quiz_questions_read_all" on quiz_questions for select using (auth.role() = 'authenticated');
create policy "quiz_questions_write" on quiz_questions for all using (has_permission('manage_courses')) with check (has_permission('manage_courses'));

-- quiz_attempts
create policy "quiz_attempts_select" on quiz_attempts for select using (student_id = auth.uid() or is_staff());
create policy "quiz_attempts_student_insert" on quiz_attempts for insert with check (student_id = auth.uid());

-- capstones
create policy "capstones_select" on capstones for select using (
  is_staff() or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
);
create policy "capstones_student_write" on capstones for all
  using (has_permission('manage_capstones') or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid()))
  with check (has_permission('manage_capstones') or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid()));

-- certificates
create policy "certificates_select" on certificates for select using (
  is_staff() or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
);
create policy "certificates_write" on certificates for all using (has_permission('manage_students')) with check (has_permission('manage_students'));

-- announcements
create policy "announcements_read_all" on announcements for select using (auth.role() = 'authenticated');
create policy "announcements_write" on announcements for all using (has_permission('manage_announcements')) with check (has_permission('manage_announcements'));
