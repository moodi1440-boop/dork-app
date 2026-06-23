"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { EmojiIcon } from "@/components/Icons";

interface SalonList { id: string; name: string; unread: number; totalMsgs: number; lastMsg: { text: string; from_admin: boolean; created_at: string } | null; }
interface Message { id: number; salon_id: number; from_admin: boolean; text: string; created_at: string; read_at: string | null; }

export default function MessagesPage() {
  const [salons,    setSalons]    = useState<SalonList[]>([]);
  const [selId,     setSelId]     = useState<string | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSalons = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSalons(Array.isArray(data) ? data : []);
    } catch {
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChat = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/messages?salon_id=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
    // وضع علامة مقروء على رسائل المالك
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salon_id: id }),
      });
    } catch {
      // non-critical, ignore
    }
    loadSalons();
  }, [loadSalons]);

  useEffect(() => { loadSalons(); }, [loadSalons]);
  useEffect(() => { if (selId) loadChat(selId); }, [selId, loadChat]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !selId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salon_id: selId, text: text.trim(), from_admin: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setText("");
      await loadChat(selId);
    } catch {
      // keep text so user can retry
    } finally {
      setSending(false);
    }
  };

  const selSalon = salons.find((s) => s.id === selId);

  if (selId) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto h-full flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSelId(null)} className="w-8 h-8 rounded-lg bg-card border border-border text-gray-400 hover:text-white flex items-center justify-center text-lg transition-colors">‹</button>
          <h2 className="text-white font-bold"><EmojiIcon icon="💬" size={18}/> {selSalon?.name}</h2>
          <button onClick={() => loadChat(selId)} className="mr-auto text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">تحديث <EmojiIcon icon="↺" size={12}/></button>
        </div>

        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 400 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-600 py-16 text-sm">لا توجد رسائل بعد</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.from_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.from_admin ? "bg-gold/10 border border-gold/20 rounded-tr-sm" : "bg-card-hover border border-border rounded-tl-sm"}`}>
                    <div className="text-xs text-gray-500 mb-1">{m.from_admin ? "الإدارة" : "المالك"}</div>
                    <div className="text-sm text-white">{m.text}</div>
                    <div className="text-xs text-gray-600 mt-1 text-left">
                      {new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-4 flex gap-3">
            <input value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="اكتب رسالة للصالون..."
              className="flex-1 bg-navy border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold" />
            <button onClick={send} disabled={sending || !text.trim()}
              className="px-5 py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-40">
              {sending ? "..." : "إرسال"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">الرسائل</h1>
        <p className="text-gray-400 text-sm mt-1">التواصل مع أصحاب الصالونات</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gold animate-pulse">جاري التحميل...</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {salons.length === 0 ? (
            <div className="text-center py-16 text-gray-500">لا توجد صالونات</div>
          ) : (
            salons.map((s) => (
              <button key={s.id} onClick={() => setSelId(s.id)}
                className="w-full flex items-center gap-4 px-5 py-4 border-b border-border/50 hover:bg-white/[0.02] transition-colors text-right">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-lg flex-shrink-0"><EmojiIcon icon="✂" size={18}/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{s.name}</span>
                    {s.unread > 0 && (
                      <span className="text-xs bg-gold text-black font-black px-1.5 py-0.5 rounded-full">{s.unread}</span>
                    )}
                  </div>
                  {s.lastMsg && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {s.lastMsg.from_admin ? "أنت: " : ""}{s.lastMsg.text}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-600 flex-shrink-0">
                  {s.totalMsgs} رسالة
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
