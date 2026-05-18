export const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export const DEFAULT_SOCIAL_LINKS = {email:"",twitter:"",whatsapp:"",telegram:"",telegramUser:"",enabled:false,customFields:[]};

export const THEMES = {
  gold:      {primary:"#d4a017", light:"#f0c040", dark:"#a07810", lightest:"#f5d76e", rgb:"212,160,23"},
  emerald:   {primary:"#10b981", light:"#34d399", dark:"#047857", lightest:"#6ee7b7", rgb:"16,185,129"},
  sapphire:  {primary:"#3b82f6", light:"#60a5fa", dark:"#1e40af", lightest:"#93c5fd", rgb:"59,130,246"},
  royalBlue: {primary:"#1e3a8a", light:"#3b82f6", dark:"#172554", lightest:"#93c5fd", rgb:"30,58,138"},
  bronze:    {primary:"#8b5a2b", light:"#c9a227", dark:"#5c3d1a", lightest:"#e8c97a", rgb:"139,90,43"},
  rose:      {primary:"#ec4899", light:"#f472b6", dark:"#9d174d", lightest:"#f9a8d4", rgb:"236,72,153"},
  violet:    {primary:"#8b5cf6", light:"#a78bfa", dark:"#5b21b6", lightest:"#c4b5fd", rgb:"139,92,246"},
  crimson:   {primary:"#ef4444", light:"#f87171", dark:"#991b1b", lightest:"#fca5a5", rgb:"239,68,68"},
};

export const BACKGROUNDS = [
  {id:"none",    label:"بلا خلفية",    emoji:"⬛", style:{background:"#0d0d1a",backgroundImage:"none"}},
  {id:"stars",   label:"نجوم",          emoji:"✨", style:{background:"radial-gradient(ellipse at top,#1a1a3a 0%,#0d0d1a 70%)",backgroundImage:"radial-gradient(circle,rgba(255,255,255,.08) 1px,transparent 1px)",backgroundSize:"40px 40px"}},
  {id:"grid",    label:"شبكة",          emoji:"🔲", style:{background:"#0d0d1a",backgroundImage:"linear-gradient(rgba(212,160,23,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.05) 1px,transparent 1px)",backgroundSize:"30px 30px"}},
  {id:"waves",   label:"أمواج",         emoji:"🌊", style:{background:"linear-gradient(180deg,#0d0d1a 0%,#0a1628 50%,#0d0d1a 100%)",backgroundImage:"none"}},
  {id:"marble",  label:"رخام",          emoji:"🪨", style:{background:"linear-gradient(135deg,#111118 25%,#1a1a2a 25%,#1a1a2a 50%,#111118 50%,#111118 75%,#1a1a2a 75%)",backgroundSize:"20px 20px",backgroundImage:"none"}},
  {id:"circuit", label:"دوائر",         emoji:"🔌", style:{background:"#0d0d1a",backgroundImage:"radial-gradient(circle at 50% 50%,rgba(212,160,23,.03) 0%,transparent 60%)"}},
  {id:"royal",   label:"ملكي",          emoji:"👑", style:{
    background:"linear-gradient(160deg,#12081f 0%,#1a0a28 45%,#0f0818 100%)",
    backgroundImage:"radial-gradient(ellipse 90% 45% at 50% -15%, rgba(212,160,23,.18), transparent), radial-gradient(circle at 100% 100%, rgba(91,33,182,.14), transparent 55%)",
  }},
  {id:"tech",    label:"تقني",          emoji:"⚡", style:{
    background:"#050a12",
    backgroundImage:"linear-gradient(rgba(56,189,248,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.07) 1px,transparent 1px), radial-gradient(ellipse 100% 40% at 50% 0%, rgba(34,211,238,.09), transparent 60%)",
    backgroundSize:"22px 22px,22px 22px,100% 100%",
  }},
  {id:"goldMarble",label:"رخام ذهبي",   emoji:"✦", style:{
    background:"linear-gradient(118deg,#141210 0%,#1c1812 30%,#12100c 60%,#1a1612 100%)",
    backgroundImage:"repeating-linear-gradient(-35deg,transparent,transparent 3px,rgba(212,160,23,.05) 3px,rgba(212,160,23,.05) 6px), radial-gradient(ellipse 70% 50% at 25% 15%, rgba(240,192,64,.14), transparent 55%)",
  }},
];

export const BG_LIGHT_STYLES = {
  none:      {background:"#eef0f6",backgroundImage:"none",backgroundSize:"auto"},
  stars:     {background:"linear-gradient(180deg,#e4e8f4 0%,#f4f5fb 100%)",backgroundImage:"radial-gradient(circle,rgba(30,58,138,.07) 1px,transparent 1px)",backgroundSize:"40px 40px"},
  grid:      {background:"#eef0f6",backgroundImage:"linear-gradient(rgba(30,58,138,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,.06) 1px,transparent 1px)",backgroundSize:"30px 30px"},
  waves:     {background:"linear-gradient(180deg,#f0f2f8 0%,#e2e8f4 50%,#f0f2f8 100%)",backgroundImage:"none"},
  marble:    {background:"linear-gradient(135deg,#f8f7f5 25%,#ece8e4 25%,#ece8e4 50%,#f8f7f5 50%,#f8f7f5 75%,#ece8e4 75%)",backgroundSize:"20px 20px",backgroundImage:"none"},
  circuit:   {background:"#eef1f8",backgroundImage:"radial-gradient(circle at 50% 40%,rgba(59,130,246,.06) 0%,transparent 65%)"},
  royal:     {background:"linear-gradient(165deg,#ede8f5 0%,#e8e4f2 50%,#f2f0fa 100%)",backgroundImage:"radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,.12), transparent), radial-gradient(circle at 100% 100%, rgba(212,160,23,.08), transparent 50%)"},
  tech:      {background:"#f0f4fa",backgroundImage:"linear-gradient(rgba(14,116,144,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(14,116,144,.05) 1px,transparent 1px), radial-gradient(ellipse 100% 35% at 50% 0%, rgba(56,189,248,.1), transparent 55%)",backgroundSize:"22px 22px,22px 22px,100% 100%"},
  goldMarble:{background:"linear-gradient(120deg,#faf8f5 0%,#f3efe8 45%,#faf7f2 100%)",backgroundImage:"repeating-linear-gradient(-35deg,transparent,transparent 3px,rgba(166,124,41,.06) 3px,rgba(166,124,41,.06) 6px), radial-gradient(ellipse 65% 45% at 30% 10%, rgba(201,162,39,.12), transparent 50%)"},
};

export function normalizeBgId(id) {
  if (BACKGROUNDS.some(b => b.id === id)) return id;
  return "none";
}

export function buildDorkBgStyle(bgId, darkMode) {
  const id = normalizeBgId(bgId);
  const base = {position:"fixed",inset:0,zIndex:-1,pointerEvents:"none"};
  if (!darkMode) {
    const L = BG_LIGHT_STYLES[id] || BG_LIGHT_STYLES.none;
    return {...base, ...L};
  }
  const bg = BACKGROUNDS.find(b => b.id === id) || BACKGROUNDS[0];
  return {...base, ...bg.style};
}
