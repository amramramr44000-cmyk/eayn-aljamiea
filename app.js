let user, profile, reports=[], notifications=[], selectedCategory='', photos=[null,null,null], filter='all';
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav[data-view], .mobile-nav[data-view], .desktop-tabs [data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===id));closeMenu();document.body.classList.remove('modal-open');document.querySelector('.topbar')?.classList.remove('nav-hidden');document.querySelector('.mobile-bottom-nav')?.classList.remove('bottom-nav-hidden');window.scrollTo({top:0,behavior:'instant'});if(id==='reports')renderReports();if(id==='notifications')renderNotifications();}
$$('.nav[data-view], .desktop-tabs [data-view]').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));
function initials(name){return (name||'طالب').split(' ').slice(0,2).map(x=>x[0]).join('')}
async function init(){const s=await requireSession();if(!s)return;user=s.user;const r=await sb.from('profiles').select('*').eq('id',user.id).single();if(r.error){SANAD.toast(r.error.message);return}profile=r.data;if(profile.account_status!=='approved'){await sb.auth.signOut();location.href='login.html';return} $('#userName').textContent=profile.full_name;$('#avatar').innerHTML='<span class=\"material-symbols-rounded\">person</span>';$('#accountStatus').textContent='معتمد';$('#welcome').textContent=`مرحبًا ${profile.full_name}`;buildCategories();await Promise.all([loadReports(),loadNotifications(),loadRewards()]);subscribeRealtime();}
function buildCategories(){const target=$('#cats'),picker=$('#picker');target.innerHTML=SANAD.categories.map(c=>`<button class="route-item" type="button" onclick="pickCategory('${c.replace(/'/g,"\\'")}')"><span class="route-icon material-symbols-rounded">${SANAD.categoryIcons[c]}</span><span class="route-copy"><strong>${c}</strong><small>تحويل مباشر للمركز المختص</small></span><span class="material-symbols-rounded route-arrow">chevron_left</span></button>`).join('');renderPicker();}
function pickCategory(c){selectedCategory=c;$$('.cat-pick').forEach(b=>b.classList.toggle('active',b.dataset.cat===c));$('#description').focus();showView('new-report');}
function renderPicker(){ $('#picker').innerHTML=SANAD.categories.map(c=>`<button class="route-pick ${selectedCategory===c?'active':''}" type="button" data-cat="${SANAD.esc(c)}" onclick="selectedCategory='${c.replace(/'/g,"\\'")}';renderPicker()"><span class="material-symbols-rounded picker-icon">${SANAD.categoryIcons[c]}</span><span>${c}</span><span class="material-symbols-rounded">chevron_left</span></button>`).join(''); }
const oldBuild=buildCategories; buildCategories=function(){oldBuild();renderPicker()};
async function loadReports(){const {data,error}=await sb.from('reports').select('*').eq('reporter_id',user.id).order('created_at',{ascending:false});if(error){SANAD.toast(error.message);return}reports=data||[];updateStats();renderLatest();renderReports();}
function updateStats(){const active=reports.filter(r=>!['closed','rejected'].includes(r.status)).length, closed=reports.filter(r=>r.status==='closed').length;$('#activeCount').textContent=active;$('#closedCount').textContent=closed;$('#pointsStat').textContent=profile.sanad_points||0;$('#pointsHero').textContent=profile.sanad_points||0;$('#pointsBig').textContent=profile.sanad_points||0;$('#pointsBar').style.width=Math.min(100,(profile.sanad_points||0)/20)+'%';}
function reportRow(r){const cls=r.status==='closed'?'status-green':r.status==='rejected'?'status-red':r.status==='closure_requested'?'status-yellow':'status-blue';return `<article class="data-card" role="button" tabindex="0" onclick="openReport('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' ')openReport('${r.id}')"><div class="data-card-head"><div><div class="data-card-title">${SANAD.esc(r.public_code)}</div><div class="data-card-sub">${SANAD.esc(r.title||r.description?.slice(0,70)||'بلاغ')} • ${SANAD.formatDate(r.created_at)}</div></div><span class="status ${cls}">${SANAD.statusLabels[r.status]||r.status}</span></div><div class="data-card-meta"><div class="meta-chip"><span class="material-symbols-rounded">category</span><span>${SANAD.esc(r.category)}</span></div><div class="meta-chip"><span class="material-symbols-rounded">schedule</span><span>${SANAD.statusLabels[r.status]||r.status}</span></div></div></article>`}
function renderLatest(){const data=reports.slice(0,4);$('#latestReports').innerHTML=`<div class="row header"><span>الرقم</span><span>المسار</span><span>المشكلة</span><span>الحالة</span><span>التاريخ</span></div>`+(data.length?data.map(reportRow).join(''):'<div style="padding:25px;text-align:center;color:#87909b;font-size:12px">لا توجد بلاغات حتى الآن.</div>')}
function renderReports(){let data=reports;if(filter==='active')data=data.filter(r=>!['closed','rejected'].includes(r.status));if(filter==='closed')data=data.filter(r=>r.status==='closed');const empty='<div class="empty-state"><span class="material-symbols-rounded">assignment_late</span><strong>لا توجد نتائج</strong><small>ستظهر بلاغاتك هنا بعد الإرسال.</small></div>';$('#reportsList').innerHTML=data.length?data.map(reportRow).join(''):empty}
function filterReports(f,b){filter=f;$$('.filterbar button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderReports();}
async function loadNotifications(){const {data}=await sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);notifications=data||[];renderNotifications();const unread=notifications.filter(n=>!n.is_read).length;$('#unreadStat').textContent=unread;$('#notifBadge').textContent=unread;$('#notifBadge').style.display=unread?'grid':'none';const nb=$('#notificationsNavBadge');if(nb){nb.textContent=unread;nb.style.display=unread?'inline-flex':'none'}const mb=$('#mobileNotifBadge');if(mb){mb.textContent=unread;mb.style.display=unread?'grid':'none'}}
function renderNotifications(){$('#notificationsList').innerHTML=notifications.length?notifications.map(n=>`<div class="row" style="grid-template-columns:1fr auto;background:${n.is_read?'#102235':'#182b3e'}"><div><strong>${SANAD.esc(n.title)}</strong><div style="color:#6f7885;margin-top:4px">${SANAD.esc(n.body||'')}</div><small>${SANAD.formatDate(n.created_at)}</small></div><span class="status ${n.is_read?'status-green':'status-yellow'}">${n.is_read?'مقروء':'جديد'}</span></div>`).join(''):'<div style="padding:25px;text-align:center;color:#87909b">لا توجد إشعارات.</div>'}
async function markAllRead(){const unread=notifications.filter(n=>!n.is_read);if(unread.length) await sb.from('notifications').update({is_read:true}).in('id',unread.map(n=>n.id));await loadNotifications();SANAD.toast('تم تعليم الإشعارات كمقروءة');}
async function loadRewards(){const {data}=await sb.from('rewards').select('*').eq('active',true).order('points_cost');$('#rewards').innerHTML=(data||[]).map(r=>`<div class="cat"><b class="cat-icon material-symbols-rounded">redeem</b><strong>${SANAD.esc(r.name)}</strong><small>${r.points_cost} نقطة</small><button class="secondary" style="margin-top:12px;width:100%" onclick="redeem('${r.id}')" ${((profile.sanad_points||0)<r.points_cost)?'disabled':''}>استبدال</button></div>`).join('')||'<div style="color:#7b8490">لا توجد مكافآت مضافة حاليًا.</div>';}
async function redeem(id){SANAD.toast('نظام الاستبدال جاهز للربط بسياسة الجامعة');}
function validReportImage(f){return f&&['image/jpeg','image/png','image/webp'].includes(f.type)&&f.size<=5*1024*1024}function previewPhoto(input,i){const f=input.files?.[0];if(!f)return;if(!validReportImage(f)){SANAD.toast('الصورة يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 5MB.');input.value='';return}photos[i]=f;const box=$('#photo'+i);const url=URL.createObjectURL(f);box.classList.add('preview');box.innerHTML=`<img src="${url}" alt="صورة البلاغ"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="previewPhoto(this,${i})">`;}
async function uploadReportPhoto(file,uid,code,index){if(!validReportImage(file))throw new Error('صورة البلاغ غير صالحة أو أكبر من 5MB.');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${uid}/${code}/${index}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error}=await sb.storage.from('report-photos').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});if(error)throw error;return path;}
async function submitReport(){
 if(!selectedCategory){SANAD.toast('اختر مسار البلاغ');return}
 const description=$('#description').value.trim();
 if(description.length<10){SANAD.toast('اكتب تفاصيل كافية للمشكلة');return}
 if(!profile||profile.account_status!=='approved'){SANAD.toast('الحساب غير معتمد لإرسال البلاغات');return}
 const {data:codeData,error:codeErr}=await sb.rpc('create_report_code');
 if(codeErr){SANAD.toast('تعذر إنشاء رقم البلاغ: '+codeErr.message);return}
 const publicCode=codeData;
 const files=photos.filter(Boolean);
 const submitBtn=document.querySelector('.form-actions .primary');
 if(submitBtn){submitBtn.disabled=true;submitBtn.dataset.oldText=submitBtn.textContent;submitBtn.textContent='جارٍ رفع البلاغ...'}
 try{
   const paths=[];
   for(let i=0;i<files.length;i++)paths.push(await uploadReportPhoto(files[i],user.id,publicCode,i+1));
   // Use a SECURITY DEFINER RPC so report creation is validated server-side without
   // depending on client-visible RLS subqueries against profiles.
   const {data,error}=await sb.rpc('create_student_report',{
     p_public_code:publicCode,
     p_category:selectedCategory,
     p_title:description.slice(0,80),
     p_description:description,
     p_reporter_phone:profile.phone||null,
     p_photo_paths:paths
   });
   if(error)throw error;
   const created=Array.isArray(data)?data[0]:data;
   if(!created)throw new Error('تعذر استلام بيانات البلاغ بعد الحفظ.');
   SANAD.toast(`تم رفع البلاغ ${created.public_code||publicCode} بنجاح`);
   reports.unshift(created);
   $('#description').value='';
   photos=[null,null,null];
   selectedCategory='';
   renderPicker();
   showView('reports');
   renderReports();
   updateStats();
 }catch(e){
   const msg=String(e?.message||e||'حدث خطأ أثناء رفع البلاغ');
   SANAD.toast(msg.includes('create_student_report')||msg.includes('function')?'تعذر حفظ البلاغ. نفّذ ملف repair-student-report.sql في Supabase مرة واحدة ثم أعد المحاولة.':msg);
 }finally{
   if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=submitBtn.dataset.oldText||'رفع البلاغ'}
 }
}
function validAvatarFile(f){return f&&['image/jpeg','image/png','image/webp'].includes(f.type)&&f.size<=3*1024*1024}
function setAvatarElement(el,url){if(!el)return;el.innerHTML=url?`<img src="${SANAD.esc(url)}" alt="صورة الملف">`:'<span class="material-symbols-rounded">person</span>';el.classList.toggle('has-image',!!url)}
async function changeProfileAvatar(input){
  const file=input?.files?.[0]; if(!file)return;
  input.value='';
  if(!validAvatarFile(file)){SANAD.toast('الصورة يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 3MB.');return}
  try{
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`${user.id}/avatar-${Date.now()}.${ext}`;
    const {error:uploadError}=await sb.storage.from('avatars').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'31536000'});
    if(uploadError)throw uploadError;
    const {data}=sb.storage.from('avatars').getPublicUrl(path);
    const {data:updated,error:rpcError}=await sb.rpc('set_profile_avatar',{p_avatar_url:data.publicUrl});
    if(rpcError)throw rpcError;
    profile=updated||{...profile,avatar_url:data.publicUrl};
    setAvatarElement($('#avatar'),profile.avatar_url);
    const big=$('#profileAvatarInputPreview'); setAvatarElement(big,profile.avatar_url);
    SANAD.toast('تم تغيير صورة الملف بنجاح');
  }catch(e){SANAD.toast(e.message||'تعذر تغيير صورة الملف');}
}
function openProfile(){
  if(!profile)return;
  const fullName=SANAD.esc(profile.full_name||'غير محدد');
  const username=SANAD.esc(profile.username||'—');
  const institution=SANAD.esc(profile.institution_id||'—');
  const phone=SANAD.esc(profile.phone||'—');
  const email=SANAD.esc(profile.email||user?.email||'—');
  const points=SANAD.esc(String(profile.sanad_points||0));
  $('#modalBody').innerHTML=`<div class="profile-panel digital-id"><div class="digital-id-head"><div class="digital-id-brand"><span class="material-symbols-rounded">account_balance</span><div><strong>عين الجامعة</strong><small>هوية رقمية جامعية</small></div></div><span class="digital-id-status">معتمد</span></div>
    <div class="profile-hero"><label class="profile-avatar profile-avatar-edit" id="profileAvatarInputPreview" title="تغيير صورة الملف" aria-label="تغيير صورة الملف"><span class="material-symbols-rounded">person</span><span class="avatar-edit-badge material-symbols-rounded">photo_camera</span><input type="file" accept="image/jpeg,image/png,image/webp" onchange="changeProfileAvatar(this)" hidden></label><div><span class="eyebrow">الملف الشخصي</span><h2>${fullName}</h2><p class="help">حساب جامعي معتمد</p></div></div>
    <div class="profile-stats"><div><span class="material-symbols-rounded">stars</span><b>${points}</b><small>نقاط سند</small></div><div><span class="material-symbols-rounded">verified</span><b>معتمد</b><small>حالة الحساب</small></div></div>
    <div class="profile-grid">
      <div class="profile-field"><span class="material-symbols-rounded">badge</span><div><small>رقم الجامعة / الهوية</small><strong>${institution}</strong></div></div>
      <div class="profile-field"><span class="material-symbols-rounded">alternate_email</span><div><small>اسم المستخدم</small><strong>${username}</strong></div></div>
      <div class="profile-field"><span class="material-symbols-rounded">call</span><div><small>رقم الهاتف</small><strong>${phone}</strong></div></div>
      <div class="profile-field"><span class="material-symbols-rounded">mail</span><div><small>البريد الإلكتروني</small><strong>${email}</strong></div></div>
    </div>
    <div class="profile-note"><span class="material-symbols-rounded">info</span><span>هذه البيانات مرتبطة بحسابك وتُستخدم لتسجيل البلاغات ومتابعتها.</span></div>
  </div><div class="profile-actions"><button class="danger" type="button" onclick="closeModal();logout()"><span class="material-symbols-rounded">logout</span> تسجيل الخروج</button></div>`;
  $('#modal').classList.add('show');
  document.body.classList.add('modal-open');
  const modalScroll=document.querySelector('#modal > .modal'); if(modalScroll) modalScroll.scrollTop=0;
}
async function openReport(id){const r=reports.find(x=>x.id===id);if(!r)return;const {data:updates}=await sb.from('report_updates').select('*').eq('report_id',id).order('created_at');$('#modalBody').innerHTML=`<span class="eyebrow">تفاصيل البلاغ</span><h2>${SANAD.esc(r.public_code)}</h2><p style="color:#6f7885;font-size:12px">${SANAD.esc(r.category)} • ${SANAD.statusLabels[r.status]||r.status}</p><div class="report-description">${SANAD.esc(r.description)}</div><div class="timeline">${(updates||[]).map(u=>`<div class="timeline-item"><strong>${SANAD.esc(u.title)}</strong><span>${SANAD.esc(u.body||'')}<br>${SANAD.formatDate(u.created_at)}</span></div>`).join('')||'<div class="timeline-item"><strong>تم استلام البلاغ</strong><span>تم إنشاء الرقم وحفظ البلاغ.</span></div>'}</div>`;$('#modal').classList.add('show');document.body.classList.add('modal-open');}
function closeModal(){$('#modal').classList.remove('show');document.body.classList.remove('modal-open');}$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function subscribeRealtime(){if(window.__studentRealtime)return;window.__studentRealtime=true;sb.channel('student-live').on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},()=>loadNotifications()).on('postgres_changes',{event:'*',schema:'public',table:'reports',filter:`reporter_id=eq.${user.id}`},()=>loadReports()).subscribe();}
async function logout(){await sb.auth.signOut();location.href='login.html'}
init();

/* ===== تنقل الهاتف: إخفاء/إظهار العلوي والسفلي معًا بسلاسة ===== */
(function setupMobileNavigation(){
  let lastY=Math.max(0,window.scrollY), ticking=false;
  const bottomNav=document.querySelector('.mobile-bottom-nav');
  const topbar=document.querySelector('.topbar');
  if(!bottomNav) return;

  function reveal(){
    bottomNav.classList.remove('bottom-nav-hidden');
    topbar?.classList.remove('nav-hidden');
  }
  function hide(){
    bottomNav.classList.add('bottom-nav-hidden');
    topbar?.classList.add('nav-hidden');
  }
  function onScroll(){
    const y=Math.max(0,window.scrollY);
    const delta=y-lastY;
    if(window.innerWidth<=650 && !document.body.classList.contains('menu-open') && !document.body.classList.contains('modal-open')){
      /* A tiny real directional movement is enough; animation handles the softness. */
      if(y<=24 || delta < -2){
        reveal();
      }else if(delta > 2 && y>24){
        hide();
      }
    }else if(window.innerWidth>650){
      reveal();
    }
    lastY=y;
  }
  window.addEventListener('scroll',()=>{
    if(!ticking){
      window.requestAnimationFrame(()=>{onScroll();ticking=false;});
      ticking=true;
    }
  },{passive:true});
  window.addEventListener('resize',()=>{
    if(window.innerWidth>650) reveal();
  });
  reveal();
})();
