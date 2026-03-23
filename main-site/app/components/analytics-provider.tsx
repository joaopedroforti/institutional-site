"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { getPageLabel, trackInteraction, trackPageView } from "../lib/analytics";

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

  const isInternalView = () =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("internal") === "1";

  const registerClick = useEffectEvent((target: HTMLElement) => {
    if (isInternalView()) {
      return;
    }

    const element = target.tagName.toLowerCase();
    const href = target.getAttribute("href") ?? "";
    const explicitEventType = target.getAttribute("data-track-event");
    const explicitType = target.getAttribute("data-track-type");
    const eventType =
      explicitEventType ||
      (explicitType === "cta" ? "cta_request_proposal_click" : null) ||
      (explicitType === "whatsapp" ? "whatsapp_button_click" : null) ||
      (href.includes("wa.me") ? "whatsapp_button_click" : null) ||
      (href.includes("/proposta/") ? "proposal_open" : null) ||
      "click";

    void trackInteraction({
      eventType,
      element,
      label: extractInteractionLabel(target),
      pagePath: pathname,
      metadata: {
        href,
        event_name:
          eventType === "cta_request_proposal_click"
            ? "Clique botao solicitar proposta"
            : eventType === "whatsapp_button_click"
              ? "Clique botao WhatsApp"
              : eventType === "proposal_open"
                ? "Acesso proposta"
                : "Interacao",
        where: getPageLabel(pathname),
      },
    });
  });

  useEffect(() => {
    if (isInternalView()) {
      return;
    }

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
