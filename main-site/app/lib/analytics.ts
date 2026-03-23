"use client";

import { apiFetch } from "./api";

const visitorSessionStorageKey = "forticorp-visitor-session-key";
const lastPageVisitStorageKey = "forticorp-last-page-visit-id";

type SessionResponse = {
  session_key: string;
};

type PageViewResponse = {
  page_visit_id: number;
};

function canUseBrowserApi() {
  return typeof window !== "undefined";
}

function getCurrentSessionKey() {
  if (!canUseBrowserApi()) {
    return null;
  }

  return window.localStorage.getItem(visitorSessionStorageKey);
}

function setCurrentSessionKey(sessionKey: string) {
  if (!canUseBrowserApi()) {
    return;
  }

  window.localStorage.setItem(visitorSessionStorageKey, sessionKey);
}

export function getLastPageVisitId() {
  if (!canUseBrowserApi()) {
    return null;
  }

  const value = window.sessionStorage.getItem(lastPageVisitStorageKey);

  return value ? Number(value) : null;
}

function setLastPageVisitId(pageVisitId: number) {
  if (!canUseBrowserApi()) {
    return;
  }

  window.sessionStorage.setItem(lastPageVisitStorageKey, String(pageVisitId));
}

function getUtmParams() {
  if (!canUseBrowserApi()) {
    return undefined;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
      .map((key) => [key, searchParams.get(key)])
      .filter(([, value]) => Boolean(value)),
  );

  return Object.keys(utm).length > 0 ? utm : undefined;
}

export async function ensureVisitorSession(currentPath: string) {
  if (!canUseBrowserApi()) {
    return null;
  }

  const existingSessionKey = getCurrentSessionKey() ?? window.crypto.randomUUID();
  const response = await apiFetch<SessionResponse>("/analytics/session", {
    method: "POST",
    body: JSON.stringify({
      session_key: existingSessionKey,
      landing_page: currentPath,
      last_path: currentPath,
      referrer: document.referrer || null,
      utm: getUtmParams(),
      metadata: {
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
      },
    }),
  });

  setCurrentSessionKey(response.session_key);

  return response.session_key;
}

export async function trackPageView(currentPath: string) {
  if (!canUseBrowserApi()) {
    return;
  }

  const sessionKey = await ensureVisitorSession(currentPath);

  if (!sessionKey) {
    return;
  }

  const response = await apiFetch<PageViewResponse>("/analytics/page-view", {
    method: "POST",
    body: JSON.stringify({
      session_key: sessionKey,
      path: currentPath,
      url: window.location.href,
      title: document.title,
      duration_seconds: 0,
      metadata: {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    }),
  });

  setLastPageVisitId(response.page_visit_id);
}

type TrackInteractionInput = {
  eventType: string;
  element?: string;
  label?: string;
  pagePath?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function trackInteraction(input: TrackInteractionInput) {
  if (!canUseBrowserApi()) {
    return;
  }

  const sessionKey = await ensureVisitorSession(input.pagePath ?? window.location.pathname);

  if (!sessionKey) {
    return;
  }

  await apiFetch("/analytics/event", {
    method: "POST",
    body: JSON.stringify({
      session_key: sessionKey,
      page_visit_id: getLastPageVisitId(),
      event_type: input.eventType,
      element: input.element,
      label: input.label,
      page_path: input.pagePath ?? window.location.pathname,
      metadata: input.metadata,
    }),
  });
}

export function getStoredVisitorSessionKey() {
  return getCurrentSessionKey();
}
