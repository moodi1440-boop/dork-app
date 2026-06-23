# مكتبة الأيقونات — App.jsx

مرجع سريع لكل أيقونة SVG أُنشئت ضمن مشروع استبدال الإيموجي (النقاط-المتبقية.md #47)، حتى يمكن العودة إليها مستقبلاً مباشرة بدل البحث بسجل القرارات الطويل بـ`النقاط-المتبقية.md`. كل الأيقونات معرّفة بـ`App.jsx` بين `function IconTrash` (السطر 687) ونهاية `function NotifIcon` (السطر ~1231)، بصيغة `({size=16,color="..."})` ثابتة، فيمكن استدعاء أي مكوّن مباشرة بأي مكان جديد بالملف بدون تعديل إضافي.

## كيف تُستخدم؟
- **عبر `NotifIcon`** (الأشيع): `<NotifIcon icon="🔥" size={14}/>` — يحوّل سلسلة الإيموجي المخزّنة (بقاعدة بيانات أو متغيّر) لمكوّن SVG تلقائياً. لإضافة رمز جديد: أضف سطر `if(icon==="X")return <IconY size={size}/>;` قبل سطر `return <span...>{icon}</span>;` بالأسفل (نقطة الارتكاز نفسها، السطر ~1149).
- **عبر `LabelWithIcon`**: لتسميات نصية تبدأ برمز ثم نص، مثل `"✅ تم الحفظ"` → `<LabelWithIcon label={...}/>`. الأنماط المدعومة حالياً بالـregex: `✅ ❌ ⚠️ ⚡ 💡 📈 🚀 🌟`.
- **استدعاء مباشر**: أيقونات مثل `IconPin`, `IconHeart`, `IconScale`, `IconTrash`, `IconShare`, `IconCheck`, `IconClose`, `IconDragHandle` لا تمرّ بـ`NotifIcon` بل تُستدعى مباشرة بالـJSX حيث كانت الإيموجي الأصلية موجودة (لأن مواضعها كانت أزرار/عناصر ثابتة لا قيمة متغيّرة).

## جدول الإيموجي ← المكوّن (عبر `NotifIcon`/`LabelWithIcon`)

| الإيموجي | المكوّن | اللون الافتراضي |
|---|---|---|
| ✅ | `IconSuccess` | `#27ae60` |
| ❌ | `IconError` | `#e74c3c` |
| ✂ | `IconScissors` | `var(--p)` (مُمرَّر) |
| 🔔 | `IconBell` | `var(--p)` (مُمرَّر، `dot={false}`) |
| ⭐ / ★ | `IconStar` | `var(--gold)` |
| 🚫 | `IconBlocked` | `#e74c3c` |
| ⚠ / ⚠️ | `IconWarning` | `#f0a020` |
| 🔥 | `IconFire` | `#e74c3c` |
| 📅 | `IconCalendar` | `var(--p)` (مُمرَّر) |
| 💈 | `IconBarberPole` | `var(--p)` (مُمرَّر) |
| ⚡ | `IconLightning` | `#f0a020` |
| 👤 | `IconUser` | `var(--p)` (مُمرَّر) |
| ✏ / ✏️ | `IconPencil` | `var(--p)` (مُمرَّر) |
| 🔄 | `IconRefresh` | `var(--p)` (مُمرَّر) |
| 📋 | `IconClipboard` | `var(--p)` (مُمرَّر) |
| 🔐 | `IconLock` | `var(--p)` (مُمرَّر) |
| 📊 | `IconChart` | `var(--p)` (مُمرَّر) |
| 🌐 | `IconGlobe` | `var(--p)` (مُمرَّر) |
| 📱 | `IconMobile` | `var(--p)` (مُمرَّر) |
| 💬 | `IconChat` | `var(--p)` (مُمرَّر) |
| 📞 | `IconCall` | `var(--p)` (مُمرَّر) |
| 💰 | `IconMoneyBag` | `#c9952c` |
| 💵 | `IconCash` | `#27ae60` |
| 🌙 | `IconMoon` | `var(--p)` (مُمرَّر) |
| ❓ | `IconQuestion` | `var(--p)` (مُمرَّر) |
| 🚪 | `IconLogout` | `#e74c3c` |
| 👥 | `IconGroup` | `var(--p)` (مُمرَّر) |
| 🐦 | `IconXLogo` (شعار X الرسمي) | `var(--p)` (مُمرَّر) |
| ✈ / ✈️ | `IconTelegram` | `#2980d9` |
| 📷 | `IconCamera` | `var(--p)` (مُمرَّر) |
| ⚙ | `IconGear` | خلفية `#8e8e93` + علامة بيضاء |
| 🎨 | `IconPalette` | `var(--p)` (مُمرَّر) |
| 🖼 | `IconImagePic` | `var(--p)` (مُمرَّر) |
| 🔤 | `IconFontSize` | `var(--p)` (مُمرَّر) |
| 🏷 | `IconTag` | `#c9952c` |
| 🎁 | `IconGift` | `#c9952c` |
| 📖 | `IconBook` | `var(--p)` (مُمرَّر) |
| 🔘 | `IconRadioFilled` | `#9e9b98` |
| 📈 | `IconTrendUp` | `#27ae60` |
| 🚀 | `IconRocket` | `#c9952c` |
| 💡 | `IconBulb` | `#f0a020` |
| 💳 | `IconCard` | `var(--p)` (مُمرَّر) |
| 📧 | `IconMail` | `var(--p)` (مُمرَّر) |
| 🕐 | `IconClock` | `var(--p)` (مُمرَّر) |
| 📌 | `IconThumbtack` | `var(--p)` (مُمرَّر) |
| 🔍 / 🔎 | `IconSearch` | `#c9952c` (🔍) / `var(--p)` (🔎) |
| 💾 | `IconSave` | `var(--p)` (مُمرَّر) |
| 📄 | `IconFileExport` | `#c9952c` |
| ✗ | `IconClose` | `var(--gold)` |
| 🔒 | `IconLock` | `var(--text-muted)` |
| 🎟 | `IconDiscountSeal` | `var(--p)` |
| ☆ | `IconStarOutline` | `var(--gold)` |
| ⬛ | `IconNone` | `var(--text-muted)` |
| ☀ / ☀️ | `IconSun` | `#f0a020` |
| ✨ | `IconSparkle` | `var(--p)` |
| 🔲 | `IconGridLines` | currentColor |
| 🌊 | `IconWaves` | `#3498db` |
| 👑 | `IconCrown` | `#d4a017` |
| ✦ | `IconDiamond` | `var(--p)` |
| ✉ / ✉️ | `IconMail` | `var(--p)` (مُمرَّر) |
| ❤ / ❤️ | `IconHeart` | `filled` + `#e74c3c` |
| 🌿 | `IconLeaf` | `#10b981` |
| 🍃 | `IconLeaf` | `#65a30d` |
| 💎 | `IconGemCut` | `#3b82f6` |
| 🏺 | `IconVaseHandles` | `#8b5a2b` |
| 🌸 | `IconBlossom` | `#ec4899` |
| 🌺 | `IconBlossom` | `#d946ef` |
| 🪸 | `IconCoral` | `#f97316` |
| 🍷 | `IconWineGlass` | `#9f1239` |
| 🌲 | `IconTree` | `#15803d` |
| 🔴 | `IconRadioFilled` | `#ef4444` |
| 🩵 | `IconRadioFilled` | `#0d9488` |
| 🔮 | `IconCrystalBall` | `#8b5cf6` |
| 🌟 (ضمن `LabelWithIcon` فقط) | `IconStarRadiant` | `#d4a017` |
| 🗓 / 🗓️ | `IconCalendarGrid` | `#c9952c` |
| 🥇🥈🥉 (medal) | `IconMedal` | `#d4a017` / `#9e9e9e` / `#cd7f32` (يُمرَّر حسب الترتيب) |
| 🪙 | `IconCoinArrow` | `#c9952c` |
| ✌ / ✌️ | `IconOverlapCircles` | `var(--p)` |
| 🪨 | `IconPebble` | `#aaa` |
| 🌅 | `IconReceipt` | `#f0a020` |
| 🔌 | `IconCircuitNodes` | `#888` |

## أيقونات تُستدعى مباشرة بالـJSX (بدون `NotifIcon`)

| الإيموجي الأصلي | المكوّن | ملاحظة |
|---|---|---|
| 📍 | `IconPin` | دبّوس معبّأ، 16 موضع نصي/زر |
| 📤 | `IconShare` | |
| 🗑️ | `IconTrash` | غطاء عائم + مقبض دائري + 3 خطوط |
| ✕ | `IconClose` | نمط "X رفيع"، 10 مواضع (إغلاق/إلغاء فلاتر) |
| ♥ / ♡ | `IconHeart` | مفضّلة، خطي دائري بـ`filled` ديناميكي |
| ✓ | `IconCheck` | مربع محاط بحدود مدوّرة (4 مواضع زر تأكيد) |
| ⚖ | `IconScale` | ميزان |
| 🟢 / 🔵 | `IconRadioFilled` | نقاط حالة "جدد"/"عائدون" بألوان `#27ae60`/`#3498db` مباشرة |
| (سحب/ترتيب، بلا إيموجي أصلي) | `IconDragHandle` | مقبض سحب القوائم |

## غير مُحوَّل حالياً (16 رمز فريد متبقي بـApp.jsx)

- **8 أسهم**: `←→↩↔↻↑↓⇄` — مدمجة كنص داخل تسميات أزرار، تحتاج إعادة هيكلة JSX مستقلة (مؤجّلة).
- **8 زخرفية/native بلا موضع عرض حقيقي**: `🎉🪒🎶🎵🧖💦🎺📡` — لا حاجة لأيقونة حالياً لعدم وجود موضع UI فعلي يعرضها.

> هذه القائمة مرجعية فقط للملف الحالي (`App.jsx`). لوحة الإدارة (`admin/`) فيها 78 رمز فريد لم يبدأ العمل عليها بعد — راجع `النقاط-المتبقية.md` بند 47 لتفاصيل سجل القرارات الكامل لكل أيقونة (سبب التصميم، الخيارات المرفوضة، تاريخ كل دفعة).
