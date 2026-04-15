import type { AuthUser, Role } from "@/lib/types";

const TOKEN_KEY = "wams_token";
const USER_KEY = "wams_user";
const LAST_INVOICE_KEY = "wams_last_invoice";

type JwtPayload = {
  userId?: string;
  role?: Role;
  exp?: number;
};

const isBrowser = () => typeof window !== "undefined";

const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const readToken = () => {
  if (!isBrowser()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
};

export const readUser = () => {
  if (!isBrowser()) {
    return null;
  }

  return parseJson<AuthUser>(localStorage.getItem(USER_KEY));
};

export const saveSession = (token: string, user: AuthUser) => {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const readTokenPayload = () => {
  const token = readToken();

  if (!token) {
    return null;
  }

  return decodeJwt(token);
};

export const isTokenExpired = (token: string) => {
  const payload = decodeJwt(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
};

export const readLastInvoice = () => {
  if (!isBrowser()) {
    return null;
  }

  return parseJson<Record<string, string>>(localStorage.getItem(LAST_INVOICE_KEY));
};

export const saveLastInvoice = (data: Record<string, string>) => {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(LAST_INVOICE_KEY, JSON.stringify(data));
};
