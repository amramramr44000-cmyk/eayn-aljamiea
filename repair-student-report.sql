-- عين الجامعة | Student report INSERT hardening / RPC repair
-- Run this ONCE in the deployed Supabase SQL Editor.

create or replace function public.is_approved_student(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.role = 'student'
      and p.account_status = 'approved'
  );
$$;

revoke all on function public.is_approved_student(uuid) from public;
grant execute on function public.is_approved_student(uuid) to authenticated;

create or replace function public.create_student_report(
  p_public_code text,
  p_category text,
  p_title text,
  p_description text,
  p_reporter_phone text default null,
  p_photo_paths text[] default '{}'::text[]
)
returns public.reports
language plpgsql
security definer
set search_path=public
as $$
declare
  inserted_report public.reports;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح: يجب تسجيل الدخول أولًا.';
  end if;

  if not public.is_approved_student(auth.uid()) then
    raise exception 'الحساب غير معتمد لإرسال البلاغات.';
  end if;

  if p_category not in ('الأمن','الإسعافات الطبية','الصيانة','الخدمات','الشكوى') then
    raise exception 'مسار البلاغ غير صالح.';
  end if;

  if length(trim(coalesce(p_description,''))) < 10 then
    raise exception 'تفاصيل المشكلة قصيرة جدًا.';
  end if;

  insert into public.reports(
    public_code, reporter_id, category, title, description,
    reporter_phone, photo_paths, status
  )
  values (
    p_public_code, auth.uid(), p_category, coalesce(nullif(trim(p_title),''),'بلاغ'),
    trim(p_description), p_reporter_phone, coalesce(p_photo_paths,'{}'::text[]), 'submitted'
  )
  returning * into inserted_report;

  return inserted_report;
end;
$$;

revoke all on function public.create_student_report(text,text,text,text,text,text[]) from public;
grant execute on function public.create_student_report(text,text,text,text,text,text[]) to authenticated;

-- Keep direct table INSERT secure for clients that still use it elsewhere.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
for insert to authenticated
with check (reporter_id = auth.uid() and public.is_approved_student(auth.uid()));
