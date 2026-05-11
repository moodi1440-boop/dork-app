"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface WaitingItem {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

export default function OwnerWaitingListPage() {
  const router = useRouter();
  const [items, setItems] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const loadWaitingList = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/waiting-list");
      if (!res.ok) {
        router.push("/owner-login");
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading waiting list:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWaitingList();
  }, [loadWaitingList]);

  const addToWaitingList = async () => {
    if (!newName.trim() || !newPhone.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/owner/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });

      if (res.ok) {
        setNewName("");
        setNewPhone("");
        loadWaitingList();
      }
    } catch (error) {
      console.error("Error adding to waiting list:", error);
    } finally {
      setAdding(false);
    }
  };

  const removeFromWaitingList = async (id: number) => {
    try {
      const res = await fetch(`/api/owner/waiting-list?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadWaitingList();
      }
    } catch (error) {
      console.error("Error removing from waiting list:", error);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search)
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gold animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          قائمة الانتظار
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {filteredItems.length} شخص في قائمة الانتظار
        </p>
      </div>

      {/* Add New */}
      <div className="bg-[#13131f] border border-gold/20 rounded-xl p-6">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-lg">➕</span>
          إضافة عميل جديد إلى قائمة الانتظار
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم العميل"
            className="bg-[#0d0d1a] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
          />
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="رقم الجوال"
            className="bg-[#0d0d1a] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
          />
          <button
            onClick={addToWaitingList}
            disabled={!newName.trim() || !newPhone.trim() || adding}
            className="bg-gold/10 border border-gold/30 text-gold rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? "جاري الإضافة..." : "إضافة"}
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 بحث بالاسم أو رقم الجوال..."
        className="w-full bg-[#13131f] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
      />

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-2">📭</div>
          {items.length === 0
            ? "لا توجد عناصر في قائمة الانتظار"
            : "لم يتم العثور على نتائج"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-[#13131f] border border-[#2a2a3a] rounded-xl p-4 flex items-center justify-between hover:border-gold/20 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm">{item.name}</div>
                  <div className="text-xs text-gray-400 mt-1">📞 {item.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">⏰ {formatDate(item.created_at)}</div>
                </div>
              </div>

              <button
                onClick={() => removeFromWaitingList(item.id)}
                className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap"
              >
                إزالة
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
