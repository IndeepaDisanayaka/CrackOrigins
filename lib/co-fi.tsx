"use client"; // Next.js 13+ app directory

import Script from "next/script";

export default function KoFi() {
  const initKofi = () => {
    if (typeof window !== "undefined" && (window as any).kofiWidgetOverlay) {
      (window as any).kofiWidgetOverlay.draw("indeepadisanayaka", {
        type: "floating-chat",
        "floating-chat.donateButton.text": "Donate",
        "floating-chat.donateButton.background-color": "#fcbf47",
        "floating-chat.donateButton.text-color": "#000000ff",
      });
    }
  };

  return (
    <Script
      src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
      strategy="afterInteractive"
      onLoad={initKofi}
    />
  );
}
