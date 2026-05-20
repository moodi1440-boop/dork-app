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

### `/components` - مكونات React (14 ملف)

#### **UI Components:**
- **`TopBar.jsx`** - شريط التنقل العلوي (زر القص، الحساب، الإعدادات)
- **`Logo.jsx`** - شعار التطبيق (scissors + clock + pin design)
- **`SalonCard.jsx`** - بطاقة الصالون مع التقييمات والحجز
- **`HomeReviewsSection.jsx`** - قسم التقييمات والآراء (carousel)
- **`LocFilter.jsx`** - مكون تصفية المواقع
- **`ShareBtn.jsx`** - زر المشاركة
- **`StatsPanel.jsx`** - لوحة الإحصائيات
- **`InlineStarRating.jsx`** - تقييم النجوم المباشر
- **`FAQItem.jsx`** - عنصر الأسئلة الشائعة

#### **Advanced Components:**
- **`NotifPanel.jsx`** - لوحة الإشعارات (209 سطور)
- **`OwnerReviewsPanel.jsx`** - لوحة تقييمات المالك
- **`BookingCalendar.jsx`** - تقويم الحجوزات
- **`MessagesPanel.jsx`** - لوحة الرسائل
- **`OwnerSettings.jsx`** - إعدادات المالك (231 سطر)
- **`OtpInput.jsx`** - حقل إدخال OTP (145 سطر)

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
// ====== API و البيانات ======
import { supabase, sb } from "./src/api/supabase";
import { BASE_LOC } from "./src/data/locations";
import { TONES, THEMES, BACKGROUNDS, DEFAULT_SERVICES } from "./src/constants";

// ====== دوال مساعدة ======
import { normPhone, calcTotal, openMaps, todayStr, getSlotsForSalon } from "./src/utils/helpers";
import { toAppSalon, toDbSalon, toAppBooking, toAppCustomer } from "./src/utils/transformers";
import { getCustomerClassification, sendNotif } from "./src/utils/notifications";
import { playTone } from "./src/utils/audio";
import { buildDorkBgStyle, buildHomeReviewsFeed } from "./src/utils/ui";
import { SL, F } from "./src/helpers/FormHelpers";

// ====== مكونات (Reusable Components) ======
import { TopBar } from "./src/components/TopBar";
import { SalonCard } from "./src/components/SalonCard";
import { HomeReviewsSection } from "./src/components/HomeReviewsSection";
import { NotifPanel } from "./src/components/NotifPanel";
import { BookingCalendar } from "./src/components/BookingCalendar";
import { DorkLogoSvg } from "./src/components/Logo";

// ====== عروض (Full Page Views) ======
import { HomeView } from "./src/views/HomeView";
import { SalonPage } from "./src/views/SalonPage";
import { OwnerDash } from "./src/views/OwnerDash";
import { CustomerDash } from "./src/views/CustomerDash";
import { SettingsView } from "./src/views/SettingsView";

// ====== أنماط ======
import { G } from "./src/styles";
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

✅ **المرحلة الثانية - استخراج المكونات (COMPLETED):**

✅ تقليل App.jsx من 4405 → 871 سطر (-3534 سطر = -80.2%)

**الملفات المستخرجة - المكونات (14 ملف):**
- `src/components/TopBar.jsx` - شريط التنقل
- `src/components/SalonCard.jsx` - بطاقة الصالون
- `src/components/HomeReviewsSection.jsx` - قسم التقييمات (138 سطر)
- `src/components/NotifPanel.jsx` - لوحة الإشعارات (209 سطور)
- `src/components/OwnerReviewsPanel.jsx` - لوحة تقييمات المالك (123 سطر)
- `src/components/BookingCalendar.jsx` - تقويم الحجوزات
- `src/components/MessagesPanel.jsx` - لوحة الرسائل
- `src/components/OwnerSettings.jsx` - إعدادات المالك (231 سطر)
- `src/components/OtpInput.jsx` - حقل OTP (145 سطر)
- `src/components/StatsPanel.jsx` - لوحة الإحصائيات
- `src/components/LocFilter.jsx` - مرشح المواقع
- `src/components/ShareBtn.jsx` - زر المشاركة
- `src/components/InlineStarRating.jsx` - تقييم النجوم
- `src/components/FAQItem.jsx` - عنصر الأسئلة

**الملفات المستخرجة - العروض (15 ملف):**
- `src/views/HomeView.jsx` - الصفحة الرئيسية (171 سطر)
- `src/views/SalonPage.jsx` - صفحة الصالون
- `src/views/BookView.jsx` - عرض الحجز (111 سطر)
- `src/views/OwnerDash.jsx` - لوحة المالك (298 سطر)
- `src/views/CustomerDash.jsx` - لوحة العميل (370 سطر)
- `src/views/SettingsView.jsx` - الإعدادات (213 سطر)
- `src/views/SalonReviewsView.jsx` - عروض التقييمات
- `src/views/TermsView.jsx` - شروط الاستخدام
- `src/views/RegisterView.jsx` - التسجيل (267 سطر)
- `src/views/AllReviewsView.jsx` - جميع التقييمات
- `src/views/NotifsView.jsx` - الإشعارات
- `src/views/CompareSalonsView.jsx` - مقارنة الصالونات
- `src/views/NearMapView.jsx` - عرض الخريطة
- `src/views/OwnerLogin.jsx` - دخول المالك
- `src/views/CustomerLogin.jsx` - دخول العميل (270 سطر)

**الملفات المستخرجة - المساعدة (1 ملف):**
- `src/helpers/FormHelpers.jsx` - مساعدات النماذج (SL, F)

**هيكل المشروع الحالي (FINAL):**
```
src/
├── api/             # 1 ملف
│   └── supabase.js - Supabase client + REST API
├── utils/           # 4 ملفات
│   ├── helpers.js
│   ├── transformers.js
│   ├── notifications.js
│   ├── audio.js
│   └── ui.js
├── components/      # 14 ملف - عناصر واجهة قابلة لإعادة الاستخدام
│   ├── TopBar.jsx
│   ├── SalonCard.jsx
│   ├── HomeReviewsSection.jsx
│   └── ... (11 أخرى)
├── views/           # 15 ملف - صفحات ومشاهد كاملة
│   ├── HomeView.jsx
│   ├── SalonPage.jsx
│   ├── OwnerDash.jsx
│   └── ... (12 أخرى)
├── helpers/         # 1 ملف - مساعدات متخصصة
│   └── FormHelpers.jsx
├── data/            # 1 ملف
│   └── locations.js
├── constants.js     # الثوابت والتكوينات
├── styles.js        # الأنماط العالمية (G object)
└── hooks/           # للمراحل المستقبلية

App.jsx:            # 871 سطر (من 4851 الأصلي)
├── ErrorBoundary class
├── App main component
├── State management
├── Data loading
├── CSS constants
└── Global setup

التقليل الإجمالي:
- المرحلة 1: 4851 → 4405 سطر (-446 سطر، -9.2%)
- المرحلة 2: 4405 → 871 سطر (-3534 سطر، -80.2%)
- المجموع: 4851 → 871 سطر (-3980 سطر، -82.0%)

الملفات المنتجة: 30 ملف (components + views + helpers)
```
