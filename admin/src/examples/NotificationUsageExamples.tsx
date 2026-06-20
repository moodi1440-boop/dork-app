/**
 * أمثلة استخدام نظام الإشعارات
 * Copy & Paste مباشرة في مشروعك
 */

'use client';

import { useEffect, useState } from 'react';
import { useFCMRegistration } from '@/hooks/useFCMRegistration';
import {
  getUnreadNotifications,
  markNotificationAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  subscribeToNotifications,
} from '@/lib/notificationHandler';

// ==========================================
// مثال 1: عرض عدد الإشعارات غير المقروءة
// ==========================================
export function UnreadNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const count = await getUnreadNotificationCount('admin', 1);
      setUnreadCount(count);
    };

    fetchCount();

    // استماع للتغييرات الفورية
    const subscription = subscribeToNotifications('admin', 1, () => {
      fetchCount();
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}

// ==========================================
// مثال 2: قائمة الإشعارات
// ==========================================
export function NotificationList() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const data = await getUnreadNotifications('admin', 1);
        setNotifications(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // الاستماع للإشعارات الجديدة
    const subscription = subscribeToNotifications('admin', 1, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDelete = async (id: number) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (isLoading) {
    return <div className="p-4 text-center">جاري التحميل...</div>;
  }

  if (notifications.length === 0) {
    return <div className="p-4 text-center text-gray-500">لا توجد إشعارات</div>;
  }

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{notif.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
              <span className="text-xs text-gray-400 mt-2">
                {new Date(notif.created_at).toLocaleString('ar-SA')}
              </span>
            </div>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => handleMarkAsRead(notif.id)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                اقرأ
              </button>
              <button
                onClick={() => handleDelete(notif.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// مثال 3: زر تفعيل الإشعارات
// ==========================================
export function NotificationPermissionButton() {
  const { register, isSupported, isLoading, error, token } = useFCMRegistration({
    userType: 'admin',
    userId: 1,
  });

  const handleEnable = async () => {
    const result = await register();
    if (result) {
      alert('✅ تم تفعيل الإشعارات بنجاح!');
    }
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-yellow-100 text-yellow-800 rounded">
        الإشعارات غير مدعومة على هذا الجهاز
      </div>
    );
  }

  if (token) {
    return (
      <div className="p-3 bg-green-100 text-green-800 rounded flex items-center gap-2">
        <span>✅ الإشعارات مفعلة</span>
        <span className="text-xs opacity-75">({token.slice(0, 20)}...)</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleEnable}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </>
  );
}

// ==========================================
// مثال 4: Dashboard إشعارات كاملة
// ==========================================
export function NotificationDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const unread = await getUnreadNotificationCount('admin', 1);
      setStats({ total: unread, unread });
    };

    fetchStats();

    const subscription = subscribeToNotifications('admin', 1, () => {
      fetchStats();
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-gray-600">إشعارات غير مقروءة</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.unread}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">أحدث الإشعارات</h3>
        </div>
        <NotificationList />
      </div>
    </div>
  );
}

// ==========================================
// مثال 5: شاشة ترحيب بـ Notification Setup
// ==========================================
export function NotificationWelcomeScreen() {
  const { register, isSupported } = useFCMRegistration({
    userType: 'admin',
    userId: 1,
  });

  const handleGetStarted = async () => {
    if (isSupported) {
      await register();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg border border-gray-200">
      <div className="text-center">
        <div className="text-5xl mb-4">🔔</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          تفعيل الإشعارات
        </h2>
        <p className="text-gray-600 mb-6">
          احصل على إشعارات فورية عند وجود حجوزات جديدة
        </p>

        {isSupported ? (
          <>
            <button
              onClick={handleGetStarted}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 mb-2"
            >
              تفعيل الآن
            </button>
            <p className="text-xs text-gray-500">
              ستطلب منك الموافقة على الإشعارات
            </p>
          </>
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
            الإشعارات غير مدعومة على متصفحك الحالي
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// مثال 6: Integration في App Layout
// ==========================================
export function AppWithNotifications() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header مع badge الإشعارات */}
      <header className="bg-white shadow">
        <div className="flex items-center justify-between p-4">
          <h1>إدارة الحجوزات</h1>
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              🔔
              <UnreadNotificationBadge />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <NotificationDashboard />
      </main>

      {/* Initialize Notifications */}
      <NotificationInitializerComponent />
    </div>
  );
}

// Helper component
function NotificationInitializerComponent() {
  return (
    <>
      {/* This initializes FCM registration */}
      <script>{`
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          window.addEventListener('load', async () => {
            try {
              const reg = await navigator.serviceWorker.register('/sw.js');
              console.log('Service Worker registered');
            } catch (err) {
              console.error('Service Worker registration failed:', err);
            }
          });
        }
      `}</script>
    </>
  );
}
