# إصلاح عدم ظهور صور الأخبار (أخبار الجالية)

> Status: DRAFT — بانتظار موافقة المستخدم
> Source: user request (صور لا تظهر في قسم أخبار الجالية)
> Mode: (default)
> Iterations: 0 / 3
> Author: SGN team
> Last updated: 2026-11-23

## ملخص المشكلة (التشخيص الجذري)

أخبار الجالية تعرض **بطاقات خضراء فارغة بدلاً من الصور**. التحقق أثبت:

1. **السبب الجذري:** كل صور أخبار الجالية تأتي من `fbcdn.net` (منشورات فيسبوك)، و**كل روابطها تُرجع HTTP 403** (منتهية الصلاحية / محظورة من فيسبوك). روابط fbcdn تنتهي صلاحيتها خلال بضعة أيام.
2. **السبب الثانوي:** عند فشل تحميل الصورة، `handleImgError` يستخدم `getPremiumPlaceholder` (SVG خضراء فقيرة) بدلاً من صورة حقيقية.
3. **السبب الثالث:** `downloadMedia` في `media.ts` يعيد الرابط الخارجي نفسه (fbcdn) ولا يحفظ الصورة محلياً — التعليق يقول إن التخزين المحلي يكسر المسارات على Vercel.

الأدلة:
- `curl` لـ fbcdn → `HTTP 403`
- قاعدة البيانات (Turso) لأخبار الجالية: 64 من 73 بها صورة (كلها fbcdn)
- `media.ts:107-109` تعيد `absoluteUrl` الخارجي دائماً

## معايير القبول (AC)

- **AC-1:** قسم أخبار الجالية يعرض صوراً حقيقية (ليس SVG خضراء) لكل مقال.
- **AC-2:** الصور لا تعتمد على روابط fbcdn المنتهية.
- **AC-3:** الحل يعمل على Vercel (الإنتاج) وlocalhost معاً.
- **AC-4:** لا ينكسر أي قسم آخر (اقتصاد، ثقافيات، فعاليات).

## RALPLAN-DR

### Principles
- **الحل الجذري:** لا نكتفي بعلاج الأعراض (SVG بديل)، بل نعالج مصدر المشكلة (روابط fbcdn المنتهية).
- **الحد الأدنى من التغيير:** نعدّل أقل عدد ملفات ممكن دون إعادة بناء نظام الصور.
- **الاستقرار على الإنتاج:** أي حل يجب أن يعمل على Vercel ولا يعتمد على ملفات محلية.

### Decision drivers (top 3)
1. **الاعتماد على فيسبوك:** توكن فيسبوك منتهٍ الصلاحية حالياً، وروابط fbcdn تنتهي بسرعة → لا يمكن الاعتماد عليه كمصدر صور دائم.
2. **التخزين على Vercel:** التخزين المحلي (`public/uploads/`) لا يعمل على Vercel (ملفات ephemeral). الحل المستقر هو Vercel Blob.
3. **سرعة الإصلاح:** المستخدم يريد حلاً فورياً. الحل الكامل (Blob) يحتاج إعداد من المستخدم.

### Viable options

**Option A: تنزيل الصور وتخزينها في Vercel Blob (الحل الجذري الكامل)**
- عند المزامنة، ننزل الصورة من المصدر ونحفظها في Vercel Blob، ونخزن رابط Blob الدائم في `Post.image`.
- يلغي الاعتماد على fbcdn نهائياً.
- الملفات المعدّلة: `src/lib/sync/media.ts`، `src/lib/sync/facebook.ts`، `prisma/schema.prisma` (إذا لزم).
- **متطلبات المستخدم:** تفعيل Vercel Blob وإضافة `BLOB_READ_WRITE_TOKEN` في Vercel + `.env`.
- Pros: صور دائمة حقيقية، لا تعتمد على فيسبوك.
- Cons: يحتاج إعداد Blob من المستخدم، ويعيد مزامنة كل الأخبار.

**Option B: استبدال fbcdn تلقائياً بصورة تحريرية (Unsplash) عند العرض (حل فوري)**
- تعديل `resolveImage` و`handleImgError` في `image-fallback.ts` لتجاهل روابط fbcdn واستخدام `getEditorialFallback` (صور Unsplash حقيقية مناسبة للموضوع) بدلاً من SVG الخضراء.
- يعمل فوراً بدون إعداد إضافي.
- الملفات المعدّلة: `src/lib/image-fallback.ts`.
- Pros: فوري، لا يحتاج إعداد، يعرض صوراً حقيقية.
- Cons: الصور ليست صور المنشور الأصلي (لكنها مناسبة موضوعياً).

**Option C: مزيج (B الآن + A لاحقاً) — الموصى به**
- **فوري (Option B):** نعدّل `image-fallback.ts` ليستبدل fbcdn بصورة تحريرية فوراً. يصلح المشكلة خلال دقائق.
- **لاحقاً (Option A):** عندما يفعّل المستخدم Vercel Blob، ننقل الصور الحقيقية إلى Blob.
- Pros: إصلاح فوري + مسار لحل كامل لاحقاً.
- Cons: مرحلتان.

### الموصى به: Option C (B الآن + A لاحقاً)

## Implementation steps (Option B — فوري)

1. **تعديل `resolveImage`** — `src/lib/image-fallback.ts:177-194`:
   - إذا كان الرابط يحتوي على `fbcdn.net`، أعتبره غير صالح (مثل `null`) واستخدم `getEditorialFallback(title, category)` بدلاً من `getPremiumPlaceholder`.
2. **تعديل `handleImgError`** — `src/lib/image-fallback.ts:168-174`:
   - عند فشل التحميل، استخدم `getEditorialFallback(title, category)` بدلاً من `getPremiumPlaceholder`.
3. **تحديث `getEditorialFallback`** — `src/lib/image-fallback.ts:127-162`:
   - التأكد من أن الصور التحريرية تغطي كلمات مفتاحية أخبار الجالية (جالية، سوريا، هولندا).
4. **التحقق:** فتح `/news?category=أخبار الجالية` والتأكد من ظهور صور حقيقية.

## Implementation steps (Option A — لاحقاً بعد تفعيل Blob)

1. تفعيل Vercel Blob في المشروع وإضافة `BLOB_READ_WRITE_TOKEN`.
2. تعديل `downloadMedia` لحفظ الصورة في Blob وإرجاع رابط Blob.
3. تشغيل مزامنة كاملة لإعادة توليد روابط الصور.

## Workspace setup
- الفرع الحالي: `main`
- working tree: نظيف
- **ملاحظة:** بما أن الفرع `main` والتغييرات صغيرة (ملف واحد)، يمكن التعديل مباشرة على main.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| صور Unsplash بطيئة أو محظورة | `handleImgError` يحتفظ بـ SVG كاحتياطي أخير |
| تكرار نفس صورة Unsplash لكثير من المقالات | `getEditorialFallback` يختار بناءً على كلمات عنوان المقال (تنويع) |
| Option A يكسر الروابط القديمة | `Post.image` يُحدّث تدريجياً عند إعادة المزامنة |

## Verification steps
- `curl https://sgn-drab.vercel.app/api/news?category=...` للتأكد من أن `image` لا يحتوي على fbcdn (أو أن الواجهة تستبدله).
- فتح `/news?category=أخبار الجالية` في المتصفح والتأكد من ظهور صور حقيقية.
- فتح أقسام أخرى (اقتصاد، ثقافيات) للتأكد من عدم انكسارها.

## ADR

- **Decision:** اعتماد Option C — استبدال fbcdn بصور تحريرية فوراً، مع مسار لـ Vercel Blob لاحقاً.
- **Drivers:** توكن فيسبوك منتهٍ، fbcdn ينتهي بسرعة، Vercel Blob غير مُفعّل بعد.
- **Alternatives:**
  - Option A (Blob): rejected مؤقتاً — يحتاج إعداد من المستخدم.
  - Option B (فوري فقط): chosen كمرحلة أولى.
- **Why chosen:** يصلح المشكلة فوراً دون انتظار إعداد Blob.
- **Consequences:** الصور ستكون تحريرية (مناسبة موضوعياً) وليست صور المنشور الأصلي، حتى تفعيل Blob.

## Open questions
- هل المستخدم جاهز لتفعيل Vercel Blob الآن؟ (للانتقال إلى Option A)
- هل يريد صور تحريرية عامة أم صور sy-nl.org الحقيقية؟

## Review trail
- Planner draft v1: تشخيص fbcdn 403 + 3 خيارات.
- (بانتظار Architect + Critic بعد موافقة المستخدم على الخيار)
