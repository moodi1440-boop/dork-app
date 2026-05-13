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
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${firebaseKey}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title,
              body,
            },
            webpush: {
              fcmOptions: {
                link: "/",
              },
              notification: {
                title,
                body,
                icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E",
                badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E",
                tag: "booking-notification",
                requireInteraction: false,
                vibrate: [200, 100, 200],
              },
              data,
            },
            android: {
              notification: {
                title,
                body,
                sound: "default",
                clickAction: "/",
              },
              data,
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title,
                    body,
                  },
                  sound: "default",
                  badge: 1,
                },
              },
              fcmOptions: {
                analyticsLabel: "booking_notification",
              },
            },
          },
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

    const notifications: NotificationPayload[] = [
      {
        target_type: "salon",
        target_id: booking.salon_id,
        title: `✂️ حجز جديد في ${salon.name}`,
        body: `عميل: ${booking.customer_name}\nالساعة: ${booking.time}`,
        icon: "✂️",
      },
      {
        target_type: "admin",
        target_id: 0,
        title: "📊 حجز جديد",
        body: `${booking.customer_name} → ${salon.name}`,
        icon: "📊",
      },
    ];

    if (booking.customer_id) {
      notifications.push({
        target_type: "customer",
        target_id: booking.customer_id,
        title: "تم تأكيد حجزك ✓",
        body: `في ${salon.name}\nالتاريخ: ${booking.date}\nالساعة: ${booking.time}`,
        icon: "✓",
      });
    }

    const { data: savedNotifications, error: insertError } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send actual FCM notifications
    const sentCount = { success: 0, failed: 0 };
    const logEntries = [];

    for (const notification of notifications) {
      const { data: tokens } = await supabase
        .from("fcm_tokens")
        .select("id, device_token")
        .eq("user_type", notification.target_type)
        .eq("user_id", notification.target_id)
        .eq("is_active", true);

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
              type: "booking_notification",
            }
          );

          logEntries.push({
            notification_id: notifRecord?.id,
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
      }
    }

    if (logEntries.length > 0) {
      await supabase
        .from("notification_logs")
        .insert(logEntries)
        .catch((error) => console.error("Log insert error:", error));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications processed",
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
