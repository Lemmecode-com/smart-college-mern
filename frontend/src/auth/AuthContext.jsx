import { createContext, useEffect, useState } from "react";
import api from "../api/axios";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOGIN ================= */
  const login = async (credentials) => {
    try {
      const res = await api.post("/auth/login", credentials);

      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      setUser(user);
      return { success: true };
    } catch (error) {
      const message =
        error?.response?.data?.message || "Login failed";
      return { success: false, message };
    }
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    // Backend logout is optional for UX
    api.post("/auth/logout").catch(() => {});

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  /* ================= RESTORE SESSION ================= */
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const token = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Try current token
        const res = await api.get("/auth/me");
        if (isMounted) setUser(res.data);
      } catch {
        // Try refresh token
        if (!refreshToken) {
          localStorage.clear();
          if (isMounted) setUser(null);
        } else {
          try {
            const refreshRes = await api.post("/auth/refresh", {
              refreshToken,
            });

            localStorage.setItem(
              "accessToken",
              refreshRes.data.accessToken
            );

            const meRes = await api.get("/auth/me");
            if (isMounted) setUser(meRes.data);
          } catch {
            localStorage.clear();
            if (isMounted) setUser(null);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
