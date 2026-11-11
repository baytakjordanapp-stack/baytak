// نقطة الاتصال الوحيدة مع Firebase. بقية الملفات ما بتستورد من Firebase مباشرة.
import { firebaseConfig, OPTIONS } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, deleteUser, reauthenticateWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export const configured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('PASTE');

let app = null, auth = null, db = null;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // عدّاد الزوار (Google Analytics). بيشتغل فقط إذا measurementId موجود، وأي فشل فيه ما بيأثر على التطبيق.
  if (firebaseConfig.measurementId) {
    analyticsSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});
  }
}

export { OPTIONS, auth, db };
export {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, deleteUser, reauthenticateWithPopup,
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, Timestamp,
};
