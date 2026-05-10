"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/",          label: "لوحة التحكم",  icon: "📊" },
  { href: "/bookings",  label: "الحجوزات",      icon: "📅" },
  { href: "/customers", label: "العملاء",        icon: "👥" },
  { href: "/salons",    label: "الصالونات",      icon: "✂"  },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 flex flex-col bg-card border-l border-border min-h-screen sticky top-0">
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-5 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all w-full"
        >
          <span>🚪</span>
          تسجيل خروج
        </button>
      </div>
    </aside>
  );
}
