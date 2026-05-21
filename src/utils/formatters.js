// ==============================================
//  UTILITY FUNCTIONS & FORMATTERS
// ==============================================

export function normalizeBgId(id) {
  return (id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildDorkBgStyle(bgId, darkMode) {
  const normalized = normalizeBgId(bgId);
  let bgColor = "linear-gradient(135deg,#d4a017,#f0c040)";
  let bgImage = null;

  if (normalized === "gold") {
    bgColor = "linear-gradient(135deg,#d4a017,#f0c040)";
  } else if (normalized === "silver") {
    bgColor = "linear-gradient(135deg,#c0c0c0,#e8e8e8)";
  } else if (normalized === "copper") {
    bgColor = "linear-gradient(135deg,#b87333,#ff7f50)";
  } else if (normalized === "gradient1") {
    bgColor = "linear-gradient(135deg,#667eea,#764ba2)";
  } else if (normalized === "gradient2") {
    bgColor = "linear-gradient(135deg,#f093fb,#f5576c)";
  }

  return {
    background: bgImage ? `url(${bgImage})` : bgColor,
    backgroundSize: bgImage ? "cover" : "auto",
    backgroundPosition: bgImage ? "center" : "auto",
  };
}

export function makeSlots(s, e, slotMin = 40) {
  const slots = [];
  const [sh, sm] = String(s).split(":").map(Number);
  const [eh, em] = String(e).split(":").map(Number);

  let totalMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  while (totalMin + slotMin <= endMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    totalMin += slotMin;
  }

  return slots;
}

export function getSlotsForSalon(s) {
  if (s.shiftEnabled && s.shift1Start && s.shift1End) {
    const shift1 = makeSlots(s.shift1Start, s.shift1End, s.slotMin);
    const shift2 = s.shift2Start && s.shift2End ? makeSlots(s.shift2Start, s.shift2End, s.slotMin) : [];
    return [...shift1, ...shift2];
  }
  return makeSlots(s.workStart, s.workEnd, s.slotMin);
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function calcTotal(svcs, prices) {
  return (svcs || []).reduce((a, s) => a + (prices?.[s] || 0), 0);
}

export function normPhone(p) {
  return String(p || "").replace(/\D/g, "");
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.includes("+") || dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar");
  } catch {
    return "—";
  }
}
