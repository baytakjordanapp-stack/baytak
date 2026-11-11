# بيتك

تطبيق ويب (PWA) لعرض بيوت وشقق للإيجار والبيع في الأردن. بيتثبّت على الموبايل من المتصفح. الدخول بحساب Google، والبيانات على Firebase.

## الملفات
- `public/` موقع التطبيق كامل (بدون أي بناء أو تثبيت).
- `public/js/config.js` الملف الوحيد اللي بتعدّله.
- `firestore.rules` و`firestore.indexes.json` قواعد الأمان والفهرس.
- `tests/` اختبار محلي بنسخة Firebase وهمية (اختياري).

## أولاً: Firebase
1. ادخل https://console.firebase.google.com بحساب Gmail وأنشئ مشروعاً جديداً.
2. **Build ← Authentication ← Get started ← Google ← Enable**، واختر بريدك للدعم.
3. **Build ← Firestore Database ← Create database** (اختر موقعاً قريباً، مثل `eur3` أو `me-central1`، ووضع Production).
4. الصور بتتخزن داخل Firestore نفسه (مصغّرة، حتى 5 صور للعرض)، فما بتحتاج Storage ولا خطة Blaze.
5. **Project settings ← General ← Your apps ← أيقونة الويب `</>`**، سجّل تطبيقاً، وانسخ `firebaseConfig`.
6. الصق القيم بـ `public/js/config.js` واكتب بريدك بـ `contactEmail`.

## ثانياً: القواعد والفهرس
انسخ محتوى `firestore.rules` للوحة Firebase (وأعد نشره كلما تغيّر الملف) (Firestore ← Rules ← Publish).
الفهرس: أول مرة يفتح التطبيق وفي رسالة عن فهرس مطلوب، اضغط الرابط بالـ Console (أو انسخه من `firestore.indexes.json` يدوياً: collection `listings`، الحقول `status` ثم `type` ثم `createdAt` تنازلي).
أو بالأوامر: `npm i -g firebase-tools && firebase login && firebase use --add && firebase deploy`.

## ثالثاً: النشر
**خيار أ: Firebase Hosting** (الأسهل): `firebase deploy` بينشر مجلد `public`. بتاخد رابط `https://اسم-المشروع.web.app`.

**خيار ب: GitHub Pages**: ارفع المشروع (انظر أدناه)، ثم Settings ← Pages ← Source: GitHub Actions أو انشر محتوى `public` فقط.
بعد النشر لازم تضيف نطاق الموقع: **Authentication ← Settings ← Authorized domains ← Add domain** (مثال `اسمك.github.io`). بدونه بيفشل تسجيل الدخول.

## رفع المشروع على GitHub
1. أنشئ حساباً على github.com ومستودعاً جديداً اسمه `baytak` (Public أو Private).
2. أسهل طريقة: بالمستودع اضغط **Add file ← Upload files** واسحب كل محتويات المجلد، ثم **Commit**.
3. أو بالأوامر:
```
git init && git add . && git commit -m "first version"
git branch -M main
git remote add origin https://github.com/USERNAME/baytak.git
git push -u origin main
```
ملاحظة: مفاتيح `firebaseConfig` ليست أسراراً (الحماية الحقيقية بالقواعد)، فمقبول رفعها.

## تعيين مدير
1. سجّل دخولاً بالتطبيق مرة بحسابك.
2. **Authentication ← Users** وانسخ الـ UID الخاص بك.
3. **Firestore ← Start collection**: اسمها `admins`، معرّف الوثيقة = UID، وحقل أي قيمة (مثل `ok: true`).
4. افتح `/admin.html` لمراجعة البلاغات وإخفاء أو حذف الإعلانات.

## الاختبار المحلي
`node tests/run.js` (يحتاج Node وPlaywright). الاختبار بيستخدم Firebase وهمي، فما بيختبر القواعد الحقيقية.

## ما انختبر وما لا
مُختبَر بنسخة وهمية: الواجهة، التصفية، النشر، التحقق من الهاتف ورابط الخرائط، التعليم كمؤجّر، الحذف.
غير مُختبَر على Firebase الحقيقي: قواعد الصور الجديدة. (الفهرس وتسجيل الدخول والنشر جُرّبت على الموقع الحقيقي.) جرّبها بعد الربط بحسابك قبل الإطلاق.
قبل الإطلاق: راجع `privacy.html` و`terms.html` مع مختص قانوني.
