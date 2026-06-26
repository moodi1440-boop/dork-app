// مكتبة أيقونات SVG لاستبدال الإيموجي بلوحة الإدارة — منسوخة بنفس التصميم من App.jsx (ICONS.md بالمشروع الرئيسي)
type IconProps = { size?: number; color?: string };

export function IconSuccess({ size = 16, color = "#27ae60" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8,12.5 11,15.5 16,9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>);
}
export function IconError({ size = 16, color = "#e74c3c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="12" r="10" />
    <line x1="9" y1="9" x2="15" y2="15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="15" y1="9" x2="9" y2="15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>);
}
export function IconClose({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
  </svg>);
}
export function IconChat({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.4L4 20l1.2-4.6A8.4 8.4 0 1 1 21 11.5z" />
  </svg>);
}
export function IconBell({ size = 16, color = "currentColor", dot = true }: IconProps & { dot?: boolean }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.4H4c.6-.8 2-2.4 2-6.4z" />
    <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
    {dot && <circle cx="17.5" cy="6" r="2.6" fill="#e74c3c" stroke="none" />}
  </svg>);
}
export function IconChart({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="20" x2="6" y2="14" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="10" />
  </svg>);
}
export function IconMobile({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="3" /><line x1="10" y1="4.3" x2="14" y2="4.3" /><line x1="10" y1="19" x2="14" y2="19" />
  </svg>);
}
export function IconScissors({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="6" cy="6.5" r="3.3" /><circle cx="6" cy="17.5" r="3.3" />
    <line x1="19.5" y1="4" x2="8.3" y2="15" /><line x1="14.5" y1="14.6" x2="19.5" y2="19.5" /><line x1="8.3" y1="9" x2="12" y2="12.6" />
  </svg>);
}
export function IconSearch({ size = 16, color = "#c9952c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.5" cy="10.5" r="7" /><line x1="20" y1="20" x2="15.5" y2="15.5" />
  </svg>);
}
export function IconSave({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3h12l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><rect x="7" y="3" width="8" height="6" rx="0.8" /><rect x="7" y="14" width="10" height="6" rx="0.8" />
  </svg>);
}
export function IconBlocked({ size = 16, color = "#e74c3c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><line x1="6" y1="18" x2="18" y2="6" />
  </svg>);
}
export function IconUser({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="9.5" r="3.2" /><path d="M6 18.5c1.2-2.6 3.4-4 6-4s4.8 1.4 6 4" />
  </svg>);
}
export function IconCalendar({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
    <circle cx="12" cy="15.5" r="1.6" fill={color} stroke="none" />
  </svg>);
}
export function IconCalendarGrid({ size = 16, color = "#c9952c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="3" x2="8" y2="6.5" /><line x1="16" y1="3" x2="16" y2="6.5" />
    <circle cx="8" cy="13" r="1" fill={color} stroke="none" /><circle cx="12" cy="13" r="1" fill={color} stroke="none" /><circle cx="16" cy="13" r="1" fill={color} stroke="none" /><circle cx="8" cy="17" r="1" fill={color} stroke="none" /><circle cx="12" cy="17" r="1" fill={color} stroke="none" />
  </svg>);
}
export function IconLock({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" />
    <circle cx="12" cy="15.5" r="1.3" fill={color} stroke="none" /><line x1="12" y1="16.8" x2="12" y2="18.3" />
  </svg>);
}
export function IconLockOpen({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.8-1.2" />
    <circle cx="12" cy="15.5" r="1.3" fill={color} stroke="none" /><line x1="12" y1="16.8" x2="12" y2="18.3" />
  </svg>);
}
export function IconCall({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .6 3 .7a2 2 0 0 1 1.7 2.1z" />
  </svg>);
}
export function IconMail({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 6.5l9 6.5 9-6.5" />
  </svg>);
}
export function IconTrash({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6.5h18" />
    <path d="M8 6.5V4.3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2.2" />
    <path d="M18.5 6.5l-1.1 13.3a2.5 2.5 0 0 1-2.5 2.3h-5.8a2.5 2.5 0 0 1-2.5-2.3L5.5 6.5" />
    <path d="M9 11l.4 6" strokeWidth="1.5" /><path d="M12 11v6" strokeWidth="1.5" /><path d="M15 11l-.4 6" strokeWidth="1.5" />
  </svg>);
}
export function IconShare({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>);
}
export function IconDiscountSeal({ size = 16, color = "var(--p)" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.30 12.00 C22.30 12.72 20.25 13.29 20.02 14.15 C19.79 15.01 21.28 16.53 20.92 17.15 C20.56 17.77 18.50 17.24 17.87 17.87 C17.24 18.50 17.77 20.56 17.15 20.92 C16.53 21.28 15.01 19.79 14.15 20.02 C13.29 20.25 12.72 22.30 12.00 22.30 C11.28 22.30 10.71 20.25 9.85 20.02 C8.99 19.79 7.47 21.28 6.85 20.92 C6.23 20.56 6.76 18.50 6.13 17.87 C5.50 17.24 3.44 17.77 3.08 17.15 C2.72 16.53 4.21 15.01 3.98 14.15 C3.75 13.29 1.70 12.72 1.70 12.00 C1.70 11.28 3.75 10.71 3.98 9.85 C4.21 8.99 2.72 7.47 3.08 6.85 C3.44 6.23 5.50 6.76 6.13 6.13 C6.76 5.50 6.23 3.44 6.85 3.08 C7.47 2.72 8.99 4.21 9.85 3.98 C10.71 3.75 11.28 1.70 12.00 1.70 C12.72 1.70 13.29 3.75 14.15 3.98 C15.01 4.21 16.53 2.72 17.15 3.08 C17.77 3.44 17.24 5.50 17.87 6.13 C18.50 6.76 20.56 6.23 20.92 6.85 C21.28 7.47 19.79 8.99 20.02 9.85 C20.25 10.71 22.30 11.28 22.30 12.00 Z" />
    <circle cx="9.3" cy="9.3" r="1.3" fill={color} stroke="none" /><circle cx="14.7" cy="14.7" r="1.3" fill={color} stroke="none" /><line x1="15.5" y1="8.5" x2="8.5" y2="15.5" />
  </svg>);
}
export function IconBarberPole({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="3" width="8" height="18" rx="4" />
    <circle cx="12" cy="3" r="1.8" fill={color} stroke="none" /><circle cx="12" cy="21" r="1.8" fill={color} stroke="none" />
    <path d="M8 8l8 4M8 14l8 4" />
  </svg>);
}
export function IconPalette({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21a9 9 0 1 1 0-18c5 0 8 3 8 6.5 0 2-1.5 3.5-3.5 3.5h-2a2 2 0 0 0-1 3.7c.5.3.8.8.8 1.4 0 1-.8 1.9-2.3 1.9z" />
    <circle cx="7.5" cy="11" r="1.1" fill={color} stroke="none" /><circle cx="9.5" cy="7" r="1.1" fill={color} stroke="none" />
    <circle cx="14.5" cy="7" r="1.1" fill={color} stroke="none" /><circle cx="16.5" cy="11" r="1.1" fill={color} stroke="none" />
  </svg>);
}
export function IconStar({ size = 16, color = "var(--gold)" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>);
}
export function IconXLogo({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>);
}
export function IconGroup({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.2" /><path d="M3.3 19c0-3.2 2.5-5 5.7-5s5.7 1.8 5.7 5" />
    <circle cx="17" cy="9" r="2.6" /><path d="M15 13.2c2.6.3 4.7 1.9 4.7 4.8" />
  </svg>);
}
export function IconMoneyBag({ size = 16, color = "#c9952c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.2" /><path d="M12 7v10" />
    <path d="M15 9.3c0-1.5-1.4-2.7-3-2.7s-3 1.1-3 2.5c0 1.4 1.3 2 3 2.5 1.8.5 3 1.1 3 2.5S13.6 17 12 17s-3-1.1-3-2.7" />
  </svg>);
}
export function IconTrendUp({ size = 16, color = "#27ae60" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l5-5 4 4 8-9" /><path d="M15 7h5v5" />
  </svg>);
}
export function IconWarning({ size = 16, color = "#f0a020" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.9 3.9c.5-.85 1.7-.85 2.2 0l8.1 13.9c.5.85-.1 1.9-1.1 1.9H3.9c-1 0-1.6-1.05-1.1-1.9z" />
    <line x1="12" y1="10" x2="12" y2="14.5" /><circle cx="12" cy="17.3" r="1" fill={color} stroke="none" />
  </svg>);
}
export function IconRefresh({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12a8 8 0 0 1 14-5.3" /><polyline points="18,3 18,7 14,7" />
    <path d="M20 12a8 8 0 0 1-14 5.3" /><polyline points="6,21 6,17 10,17" />
  </svg>);
}
export function IconCash({ size = 16, color = "#27ae60" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.2" /><path d="M12 7v10" />
    <path d="M15 9.3c0-1.5-1.4-2.7-3-2.7s-3 1.1-3 2.5c0 1.4 1.3 2 3 2.5 1.8.5 3 1.1 3 2.5S13.6 17 12 17s-3-1.1-3-2.7" />
  </svg>);
}
export function IconFileExport({ size = 16, color = "#c9952c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2.5h9l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" /><path d="M12 11v6m-2.5-2.5L12 17l2.5-2.5" />
  </svg>);
}
export function IconPencil({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l3.5-1 11-11-2.5-2.5-11 11z" /><path d="M14 6l3 3" />
  </svg>);
}
export function IconThumbtack({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="4" /><line x1="12" y1="12.5" x2="12" y2="20" />
  </svg>);
}
export function IconLogout({ size = 16, color = "#e74c3c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="11" height="20" rx="1" /><circle cx="13" cy="12" r="1" fill={color} stroke="none" />
    <polyline points="16,8 21,12 16,16" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>);
}
export function IconMoon({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>);
}
export function IconNone({ size = 16, color = "var(--text-muted)" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <rect x="4" y="4" width="16" height="16" rx="3" /><line x1="6" y1="18" x2="18" y2="6" />
  </svg>);
}
export function IconCircleOutline({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
  </svg>);
}
export function IconSun({ size = 16, color = "#f0a020" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="2" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="22" /><line x1="2" y1="12" x2="4.5" y2="12" /><line x1="19.5" y1="12" x2="22" y2="12" />
    <line x1="5.5" y1="5.5" x2="3.8" y2="3.8" /><line x1="18.5" y1="5.5" x2="20.2" y2="3.8" /><line x1="5.5" y1="18.5" x2="3.8" y2="20.2" /><line x1="18.5" y1="18.5" x2="20.2" y2="20.2" />
  </svg>);
}
export function IconRadioFilled({ size = 16, color = "#9e9b98" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill={color} /></svg>);
}
export function IconFontSize({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17 8 6l4 11M5 14h6" /><path d="M14 17l3-7 3 7M14.7 15h4.6" />
  </svg>);
}
export function IconMedal({ size = 16, color = "#d4a017" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round">
    <path d="M9 9L6 1L10 3Z" fill={color} /><path d="M15 9L18 1L14 3Z" fill={color} />
    <circle cx="12" cy="14" r="6" fill={color} />
    <path d="M12 11.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill="#fff" stroke="none" />
  </svg>);
}
export function IconCoinArrow({ size = 16, color = "#c9952c" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" /><path d="M12 8v8M9 13l3 3 3-3" />
  </svg>);
}
export function IconClipboard({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="4" width="14" height="18" rx="2" /><rect x="9" y="2" width="6" height="3" rx="1" />
    <line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="16" y2="15" />
  </svg>);
}
export function IconCheck({ size = 16, color = "#27ae60" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" /><polyline points="7,13 11,17 17,8" />
  </svg>);
}
export function IconCrown({ size = 16, color = "#d4a017" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round">
    <path d="M3 18 5 9 9 14 12 7 15 14 19 9 21 18 Z" /><rect x="3" y="18" width="18" height="2.5" rx="1" fill={color} stroke="none" />
    <circle cx="5" cy="9" r="1" fill={color} stroke="none" /><circle cx="12" cy="7" r="1" fill={color} stroke="none" /><circle cx="19" cy="9" r="1" fill={color} stroke="none" />
  </svg>);
}
export function IconPin({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.6" fill="#fff" />
  </svg>);
}
export function IconClock({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.2" /><path d="M12 6.5v5.5h4.5" />
  </svg>);
}
export function IconGear({ size = 16, color = "#fff", bg = "#8e8e93" }: IconProps & { bg?: string }) {
  const teeth = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340];
  return (<svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="0.5" y="0.5" width="23" height="23" rx="5" fill={bg} />
    <g fill={color}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.6" />
      {teeth.map(a => <rect key={a} x="11.3" y="1.6" width="1.4" height="2.6" rx="0.6" transform={`rotate(${a} 12 12)`} />)}
      <line x1="12" y1="12" x2="12" y2="6.5" stroke={color} strokeWidth="0.8" />
      <line x1="12" y1="12" x2="7.2" y2="14.8" stroke={color} strokeWidth="0.8" />
      <line x1="12" y1="12" x2="16.8" y2="14.8" stroke={color} strokeWidth="0.8" />
      <circle cx="12" cy="12" r="1.3" fill={bg} stroke={color} strokeWidth="0.6" />
    </g>
  </svg>);
}
export function IconScale({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="20" /><line x1="5" y1="7" x2="19" y2="7" /><line x1="5" y1="7" x2="5" y2="11" /><line x1="19" y1="7" x2="19" y2="11" />
    <circle cx="5" cy="13" r="2" /><circle cx="19" cy="13" r="2" /><line x1="8" y1="20" x2="16" y2="20" />
  </svg>);
}
export function IconReceipt({ size = 16, color = "#f0a020" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V2Z" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="13" y2="15" />
  </svg>);
}
export function IconPlus({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>);
}
export function IconKey({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="12" r="4.3" /><line x1="11.8" y1="12" x2="21" y2="12" /><line x1="17" y1="12" x2="17" y2="15" /><line x1="20" y1="12" x2="20" y2="15" />
  </svg>);
}
export function IconMonitor({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2" /><line x1="12" y1="16" x2="12" y2="19.5" /><line x1="7.5" y1="20" x2="16.5" y2="20" />
  </svg>);
}
export function IconDice({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <circle cx="8" cy="8" r="1.3" fill={color} stroke="none" /><circle cx="16" cy="8" r="1.3" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill={color} stroke="none" />
    <circle cx="8" cy="16" r="1.3" fill={color} stroke="none" /><circle cx="16" cy="16" r="1.3" fill={color} stroke="none" />
  </svg>);
}
export function IconRazor({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5.5" y="3" width="13" height="6" rx="2" /><line x1="7.5" y1="6" x2="16.5" y2="6" /><rect x="10" y="9.5" width="4" height="11" rx="1.4" />
  </svg>);
}
export function IconMusicNote({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="17" r="3" fill={color} stroke="none" /><line x1="11" y1="17" x2="11" y2="5" /><path d="M11 5 C15 6, 16 9, 14 11" />
  </svg>);
}
export function IconWindChime({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="3.3" r="1" /><line x1="6" y1="6" x2="18" y2="6" />
    <line x1="7.5" y1="6" x2="7.5" y2="13" /><line x1="12" y1="6" x2="12" y2="17" /><line x1="16.5" y1="6" x2="16.5" y2="10.5" />
    <circle cx="7.5" cy="14.3" r="1.3" fill={color} stroke="none" /><circle cx="12" cy="18.3" r="1.3" fill={color} stroke="none" /><circle cx="16.5" cy="11.8" r="1.3" fill={color} stroke="none" />
  </svg>);
}
export function IconPostHorn({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4.5 A8 8 0 1 1 5.5 11.5" /><circle cx="15" cy="4.5" r="1.1" fill={color} stroke="none" /><path d="M5.5 11.5 L1.8 9.8 L3 16 Z" />
  </svg>);
}
export function IconTrumpet({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="13.2" width="9" height="2.2" rx="1.1" /><circle cx="2.5" cy="14.3" r="1" fill={color} stroke="none" />
    <line x1="5" y1="13" x2="5" y2="9.5" /><circle cx="5" cy="8.6" r="1" fill={color} stroke="none" />
    <line x1="7.7" y1="13" x2="7.7" y2="9.5" /><circle cx="7.7" cy="8.6" r="1" fill={color} stroke="none" />
    <line x1="10.4" y1="13" x2="10.4" y2="9.5" /><circle cx="10.4" cy="8.6" r="1" fill={color} stroke="none" />
    <path d="M11.5 13.1 L21 10 L21 17.6 L11.5 15.5 Z" />
  </svg>);
}
export function IconRobot({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="9" width="14" height="11" rx="2.5" /><line x1="12" y1="9" x2="12" y2="5" /><circle cx="12" cy="4" r="1.3" fill={color} stroke="none" />
    <circle cx="9" cy="14" r="1.4" fill={color} stroke="none" /><circle cx="15" cy="14" r="1.4" fill={color} stroke="none" /><line x1="9" y1="18" x2="15" y2="18" />
  </svg>);
}
export function IconArrowUp({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="6" /><polyline points="6,12 12,6 18,12" />
  </svg>);
}
export function IconArrowDown({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="18" /><polyline points="6,12 12,18 18,12" />
  </svg>);
}
export function IconEye({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>);
}
export function IconEyeOff({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>);
}

export function IconChevronLeft({ size = 16, color = "currentColor" }: IconProps) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>);
}

// خريطة الإيموجي ← المكوّن، نقطة ارتكاز واحدة (مطابقة لمبدأ NotifIcon بـApp.jsx الرئيسي)
export function EmojiIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  switch (icon) {
    case "✅": return <IconSuccess size={size} />;
    case "❌": return <IconError size={size} />;
    case "✕": return <IconClose size={size} />;
    case "💬": return <IconChat size={size} />;
    case "🔔": return <IconBell size={size} />;
    case "📊": return <IconChart size={size} />;
    case "📱": return <IconMobile size={size} />;
    case "📲": return <IconMobile size={size} />;
    case "✂": case "✂️": return <IconScissors size={size} />;
    case "🔍": return <IconSearch size={size} />;
    case "💾": return <IconSave size={size} />;
    case "🚫": return <IconBlocked size={size} />;
    case "👤": return <IconUser size={size} />;
    case "📅": return <IconCalendar size={size} />;
    case "📆": return <IconCalendarGrid size={size} />;
    case "🔒": return <IconLock size={size} />;
    case "🔓": return <IconLockOpen size={size} />;
    case "🔐": return <IconLock size={size} color="var(--p,#c9952c)" />;
    case "📞": return <IconCall size={size} />;
    case "📧": case "✉": case "✉️": return <IconMail size={size} />;
    case "🗑": case "🗑️": return <IconTrash size={size} />;
    case "📤": return <IconShare size={size} />;
    case "🎟": case "🎫": return <IconDiscountSeal size={size} />;
    case "💈": return <IconBarberPole size={size} />;
    case "🎨": return <IconPalette size={size} />;
    case "⭐": case "★": return <IconStar size={size} />;
    case "🐦": return <IconXLogo size={size} />;
    case "👥": return <IconGroup size={size} />;
    case "💰": return <IconMoneyBag size={size} />;
    case "📈": return <IconTrendUp size={size} />;
    case "⚠": case "⚠️": return <IconWarning size={size} />;
    case "🔄": return <IconRefresh size={size} />;
    case "💵": return <IconCash size={size} />;
    case "📄": return <IconFileExport size={size} />;
    case "✏": case "✏️": return <IconPencil size={size} />;
    case "📌": return <IconThumbtack size={size} />;
    case "🚪": return <IconLogout size={size} />;
    case "🌙": return <IconMoon size={size} />;
    case "⬛": return <IconNone size={size} />;
    case "⭘": return <IconCircleOutline size={size} />;
    case "☀": case "☀️": return <IconSun size={size} />;
    case "🔘": return <IconRadioFilled size={size} />;
    case "🟢": return <IconRadioFilled size={size} color="#27ae60" />;
    case "🔴": return <IconRadioFilled size={size} color="#ef4444" />;
    case "⚫": return <IconRadioFilled size={size} color="#444" />;
    case "🔤": return <IconFontSize size={size} />;
    case "🥇": return <IconMedal size={size} color="#d4a017" />;
    case "🥈": return <IconMedal size={size} color="#9e9e9e" />;
    case "🥉": return <IconMedal size={size} color="#cd7f32" />;
    case "🏅": return <IconMedal size={size} color="#d4a017" />;
    case "📝": return <IconClipboard size={size} />;
    case "🪙": return <IconCoinArrow size={size} />;
    case "📋": return <IconClipboard size={size} />;
    case "✓": return <IconCheck size={size} />;
    case "👑": return <IconCrown size={size} />;
    case "📍": return <IconPin size={size} />;
    case "🕐": return <IconClock size={size} />;
    case "⚙": case "⚙️": return <IconGear size={size} bg="#8e8e93" color="#fff" />;
    case "⚖": case "⚖️": return <IconScale size={size} />;
    case "🧾": return <IconReceipt size={size} />;
    case "➕": return <IconPlus size={size} />;
    case "🔑": return <IconKey size={size} />;
    case "🖥": case "🖥️": return <IconMonitor size={size} />;
    case "🎲": return <IconDice size={size} />;
    case "🪒": return <IconRazor size={size} />;
    case "🎵": return <IconMusicNote size={size} />;
    case "🎐": return <IconWindChime size={size} />;
    case "📯": return <IconPostHorn size={size} />;
    case "🎺": return <IconTrumpet size={size} />;
    case "🤖": return <IconRobot size={size} />;
    case "↑": return <IconArrowUp size={size} />;
    case "↓": return <IconArrowDown size={size} />;
    case "↻": case "↺": return <IconRefresh size={size} />;
    default: return <span style={{ fontSize: size }}>{icon}</span>;
  }
}
