export const SLOT_MIN = 40;

export function makeSlots(s, e, slotMin = SLOT_MIN) {
  const r = [];
  let [h, m] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  while (h < eh || (h === eh && m < em)) {
    r.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += slotMin;
    if (m >= 60) { h++; m -= 60; }
  }
  return r;
}

export function getSlotsForSalon(s) {
  const sm = s.slotMin || SLOT_MIN;
  if (s.shiftEnabled) {
    return [
      ...(s.shift1Start && s.shift1End ? makeSlots(s.shift1Start, s.shift1End, sm) : []),
      ...(s.shift2Start && s.shift2End ? makeSlots(s.shift2Start, s.shift2End, sm) : []),
    ];
  }
  return makeSlots(s.workStart || "09:00", s.workEnd || "22:00", sm);
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function openMaps(url, name, addr) {
  window.open(
    url?.trim() || `https://www.google.com/maps/search/${encodeURIComponent(name + " " + addr)}`,
    "_blank"
  );
}

export function calcTotal(svcs, prices) {
  return (svcs || []).reduce((a, s) => a + (prices?.[s] || 0), 0);
}

export function normPhone(p) {
  return String(p || "").replace(/\D/g, "");
}

export function buildHomeReviewsFeed(customers, approvedSalons) {
  const byId = new Map(approvedSalons.map(s => [Number(s.id), s]));
  const approvedSet = new Set(approvedSalons.map(s => Number(s.id)));
  const rows = [];
  let k = 0;
  for (const c of customers || []) {
    for (const h of c.history || []) {
      if (!h || !h.rating || h.rating <= 0) continue;
      const sid = Number(h.salonId);
      if (!approvedSet.has(sid)) continue;
      const salon = byId.get(sid);
      rows.push({
        key: `hr-${k++}`,
        salonId: sid,
        salonName: (h.salonName || salon?.name || "صالون").trim(),
        customerName: (c.name || "عميل").trim(),
        rating: h.rating,
        comment: (h.comment || "").trim(),
        date: h.date || "",
        time: h.time || "",
      });
    }
  }
  rows.sort((a, b) => {
    const d = (b.date || "").localeCompare(a.date || "");
    if (d !== 0) return d;
    return (b.time || "").localeCompare(a.time || "");
  });
  return rows;
}
