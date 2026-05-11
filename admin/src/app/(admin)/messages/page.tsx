"use client";
import { useEffect, useState, useCallback, useRef } from "react";

interface Message {
  id: number;
  salon_id: number;
  salon_name?: string;
  from_admin: boolean;
  text: string;
  created_at: string;
  read_at?: string;
}

interface Salon {
  id: number;
  name: string;
}

export default function MessagesPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load salons
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/salons?status=approved");
        if (res.ok) {
          const data = await res.json();
          setSalons(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error loading salons:", error);
      }
      setLoading(false);
    })();
  }, []);

  // Load messages for selected salon
  const loadMessages = useCallback(async () => {
    if (!selectedSalonId) return;

    try {
      const res = await fetch(\`/api/admin/messages?salon_id=\${selectedSalonId}\`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [selectedSalonId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!msgText.trim() || !selectedSalonId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salon_id: selectedSalonId,
          text: msgText,
          from_admin: true,
        }),
      });

      if (res.ok) {
        setMsgText("");
        await loadMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const filteredSalons = salons.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentSalon = salons.find((s) => s.id === selectedSalonId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gold animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col gap-4" dir="rtl">
      <div>
        <h1 className="text-3xl font-black text-white">الرسائل</h1>
        <p className="text-gray-400 text-sm mt-1">تواصل مع الصالونات</p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-64 bg-[#13131f] border border-[#2a2a3a] rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2a2a3a]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 بحث..."
              className="w-full bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gold"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredSalons.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">لا توجد صالونات</div>
            ) : (
              <div className="divide-y divide-[#2a2a3a]">
                {filteredSalons.map((salon) => (
                  <button
                    key={salon.id}
                    onClick={() => setSelectedSalonId(salon.id)}
                    className={\`w-full text-right px-4 py-3 text-sm font-semibold transition-colors \${
                      selectedSalonId === salon.id
                        ? "bg-gold/10 border-l-2 border-gold text-gold"
                        : "text-gray-300 hover:bg-[#1a1a2e]"
                    }\`}
                  >
                    {salon.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedSalonId ? (
          <div className="flex-1 bg-[#13131f] border border-[#2a2a3a] rounded-xl flex flex-col overflow-hidden">
            <div className="border-b border-[#2a2a3a] p-4">
              <h2 className="font-bold text-white text-lg">{currentSalon?.name}</h2>
              <p className="text-gray-400 text-xs mt-1">{messages.length} رسالة</p>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-3xl mb-2">💬</div>
                  لا توجد رسائل
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={\`flex \${msg.from_admin ? "justify-end" : "justify-start"}\`}
                  >
                    <div
                      className={\`max-w-xs px-4 py-2 rounded-xl \${
                        msg.from_admin
                          ? "bg-gold/10 border border-gold/30 text-white"
                          : "bg-[#0d0d1a] border border-[#2a2a3a] text-gray-300"
                      }\`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs mt-1 opacity-50">
                        {new Date(msg.created_at).toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[#2a2a3a] p-4 flex gap-2">
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="اكتب الرسالة..."
                className="flex-1 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
              />
              <button
                onClick={sendMessage}
                disabled={!msgText.trim() || sending}
                className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg font-bold hover:bg-gold/20 transition-colors disabled:opacity-50"
              >
                {sending ? "جاري..." : "إرسال"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-[#13131f] border border-dashed border-gold/30 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">💬</div>
              اختر صالوناً لبدء محادثة
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
