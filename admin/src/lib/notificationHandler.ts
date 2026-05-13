import { createAdminClient } from './supabase';

interface NotificationData {
  booking_id?: string;
  salon_id?: string;
  type?: string;
  [key: string]: any;
}

/**
 * معالج الإشعارات - تحديث حالة قراءة الإشعار
 */
export async function markNotificationAsRead(notificationId: number) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
}

/**
 * معالج الإشعارات - الحصول على جميع الإشعارات غير المقروءة
 */
export async function getUnreadNotifications(
  userType: 'salon' | 'admin' | 'customer',
  userId: number
) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_type', userType)
      .eq('target_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUnreadNotifications:', error);
    return [];
  }
}

/**
 * معالج الإشعارات - الاستماع للإشعارات الجديدة في الوقت الفعلي
 */
export function subscribeToNotifications(
  userType: 'salon' | 'admin' | 'customer',
  userId: number,
  onNewNotification: (notification: any) => void
) {
  try {
    const supabase = createAdminClient();

    const subscription = supabase
      .from(`notifications:target_type=eq.${userType},target_id=eq.${userId}`)
      .on('*', (payload) => {
        console.log('New notification received:', payload);

        if (payload.eventType === 'INSERT') {
          onNewNotification(payload.new);
        }
      })
      .subscribe();

    return subscription;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return null;
  }
}

/**
 * معالج الإشعارات - تحويل بيانات الإشعار إلى رابط
 */
export function getNotificationLink(data: NotificationData): string {
  if (data.booking_id) {
    return `/bookings/${data.booking_id}`;
  }

  if (data.salon_id) {
    return `/salons/${data.salon_id}`;
  }

  return '/';
}

/**
 * معالج الإشعارات - تحديث حالة قراءة إشعارات متعددة
 */
export async function markNotificationsAsRead(notificationIds: number[]) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationsAsRead:', error);
    return false;
  }
}

/**
 * معالج الإشعارات - الحصول على عدد الإشعارات غير المقروءة
 */
export async function getUnreadNotificationCount(
  userType: 'salon' | 'admin' | 'customer',
  userId: number
): Promise<number> {
  try {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', userType)
      .eq('target_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
}

/**
 * معالج الإشعارات - حذف إشعار
 */
export async function deleteNotification(notificationId: number) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
}

/**
 * معالج الإشعارات - حذف إشعارات متعددة
 */
export async function deleteNotifications(notificationIds: number[]) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds);

    if (error) {
      console.error('Error deleting notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNotifications:', error);
    return false;
  }
}
