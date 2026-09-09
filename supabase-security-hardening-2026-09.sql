-- عين الجامعة | Security hardening 2026-09
-- Run once in Supabase SQL Editor on an existing deployment.
-- This migration removes client-controlled admin escalation and locks admin bootstrap.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  requested_username text := lower(nullif(trim(new.raw_user_meta_data->>'username'),''));
begin
  insert into public.profiles(id,email,username,full_name,role,center_category,account_status,approved_at)
  values(new.id,new.email,requested_username,coalesce(new.raw_user_meta_data->>'full_name',''),'student',null,'pending',null)
  on conflict (id) do update set
    email=excluded.email,
    username=excluded.username,
    full_name=excluded.full_name;
  return new;
end;
$$;

create or replace function public.bootstrap_admin_profile(
  p_user_id uuid, p_email text, p_username text, p_full_name text,
  p_role text, p_center text default null
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  actor_is_admin boolean := public.is_admin();
  has_approved_admin boolean := exists(select 1 from public.profiles where role='admin' and account_status='approved');
begin
  if auth.uid() is distinct from p_user_id then raise exception 'unauthorized'; end if;
  if has_approved_admin and not actor_is_admin then raise exception 'admin_setup_locked'; end if;
  if lower(coalesce(p_role,'')) not in ('admin','staff') then raise exception 'invalid_role'; end if;
  if lower(p_role)='staff' and nullif(trim(coalesce(p_center,'')),'') is null then raise exception 'center_required'; end if;
  if exists(select 1 from public.profiles where lower(username)=lower(trim(p_username)) and id<>p_user_id) then raise exception 'username_exists'; end if;
  update public.profiles
  set email=lower(trim(p_email)), username=lower(trim(p_username)), full_name=trim(p_full_name),
      role=lower(p_role), center_category=case when lower(p_role)='staff' then trim(p_center) else null end,
      account_status='approved', approved_at=now(), rejection_reason=null
  where id=p_user_id;
  if not found then
    insert into public.profiles(id,email,username,full_name,role,center_category,account_status,approved_at)
    values(p_user_id,lower(trim(p_email)),lower(trim(p_username)),trim(p_full_name),lower(p_role),case when lower(p_role)='staff' then trim(p_center) else null end,'approved',now());
  end if;
  return true;
end;
$$;

revoke all on function public.bootstrap_admin_profile(uuid,text,text,text,text,text) from public;
grant execute on function public.bootstrap_admin_profile(uuid,text,text,text,text,text) to authenticated;

-- Student registration needs to finish its pending profile after Auth signup,
-- but the account can never self-promote beyond pending.
drop policy if exists profiles_student_pending_update on public.profiles;
create policy profiles_student_pending_update on public.profiles
for update to authenticated
using (id=auth.uid() and role='student' and account_status='pending')
with check (id=auth.uid() and role='student' and account_status='pending');

-- Tighten notification insert semantics: clients cannot manufacture notifications for arbitrary users.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
for insert to authenticated
with check (public.is_admin() and user_id is not null);

-- Keep login lookup limited to already-approved management accounts.
create or replace function public.lookup_login_email(username_input text)
returns text language sql security definer set search_path=public as $$
  select email from public.profiles
  where lower(username)=lower(trim(username_input))
    and role in ('admin','staff')
    and account_status='approved'
  limit 1;
$$;
revoke all on function public.lookup_login_email(text) from public;
grant execute on function public.lookup_login_email(text) to anon, authenticated;

-- Final student report INSERT policy repair: the authenticated student may only insert
-- a report under their own user id and only after approval.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
for insert to authenticated
with check (
  reporter_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.account_status = 'approved'
  )
);


-- Robust student report creation helpers.
create or replace function public.is_approved_student(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=uid and p.role='student' and p.account_status='approved');
$$;
revoke all on function public.is_approved_student(uuid) from public;
grant execute on function public.is_approved_student(uuid) to authenticated;

create or replace function public.create_student_report(
  p_public_code text, p_category text, p_title text, p_description text,
  p_reporter_phone text default null, p_photo_paths text[] default '{}'::text[]
) returns public.reports language plpgsql security definer set search_path=public as $$
declare inserted_report public.reports;
begin
  if auth.uid() is null or not public.is_approved_student(auth.uid()) then raise exception 'الحساب غير مصرح لإرسال البلاغات.'; end if;
  insert into public.reports(public_code,reporter_id,category,title,description,reporter_phone,photo_paths,status)
  values(p_public_code,auth.uid(),p_category,coalesce(nullif(trim(p_title),''),'بلاغ'),trim(p_description),p_reporter_phone,coalesce(p_photo_paths,'{}'::text[]),'submitted')
  returning * into inserted_report; return inserted_report;
end; $$;
revoke all on function public.create_student_report(text,text,text,text,text,text[]) from public;
grant execute on function public.create_student_report(text,text,text,text,text,text[]) to authenticated;
