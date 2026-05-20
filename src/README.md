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

### `/components` - مكونات React
(سيتم تقسيمها لاحقاً - كل مكون في ملف منفصل)

### `/hooks` - Custom React Hooks
(للمراحل المستقبلية)

## طريقة الاستخدام

```javascript
// استيراد من الملفات المنفصلة
import { supabase, sb } from "./src/api/supabase";
import { normPhone, calcTotal } from "./src/utils/helpers";
import { toAppSalon } from "./src/utils/transformers";
import { sendNotif } from "./src/utils/notifications";
import { playTone } from "./src/utils/audio";
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

## المرحلة التالية

سيتم تقسيم:
1. المكونات الرئيسية (TopBar, HomeView, SalonPage, etc) في `components/`
2. Custom hooks في `hooks/`
3. الثوابت والإعدادات في `config.js` أو `constants.js`
