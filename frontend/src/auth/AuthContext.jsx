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
      // Note: With httpOnly cookies, the token will be stored in the cookie automatically
      const res = await api.post("/auth/login", credentials);

      // With httpOnly cookies, we don't receive the token in the response
      // The token is automatically sent with subsequent requests
      
      // Get user info from the response or make a separate call to get user details
      const userInfo = res.data.user || { id: res.data.userId, role: res.data.role, college_id: res.data.college_id };

      // Store user info (not the token) in state
      setUser({
        id: userInfo.id,
        role: userInfo.role,
        college_id: userInfo.college_id || null
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || "Login failed"
      };
    }
  };

  /* ========== LOGOUT ========== */
  const logout = async () => {
    try {
      // Call logout endpoint to clear the httpOnly cookie
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
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
        setUser({
          id: res.data.id,
          role: res.data.role,
          college_id: res.data.college_id || null
        });
      } catch {
        // If the request fails, the user is not authenticated
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
