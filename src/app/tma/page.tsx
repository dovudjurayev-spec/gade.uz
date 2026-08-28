import Script from "next/script";
import { TmaClient } from "./tma-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "GADE — вход через Telegram" };

export default function TmaPage() {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <TmaClient />
    </>
  );
}
