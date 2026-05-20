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

## معايير الترتيب

الملفات مرتبة حسب:
1. **المستوى** - API أولاً (حتى يعتمد عليها الـ utils)
2. **الوظيفة** - دوال بسيطة أولاً (helpers)، ثم معقدة (transformers)
3. **الاستقلالية** - كل ملف يعتمد على الملفات اللي قبله

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

## التقدم حالياً

✅ **تم:**
- استخراج الثوابت الأساسية → `constants.js`
- استخراج بيانات المواقع → `data/locations.js`
- استخراج دوال بناء الواجهة → `utils/ui.js`
- استخراج مكون الشعار → `components/Logo.jsx`
- تقليل App.jsx من 4851 إلى 4641 سطر

⏳ **المرحلة التالية:**
1. استخراج مكونات العروض (TopBar, HomeView, SalonPage, etc)
2. تنظيم المكونات في مجلدات حسب النوع:
   - `components/` - عناصر واجهة
   - `views/` - صفحات كاملة
   - `pages/` - تدفقات معقدة
3. Custom hooks في `hooks/`
4. نماذج في `forms/`
