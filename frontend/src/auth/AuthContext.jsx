import { createContext, useEffect, useState } from "react";
import api from "../api/axios";
import { logger } from "../utils/logger";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ========== LOGIN ========== */
  const login = async (credentials) => {
    try {
      // Note: With httpOnly cookies, the token will be stored in the cookie automatically
      const res = await api.post("/auth/login", credentials);

      // Get user info from the response (interceptor unwraps it)
      const userInfo = res.data.user || {
        id: res.data.id,
        role: res.data.role,
        college_id: res.data.college_id
      };

      // Fetch complete user data immediately after login
      try {
        const profileRes = await api.get("/auth/me");
        // Store complete user data from backend
        setUser({
          id: profileRes.data.id,
          role: profileRes.data.role,
          college_id: profileRes.data.college_id || null,
          email: profileRes.data.email || null,
          name: profileRes.data.name || null
        });
      } catch (profileError) {
        // Fallback to basic info if profile fetch fails
        logger.warn("Profile fetch after login failed, using basic info");
        setUser({
          id: userInfo.id,
          role: userInfo.role,
          college_id: userInfo.college_id || null,
          email: null,
          name: null
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || error?.response?.data?.error?.message || "Login failed"
      };
    }
  };

  /* ========== LOGOUT ========== */
  const logout = async () => {
    try {
      // Call logout endpoint to clear the httpOnly cookie on backend
      await api.post("/auth/logout");
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      // Clear user info from state
      setUser(null);
    }
  };

  /* ========== RESTORE SESSION ========== */
  useEffect(() => {
    // With httpOnly cookies, we need to make an API call to verify if the user is authenticated
    const checkAuthStatus = async () => {
      try {
        const res = await api.get("/auth/me");
        
        // Store complete user data from backend
        setUser({
          id: res.data.id,
          role: res.data.role,
          college_id: res.data.college_id || null,
          email: res.data.email || null,
          name: res.data.name || null
        });
      } catch (error) {
        // 401 is expected for unauthenticated users - don't log it as error
        // Only log if it's a different error (network issue, server error, etc.)
        if (error.response?.status !== 401) {
          logger.error("Auth check error:", error.response?.status || error.message);
        }
        // User is not authenticated - this is normal, not an error
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
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