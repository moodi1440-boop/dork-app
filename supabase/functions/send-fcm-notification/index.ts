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

    console.log("[FCM] Processing booking:", booking);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("DB_URL") || "";
    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing DB_URL or SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get salon info
    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, name, logo, user_id")
      .eq("id", booking.salon_id)
      .single();

    if (salonError || !salon) {
      console.error("[FCM] Salon error:", salonError);
      throw new Error(`Salon ${booking.salon_id} not found`);
    }

    console.log(`[FCM] Found salon: ${salon.name}`);

    // Create notification for Salon Owner
    const { data: salonNotif, error: salonNotifError } = await supabase
      .from("notifications")
      .insert({
        target_type: "salon",
        target_id: salon.user_id,
        title: `✂️ حجز جديد في ${salon.name}`,
        body: `عميل: ${booking.customer_name}\nالساعة: ${booking.time}`,
        icon: "✂️",
        read: false,
      })
      .select()
      .single();

    if (salonNotifError) {
      console.error("[FCM] Error creating salon notification:", salonNotifError);
    } else {
      console.log("[FCM] Salon notification created:", salonNotif.id);
    }

    // Create notification for Customer (if exists)
    if (booking.customer_id) {
      const { data: customerNotif, error: customerNotifError } = await supabase
        .from("notifications")
        .insert({
          target_type: "customer",
          target_id: booking.customer_id,
          title: "تم تأكيد حجزك ✓",
          body: `في ${salon.name}\nالتاريخ: ${booking.date}\nالساعة: ${booking.time}`,
          icon: "✓",
          read: false,
        })
        .select()
        .single();

      if (customerNotifError) {
        console.error("[FCM] Error creating customer notification:", customerNotifError);
      } else {
        console.log("[FCM] Customer notification created:", customerNotif.id);
      }
    }

    // Create notification for Admin
    const { data: adminNotif, error: adminNotifError } = await supabase
      .from("notifications")
      .insert({
        target_type: "admin",
        target_id: 0,
        title: "📊 حجز جديد",
        body: `${booking.customer_name} → ${salon.name}`,
        icon: "📊",
        read: false,
      })
      .select()
      .single();

    if (adminNotifError) {
      console.error("[FCM] Error creating admin notification:", adminNotifError);
    } else {
      console.log("[FCM] Admin notification created:", adminNotif.id);
    }

    console.log("[FCM] All notifications created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications created successfully",
        booking_id: booking.id,
        salon_name: salon.name,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[FCM] Handler error:", error);
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
