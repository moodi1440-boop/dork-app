import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export const handler = async (req: Request): Promise<Response> => {
  try {
    const body = await req.json() as any;
    const booking = body?.record;

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: "No booking" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = Deno.env.get("DB_URL") || "";
    const key = Deno.env.get("SERVICE_ROLE_KEY") || "";

    if (!url || !key) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing env" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = createClient(url, key);

    const { data: salon } = await client
      .from("salons")
      .select("id, name")
      .eq("id", booking.salon_id)
      .single();

    if (!salon) {
      return new Response(
        JSON.stringify({ success: false, error: "Salon not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const notifs: any[] = [
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
      notifs.push({
        target_type: "customer",
        target_id: booking.customer_id,
        title: "تم تأكيد حجزك ✓",
        body: `في ${salon.name}\nالتاريخ: ${booking.date}\nالساعة: ${booking.time}`,
        icon: "✓",
      });
    }

    await client.from("notifications").insert(notifs);

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        salon_name: salon.name,
        count: notifs.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(e?.message || "Error"),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
