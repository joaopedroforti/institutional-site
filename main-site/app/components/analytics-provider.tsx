"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { trackInteraction, trackPageView } from "../lib/analytics";

function extractInteractionLabel(target: HTMLElement) {
  const trackedLabel =
    target.getAttribute("data-track-label") ||
    target.getAttribute("aria-label") ||
    target.textContent?.trim() ||
    target.getAttribute("href") ||
    target.getAttribute("name");

  return trackedLabel?.slice(0, 255) ?? "interacao";
}

export default function AnalyticsProvider() {
  const pathname = usePathname();

  const registerClick = useEffectEvent((target: HTMLElement) => {
    const element = target.tagName.toLowerCase();
    const href = target.getAttribute("href") ?? "";
    const explicitEventType = target.getAttribute("data-track-event");
    const explicitType = target.getAttribute("data-track-type");
    const eventType =
      explicitEventType ||
      (explicitType === "cta" ? "cta_click" : null) ||
      (explicitType === "whatsapp" ? "whatsapp_click" : null) ||
      (href.includes("wa.me") ? "whatsapp_click" : null) ||
      (href.includes("/proposta/") ? "proposal_open" : null) ||
      "click";

    void trackInteraction({
      eventType,
      element,
      label: extractInteractionLabel(target),
      pagePath: pathname,
      metadata: {
        href,
      },
    });
  });

  useEffect(() => {
    void trackPageView(pathname).catch(() => {
      // A home nao deve quebrar se a API de analytics estiver indisponivel.
    });
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a, button, [data-track]");

      if (!target || !(target instanceof HTMLElement)) {
        return;
      }

      registerClick(target);
    };

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
