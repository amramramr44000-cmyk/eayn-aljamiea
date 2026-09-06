let user, profile, reports=[], notifications=[], coords=null, selectedCategory='', photos=[null,null,null], filter='all';
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));closeMenu();document.querySelector('.topbar')?.classList.remove('nav-hidden');window.scrollTo(0,0);if(id==='reports')renderReports();if(id==='notifications')renderNotifications();}
$$('.nav[data-view]').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));
function initials(name){return (name||'طالب').split(' ').slice(0,2).map(x=>x[0]).join('')}
async function init(){const s=await requireSession();if(!s)return;user=s.user;const r=await sb.from('profiles').select('*').eq('id',user.id).single();if(r.error){SANAD.toast(r.error.message);return}profile=r.data;if(profile.account_status!=='approved'){await sb.auth.signOut();location.href='login.html';return} $('#userName').textContent=profile.full_name;$('#avatar').innerHTML='<span class=\"material-symbols-rounded\">person</span>';$('#accountStatus').textContent='معتمد';$('#welcome').textContent=`مرحبًا ${profile.full_name}`;buildCategories();await Promise.all([loadReports(),loadNotifications(),loadRewards()]);getLocation();subscribeRealtime();}
function buildCategories(){const target=$('#cats'),picker=$('#picker');target.innerHTML=picker.innerHTML=SANAD.categories.map(c=>`<button class="cat" onclick="pickCategory('${c.replace(/'/g,"\\'")}')"><b class="cat-icon material-symbols-rounded">${SANAD.categoryIcons[c]}</b><strong>${c}</strong><small>إبلاغ مخصص لهذا المسار</small></button>`).join('');}
function pickCategory(c){selectedCategory=c;$$('.cat-pick').forEach(b=>b.classList.toggle('active',b.dataset.cat===c));$('#description').focus();showView('new-report');}
function renderPicker(){ $('#picker').innerHTML=SANAD.categories.map(c=>`<button class="cat-pick ${selectedCategory===c?'active':''}" data-cat="${c}" onclick="selectedCategory='${c}';renderPicker()"><span class="material-symbols-rounded picker-icon">${SANAD.categoryIcons[c]}</span><span>${c}</span></button>`).join(''); }
const oldBuild=buildCategories; buildCategories=function(){oldBuild();renderPicker()};
async function loadReports(){const {data,error}=await sb.from('reports').select('*').eq('reporter_id',user.id).order('created_at',{ascending:false});if(error){SANAD.toast(error.message);return}reports=data||[];updateStats();renderLatest();renderReports();}
function updateStats(){const active=reports.filter(r=>!['closed','rejected'].includes(r.status)).length, closed=reports.filter(r=>r.status==='closed').length;$('#activeCount').textContent=active;$('#closedCount').textContent=closed;$('#pointsStat').textContent=profile.sanad_points||0;$('#pointsHero').textContent=profile.sanad_points||0;$('#pointsBig').textContent=profile.sanad_points||0;$('#pointsBar').style.width=Math.min(100,(profile.sanad_points||0)/20)+'%';}
function reportRow(r){return `<div class="row" onclick="openReport('${r.id}')"><strong>${SANAD.esc(r.public_code)}</strong><span>${SANAD.esc(r.category)}</span><span>${SANAD.esc(r.title||r.description?.slice(0,55)||'بلاغ')}</span><span class="status ${r.status==='closed'?'status-green':r.status==='rejected'?'status-red':r.status==='closure_requested'?'status-yellow':'status-blue'}">${SANAD.statusLabels[r.status]||r.status}</span><small>${SANAD.formatDate(r.created_at)}</small></div>`}
function renderLatest(){const data=reports.slice(0,4);$('#latestReports').innerHTML=`<div class="row header"><span>الرقم</span><span>المسار</span><span>المشكلة</span><span>الحالة</span><span>التاريخ</span></div>`+(data.length?data.map(reportRow).join(''):'<div style="padding:25px;text-align:center;color:#87909b;font-size:12px">لا توجد بلاغات حتى الآن.</div>')}
function renderReports(){let data=reports;if(filter==='active')data=data.filter(r=>!['closed','rejected'].includes(r.status));if(filter==='closed')data=data.filter(r=>r.status==='closed');$('#reportsList').innerHTML=`<div class="row header"><span>الرقم</span><span>المسار</span><span>المشكلة</span><span>الحالة</span><span>التاريخ</span></div>`+(data.length?data.map(reportRow).join(''):'<div style="padding:25px;text-align:center;color:#87909b;font-size:12px">لا توجد نتائج.</div>')}
function filterReports(f,b){filter=f;$$('.filterbar button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderReports();}
async function loadNotifications(){const {data}=await sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);notifications=data||[];renderNotifications();const unread=notifications.filter(n=>!n.is_read).length;$('#unreadStat').textContent=unread;$('#notifBadge').textContent=unread;$('#notifBadge').style.display=unread?'grid':'none';}
function renderNotifications(){$('#notificationsList').innerHTML=notifications.length?notifications.map(n=>`<div class="row" style="grid-template-columns:1fr auto;background:${n.is_read?'#fff':'#fffdf1'}"><div><strong>${SANAD.esc(n.title)}</strong><div style="color:#6f7885;margin-top:4px">${SANAD.esc(n.body||'')}</div><small>${SANAD.formatDate(n.created_at)}</small></div><span class="status ${n.is_read?'status-green':'status-yellow'}">${n.is_read?'مقروء':'جديد'}</span></div>`).join(''):'<div style="padding:25px;text-align:center;color:#87909b">لا توجد إشعارات.</div>'}
async function markAllRead(){const unread=notifications.filter(n=>!n.is_read);if(unread.length) await sb.from('notifications').update({is_read:true}).in('id',unread.map(n=>n.id));await loadNotifications();SANAD.toast('تم تعليم الإشعارات كمقروءة');}
async function loadRewards(){const {data}=await sb.from('rewards').select('*').eq('active',true).order('points_cost');$('#rewards').innerHTML=(data||[]).map(r=>`<div class="cat"><b class="cat-icon material-symbols-rounded">redeem</b><strong>${SANAD.esc(r.name)}</strong><small>${r.points_cost} نقطة</small><button class="secondary" style="margin-top:12px;width:100%" onclick="redeem('${r.id}')" ${((profile.sanad_points||0)<r.points_cost)?'disabled':''}>استبدال</button></div>`).join('')||'<div style="color:#7b8490">لا توجد مكافآت مضافة حاليًا.</div>';}
async function redeem(id){SANAD.toast('نظام الاستبدال جاهز للربط بسياسة الجامعة');}
function getLocation(){if(!navigator.geolocation){$('#locationText').textContent='المتصفح لا يدعم الموقع';return}navigator.geolocation.getCurrentPosition(p=>{coords={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};$('#locationText').textContent=`تم تحديد الموقع بدقة تقريبية ${Math.round(coords.accuracy)}م`},()=>$('#locationText').textContent='لم يتم السماح بالموقع');}
function previewPhoto(input,i){const f=input.files?.[0];if(!f)return;photos[i]=f;const box=$('#photo'+i);const url=URL.createObjectURL(f);box.classList.add('preview');box.innerHTML=`<img src="${url}" alt="صورة البلاغ"><input type="file" accept="image/*" capture="environment" onchange="previewPhoto(this,${i})">`;}
async function uploadReportPhoto(file,uid,code,index){const path=`${uid}/${code}/${index}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;const {error}=await sb.storage.from('report-photos').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return path;}
async function submitReport(){if(!selectedCategory){SANAD.toast('اختر مسار البلاغ');return}const description=$('#description').value.trim();if(description.length<10){SANAD.toast('اكتب تفاصيل كافية للمشكلة');return}if(!coords){SANAD.toast('حدد موقع البلاغ أولًا');return}const {data:codeData,error:codeErr}=await sb.rpc('create_report_code');if(codeErr){SANAD.toast('تعذر إنشاء رقم البلاغ: '+codeErr.message);return}const publicCode=codeData;const files=photos.filter(Boolean);try{const paths=[];for(let i=0;i<files.length;i++)paths.push(await uploadReportPhoto(files[i],user.id,publicCode,i+1));const {data,error}=await sb.from('reports').insert({public_code:publicCode,reporter_id:user.id,category:selectedCategory,title:description.slice(0,80),description,latitude:coords.lat,longitude:coords.lng,location_accuracy:coords.accuracy,reporter_phone:profile.phone,photo_paths:paths,status:'submitted'}).select().single();if(error)throw error;SANAD.toast(`تم رفع البلاغ ${data.public_code} بنجاح`);reports.unshift(data);$('#description').value='';photos=[null,null,null];selectedCategory='';renderPicker();showView('reports');renderReports();updateStats();}catch(e){SANAD.toast(e.message||'حدث خطأ أثناء رفع البلاغ')}}
function openProfile(){
  if(!profile)return;
  const fullName=SANAD.esc(profile.full_name||'غير محدد');
  const username=SANAD.esc(profile.username||'—');
  const institution=SANAD.esc(profile.institution_id||'—');
  const phone=SANAD.esc(profile.phone||'—');
  const email=SANAD.esc(profile.email||user?.email||'—');
  const points=SANAD.esc(String(profile.sanad_points||0));
  $('#modalBody').innerHTML=`<div class="profile-panel">
    <div class="profile-hero"><div class="profile-avatar"><span class="material-symbols-rounded">person</span></div><div><span class="eyebrow">الملف الشخصي</span><h2>${fullName}</h2><p class="help">حساب جامعي معتمد</p></div></div>
    <div class="profile-stats"><div><span class="material-symbols-rounded">stars</span><b>${points}</b><small>نقاط سند</small></div><div><span class="material-symbols-rounded">verified</span><b>معتمد</b><small>حالة الحساب</small></div></div>
    <div class="profile-grid">
      <div class="profile-field"><span class="material-symbols-rounded">badge</span><div><small>رقم الجامعة / الهوية</small><strong>${institution}</strong></div></div>
      <div class="profile-field"><span class="material-symbols-rounded">alternate_email</span><div><small>اسم المستخدم</small><strong>${username}</strong></div></div>
      <div class="profile-field"><span class="material-symbols-rounded">call</span><div><small>رقم الهاتف</small><strong>${phone}</strong></div></div>
      <div class="profile-field"><span class="material-symbols-rounded">mail</span><div><small>البريد الإلكتروني</small><strong>${email}</strong></div></div>
    </div>
    <div class="profile-note"><span class="material-symbols-rounded">info</span><span>هذه البيانات مرتبطة بحسابك وتُستخدم لتسجيل البلاغات ومتابعتها.</span></div>
  </div>`;
  $('#modal').classList.add('show');
}
async function openReport(id){const r=reports.find(x=>x.id===id);if(!r)return;const {data:updates}=await sb.from('report_updates').select('*').eq('report_id',id).order('created_at');$('#modalBody').innerHTML=`<span class="eyebrow">تفاصيل البلاغ</span><h2>${SANAD.esc(r.public_code)}</h2><p style="color:#6f7885;font-size:12px">${SANAD.esc(r.category)} • ${SANAD.statusLabels[r.status]||r.status}</p><div style="background:#fafbfc;padding:13px;border-radius:14px;font-size:12px;line-height:1.9;margin:14px 0">${SANAD.esc(r.description)}</div><div class="timeline">${(updates||[]).map(u=>`<div class="timeline-item"><strong>${SANAD.esc(u.title)}</strong><span>${SANAD.esc(u.body||'')}<br>${SANAD.formatDate(u.created_at)}</span></div>`).join('')||'<div class="timeline-item"><strong>تم استلام البلاغ</strong><span>تم إنشاء الرقم وحفظ البلاغ.</span></div>'}</div>`;$('#modal').classList.add('show');}
function closeModal(){$('#modal').classList.remove('show')};$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function subscribeRealtime(){sb.channel('student-live').on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},()=>loadNotifications()).on('postgres_changes',{event:'*',schema:'public',table:'reports',filter:`reporter_id=eq.${user.id}`},()=>loadReports()).subscribe();}
async function logout(){await sb.auth.signOut();location.href='login.html'}
init();

/* ===== تنقل الهاتف + إظهار/إخفاء الشريط العلوي ===== */
function openMenu(){
  const sidebar=$('#sidebar'), backdrop=$('#menuBackdrop'), toggle=document.querySelector('.menu-toggle');
  sidebar?.classList.add('open'); backdrop?.classList.add('show'); document.body.classList.add('menu-open'); toggle?.setAttribute('aria-expanded','true');
}
function closeMenu(){
  const sidebar=$('#sidebar'), backdrop=$('#menuBackdrop'), toggle=document.querySelector('.menu-toggle');
  sidebar?.classList.remove('open'); backdrop?.classList.remove('show'); document.body.classList.remove('menu-open'); toggle?.setAttribute('aria-expanded','false');
}
function toggleMenu(){
  const open=$('#sidebar')?.classList.contains('open'); open?closeMenu():openMenu();
}
(function setupMobileNavigation(){
  let lastY=window.scrollY, ticking=false;
  const bar=document.querySelector('.topbar');
  function onScroll(){
    const y=Math.max(0,window.scrollY);
    if(bar && window.innerWidth<=650 && !document.body.classList.contains('menu-open')){
      if(y>lastY+12 && y>96) bar.classList.add('nav-hidden');
      else if(y<lastY-10 || y<20) bar.classList.remove('nav-hidden');
    }
    if(document.body.classList.contains('menu-open')) bar.classList.remove('nav-hidden');
    lastY=y;
  }
  window.addEventListener('scroll',()=>{if(!ticking){window.requestAnimationFrame(()=>{onScroll();ticking=false});ticking=true}}, {passive:true});
  window.addEventListener('resize',()=>{if(window.innerWidth>650) bar?.classList.remove('nav-hidden');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  document.addEventListener('click',e=>{if(e.target.closest('.sidebar .nav[data-view]')) closeMenu();});
})();
