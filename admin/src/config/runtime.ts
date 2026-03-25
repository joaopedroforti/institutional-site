function normalizeUrl(value?: string): string {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

const backendUrl = normalizeUrl(import.meta.env.VITE_BACKEND_URL);
const explicitApiUrl = normalizeUrl(import.meta.env.VITE_API_URL);

export const runtimeConfig = {
  backendUrl,
  apiBaseUrl: explicitApiUrl || (backendUrl ? `${backendUrl}/api` : ""),
  mainSiteUrl: normalizeUrl(import.meta.env.VITE_MAIN_SITE_URL),
  adminUrl: normalizeUrl(import.meta.env.VITE_ADMIN_URL),
  websocketUrl: normalizeUrl(import.meta.env.VITE_WS_URL),
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000),
};

export function withMainSiteUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!runtimeConfig.mainSiteUrl) {
    return path;
  }

  return `${runtimeConfig.mainSiteUrl}${path}`;
}
