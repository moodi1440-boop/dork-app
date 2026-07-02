# تقرير أمان RLS — Dork App

> **الغرض:** تتبّع ثغرات RLS المكتشفة على مشروع Sydney (الإنتاج الحالي) وحالة إصلاح كل واحدة.
> **كل نقطة تبدأ بـ 🔲 لم تُصلح بعد — تتحول لـ ✅ بعد تشغيل SQL الإصلاح والتأكد.**
> **تاريخ الاكتشاف:** 2026-07-02 — أثناء تحضير نقل RLS لمشروع Mumbai.

---

## كيف اكتُشفت المشكلة

أثناء محاولة تطبيق ملفات RLS (`production-rls-v2.sql`, `secure-rls-policies.sql`, `fix-bookings-rls.sql`) على مشروع Mumbai، تبيّن أنها مبنية على متغيرات جلسة (`current_setting('app.session_token'...)`) غير مستخدمة أبداً بالتطبيق الفعلي. هذا قاد لفحص شامل لحالة RLS الحقيقية على **Sydney (الإنتاج)** عبر:

```sql
SELECT tablename, policyname, cmd, roles, qual FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
```

النتيجة: عدة جداول فيها سياسات باسم `allow_all`/`public_all`/`admin_full_access` مُعطاة لدور `{public}` بشرط `true` — أي قراءة/تعديل/حذف مفتوح للجميع بدون أي هوية.

---

## جدول الحالة

| # | الجدول | المشكلة | الخطورة | الحالة |
|---|--------|---------|---------|--------|
| 1 | `customers` | سياسة `public_all` (ALL/public/true) — أي شخص يقرأ/يعدّل/**يحذف** أي عميل | 🔴 حرجة | ✅ أُصلح 2026-07-02 |
| 2 | `bookings` | سياسة `allow_all` (ALL/public/true) — أي شخص يقرأ/يعدّل/**يحذف** أي حجز | 🔴 حرجة | ✅ أُصلح 2026-07-02 |
| 3 | `reviews` | سياسة `allow_all` (ALL/public/true) — أي شخص يقرأ/يعدّل/**يحذف** أي تقييم | 🔴 حرجة | ✅ أُصلح 2026-07-02 |
| 4 | `promo_codes` | سياسة `admin_full_access` مُعطاة لـ `{public}` — أي شخص ينشئ/يحذف أكواد خصم | 🔴 حرجة (مالية) | ✅ أُصلح 2026-07-02 |
| 5 | `notifications` | `notifications_public_delete` + `notifications_public_update` مفتوحة للجميع — أي شخص يحذف/يعدّل إشعارات كل المستخدمين | 🟠 متوسطة | ✅ أُصلح 2026-07-02 |
| 6 | `customer_messages` / `messages` | قراءة عامة (`SELECT true`) لمحادثات خاصة بين عميل وصالون / صالون وأدمن | 🟠 متوسطة | 🟡 مؤجل — Tier 2 |
| 7 | `promotions` | `update own promotion` غير مقيّدة فعلياً (`true`) — أي صالون يقدر يعدّل عرض صالون ثاني | 🟡 منخفضة | 🟡 مؤجل — Tier 2 |
| 8 | `waiting_list` | `waiting_list_public_delete` مفتوحة، لكنها ميزة حقيقية مستخدمة بالتطبيق | 🟡 منخفضة | 🟡 مؤجل — Tier 2 |
| 9 | `salons` | محمية بشكل صحيح (`SELECT` مقيّد بـ `status='approved'` + `service_role` للباقي) | ✅ آمنة | ✅ نموذج يُحتذى به |

---

## Tier 1 — إصلاح طارئ آمن (جاهز للتشغيل)

تم فحص كل استخدام فعلي لـ `sb(...)` بـ `App.jsx` قبل كتابة هذا السكربت، للتأكد إنه ما يكسر أي ميزة شغالة:

```sql
-- customers
DROP POLICY IF EXISTS "public_all" ON customers;
CREATE POLICY "customers_public_select" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_public_update" ON customers FOR UPDATE USING (true);

-- bookings
DROP POLICY IF EXISTS "allow_all" ON bookings;
CREATE POLICY "bookings_public_update" ON bookings FOR UPDATE USING (true);

-- reviews
DROP POLICY IF EXISTS "allow_all" ON reviews;
CREATE POLICY "reviews_public_update" ON reviews FOR UPDATE USING (true);

-- notifications
DROP POLICY IF EXISTS "notifications_public_delete" ON notifications;
DROP POLICY IF EXISTS "notifications_public_update" ON notifications;

-- promo_codes
DROP POLICY IF EXISTS "admin_full_access" ON promo_codes;
CREATE POLICY "promo_codes_public_update" ON promo_codes FOR UPDATE USING (true);
```

**آثار جانبية مقبولة (مفحوصة ومقصودة):**
- زر "حذف حسابي" للعميل (`App.jsx` تقريباً سطر 2749) سيتوقف عن العمل مؤقتاً — يحتاج مسار API آمن بديل لاحقاً.
- "تعليم الكل كمقروء" و"مسح الكل" بالإشعارات لن يُحفظا بقاعدة البيانات مؤقتاً (يبقيان شغالين محلياً بالمتصفح فقط، والإشعارات القديمة قد ترجع تظهر بعد تحديث الصفحة).

**لن تتأثر:** إنشاء حجز، تحديث حالة حجز، تسجيل عميل جديد، كتابة/قراءة تقييم، رد الصالون على تقييم، استخدام كود خصم.

---

## Tier 2 — يحتاج نظام هوية حقيقي (لاحقاً)

المشكلة المتبقية بعد Tier 1: **القراءة والتعديل لسا مفتوحين للجميع** على `customers`/`bookings`/`reviews`/`promo_codes` (بس مو الحذف). ما نقدر نقيّدهم بـ "كل مستخدم يشوف بياناته بس" لأن ما فيه هوية حقيقية مربوطة بكل طلب — التطبيق يستخدم anon key عام بدون توكن جلسة فعلي.

**الحل الحقيقي مرتبط بنقطة 86 الموجودة أصلاً بـ `الفحص-الشامل.md`:**
- تشغيل `node scripts/migrate-salon-auth.js` لربط الصالونات بـ Supabase Auth الحقيقي (`auth.uid()`)
- تمديد نفس المبدأ للعملاء
- ربط `sb()` بإرسال `authToken` فعلي (حالياً معامل ميت — موجود بالكود لكن ما يُمرَّر له أي قيمة أبداً)
- إعادة كتابة سياسات RLS لتعتمد على `auth.uid()` بدل `true`

هذا مشروع كامل، مو ترقيع SQL — يُنفَّذ بجلسة منفصلة بعد التنسيق معك.

---

## سجل التنفيذ

### 2026-07-02 — Tier 1 نُفّذ على Sydney ✅

شُغّل SQL الإصلاح الطارئ كامل (customers/bookings/reviews/notifications/promo_codes) بنجاح ("Success. No rows returned"). تحقق مباشر بعدها عبر `SET ROLE anon` أكّد قراءة سليمة على الثلاثة جداول (customers=3, bookings=55, reviews=8).

**اكتشاف جانبي غير متوقع أثناء الاختبار:** بعد الإصلاح، ظهر خطأ "قاعدة بيانات" بالتطبيق الحي — التحقيق كشف مشكلة **منفصلة تماماً وسابقة لهذا الإصلاح**: ملف `20260621_lockdown_salons_rls.sql` (بتاريخ 21 يونيو) منح `anon` صلاحية `SELECT` على أعمدة محددة فقط بجدول `salons`، ولم يشمل عمود `owner_email` الذي أُضيف لاحقاً لاستعلام `App.jsx` (commit `d4bbe0d`). أي عمود غير مصرَّح به ضمن استعلام SELECT يُسقط الاستعلام كاملاً في PostgreSQL — هذا عطّل قراءة الصالونات بالكامل لدور `anon` منذ نزول ذاك الـcommit، بشكل مستقل تماماً عن ثغرات RLS المذكورة أعلاه.

**الإصلاح:** `GRANT SELECT (owner_email) ON salons TO anon;` — نُفّذ ونجح.

**التحقق النهائي (اختبار حي كامل من أحمد):** حجز تجريبي من صفحة العميل → ظهر بلوحة الصالون → ظهر بصفحة "حجوزاتي" للعميل. كل شي يعمل بدون أخطاء.

**الحالة النهائية:** Tier 1 مكتمل بالكامل + إصلاح إضافي لمشكلة salons غير مرتبطة. Tier 2 (نظام auth.uid() الحقيقي) لسا مؤجل، مرتبط بنقطة 86.
