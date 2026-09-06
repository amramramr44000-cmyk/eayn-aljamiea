-- إصلاح حساب إداري موجود بالفعل في Auth.
-- غيّر البريد واسم المستخدم والقيم عند الحاجة ثم Run.
-- ملاحظة: هذا يعتمد على أن حساب Auth موجود بالفعل بنفس البريد.

update public.profiles
set role='admin', account_status='approved', approved_at=now(), username='amr'
where lower(email)=lower('amramramr0044@gmail.com');

select id,email,username,role,account_status
from public.profiles
where lower(email)=lower('amramramr0044@gmail.com');
