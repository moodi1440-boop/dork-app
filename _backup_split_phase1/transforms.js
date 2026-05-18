export function toAppSalon(row) {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    ownerPhone: row.owner_phone,
    region: row.region,
    gov: row.gov,
    center: row.center,
    village: row.village,
    phone: row.phone,
    address: row.address,
    locationUrl: row.location_url,
    services: row.services || [],
    prices: row.prices || {},
    shiftEnabled: row.shift_enabled,
    shift1Start: row.shift1_start,
    shift1End: row.shift1_end,
    shift2Start: row.shift2_start,
    shift2End: row.shift2_end,
    workStart: row.work_start,
    workEnd: row.work_end,
    barbers: row.barbers || [],
    tone: row.tone,
    rating: row.rating,
    status: row.status,
    bookings: [],
  };
}

export function toDbSalon(s) {
  return {
    name: s.name,
    owner: s.owner,
    owner_phone: s.ownerPhone,
    region: s.region,
    gov: s.gov,
    center: s.center,
    village: s.village,
    phone: s.phone,
    address: s.address,
    location_url: s.locationUrl,
    services: s.services,
    prices: s.prices,
    shift_enabled: s.shiftEnabled,
    shift1_start: s.shift1Start,
    shift1_end: s.shift1End,
    shift2_start: s.shift2Start,
    shift2_end: s.shift2End,
    work_start: s.workStart,
    work_end: s.workEnd,
    barbers: s.barbers,
    tone: s.tone,
  };
}

export function toAppBooking(row) {
  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    services: row.services || [],
    barberId: row.barber_id,
    barberName: row.barber_name,
    date: row.date,
    time: row.time,
    total: row.total,
    status: row.status,
  };
}

export function toAppCustomer(row) {
  let history = row.history || [];
  let favs = row.favs || [];
  if (!history.length) {
    try { const h = localStorage.getItem(`hist_${row.id}`); if (h) history = JSON.parse(h); } catch {}
  }
  if (!favs.length) {
    try { const f = localStorage.getItem(`favs_${row.id}`); if (f) favs = JSON.parse(f); } catch {}
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    password: row.password,
    googleUid: row.google_uid || "",
    favs,
    history,
    createdAt: row.created_at || new Date().toISOString(),
  };
}
