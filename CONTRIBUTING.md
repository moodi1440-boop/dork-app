# 🤝 دليل المساهمة في Dawrak App

شكراً لاهتمامك بالمساهمة في مشروع Dawrak App! هذا الدليل سيساعدك على فهم العملية والمعايير.

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

**ملاحظة مهمة:** القواعس الذهبية لاستعلامات قاعدة البيانات موثقة في `ملف_الاتفاقيات/ملف_الاتفاقيات.md` (القاعدة رقم 20) - الرجاء مراجعتها قبل كتابة أي استعلام جديد.

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

