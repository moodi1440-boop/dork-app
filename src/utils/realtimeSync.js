/**
 * Realtime Filtering + Delta Sync - OPTIMIZED & PRODUCTION-READY
 * ✅ بدون Polling
 * ✅ مع Indexes محسّنة
 * ✅ آمن من Race Conditions
 */

import { supabase } from "../../api/supabase";

// ============================================
// REALTIME MANAGER
// ============================================

export const realtimeManager = {
  subscriptions: {},

  /**
   * اشترك في حجوزات الصالون
   * @param {number} salonId - معرّف الصالون
   * @param {function} callback - دالة callback عند التحديث
   */
  subscribeSalonBookings(salonId, callback) {
    const channelName = `bookings-salon-${salonId}`;

    // إلغاء الاشتراك السابق
    if (this.subscriptions[channelName]) {
      this.unsubscribe(channelName);
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `salon_id=eq.${salonId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime: مشترك في حجوزات الصالون ${salonId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`❌ خطأ في الاشتراك لـ salon ${salonId}`);
        }
      });

    this.subscriptions[channelName] = subscription;
    return subscription;
  },

  /**
   * اشترك في حجوزات العميل
   * @param {number} customerId - معرّف العميل
   * @param {function} callback - دالة callback عند التحديث
   */
  subscribeCustomerBookings(customerId, callback) {
    const channelName = `bookings-customer-${customerId}`;

    if (this.subscriptions[channelName]) {
      this.unsubscribe(channelName);
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${customerId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime: مشترك في حجوزات العميل ${customerId}`);
        }
      });

    this.subscriptions[channelName] = subscription;
  },

  /**
   * اشترك في تقييمات الصالون
   * @param {number} salonId - معرّف الصالون
   * @param {function} callback - دالة callback عند التحديث
   */
  subscribeSalonReviews(salonId, callback) {
    const channelName = `reviews-salon-${salonId}`;

    if (this.subscriptions[channelName]) {
      this.unsubscribe(channelName);
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `salon_id=eq.${salonId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime: مشترك في تقييمات الصالون ${salonId}`);
        }
      });

    this.subscriptions[channelName] = subscription;
  },

  /**
   * اشترك في الإشعارات الشخصية
   * @param {number} userId - معرّف المستخدم
   * @param {string} userType - نوع المستخدم (customer أو salon)
   * @param {function} callback - دالة callback عند الإشعار الجديد
   */
  subscribeNotifications(userId, userType, callback) {
    const channelName = `notifications-${userType}-${userId}`;

    if (this.subscriptions[channelName]) {
      this.unsubscribe(channelName);
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_type=eq.${userType}|target_id=eq.${userId}`,
        },
        callback
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime: مشترك في إشعارات ${userType} ${userId}`);
        }
      });

    this.subscriptions[channelName] = subscription;
  },

  /**
   * إلغاء اشتراك معين
   * @param {string} channelName - اسم القناة
   */
  unsubscribe(channelName) {
    if (this.subscriptions[channelName]) {
      supabase.removeChannel(this.subscriptions[channelName]);
      delete this.subscriptions[channelName];
      console.log(`✅ تم إلغاء الاشتراك: ${channelName}`);
    }
  },

  /**
   * إلغاء جميع الاشتراكات
   */
  unsubscribeAll() {
    Object.keys(this.subscriptions).forEach((channelName) => {
      this.unsubscribe(channelName);
    });
  },
};

// ============================================
// DELTA SYNC HELPERS
// ============================================

/**
 * احصل على آخر وقت sync من localStorage
 * @param {string} key - المفتاح
 * @returns {string} ISO timestamp
 */
function getLastSyncTime(key) {
  const stored = localStorage.getItem(`sync_${key}`);
  if (!stored) {
    // إذا لم يكن هناك sync سابق، استخدم 30 يوم قبل الآن
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return stored;
}

/**
 * احفظ وقت آخر sync
 * @param {string} key - المفتاح
 * @param {string} timestamp - ISO timestamp
 */
function setLastSyncTime(key, timestamp) {
  localStorage.setItem(`sync_${key}`, timestamp);
}

// ============================================
// DELTA SYNC FUNCTIONS
// ============================================

/**
 * جلب حجوزات الصالون المتغيرة (Delta Sync)
 * @param {number} salonId - معرّف الصالون
 * @param {function} sb - دالة الاستعلام
 * @returns {object} { data, syncTime, error }
 */
export async function deltaFetchSalonBookings(salonId, sb) {
  const key = `bookings-salon-${salonId}`;
  const lastSync = getLastSyncTime(key);
  const now = new Date().toISOString();

  try {
    // ✅ جلب فقط التغييرات منذ آخر sync
    const data = await sb(
      "bookings",
      "GET",
      null,
      `?select=id,customer_id,date,status,updated_at` +
      `&salon_id=eq.${salonId}` +
      `&updated_at=gt.${encodeURIComponent(lastSync)}` +
      `&limit=1000`
    );

    setLastSyncTime(key, now);

    console.log(
      `✅ Delta Sync: جلبت ${data.length} حجز متغير لصالون ${salonId}`
    );

    return { data, syncTime: now };
  } catch (error) {
    console.error(`❌ Delta Sync Error (Salon ${salonId}):`, error);
    return { data: [], error, syncTime: null };
  }
}

/**
 * جلب حجوزات العميل المتغيرة (Delta Sync)
 * @param {number} customerId - معرّف العميل
 * @param {function} sb - دالة الاستعلام
 * @returns {object} { data, syncTime, error }
 */
export async function deltaFetchCustomerBookings(customerId, sb) {
  const key = `bookings-customer-${customerId}`;
  const lastSync = getLastSyncTime(key);
  const now = new Date().toISOString();

  try {
    const data = await sb(
      "bookings",
      "GET",
      null,
      `?select=id,salon_id,date,status,updated_at` +
      `&customer_id=eq.${customerId}` +
      `&updated_at=gt.${encodeURIComponent(lastSync)}` +
      `&limit=500`
    );

    setLastSyncTime(key, now);

    console.log(
      `✅ Delta Sync: جلبت ${data.length} حجز متغير للعميل ${customerId}`
    );

    return { data, syncTime: now };
  } catch (error) {
    console.error(`❌ Delta Sync Error (Customer ${customerId}):`, error);
    return { data: [], error, syncTime: null };
  }
}

/**
 * جلب تقييمات الصالون المتغيرة (Delta Sync)
 * @param {number} salonId - معرّف الصالون
 * @param {function} sb - دالة الاستعلام
 * @returns {object} { data, syncTime, error }
 */
export async function deltaFetchSalonReviews(salonId, sb) {
  const key = `reviews-salon-${salonId}`;
  const lastSync = getLastSyncTime(key);
  const now = new Date().toISOString();

  try {
    const data = await sb(
      "reviews",
      "GET",
      null,
      `?select=id,customer_id,rating,text,updated_at` +
      `&salon_id=eq.${salonId}` +
      `&updated_at=gt.${encodeURIComponent(lastSync)}` +
      `&limit=200`
    );

    setLastSyncTime(key, now);

    console.log(
      `✅ Delta Sync: جلبت ${data.length} تقييم متغير لصالون ${salonId}`
    );

    return { data, syncTime: now };
  } catch (error) {
    console.error(`❌ Delta Sync Error (Reviews for ${salonId}):`, error);
    return { data: [], error, syncTime: null };
  }
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

/**
 * امسح بيانات sync محددة
 * @param {string} key - المفتاح
 */
export function clearSyncData(key) {
  localStorage.removeItem(`sync_${key}`);
  console.log(`✅ تم مسح sync data: ${key}`);
}

/**
 * امسح جميع بيانات sync
 */
export function clearAllSyncData() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("sync_"));
  keys.forEach((k) => localStorage.removeItem(k));
  console.log(`✅ تم مسح جميع sync data (${keys.length} مفاتيح)`);
}
