'use client';

import { useEffect } from 'react';
import { useFCMRegistration } from '@/hooks/useFCMRegistration';
import { subscribeToNotifications, getUnreadNotifications } from '@/lib/notificationHandler';

interface NotificationInitializerProps {
  userType: 'salon' | 'admin' | 'customer';
  userId: number;
  userName?: string;
}

export function NotificationInitializer({ userType, userId, userName }: NotificationInitializerProps) {
  const { register, isSupported, error } = useFCMRegistration({
    userType,
    userId,
    deviceName: userName || `${userType}-${userId}`,
  });

  useEffect(() => {
    if (!isSupported) {
      console.log('Notifications not supported on this device');
      return;
    }

    // تسجيل الجهاز للإشعارات
    const initializeFCM = async () => {
      try {
        const token = await register();
        if (token) {
          console.log('FCM registered successfully');

          // الاستماع للإشعارات الجديدة
          const subscription = subscribeToNotifications(userType, userId, (notification) => {
            console.log('New notification:', notification);

            // يمكنك هنا تحديث الـ UI أو عرض toast notification
          });

          // جلب الإشعارات غير المقروءة
          const unreadNotifications = await getUnreadNotifications(userType, userId);
          console.log('Unread notifications:', unreadNotifications);

          // تنظيف الاشتراك عند الخروج
          return () => {
            if (subscription) {
              subscription.unsubscribe();
            }
          };
        }
      } catch (err) {
        console.error('FCM initialization failed:', err);
      }
    };

    const cleanup = initializeFCM();

    // cleanup على unmount
    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [isSupported, userId, userType, register]);

  // لا نعرض شيء - هذا component للتهيئة فقط
  return null;
}
