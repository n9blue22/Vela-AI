import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { apiRequest } from "../../services/http.service";
import { AuthUser } from "../../types";

const TOKEN_KEY = "spa_auth_token";
const USER_KEY = "spa_auth_user";

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

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch (error) {
      console.error("[auth] parse user failed", error);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((nextToken: string, nextUser: AuthUser | null) => {
    try {
      setToken(nextToken);
      setUser(nextUser);
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
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ user: AuthUser }>("/auth/me", {
        token
      });
      persist(token, data.user);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const shouldClearSession =
        message.includes("phiên đăng nhập") || message.includes("tài khoản không tồn tại") || message.includes("401");
      if (shouldClearSession) {
        persist("", null);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  useEffect(() => {
    if (!token) return;
    refreshMe().catch(() => undefined);
  }, [refreshMe, token]);

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
