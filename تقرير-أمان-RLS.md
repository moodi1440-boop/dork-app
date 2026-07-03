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

**قرار أحمد (2026-07-02):** تأجيل Tier 2 عن قصد — لا يوجد عملاء حقيقيون حالياً على Sydney (كل الحسابات التجريبية أرقام أحمد الشخصية)، فخطورة القراءة المفتوحة منخفضة عملياً بالوقت الحالي. يُنفَّذ لاحقاً، والأنسب دمجه ضمن إعداد Mumbai (بيئة بدون مستخدمين حقيقيين أصلاً، مكان آمن لبنائه واختباره) قبل أي تحويل نهائي لـ Vercel.

---

## سجل التنفيذ

### 2026-07-02 — Tier 1 نُفّذ على Sydney ✅

شُغّل SQL الإصلاح الطارئ كامل (customers/bookings/reviews/notifications/promo_codes) بنجاح ("Success. No rows returned"). تحقق مباشر بعدها عبر `SET ROLE anon` أكّد قراءة سليمة على الثلاثة جداول (customers=3, bookings=55, reviews=8).

**اكتشاف جانبي غير متوقع أثناء الاختبار:** بعد الإصلاح، ظهر خطأ "قاعدة بيانات" بالتطبيق الحي — التحقيق كشف مشكلة **منفصلة تماماً وسابقة لهذا الإصلاح**: ملف `20260621_lockdown_salons_rls.sql` (بتاريخ 21 يونيو) منح `anon` صلاحية `SELECT` على أعمدة محددة فقط بجدول `salons`، ولم يشمل عمود `owner_email` الذي أُضيف لاحقاً لاستعلام `App.jsx` (commit `d4bbe0d`). أي عمود غير مصرَّح به ضمن استعلام SELECT يُسقط الاستعلام كاملاً في PostgreSQL — هذا عطّل قراءة الصالونات بالكامل لدور `anon` منذ نزول ذاك الـcommit، بشكل مستقل تماماً عن ثغرات RLS المذكورة أعلاه.

**الإصلاح:** `GRANT SELECT (owner_email) ON salons TO anon;` — نُفّذ ونجح.

**التحقق النهائي (اختبار حي كامل من أحمد):** حجز تجريبي من صفحة العميل → ظهر بلوحة الصالون → ظهر بصفحة "حجوزاتي" للعميل. كل شي يعمل بدون أخطاء.

**الحالة النهائية:** Tier 1 مكتمل بالكامل + إصلاح إضافي لمشكلة salons غير مرتبطة. Tier 2 (نظام auth.uid() الحقيقي) لسا مؤجل، مرتبط بنقطة 86.

### 2026-07-03 — اكتشاف وإصلاح: ميزة قائمة الانتظار معطوبة بالكامل على Sydney ✅

أثناء بدء العمل على RLS مشروع Mumbai، طلب أحمد نتحقق من ميزة "قائمة الانتظار" لأنه يتذكرها شغالة سابقاً. الاختبار الحي كشف خطأ حقيقي (`حدث خطأ، حاول مرة أخرى`) عند محاولة الانضمام. فحص Console + Network أظهر:

```
Proxy-Status: PostgREST; error=42501
```

نفس نمط مشكلة `salons` (عمود `owner_email`) لكن أشمل: فحص `information_schema.column_privileges` أظهر أن دور `anon` عنده على جدول `waiting_list` صلاحية **`REFERENCES` فقط على كل الأعمدة — صفر SELECT/INSERT/UPDATE/DELETE**. يعني سياسات RLS (`waiting_list_public_read/insert/delete`) كانت موجودة **لكن بلا أي صلاحية أساسية (GRANT) تُفعّلها** — الميزة كانت معطوبة بالكامل (قراءة، إضافة، حذف) من الأساس، وليس فقط "قبول/رفض" كما افترضنا أول مرة.

**الإصلاح:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON waiting_list TO anon;
CREATE POLICY "waiting_list_public_update" ON waiting_list FOR UPDATE USING (true);
```

**تحقق حي كامل:** انضمام لقائمة الانتظار نجح ✅ → قبول من لوحة الصالون نجح ✅ → إشعار "تم قبولك في الموعد" وصل فوراً للعميل ✅ → القائمة تفرّغت والحجز انتقل لتبويب "مقبول" تلقائياً ✅.

**درس منهجي مهم لبقية العمل:** *وجود سياسة RLS لا يعني وجود GRANT الأساسي.* هذا ثاني اكتشاف من هذا النوع بنفس اليوم (بعد salons) — أي عمل RLS مستقبلي (خصوصاً على Mumbai) يجب يتحقق من `information_schema.column_privileges` أو `role_table_grants` **بالإضافة إلى** `pg_policies`، لا يكفي فحص السياسات وحدها.

### 2026-07-03 — 🔴 عطل مؤقت بالإنتاج (Sydney): سياسة salons مقيّدة بدور `anon` فقط، سببه تعديل اليوم على `sb()`

بعد نشر تعديل `sb()` (استخدام جلسة Supabase الحقيقية تلقائياً — راجع الخطوة 3 بـ`النقاط-المتبقية.md`)، اختفت **كل** الصالونات من التطبيق الحي فجأة. التشخيص:

- سياسة `salons_public_select_approved` (من `20260621_lockdown_salons_rls.sql`) مقيّدة صراحة **`TO anon`** فقط — لا يوجد أي سياسة لدور `authenticated`.
- بمجرد ما صار عند أي متصفح جلسة Supabase حقيقية (بعد اختبار دخول عميل بـ PIN)، `sb()` الجديدة بدأت تبعث توكن الجلسة الحقيقي بدل مفتاح anon **حتى لتصفح الصالونات العام**.
- الدور `authenticated` ما عنده أي سياسة RLS تسمح برؤية `salons` → صفر نتائج (200 OK لكن `[]`) — مش خطأ صريح، فصعب اكتشافه بسرعة.

**الإصلاح (نُفّذ على Sydney، ونفس الشي لازم يُنفَّذ على Mumbai قبل أي تحويل Vercel):**
```sql
GRANT SELECT (
  id, name, owner, owner_phone, owner_email, region, gov, center, village,
  phone, address, location_url, services, prices,
  shift_enabled, shift1_start, shift1_end, shift2_start, shift2_end,
  work_start, work_end, barbers, tone, rating, status, paused,
  frozen, banned, welcome_msg, closed_days, slot_min,
  cancellation_window, total_paid, social, lang, created_at
) ON salons TO authenticated;

CREATE POLICY "salons_authenticated_select_approved" ON salons
  FOR SELECT TO authenticated USING (status = 'approved');
```

**تحقق حي:** تحديث الصفحة بعد التنفيذ أرجع كل الصالونات للظهور فوراً.

**✅ تم تطبيق نفس الإصلاح على Mumbai (2026-07-03) وتحقّق مزدوج:**
- `pg_policies` أكّدت وجود `salons_authenticated_select_approved` (`{authenticated}`, SELECT, `status='approved'`) بجانب `salons_public_select_approved` (`{anon}`) و`salons_service_role_all` (`{service_role}`, ALL)
- `information_schema.column_privileges` أكّدت GRANT SELECT لدور `authenticated` على كل الأعمدة الـ35 المطلوبة بدون نقص
- ما عاد فيه فرق بين Sydney وMumbai بخصوص هذي الثغرة — الطريق مفتوح لمتابعة تحويل Vercel

**درس إضافي:** أي سياسة RLS مستقبلية يجب تُكتب `USING (...)` بدون `TO anon` تحديداً (أو تُضاف نسخة مطابقة لـ`authenticated`) إلا إذا كان القصد صراحة تقييدها بدور واحد — القراءة العامة (كالصالونات المعتمدة) يجب تشتغل بغض النظر عن وجود جلسة مصادقة أو لا.

---

### 2026-07-03 — 🔴 تحويل Vercel لـ Mumbai: سلسلة أعطال إضافية واكتشاف GRANT ناقص لـ anon

بعد تحديث متغيرات Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON`, `SUPABASE_URL`, `SUPABASE_ANON`, `SUPABASE_SERVICE_ROLE_KEY`) لتشير لـ Mumbai وعمل Redeploy، ظهر خطأ `401 Invalid API key` بدل نجاح فوري. التشخيص مرّ بعدة مراحل:

1. **خطأ بشري:** قيمة `VITE_SUPABASE_ANON` انلصقت بخانة **Note** بالغلط بدل خانة **Value** بواجهة Vercel — الحل: نقلها للخانة الصحيحة.
2. **صيغة مفتاح خاطئة:** استُخدم مفتاح anon من تبويب **"Legacy anon, service_role API keys"** (صيغة JWT قديمة)، بينما Sydney (والمفروض Mumbai كمان) يستخدم نظام **"Publishable and secret API keys"** الجديد (`sb_publishable_...`) — تبيّن Mumbai يرفض صيغة legacy تماماً.
3. **قيمة Vercel متضاربة مع fallback الكود:** حتى بعد كتابة القيمة الصحيحة كـ fallback بالكود (`App.jsx`, `api/_lib/supabase-admin.js`, `api/supabase.js`)، القيمة القديمة/الخاطئة المحفوظة بـ`VITE_SUPABASE_ANON`/`SUPABASE_ANON` على Vercel كانت **تتغلب** على fallback الكود (لأن `import.meta.env.X || fallback` ما يرجع لـ fallback إلا لو X فاضية تماماً) — الحل: حذف المتغيرين نهائياً من Vercel والاعتماد على fallback الكود فقط.
4. **بعد حل مشكلة المفتاح:** ظهر خطأ جديد ومختلف تماماً — `42501 permission denied for table salons`، مع hint من Postgres نفسه: `GRANT SELECT ON public.salons TO anon`. هذا أثبت المفتاح صار صحيح 100% (وصل الطلب لقاعدة البيانات فعلاً)، لكن GRANT العمودي لدور `anon` على Mumbai كان ناقصاً أو غير مكتمل رغم إنه من المفترض طُبّق بالخطوة 1 الأصلية.

**الإصلاح النهائي (Mumbai):**
```sql
GRANT SELECT (
  id, name, owner, owner_phone, owner_email, region, gov, center, village,
  phone, address, location_url, services, prices,
  shift_enabled, shift1_start, shift1_end, shift2_start, shift2_end,
  work_start, work_end, barbers, tone, rating, status, paused,
  frozen, banned, welcome_msg, closed_days, slot_min,
  cancellation_window, total_paid, social, lang, created_at
) ON salons TO anon;
```
⚠️ **لم نطبّق** اقتراح Postgres الحرفي (`GRANT SELECT ON public.salons TO anon` بدون تحديد أعمدة) لأنه يكشف أعمدة سرية مثل `owner_pin_hash` — طُبّق GRANT عمودي محدود بنفس منطق كل الإصلاحات السابقة.

**تحقق نهائي:** `information_schema.column_privileges` أكّدت كل الأعمدة المطلوبة موجودة لـ`anon`، وطلب حي من المتصفح (Network tab) رجع **200 OK** مع بيانات صالون "الوادي" الحقيقي — أول اتصال ناجح فعلي بين التطبيق المنشور فعلياً (Vercel Production) وقاعدة Mumbai.

**درس رئيسي:** استخدام fallback بالكود (بدل الاعتماد الكامل على Vercel env vars) ساعد نعزل المشكلة خطوة بخطوة، لكنه كشف أيضاً إن **وجود متغير فاضي/خاطئ بـ Vercel أخطر من عدم وجوده أصلاً** — لأنه يتغلب على أي fallback صحيح بالكود بصمت تام بدون أي تحذير.
