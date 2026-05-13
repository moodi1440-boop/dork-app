import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export const handler = async (req: Request): Promise<Response> => {
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

    const notifications = [
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

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications created",
        booking_id: booking.id,
        salon_name: salon.name,
        count: notifications.length,
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
};
