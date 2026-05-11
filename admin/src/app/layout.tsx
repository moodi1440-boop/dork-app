import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import NotifListener from "@/components/NotifListener";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "DORK Admin",
  description: "لوحة إدارة منصة DORK",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-cairo bg-navy text-white`}>
        <NotifListener />
        {children}
      </body>
    </html>
  );
}
