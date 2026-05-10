"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/",               label: "لوحة التحكم",        icon: "📊" },
  { href: "/bookings",       label: "الحجوزات",            icon: "📅" },
  { href: "/customers",      label: "العملاء",              icon: "👥" },
  { href: "/salons",         label: "الصالونات",            icon: "✂"  },
  { href: "/finance",        label: "الميزان المالي",       icon: "💰" },
  { href: "/messages",       label: "الرسائل",              icon: "💬" },
  { href: "/notifications",  label: "الإشعارات",            icon: "🔔" },
  { href: "/settings",       label: "الإعدادات",            icon: "⚙"  },
];

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const [unreadMsgs,   setUnreadMsgs]   = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [msgs, notifs] = await Promise.all([
          fetch("/api/messages").then((r) => r.json()),
          fetch("/api/notifications?unread=1").then((r) => r.json()),
        ]);
        const totalUnread = (Array.isArray(msgs) ? msgs : []).reduce((a: number, s: { unread: number }) => a + (s.unread ?? 0), 0);
        setUnreadMsgs(totalUnread);
        setUnreadNotifs(Array.isArray(notifs) ? notifs.length : 0);
      } catch {}
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const badges: Record<string, number> = {
    "/messages":      unreadMsgs,
    "/notifications": unreadNotifs,
  };

  return (
    <aside className="w-56 flex flex-col bg-card border-l border-border min-h-screen sticky top-0">
      <div className="px-5 py-7 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-lg shadow-[0_0_12px_rgba(212,160,23,0.15)]">
            ✂
          </div>
          <div>
            <div className="font-black text-lg gold-text tracking-widest leading-none">DORK</div>
            <div className="text-gray-500 text-[10px] leading-none mt-0.5">Admin Panel</div>
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
        <Link href="/owner" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-all mb-1">
          <span>💈</span>
          لوحة المالك
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
