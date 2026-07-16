import type { Metadata } from "next";
import { Cairo, Cinzel } from "next/font/google";
import "./globals.css";
import NotifListener from "@/components/NotifListener";
import FirebaseProvider from "@/components/FirebaseProvider";
import ThemeProvider from "@/components/ThemeProvider";

const cairo  = Cairo ({ subsets: ["arabic", "latin"], variable: "--font-cairo"  });
const cinzel = Cinzel({ subsets: ["latin"],             variable: "--font-cinzel", weight: ["900"] });

export const metadata: Metadata = {
  title: "DAWRAK Admin",
  description: "لوحة إدارة منصة DAWRAK",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="true" />
        <meta name="apple-mobile-web-app-capable" content="true" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Prevent theme flash — runs before any CSS */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('dork_theme')||'dark';document.documentElement.setAttribute('data-adm-theme',t);var bg=t==='light'?'rgb(247,247,247)':t==='lgray'?'rgb(158,155,152)':t==='dim'?'rgb(30,30,36)':'rgb(13,13,26)';document.documentElement.style.background=bg;})();` }} />
      </head>
      <body className={`${cairo.variable} ${cinzel.variable} font-cairo bg-navy text-white`}>
        <FirebaseProvider>
          <ThemeProvider>
            <NotifListener />
            {children}
          </ThemeProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
