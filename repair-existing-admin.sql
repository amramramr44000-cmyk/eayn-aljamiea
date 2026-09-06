-- إصلاح حساب الإدارة الحالي إذا تم إنشاؤه قبل النسخة الجديدة.
-- نفّذ هذا فقط للحساب الذي تملكه. غيّر amr إذا كان اسم المستخدم مختلفًا.
update public.profiles
set role='admin', account_status='approved', approved_at=coalesce(approved_at, now()), rejection_reason=null
where lower(username)=lower('amr');

select id, username, email, role, account_status
from public.profiles
where lower(username)=lower('amr');
