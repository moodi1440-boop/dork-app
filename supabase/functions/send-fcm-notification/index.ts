import { createClient } from "@supabase/supabase-js";

interface BookingPayload {
  record: {
    id: number;
    salon_id: number;
    customer_id?: number;
    date: string;
    time: string;
    status: string;
    service: string;
    customer_name: string;
    customer_phone: string;
  };
}

interface FCMToken {
  user_id: number;
  user_type: string;
  device_token: string;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data: {
      booking_id: string;
      salon_id: string;
      customer_id?: string;
      type: string;
      timestamp: string;
    };
    android?: {
      priority: string;
      notification?: {
        sound: string;
        click_action: string;
      };
    };
    webpush?: {
      notification?: {
        title: string;
        body: string;
        icon: string;
        badge: string;
        tag: string;
        vibrate: number[];
        sound: string;
      };
      data?: {
        booking_id: string;
        salon_id: string;
      };
    };
  };
}

// Helper function to send message to FCM
async function sendFCMMessage(token: string, message: FCMMessage) {
  const serviceAccountKey = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}");

  // Get access token
  const accessToken = await getAccessToken(serviceAccountKey);

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccountKey.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error(`FCM Error for token ${token}:`, error);
    return { success: false, error };
  }

  return { success: true };
}

// Get Google Access Token for FCM
async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));

  const now = Math.floor(Date.now() / 1000);
  const jwtClaims = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const jwtPayload = btoa(JSON.stringify(jwtClaims));
  const signatureInput = `${jwtHeader}.${jwtPayload}`;

  // Note: In Deno, we need to use a proper JWT signing method
  // For now, we'll use a simplified approach or rely on manual token setup
  // In production, use a proper JWT library

  // Temporary: Use server API key instead if available
  const apiKey = Deno.env.get("FIREBASE_SERVER_API_KEY");
  if (apiKey) {
    return apiKey;
  }

  // Fallback: Try to get token from Google OAuth
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signatureInput}.${btoa("signature")}`,
    }).toString(),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export const handler = async (req: Request) => {
  try {
    const payload: BookingPayload = await req.json();
    const booking = payload.record;

    console.log("Processing booking:", booking);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get salon info
    const { data: salon } = await supabase
      .from("salons")
      .select("id, name, logo, user_id")
      .eq("id", booking.salon_id)
      .single();

    if (!salon) {
      throw new Error(`Salon ${booking.salon_id} not found`);
    }

    // Prepare notification data
    const notificationData = {
      booking_id: String(booking.id),
      salon_id: String(booking.salon_id),
      customer_id: booking.customer_id ? String(booking.customer_id) : undefined,
      type: "new_booking",
      timestamp: new Date().toISOString(),
    };

    // 1. Send to Salon Owner
    console.log(`Sending notification to salon owner: ${salon.user_id}`);
    const salonTokens = await supabase
      .from("fcm_tokens")
      .select("device_token")
      .eq("user_type", "salon")
      .eq("user_id", salon.user_id)
      .eq("is_active", true);

    if (salonTokens.data && salonTokens.data.length > 0) {
      for (const tokenData of salonTokens.data) {
        const message: FCMMessage = {
          message: {
            token: tokenData.device_token,
            notification: {
              title: `✂️ حجز جديد في ${salon.name}`,
              body: `عميل: ${booking.customer_name} | الساعة: ${booking.time}`,
            },
            data: notificationData,
            webpush: {
              notification: {
                title: `✂️ حجز جديد في ${salon.name}`,
                body: `عميل: ${booking.customer_name}\nالتاريخ: ${booking.date}\nالساعة: ${booking.time}`,
                icon: salon.logo || "/Logo.svg",
                badge: "/Logo.svg",
                tag: "booking-notification",
                vibrate: [200, 100, 200],
                sound: "default",
              },
              data: {
                booking_id: String(booking.id),
                salon_id: String(booking.salon_id),
              },
            },
          },
        };

        await sendFCMMessage(tokenData.device_token, message);

        // Log the sent notification
        await supabase.from("notification_logs").insert({
          user_type: "salon",
          user_id: salon.user_id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      }
    }

    // 2. Send to Customer (if exists)
    if (booking.customer_id) {
      console.log(`Sending notification to customer: ${booking.customer_id}`);
      const customerTokens = await supabase
        .from("fcm_tokens")
        .select("device_token")
        .eq("user_type", "customer")
        .eq("user_id", booking.customer_id)
        .eq("is_active", true);

      if (customerTokens.data && customerTokens.data.length > 0) {
        for (const tokenData of customerTokens.data) {
          const message: FCMMessage = {
            message: {
              token: tokenData.device_token,
              notification: {
                title: `تم تأكيد حجزك ✓`,
                body: `في ${salon.name} بتاريخ ${booking.date} الساعة ${booking.time}`,
              },
              data: notificationData,
              webpush: {
                notification: {
                  title: `تم تأكيد حجزك ✓`,
                  body: `الصالون: ${salon.name}\nالتاريخ: ${booking.date}\nالساعة: ${booking.time}`,
                  icon: salon.logo || "/Logo.svg",
                  badge: "/Logo.svg",
                  tag: "booking-confirmation",
                  vibrate: [200, 100, 200],
                  sound: "default",
                },
                data: {
                  booking_id: String(booking.id),
                  salon_id: String(booking.salon_id),
                },
              },
            },
          };

          await sendFCMMessage(tokenData.device_token, message);

          await supabase.from("notification_logs").insert({
            user_type: "customer",
            user_id: booking.customer_id,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        }
      }
    }

    // 3. Send to Admin
    console.log("Sending notification to admin");
    const adminTokens = await supabase
      .from("fcm_tokens")
      .select("device_token")
      .eq("user_type", "admin")
      .eq("is_active", true);

    if (adminTokens.data && adminTokens.data.length > 0) {
      for (const tokenData of adminTokens.data) {
        const message: FCMMessage = {
          message: {
            token: tokenData.device_token,
            notification: {
              title: `📊 حجز جديد`,
              body: `${booking.customer_name} → ${salon.name}`,
            },
            data: notificationData,
            webpush: {
              notification: {
                title: `📊 حجز جديد`,
                body: `العميل: ${booking.customer_name}\nالصالون: ${salon.name}\nالوقت: ${booking.time}`,
                icon: "/Logo.svg",
                badge: "/Logo.svg",
                tag: "admin-booking",
                vibrate: [150, 50, 150],
                sound: "default",
              },
              data: {
                booking_id: String(booking.id),
                salon_id: String(booking.salon_id),
              },
            },
          },
        };

        await sendFCMMessage(tokenData.device_token, message);

        // Admin notifications are logged differently
        await supabase.from("notification_logs").insert({
          user_type: "admin",
          user_id: 0, // Admin doesn't have specific user_id
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications sent successfully",
        booking_id: booking.id,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing booking notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};
