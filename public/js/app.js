// بيتك: واجهة التطبيق. البيانات والدخول من data.js، والتصميم من style.css.
import {
  configured, OPTIONS, watchAuth, signIn, logOut, fetchActive, fetchMine, createListing,
  setStatus, renew, removeListing, report, deleteAccount,
} from './data.js';

const CITIES = ['عمّان', 'إربد', 'الزرقاء', 'العقبة', 'السلط', 'مادبا', 'جرش', 'الكرك', 'المفرق', 'معان', 'عجلون', 'الطفيلة'];
const KINDS = ['شقة', 'بيت مستقل', 'فيلا', 'دوبلكس', 'استوديو', 'طابق أرضي'];
const TABS = ['rent', 'sale', 'mine'];
const REASONS = ['إعلان مزيف أو مضلل', 'رقم الهاتف خاطئ', 'محتوى غير لائق', 'العقار لم يعد متاحاً', 'سبب آخر'];
const DAY = 86400000;

const $ = (id) => document.getElementById(id);
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
  }
  kids.flat().forEach((c) => {
    if (c == null || c === false) return;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return n;
}
const clampInt = (v, a, b) => { v = Math.round(Number(v)); if (!isFinite(v)) v = a; return Math.min(b, Math.max(a, v)); };
const num = (n) => new Intl.NumberFormat('en-US').format(n);

const state = {
  tab: 'rent', user: null, authReady: false,
  data: { rent: null, sale: null }, mine: null,
  loading: false, error: null,
  filters: { city: '', kind: '', rooms: 0, max: 0, sort: 'new' },
  confirmDel: null, photos: [],
};

/* عروض توضيحية بتظهر فقط لما التطبيق ما ينربط بعد أو القائمة فاضية. ما بتنكتب بأي قاعدة بيانات. */
const now0 = Date.now();
const DEMO = [
  { id: 'd1', type: 'rent', kind: 'شقة', city: 'عمّان', area: 'عبدون', price: 450, rooms: 3, baths: 2, size: 150, furnished: false, desc: 'شقة هادئة بالطابق الثاني مع موقف خاص.', createdAt: now0 - 2 * DAY },
  { id: 'd2', type: 'rent', kind: 'استوديو', city: 'إربد', area: 'الحي الجامعي', price: 160, rooms: 0, baths: 1, size: 45, furnished: true, desc: 'استوديو مفروش قريب من الجامعة.', createdAt: now0 - 5 * DAY },
  { id: 'd3', type: 'rent', kind: 'طابق أرضي', city: 'الزرقاء', area: 'الزرقاء الجديدة', price: 190, rooms: 3, baths: 1, size: 120, furnished: false, desc: 'طابق أرضي مع حديقة صغيرة.', createdAt: now0 - 9 * DAY },
  { id: 'd4', type: 'sale', kind: 'فيلا', city: 'عمّان', area: 'دابوق', price: 285000, rooms: 5, baths: 4, size: 420, furnished: false, desc: 'فيلا مستقلة مع حديقة ومسبح.', createdAt: now0 - 3 * DAY },
  { id: 'd5', type: 'sale', kind: 'شقة', city: 'مادبا', area: 'حي الجامعة', price: 55000, rooms: 3, baths: 2, size: 140, furnished: false, desc: 'شقة جديدة لم تُسكن، تشطيب سوبر ديلوكس.', createdAt: now0 - 6 * DAY },
  { id: 'd6', type: 'sale', kind: 'بيت مستقل', city: 'السلط', area: 'العيزرية', price: 78000, rooms: 4, baths: 2, size: 200, furnished: false, desc: 'بيت مستقل على أرض 500 م².', createdAt: now0 - 12 * DAY },
];

/* ---------- تنظيف بيانات جاية من قاعدة البيانات ---------- */
function safeHttps(u) {
  try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; }
}
function safeMap(u) {
  const m = String(u || '').match(/https:\/\/\S+/);
  if (!m) return '';
  try {
    const x = new URL(m[0]); const h = x.hostname.toLowerCase();
    const ok = h === 'maps.app.goo.gl' || (h === 'goo.gl' && x.pathname.indexOf('/maps') === 0) || h === 'maps.google.com'
      || (/^(www\.)?google\.[a-z.]+$/.test(h) && x.pathname.indexOf('/maps') === 0);
    return ok ? x.href.slice(0, 500) : '';
  } catch (e) { return ''; }
}
function clean(it) {
  const type = it.type === 'sale' ? 'sale' : 'rent';
  return {
    id: String(it.id || ''), ownerId: String(it.ownerId || ''), ownerName: String(it.ownerName || '').slice(0, 80),
    type, kind: KINDS.indexOf(it.kind) >= 0 ? it.kind : 'شقة', city: String(it.city || '').slice(0, 30),
    area: String(it.area || '').slice(0, 60), price: Math.max(0, Number(it.price) || 0),
    rooms: clampInt(it.rooms, 0, 20), baths: clampInt(it.baths, 0, 10), size: clampInt(it.size, 0, 100000),
    furnished: !!it.furnished && type === 'rent', phone: String(it.phone || '').replace(/\D/g, '').slice(0, 15),
    map: safeMap(it.map), desc: String(it.desc || '').slice(0, 600),
    photos: (Array.isArray(it.photos) ? it.photos : []).slice(0, 8).map((p) => ({ url: safeHttps(p && p.url), path: String((p && p.path) || '') })).filter((p) => p.url),
    status: it.status === 'done' ? 'done' : it.status === 'hidden' ? 'hidden' : 'active',
    createdAt: Number(it.createdAt) || 0, expiresAt: Number(it.expiresAt) || 0,
  };
}
const titleOf = (it) => it.kind + (it.rooms > 0 ? ' ' + it.rooms + ' غرف' : '') + (it.area ? ' في ' + it.area : '');
const mapUrl = (it) => it.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((it.area ? it.area + ' ' : '') + it.city + ' الأردن'));

/* ---------- رسومات البيوت (بديل الصور) ---------- */
function art(kind, seed) {
  const bg = ['--art-a', '--art-b', '--art-c', '--art-d'][seed % 4];
  let s = '<rect width="160" height="90" fill="var(' + bg + ')"/><rect y="74" width="160" height="16" fill="var(--art-fg)" opacity=".16"/>';
  const win = (x, y) => '<rect x="' + x + '" y="' + y + '" width="8" height="9" rx="1.5" fill="var(--art-fg2)"/>';
  const F = 'fill="var(--art-fg)"';
  if (kind === 'شقة') { s += '<rect x="52" y="14" width="56" height="62" rx="3" ' + F + '/>'; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += win(60 + c * 16, 22 + r * 13); s += '<rect x="74" y="62" width="12" height="14" fill="var(--art-fg2)"/>'; }
  else if (kind === 'فيلا') { s += '<rect x="34" y="40" width="92" height="36" ' + F + '/><path d="M28 42 80 16l52 26z" ' + F + ' opacity=".85"/>' + win(46, 50) + win(62, 50) + win(90, 50) + win(106, 50) + '<rect x="74" y="58" width="12" height="18" fill="var(--art-fg2)"/>'; }
  else if (kind === 'دوبلكس') { s += '<rect x="44" y="22" width="72" height="54" ' + F + '/><rect x="44" y="47" width="72" height="3" fill="var(--art-fg2)" opacity=".6"/>' + win(54, 28) + win(76, 28) + win(98, 28) + win(54, 56) + win(98, 56) + '<rect x="74" y="58" width="12" height="18" fill="var(--art-fg2)"/>'; }
  else if (kind === 'استوديو') { s += '<rect x="56" y="32" width="48" height="44" ' + F + '/><rect x="52" y="30" width="56" height="5" fill="var(--art-fg)" opacity=".7"/>' + win(64, 42) + win(88, 42) + '<rect x="74" y="58" width="12" height="18" fill="var(--art-fg2)"/>'; }
  else if (kind === 'طابق أرضي') { s += '<rect x="38" y="44" width="84" height="32" ' + F + '/><rect x="38" y="40" width="84" height="6" fill="var(--art-fg)" opacity=".7"/>' + win(48, 54) + win(66, 54) + win(102, 54) + '<rect x="82" y="58" width="12" height="18" fill="var(--art-fg2)"/><circle cx="26" cy="66" r="9" fill="var(--art-fg)" opacity=".5"/><circle cx="138" cy="66" r="9" fill="var(--art-fg)" opacity=".5"/>'; }
  else { s += '<rect x="48" y="40" width="64" height="36" ' + F + '/><path d="M42 42 80 16l38 26z" ' + F + ' opacity=".85"/>' + win(58, 50) + win(94, 50) + '<rect x="74" y="56" width="12" height="20" fill="var(--art-fg2)"/>'; }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 160 90'); svg.setAttribute('class', 'art'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = s; // نص ثابت من الكود، ما فيه محتوى مستخدمين
  return svg;
}
function seedOf(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; }
function cover(it) {
  const p = it.photos && it.photos[0];
  return p ? el('img', { class: 'photo', src: p.url, alt: '', loading: 'lazy' }) : art(it.kind, seedOf(it.id));
}

/* ---------- تحميل البيانات ---------- */
async function load(force) {
  const tab = state.tab;
  state.error = null;
  if (!configured || (tab === 'mine' && !state.user)) { render(); return; }
  if (tab !== 'mine' && !force && state.data[tab] !== null) { render(); return; }
  state.loading = true; render();
  try {
    if (tab === 'mine') state.mine = (await fetchMine(state.user.uid)).map(clean);
    else state.data[tab] = (await fetchActive(tab)).map(clean);
  } catch (e) {
    state.error = e && e.code === 'failed-precondition' ? 'index' : (e && e.code) || 'error';
  }
  state.loading = false; render();
}

/* ---------- القائمة المعروضة ---------- */
function compute() {
  const tab = state.tab, f = state.filters;
  let base, demo = false;
  if (tab === 'mine') base = state.mine || [];
  else {
    base = (state.data[tab] || []).filter((i) => i.expiresAt > Date.now());
    const loaded = state.data[tab] !== null;
    if (!configured || (loaded && base.length === 0 && !state.error)) {
      base = DEMO.filter((d) => d.type === tab).map((d) => Object.assign({ photos: [], map: '', phone: '', ownerId: '', ownerName: '', status: 'active', expiresAt: 0, demo: true }, d));
      demo = true;
    }
  }
  const total = base.length;
  const items = base.filter((i) => (!f.city || i.city === f.city) && (!f.kind || i.kind === f.kind) && (!f.rooms || i.rooms >= f.rooms) && (!f.max || i.price <= f.max));
  items.sort((a, b) => (f.sort === 'asc' ? a.price - b.price : f.sort === 'desc' ? b.price - a.price : b.createdAt - a.createdAt));
  return { items, demo, total };
}

/* ---------- الرسم ---------- */
function renderWho() {
  const w = $('who'); w.replaceChildren();
  if (!configured) return;
  if (state.user) {
    const u = state.user;
    const face = u.photoURL ? el('img', { src: u.photoURL, alt: '', referrerpolicy: 'no-referrer' }) : el('span', { class: 'av', text: (u.displayName || '؟').slice(0, 1) });
    w.append(el('button', { class: 'me', type: 'button', onclick: openAccount, 'aria-label': 'حسابي' }, face, el('span', { class: 'n', text: u.displayName || 'حسابي' })));
  } else if (state.authReady) {
    w.append(el('button', { class: 'btn primary', type: 'button', onclick: () => doSignIn(), text: 'الدخول بحساب Google' }));
  }
}
const canAdd = () => configured && state.user;

function render() {
  TABS.forEach((t) => { const b = $('t-' + t); b.setAttribute('aria-selected', String(t === state.tab)); b.tabIndex = t === state.tab ? 0 : -1; });
  $('addBtn').hidden = !state.authReady && configured;
  const notice = $('notice'); notice.replaceChildren();
  const list = $('list'); list.replaceChildren();
  const res = compute();

  if (!configured) notice.append(el('div', { class: 'note', text: 'التطبيق لسا ما انربط بـ Firebase، فبتشوف عروض تجريبية فقط. اتبع خطوات README لربطه.' }));
  else if (state.error === 'index') notice.append(el('div', { class: 'note', text: 'قاعدة البيانات بحاجة فهرس لهالاستعلام. شغّل: firebase deploy --only firestore:indexes ثم أعد التحميل.' }));
  else if (state.error) notice.append(el('div', { class: 'note', text: 'تعذر تحميل العروض حالياً. تأكد من الإنترنت وجرّب مرة ثانية.' }));
  else if (res.demo) notice.append(el('div', { class: 'note info', text: 'هاي عروض تجريبية للتوضيح فقط وما بتحمل أرقام تواصل. أول عرض حقيقي بينضاف بيحلّ محلها.' }));

  $('filters').hidden = state.tab === 'mine' && res.total === 0;
  $('count').textContent = state.loading ? 'جارٍ تحميل العروض...' : (res.items.length ? 'عدد العروض: ' + res.items.length : '');
  if (state.loading) return;

  if (state.tab === 'mine' && !state.user) {
    list.append(el('div', { class: 'empty' }, el('strong', { text: 'سجّل دخولك لتشوف عروضك' }), el('p', { text: 'بتحتاج حساب Google عشان تنشر وتدير عروضك.' }),
      configured && state.authReady ? el('button', { class: 'btn primary', onclick: () => doSignIn(), text: 'الدخول بحساب Google' }) : null));
    return;
  }
  if (!res.items.length) {
    const mineEmpty = state.tab === 'mine' && res.total === 0;
    const box = el('div', { class: 'empty' }, el('strong', { text: mineEmpty ? 'ما نشرت أي عرض بعد' : 'ما في عروض مطابقة' }),
      el('p', { text: mineEmpty ? 'انشر بيتك للإيجار أو للبيع وخلّي الناس توصلك مباشرة.' : 'جرّب تغيّر المدينة أو السعر أو نوع العقار.' }));
    if (mineEmpty) box.append(el('button', { class: 'btn primary', onclick: openForm, text: '+ أضف أول عرض' }));
    else box.append(el('button', { class: 'btn', onclick: resetFilters, text: 'مسح التصفية' }));
    list.append(box); return;
  }
  res.items.forEach((it) => list.append(card(it)));
}
const priceLine = (it) => el('div', { class: 'price' }, num(it.price) + ' د.أ ', it.type === 'rent' ? el('small', { text: '/ شهرياً' }) : null);
function statusBadges(it) {
  const b = [];
  if (it.demo) b.push(el('span', { class: 'badge ex', text: 'مثال' }));
  if (it.furnished) b.push(el('span', { class: 'badge', text: 'مفروش' }));
  if (it.photos.length > 1) b.push(el('span', { class: 'badge', text: it.photos.length + ' صور' }));
  if (it.status === 'hidden') b.push(el('span', { class: 'badge ex', text: 'مخفي من الإدارة' }));
  else if (it.status === 'done') b.push(el('span', { class: 'badge done', text: it.type === 'rent' ? 'تم التأجير' : 'تم البيع' }));
  else if (!it.demo && it.expiresAt && it.expiresAt < Date.now()) b.push(el('span', { class: 'badge done', text: 'منتهي' }));
  if (state.tab === 'mine') b.push(el('span', { class: 'badge', text: it.type === 'rent' ? 'إيجار' : 'بيع' }));
  return b;
}
function card(it) {
  return el('button', { class: 'card', type: 'button', onclick: () => openDetail(it) },
    cover(it),
    el('div', { class: 'cbody' }, priceLine(it), el('div', { class: 'ctitle', text: titleOf(it) }),
      el('div', { class: 'loc', text: it.city + (it.area ? ' · ' + it.area : '') }),
      el('div', { class: 'chips' },
        el('span', { class: 'chip', text: it.rooms > 0 ? it.rooms + ' غرف' : 'استوديو' }),
        it.baths ? el('span', { class: 'chip', text: it.baths + ' حمام' }) : null,
        it.size ? el('span', { class: 'chip', text: it.size + ' م²' }) : null,
        statusBadges(it))));
}

/* ---------- تفاصيل العرض ---------- */
const waLink = (phone, it) => {
  let d = phone.replace(/\D/g, '');
  if (d.indexOf('00962') === 0) d = d.slice(2); else if (d.charAt(0) === '0') d = '962' + d.slice(1);
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent('مرحباً، بخصوص إعلانك على بيتك: ' + titleOf(it) + ' في ' + it.city);
};
const spec = (v, l) => el('div', { class: 'spec' }, el('b', { text: v }), el('span', { text: l }));
function copyText(t, btn) {
  const done = () => { btn.textContent = 'تم النسخ'; setTimeout(() => { btn.textContent = 'نسخ الرقم'; }, 1500); };
  const fallback = () => { const i = el('input', { value: t, readonly: true, style: 'position:fixed;opacity:0' }); document.body.append(i); i.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('انسخ الرقم يدوياً'); } i.remove(); };
  try { navigator.clipboard.writeText(t).then(done, fallback); } catch (e) { fallback(); }
}
function reportBlock(it) {
  const box = el('div', { class: 'contact' });
  const start = el('button', { class: 'btn', type: 'button', text: 'أبلغ عن الإعلان' });
  start.addEventListener('click', () => {
    if (!state.user) { toast('سجّل دخولك أولاً عشان تبلّغ'); doSignIn(); return; }
    const sel = el('select', { class: 'field', 'aria-label': 'سبب البلاغ' }, REASONS.map((r) => el('option', { value: r, text: r })));
    const send = el('button', { class: 'btn primary', type: 'button', text: 'إرسال البلاغ' });
    send.addEventListener('click', async () => {
      send.disabled = true;
      try { await report(it.id, state.user.uid, sel.value); box.replaceChildren(el('span', { class: 'loc', text: 'وصلنا بلاغك. شكراً لمساعدتك.' })); }
      catch (e) { send.disabled = false; toast('تعذر إرسال البلاغ. جرّب مرة ثانية.'); }
    });
    box.replaceChildren(el('span', { class: 'loc', text: 'سبب البلاغ' }), sel, send);
  });
  box.append(start);
  return box;
}
function openDetail(it) {
  const dlg = $('detail'); dlg.replaceChildren();
  const mine = !it.demo && state.user && it.ownerId === state.user.uid;
  let contact;
  if (it.demo) contact = el('div', { class: 'contact' }, el('strong', { text: 'عرض تجريبي' }), el('span', { class: 'loc', text: 'هذا مثال للتوضيح. لا يوجد رقم تواصل.' }));
  else if (!it.phone) contact = el('div', { class: 'contact' }, el('span', { class: 'loc', text: 'لا يوجد رقم تواصل.' }));
  else {
    const copyBtn = el('button', { class: 'btn', type: 'button', text: 'نسخ الرقم', onclick: () => copyText(it.phone, copyBtn) });
    contact = el('div', { class: 'contact' }, el('span', { class: 'loc', text: 'للتواصل مع المعلن' }), el('div', { class: 'phone', text: it.phone }),
      el('div', { class: 'row' }, el('a', { class: 'btn primary', href: waLink(it.phone, it), target: '_blank', rel: 'noopener noreferrer', text: 'واتساب' }), copyBtn));
  }
  const mapBlock = el('div', { class: 'contact' }, el('span', { class: 'loc', text: it.map ? 'الموقع الدقيق حسب المعلن' : 'الموقع التقريبي حسب المنطقة' }),
    el('a', { class: 'btn', href: mapUrl(it), target: '_blank', rel: 'noopener noreferrer', text: '📍 افتح على خرائط جوجل' }));
  const date = it.createdAt ? new Date(it.createdAt).toLocaleDateString('en-GB') : '';
  const media = it.photos.length ? el('div', { class: 'gallery' }, it.photos.map((p) => el('img', { class: 'photo', src: p.url, alt: '', loading: 'lazy' }))) : art(it.kind, seedOf(it.id));
  const body = el('div', { class: 'pad', style: 'display:flex;flex-direction:column;gap:12px' },
    el('div', { class: 'sheethead' }, el('div', {}, priceLine(it), el('h2', { text: titleOf(it) })), el('button', { class: 'x', type: 'button', onclick: () => dlg.close(), 'aria-label': 'إغلاق', text: '✕' })),
    el('div', { class: 'loc', text: '📍 ' + it.city + (date ? '  ·  نُشر ' + date : '') }),
    el('div', { class: 'specs' }, spec(it.rooms > 0 ? String(it.rooms) : 'استوديو', 'غرف النوم'), spec(String(it.baths || '-'), 'الحمامات'), spec(it.size ? it.size + ' م²' : '-', 'المساحة'),
      spec(it.furnished ? 'مفروش' : (it.type === 'rent' ? 'غير مفروش' : it.kind), it.type === 'rent' ? 'الأثاث' : 'النوع')),
    it.desc ? el('p', { style: 'margin:0;overflow-wrap:anywhere', text: it.desc }) : null,
    !it.demo && it.ownerName ? el('div', { class: 'loc', text: 'المعلن: ' + (mine ? 'أنت' : it.ownerName) }) : null,
    mapBlock, contact, !it.demo && !mine ? reportBlock(it) : null);

  if (mine) {
    const expired = it.expiresAt && it.expiresAt < Date.now();
    if (it.expiresAt) body.append(el('div', { class: 'loc', text: expired ? 'انتهت مدة العرض. جدّده ليظهر من جديد.' : 'ينتهي بعد ' + Math.max(1, Math.ceil((it.expiresAt - Date.now()) / DAY)) + ' يوم' }));
    const act = (fn, msg) => async () => { try { await fn(); dlg.close(); toast(msg); state.data = { rent: null, sale: null }; await loadMine(); } catch (e) { toast('تعذر تنفيذ العملية. جرّب مرة ثانية.'); } };
    const row = el('div', { class: 'row' });
    if (it.status !== 'hidden') {
      row.append(el('button', { class: 'btn', type: 'button', text: 'تجديد ' + OPTIONS.listingDays + ' يوم', onclick: act(() => renew(it.id), 'تم تجديد العرض') }));
      row.append(el('button', { class: 'btn', type: 'button', text: it.status === 'done' ? 'إعادة نشر العرض' : (it.type === 'rent' ? 'تعليم كمؤجّر' : 'تعليم كمباع'),
        onclick: act(() => setStatus(it.id, it.status === 'done' ? 'active' : 'done'), 'تم تحديث العرض') }));
    }
    const del = el('button', { class: 'btn danger', type: 'button', text: 'حذف العرض' });
    del.addEventListener('click', () => {
      if (state.confirmDel !== it.id) { state.confirmDel = it.id; del.textContent = 'اضغط مرة ثانية للتأكيد'; return; }
      state.confirmDel = null; act(() => removeListing(it), 'تم حذف العرض')();
    });
    row.append(del); body.append(row);
  }
  dlg.append(el('div', { class: 'sheet' }, media, body));
  dlg.showModal();
}
async function loadMine() { if (state.user) { state.mine = null; if (state.tab === 'mine') await load(true); else render(); } }

/* ---------- الحساب ---------- */
function openAccount() {
  const dlg = $('accountDlg'); dlg.replaceChildren();
  const u = state.user; if (!u) return;
  const del = el('button', { class: 'btn danger', type: 'button', text: 'حذف حسابي وكل عروضي' });
  del.addEventListener('click', async () => {
    if (state.confirmDel !== 'account') { state.confirmDel = 'account'; del.textContent = 'اضغط مرة ثانية لتأكيد الحذف النهائي'; return; }
    state.confirmDel = null; del.disabled = true;
    try { await deleteAccount(u); dlg.close(); toast('تم حذف حسابك وعروضك'); state.mine = null; state.data = { rent: null, sale: null }; }
    catch (e) { del.disabled = false; toast('تعذر حذف الحساب. سجّل خروج ودخول مرة ثانية وجرّب.'); }
  });
  dlg.append(el('div', { class: 'sheet' }, el('div', { class: 'pad', style: 'display:flex;flex-direction:column;gap:12px;padding-top:16px' },
    el('div', { class: 'sheethead' }, el('h2', { text: 'حسابي' }), el('button', { class: 'x', type: 'button', onclick: () => dlg.close(), 'aria-label': 'إغلاق', text: '✕' })),
    el('div', {}, el('strong', { text: u.displayName || '' }), el('div', { class: 'loc', text: u.email || '' })),
    el('div', { class: 'row' }, el('button', { class: 'btn', type: 'button', text: 'تسجيل الخروج', onclick: async () => { await logOut(); dlg.close(); } }), del),
    el('p', { class: 'hint', text: 'حذف الحساب بيمسح عروضك وصورك نهائياً.' }))));
  dlg.showModal();
}
async function doSignIn() { try { await signIn(); } catch (e) { toast('تعذر تسجيل الدخول. جرّب مرة ثانية.'); } }

/* ---------- نموذج الإضافة ---------- */
function fillSelect(sel, opts, first) {
  sel.replaceChildren();
  if (first != null) sel.append(el('option', { value: '', text: first }));
  opts.forEach((o) => sel.append(el('option', { value: o.v, text: o.t })));
}
const curType = () => document.querySelector('input[name="type"]:checked').value;
function syncType() {
  const sale = curType() === 'sale';
  $('n-price-l').textContent = sale ? 'سعر البيع (دينار)' : 'الإيجار الشهري (دينار)';
  $('n-price').placeholder = sale ? '65000' : '350';
  $('n-furn-w').hidden = sale;
}
function openForm() {
  if (!configured) { toast('التطبيق لسا ما انربط بـ Firebase'); return; }
  if (!state.user) { toast('سجّل دخولك بحساب Google أولاً'); doSignIn(); return; }
  $('addForm').reset(); state.photos = []; drawThumbs(); $('n-rooms').value = '3'; $('formErr').textContent = '';
  document.querySelector('input[name="type"][value="' + (state.tab === 'sale' ? 'sale' : 'rent') + '"]').checked = true;
  syncType(); $('formDlg').showModal();
}
const normPhone = (raw) => {
  let d = String(raw).replace(/\D/g, '');
  if (d.indexOf('00962') === 0) d = '0' + d.slice(5); else if (d.indexOf('962') === 0) d = '0' + d.slice(3);
  return /^07[789]\d{7}$/.test(d) ? d : null;
};

async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.82, blob;
  do { blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q)); q -= 0.15; } while (blob && blob.size >= 900 * 1024 && q > 0.3);
  return blob;
}
function drawThumbs() {
  const t = $('thumbs'); t.replaceChildren();
  state.photos.forEach((p, i) => t.append(el('div', { class: 'th' }, el('img', { src: p.url, alt: '' }),
    el('button', { type: 'button', 'aria-label': 'حذف الصورة', text: '✕', onclick: () => { URL.revokeObjectURL(p.url); state.photos.splice(i, 1); drawThumbs(); } }))));
}
async function onPhotos(e) {
  const files = Array.from(e.target.files || []); e.target.value = '';
  for (const f of files) {
    if (state.photos.length >= OPTIONS.maxPhotos) { toast('الحد الأقصى ' + OPTIONS.maxPhotos + ' صور'); break; }
    if (!/^image\//.test(f.type)) continue;
    try { const blob = await shrink(f); if (blob) state.photos.push({ blob, url: URL.createObjectURL(blob) }); } catch (err) { toast('تعذر قراءة إحدى الصور'); }
  }
  drawThumbs();
}

async function submitForm(e) {
  e.preventDefault();
  const type = curType(), err = $('formErr');
  const price = Math.round(Number($('n-price').value));
  const maxP = type === 'rent' ? 100000 : 50000000;
  const phone = normPhone($('n-phone').value);
  const area = $('n-area').value.trim();
  if (!(price >= 1 && price <= maxP)) { err.textContent = 'أدخل السعر بالدينار بشكل صحيح.'; $('n-price').focus(); return; }
  if (!phone) { err.textContent = 'أدخل رقم أردني صحيح مثل 0791234567.'; $('n-phone').focus(); return; }
  if (area.length < 2) { err.textContent = 'اكتب اسم المنطقة أو الحي.'; $('n-area').focus(); return; }
  const mapRaw = $('n-map').value.trim(); let map = '';
  if (mapRaw) { map = safeMap(mapRaw); if (!map) { err.textContent = 'الرابط لازم يكون من خرائط جوجل (maps.app.goo.gl أو google.com/maps).'; $('n-map').focus(); return; } }
  const data = {
    type, kind: $('n-kind').value, city: $('n-city').value, area, price,
    rooms: Number($('n-rooms').value), baths: Number($('n-baths').value),
    size: $('n-size').value ? clampInt($('n-size').value, 0, 100000) : 0,
    furnished: type === 'rent' && $('n-furn').checked, phone, map, desc: $('n-desc').value.trim().slice(0, 600),
  };
  const btn = $('submitBtn'); btn.disabled = true; err.textContent = '';
  try {
    const mine = state.mine || (await fetchMine(state.user.uid));
    if (mine.length >= OPTIONS.maxListingsPerUser) { err.textContent = 'وصلت للحد الأقصى (' + OPTIONS.maxListingsPerUser + ' عرض). احذف عرضاً قديماً أولاً.'; btn.disabled = false; return; }
    if (state.photos.length) err.textContent = 'جارٍ رفع الصور...';
    await createListing(state.user, data, state.photos.map((p) => p.blob));
    err.textContent = ''; $('formDlg').close(); toast('تم نشر عرضك');
    state.data = { rent: null, sale: null }; state.mine = null;
    go(type);
  } catch (ex) {
    err.textContent = ex && ex.code === 'permission-denied' ? 'ما عندك صلاحية النشر. تأكد من تسجيل الدخول وجرّب مرة ثانية.' : 'تعذر النشر. جرّب مرة ثانية.';
  }
  btn.disabled = false;
}

/* ---------- تنقل وتصفية ---------- */
function go(tab) {
  if (location.hash.slice(1) === tab) { state.tab = tab; load(true); } else location.hash = tab;
}
function readHash() { const h = location.hash.slice(1); state.tab = TABS.indexOf(h) >= 0 ? h : 'rent'; load(false); }
function resetFilters() {
  state.filters = { city: '', kind: '', rooms: 0, max: 0, sort: 'new' };
  $('f-city').value = ''; $('f-kind').value = ''; $('f-rooms').value = ''; $('f-max').value = ''; $('f-sort').value = 'new'; render();
}
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }

function setup() {
  fillSelect($('f-city'), CITIES.map((c) => ({ v: c, t: c })), 'كل المدن');
  fillSelect($('f-kind'), KINDS.map((c) => ({ v: c, t: c })), 'كل الأنواع');
  fillSelect($('f-rooms'), [1, 2, 3, 4, 5].map((n) => ({ v: String(n), t: n + ' غرف أو أكثر' })), 'عدد الغرف');
  fillSelect($('n-kind'), KINDS.map((c) => ({ v: c, t: c })));
  fillSelect($('n-city'), CITIES.map((c) => ({ v: c, t: c })));
  fillSelect($('n-rooms'), [{ v: '0', t: 'استوديو' }].concat([1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ v: String(n), t: String(n) }))));
  fillSelect($('n-baths'), [1, 2, 3, 4, 5].map((n) => ({ v: String(n), t: String(n) })));
  $('f-city').onchange = function () { state.filters.city = this.value; render(); };
  $('f-kind').onchange = function () { state.filters.kind = this.value; render(); };
  $('f-rooms').onchange = function () { state.filters.rooms = Number(this.value) || 0; render(); };
  $('f-sort').onchange = function () { state.filters.sort = this.value; render(); };
  $('f-max').oninput = function () { state.filters.max = Number(this.value) || 0; render(); };
  document.querySelectorAll('input[name="type"]').forEach((r) => { r.onchange = syncType; });
  $('addBtn').onclick = openForm;
  $('formX').onclick = $('formCancel').onclick = () => $('formDlg').close();
  $('addForm').addEventListener('submit', submitForm);
  $('n-photos').addEventListener('change', onPhotos);
  $('maxPh').textContent = String(OPTIONS.maxPhotos);
  $('photoBox').hidden = !OPTIONS.photos;
  document.querySelectorAll('.seg button').forEach((b) => { b.onclick = () => { location.hash = b.dataset.tab; }; });
  ['detail', 'formDlg', 'accountDlg'].forEach((id) => { const d = $(id); d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); });
  window.addEventListener('hashchange', readHash);
}

setup();
readHash();
watchAuth((u) => {
  state.user = u; state.authReady = true; state.mine = null;
  renderWho();
  if (state.tab === 'mine') load(true); else render();
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
