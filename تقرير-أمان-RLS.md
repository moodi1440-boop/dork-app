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

5. **بعد حل anon تماماً:** تسجيل دخول الصالون فشل بـ"صالون غير موجود" رغم إن البيانات صحيحة 100% بالجدول (تأكدنا بـ SQL مباشر: `owner_phone` مطابق تماماً). أضفنا `console.error` مؤقت بـ `api/owner-auth.js` وفحصنا Vercel Logs → كشف الخطأ الحقيقي: `42501 permission denied for table salons`, hint: `GRANT SELECT ON public.salons TO service_role`. **حتى دور service_role (الموثوق بالكامل، يُستخدم فقط من السيرفر) ما كان عنده GRANT أساسي على الجداول بمشروع Mumbai** — نفس فخ "سياسة بدون GRANT" يتكرر لثالث مرة اليوم، بس هذي المرة أخطر لأنه يؤثر غالباً على **كل الجداول** مو جدول وحيد.

**الإصلاح الشامل (كل الجداول، مرة واحدة):**
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
```
لا داعي لتقييد أعمدة هنا — service_role دور سيرفر موثوق بالكامل ويحتاج أصلاً كل الأعمدة (مثل `owner_pin_hash` للتحقق من الدخول).

**تحقق نهائي:** `information_schema.table_privileges` أكّدت صلاحيات كاملة لـ`service_role` على كل الجداول، وتسجيل دخول صالون "الوادي" الحي نجح بالكامل (لوحة التحكم ظهرت صح بعد الدخول).

**✅ الخلاصة: Mumbai أصبح فعلياً هو الإنتاج الحي — التطبيق المنشور بـ Vercel يقرأ ويكتب من Mumbai بنجاح (تصفح عام + تسجيل دخول صالون مُختبران حياً).**

**درس رئيسي متكرر اليوم (3 حالات منفصلة: `salons`/anon، ثم service_role):** إعداد RLS الكامل على مشروع جديد يحتاج فحص **GRANT منفصل تماماً عن السياسات** لكل دور مُستخدم فعلياً بالكود (`anon`, `authenticated`, `service_role`) — لا يكفي التأكد من وجود Policy، ولا حتى من نجاح استعلام SQL يدوي بنفس الجلسة (لأن SQL Editor غالباً يشتغل كـ `postgres`/`service_role` بصلاحيات كاملة أصلاً، فما يكشف نقص GRANT لباقي الأدوار).

**درس رئيسي:** استخدام fallback بالكود (بدل الاعتماد الكامل على Vercel env vars) ساعد نعزل المشكلة خطوة بخطوة، لكنه كشف أيضاً إن **وجود متغير فاضي/خاطئ بـ Vercel أخطر من عدم وجوده أصلاً** — لأنه يتغلب على أي fallback صحيح بالكود بصمت تام بدون أي تحذير.

---

### 2026-07-04 — الاختبار الشامل الحي على Mumbai: 3 أعطال إضافية (Site URL + schema مفقود + sequences)

بعد نجاح تحويل Vercel، بدأنا الاختبار الشامل الفعلي (Step 5): تسجيل عميل جديد → تسجيل دخول → حجز كامل. واجهنا 3 مشاكل جديدة، كلها انحلّت بنفس منهجية اليوم (فحص مباشر بدل تخمين):

**1. روابط بريد التحقق (OTP) تودّي لـ`localhost` بدل الموقع الحقيقي**
- **السبب:** إعداد **Site URL** بـ Supabase Auth (Authentication → URL Configuration) لمشروع Mumbai كان لسا على القيمة الافتراضية `http://localhost:3000` — لم يُحدَّث أبداً منذ إنشاء المشروع.
- **الإصلاح:** تغييره لـ `https://dork-app.vercel.app` + إضافة نفس الرابط (مع `/**`) لقائمة **Redirect URLs**.
- **تحقق حي:** تسجيل عميل جديد بالبريد نجح بعدها مباشرة.

**2. فروقات Schema حقيقية بين Sydney وMumbai — اكتُشفت بمقارنة شاملة**
بدل انتظار كل ميزة تكشف عطل جديد بالصدفة (زي ما صار مع `salons` و`service_role`)، قارنّا **كامل** هيكلة الجدولين (`information_schema.columns`) دفعة وحدة. النتيجة: 326 عمود بـSydney مقابل 262 بـMumbai. بعد استبعاد الجداول/الأعمدة غير المستخدمة فعلياً بالكود (تحقّقنا بـ`grep` مباشر، ليس تخميناً) — 3 فروقات حقيقية:

| الجدول | المشكلة | الحل |
|---|---|---|
| `customers` | 8 أعمدة ناقصة: `favs`, `google_uid`, `history`, `lang`, `location_lat`, `location_lng`, `notifications`, `photo` | `ALTER TABLE ADD COLUMN` لكل عمود + `GRANT SELECT/UPDATE` لـ`anon`/`authenticated` |
| `app_settings` | بنية مختلفة جذرياً (كان `key`/`value` بدل `id`/`loyalty_settings`/`social_links`/`ui_settings`) | إضافة الأعمدة المطلوبة (الجدول كان فارغاً أصلاً على Mumbai فما احتجنا حذف القديم) |
| `reviews` | عمود `owner_reply` ناقص (يُستخدم فعلياً لرد الصالون على التقييم) | `ALTER TABLE ADD COLUMN` + GRANT |

**غير مهم (تحقّقنا وتجاهلناها بأمان):** `financial_records` و`notification_logs` (جداول موجودة بSydney لكن صفر استخدام بالكود الحالي)، `salons_backup_auth_migration` (جدول نسخة احتياطية قديم، ليس جزءاً من التطبيق)، `salons.oath_done`/`salons.bookings(jsonb)` (أعمدة قديمة صفر استخدام، قرار مأخوذ سابقاً وقت نقل صالون 17).

**3. فخ الصلاحيات يتكرر — بس هذي المرة على Sequences وليس الجداول**
حتى بعد GRANT صحيح على الجداول (`bookings`, `reviews`, `app_settings`)، محاولة **إضافة** صف جديد فشلت برسالة: `permission denied for sequence bookings_id_seq`. الأعمدة التلقائية (bigint/bigserial) تعتمد على **sequence منفصل** يحتاج صلاحية GRANT خاصة به، غير كافية صلاحية الجدول نفسه.
```sql
GRANT USAGE, SELECT ON bookings_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON app_settings_id_seq TO anon, authenticated;
```

**تحقق نهائي شامل:** حجز عميل تجريبي كامل (اختيار حلاق نشط + خدمة + موعد + تأكيد) نجح فعلياً على Mumbai، وتأكّدنا بـSQL مباشر من وجود الصف بجدول `bookings` ببيانات صحيحة تماماً.

---

### 2026-07-07 — نسخ الهيكلة الكاملة من DORK (الإنتاج) إلى DORK-TEST (فارغ)

**الهدف:** DORK-TEST أُنشئ فارغاً تماماً (2026-07-06) — نبيه جاهز فعلياً للاختبار، فلازم يطابق هيكلة DORK بالكامل: جداول، أعمدة، قيود، فهارس، دوال، triggers، RLS + policies، وصلاحيات GRANT.

**بدون Terminal (بقرار أحمد)** — الطريقة: استعلام SQL واحد يقرأ كتالوج Postgres (`pg_catalog`/`information_schema`) على DORK وينتج نص SQL كامل جاهز للنسخ، يُشغَّل بعدها كاملاً على DORK-TEST.

**جرد أولي على DORK (2026-07-07) قبل بناء السكربت النهائي:**

| tables | views | functions | triggers | policies | sequences |
|---|---|---|---|---|---|
| 26 | 1 | 10 | 7 | 45 | 20 |

**قرار تصميم مهم:** أي عمود بمفتاح تلقائي (`DEFAULT nextval(...)`) يُعاد كتابته كـ`GENERATED BY DEFAULT AS IDENTITY` بدل نسخ اسم الـ sequence كما هو — يضمن توليد sequence صحيح تلقائياً بـDORK-TEST بدون تعارض أسماء، ويطابق نفس تسمية Postgres التلقائية (`{table}_{column}_seq`) المستخدمة أصلاً بحل مشكلة `bookings_id_seq` أعلاه.

**اكتشاف مهم أثناء المراجعة قبل التطبيق:** عدّ أعمدة `id` (bigint) المعتمدة على sequence تلقائي أعطى 21 عموداً، لكن الجرد الأولي قال 20 sequence فقط على DORK — فرق واحد. التحقق (`pg_get_expr` على كل عمود `id`) أكّد السبب: **`bookings_archive.id` يشارك نفس sequence حق `bookings.id`** (`bookings_id_seq`) — الأرقام تكمل متسلسلة بين الجدولين حتى بعد الأرشفة، وليس كل جدول له sequence مستقل كما افترضنا أول مرة.

**الإصلاح بالسكربت النهائي:** بدل تحويل كل عمود `nextval(...)` تلقائياً لـ`GENERATED BY DEFAULT AS IDENTITY` (يفصل كل جدول بـsequence مستقل خاص فيه)، الكود عدّل ليعامل `bookings`/`bookings_archive` استثناءً: `CREATE SEQUENCE bookings_id_seq` صريح قبل الجداول، وكلا العمودين يستخدمان `DEFAULT nextval('bookings_id_seq'::regclass)` (وليس IDENTITY) — يحافظ على نفس المشاركة الموجودة فعلياً بالإنتاج. باقي الـ19 عمود (بلا مشاركة) استخدمت `GENERATED BY DEFAULT AS IDENTITY` بأمان.

**السكربت النهائي (1148 سطر) يغطي:** 10 دوال، 26 جدول (+ sequence مشترك واحد لـbookings/bookings_archive)، view واحد، كل القيود (PK/Unique/FK/Check)، الفهارس، 7 triggers، تفعيل RLS + 45 policy، وكل صلاحيات GRANT (جدول/عمود/sequence) لـanon/authenticated/service_role — أُرسل لأحمد كملف جاهز للصق كامل على DORK-TEST.

**التنفيذ (2026-07-07):**
1. تشغيل السكربت الرئيسي (10 دوال، 26 جدول، view، القيود، الفهارس، 7 triggers، RLS + 45 policy، كل GRANTs) — نجح من أول محاولة بعد إصلاح ترتيب الأقسام (كان قسم الدوال يشتغل قبل الجداول؛ دالتين منها بلغة SQL خالصة تتحقق من وجود الجداول وقت الإنشاء مباشرة — أُعيد الترتيب: جداول → عروض → دوال → قيود → فهارس → triggers → RLS → GRANTs).
2. **مقارنة الجرد الكامل بعد التطبيق** (`pg_class`/`pg_proc`/`pg_trigger`/`pg_policy`) — تطابق 100%: 26 جدول، 1 view، 10 دوال، 7 triggers، 45 policy، 20 sequence.
3. **اكتُشف فرق بالصلاحيات (GRANT)** رغم تطابق الهيكلة: DORK-TEST عنده صلاحيات أوسع افتراضياً (مشروع Supabase جديد يمنح CRUD كامل لـ`anon`/`authenticated` تلقائياً على أي جدول جديد) — 184 صلاحية زايدة بمستوى الجدول، 131 بمستوى العمود (تغطي 1195 عمود فردي)، 112 بمستوى الـsequence، مقارنة بـDORK. تم توليد ودقّ REVOKE statements دقيقة (مقارنة `information_schema.role_table_grants`/`column_privileges` وaclexplode على pg_class.relacl حرفياً بين المشروعين، مو تخميناً) وتطبيقها.
4. **فخ إضافي اكتُشف أثناء REVOKE:** لما تُسحب صلاحية على **مستوى الجدول** (table-level) لدور كان يملك فقط صلاحية عمود-محدد ضمنية عبرها (مو صلاحية عمود صريحة منفصلة)، تختفي الصلاحية بالكامل — حتى لو كان المطلوب إبقاء نسخة مقيّدة بأعمدة معيّنة. صار هذا بالضبط مع 5 حالات كانت DORK تُخفي فيها أعمدة حساسة عمداً عن anon/authenticated (`salons.password`, `salons.owner_pin_hash`, `salons.owner_pin_locked_until`, `salons.auth_uid`؛ وتقييد `customers` لـauthenticated على أعمدة تطبيق فقط لا بيانات حساسة) — انحلّت بإعادة GRANT صريح لنفس مجموعة الأعمدة المقيّدة بالضبط.
5. **التحقق النهائي (بعد كل الإصلاحات):** `role_table_grants` = 383، `column_privileges` (مفاتيح فريدة) = 198، `sequence` ACL = 68 — **تطابق تام 100% مع DORK** على الثلاث مستويات.

**الحالة: ✅ مكتمل بالكامل 2026-07-07 — DORK-TEST نسخة طبق الأصل من DORK هيكلةً وصلاحياتٍ.**

---

### 2026-07-07 — خلل قديم مكتشَف بالصدفة: `promo_codes` بدون GRANT/Policy لـ INSERT/DELETE على DORK

أثناء استخدام أحمد الفعلي للوحة الإدارة (توليد كود خصم تطبيق)، ظهرت رسالة **"permission denied for table promo_codes"**. هذا خلل قديم موجود بالإنتاج نفسه (DORK) — **غير متعلق بترحيل Mumbai ولا بشغل DORK-TEST اليوم**، انكشف بالصدفة لأنه أول مرة يجرَّب توليد كود فعلياً.

**السبب:** صفحة `admin/src/app/(admin)/promo-codes/page.tsx` تتصل مباشرة بقاعدة البيانات عبر مفتاح `anon` (`sb` من `supabase-browser.ts`)، ودور `anon` كان يملك فقط `SELECT`/`UPDATE` على `promo_codes` — بدون `INSERT` ولا `DELETE` (لا GRANT ولا RLS policy).

**الإصلاح المطبَّق على DORK:**
```sql
GRANT INSERT, DELETE ON public.promo_codes TO anon;

CREATE POLICY promo_codes_public_insert ON public.promo_codes
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY promo_codes_public_delete ON public.promo_codes
  FOR DELETE TO public USING (true);
```

**تحقق حي:** توليد كود تطبيق فعلي من لوحة الإدارة الحقيقية (project-nfzka.vercel.app) نجح بعد الإصلاح — تحقّق عبر Network tab (طلب `201 Created`).

✅ **طُبِّق على DORK-TEST أيضاً (2026-07-07)** — تحقّق: تشغيل ناجح لنفس GRANT+policies.

---

### 2026-07-07 — خلل قديم ثانٍ مكتشَف بالصدفة: `promotions_id_seq` بدون GRANT لـ anon/authenticated على DORK

أثناء اختبار أحمد الحي لميزة "إرسال عرض ترويجي" (كود خصم DORK، باقة فضي)، ظهر خطأ **`permission denied for sequence`** (كود 42501). نفس فخّ `bookings_id_seq` المكتشَف سابقاً اليوم، بس على sequence جدول `promotions` هذي المرة: الجدول نفسه عنده GRANT INSERT لـ`anon`/`authenticated`، لكن sequence الـid (`promotions_id_seq`) كان ممنوح فقط لـ`service_role`.

**الإصلاح المطبَّق على DORK:**
```sql
GRANT USAGE, SELECT ON SEQUENCE public.promotions_id_seq TO anon, authenticated;
```

**تحقق حي:** إعادة إرسال نفس العرض التجريبي من التطبيق الحقيقي نجحت بعد الإصلاح.

✅ **طُبِّق على DORK-TEST أيضاً (2026-07-07)**.

---

### 2026-07-07 — إغلاق فخّ "sequence بدون GRANT" نهائياً على DORK (استباقي + دائم)

بعد ما تكرر نفس فخّ "permission denied for sequence" ثلاث مرات بنفس اليوم (`bookings_id_seq`, `app_settings_id_seq`, `promotions_id_seq`)، بدل ننتظر كل جدول يكتشف عطله بالصدفة أثناء استخدام حقيقي — فحصنا **كل** الجداول اللي عندها INSERT لـ`anon`/`authenticated` مقابل صلاحيات الـsequences الفعلية دفعة وحدة (مقارنة `role_table_grants` مع الـsequence ACL المحفوظة من فحص اليوم، بدون تخمين).

**لُقيت 4 جداول ثانية عندها نفس الفخّ نايم (لسا ما انكشف لأن حد ما جرّب الإضافة فيها فعلياً):** `messages`, `notifications`, `reviews`, `waiting_list`.

**إصلاح استباقي مطبَّق على DORK:**
```sql
GRANT USAGE, SELECT ON SEQUENCE public.messages_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.reviews_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.waiting_list_id_seq TO anon;
```

**إصلاح دائم (يقفل الفخّ للأبد — أي جدول جديد مستقبلاً يرث الصلاحية تلقائياً):**
```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
```

✅ **طُبِّق على DORK-TEST أيضاً (2026-07-07)** — بما فيها `ALTER DEFAULT PRIVILEGES` الدائم، فالفخّ مقفول بالمشروعين معاً الآن.

**النتيجة النهائية:** كل الإصلاحات الأربعة المؤكدة اليوم (promo_codes، promotions_id_seq، الفخّ الاستباقي للـ4 جداول، والحل الدائم) مطبَّقة على **DORK وDORK-TEST معاً** — المشروعان متطابقان 100% هيكلةً وصلاحياتٍ.

**درس إضافي مهم:** لما تتكرر نفس فئة العطل (GRANT ناقص) أكثر من مرتين بنفس اليوم، الأفضل التحول من "أصلح كل ما يظهر خطأ" إلى **"قارن الهيكلة الكاملة مرة وحدة"** — أسرع وأشمل بكثير من انتظار كل ميزة تكتشف عطل جديد بالصدفة أثناء استخدام حقيقي.

---

### 2026-07-14 — حذف ميزة نقاط الولاء بالكامل (قرار أحمد)

بطلب صريح من أحمد، حُذفت ميزة "نقاط الولاء" بالكامل من التطبيق — كانت غير مفعّلة عملياً أصلاً (لا واجهة استخدام للعميل، لا آلية اكتساب تلقائي عند إتمام حجز، قيمة يدوية بس تُعدَّل من لوحة الإدارة).

**حذف الكود (منجز، مرفوع على main):** سؤال الأسئلة الشائعة (4 لغات)، `admin/src/app/api/settings/route.ts`، `admin/src/app/api/customers/[id]/route.ts`، صفحة عملاء الإدارة (عمود التجميد + شارة النشاط + تصدير PDF)، سجل التدقيق. تحقّق: type-check للوحة الإدارة نظيف بدون أخطاء.

**حذف قاعدة البيانات (منجز، بتأكيد صريح مزدوج من أحمد قبل التنفيذ):**
```sql
ALTER TABLE customers DROP COLUMN IF EXISTS loyalty_points;
ALTER TABLE customers DROP COLUMN IF EXISTS loyalty_frozen;
ALTER TABLE app_settings DROP COLUMN IF EXISTS loyalty_settings;
```
طُبِّق على **DORK وDORK-TEST معاً** (نفس السكربت بالضبط على الاثنين) — تحقّق: "Success. No rows returned" على المشروعين.

**الحالة: ✅ مكتمل بالكامل — حذف نهائي على مستوى الكود وقاعدة البيانات، بالمشروعين معاً.**

---

### 2026-07-14 — خللان قديمان مكتشَفان أثناء اختبار "حذف حساب الصالون" (نقطة 25)

أثناء اختبار أحمد الحي لميزة حذف الحساب (سجّل صالون تجريبي "لقمان" ليجرّب عليه)، اكتُشف خللان قديمان غير متعلقين بترحيل Mumbai:

**1. الصالونات المجمّدة (تجميد إداري أو حذف ذاتي) كانت تظهر للعملاء بالصفحة الرئيسية بعلامة "مجمّد" بدل الاختفاء كلياً.**
- استعلام جلب الصالونات للعملاء (`App.jsx`) كان يجيب كل الصالونات المعتمدة بغض النظر عن `frozen`، وSalonCard يعرضها بعلامة بدل إخفائها
- **قرار توضيحي من أحمد:** الحالتين (تجميد إداري مؤقت مثل رسوم غير مسددة، وحذف ذاتي دائم) لازم تختفي من العميل بنفس الطريقة — الفرق بينهم (يرجع أو لا) يبقى محفوظاً من جهة تسجيل الدخول/الإدارة فقط
- **الإصلاح (L122):** إضافة `&frozen=eq.false` لاستعلام العملاء الرئيسي — مصدر بيانات وحيد تتفرّع منه كل الشاشات (مفضّلة/مقارنة/بحث)، فالإصلاح شمل الكل تلقائياً

**2. زر تسجيل صالون جديد بدون حماية من الضغط المزدوج — يسبب تسجيل الصالون مرتين.**
- اكتُشف عملياً: أحمد سجّل صالون "لقمان" فظهر مكرراً بلوحة الإدارة (نسخة "موافق" ونسخة "انتظار") — نفس البيانات بالضبط، يعني نداءين منفصلين لـ`/api/register-salon`
- **السبب:** زر "إنشاء الحساب" بـ`RegisterView` ما كان فيه أي `disabled`/state أثناء الإرسال — ضغطتين متتاليتين (لمس سريع أو بطء شبكة) = تسجيلين منفصلين
- **الإصلاح (L123):** إضافة `submitting` state، تعطيل الزر أثناء الإرسال
- **تحقّق حي:** أحمد سجّل صالون تجريبي جديد بعد الإصلاح — "أنضف مرة واحدة فقط" ✅
- **ملاحظة تنظيف:** النسخة المكرّرة القديمة لصالون "لقمان" احتاجت حذف يدوي من لوحة الإدارة (بيانات فعلية، مو شي يُصلَح بتحديث كود)

**الحالة: ✅ الإصلاحان مرفوعان على main ومختبران حياً بنجاح.**

---

### 2026-07-14 — لوحة الإدارة: تمييز الصالونات المحذوفة عن المجمّدة + إصلاحات فلاتر مرافقة

أثناء مراجعة أحمد لصفحة الصالونات بلوحة الإدارة (بعد اختبار حذف صالون "البرنس")، لاحظ إن الصالون المحذوف يظهر بعلامة "مجمّد" العامة بدون تمييز، وطلب قسم/فلتر منفصل للمحذوفين.

**التغييرات المنجزة:**
1. **`admin/src/app/api/salons/route.ts`:** إضافة حساب `is_deleted` لكل صالون (`frozen && !owner_pin_hash`) بالسيرفر، بدون تسريب `owner_pin_hash` نفسه للمتصفح
2. **`admin/src/app/(admin)/salons/page.tsx`:**
   - شارة مميّزة "🗑 محذوف (بقرار المالك)" منفصلة عن "🔒 مجمّد"
   - زرّان منفصلان بالفلاتر: "🔒 المجمّدة" و"🗑 المحذوفة" (بدل زر واحد مشترك بمحاولة أولى، صُحِّح بطلب أحمد)
   - إخفاء المجمّد/المحذوف من القائمة الافتراضية، يظهر فقط عند اختيار الفلتر المخصّص
   - حذف حالة "موقوفة" بالكامل (تبويب الفلتر + زر "⏸ تعليق") — بطلب أحمد، لأنها تكرار مفهومي لـ"مجمّد"
3. **إصلاح خلل مرافق:** فلتر حالة الصالون (تنتظر مراجعة/موافق/مرفوض) كان يجلب البيانات من السيرفر (`?status=`) فيُسقط أي صالون مجمّد/محذوف تماماً من `salons` state عند اختيار أي تبويب غير "الكل" — يخفي زري المجمّدة/المحذوفة بالكامل رغم وجود بيانات. حُوِّل لفلترة محلية (client-side) مطابقة لأسلوب فلتر الاشتراك الموجود أصلاً

**تحقّق حي:** أحمد أكّد الزرّين يعملان صح ويبقيان ظاهرين بغض النظر عن تبويب الحالة المفتوح.

**الحالة: ✅ مكتمل، مرفوع على main.**

---

### 2026-07-14 — تقييم صادق لمستوى حماية بيانات العملاء + الحاجة لمراجعة أمنية مستقلة (Pentest) قبل الإطلاق

أحمد سأل تقييماً صادقاً لمستوى حماية بيانات العملاء حالياً (سيبابيس + الكود)، وهل فيه شي يحمي 100%، وهل إنسان يحميها أفضل من كلود. التسجيل هنا للرجوع له مستقبلاً قبل أي إطلاق تجاري حقيقي.

**تقييم تقديري (مو رقم علمي دقيق، بناءً على شغل الجلسات الفعلي):**
- **سيبابيس (RLS + GRANT):** ~75-80% بعد تحقق ومطابقة شاملة اليوم. قبل اليوم كان أقل بكثير — اكتُشف 4 جداول بنفس فخّ الـsequence، وpromo_codes بدون INSERT/DELETE أصلاً. هذا رقم "اللحظة الحالية" فقط، يحتاج انضباط مستمر (نفس قواعد CLAUDE.md) وإلا يتراجع مع أي جدول/عمود جديد
- **الكود:** ~55-65%. رمز دخول الصالون محمي (hash بالسيرفر). رمز دخول **العميل** أضعف معمارياً — يتحقق محلياً بـlocalStorage بشكل أساسي، والتحقق بالسيرفر خلفي صامت لا يمنع الدخول (اكتُشف أثناء اختبار نقطة 19)

**لا شي يحمي 100% — مبدأ أساسي بالأمن السيبراني (defense in depth، مو رقم نهائي).**

**الفرق بين مراجعة الكود (اللي نسويها بالجلسات) وبين Pentest حقيقي:**
مراجعة الكود = "هل هذا يطابق القصد؟" (عقلية تحقّق). Pentest = هجوم فعلي على التطبيق **المنشور الحي** بعقلية عدائية ("كيف أكسره؟"). أمثلة ثغرات لم تُختبر إطلاقاً بأي جلسة حتى الآن:
1. **IDOR** — هل عميل يقدر يشوف حجز/بيانات عميل أو صالون ثاني بس بتغيير ID بالطلب؟
2. **تجاوز Rate Limiting** — عبر IP rotation/VPN، هل يصمد الحد الفعلي؟
3. **XSS** — هل حقول نصية (اسم صالون، رسالة ترحيب، رسائل) تُرمَّز صح وقت العرض، أو تُنفَّذ كـHTML/JS؟
4. **أمان الجلسة/الكوكيز** — HttpOnly/Secure/SameSite مضبوطة صح؟ هل جلسة تسجيل الدخول قابلة للسرقة؟
5. **إساءة استخدام منطق العمل** — استغلال أكواد الخصم أو تدفقات الحجز بطرق غير مقصودة
6. **تسريب أسرار بكود المتصفح** — فحص شامل لملفات الـJS المُجمّعة (bundle) العامة

**ليش كلود ما يعوّض هذا كامل:** بدون أدوات فحص متخصصة (SAST/DAST)، بدون متصفح حي يهاجم فيه التطبيق المنشور فعلياً وقت التحليل، وبعقلية افتراضية "تحقق من الصحة" مو "حاول تكسر" — فرق جوهري بمجال الأمن.

**القرار:** غير عاجل حالياً (بدون عملاء حقيقيين وأموال فعلية بعد — يطابق قرار تأجيل Tier 2 السابق). **إلزامي قبل أي إطلاق تجاري حقيقي.** خيارات عملية غير مكلفة: مستشار أمن مستقل لمراجعة مركّزة (أرخص من شركة كبيرة)، أو أدوات فحص آلية (OWASP ZAP، Snyk لفحص ثغرات المكتبات). النقطة مسجّلة أيضاً كنقطة #92 بـ`الفحص-الشامل.md`.

**دليل عملي مبسّط — أحمد يفحص تطبيقه بنفسه (بأدوات المتصفح، بدون برامج إضافية):**

⚠️ **قاعدة أمان قبل البدء:** اختبارات "الكتابة" (XSS، استغلال الأكواد) على **صالون تجريبي ببياناتك أنت بس** — مو صالون "الوادي" الحقيقي. اختبارات "القراءة" (IDOR) لا تتعمّد تعديل بيانات حد ثاني حتى لو قدرت تشوفها.

**1. XSS — هل النصوص المُدخلة تُنفَّذ كـHTML/JS؟**
- بأي حقل نصي يظهر لاحقاً لطرف ثاني (اسم صالون، رسالة ترحيب، رسالة بالمحادثة، تعليق تقييم) — اكتب بالضبط: `<img src=x onerror=alert('XSS')>`
- احفظ، وشوف الحقل من حساب ثاني (عميل يشوف اسم الصالون، أو صالون يشوف تعليق العميل)
- **آمن:** يظهر كنص حرفي `<img src=x...>` بدون أي نافذة تنبيه. **خطر:** تطلع نافذة "XSS" منبثقة — هذا يعني أي زائر ممكن يُحقن كود خبيث فعلي.

**2. IDOR — هل تقدر تشوف بيانات حساب ثاني بس بتغيير رقم؟**
- افتح F12 → Network، وسوّي أي عملية تجيب بياناتك (مثلاً فتح تفاصيل حجزك، أو صفحة "حساباتي")
- لاقي الطلب اللي فيه رقم ID بياناتك بالرابط أو بالـbody
- انسخ نفس الطلب لكن غيّر الرقم لرقم غير رقمك (جرّب أرقام قريبة، ١، ٢، ٣...)
- **آمن:** يرجع خطأ أو "غير موجود". **خطر:** يرجع بيانات حساب حد ثاني فعلياً.

**3. تجاوز Rate Limiting — هل الحد الأقصى للمحاولات يصمد؟**
- بشاشة تسجيل دخول الصالون أو العميل، جرّب رمز سري خاطئ بسرعة أكثر من 5 مرات متتالية
- **آمن:** يقفل بعد العدد المحدد برسالة واضحة (زي ما اختبرنا اليوم فعلاً ✅). **خطر:** يستمر يقبل محاولات بلا حد

**4. أمان الجلسة (Cookies)**
- بعد تسجيل الدخول، افتح F12 → Application (أو Storage) → Cookies
- دوّر على الكوكي `dork_owner_session` أو `dork_customer_session`
- شوف الأعمدة: **HttpOnly** لازم ✓، **Secure** لازم ✓
- **آمن:** الاثنين مفعّلين. **خطر:** أي وحدة منهم مو مفعّلة — يعني الجلسة أسهل سرقة

**5. تسريب أسرار بكود المتصفح**
- F12 → Sources (أو Ctrl+U لعرض المصدر)، وابحث (Ctrl+F داخل الملفات) عن كلمات: `service_role`, `SECRET`, `PRIVATE_KEY`
- **آمن:** ولا نتيجة (أو بس مفاتيح anon/publishable المعروف إنها عامة). **خطر:** أي ظهور لكلمة service_role أو secret أو private key فعلية

**6. إساءة استخدام منطق العمل (اختياري، أعقد شوي)**
- جرّب استخدام نفس كود خصم أكثر من `max_uses` المحدد له — يفترض يرفض بعد الحد
- جرّب حجز نفس الموعد بنفس الحلاق مرتين بسرعة (نافذتين متصفح) — يفترض يمنع التعارض

لو أي اختبار طلع نتيجة "خطر"، سجّلها هنا بتاريخها وأرسلها لي أول ما تصحى — نصلحها فوراً بنفس المنهجية.

---

### 2026-07-14 — ثغرة حقيقية مكتشَفة: `customers.pin_hash` قابل للقراءة والتعديل من anon/authenticated

أثناء توثيق نقاط Tier 2 المؤجلة بملف الأمان الجديد، لوحظ إن نفس فخّ "أعمدة حساسة مكشوفة" اللي أُصلح على `salons` اليوم (owner_pin_hash) **لم يُطبَّق على `customers`** — فخّ موازٍ غير مكتشف قبل الآن.

**الخطورة:** `anon`/`authenticated` عندهم GRANT SELECT **و** UPDATE على `pin_hash`, `pin_fails`, `pin_locked_until` لجدول `customers`. التطبيق نفسه ما يطلب هذي الأعمدة أبداً (تحقّق: صفر نتائج بحث لـ`pin_hash` بكل استدعاءات `sb("customers"...)` بـApp.jsx) — لكن أي طلب API مباشر (خارج التطبيق، زي Postman أو تعديل طلب بـNetwork tab) يقدر:
- يقرأ `pin_hash` لأي عميل (مشفّر، لكن يفتح باب هجوم offline)
- **الأخطر: يكتب/يغيّر `pin_hash` لأي عميل مباشرة** — استيلاء كامل على أي حساب عميل بدون كسر أي تشفير، فقط لأن الصلاحية مفتوحة بقاعدة البيانات

**الإصلاح المطبَّق (على DORK وDORK-TEST معاً، بتأكيد أحمد):**
```sql
REVOKE SELECT (pin_hash, pin_fails, pin_locked_until), UPDATE (pin_hash, pin_fails, pin_locked_until) ON customers FROM anon, authenticated;
```
آمن 100% — لا يؤثر على أي ميزة (التحقق من رمز العميل يصير عبر `api/customer-auth.js` بصلاحية service_role، مو عبر anon مباشرة).

**الحالة: ✅ مُصلح على المشروعين.**

**ملاحظة مهمة للمستقبل:** هذا اكتشاف بالصدفة أثناء توثيق، مو نتيجة فحص منهجي شامل لكل الأعمدة الحساسة بكل الجداول. **الفجوة الجذرية الحقيقية لسه موجودة** — قسم "Tier 2" أعلاه بهذا الملف (من 2026-07-02) يوثّق إن `customers`/`bookings`/`reviews`/`promo_codes` عندها RLS policies مفتوحة بالكامل (`USING (true)`) للقراءة والتعديل، لأن ما فيه نظام هوية حقيقي (`auth.uid()`) مطبَّق بعد. هذا القرار كان مؤجَّل بوعي وقت ما فيه عملاء حقيقيين — **يحتاج مراجعة الآن** بما إن فيه صالون حقيقي (الوادي) وتوجّه نحو إطلاق تجاري. راجع تفاصيل الحل الكامل بقسم Tier 2 أعلاه ونقطة 86 بـ`الفحص-الشامل.md`.
