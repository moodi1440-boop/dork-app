const { createAdminClient } = require("./_lib/supabase-admin");
const { readJson } = require("./_lib/request");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const salonId = Number(body.salonId);
    const customerId = Number(body.customerId);
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.slice(0, 500) : "";
    const bookingDate = String(body.bookingDate || "");

    if (!salonId || !customerId || !bookingDate || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "بيانات التقييم غير صحيحة" });
      return;
    }

    const sb = createAdminClient();

    // يجب وجود حجز معتمد فعليًا لهذا العميل بهذا الصالون بهذا التاريخ، لمنع تقييمات مزوّرة.
    const { data: booking } = await sb
      .from("bookings")
      .select("id,customer_name,time,slot_duration_minutes")
      .eq("salon_id", salonId)
      .eq("customer_id", customerId)
      .eq("date", bookingDate)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (!booking) {
      res.status(403).json({ error: "لا يوجد حجز معتمد يطابق هذا التقييم" });
      return;
    }

    // لا يُسمح بالتقييم إلا بعد انتهاء وقت الحجز
    if (booking.time) {
      const dur = booking.slot_duration_minutes || 40;
      const bookingStartDT = new Date(`${bookingDate}T${booking.time}:00+03:00`);
      const bookingEndDT = new Date(bookingStartDT.getTime() + dur * 60000);
      if (new Date() < bookingEndDT) {
        res.status(403).json({ error: "لا يمكن التقييم قبل انتهاء وقت الحجز" });
        return;
      }
    }

    const { data: existing } = await sb
      .from("reviews")
      .select("id")
      .eq("salon_id", salonId)
      .eq("customer_id", customerId)
      .eq("booking_date", bookingDate)
      .maybeSingle();

    let review;
    if (existing) {
      const { data } = await sb.from("reviews").update({ rating, comment }).eq("id", existing.id).select("id,salon_id,customer_id,customer_name,rating,comment,booking_date,created_at").single();
      review = data;
    } else {
      const { data } = await sb.from("reviews").insert({
        salon_id: salonId, customer_id: customerId,
        customer_name: booking.customer_name || body.customerName || "",
        rating, comment, booking_date: bookingDate,
      }).select("id,salon_id,customer_id,customer_name,rating,comment,booking_date,created_at").single();
      review = data;
    }

    const { data: allReviews } = await sb.from("reviews").select("rating").eq("salon_id", salonId).limit(1000);
    const newRating = allReviews?.length
      ? Math.round((allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length) * 10) / 10
      : rating;

    await sb.from("salons").update({ rating: newRating }).eq("id", salonId);

    res.status(200).json({ ok: true, rating: newRating, review });
  } catch (e) {
    console.error("[submit-review] error:", e);
    res.status(500).json({ error: "خطأ بالسيرفر" });
  }
};
