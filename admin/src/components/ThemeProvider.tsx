"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type AdminTheme = "dark" | "dim" | "light" | "lgray";

interface ThemeCtxType {
  theme: AdminTheme;
  setTheme: (t: AdminTheme) => void;
}

const ThemeCtx = createContext<ThemeCtxType>({ theme: "dark", setTheme: () => {} });

export function useAdminTheme() { return useContext(ThemeCtx); }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("dork_theme") as AdminTheme) || "dark";
    const valid: AdminTheme[] = ["dark", "dim", "light", "lgray"];
    const t = valid.includes(saved) ? saved : "dark";
    setThemeState(t);
    document.documentElement.setAttribute("data-adm-theme", t);
  }, []);

  const setTheme = (t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem("dork_theme", t);
    document.documentElement.setAttribute("data-adm-theme", t);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}
