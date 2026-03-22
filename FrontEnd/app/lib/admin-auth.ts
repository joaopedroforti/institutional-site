"use client";

export const adminTokenStorageKey = "forticorp-admin-token";
const adminTokenCookieName = "forticorp-admin-token";
const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

function canUseBrowserApi() {
  return typeof window !== "undefined";
}

export function setAdminToken(token: string) {
  if (!canUseBrowserApi()) {
    return;
  }

  window.localStorage.setItem(adminTokenStorageKey, token);
  document.cookie = `${adminTokenCookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${thirtyDaysInSeconds}; SameSite=Lax`;
}

export function clearAdminToken() {
  if (!canUseBrowserApi()) {
    return;
  }

  window.localStorage.removeItem(adminTokenStorageKey);
  document.cookie = `${adminTokenCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getAdminToken(): string | null {
  if (!canUseBrowserApi()) {
    return null;
  }

  const localToken = window.localStorage.getItem(adminTokenStorageKey);

  if (localToken) {
    return localToken;
  }

  const cookieToken = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${adminTokenCookieName}=`))
    ?.split("=")[1];

  if (!cookieToken) {
    return null;
  }

  const decodedToken = decodeURIComponent(cookieToken);
  window.localStorage.setItem(adminTokenStorageKey, decodedToken);

  return decodedToken;
}

