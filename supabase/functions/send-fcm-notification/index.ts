import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

interface NotificationPayload {
  target_type: "salon" | "admin" | "customer";
  target_id: number;
  title: string;
  body: string;
  icon: string;
}

async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<boolean> {
  const firebaseKey = Deno.env.get("FIREBASE_SERVER_API_KEY");
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") || "dork-app";

  if (!firebaseKey) {
    console.error("Missing FIREBASE_SERVER_API_KEY");
    return false;
  }

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/fcm/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${firebaseKey}`,
        },
        body: JSON.stringify({
          to: token,
          priority: "high",
          notification: { title, body, icon: "/favicon.ico", badge: "/favicon.ico", click_action: "/" },
          data,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("FCM error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("FCM send error:", error);
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const body = await req.json() as any;
    const booking = body?.record;
    const eventType = body?.type || "new_booking";

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: "No booking data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Supabase credentials" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: salon } = await supabase
      .from("salons")
      .select("id, name")
      .eq("id", booking.salon_id)
      .single();

    if (!salon) {
      return new Response(
        JSON.stringify({ success: false, error: `Salon ${booking.salon_id} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const notifications: NotificationPayload[] = [];

    if (eventType === "new_booking") {
      notifications.push({
        target_type: "salon",
        target_id: booking.salon_id,
        title: `✂️ حجز جديد في ${salon.name}`,
        body: `عميل: ${booking.customer_name} | الساعة: ${booking.time} | التاريخ: ${booking.date}`,
        icon: "✂️",
      });
      notifications.push({
        target_type: "admin",
        target_id: 0,
        title: "📊 حجز جديد",
        body: `${booking.customer_name} → ${salon.name}`,
        icon: "📊",
      });
      if (booking.customer_id) {
        notifications.push({
          target_type: "customer",
          target_id: booking.customer_id,
          title: "📋 تم استلام حجزك",
          body: `في ${salon.name} | التاريخ: ${booking.date} | الساعة: ${booking.time}`,
          icon: "📋",
        });
      }
    } else if (eventType === "booking_approved") {
      if (booking.customer_id) {
        notifications.push({
          target_type: "customer",
          target_id: booking.customer_id,
          title: "✅ تم قبول حجزك!",
          body: `تم تأكيد حجزك في ${salon.name} | التاريخ: ${booking.date} | الساعة: ${booking.time}`,
          icon: "✅",
        });
      }
      notifications.push({
        target_type: "salon",
        target_id: booking.salon_id,
        title: "✅ تم تأكيد الحجز",
        body: `تم قبول حجز ${booking.customer_name} | الساعة: ${booking.time}`,
        icon: "✅",
      });
    } else if (eventType === "booking_rejected") {
      if (booking.customer_id) {
        notifications.push({
          target_type: "customer",
          target_id: booking.customer_id,
          title: "❌ تم رفض حجزك",
          body: `للأسف تم رفض حجزك في ${salon.name} | التاريخ: ${booking.date}`,
          icon: "❌",
        });
      }
    } else if (eventType === "promo_broadcast") {
      const customerIds: number[] = booking.customer_ids || [];
      const promoText: string = booking.promo_text || "";
      for (const customerId of customerIds) {
        notifications.push({
          target_type: "customer",
          target_id: customerId,
          title: `🔥 عرض خاص من ${salon.name}`,
          body: promoText,
          icon: "🔥",
        });
      }
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No notifications to send" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: savedNotifications, error: insertError } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (insertError) {
      console.error("Notification insert error:", insertError.message);
    }

    const sentCount = { success: 0, failed: 0 };
    const logEntries: any[] = [];

    for (const notification of notifications) {
      const tokenQuery = supabase
        .from("fcm_tokens")
        .select("id, device_token")
        .eq("is_active", true);

      if (notification.target_type === "admin") {
        tokenQuery.eq("user_type", "admin");
      } else {
        tokenQuery.eq("user_type", notification.target_type);
        tokenQuery.eq("user_id", notification.target_id);
      }

      const { data: tokens } = await tokenQuery;

      if (tokens && tokens.length > 0) {
        for (const tokenRecord of tokens) {
          const notifRecord = savedNotifications?.find(
            (n: any) =>
              n.target_type === notification.target_type &&
              n.target_id === notification.target_id
          );

          const sent = await sendFCMNotification(
            tokenRecord.device_token,
            notification.title,
            notification.body,
            {
              booking_id: String(booking.id),
              salon_id: String(booking.salon_id),
              customer_id: String(booking.customer_id || ""),
              type: eventType,
              timestamp: new Date().toISOString(),
            }
          );

          logEntries.push({
            notification_id: notifRecord?.id || null,
            fcm_token_id: tokenRecord.id,
            user_type: notification.target_type,
            user_id: notification.target_id,
            status: sent ? "sent" : "failed",
          });

          if (sent) {
            sentCount.success++;
          } else {
            sentCount.failed++;
          }
        }
      } else {
        console.warn(`No active tokens for ${notification.target_type}:${notification.target_id}`);
      }
    }

    if (logEntries.length > 0) {
      await supabase
        .from("notification_logs")
        .insert(logEntries)
        .catch((error: any) => console.error("Log insert error:", error));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications processed",
        event_type: eventType,
        booking_id: booking.id,
        salon_name: salon.name,
        notifications_created: savedNotifications?.length || 0,
        fcm_sent: sentCount.success,
        fcm_failed: sentCount.failed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
