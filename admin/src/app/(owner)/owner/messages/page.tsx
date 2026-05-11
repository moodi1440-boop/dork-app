"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: number;
  from_admin: boolean;
  text: string;
  created_at: string;
}

export default function OwnerMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await fetch("/api/owner/messages");
      if (!res.ok) {
        router.push("/owner-login");
        return;
      }
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!msgText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/owner/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msgText }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gold animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-screen flex flex-col" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <span>💬</span>
          الرسائل
        </h1>
        <p className="text-gray-400 text-sm mt-1">تواصل مع الإدارة</p>
      </div>

      <div className="bg-[#13131f] border border-[#2a2a3a] rounded-xl flex flex-col flex-1 overflow-hidden">
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
                className={`flex ${msg.from_admin ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-xl ${
                    msg.from_admin
                      ? "bg-[#0d0d1a] border border-[#2a2a3a] text-gray-300"
                      : "bg-gold/10 border border-gold/30 text-white"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs mt-1 opacity-50">
                    {new Date(msg.created_at).toLocaleTimeString("ar-SA")}
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
            className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg font-bold hover:bg-gold/20 disabled:opacity-50"
          >
            {sending ? "جاري..." : "إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}
