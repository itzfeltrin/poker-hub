const API_BASE =
  typeof import.meta.env.VITE_API_URL === "string" && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api"; // dev: Vite proxy rewrites /api -> backend (no prefix on backend)

type RequestOptions = RequestInit & {
  skipUnauthorizedHandler?: boolean;
};

let onUnauthorized: (() => void) | undefined;

export function setOnUnauthorized(handler: (() => void) | undefined) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipUnauthorizedHandler, ...fetchOptions } = options;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const isFormData = fetchOptions.body instanceof FormData;
  const res = await fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...fetchOptions.headers,
    },
  });
  if (res.status === 401) {
    if (!skipUnauthorizedHandler) onUnauthorized?.();
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
