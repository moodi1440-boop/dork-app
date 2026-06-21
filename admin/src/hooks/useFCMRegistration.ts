import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { createAdminClient } from '@/lib/supabase';

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FCMRegistrationOptions {
  userType: 'salon' | 'admin' | 'customer';
  userId: number;
  deviceName?: string;
}

export function useFCMRegistration(options: FCMRegistrationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // تحقق من دعم الإشعارات
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        Notification.permission !== 'denied';

      setIsSupported(supported);
    };

    checkSupport();
  }, []);

  // تسجيل الجهاز وحفظ الـ Token
  const register = async () => {
    if (!isSupported) {
      setError('الإشعارات غير مدعومة على هذا الجهاز');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // طلب الإذن من المستخدم
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('تم رفض الإذن للإشعارات');
          setIsLoading(false);
          return null;
        }
      }

      // تسجيل Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('Service Worker registered:', registration);
      }

      // تهيئة Firebase
      const app = initializeApp(FIREBASE_CONFIG);
      const messaging = getMessaging(app);

      // الحصول على الـ Token
      const fcmToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (!fcmToken) {
        throw new Error('فشل في الحصول على FCM Token');
      }

      setToken(fcmToken);

      // حفظ الـ Token في Supabase
      const supabase = createAdminClient();
      const { data: existingToken, error: fetchError } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('device_token', fcmToken)
        .single();

      if (!fetchError && existingToken) {
        // تحديث آخر وقت استخدام
        const { error: updateError } = await supabase
          .from('fcm_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', existingToken.id);

        if (updateError) {
          console.error('Update token error:', updateError);
        }
      } else {
        // إضافة token جديد
        const { error: insertError } = await supabase.from('fcm_tokens').insert({
          user_type: options.userType,
          user_id: options.userId,
          device_token: fcmToken,
          is_active: true,
        });

        if (insertError) {
          console.error('Error saving FCM token:', insertError);
          // لا نرفع الخطأ هنا لأن الـ token قد حُفظ في Firebase بالفعل
        }
      }

      // الاستماع للإشعارات الواردة أثناء استخدام التطبيق
      onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);

        if (payload.notification) {
          // إنشاء إشعار يدوي في حالة استخدام التطبيق
          if ('Notification' in window) {
            new Notification(payload.notification.title || 'إشعار', {
              body: payload.notification.body,
              icon: '/favicon.ico',
              data: payload.data,
            });
          }
        }
      });

      return fcmToken;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل تسجيل الإشعارات';
      setError(errorMessage);
      console.error('FCM Registration error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // إلغاء التسجيل
  const unregister = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createAdminClient();

      if (token) {
        const { error: unregisterError } = await supabase
          .from('fcm_tokens')
          .update({ is_active: false })
          .eq('device_token', token);

        if (unregisterError) {
          console.error('Unregister error:', unregisterError);
        }
      }

      setToken(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل في إلغاء التسجيل';
      setError(errorMessage);
      console.error('FCM Unregister error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register,
    unregister,
    token,
    isLoading,
    isSupported,
    error,
  };
}
