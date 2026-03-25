/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_MAIN_SITE_URL?: string;
  readonly VITE_ADMIN_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
