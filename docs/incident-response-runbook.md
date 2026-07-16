# خطة الطوارئ التشغيلية — Dawrak App

## 1. تصنيف الحوادث

| المستوى | الوصف | وقت الاستجابة |
|---------|-------|---------------|
| P1 — حرج | التطبيق لا يعمل كلياً / بيانات مخترقة | فوري < 15 دقيقة |
| P2 — عالي | ميزة رئيسية معطلة (الحجز، الدفع) | < 1 ساعة |
| P3 — متوسط | خطأ يؤثر على بعض المستخدمين | < 4 ساعات |
| P4 — منخفض | مشكلة تجميلية / بطء طفيف | < 24 ساعة |

---

## 2. قائمة الفحص السريع (P1/P2)

### أولاً: تشخيص المصدر
- [ ] Vercel Dashboard → Functions → هل في أخطاء 5xx؟
- [ ] Supabase Dashboard → Database → هل الاتصال يعمل؟
- [ ] Supabase Dashboard → Auth → هل OTP يعمل؟
- [ ] Browser Console → هل في أخطاء JavaScript؟

### ثانياً: إجراءات الطوارئ الفورية

**إذا كان الخطأ في Vercel:**
```bash
# إعادة نشر آخر نسخة مستقرة
vercel rollback --yes
```

**إذا كان الخطأ في قاعدة البيانات:**
```sql
-- فحص الجداول الكبيرة والبطيئة
SELECT * FROM table_bloat_monitor WHERE dead_pct > 20;
-- تنظيف فوري
VACUUM ANALYZE bookings;
```

**إذا كان هجوم (Rate Limit مرتفع):**
```sql
-- فحص أكثر IPs طلباً
SELECT ip, endpoint, COUNT(*) FROM rate_limits
GROUP BY ip, endpoint ORDER BY COUNT(*) DESC LIMIT 20;
-- حذف بيانات IP محدد
DELETE FROM rate_limits WHERE ip = '1.2.3.4';
```

**إذا كان خرق بيانات محتمل:**
1. تجميد الصالون المشتبه به فوراً من لوحة الأدمن
2. تشغيل `audit_log` لمعرفة آخر العمليات:
```sql
SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 50;
```
3. إخطار أحمد فوراً

---

## 3. جهات الاتصال

| الخدمة | الرابط |
|--------|--------|
| Vercel | https://vercel.com/dashboard |
| Supabase | https://supabase.com/dashboard |
| GitHub Actions | https://github.com/moodi1440-boop/dork-app/actions |

---

## 4. استعادة البيانات

```sql
-- استعادة من bookings_archive في حال الحذف الخاطئ
INSERT INTO bookings
SELECT * FROM bookings_archive
WHERE salon_id = <id> AND date >= '<date>';
```

---

## 5. بعد الحادثة

- [ ] توثيق الحادثة: التاريخ، السبب، الحل، الوقت المستغرق
- [ ] تحديث هذا الـ Runbook إذا اكتُشفت ثغرة في الإجراء
- [ ] SQL dump يدوي للنسخ الاحتياطي

---

## 6. الفحص الرباعي قبل كل إصدار (نقطة 14)

قبل أي merge إلى `main` أو رفع للإنتاج:

### أ) التطبيق (App.jsx / React)
- [ ] `npm run build` — لا أخطاء أو تحذيرات حرجة
- [ ] `npm audit --audit-level=high --production` — 0 ثغرات
- [ ] اختبار تسجيل دخول العميل (OTP)
- [ ] اختبار الحجز من البداية للنهاية (5 خطوات)
- [ ] فحص Console في المتصفح — لا أخطاء JavaScript

### ب) الأدمن (admin/ Next.js)
- [ ] اختبار تسجيل دخول الأدمن
- [ ] التحقق من ظهور الصالونات الجديدة في لوحة الأدمن
- [ ] فحص صفحة Audit Log — التسجيلات تظهر

### ج) Supabase
- [ ] Dashboard → Database → لا Errors في الـ Logs
- [ ] Dashboard → Auth → مشاريع OTP تعمل
- [ ] تشغيل: `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 5;` — يُرجع بيانات
- [ ] فحص table_bloat_monitor — dead_pct < 20%

### د) Vercel
- [ ] Dashboard → Functions — لا 5xx errors
- [ ] Dashboard → Analytics — Core Web Vitals تُحمَّل
- [ ] ALLOWED_ORIGINS محدَّث إذا تغيّر النطاق
