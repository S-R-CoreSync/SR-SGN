# AGENTS.md — Project-wide rules for AI agents

> **Always read this file first** before making any changes.

## 🎯 Golden Rule

**EVERY change must be applied ACROSS ALL parts of the project:**
- ✅ **Web app** — `src/` (Next.js + i18n)
- ✅ **Mobile app** — `mobile/` (Expo React Native, separate i18n)
- ✅ **API routes** — shared between web + mobile
- ✅ **i18n keys** — if added to web, also add to mobile (and vice versa)
- ✅ **Prisma schema** — changes affect both web API and mobile API calls

## 📤 Git Rule (مهم جداً)

**كل تعديل للمشروع على الهارد ديسك لازم:**
1. ✅ يترفع للمستودع العام الأساسي `https://github.com/S-R-CoreSync/SR-SGN.git`
2. ✅ يتحدث رابط الزبون بعد الـ push: `https://sgn-drab.vercel.app`
3. ✅ `git add -A && git commit -m "وصف التعديل" && git push`

## 🔒 قاعدة العزل اللغوي الصارم والمطلق (ممنوع التعديل عليها نهائياً دون إذن مسبق)

**أمر صارم ودائم من صاحب المشروع:**
1. **القسم الإنجليزي (`/en`):**
   - أحرف إنجليزية فقط.
   - أرقام لاتينية/غربية فقط (`1, 2, 3...`) وبخط لاتيني (`system-ui, sans-serif`).
   - ممنوع منعاً باتاً ظهور أي كلمة، حرف، رقم، أو خط عربي.
2. **القسم الهولندي (`/nl`):**
   - أحرف هولندية فقط.
   - أرقام لاتينية/غربية فقط (`1, 2, 3...`) وبخط لاتيني (`system-ui, sans-serif`).
   - ممنوع منعاً باتاً ظهور أي كلمة، حرف، رقم، أو خط عربي.
3. **القسم العربي (`/` أو `/ar`):**
   - أحرف عربية نقية فقط.
   - أرقام مشرقية عربية ناصعة (`١، ٢، ٣، ٤...`) في كافة أرجاء الموقع (مواقيت الصلاة، التواريخ الهجرية، إحصائيات الجالية، الخرائط، المقالات).
   - خط `Almarai` العربي النقي.
   - ممنوع منعاً باتاً ظهور أي مقال هولندي أو إنجليزي غير مترجم.
4. **تحذير للمطور / وكلاء الذكاء الاصطناعي:**
   - **ممنوع بتاتاً التعديل الجذري على هذه التعديلات أو دوالها (`formatLocalizedDigits`, `formatLocalizedNumber`, `isPureLocaleText`, `language-guard.ts`) إلا بعد سؤال وموافقة شخصية ومباشرة من صاحب المشروع.**

## 🗣️ لغة الحوار

**لغة الحوار الأساسية هنا هي العربية (اللهجة السورية).** كل الشرح والتعليمات والتواصل يكون بالعربي.

## 🏗 Project Structure

```
SGN/                          # ← Web app (Next.js 16 + i18n + Tailwind)
  src/
    app/                      # Routes: [locale]/ + api/
    components/               # React components
    lib/                      # Shared libraries
    messages/                 # Web i18n (ar.json, en.json, nl.json)
  mobile/                     # ← Mobile app (Expo React Native)
    app/                      # Screens (uses useI18n() hook)
    constants/                # Colors, API URL, config
    i18n/                     # Mobile i18n (ar.json, en.json, nl.json)
    lib/                      # i18n engine, API client
  prisma/                     # Database schema (shared)
  public/                     # Static files
```

## 📡 Deployment Target

| Target | URL | How |
|--------|-----|-----|
| **Vercel** | `https://sgn-drab.vercel.app` | `vercel --prod` |
| **Mobile APK/IPA** | N/A | `cd mobile && npm run build:android` |

> `sy-nl.org` هو موقع خارجي لجلب المعلومات والأخبار فقط — ليس من مشروعنا.

> 🚨 **قاعدة أمان إلزامية — لا ترفع ملفات `.env` إلى Vercel:**
> ملف `.vercelignore` في جذر المشروع يستثني `.env` و`.env.*` (ما عدا `.env.example`).
> **لا تحذف هذا السطر ولا تعطّل الملف.** السبب الحقيقي لعطل 18 نوفمبر 2026 (كل الصفحات 500):
> رُفع `.env.production` مع النشر وفيه قيم بديلة `[SENSITIVE]`، فقرأها Next.js في الإنتاج
> وكسر `DATABASE_URL` / `TURSO_DATABASE_URL` / `NEXTAUTH_URL` → `TypeError: Invalid URL`.
> متغيّرات الإنتاج تُضبط **فقط** من لوحة Vercel (Settings → Environment Variables).
> للتشخيص: `vercel curl <url>` (لأن روابط الدفعات محمية بـ SSO) + `GET /api/health`.

### 🔑 المتغيّرات الإلزامية على Vercel (تحقّق منها قبل أي نشر)

| المتغيّر | لماذا إلزامي |
|----------|--------------|
| `NEXTAUTH_SECRET` | توقيع جلسات NextAuth. **لا يوجد سرّ افتراضي في الكود** (كان موجوداً ومنشوراً = ثغرة تزوير جلسات). إن غاب: الجلسات تُفقد عند كل إعادة تشغيل. |
| `NEXTAUTH_URL` | `https://sgn-drab.vercel.app` — بدونه تحذيرات NextAuth وروابط دخول خاطئة. |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | قاعدة الإنتاج. |
| `CRON_SECRET` | `/api/sync` للمهمة المجدولة (`x-cron-secret` أو `Authorization: Bearer`). **يجب إضافته أيضاً في GitHub → Settings → Secrets → Actions** وإلا فالمزامنة المجدولة ترجع 403 بصمت. |
| `SGN_ADMIN_SECRET` | مسارات `/api/admin/*`. |
| `MOBILE_TOKEN_SECRET` | توقيع توكن الموبايل (HMAC). |
| `GROQ_API_KEY` + `AI_PROVIDER=groq` | كل ميزات الذكاء الاصطناعي. |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` / `FACEBOOK_PAGE_ID` / `FACEBOOK_PAGE_TOKEN` | مزامنة فيسبوك + زر ربط الصفحة. |
| `SMTP_*` | بريد إعادة تعيين كلمة السر. |
| `WHATSAPP_TOKEN` + `WHATSAPP_INSTANCE_ID` | إرسال رموز OTP. |

> 🚨 **قاعدة دائمة:** لا تكتب أي سرّ داخل الكود (لا كقيمة افتراضية ولا fallback). أي سرّ يُضاف كمتغيّر بيئة فقط.

## 🔄 Auto-update the Client URL

Before building the mobile app for production:
```bash
cd mobile && npm run set:prod
```
This changes `mobile/constants/config.ts` to use `https://sgn-drab.vercel.app`.
- `npm run set:dev` → switches back to `http://localhost:3000`
- The `build:android` / `build:ios` / `build:web` scripts run `set:prod` automatically.

## 🌐 i18n Rule

- **Web i18n** → `messages/{ar,en,nl}.json` (600+ keys, 40+ namespaces)
- **Mobile i18n** → `mobile/i18n/{ar,en,nl}.json` (60+ keys, 12 namespaces)
- **Shared keys** must exist in BOTH web and mobile i18n files.
- **New feature** → add i18n keys to web AND mobile message files.
- **API routes** → use `getApiMessage(locale, key)` from `@/lib/api-messages`.

## 🗄 Database

- Schema: `prisma/schema.prisma` (shared for all parts)
- Local: SQLite (`prisma/dev.db`)
- Production: Turso (libsql) — set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Sync: `prisma db push` after any schema change
- **حالة الترحيل (17 نوفمبر 2026):** ✅ تمت مزامنة جميع 47 جدولاً إلى قاعدة Turso `sgn-setup-srcoresync.aws-eu-central-1.turso.io` بنجاح (أعداد الصفوف متطابقة). `src/lib/db.ts` يختار Turso تلقائياً في الإنتاج عند توفر المتغيّرين. `prisma/dev.db` ما زال محلياً للتطوير (gitignored، غير متعقّب). الإنتاج (Vercel) يستخدم Turso (hasTursoUrl=true, hasTursoToken=true).

> 🚨 **تحذير تاريخي (تم حلّه):**
> كان الإنتاج على Vercel يعمل بـ SQLite محلي (503 عند حذف dev.db). **تم الترحيل إلى Turso في 17 نوفمبر 2026** — الإنتاج الآن يستخدم Turso (hasTursoUrl=true). `prisma/dev.db` ما زال موجوداً محلياً للتطوير (gitignored)، ولا يُرفع للمستودع.

## 🧪 Build Checklist

1. `npm run build` — web app compiles (70 routes, 0 TypeScript errors)
2. `cd mobile && npx tsc --noEmit` — mobile compiles (module-not-found for native libs OK)
3. `npm run i18n:check` — يمنع إضافة نصوص عربية جديدة (خط أساس + ratchet)
4. Verify new pages have nav links in `top-bar.tsx`, `site-header.tsx`, `footer`

> ⚠️ **Node.js version**: المشروع يتطلب **Node 22 LTS**. `.nvmrc` يحتوي `22`. على Windows (nvm-windows): `nvm use 22.22.3` (أو `nvm use 22`). **لا تستخدم** Node v27 alpha (موجود في `C:\Program Files\nodejs`) — يسبب فشل build. CI يستخدم Node 22 (`.github/workflows/ci.yml`).

> ⚠️ **مهم — مسار المشروع يحتوي على الرمز `&`:**
> الأمر `npm run dev` يفشل داخل `cmd` لأن `node_modules/.bin/next.cmd` لا يتعامل مع `&`.
> استخدم بدلاً منه:
> ```bat
> node "node_modules\next\dist\bin\next" dev -p 3000 --webpack
> ```
> أو شغّل `scripts\windows\start-dev-environment.bat` / `restart-dev.bat`.
>
> 🚨 **`--webpack` إلزامي — لا تحذفه:**
> بدون `--webpack` يستخدم Next.js 16 **Turbopack**، واللي يفشل على Windows عندما يحتوي مسار المشروع على `&`
> (حالتنا: `S&R CoreSync`). النتيجة: `/` تعمل، لكن **كل** `/api/*` و`/[locale]/*` ترجع **404**
> (بما فيها `/api/auth/session` → خطأ next-auth `Unexpected token '<'`، و`/api/health`).
> الحل الوحيد: `--webpack`. (تم تشخيصه 18 نوفمبر 2026.)

## 🔄 SGN Workflow — من فكرة إلى نشر

```
┌─ 1. فكرة (Issue / GitHub Project) ─────────────────┐
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─ 2. تحليل + تقسيم (15 د) ──────────────────────────┐
│  - شو المطلوب؟                                      │
│  - يحتاج تغيير Prisma؟ i18n؟ Web/Mobile/كلاهما؟    │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─ 3. فرع جديد ──────────────────────────────────────┐
│  fix/الموضوع  أو  feat/الميزة                       │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─ 4. تنفيذ (Deep Work — 90 د) ──────────────────────┐
│  برمجة + i18n + اختبارات                             │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─ 5. تدقيق (10 د) ─────────────────────────────────┐
│  npm run build + lint + test:run                    │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─ 6. رفع + نشر (دقيقة) ────────────────────────────┐
│  SGN Sync & Deploy.lnk (double click)               │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─ 7. مراجعة بعد النشر (5 د) ───────────────────────┐
│  افتح الموقع وتأكد الشغل تمام                        │
└─────────────────────────────────────────────────────┘
```

## ⚡ Critical Patterns

- **Next.js 16**: `params` is `Promise` — must `await` in API routes and page components
- **Auth**: `getServerSession(authOptions)` (NEVER `getServerSession()` without authOptions)
- **API i18n**: `tReq(req, key)` or `getApiMessage(locale, key, vars)` — NEVER hardcoded Arabic
- **Hydration**: `suppressHydrationWarning` + `mounted` state for client-only values (theme, etc.)
- **Responsive**: RTL-first for Arabic, LTR for English/Dutch
- **Ports**: Web dev = `:3000`, Web prod (محلياً) = `:3000` (Docker = `:3001`), Mobile dev = `http://localhost:3000/api`
- **AI Chatbot**: `POST /api/chat/ai` — uses Ollama (`qwen2.5:7b`, local); system prompt defines assistant as Syrian community expert; rate-limited (30 msg/min); saves to `ChatAISession` + `ChatAIMessage` tables
- **AI Switch (Gemini → Ollama / Anthropic)**: All AI features now default to **Ollama** (`qwen2.5:7b`) locally. In production, the system supports **Anthropic (Claude)** via Vercel AI Gateway or **OpenAI**. Configure via `AI_PROVIDER`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_CUSTOM_HEADERS`.
- **Ollama Models**: `ollama pull qwen2.5:7b` (~4.7GB, excellent Arabic) for text; `ollama pull llava:7b` (~4.5GB) for vision (ID extraction). Must be running (`ollama serve`) before using any AI features.
- **RAG (Retrieval Augmented Generation)**: `src/lib/ai/rag.ts` — extracts keywords from user question, searches News (Post), Events, and Volunteer tables; injects results into system prompt for fact-aware answers
- **Mobile Chat**: `mobile/app/(tabs)/messages.tsx` — 4th tab in mobile app; AI chat with suggested questions, message bubbles, typing indicator; uses `mobile/lib/chat.ts` API functions. **Direct Chat**: `mobile/app/direct-chat.tsx` — peer-to-peer messaging between members/service providers with **Push Notifications** via Expo.

## 📡 Sync System — جلب الأخبار (مهم جداً لا تحذف)

### المصادر
| المصدر | النوع | الحالة | الموقع |
|--------|-------|--------|--------|
| sy-nl.org | Webpage scraping | مُفعّل | `https://www.sy-nl.org/nbdh-aljalyh` |
| YouTube | RSS Feed | مُفعّل | قناة `UCgsEr_WQEnuymVqvTWXqmtw` |
| Facebook | Graph API | مُفعّل | `DeSyrischeGemeenschapInNederland` |

### الملفات الأساسية
- **إعدادات المصادر**: `src/lib/sync/types.ts` — `DEFAULT_SOURCES`
- **محرك السينك**: `src/lib/sync/index.ts` — `runSync()`
- **استخراج المقالات**: `src/lib/sync/extractor.ts`
- **فيسبوك**: `src/lib/sync/facebook.ts` (يحبّذ `pages_read_engagement`)
- **الحفظ بقاعدة البيانات**: `src/lib/sync/db-sync.ts` (يدعم منع التكرار)
- **تحميل الوسائط**: `src/lib/sync/media.ts` (يدعم Vercel Blob + محلي)
- **تصنيف بالذكاء الاصطناعي**: `src/lib/sync/categorizer.ts` (fallback: كلمات مفتاحية)

### كيفية تشغيل المزامنة
```bash
# مسح كل المقالات وجلب جديد (⚠️ يحذف الموجود)
SKIP_CONFIRMATION=true npx tsx scripts/04-reset-and-sync.ts

# مزامنة فيسبوك فقط (يحترم التوكن من .env)
npx tsx scripts/01-sync-facebook.ts

# أو عبر API (يتطلب admin auth):
curl -X POST http://localhost:3000/api/sync
```

## 🧑‍🤝‍🧑 أعضاء مجلس الإدارة

| الحقل | القيمة |
|-------|--------|
| العدد الإجمالي | 24 ✅ |
| في SQLite | 24 عضو |
| في Turso | 24 عضو |
| الصور | موجودة في `public/images/board/` |

### قائمة الأعضاء (حسب الترتيب)
1. عبد المنعم الشامان — رئيس مجلس الإدارة
2. صالح المحمد حنايا — نائب رئيس مجلس الإدارة
3. خالد فيصل الطويل — الأمين العام للجالية
4. محمد سليم عزيزة — عضو مكتب الأمانة العامة (المسؤول التقني) ✅ **(تمت الإضافة 26 يونيو 2026)**
5. محمد رائد كعكة — رئيس المكتب المالي
6. أحمد الحرفي — عضو مكتب الأمانة العامة (المسؤول التنظيمي)
7. هدى الحلاق — مديرة المكتب الإعلامي
8. رائد دهموش المشهور — مسؤول العلاقات الخارجية
9. محمود الناصر — مسؤول العلاقات الدولية
10. عمر النويلاتي — مسؤول النشاطات
11. رابعة الزريقات — مسؤولة الشؤون القانونية
12. فاتن رحال — رئيسة مكتب شؤون المرأة والأسرة
13. حسن الحسن قطيني — مسؤول رواد الأعمال
14. نبيل حاج حسين — مسؤول الصحة والدعم النفسي
15. بلال الرفاعي — مسؤول الصحة والدعم النفسي
16. محمد مصطفى سمهاني — مسؤول العلاقات الدولية
17. نهاد سويد — مسؤول العلاقات العامة
18. محمد أكرم الجنيدي — مسؤول الطلاب والتعليم
19. يوسف درويش — لجنة الرقابة الداخلية
20. محمد ربيع الجنيدي — المجلس الاستشاري
21. وسيم حسان — المجلس الاستشاري
22. ماهره الطواشي — المجلس الاستشاري
23. ريمه الحربات — المجلس الاستشاري
24. فراس هاني عابدين — المجلس الاستشاري

### تعديلات سابقة
- **صورة أحمد الحرفي:** تم تصحيح المسار من `ahmad_alharfi.png` → `Ahmad_Al_Herafi.jpg`
- **إضافة محمد سليم عزيزة:** تمت 26 يونيو 2026 (UUID: `ab43e716-735c-487c-a1fb-5fbb71f88012`)

### نتائج آخر مزامنة (26 يونيو 2026)
- **sy-nl.org**: 25 مقالة ✅
- **YouTube**: 13 فيديو ✅
- **Facebook**: 31 منشور ✅
- **الإجمالي**: 69 خبر في قاعدة البيانات (تم حذف 10 مقالات وهمية)
- قاعدة البيانات: `prisma/dev.db` (SQLite محلياً)

## ⚠️ Prisma v7 API Changes (مهم)

- **PrismaLibSql constructor** يأخذ `Config` مباشرة (ليس `Client`):
  ```typescript
  // ✅ جديد
  const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
  
  // ❌ قديم (Prisma v6)
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  const adapter = new PrismaLibSql(client);
  ```
- **`PrismaClient` لا ينفع كـ type** — استخدم `InstanceType<typeof PrismaClient>` بدلاً من `PrismaClient` في type annotations
- **import من `@prisma/client`** وليس `.prisma/client` (صلاح Vercel build)

## 🤖 Groq AI Provider

- **مجاني تماماً** — Llama 3.3 70B عبر API
- **30 RPM** (request per minute) — كافي للاستخدام العادي
- **تفعيل:** ضع `GROQ_API_KEY` في `.env` (احصل عليه من https://console.groq.com/keys)
- **الاستخدام:** `AI_PROVIDER=groq` في `.env` — يُكتشف تلقائياً قبل OpenAI
- **النموذج الافتراضي:** `llama-3.3-70b-versatile` — ممتاز للعربية

### Facebook — معلومات مهمة
- **Page ID**: `943115162210802` (من `/me/accounts`)
- **التوكن**: موجود في `.env` كـ `FACEBOOK_PAGE_TOKEN` (مأخوذ من `/me/accounts` تجديد كل 60 يوم)
- إذا انتهى التوكن: استخدم `https://graph.facebook.com/v19.0/me/accounts?access_token={USER_TOKEN}` لاستخراج التوكن الجديد للصفحة
- صلاحية يحتاجها التوكن: `pages_read_engagement`

#### ⚠️ تطبيقان مختلفان (مصدر إرباك متكرر)
| التطبيق | App ID | الاستخدام |
|---|---|---|
| **SGN Login** | `1378735874184374` | تسجيل الدخول بفيسبوك (OAuth) — سرّه موجود في `.env` |
| **SGN Sync** | `987463880745316` | توكن قراءة منشورات الصفحة — **سرّه غير موجود عندنا** |

**القاعدة:** توكن فيسبوك لا يمكن تمديده (`grant_type=fb_exchange_token`) إلا بسرّ **التطبيق الذي أصدره**.
فإن وُلّد التوكن من «SGN Sync» بينما السرّ المتوفر يخصّ «SGN Login» → `Error validating client secret`،
ويبقى التوكن قصير الأمد (ينتهي خلال ساعات).

**للحصول على توكن صفحة دائم (لا ينتهي):**
1. ولّد التوكن من تطبيق يملك سرّه عندنا (**SGN Login** في Graph API Explorer)، أو أحضر سرّ **SGN Sync**.
2. حوّله لتوكن مستخدم طويل الأمد (٦٠ يوماً) عبر `grant_type=fb_exchange_token`.
3. اسحب توكن الصفحة من `/me/accounts` — **هذا التوكن `expires_at = 0` أي دائم**.
4. تحقّق: `GET /debug_token?input_token={PAGE_TOKEN}&access_token={PAGE_TOKEN}`.

**بديل إنتاجي أفضل:** Meta Business Suite → Users → **System Users** → دور على الصفحة → Generate Token
(لا ينتهي أبداً، ولا يعتمد على حساب شخصي).

#### 🔍 مراقبة الصلاحية
`GET /api/health?sources=true` يرجّع:
| الحالة | المعنى |
|---|---|
| `ok` | سليم وأمامه > ٧ أيام |
| `expiring` | أمامه ≤ ٧ أيام → الحالة العامة `degraded` |
| `error` | منتهٍ/غير صالح → `degraded` |

> 🚨 **درس مستفاد:** `extractFacebook` كانت تبتلع استثناء Graph API بـ `console.log` وترجّع مصفوفة فاضية،
> فكانت المزامنة تُبلّغ «نجاح» مع `fetched=0 errors=0` لأشهر بينما التوكن ميت.
> **لا تبتلع أخطاء المصادر** — ارمِ الاستثناء ليظهر في `errors[]` و`success=false`.


## 📌 When You See "OP:..." or Similar Prefixes

The user may reference prior sessions. The `AGENTS.md` file is the authoritative source for project rules.
