function normalizeUrl(value?: string): string {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

function collapseDuplicatedApiSuffix(url: string): string {
  return url.replace(/(?:\/api){2,}$/i, "/api");
}

function normalizeApiBaseUrl(rawApiUrl?: string, rawBackendUrl?: string): string {
  const explicitApiUrl = normalizeUrl(rawApiUrl);
  if (explicitApiUrl) {
    return collapseDuplicatedApiSuffix(explicitApiUrl);
  }

  const backendUrl = normalizeUrl(rawBackendUrl);
  if (!backendUrl) {
    return "";
  }

  const withApi = backendUrl.endsWith("/api") ? backendUrl : `${backendUrl}/api`;
  return collapseDuplicatedApiSuffix(withApi);
}

const backendUrl = normalizeUrl(import.meta.env.VITE_BACKEND_URL);

export const runtimeConfig = {
  backendUrl,
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_URL, import.meta.env.VITE_BACKEND_URL),
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
