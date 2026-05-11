"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase-browser";

interface Notification {
  id: number;
  target_type: string;
  target_id?: number;
  title: string;
  body?: string;
  icon: string;
  read: boolean;
  created_at: string;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await sb
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setLoading(false);
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = sb
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await sb.from("notifications").update({ read: true }).eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `${minutes}م`;
    if (hours < 24) return `${hours}س`;
    return `${days}ي`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-96 max-h-96 bg-[#13131f] border border-[#2a2a3a] rounded-xl shadow-lg overflow-hidden flex flex-col z-50">
          {/* Header */}
          <div className="border-b border-[#2a2a3a] p-4 bg-[#0d0d1a]">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">الإشعارات</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                لا توجد إشعارات
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a3a]">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 hover:bg-[#1a1a2e] transition-colors cursor-pointer ${
                      notif.read ? "opacity-60" : "bg-gold/5"
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {notif.title}
                        </div>
                        {notif.body && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notif.body}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {formatTime(notif.created_at)}
                        </div>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-gold mt-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
