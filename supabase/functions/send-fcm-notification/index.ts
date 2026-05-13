import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

export const handler = async (req: Request) => {
  try {
    const payload: BookingPayload = await req.json();
    const booking = payload.record;

    console.log("[FCM] Starting: Processing booking ID", booking.id);

    const supabaseUrl = Deno.env.get("DB_URL");
    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[FCM] Missing environment variables");
      throw new Error("Missing DB_URL or SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[FCM] Fetching salon:", booking.salon_id);
    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, name")
      .eq("id", booking.salon_id)
      .single();

    if (salonError) {
      console.error("[FCM] Salon fetch error:", salonError.message);
      throw new Error(`Salon error: ${salonError.message}`);
    }

    if (!salon) {
      throw new Error(`Salon ${booking.salon_id} not found`);
    }

    console.log("[FCM] Found salon:", salon.name);

    const notificationsToCreate = [];

    notificationsToCreate.push({
      target_type: "salon",
      target_id: booking.salon_id,
      title: `✂️ حجز جديد في ${salon.name}`,
      body: `عميل: ${booking.customer_name}\nالساعة: ${booking.time}`,
      icon: "✂️",
    });

    if (booking.customer_id) {
      notificationsToCreate.push({
        target_type: "customer",
        target_id: booking.customer_id,
        title: "تم تأكيد حجزك ✓",
        body: `في ${salon.name}\nالتاريخ: ${booking.date}\nالساعة: ${booking.time}`,
        icon: "✓",
      });
    }

    notificationsToCreate.push({
      target_type: "admin",
      target_id: 0,
      title: "📊 حجز جديد",
      body: `${booking.customer_name} → ${salon.name}`,
      icon: "📊",
    });

    console.log("[FCM] Creating", notificationsToCreate.length, "notifications");

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notificationsToCreate);

    if (insertError) {
      console.error("[FCM] Insert error:", insertError.message);
      throw new Error(`Insert error: ${insertError.message}`);
    }

    console.log("[FCM] ✅ All notifications created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications created successfully",
        booking_id: booking.id,
        salon_name: salon.name,
        notifications_count: notificationsToCreate.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[FCM] ❌ Handler error:", errorMsg);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};
