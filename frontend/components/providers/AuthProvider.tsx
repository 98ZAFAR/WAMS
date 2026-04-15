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
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  setAuthSession: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const subscribeHydration = () => {
  return () => undefined;
};

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
  const [sessionOverride, setSessionOverride] = useState<{
    token: string | null;
    user: AuthUser | null;
  } | null>(null);

  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  const persistedSession = useMemo(() => {
    if (!isHydrated) {
      return {
        token: null as string | null,
        user: null as AuthUser | null,
      };
    }

    return readInitialSession();
  }, [isHydrated]);

  const activeSession = sessionOverride ?? persistedSession;

  const setAuthSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    saveSession(nextToken, nextUser);
    setSessionOverride({ token: nextToken, user: nextUser });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionOverride({ token: null, user: null });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      token: activeSession.token,
      user: activeSession.user,
      isReady: isHydrated,
      isAuthenticated: Boolean(activeSession.token && activeSession.user),
      setAuthSession,
      logout,
    };
  }, [activeSession.token, activeSession.user, isHydrated, logout, setAuthSession]);

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
