import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { AUTH_EXPIRED_EVENT, ApiRequestError, apiRequest } from "../../services/http.service";
import { AuthUser } from "../../types";

const TOKEN_KEY = "spa_auth_token";
const USER_KEY = "spa_auth_user";
const TOKEN_EXPIRY_SKEW_MS = 30_000;

interface AuthContextValue {
  token: string;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<{ message: string; resetUrl?: string; resetToken?: string }>;
  resetPassword: (email: string, token: string, password: string) => Promise<string>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthPayload {
  token: string;
  user: AuthUser;
}

interface AuthSession {
  token: string;
  user: AuthUser | null;
}

interface JwtPayload {
  exp?: number;
}

function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("[auth] clear stored session failed", error);
  }
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded)) as JwtPayload;
  } catch (error) {
    console.error("[auth] decode token failed", error);
    return null;
  }
}

function isTokenExpired(token: string) {
  const expiresAtSeconds = decodeJwtPayload(token)?.exp;
  if (typeof expiresAtSeconds !== "number") return true;
  return expiresAtSeconds * 1000 <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
}

function readStoredSession(): AuthSession {
  try {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    if (!savedToken || isTokenExpired(savedToken)) {
      clearStoredSession();
      return { token: "", user: null };
    }

    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) {
      clearStoredSession();
      return { token: "", user: null };
    }

    return { token: savedToken, user: JSON.parse(rawUser) as AuthUser };
  } catch (error) {
    console.error("[auth] read stored session failed", error);
    clearStoredSession();
    return { token: "", user: null };
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(() => readStoredSession());
  const [loading, setLoading] = useState(() => Boolean(session.token));
  const { token, user } = session;

  const persist = useCallback((nextToken: string, nextUser: AuthUser | null) => {
    setSession({ token: nextToken, user: nextUser });

    try {
      if (nextToken) {
        localStorage.setItem(TOKEN_KEY, nextToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }

      if (nextUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (error) {
      console.error("[auth] persist failed", error);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const data = await apiRequest<AuthPayload>("/auth/login", {
          method: "POST",
          body: { email, password }
        });
        persist(data.token, data.user);
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>("/auth/register", {
        method: "POST",
        body: { name, email, password }
      });
      return data.message;
    } finally {
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string; resetUrl?: string; resetToken?: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email }
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string, tokenValue: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: { email, token: tokenValue, password }
      });
      return data.message;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    persist("", null);
  }, [persist]);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      persist("", null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<{ user: AuthUser }>("/auth/me", {
        token
      });
      persist(token, data.user);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const shouldClearSession =
        (error instanceof ApiRequestError && error.status === 401) ||
        message.includes("phiên đăng nhập") ||
        message.includes("tài khoản không tồn tại");

      if (shouldClearSession) {
        persist("", null);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    refreshMe().catch(() => undefined);
  }, [refreshMe, token]);

  useEffect(() => {
    const handleAuthExpired = () => {
      persist("", null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [persist]);

  useEffect(() => {
    if (!token) return;

    const clearIfExpired = () => {
      if (isTokenExpired(token)) {
        persist("", null);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearIfExpired();
      }
    };

    clearIfExpired();
    window.addEventListener("focus", clearIfExpired);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(clearIfExpired, 60_000);

    return () => {
      window.removeEventListener("focus", clearIfExpired);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [persist, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      forgotPassword,
      resetPassword,
      logout,
      refreshMe
    }),
    [token, user, loading, login, register, forgotPassword, resetPassword, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
