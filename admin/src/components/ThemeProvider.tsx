"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type AdminTheme = "dark" | "dim" | "light" | "lgray";

const ACCENT_COLORS: Record<string, { accent: string; light: string; dark: string }> = {
  gold:      { accent: "212 160 23",  light: "247 231 183", dark: "160 120 16" },
  emerald:   { accent: "16 185 129",  light: "52 211 153",  dark: "5 150 105"  },
  sapphire:  { accent: "59 130 246",  light: "96 165 250",  dark: "29 78 216"  },
  royalBlue: { accent: "65 105 225",  light: "100 149 237", dark: "25 55 185"  },
  bronze:    { accent: "205 127 50",  light: "222 170 110", dark: "160 90 20"  },
  rose:      { accent: "236 72 153",  light: "249 168 212", dark: "190 24 93"  },
  violet:    { accent: "139 92 246",  light: "196 181 253", dark: "109 40 217" },
  crimson:   { accent: "220 38 38",   light: "252 165 165", dark: "185 28 28"  },
  teal:      { accent: "20 184 166",  light: "94 234 212",  dark: "15 118 110" },
  coral:     { accent: "249 115 22",  light: "253 186 116", dark: "194 65 12"  },
  fuchsia:   { accent: "217 70 239",  light: "240 171 252", dark: "162 28 175" },
  wine:      { accent: "159 18 57",   light: "205 92 92",   dark: "120 10 40"  },
  forest:    { accent: "34 139 34",   light: "86 180 86",   dark: "14 100 14"  },
  lime:      { accent: "101 163 13",  light: "163 230 53",  dark: "63 98 18"   },
  sky:       { accent: "2 132 199",   light: "56 189 248",  dark: "3 105 161"  },
};

const FONT_SIZES: Record<string, string> = { sm: "13px", md: "15px", lg: "17px" };

interface ThemeCtxType {
  theme: AdminTheme;
  accent: string;
  fontSize: string;
  setTheme: (t: AdminTheme) => void;
  saveAppearance: (accent: string, fontSize: string) => void;
}

const ThemeCtx = createContext<ThemeCtxType>({
  theme: "dark", accent: "gold", fontSize: "md",
  setTheme: () => {}, saveAppearance: () => {},
});

export function useAdminTheme() { return useContext(ThemeCtx); }

function applyAccent(accentId: string) {
  const c = ACCENT_COLORS[accentId] ?? ACCENT_COLORS.gold;
  const r = document.documentElement.style;
  r.setProperty("--adm-accent",       c.accent);
  r.setProperty("--adm-accent-light", c.light);
  r.setProperty("--adm-accent-dark",  c.dark);
}

function applyFontSize(fs: string) {
  document.documentElement.style.setProperty("--adm-font", FONT_SIZES[fs] ?? "15px");
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,    setThemeState]    = useState<AdminTheme>("dark");
  const [accent,   setAccentState]   = useState("gold");
  const [fontSize, setFontSizeState] = useState("md");

  useEffect(() => {
    const saved = (localStorage.getItem("dork_theme") as AdminTheme) || "dark";
    const valid: AdminTheme[] = ["dark", "dim", "light", "lgray"];
    const t = valid.includes(saved) ? saved : "dark";
    setThemeState(t);
    document.documentElement.setAttribute("data-adm-theme", t);

    try {
      const adm = JSON.parse(localStorage.getItem("dork_admin_appearance") || "{}");
      const a = ACCENT_COLORS[adm.accent]    ? adm.accent    : "gold";
      const f = FONT_SIZES[adm.fontSize]     ? adm.fontSize  : "md";
      setAccentState(a);
      setFontSizeState(f);
      applyAccent(a);
      applyFontSize(f);
    } catch {}
  }, []);

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem("dork_theme", t);
    document.documentElement.setAttribute("data-adm-theme", t);
  };

  const saveAppearance = (newAccent: string, newFontSize: string) => {
    const a = ACCENT_COLORS[newAccent]    ? newAccent    : "gold";
    const f = FONT_SIZES[newFontSize]     ? newFontSize  : "md";
    setAccentState(a);
    setFontSizeState(f);
    applyAccent(a);
    applyFontSize(f);
    localStorage.setItem("dork_admin_appearance", JSON.stringify({ accent: a, fontSize: f }));
  };

  return (
    <ThemeCtx.Provider value={{ theme, accent, fontSize, setTheme, saveAppearance }}>
      {children}
    </ThemeCtx.Provider>
  );
}
