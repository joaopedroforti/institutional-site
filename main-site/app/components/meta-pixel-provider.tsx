"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

type MetaPixelSettings = {
  enabled: boolean;
  pixel_id: string;
  automatic_advanced_matching: boolean;
};

type IntegrationsResponse = {
  data?: {
    meta_pixel?: Partial<MetaPixelSettings>;
  };
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
    __forticorpMetaPixelId?: string;
  }
}

function loadMetaPixel(pixelId: string, automaticAdvancedMatching: boolean) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (!window.fbq) {
    // Meta Pixel bootstrap snippet
    (function (f: Window & typeof globalThis, b: Document, e: string, v: string, n?: ((...args: unknown[]) => void) & { [key: string]: unknown }, t?: HTMLScriptElement, s?: Element) {
      if (f.fbq) return;
      n = function (...args: unknown[]) {
        const self = n as any;
        if (typeof self.callMethod === "function") {
          self.callMethod(...args);
        } else {
          self.queue = self.queue || [];
          self.queue.push(args);
        }
      } as ((...args: unknown[]) => void) & { [key: string]: unknown };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s?.parentNode?.insertBefore(t, s);
      f.fbq = n;
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  }

  window.fbq?.("init", pixelId);
  if (automaticAdvancedMatching) {
    window.fbq?.("set", "autoConfig", true, pixelId);
  }

  window.__forticorpMetaPixelId = pixelId;
}

export default function MetaPixelProvider() {
  const pathname = usePathname();
  const [metaPixel, setMetaPixel] = useState<MetaPixelSettings>({
    enabled: false,
    pixel_id: "",
    automatic_advanced_matching: false,
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await apiFetch<IntegrationsResponse>("/settings/integrations");
        const settings = response.data?.meta_pixel;
        if (cancelled || !settings) return;

        setMetaPixel({
          enabled: Boolean(settings.enabled),
          pixel_id: String(settings.pixel_id ?? "").trim(),
          automatic_advanced_matching: Boolean(settings.automatic_advanced_matching),
        });
      } catch {
        // Silencioso: não pode quebrar render do site
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!metaPixel.enabled || !metaPixel.pixel_id) {
      return;
    }

    if (!initializedRef.current || window.__forticorpMetaPixelId !== metaPixel.pixel_id) {
      loadMetaPixel(metaPixel.pixel_id, metaPixel.automatic_advanced_matching);
      initializedRef.current = true;
    }

    window.fbq?.("track", "PageView");
  }, [metaPixel, pathname]);

  return null;
}
