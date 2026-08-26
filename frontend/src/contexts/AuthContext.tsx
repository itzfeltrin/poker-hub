import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setOnUnauthorized } from "@/api/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthValue = {
  status: AuthStatus;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");

  const markUnauthenticated = useCallback(() => {
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setOnUnauthorized(markUnauthenticated);
    return () => setOnUnauthorized(undefined);
  }, [markUnauthenticated]);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me", { skipUnauthorizedHandler: true })
      .then(() => {
        if (!cancelled) setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (password: string) => {
    await api.post("/auth/login", { password }, { skipUnauthorizedHandler: true });
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout", {}).catch(() => undefined);
    markUnauthenticated();
  }, [markUnauthenticated]);

  const value = useMemo(
    () => ({ status, login, logout }),
    [status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
