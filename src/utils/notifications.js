// Dork App - Notifications Management

function getCustomerClassification(customer){
  const history = (customer?.history || []);
  const total = history.filter(h => h.status !== "rejected").length;
  const completed = history.filter(h => h.status === "approved").length;
  const noShows = history.filter(h => h.status === "cancelled" && h.attendance === "no_show").length;
  const lateCancels = history.filter(h => h.status === "cancelled").length;

  if(lateCancels >= 3 || noShows >= 3) return {label:"⚠️ غير ملتزم", color:"#e74c3c", key:"unreliable"};
  if(total === 0) return {label:"🆕 جديد", color:"#3498db", key:"new"};
  if(completed >= 5 && lateCancels === 0) return {label:"🌟 مميز", color:"#d4a017", key:"vip"};
  if(completed >= 2 && lateCancels <= 1) return {label:"✅ منتظم", color:"#27ae60", key:"regular"};
  return {label:"🆕 جديد", color:"#3498db", key:"new"};
}

async function requestNotifPermission(){
  if(!("Notification" in window)) return false;
  if(Notification.permission === "granted") return true;
  const p = await Notification.requestPermission();
  return p === "granted";
}

function sendNotif(title, body, icon = "✂", targetType = "all", targetId = null){
  // Increment notification counter
  const count = parseInt(localStorage.getItem("dork_notif_count") || "0");
  localStorage.setItem("dork_notif_count", String(count + 1));

  // Save notification locally
  try{
    const notifs = JSON.parse(localStorage.getItem("dork_notifs") || "[]");
    notifs.unshift({
      id: Date.now(),
      title,
      body,
      icon,
      time: new Date().toLocaleTimeString("ar", {hour:"2-digit", minute:"2-digit"}),
      read: false
    });
    localStorage.setItem("dork_notifs", JSON.stringify(notifs.slice(0, 50)));
  }catch{}

  // Save to Supabase for web sync
  // This will be done in the main App component with the `sb` function
  if(!("Notification" in window) || Notification.permission !== "granted") return;
  try{
    new Notification(`${icon} ${title}`, {
      body,
      icon: "/favicon.ico",
      dir: "rtl",
      lang: "ar"
    });
  }catch{}
}

// Request permission on app load
if(typeof window !== "undefined"){
  setTimeout(() => requestNotifPermission(), 3000);
}

export {
  getCustomerClassification,
  requestNotifPermission,
  sendNotif
};
