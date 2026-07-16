# توثيق API Endpoints — Dawrak App

## المصادقة
جميع endpoints الصالون تتطلب cookie `dork_owner_session` صالحة.

---

## `/api/owner-auth`
| Method | الوصف |
|--------|-------|
| POST | تسجيل دخول الصالون (phone + PIN) → cookie + access_token |
| DELETE | تسجيل خروج الصالون (مسح الكوكي) |

**Rate Limit:** 10 طلبات/دقيقة لكل IP

---

## `/api/owner-salon`
| Method | الوصف |
|--------|-------|
| GET | جلب بيانات الصالون الحالي |
| PATCH | تعديل إعدادات الصالون (الحقول المسموحة فقط) |

---

## `/api/owner-chat`
| Method | الوصف |
|--------|-------|
| GET `?list=1` | قائمة المحادثات مع العملاء |
| GET `?customerId=X` | رسائل عميل محدد |
| GET `?searchPhone=X` | البحث عن عميل |
| POST | رد الصالون على عميل |
| DELETE `?clearAll=1` | مسح كل المحادثات |
| DELETE `?customerId=X` | مسح محادثة عميل محدد |

---

## `/api/customer-messages`
| Method | الوصف |
|--------|-------|
| GET | جلب رسائل العميل مع صالون محدد |
| GET `?unreadByBooking=1` | عدد الرسائل غير المقروءة |
| PATCH | تعليم رسائل الصالون كمقروءة |

---

## `/api/register-salon`
| Method | الوصف |
|--------|-------|
| POST | تسجيل صالون جديد |

**Rate Limit:** 3 طلبات/دقيقة لكل IP

---

## `/api/salon-reset-pin`
| Method | الوصف |
|--------|-------|
| POST `action=verify` | التحقق من جوال + بريد الصالون |
| POST `action=reset` | تحديث PIN بعد التحقق من OTP |

**Rate Limit:** 5 طلبات/دقيقة لكل IP

---

## `/api/submit-review`
| Method | الوصف |
|--------|-------|
| POST | إرسال تقييم العميل للصالون |

---

## `/api/mark-messages-read`
| Method | الوصف |
|--------|-------|
| PATCH | تعليم رسائل الإدارة كمقروءة |

---

## `/api/delete-salon`
| Method | الوصف |
|--------|-------|
| POST | حذف/تجميد حساب الصالون نهائياً |

---

## `/api/delete-account`
| Method | الوصف |
|--------|-------|
| POST | حذف حساب العميل نهائياً |

---

*آخر تحديث: 2026-06-30*
