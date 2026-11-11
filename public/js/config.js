// الخطوة الوحيدة المطلوبة منك: الصق إعدادات مشروع Firebase هون.
// Firebase Console > Project settings > Your apps > Web app > SDK setup and configuration > Config
export const firebaseConfig = {
  apiKey: 'AIzaSyBMw6T9dBfuwkY7WJ0VwSbEPvg9QXqfO2w',
  authDomain: 'baytak-21d0e.firebaseapp.com',
  projectId: 'baytak-21d0e',
  storageBucket: 'baytak-21d0e.firebasestorage.app',
  messagingSenderId: '815944191226',
  appId: '1:815944191226:web:eb39b678a3a687916a8d43',
};

export const OPTIONS = {
  // اجعلها false إذا بقيت على خطة Spark المجانية ولا تريد رفع الصور (Storage قد يحتاج خطة الدفع حسب الاستخدام).
  photos: true,
  maxPhotos: 5,
  maxListingsPerUser: 30,
  listingDays: 60,
  fetchLimit: 40,
  contactEmail: 'baytak.jordan.app@gmail.com',
};
