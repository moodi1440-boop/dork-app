"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase-browser";

const NAV = [
  { href: "/",              label: "لوحة التحكم",      icon: "📊" },
  { href: "/bookings",      label: "الحجوزات",          icon: "📅" },
  { href: "/customers",     label: "العملاء",            icon: "👥" },
  { href: "/salons",        label: "الصالونات",          icon: "✂"  },
  { href: "/messages",      label: "الرسائل",            icon: "💬" },
  { href: "/notifications", label: "الإشعارات",          icon: "🔔" },
  { href: "/compare",       label: "مقارنة الصالونات",  icon: "📈" },
  { href: "/contact",       label: "التواصل",             icon: "📱" },
  { href: "/appearance",    label: "المظهر",              icon: "🎨" },
  { href: "/password",      label: "كلمة المرور",         icon: "🔑" },
];

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const [unreadMsgs,    setUnreadMsgs]    = useState(0);
  const [unreadNotifs,  setUnreadNotifs]  = useState(0);
  const [pendingSalons, setPendingSalons] = useState(0);
  const [toast,         setToast]         = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [msgs, notifs, salonsRes] = await Promise.all([
          fetch("/api/messages").then((r) => r.json()),
          fetch("/api/notifications?unread=1").then((r) => r.json()),
          sb.from("salons").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        const totalUnread = (Array.isArray(msgs) ? msgs : []).reduce((a: number, s: { unread: number }) => a + (s.unread ?? 0), 0);
        setUnreadMsgs(totalUnread);
        setUnreadNotifs(Array.isArray(notifs) ? notifs.length : 0);
        setPendingSalons(salonsRes.count ?? 0);
      } catch {}
    };
    loadCounts();

    const msgInterval = setInterval(async () => {
      try {
        const msgs = await fetch("/api/messages").then((r) => r.json());
        const totalUnread = (Array.isArray(msgs) ? msgs : []).reduce((a: number, s: { unread: number }) => a + (s.unread ?? 0), 0);
        setUnreadMsgs(totalUnread);
      } catch {}
    }, 30000);

    const notifChannel = sb
      .channel("sidebar-realtime-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        setUnreadNotifs((prev) => prev + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => {
        fetch("/api/notifications?unread=1")
          .then((r) => r.json())
          .then((notifs) => setUnreadNotifs(Array.isArray(notifs) ? notifs.length : 0))
          .catch(() => {});
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "salons" }, (payload) => {
        const s = payload.new as { status?: string; name?: string };
        if (s?.status === "pending") {
          setPendingSalons((prev) => prev + 1);
          showToast(`✂ طلب تسجيل جديد: ${s.name ?? "صالون جديد"}`);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salons" }, () => {
        sb.from("salons").select("id", { count: "exact", head: true }).eq("status", "pending")
          .then((res) => setPendingSalons(res.count ?? 0));
      })
      .subscribe();

    return () => {
      clearInterval(msgInterval);
      sb.removeChannel(notifChannel);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const badges: Record<string, number> = {
    "/messages":      unreadMsgs,
    "/notifications": unreadNotifs,
    "/salons":        pendingSalons,
  };

  return (
    <aside className="w-56 flex flex-col bg-card border-l border-border min-h-screen sticky top-0">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] max-w-xs bg-[#0f1117] border border-gold/40 rounded-2xl px-4 py-3 shadow-2xl animate-slide-in">
          <div className="flex items-start gap-3">
            <span className="text-gold text-lg mt-0.5">🔔</span>
            <div>
              <div className="text-white text-sm font-bold mb-0.5">طلب جديد</div>
              <div className="text-gray-400 text-xs">{toast}</div>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white text-sm ml-1">✕</button>
          </div>
        </div>
      )}

      <div className="px-5 py-7 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-lg shadow-[0_0_12px_rgba(212,160,23,0.15)]">
            ✂
          </div>
          <div>
            <div className="font-black text-lg gold-text tracking-widest leading-none">DORK</div>
            <div className="text-gray-500 text-[10px] leading-none mt-0.5">Admin Panel <span className="text-gold/60">L58</span></div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const badge  = badges[item.href] ?? 0;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${active ? "bg-gold/10 text-gold border border-gold/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${active ? "bg-gold text-black" : "bg-gold/20 text-gold"}`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <Link href="/promo-codes"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 ${path.startsWith("/promo-codes") ? "bg-gold/10 text-gold border border-gold/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
          <span className="text-base">🎟</span>
          <span className="flex-1">أكواد الخصم</span>
        </Link>
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all w-full">
          <span>🚪</span>
          تسجيل خروج
        </button>
      </div>
    </aside>
  );
}
