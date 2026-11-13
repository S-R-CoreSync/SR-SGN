# تطبيق الموبايل لمنصة الجالية السورية في هولندا (SGN Mobile App)

تطبيق تفاعلي للهواتف الذكية (iOS & Android) مبني باستخدام **Expo 54** و **React Native 0.81**، متصل بمنصة SGN الرقمية.

---

## 🌐 روابط الاتصال بالخادم

* **الخادم الحي المباشر (Production API)**: `https://sgn-drab.vercel.app/api`
* **الخادم المحلي للتطوير (Local Dev API)**: `http://localhost:3000/api`

---

## 🚀 البدء السريع والتشغيل

### 1. تثبيت الاعتماديات
```bash
cd mobile
npm install
```

### 2. التبديل بين بيئات العمل
* للربط مع السيرفر المحلي:
  ```bash
  npm run set:dev
  ```
* للربط مع السيرفر الحي المباشر (Vercel):
  ```bash
  npm run set:prod
  ```

### 3. تشغيل التطبيق
```bash
npm start
```
* يمكنك مسح رمز الـ QR عبر تطبيق **Expo Go** على هاتفك.
* أو تشغيل نسخة الويب: `npm run web`

---

## 📦 بناء حزم التطبيق (Production Build)

* **أندرويد (Android APK / AAB)**:
  ```bash
  npm run build:android
  ```
* **آيفون (iOS)**:
  ```bash
  npm run build:ios
  ```
* **الويب (Mobile Web Export)**:
  ```bash
  npm run build:web
  ```

---

## 🗂 بنية الملفات

* `app/`: شاشات ومسارات التطبيق (Expo Router)
* `constants/config.ts`: إعدادات البيئة وروابط الـ API
* `i18n/`: ملفات الترجمة الثلاثية (العربية، الإنجليزية، الهولندية)
* `lib/`: دوال الاتصال بالـ API ومحرك الترجمة والتنبيهات

