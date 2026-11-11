// طبقة البيانات: كل التعامل مع تسجيل الدخول وFirestore وStorage بيمرّ من هون.
import * as F from './firebase.js';

const { auth, db, OPTIONS, configured } = F;
const DAY = 86400000;

export { configured, OPTIONS };

/* ---------- تسجيل الدخول ---------- */
export function watchAuth(cb) {
  if (!configured) { cb(null); return () => {}; }
  F.getRedirectResult(auth).catch(() => {});
  return F.onAuthStateChanged(auth, cb);
}

export async function signIn() {
  const provider = new F.GoogleAuthProvider();
  try {
    await F.signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await F.signInWithRedirect(auth, provider);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export const logOut = () => F.signOut(auth);

export async function isAdmin(uid) {
  try { return (await F.getDoc(F.doc(db, 'admins', uid))).exists(); } catch (e) { return false; }
}

/* ---------- الإعلانات ---------- */
function toItem(d) {
  const x = d.data();
  return Object.assign({}, x, {
    id: d.id,
    createdAt: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now(),
    expiresAt: x.expiresAt && x.expiresAt.toMillis ? x.expiresAt.toMillis() : 0,
  });
}

export async function fetchActive(type) {
  const q = F.query(
    F.collection(db, 'listings'),
    F.where('status', '==', 'active'),
    F.where('type', '==', type),
    F.orderBy('createdAt', 'desc'),
    F.limit(OPTIONS.fetchLimit),
  );
  return (await F.getDocs(q)).docs.map(toItem);
}

export async function fetchMine(uid) {
  const q = F.query(F.collection(db, 'listings'), F.where('ownerId', '==', uid));
  return (await F.getDocs(q)).docs.map(toItem).sort((a, b) => b.createdAt - a.createdAt);
}

const photosCol = (id) => F.collection(db, 'listings', id, 'photos');

async function deletePhotoDocs(id) {
  const snap = await F.getDocs(photosCol(id));
  await Promise.all(snap.docs.map((d) => F.deleteDoc(d.ref)));
}

// صور العرض الكاملة (بتنحمّل بس لما يفتح الزائر العرض)
export async function fetchPhotos(id) {
  const snap = await F.getDocs(photosCol(id));
  return snap.docs.map((d) => d.data()).sort((a, b) => a.idx - b.idx).map((x) => x.data);
}

// data: الحقول بدون المالك والحالة والتواريخ. photos: [{full, thumb}] نصوص base64 مصغّرة.
export async function createListing(user, data, photos) {
  const list = OPTIONS.photos ? photos.slice(0, OPTIONS.maxPhotos) : [];
  const docRef = F.doc(F.collection(db, 'listings'));
  try {
    await F.setDoc(docRef, Object.assign({}, data, {
      ownerId: user.uid,
      ownerName: String(user.displayName || '').slice(0, 80),
      thumb: list.length ? list[0].thumb : '',
      photoCount: list.length,
      status: 'active',
      createdAt: F.serverTimestamp(),
      expiresAt: F.Timestamp.fromMillis(Date.now() + OPTIONS.listingDays * DAY),
    }));
    for (let i = 0; i < list.length; i++) {
      await F.setDoc(F.doc(db, 'listings', docRef.id, 'photos', String(i)), { idx: i, data: list[i].full });
    }
    return docRef.id;
  } catch (e) {
    try { await deletePhotoDocs(docRef.id); await F.deleteDoc(docRef); } catch (e2) { /* ignore */ }
    throw e;
  }
}

export const setStatus = (id, status) => F.updateDoc(F.doc(db, 'listings', id), { status: status });

export const renew = (id) => F.updateDoc(F.doc(db, 'listings', id), {
  status: 'active',
  expiresAt: F.Timestamp.fromMillis(Date.now() + OPTIONS.listingDays * DAY),
});

export async function removeListing(item) {
  await deletePhotoDocs(item.id);
  await F.deleteDoc(F.doc(db, 'listings', item.id));
}

export const report = (listingId, uid, reason) => F.setDoc(F.doc(F.collection(db, 'reports')), {
  listingId: listingId,
  reporterId: uid,
  reason: String(reason).slice(0, 300),
  createdAt: F.serverTimestamp(),
});

/* ---------- حذف الحساب ---------- */
export async function deleteAccount(user) {
  const mine = await fetchMine(user.uid);
  for (const it of mine) await removeListing(it);
  try {
    await F.deleteUser(user);
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      await F.reauthenticateWithPopup(user, new F.GoogleAuthProvider());
      await F.deleteUser(user);
    } else {
      throw e;
    }
  }
}
