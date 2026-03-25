function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(value?: string): string {
  if (!value) {
    return "";
  }

  return trimTrailingSlash(value.trim());
}

function normalizeApiBaseUrl(rawApiUrl?: string, rawBackendUrl?: string): string {
  const apiUrl = normalizeUrl(rawApiUrl);
  if (apiUrl) {
    return apiUrl;
  }

  const backendUrl = normalizeUrl(rawBackendUrl);
  if (!backendUrl) {
    return "";
  }

  return `${backendUrl}/api`;
}

export const runtimeConfig = {
  backendUrl: normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL),
  backendApiUrl: normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
  ),
  mainSiteUrl: normalizeUrl(process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL),
  adminUrl: normalizeUrl(process.env.NEXT_PUBLIC_ADMIN_URL),
  websocketUrl: normalizeUrl(process.env.NEXT_PUBLIC_WS_URL),
};

export function withMainSiteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!runtimeConfig.mainSiteUrl) {
    return normalizedPath;
  }

  return `${runtimeConfig.mainSiteUrl}${normalizedPath}`;
}
