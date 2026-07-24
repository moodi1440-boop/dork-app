// سياق المحادثة — يحتفظ بالرسائل في localStorage مع تنظيف 30 يوم — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React from "react";

const ChatCtx = React.createContext(null);
const CHAT_STORAGE_KEY = "dork_chats";
const THIRTY_DAYS_MS   = 30 * 24 * 60 * 60 * 1000;

function loadChatsFromStorage() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const cleaned = {};
    for (const [key, msgs] of Object.entries(parsed)) {
      const recent = (msgs || []).filter(m => (now - new Date(m.created_at).getTime()) < THIRTY_DAYS_MS);
      if (recent.length > 0) cleaned[key] = recent;
    }
    return cleaned;
  } catch { return {}; }
}

export function ChatProvider({ children }) {
  const [chats, setChats] = React.useState(loadChatsFromStorage);

  React.useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats)); } catch {}
  }, [chats]);

  const setMessages = React.useCallback((key, msgs) => {
    setChats(prev => ({ ...prev, [key]: msgs }));
  }, []);

  const addMessage = React.useCallback((key, msg) => {
    setChats(prev => {
      const existing = prev[key] || [];
      if (existing.some(m => m.id === msg.id)) return prev;
      return { ...prev, [key]: [...existing, msg] };
    });
  }, []);

  const value = React.useMemo(
    () => ({ chats, setMessages, addMessage }),
    [chats, setMessages, addMessage]
  );

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChat(key) {
  const ctx = React.useContext(ChatCtx);
  const msgs = ctx?.chats[key] || [];
  const sm = ctx?.setMessages;
  const am = ctx?.addMessage;
  const setMsgs = React.useCallback((m) => sm?.(key, m), [sm, key]);
  const addMsg  = React.useCallback((m) => am?.(key, m), [am, key]);
  return { msgs, setMsgs, addMsg };
}
