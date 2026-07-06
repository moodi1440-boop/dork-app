// نقطة 85: Migration Script — ربط الصالونات الموجودة بـ Supabase Auth
// التشغيل: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/migrate-salon-auth.js
// مهم: شغّل supabase/migrations/20260630_salons_auth_uid.sql أولاً

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kowotztbxgoodvnjyxyq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("يلزم: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/migrate-salon-auth.js");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function migrate() {
  console.log("جلب الصالونات التي تحتاج migration...");
  const { data: salons, error } = await admin
    .from("salons")
    .select("id,name,owner_email")
    .not("owner_email", "is", null)
    .is("auth_uid", null);

  if (error) { console.error("خطأ:", error.message); process.exit(1); }
  console.log(`${salons.length} صالون بحاجة للترحيل\n`);

  let success = 0, failed = 0;

  for (const salon of salons) {
    try {
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: salon.owner_email,
        email_confirm: true,
      });

      if (authErr) {
        // المستخدم موجود مسبقاً → ابحث عنه وربطه
        if (authErr.message?.includes("already been registered")) {
          const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
          const existing = users.find(u => u.email?.toLowerCase() === salon.owner_email.toLowerCase());
          if (existing) {
            await admin.from("salons").update({ auth_uid: existing.id }).eq("id", salon.id);
            console.log(`✅ [${salon.id}] ${salon.name} — مرتبط بمستخدم موجود`);
            success++; continue;
          }
        }
        console.error(`❌ [${salon.id}] ${salon.name}: ${authErr.message}`);
        failed++; continue;
      }

      await admin.from("salons").update({ auth_uid: authData.user.id }).eq("id", salon.id);
      console.log(`✅ [${salon.id}] ${salon.name} → ${authData.user.id}`);
      success++;
    } catch (e) {
      console.error(`❌ [${salon.id}] ${salon.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nالنتيجة النهائية: ${success} نجح | ${failed} فشل`);
}

migrate();
