"use client";

import {
  clearSession,
  isTokenExpired,
  readToken,
  readTokenPayload,
  readUser,
  saveSession,
} from "@/lib/auth-storage";
import type { AuthUser } from "@/lib/types";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  setAuthSession: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readInitialSession = () => {
  const token = readToken();
  const user = readUser();

  if (!token || !user || isTokenExpired(token)) {
    clearSession();
    return {
      token: null as string | null,
      user: null as AuthUser | null,
    };
  }

  return {
    token,
    user,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState(readInitialSession);

  const setAuthSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    saveSession(nextToken, nextUser);
    setSession({ token: nextToken, user: nextUser });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession({ token: null, user: null });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      token: session.token,
      user: session.user,
      isReady: true,
      isAuthenticated: Boolean(session.token && session.user),
      setAuthSession,
      logout,
    };
  }, [logout, session.token, session.user, setAuthSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

export const useTokenPayload = () => {
  return readTokenPayload();
};
