type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const COOKIE_SESSION_SENTINEL = "__cookie_session__";

type RequestConfig<TBody> = {
  path: string;
  method?: HttpMethod;
  body?: TBody;
  headers?: HeadersInit;
  accessToken?: string | null;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  data?: unknown;
  constructor(message: string, status?: number, data?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

export async function apiRequest<TResponse, TBody = unknown>({
  path,
  method = "GET",
  body,
  headers = {},
  accessToken,
}: RequestConfig<TBody>): Promise<TResponse> {
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      requestHeaders[key] = value;
    });
  } else {
    Object.assign(requestHeaders, headers);
  }

  if (accessToken && accessToken !== COOKIE_SESSION_SENTINEL) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(path, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  const serverMessage =
    (data as { message?: string; success?: boolean; code?: string } | null)?.message;
  const serverCode =
    (data as { message?: string; success?: boolean; code?: string } | null)?.code;
  const successFlag =
    (data as { success?: boolean } | null)?.success === undefined ||
    (data as { success?: boolean } | null)?.success === true;

  if (!response.ok || !successFlag) {
    const message =
      serverMessage || response.statusText || "Erreur de communication avec le serveur";
    throw new ApiError(message, response.status, data, serverCode);
  }

  return data as TResponse;
}
