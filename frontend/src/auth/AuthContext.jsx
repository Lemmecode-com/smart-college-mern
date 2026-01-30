import { createContext, useEffect, useState } from "react";
import api from "../api/axios";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ========== LOGIN ========== */
  const login = async (credentials) => {
    try {
      const res = await api.post("/auth/login", credentials);

      // backend returns: { token, role }
      const { token, role } = res.data;

      localStorage.setItem("accessToken", token);
      setUser({ role });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || "Login failed"
      };
    }
  };

  /* ========== LOGOUT ========== */
  const logout = () => {
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  /* ========== RESTORE SESSION ========== */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ role: decoded.role });
      } catch {
        localStorage.removeItem("accessToken");
        setUser(null);
      }
    }

    setLoading(false);
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
