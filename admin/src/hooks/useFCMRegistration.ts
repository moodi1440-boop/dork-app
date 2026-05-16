import { useEffect, useState, useCallback } from 'react';
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

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;
const SW_UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

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
  const [swReady, setSwReady] = useState(false);

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

  const registerServiceWorkerWithRetry = useCallback(
    async (attempt = 1): Promise<ServiceWorkerRegistration | null> => {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
      }

      try {
        console.log(
          `[SW] Registration attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`
        );
        const registration = await navigator.serviceWorker.register(
          '/public/sw.js',
          { scope: '/' }
        );
        console.log('[SW] Registered successfully:', registration);
        setSwReady(true);
        return registration;
      } catch (err) {
        console.error(`[SW] Registration failed (attempt ${attempt}):`, err);

        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`[SW] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return registerServiceWorkerWithRetry(attempt + 1);
        }

        return null;
      }
    },
    []
  );

  const checkForServiceWorkerUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registrations =
        await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('[SW] Checking for updates...');
        await registration.update();
        console.log('[SW] Update check completed');
      }
    } catch (err) {
      console.error('[SW] Error checking updates:', err);
    }
  }, []);

  const register = async () => {
    if (!isSupported) {
      setError('الإشعارات غير مدعومة على هذا الجهاز');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('تم رفض الإذن للإشعارات');
          setIsLoading(false);
          return null;
        }
      }

      const swRegistration =
        await registerServiceWorkerWithRetry();
      if (!swRegistration) {
        console.warn('[SW] Failed to register service worker');
      }

      const app = initializeApp(FIREBASE_CONFIG);
      const messaging = getMessaging(app);

      const fcmToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (!fcmToken) {
        throw new Error('فشل في الحصول على FCM Token');
      }

      setToken(fcmToken);

      const supabase = createAdminClient();
      const { data: existingToken, error: fetchError } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('device_token', fcmToken)
        .single();

      if (!fetchError && existingToken) {
        const { error: updateError } = await supabase
          .from('fcm_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', existingToken.id);

        if (updateError) {
          console.error('Update token error:', updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from('fcm_tokens')
          .insert({
            user_type: options.userType,
            user_id: options.userId,
            device_token: fcmToken,
            device_name: options.deviceName || navigator.userAgent,
            is_active: true,
          });

        if (insertError) {
          console.error('Error saving FCM token:', insertError);
        }
      }

      onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);

        if (payload.notification) {
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
      const errorMessage =
        err instanceof Error ? err.message : 'فشل تسجيل الإشعارات';
      setError(errorMessage);
      console.error('FCM Registration error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const updateCheckInterval = setInterval(
      () => checkForServiceWorkerUpdates(),
      SW_UPDATE_CHECK_INTERVAL
    );

    return () => clearInterval(updateCheckInterval);
  }, [checkForServiceWorkerUpdates]);

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
      const errorMessage =
        err instanceof Error ? err.message : 'فشل في إلغاء التسجيل';
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
    swReady,
    manualUpdateCheck: checkForServiceWorkerUpdates,
  };
}
