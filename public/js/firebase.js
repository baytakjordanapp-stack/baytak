// نقطة الاتصال الوحيدة مع Firebase. بقية الملفات ما بتستورد من Firebase مباشرة.
import { firebaseConfig, OPTIONS } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, deleteUser, reauthenticateWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

export const configured = !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('PASTE');

let app = null, auth = null, db = null, storage = null;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (OPTIONS.photos) storage = getStorage(app);
}

export { OPTIONS, auth, db, storage };
export {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, deleteUser, reauthenticateWithPopup,
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, Timestamp,
  ref, uploadBytes, getDownloadURL, deleteObject,
};
