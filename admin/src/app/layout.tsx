import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import NotifListener from "@/components/NotifListener";
import FirebaseProvider from "@/components/FirebaseProvider";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "DORK Admin",
  description: "لوحة إدارة منصة DORK",
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
      </head>
      <body className={`${cairo.variable} font-cairo bg-navy text-white`}>
        <FirebaseProvider>
          <NotifListener />
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
