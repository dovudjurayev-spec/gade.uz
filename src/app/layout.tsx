import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://gade.uz"),
  title: {
    default: "GADE — профессиональная косметика в Узбекистане",
    template: "%s · GADE",
  },
  description:
    "Официальный дистрибьютор GADE Cosmetics в Узбекистане. Только оригинал, доставка по Ташкенту, возврат 14 дней.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "GADE.uz",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
