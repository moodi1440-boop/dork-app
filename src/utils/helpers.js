// Dork App - Helper Functions
// ✂️ General utilities for the application

const SLOT_MIN = 40;
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function normalizeBgId(id){
  const BG_IDS = ["none", "stars", "grid", "waves", "marble", "circuit", "royal", "tech", "goldMarble"];
  if(BG_IDS.includes(id)) return id;
  return "none";
}

function makeSlots(s, e, slotMin = 40){
  const r = [];
  let [h, m] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  while(h < eh || (h === eh && m < em)){
    r.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m += slotMin;
    if(m >= 60){
      h++;
      m -= 60;
    }
  }
  return r;
}

function getSlotsForSalon(s){
  const sm = s.slotMin || SLOT_MIN;
  if(s.shiftEnabled){
    return [
      ...(s.shift1Start && s.shift1End ? makeSlots(s.shift1Start, s.shift1End, sm) : []),
      ...(s.shift2Start && s.shift2End ? makeSlots(s.shift2Start, s.shift2End, sm) : [])
    ];
  }
  return makeSlots(s.workStart || "09:00", s.workEnd || "22:00", sm);
}

function todayStr(){
  return new Date().toISOString().split("T")[0];
}

function openMaps(url, name, addr){
  window.open(url?.trim() || `https://www.google.com/maps/search/${encodeURIComponent(name + " " + addr)}`, "_blank");
}

function calcTotal(svcs, prices){
  return (svcs || []).reduce((a, s) => a + (prices?.[s] || 0), 0);
}

function normPhone(p){
  return String(p || "").replace(/\D/g, "");
}

export {
  SLOT_MIN,
  MONTHS_AR,
  normalizeBgId,
  makeSlots,
  getSlotsForSalon,
  todayStr,
  openMaps,
  calcTotal,
  normPhone
};
