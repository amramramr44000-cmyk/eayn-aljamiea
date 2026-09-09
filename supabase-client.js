const { createClient } = window.supabase;
const supabaseClient = createClient(window.SANAD_SUPABASE_URL, window.SANAD_SUPABASE_KEY);
window.sb = supabaseClient;

window.SANAD = {
  categories: ['الأمن', 'الإسعافات الطبية', 'الصيانة', 'الخدمات', 'الشكوى'],
  categoryIcons: { 'الأمن':'shield', 'الإسعافات الطبية':'medical_services', 'الصيانة':'build', 'الخدمات':'apps', 'الشكوى':'flag' },
  categorySlug: { 'الأمن':'security', 'الإسعافات الطبية':'medical', 'الصيانة':'maintenance', 'الخدمات':'services', 'الشكوى':'complaints' },
  statusLabels: {
    submitted: 'تم الاستلام',
    assigned: 'محوّل للمركز المختص',
    in_progress: 'قيد المعالجة',
    closure_requested: 'طلب إغلاق',
    closed: 'مغلق',
    rejected: 'مرفوض'
  },
  esc(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); },
  formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat('ar-EG', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); },
  reportId(id) { return id || '—'; },
  toast(message) { const el = document.getElementById('toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
};

async function requireSession() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.href = 'login.html'; return null; }
  return data.session;
}
