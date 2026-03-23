import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, apiRequest } from "../lib/api";

type UserRole = "admin" | "seller" | string;

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
};

type LoginPayload = {
  login: string;
  password: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type MeResponse = {
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
    is_super_admin?: boolean;
    is_admin?: boolean;
    is_seller?: boolean;
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "forticorp_admin_auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapMeUser(payload: MeResponse["user"]): AuthUser {
  const roles: UserRole[] = [];

  if (payload.is_admin || payload.is_super_admin) {
    roles.push("admin");
  }

  if (payload.is_seller) {
    roles.push("seller");
  }

  if (roles.length === 0) {
    roles.push("seller");
  }

  return {
    id: payload.id,
    name: payload.name,
    username: payload.username,
    email: payload.email,
    role: roles[0],
    roles,
  };
}

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { token: null, user: null };
    }

    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    return {
      token: parsed.token ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function persistAuth(token: string | null, user: AuthUser | null): void {
  if (!token || !user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    persistAuth(null, null);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const stored = readStoredAuth();

      if (!stored.token) {
        setLoading(false);
        return;
      }

      setToken(stored.token);
      if (stored.user) {
        setUser(stored.user);
      }

      try {
        const response = await apiRequest<MeResponse>("/api/auth/me", {}, stored.token);
        const mappedUser = mapMeUser(response.user);
        setUser(mappedUser);
        persistAuth(stored.token, mappedUser);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuth();
        }
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [clearAuth]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setToken(response.token);
    setUser(response.user);
    persistAuth(response.token, response.user);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiRequest<{ message: string }>(
          "/api/auth/logout",
          {
            method: "POST",
          },
          token,
        );
      } catch {
        // logout local mesmo se o token ja tiver expirado
      }
    }

    clearAuth();
  }, [clearAuth, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
