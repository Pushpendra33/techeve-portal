-- ============================================================================
-- TechEve Portal — Migration 001
--
-- Run this ONCE in Supabase → SQL Editor → New query, on a database that
-- already has schema.sql applied.
--
-- This is written to be ADDITIVE and RE-RUNNABLE: it uses `if not exists` /
-- `if exists` everywhere, so running it twice is harmless and it will not
-- destroy anything you've already created. The only genuinely destructive
-- step (dropping the submissions tables) is left commented out at the very
-- bottom for you to opt into deliberately.
-- ============================================================================


-- ============================================================================
-- 1. STUDENT / STAFF PROFILE DETAILS
-- The students admin page needs real contact details to display. `email` is
-- mirrored from auth.users because RLS can't join across to the auth schema
-- from the client — we keep it in sync with a trigger below.
-- ============================================================================
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists college text;
alter table profiles add column if not exists year_of_study text;
alter table profiles add column if not exists notes text;
alter table profiles add column if not exists updated_at timestamptz not null default now();

-- Backfill emails for everyone who already has an account.
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is distinct from u.email;

-- Keep profiles.email in sync going forward.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_sync on auth.users;
create trigger on_auth_user_email_sync
  after insert or update of email on auth.users
  for each row execute procedure public.sync_profile_email();


-- ============================================================================
-- 2. CAPSTONES — support MULTIPLE projects per student
--
-- The original table had `enrollment_id ... unique`, which hard-limited each
-- student to exactly one capstone. That constraint is dropped here.
--
-- The single `feedback`/`score` columns are also replaced by a proper
-- capstone_reviews table so multiple admins/instructors can each leave their
-- own review. The old columns are LEFT IN PLACE (not dropped) so nothing
-- breaks mid-migration — see the optional cleanup at the bottom.
-- ============================================================================

-- Drop the one-capstone-per-enrollment limit.
alter table capstones drop constraint if exists capstones_enrollment_id_key;

alter table capstones add column if not exists jira_url text;
alter table capstones add column if not exists tech_stack text;
alter table capstones add column if not exists student_id uuid references profiles(id) on delete cascade;
alter table capstones add column if not exists created_at timestamptz not null default now();

-- Denormalise student_id onto capstones so student-owned queries and RLS
-- don't need to join through enrollments every time.
update capstones c
set student_id = e.student_id
from enrollments e
where c.enrollment_id = e.id and c.student_id is null;

create index if not exists capstones_student_id_idx on capstones(student_id);

-- Multiple reviews per capstone, one per reviewer.
create table if not exists capstone_reviews (
  id uuid primary key default gen_random_uuid(),
  capstone_id uuid not null references capstones(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  feedback text,
  score int check (score is null or (score >= 0 and score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (capstone_id, reviewer_id)
);

create index if not exists capstone_reviews_capstone_id_idx on capstone_reviews(capstone_id);

-- Migrate any existing single feedback/score into the new reviews table,
-- attributed to the capstone owner's inviter as a best guess (or left
-- unattributed if we can't determine a reviewer).
insert into capstone_reviews (capstone_id, reviewer_id, feedback, score)
select c.id, p.id, c.feedback, c.score
from capstones c
cross join lateral (
  select id from profiles where role = 'super_admin' order by created_at limit 1
) p
where (c.feedback is not null or c.score is not null)
  and not exists (select 1 from capstone_reviews r where r.capstone_id = c.id)
on conflict do nothing;

alter table capstone_reviews enable row level security;

drop policy if exists "capstone_reviews_select" on capstone_reviews;
create policy "capstone_reviews_select" on capstone_reviews for select using (
  is_staff()
  or exists (select 1 from capstones c where c.id = capstone_id and c.student_id = auth.uid())
);

drop policy if exists "capstone_reviews_staff_write" on capstone_reviews;
create policy "capstone_reviews_staff_write" on capstone_reviews for all
  using (has_permission('manage_capstones') and reviewer_id = auth.uid())
  with check (has_permission('manage_capstones') and reviewer_id = auth.uid());

-- Students own their capstones directly now (not via the enrollment join).
drop policy if exists "capstones_student_write" on capstones;
create policy "capstones_student_write" on capstones for all
  using (has_permission('manage_capstones') or student_id = auth.uid())
  with check (has_permission('manage_capstones') or student_id = auth.uid());

drop policy if exists "capstones_select" on capstones;
create policy "capstones_select" on capstones for select using (
  is_staff() or student_id = auth.uid()
);


-- ============================================================================
-- 3. ANNOUNCEMENTS / EVENTS — richer details, public visibility, RSVPs
-- ============================================================================
alter table announcements add column if not exists location text;
alter table announcements add column if not exists end_date timestamptz;
alter table announcements add column if not exists cover_image_url text;
alter table announcements add column if not exists is_published boolean not null default true;
-- is_public = show on the marketing site (techeve.in), not just the portal.
alter table announcements add column if not exists is_public boolean not null default false;
alter table announcements add column if not exists capacity int;
alter table announcements add column if not exists notified_at timestamptz;
alter table announcements add column if not exists updated_at timestamptz not null default now();

-- Students registering interest / RSVPing to an event.
create table if not exists announcement_interests (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);

create index if not exists announcement_interests_announcement_idx
  on announcement_interests(announcement_id);

alter table announcement_interests enable row level security;

drop policy if exists "announcement_interests_select" on announcement_interests;
create policy "announcement_interests_select" on announcement_interests for select
  using (student_id = auth.uid() or is_staff());

drop policy if exists "announcement_interests_student_write" on announcement_interests;
create policy "announcement_interests_student_write" on announcement_interests for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Marketing-site newsletter subscribers (people with no portal account).
-- Anyone may insert (that's the signup form); only staff may read the list.
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  confirmed boolean not null default false,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table subscribers enable row level security;

drop policy if exists "subscribers_public_insert" on subscribers;
create policy "subscribers_public_insert" on subscribers for insert with check (true);

drop policy if exists "subscribers_staff_read" on subscribers;
create policy "subscribers_staff_read" on subscribers for select using (is_staff());

drop policy if exists "subscribers_staff_write" on subscribers;
create policy "subscribers_staff_write" on subscribers for update using (is_staff());

-- Published public events are readable by anonymous visitors (so the
-- marketing site can list upcoming events without a login).
drop policy if exists "announcements_public_read" on announcements;
create policy "announcements_public_read" on announcements for select
  using (is_public = true and is_published = true);


-- ============================================================================
-- 4. LESSON CONTENT — richer fields for the student curriculum table
-- ============================================================================
alter table lessons add column if not exists duration_minutes int;
alter table lessons add column if not exists reference_links jsonb not null default '[]'::jsonb;
alter table lessons add column if not exists lesson_type text not null default 'lesson';

alter table modules add column if not exists description text;

alter table courses add column if not exists cover_image_url text;
alter table courses add column if not exists duration_weeks int;
alter table courses add column if not exists level text;
alter table courses add column if not exists is_published boolean not null default true;
alter table courses add column if not exists updated_at timestamptz not null default now();


-- ============================================================================
-- 5. STAFF / PERMISSIONS — verify everything still lines up
--
-- Re-asserts the corrected privilege-protection trigger (the earlier version
-- blocked SQL-Editor edits, which broke bootstrapping the first super admin).
-- Safe to re-run.
-- ============================================================================
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only enforce against a real end-user API session. auth.uid() is null in
  -- SQL Editor / service-role contexts, which are already trusted.
  if auth.uid() is not null and not public.is_super_admin() then
    new.role := old.role;
    new.status := old.status;
    new.permissions := old.permissions;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges_trigger on profiles;
create trigger protect_profile_privileges_trigger
  before update on profiles
  for each row execute procedure public.protect_profile_privileges();

-- Super admins need to be able to fully manage any profile (change a
-- student's role to instructor, disable an account, etc). The original
-- schema only had an UPDATE policy; this widens it correctly.
drop policy if exists "profiles_super_admin_write" on profiles;
create policy "profiles_super_admin_write" on profiles for update
  using (is_super_admin()) with check (is_super_admin());

-- Staff with manage_students should be able to read every profile
-- (already covered by profiles_select via is_staff(), re-asserted here).
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or is_staff());

-- Disabled accounts shouldn't be able to act. Enforced in app code via
-- requireStaff(), but this makes it true at the database level too.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('super_admin', 'admin', 'instructor')
  );
$$;

create or replace function public.has_permission(perm text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and status = 'active'
      and (role = 'super_admin' or (permissions->>perm)::boolean is true)
  );
$$;


-- ============================================================================
-- 6. OPTIONAL — remove the submissions/assignments feature
--
-- You asked for this to go. It's left commented out because dropping tables
-- permanently deletes any data in them, and that's not something a migration
-- should do silently. Uncomment and run ONLY when you're sure.
--
-- Note: the app code no longer references these after the accompanying code
-- changes, so leaving them in place is harmless — they just sit unused.
-- ============================================================================
-- drop table if exists submissions cascade;
-- drop table if exists assignments cascade;


-- ============================================================================
-- Done. Quick verification — should return the new columns/tables.
-- ============================================================================
select 'capstones is now multi-project' as check,
       not exists (
         select 1 from pg_constraint where conname = 'capstones_enrollment_id_key'
       ) as passed
union all
select 'capstone_reviews table exists',
       to_regclass('public.capstone_reviews') is not null
union all
select 'announcement_interests table exists',
       to_regclass('public.announcement_interests') is not null
union all
select 'subscribers table exists',
       to_regclass('public.subscribers') is not null
union all
select 'profiles.email backfilled',
       not exists (select 1 from profiles where email is null);
