"use client";
import Sidebar from "@/components/Sidebar";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmojiIcon } from "@/components/Icons";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const startY = useRef(0);
  const active = useRef(false);
  const yRef = useRef(0);
  const [ptY, setPtY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const PT = 65;

  useEffect(() => {
    const onTS = (e: TouchEvent) => {
      if (window.scrollY > 2) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
      yRef.current = 0;
    };
    const onTM = (e: TouchEvent) => {
      if (!active.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) { const y = Math.min(dy * .45, 80); yRef.current = y; setPtY(y); }
      else { active.current = false; yRef.current = 0; setPtY(0); }
    };
    const onTE = () => {
      if (active.current && yRef.current >= PT && !refreshing) {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 800);
      }
      active.current = false; yRef.current = 0; setPtY(0);
    };
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchmove", onTM, { passive: true });
    window.addEventListener("touchend", onTE, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("touchend", onTE);
    };
  }, [router, refreshing]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-navy min-h-screen relative">
        {(ptY > 8 || refreshing) && (
          <div style={{
            position: "fixed", top: 12, left: "50%",
            transform: `translate(-50%, ${refreshing ? 8 : Math.max(ptY - 16, 0)}px)`,
            transition: refreshing ? "transform .2s" : "none",
            width: 34, height: 34, borderRadius: "50%",
            background: "rgb(var(--adm-accent))", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, zIndex: 100, pointerEvents: "none",
            boxShadow: "0 2px 10px rgba(0,0,0,.4)",
          }}>
            <span style={refreshing ? { animation: "spin .7s linear infinite", display: "inline-block" } : { display: "inline-block" }}>
              <EmojiIcon icon={refreshing ? "↻" : ptY >= PT ? "↑" : "↓"} size={17} />
            </span>
          </div>
        )}
        {children}
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
