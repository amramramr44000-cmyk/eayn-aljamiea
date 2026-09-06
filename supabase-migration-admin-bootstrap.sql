-- إصلاح نهائي لإنشاء الحساب الإداري في Auth + profiles
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.

create or replace function public.bootstrap_admin_profile(
  p_user_id uuid,
  p_email text,
  p_username text,
  p_full_name text,
  p_role text,
  p_center text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized';
  end if;

  if lower(coalesce(p_role,'')) not in ('admin','staff') then
    raise exception 'invalid_role';
  end if;

  if p_role = 'staff' and nullif(trim(coalesce(p_center,'')),'') is null then
    raise exception 'center_required';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(username)=lower(trim(p_username)) and id <> p_user_id
  ) then
    raise exception 'username_exists';
  end if;

  insert into public.profiles(
    id,email,username,full_name,role,center_category,account_status,approved_at
  ) values (
    p_user_id,
    lower(trim(p_email)),
    lower(trim(p_username)),
    trim(p_full_name),
    lower(p_role),
    case when lower(p_role)='staff' then trim(p_center) else null end,
    'approved',
    now()
  )
  on conflict (id) do update set
    email=excluded.email,
    username=excluded.username,
    full_name=excluded.full_name,
    role=excluded.role,
    center_category=excluded.center_category,
    account_status='approved',
    approved_at=now();

  return true;
end;
$$;

revoke all on function public.bootstrap_admin_profile(uuid,text,text,text,text,text) from public;
grant execute on function public.bootstrap_admin_profile(uuid,text,text,text,text,text) to authenticated;

-- تأكيد أن البحث عن اسم المستخدم يعيد بريد الحساب الإداري المعتمد فقط
create or replace function public.lookup_login_email(username_input text)
returns text
language sql
security definer
set search_path=public
as $$
  select email
  from public.profiles
  where lower(username)=lower(trim(username_input))
    and role in ('admin','staff')
    and account_status='approved'
  limit 1;
$$;
revoke all on function public.lookup_login_email(text) from public;
grant execute on function public.lookup_login_email(text) to anon, authenticated;
