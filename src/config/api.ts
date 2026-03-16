const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function buildApiUrlObject(path: string) {
  return new URL(
    buildApiUrl(path),
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin
  );
}

export const AUTH_ENDPOINTS = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
} as const;

export type AuthEndpointKey = keyof typeof AUTH_ENDPOINTS;
