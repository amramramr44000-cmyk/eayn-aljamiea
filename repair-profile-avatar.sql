-- إصلاح/تمكين صورة الملف العامة
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor.
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets(id,name,public) values ('avatars','avatars',true)
on conflict (id) do update set public=true;

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated with check (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated using (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
) with check (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated using (
  bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text
);

create or replace function public.set_profile_avatar(p_avatar_url text)
returns public.profiles language plpgsql security definer set search_path=public as $$
declare updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول.'; end if;
  if p_avatar_url is null or length(trim(p_avatar_url)) < 10 then raise exception 'رابط الصورة غير صالح.'; end if;
  update public.profiles set avatar_url=trim(p_avatar_url), updated_at=now()
  where id=auth.uid()
  returning * into updated_profile;
  if updated_profile.id is null then raise exception 'تعذر تحديث صورة الملف.'; end if;
  return updated_profile;
end; $$;
revoke all on function public.set_profile_avatar(text) from public;
grant execute on function public.set_profile_avatar(text) to authenticated;
