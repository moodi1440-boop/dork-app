import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export const handler = async (req: Request) => {
  let errorMsg = "Unknown error";

  try {
    // Parse request
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      errorMsg = "Failed to parse JSON";
      throw new Error(errorMsg);
    }

    const booking = payload?.record;
    if (!booking) {
      throw new Error("No booking data in payload");
    }

    // Get environment variables
    const dbUrl = Deno.env.get("DB_URL");
    const dbKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!dbUrl) throw new Error("DB_URL not set");
    if (!dbKey) throw new Error("SERVICE_ROLE_KEY not set");

    // Create Supabase client
    const supabase = createClient(dbUrl, dbKey);

    // Fetch salon
    const salonResponse = await supabase
      .from("salons")
      .select("id, name")
      .eq("id", booking.salon_id)
      .single();

    if (salonResponse.error) {
      throw new Error(`Salon fetch failed: ${salonResponse.error.message}`);
    }

    const salon = salonResponse.data;
    if (!salon) {
      throw new Error(`Salon ${booking.salon_id} not found`);
    }

    // Build notifications array
    const notifications: any[] = [
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

    // Insert notifications
    const insertResponse = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertResponse.error) {
      throw new Error(`Insert failed: ${insertResponse.error.message}`);
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications created",
        booking_id: booking.id,
        salon_name: salon.name,
        count: notifications.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    // Safely extract error message
    if (err instanceof Error) {
      errorMsg = err.message;
    } else if (typeof err === "string") {
      errorMsg = err;
    } else if (err && typeof err === "object") {
      errorMsg = JSON.stringify(err);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
