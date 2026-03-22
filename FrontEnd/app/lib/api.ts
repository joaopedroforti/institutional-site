const fallbackApiBaseUrl = "http://localhost:8000/api";

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? fallbackApiBaseUrl).replace(/\/$/, "");

export class ApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiOptions = RequestInit & {
  token?: string | null;
  timeoutMs?: number;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("O backend demorou para responder. Verifique se a API Laravel esta ativa.");
    }

    throw new ApiError(
      "Nao foi possivel conectar ao backend. Verifique se a API Laravel esta rodando em " + apiBaseUrl + ".",
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload?.message ??
      payload?.errors?.login?.[0] ??
      payload?.errors?.email?.[0] ??
      "Nao foi possivel concluir a solicitacao.";

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
