// نسخة وهمية من Firebase للاختبار المحلي بدون إنترنت
window.__db = window.__db || {};
const store = window.__db; let listeners = [], user = null, idn = 0;
const TS = (ms) => ({ toMillis: () => ms, _ms: ms });
export const Timestamp = { fromMillis: TS };
export const serverTimestamp = () => ({ __st: true });
const mat = (o) => { const r = {}; for (const k in o) r[k] = o[k] && o[k].__st ? TS(Date.now()) : o[k]; return r; };
export const initializeApp = () => ({});
export const getAuth = () => ({}); export const getFirestore = () => ({}); export const getStorage = () => ({});
export class GoogleAuthProvider {}
export const onAuthStateChanged = (a, cb) => { listeners.push(cb); setTimeout(() => cb(user), 0); return () => {}; };
export const getRedirectResult = async () => null;
export const signInWithPopup = async () => { user = { uid: 'u1', displayName: 'أمير', email: 'a@b.c', photoURL: '' }; listeners.forEach((l) => l(user)); };
export const signInWithRedirect = signInWithPopup; export const reauthenticateWithPopup = async () => {};
export const signOut = async () => { user = null; listeners.forEach((l) => l(null)); };
export const deleteUser = async () => { user = null; listeners.forEach((l) => l(null)); };
export const collection = (db, ...p) => ({ _c: p.join('/') });
export const doc = (a, ...p) => a._c ? { _c: a._c, id: 'id' + (++idn) } : { _c: p.slice(0, -1).join('/'), id: p[p.length - 1] };
export const setDoc = async (r, d) => { (store[r._c] = store[r._c] || {})[r.id] = mat(d); };
export const updateDoc = async (r, d) => { Object.assign(store[r._c][r.id], mat(d)); };
export const deleteDoc = async (r) => { delete store[r._c][r.id]; };
export const getDoc = async (r) => { const v = (store[r._c] || {})[r.id]; return { exists: () => !!v, data: () => v }; };
export const where = (f, op, v) => ({ w: [f, v] }); export const orderBy = (f, d) => ({ o: [f, d] }); export const limit = (n) => ({ l: n });
export const query = (c, ...cs) => ({ c, cs });
export const getDocs = async (q) => {
  if (q._c !== undefined) q = { c: q, cs: [] };
  let rows = Object.entries(store[q.c._c] || {}).map(([id, v]) => ({ id, v }));
  q.cs.forEach((x) => { if (x.w) rows = rows.filter((r) => { const a = r.v[x.w[0]]; return a === x.w[1]; }); });
  const o = q.cs.find((x) => x.o); if (o) rows.sort((a, b) => b.v[o.o[0]].toMillis() - a.v[o.o[0]].toMillis());
  const docs = rows.map((r) => ({ id: r.id, data: () => r.v, ref: { _c: q.c._c, id: r.id } }));
  return { docs, size: docs.length, empty: !docs.length };
};
export const ref = (s, p) => ({ p }); export const uploadBytes = async () => {}; export const getDownloadURL = async () => 'https://example.com/p.jpg'; export const deleteObject = async () => {};
