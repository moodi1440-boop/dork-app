// ==============================================
//  LOCATION UTILITIES
// ==============================================

export function openMaps(url, name, addr) {
  window.open(
    url?.trim() || `https://www.google.com/maps/search/${encodeURIComponent(name + " " + addr)}`,
    "_blank"
  );
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getSalonCoords(salon) {
  if (!salon?.locationUrl) return null;
  try {
    const url = new URL(salon.locationUrl);
    const params = new URLSearchParams(url.search);
    const query = params.get("q");
    if (query) {
      const [lat, lng] = query.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

export function calculateDistance(userLoc, salonCoords) {
  if (!userLoc || !salonCoords) return null;
  return haversine(userLoc.lat, userLoc.lng, salonCoords.lat, salonCoords.lng);
}

export function isOpenNow(salon) {
  const now = new Date();

  // استخراج التاريخ بصيغة YYYY-MM-DD بتوقيت السعودية
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }); // "2026-05-21"

  // استخراج الوقت بصيغة HH:MM بتوقيت السعودية
  const timeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh" }).slice(0, 5); // "14:30"

  // تحقق من الأيام المغلقة (مخزنة كـ YYYY-MM-DD)
  if ((salon.closedDays || []).includes(dateStr)) return false;

  // تحقق من أوقات العمل والـ Shifts
  if (salon.shiftEnabled) {
    const inShift1 = timeStr >= salon.shift1Start && timeStr < salon.shift1End;
    const inShift2 = timeStr >= salon.shift2Start && timeStr < salon.shift2End;
    return inShift1 || inShift2;
  }

  return timeStr >= salon.workStart && timeStr < salon.workEnd;
}
