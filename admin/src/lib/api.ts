const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000);

export type ApiErrorPayload = {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.status = payload.status;
    this.errors = payload.errors;
  }
}

type JsonLike = Record<string, unknown> | Array<unknown> | null;

async function parseJson(response: Response): Promise<JsonLike> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as JsonLike;
}

function getErrorMessage(data: JsonLike, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const value = data.message;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  headers.set("Accept", "application/json");

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);
    const aborted = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError({
      message: aborted
        ? `Tempo limite excedido (${Math.round(API_TIMEOUT_MS / 1000)}s). Verifique backend e CORS.`
        : "Falha de conexao com o backend.",
      status: 0,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = await parseJson(response);

  if (!response.ok) {
    const errors =
      data && typeof data === "object" && "errors" in data && typeof data.errors === "object"
        ? (data.errors as Record<string, string[]>)
        : undefined;

    throw new ApiError({
      message: getErrorMessage(data, "Falha ao processar a requisicao."),
      status: response.status,
      errors,
    });
  }

  return data as T;
}

export { API_BASE_URL };
