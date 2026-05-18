export default function DorkLogoSvg({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dlg" x1="0" y1="0" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#fff8c8"/>
          <stop offset="22%"  stopColor="#f5d060"/>
          <stop offset="55%"  stopColor="#d4a017"/>
          <stop offset="100%" stopColor="#8b6000"/>
        </linearGradient>
        <linearGradient id="dlg2" x1="50" y1="0" x2="50" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffe566"/>
          <stop offset="100%" stopColor="#c8900a"/>
        </linearGradient>
      </defs>

      <rect x="5" y="4" width="90" height="102" rx="22" ry="22"
        stroke="url(#dlg)" strokeWidth="4" fill="none"/>

      <path d="M 22 46 A 28 28 0 0 1 78 46"
        stroke="url(#dlg)" strokeWidth="3.8" fill="none" strokeLinecap="round"/>

      <line x1="50" y1="16" x2="50" y2="22" stroke="url(#dlg)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="21" y1="46" x2="27" y2="46" stroke="url(#dlg)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="79" y1="46" x2="73" y2="46" stroke="url(#dlg)" strokeWidth="2.5" strokeLinecap="round"/>

      <line x1="50" y1="46" x2="39" y2="36" stroke="url(#dlg)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="50" y1="46" x2="61" y2="37" stroke="url(#dlg2)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="50" cy="46" r="3" fill="url(#dlg)"/>

      <line x1="22" y1="94" x2="79" y2="22"
        stroke="url(#dlg)" strokeWidth="5.5" strokeLinecap="round"/>

      <line x1="78" y1="94" x2="21" y2="22"
        stroke="url(#dlg)" strokeWidth="5.5" strokeLinecap="round"/>

      <circle cx="50" cy="58" r="5.5" fill="url(#dlg)"/>
      <circle cx="50" cy="58" r="2.5" fill="#0b0d1e"/>

      <circle cx="22" cy="94" r="9.5" stroke="url(#dlg)" strokeWidth="3.5" fill="none"/>
      <circle cx="78" cy="94" r="9.5" stroke="url(#dlg)" strokeWidth="3.5" fill="none"/>

      <path d="M 50 89 C 47 86 44 83 44 80.5 A 6 6 0 0 1 56 80.5 C 56 83 53 86 50 89 Z"
        fill="url(#dlg)"/>
      <circle cx="50" cy="80.5" r="2.5" fill="#0b0d1e"/>
    </svg>
  );
}
