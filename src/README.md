# Dork App - Source Code Structure

## مجلدات المشروع

### `/api` - اتصالات وخدمات خارجية
- **`supabase.js`** - Supabase client configuration + REST API (`sb` function)
  - يتعامل مع جميع اتصالات قاعدة البيانات
  - يوفر دالة عامة `sb()` لجميع عمليات REST

### `/utils` - دوال مساعدة ومنطقيات

#### **`helpers.js`**
- `normPhone()` - تنظيف أرقام الهواتف
- `calcTotal()` - حساب إجمالي الأسعار
- `openMaps()` - فتح خريطة جوجل
- `todayStr()` - التاريخ الحالي بصيغة ISO
- `makeSlots()` - إنشاء فترات زمنية
- `getSlotsForSalon()` - الفترات المتاحة للصالون
- `normalizeBgId()` - تنظيف معرف الخلفية
- ثوابت: `SLOT_MIN`, `MONTHS_AR`

#### **`transformers.js`**
- `toAppSalon()` - تحويل بيانات الصالون من DB → App
- `toDbSalon()` - تحويل بيانات الصالون من App → DB
- `toAppBooking()` - تحويل بيانات الحجز من DB → App
- `toAppCustomer()` - تحويل بيانات العميل من DB → App
  - يتعامل مع localStorage للـ history و favs

#### **`notifications.js`**
- `getCustomerClassification()` - تصنيف العميل (جديد/منتظم/مميز/غير ملتزم)
- `requestNotifPermission()` - طلب إذن الإشعارات
- `sendNotif()` - إرسال إشعار (محلي + Supabase)
- يطلب الإذن تلقائياً عند تحميل التطبيق

#### **`audio.js`**
- `playTone()` - تشغيل أصوات تنبيه مختلفة
  - 16 نوع صوت (scissors, bell, welcome, etc)
  - يستخدم Web Audio API

#### **`ui.js`** (جديد)
- `buildDorkBgStyle()` - بناء نمط الخلفية الديناميكي
- `buildHomeReviewsFeed()` - تجميع وترتيب تقييمات العملاء

### `/components` - مكونات React

#### **`Logo.jsx`** (جديد)
- `DorkLogoSvg` - شعار التطبيق (scissors + clock + pin design)

(باقي المكونات سيتم تقسيمها لاحقاً)

### `/data` - بيانات ثابتة (جديد)

#### **`locations.js`**
- `BASE_LOC` - هرمية المناطق والمحافظات والمراكز والقرى الكاملة

### `/constants.js` (جديد)
- `TONES` - 16 صوت تنبيه
- `THEMES` - 8 أنماط لونية
- `BACKGROUNDS` - 9 أنماط خلفية
- `BG_LIGHT_STYLES` - نسخة فاتحة من الخلفيات
- `DEFAULT_SERVICES` - الخدمات الافتراضية
- `DEFAULT_SOCIAL_LINKS` - إعدادات الوسائط الاجتماعية

### `/hooks` - Custom React Hooks
(للمراحل المستقبلية)

## طريقة الاستخدام

```javascript
// API و البيانات
import { supabase, sb } from "./src/api/supabase";
import { BASE_LOC } from "./src/data/locations";
import { TONES, THEMES, BACKGROUNDS, DEFAULT_SERVICES } from "./src/constants";

// دوال مساعدة
import { normPhone, calcTotal, openMaps } from "./src/utils/helpers";
import { toAppSalon } from "./src/utils/transformers";
import { sendNotif } from "./src/utils/notifications";
import { playTone } from "./src/utils/audio";
import { buildDorkBgStyle, buildHomeReviewsFeed } from "./src/utils/ui";

// مكونات
import { DorkLogoSvg } from "./src/components/Logo";
```

## معايير الترتيب والاستخراج

الملفات مرتبة حسب:
1. **المستوى** - API أولاً (حتى يعتمد عليها الـ utils)
2. **الوظيفة** - دوال بسيطة أولاً (helpers)، ثم معقدة (transformers)
3. **الاستقلالية** - كل ملف يعتمد على الملفات اللي قبله

**خطوات استخراج مكون جديد:**
1. ابحث عن `function ComponentName` في App.jsx
2. انسخ كود المكون الكامل
3. أنشئ ملف جديد `src/components/ComponentName.jsx` (أو views/ للصفحات الكاملة)
4. أضف `import { G } from "../styles";` على رأس الملف
5. صدّر المكون: `export { ComponentName };`
6. أضف `import { ComponentName } from "./src/components/ComponentName";` في App.jsx
7. اختبر البناء: `npm run build`
8. احذف المكون الأصلي من App.jsx
9. قم بعمل commit مع رسالة واضحة

## هيكلة النوع المهني

هذه الهيكلة تتبع معايير:
- **Airbnb** - React Styleguide
- **Slack** - Code Organization
- **Facebook** - Component Structure

```
✅ سهولة الصيانة - أي خطأ يكون في ملف واحد
✅ سرعة التطوير - كل ملف صغير وسهل الفهم
✅ توفير التوكنات - قراءة ملف واحد بدل الملف الضخم
✅ لا تضارب - كل ملف له مسؤولية واحدة
```

## التقدم حالياً ✅

**المرحلة الأولى - استخراج الأساسيات (COMPLETED):**

✅ تقليل App.jsx من 4851 → 4405 سطر (-446 سطر = -9.2%)

**الملفات المستخرجة:**
- `src/api/supabase.js` - Supabase client ودوال REST
- `src/constants.js` - TONES, THEMES, BACKGROUNDS, DEFAULT_SERVICES, DEFAULT_SOCIAL_LINKS
- `src/data/locations.js` - BASE_LOC (هرمية المواقع الكاملة)
- `src/utils/ui.js` - buildDorkBgStyle, buildHomeReviewsFeed
- `src/utils/helpers.js` - دوال مساعدة
- `src/utils/transformers.js` - تحويلات البيانات
- `src/utils/notifications.js` - إدارة الإشعارات
- `src/utils/audio.js` - تشغيل الأصوات
- `src/components/Logo.jsx` - مكون الشعار
- `src/styles.js` - الأنماط العالمية (G)

📋 **المرحلة الثانية - استخراج المكونات (المتبقية):**

الملفات المتبقية في App.jsx (أكثر من 30 مكون):

**مكونات العرض الرئيسية (~10 مكون):**
- TopBar - شريط التنقل العلوي
- HomeView - الصفحة الرئيسية
- HomeReviewsSection - قسم التقييمات
- SalonPage - صفحة الصالون
- SalonCard - بطاقة الصالون
- BookView - عرض الحجز
- OwnerDash - لوحة المالك
- CustomerDash - لوحة العميل
- SettingsView - إعدادات التطبيق
- TermsView - شروط الاستخدام

**مكونات إضافية (~20+ مكون):**
- OwnerLogin, CustomerLogin - تسجيل الدخول
- OwnerReviewsPanel - لوحة التقييمات
- BookingCalendar - تقويم الحجوزات
- NotifsView - إشعارات
- CompareSalonsView - مقارنة الصالونات
- والمزيد من المكونات الفرعية

**التنظيم المقترح:**
```
src/
├── components/      # عناصر واجهة قابلة لإعادة الاستخدام
│   ├── Logo.jsx
│   ├── TopBar.jsx
│   ├── SalonCard.jsx
│   └── ...
├── views/          # صفحات كاملة
│   ├── HomeView.jsx
│   ├── SalonPage.jsx
│   ├── OwnerDash.jsx
│   └── ...
└── forms/          # نماذج متخصصة
    ├── BookingForm.jsx
    └── ...
```
