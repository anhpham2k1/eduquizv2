import type { User } from "../types";

export const AUTH_TOKEN_STORAGE_KEY = "eduquiz_token";
export const AUTH_USER_STORAGE_KEY = "eduquiz_user";

export interface AuthSession {
  user: User;
  token: string;
}

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  headers?: HeadersInit;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isSerializableJsonBody(value: unknown) {
  return (
    value !== undefined &&
    value !== null &&
    !isFormData(value) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof Blob) &&
    typeof value !== "string"
  );
}

export function persistAuthSession(session: AuthSession) {
  if (!isBrowser()) return;

  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
}

export function clearStoredAuthSession() {
  if (!isBrowser()) return;

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function readStoredAuthSession(): { user: User | null; token: string | null } {
  if (!isBrowser()) {
    return { user: null, token: null };
  }

  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const userValue = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!token || !userValue) {
    return { user: null, token: null };
  }

  try {
    return {
      token,
      user: JSON.parse(userValue) as User,
    };
  } catch {
    clearStoredAuthSession();
    return { user: null, token: null };
  }
}

function getStoredToken() {
  return readStoredAuthSession().token;
}

async function apiRequest(url: string, options: ApiRequestOptions = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  const rawBody = options.body;
  let requestBody: BodyInit | undefined;

  if (isSerializableJsonBody(rawBody)) {
    requestBody = JSON.stringify(rawBody);
    headers["Content-Type"] = "application/json";
  } else if (!isFormData(rawBody) && rawBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
    requestBody = rawBody as BodyInit;
  } else if (rawBody) {
    requestBody = rawBody as BodyInit;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error((data && data.error) || `HTTP ${response.status}`);
  }

  return response;
}

export async function apiJson<T>(url: string, options: ApiRequestOptions = {}) {
  const response = await apiRequest(url, options);
  return (await response.json()) as T;
}

export async function apiNoContent(url: string, options: ApiRequestOptions = {}) {
  await apiRequest(url, options);
}
