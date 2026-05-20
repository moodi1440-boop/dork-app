import { BACKGROUNDS, BG_LIGHT_STYLES } from "../constants.js";
import { normalizeBgId } from "./helpers.js";

function buildDorkBgStyle(bgId, darkMode) {
  const id = normalizeBgId(bgId);
  const base = { position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" };
  if (!darkMode) {
    const L = BG_LIGHT_STYLES[id] || BG_LIGHT_STYLES.none;
    return { ...base, ...L };
  }
  const bg = BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];
  return { ...base, ...bg.style };
}

function buildHomeReviewsFeed(customers, approvedSalons) {
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

export { buildDorkBgStyle, buildHomeReviewsFeed };
