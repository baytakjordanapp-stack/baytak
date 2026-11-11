// لوحة إدارة بسيطة: البلاغات الأخيرة، مع إخفاء أو حذف الإعلان. الصلاحية الفعلية من قواعد Firestore، مش من هالصفحة.
import * as F from './firebase.js';
import { configured, watchAuth, signIn, isAdmin } from './data.js';

const msg = document.getElementById('msg');
const out = document.getElementById('out');
const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

async function loadReports() {
  out.replaceChildren();
  msg.textContent = 'جارٍ تحميل البلاغات...';
  const snap = await F.getDocs(F.query(F.collection(F.db, 'reports'), F.orderBy('createdAt', 'desc'), F.limit(50)));
  if (snap.empty) { msg.textContent = 'ما في بلاغات.'; return; }
  msg.textContent = 'عدد البلاغات: ' + snap.size;
  for (const r of snap.docs) {
    const rep = r.data();
    const row = mk('div', 'admin-row');
    row.append(mk('strong', '', 'السبب: ' + rep.reason));
    let listing = null;
    try { const l = await F.getDoc(F.doc(F.db, 'listings', rep.listingId)); if (l.exists()) listing = l.data(); } catch (e) { /* ignore */ }
    if (listing) {
      row.append(mk('div', 'loc', listing.kind + ' · ' + listing.city + ' · ' + listing.area + ' · ' + listing.price + ' د.أ'));
      row.append(mk('div', 'loc', 'المعلن: ' + listing.ownerName + ' · ' + listing.phone + ' · الحالة: ' + listing.status));
    } else row.append(mk('div', 'loc', 'الإعلان غير موجود (محذوف).'));
    const act = mk('div', 'row');
    const btn = (t, cls, fn) => {
      const b = mk('button', 'btn ' + cls, t); b.type = 'button';
      b.onclick = async () => { b.disabled = true; try { await fn(); await loadReports(); } catch (e) { b.disabled = false; alert('فشلت العملية: ' + (e.code || e.message)); } };
      act.append(b);
    };
    if (listing && listing.status !== 'hidden') btn('إخفاء الإعلان', '', () => F.updateDoc(F.doc(F.db, 'listings', rep.listingId), { status: 'hidden' }));
    if (listing && listing.status === 'hidden') btn('إعادة إظهار', '', () => F.updateDoc(F.doc(F.db, 'listings', rep.listingId), { status: 'active' }));
    if (listing) btn('حذف الإعلان', 'danger', () => F.deleteDoc(F.doc(F.db, 'listings', rep.listingId)));
    btn('تجاهل البلاغ', '', () => F.deleteDoc(r.ref));
    row.append(act); out.append(row);
  }
}

if (!configured) msg.textContent = 'التطبيق لسا ما انربط بـ Firebase.';
else watchAuth(async (u) => {
  out.replaceChildren();
  if (!u) {
    msg.textContent = 'سجّل دخولك بحساب المدير.';
    const b = mk('button', 'btn primary', 'الدخول بحساب Google'); b.onclick = () => signIn().catch(() => {}); out.append(b); return;
  }
  if (!(await isAdmin(u.uid))) { msg.textContent = 'هذا الحساب ليس مديراً.'; return; }
  try { await loadReports(); } catch (e) { msg.textContent = 'تعذر التحميل: ' + (e.code || e.message); }
});
