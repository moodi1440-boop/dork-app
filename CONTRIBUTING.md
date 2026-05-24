# 🤝 دليل المساهمة في Dork App

شكراً لاهتمامك بالمساهمة في مشروع Dork App! هذا الدليل سيساعدك على فهم العملية والمعايير.

## 📋 قبل البدء

1. **اقرأ** ملف [README.md](./README.md) لفهم المشروع
2. **اقرأ** توثيق [src/README.md](./src/README.md) لفهم معمارية المشروع
3. **تأكد** من تثبيت البيئة بشكل صحيح

## 🔄 عملية المساهمة

### 1️⃣ Fork المستودع

```bash
# انقر على "Fork" في GitHub
git clone https://github.com/YOUR_USERNAME/dork-app.git
cd dork-app
```

### 2️⃣ إنشاء فرع جديد

```bash
git checkout -b feature/feature-name
# أو للإصلاحات:
git checkout -b fix/bug-name
```

**قوالب أسماء الفروع:**
- `feature/add-booking-notifications` - ميزة جديدة
- `fix/null-pointer-exception` - إصلاح خطأ
- `docs/update-readme` - توثيق
- `refactor/extract-components` - إعادة هيكلة

### 3️⃣ تطوير الميزة

```bash
# تثبيت المكتبات
npm install

# بدء سيرفر التطوير
npm run dev

# اختبر التغييرات على http://localhost:5173
```

**معايير الترميز:**
- ✅ اتبع معايير [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- ✅ استخدم أسماء وصفية للمتغيرات والدوال
- ✅ أضف تعليقات للمنطق المعقد فقط
- ✅ تجنب الأسطر الطويلة (أكثر من 100 حرف)

### 4️⃣ الاختبار

```bash
# بناء الكود
npm run build

# تحقق من عدم وجود أخطاء
# ✅ جميع الملفات يجب أن تتجمع بدون أخطاء
```

### 5️⃣ Commit و Push

```bash
# أضف التغييرات
git add .

# اكتب رسالة commit واضحة
git commit -m "feat: add email notifications for bookings

- Implement email service integration
- Add notification preferences to customer dashboard
- Update database schema"

# ادفع إلى فرعك
git push origin feature/feature-name
```

**قوالب رسائل Commit:**
```
feat: وصف قصير للميزة
fix: وصف قصير للإصلاح
docs: تحديثات التوثيق
refactor: إعادة هيكلة الكود
test: إضافة أو تحديث الاختبارات
chore: تحديثات البناء والمكتبات
```

### 6️⃣ فتح Pull Request

```bash
# انقر على "New Pull Request" في GitHub
```

**متطلبات PR:**
- ✅ اشرح الغرض من التغيير
- ✅ ربط المشكلة ذات الصلة (إن وجدت)
- ✅ أضف لقطات شاشة للتغييرات البصرية
- ✅ تحقق من قائمة التحقق

**قالب PR:**
```markdown
## الوصف
وصف مختصر للتغيير

## نوع التغيير
- [ ] ميزة جديدة
- [ ] إصلاح خطأ
- [ ] تحديث التوثيق

## الاختبار
- [ ] اختبرت على localhost
- [ ] البناء ناجح بدون أخطاء
- [ ] لا توجد تحذيرات جديدة

## صور / فيديو (اختياري)
أضف لقطات شاشة أو فيديو للتغييرات البصرية

## Checklist
- [ ] قرأت CONTRIBUTING.md
- [ ] اتبعت معايير الترميز
- [ ] اختبرت التغييرات
- [ ] لم أغير package.json بدون سبب
```

## 📐 معايير الترميز

### هيكل الملفات

**للمكونات:**
```javascript
// src/components/MyComponent.jsx
import React from "react";
import { G } from "../styles";

function MyComponent({ prop1, prop2 }) {
  // المنطق
  return (
    <div style={G.card}>
      {/* المحتوى */}
    </div>
  );
}

export { MyComponent };
```

**للعروض:**
```javascript
// src/views/MyView.jsx
import React, { useState } from "react";
import { G } from "../styles";
import { MyComponent } from "../components/MyComponent";

function MyView({ ...props }) {
  // المنطق
  return (
    <div style={G.shell}>
      <MyComponent />
    </div>
  );
}

export { MyView };
```

### تسمية المتغيرات

```javascript
// ✅ جيد
const [isLoading, setIsLoading] = useState(false);
const userEmail = customer?.email;
const MAX_RETRIES = 3;

// ❌ سيء
const [loading, setLoading] = useState(false);
const mail = c?.e;
const max_retries = 3;
```

### استيراد الملفات

```javascript
// ✅ جيد - مرتبة ومنطقية
import React, { useState } from "react";
import { G } from "../styles";
import { supabase } from "../api/supabase";
import { normPhone } from "../utils/helpers";
import { TopBar } from "../components/TopBar";

// ❌ سيء - غير مرتبة
import { TopBar } from "../components/TopBar";
import { G } from "../styles";
import React from "react";
import { normPhone } from "../utils/helpers";
```

## 🗂️ إضافة مكون جديد

### خطوات استخراج مكون:

1. **تحديد المكون** في App.jsx
2. **نسخ الكود** الكامل للمكون
3. **إنشاء ملف** جديد:
   - `src/components/ComponentName.jsx` (للمكونات الصغيرة)
   - `src/views/ViewName.jsx` (للصفحات الكاملة)
4. **إضافة الاستيرادات** المطلوبة
5. **تصدير المكون**: `export { ComponentName };`
6. **استيراد في App.jsx**: `import { ComponentName } from "./src/components/ComponentName";`
7. **اختبار البناء**: `npm run build`
8. **حذف المكون الأصلي** من App.jsx
9. **Commit مع رسالة واضحة**

## 📊 معايير الجودة

### البناء يجب أن:
- ✅ يتجمع بدون أخطاء
- ✅ لا يحتوي على تحذيرات غير ضرورية
- ✅ ينتج bundle حجمه معقول

### الكود يجب أن:
- ✅ يتبع معايير Airbnb
- ✅ لا يحتوي على eslint errors
- ✅ له أسماء وصفية واضحة
- ✅ يحافظ على الأداء

### التعليقات:
- ✅ اشرح **لماذا** وليس **ماذا**
- ✅ استخدم تعليقات فقط للمنطق المعقد
- ✅ حدث التعليقات مع تحديث الكود

## 🔒 القواعد الذهبية لاستعلامات قاعدة البيانات

**هذه القواعس إلزامية 100% - لا استثناءات**

### 1️⃣ Zero Select: ممنوع `select('*')`

```javascript
// ❌ ممنوع منعاً باتاً
sb("bookings", "GET", null, "?select=*")
sb("customers", "GET", null, "?select=*")

// ✅ يجب تحديد الأعمدة المطلوبة فقط
sb("bookings", "GET", null, "?select=id,customer_id,salon_id,date,status")
sb("customers", "GET", null, "?select=id,name,phone,email")
```

**السبب:** جلب جميع الأعمدة يستهلك بيانات غير ضرورية ويزيد الـ Egress.

---

### 2️⃣ Mandatory Filter: فلتر محدد إلزامي

أي استعلام لـ `bookings`, `messages`, `waiting_list` **يجب** أن يحتوي على WHERE:

```javascript
// ❌ ممنوع - بدون فلتر
sb("bookings", "GET", null, "?select=id,date&limit=100")

// ✅ يجب تحديد salon_id أو customer_id
sb("bookings", "GET", null, `?select=id,date&salon_id=eq.${salonId}&limit=100`)
sb("bookings", "GET", null, `?select=id,date&customer_id=eq.${customerId}&limit=100`)

// ✅ أو customer_phone للعملاء
sb("bookings", "GET", null, `?select=id,date&customer_phone=eq.${phone}&limit=100`)
```

**السبب:** الاستعلامات بدون فلتر تحمل جميع البيانات، مما يسبب تسرب بيانات وزيادة استهلاك النطاق الترددي.

---

### 3️⃣ Pagination/Limit: استخدام Limit دائماً

إذا كانت البيانات قد تكون كثيرة، استخدم `limit`:

```javascript
// ❌ بدون limit - قد يحمل ملايين الصفوف
sb("messages", "GET", null, `?select=id,text&chat_id=eq.${chatId}`)
sb("reviews", "GET", null, `?select=*&salon_id=eq.${salonId}`)

// ✅ مع limit وorder
sb("messages", "GET", null, `?select=id,text,sender_id,created_at&chat_id=eq.${chatId}&order=created_at.desc&limit=50`)
sb("reviews", "GET", null, `?select=id,rating,text,created_at&salon_id=eq.${salonId}&order=created_at.desc&limit=20`)
```

**الـ Limits الموصى بها:**
- Messages/Chat: `limit=50`
- Reviews: `limit=20`
- Bookings: `limit=100-1000`
- Customers: `limit=500`

**السبب:** تحديد الكمية يمنع تحميل البيانات غير الضرورية.

---

### 4️⃣ RLS Awareness: افترض الحماية مفعلة دائماً

افترض أن **Row Level Security** مفعلة على جميع الجداول:

```javascript
// ✅ أضف session_token في Headers
const headers = {
  'Authorization': `Bearer ${sessionToken}`,
};

// ✅ تأكد أن الاستعلام يحترم صلاحيات المستخدم
// (الـ RLS سيرفضه تلقائياً إذا لم يكن للمستخدم صلاحية)
sb("bookings", "GET", headers, `?select=id,date&salon_id=eq.${userSalonId}`)

// ❌ لا تحاول الالتفاف على RLS بـ workarounds
// لا تستخدم service_role في الـ frontend
// لا تطلب بيانات المستخدمين الآخرين
```

**السبب:** RLS هو خط الدفاع الأخير ضد تسرب البيانات.

---

### 📋 قائمة التحقق قبل Commit:

- [ ] هل جميع الاستعلامات تحدد الأعمدة (بدون `*`)?
- [ ] هل جميع استعلامات الجداول الحساسة لها فلتر WHERE؟
- [ ] هل أضفت `limit` حيث ينبغي؟
- [ ] هل الاستعلام يحترم RLS والتحكم بالوصول؟
- [ ] هل اختبرت الاستعلام محلياً؟

---

### ⚠️ إذا انتهكت هذه القواعس:

1. **سيتم رفض PR**
2. يجب إصلاح جميع الاستعلامات
3. أعد الطلب (Re-request Review)

**الهدف:** حماية البيانات وتجنب تسرب البيانات مثلما حدث سابقاً (18GB Egress).

## 🐛 الإبلاغ عن الأخطاء

استخدم [GitHub Issues](https://github.com/moodi1440-boop/dork-app/issues) مع القالب:

```markdown
## الوصف
وصف مختصر للخطأ

## خطوات التكرار
1. افعل هذا
2. ثم افعل هذا
3. انقر هنا

## السلوك المتوقع
يجب أن يحدث هذا

## السلوك الفعلي
لكن هذا يحدث بدلاً منه

## معلومات البيئة
- المتصفح: Chrome/Firefox/Safari
- النظام: Windows/Mac/Linux
- الإصدار: 1.0.0

## لقطات شاشة
أضف لقطات شاشة إن أمكن
```

## ✨ طلبات الميزات

استخدم [GitHub Discussions](https://github.com/moodi1440-boop/dork-app/discussions) للنقاش:

```markdown
## الفكرة
وصف الميزة المرغوبة

## المشكلة التي تحلها
وصف المشكلة الحالية

## الحل المقترح
كيف يجب أن تعمل الميزة

## بدائل
هل توجد حلول أخرى؟
```

## 📚 موارد مفيدة

- [React Documentation](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Conventional Commits](https://www.conventionalcommits.org)

## 🎯 نصائح للمساهمين الجدد

- 🔍 ابدأ بـ issues المعلمة بـ `good first issue`
- 💬 اطرح أسئلتك في Discussions
- 📖 اقرأ الكود الموجود قبل الكتابة
- 🧪 اختبر التغييرات محلياً قبل الـ push
- 📝 كتابة رسائل commit واضحة تساعد الآخرين

## ⚖️ قواعس السلوك

- ✅ كن احترافياً وودود
- ✅ احترم آراء الآخرين
- ✅ كن مرحباً بالنقد البناء
- ✅ ركز على المشكلة وليس الشخص

---

**شكراً مرة أخرى على مساهمتك! 🙏**

