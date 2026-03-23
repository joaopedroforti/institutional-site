export const superadminTokenStorageKey = "forticorp-superadmin-token";
const superadminTokenCookieName = "forticorp-superadmin-token";
const tokenLifetimeSeconds = 60 * 60 * 24 * 30;

export function setSuperadminToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(superadminTokenStorageKey, token);
  document.cookie = `${superadminTokenCookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${tokenLifetimeSeconds}; SameSite=Lax`;
}

export function clearSuperadminToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(superadminTokenStorageKey);
  document.cookie = `${superadminTokenCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getSuperadminToken() {
  if (typeof window === "undefined") return null;

  const localToken = window.localStorage.getItem(superadminTokenStorageKey);
  if (localToken) return localToken;

  const cookieToken = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${superadminTokenCookieName}=`))
    ?.split("=")[1];

  if (!cookieToken) return null;

  const decoded = decodeURIComponent(cookieToken);
  window.localStorage.setItem(superadminTokenStorageKey, decoded);
  return decoded;
}
