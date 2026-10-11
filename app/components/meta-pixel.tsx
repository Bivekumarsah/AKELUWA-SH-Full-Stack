"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const CONSENT_KEY = "akeluwa-meta-pixel-consent";
const PIXEL_ID = "891396932267293";

export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "declined") setConsent(stored);
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;

    if (!window.fbq) {
      // Standard Meta Pixel loader, only after the visitor opts in.
      const f = window;
      const n = (...args: unknown[]) => {
        const pixel = n as typeof n & {
          callMethod?: (...args: unknown[]) => void;
          queue?: unknown[][];
          loaded?: boolean;
          version?: string;
          push?: (...args: unknown[]) => void;
        };
        if (pixel.callMethod) pixel.callMethod(...args);
        else pixel.queue?.push(args);
      };
      const pixel = n as typeof n & {
        queue?: unknown[][];
        loaded?: boolean;
        version?: string;
        push?: (...args: unknown[]) => void;
      };
      pixel.queue = [];
      pixel.loaded = true;
      pixel.version = "2.0";
      pixel.push = pixel;
      f.fbq = n;
      f._fbq = n;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
      window.fbq?.("init", PIXEL_ID);
    }
    window.fbq?.("track", "PageView");
  }, [consent, pathname, searchParams]);

  function choose(value: "accepted" | "declined") {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
  }

  if (consent !== null) return null;

  return (
    <aside aria-label="Optional analytics consent" style={{
      position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 9999,
      maxWidth: 580, margin: "0 auto", padding: 18, borderRadius: 12,
      background: "#101d37", color: "#fff", boxShadow: "0 8px 28px #0005",
      fontFamily: "system-ui, sans-serif", fontSize: 14,
    }}>
      <p style={{ margin: "0 0 12px" }}>
        We use optional Meta Pixel tracking to understand visits and measure Facebook and Instagram ads. You can decline without affecting the website. See our <a href="/privacy-policy" style={{ color: "#9cd7ff", textDecoration: "underline" }}>privacy policy</a>.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => choose("accepted")} style={{ background: "#1584ee", color: "white", padding: "9px 16px", borderRadius: 7, cursor: "pointer" }}>Accept optional tracking</button>
        <button type="button" onClick={() => choose("declined")} style={{ background: "#e8eef6", color: "#101d37", padding: "9px 16px", borderRadius: 7, cursor: "pointer" }}>Decline</button>
      </div>
    </aside>
  );
}
