import { createContext, useEffect, useState, useRef, useCallback } from "react";
import api from "../api/axios";
import { logger } from "../utils/logger";
import { listenForAuthInvalidation, broadcastAuthInvalidation } from "../utils/authSync";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);
  userRef.current = user;

  // Guard to prevent concurrent or duplicate session invalidation
  const isInvalidatingRef = useRef(false);

  const performSessionInvalidation = useCallback(async () => {
    if (isInvalidatingRef.current) return;
    isInvalidatingRef.current = true;

    try {
      await api.post("/auth/logout");
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      setUser(null);
      sessionStorage.clear();
      window.location.href = "/login?session=expired";
    }
  }, []);

  useEffect(() => {
    const unsubscribe = listenForAuthInvalidation(() => {
      if (userRef.current) {
        performSessionInvalidation();
      }
    });

    return unsubscribe;
  }, [performSessionInvalidation]);

  /* ========== LOGIN ========== */
  const login = async (credentials) => {
      try {
        // Note: With httpOnly cookies, the token will be stored in the cookie automatically
        const res = await api.post("/auth/login", credentials);

// Get user info from the response (interceptor unwraps it)
        const userInfo = res.data.user || {
          id: res.data.id,
          realId: res.data.realId,
          role: res.data.role,
          college_id: res.data.college_id,
        };

// Fetch complete user data immediately after login
        try {
          const profileRes = await api.get("/auth/me");
          // Store complete user data from backend
          setUser({
            id: profileRes.data.id,
            realId: profileRes.data.realId,
            role: profileRes.data.role,
            college_id: profileRes.data.college_id || null,
            email: profileRes.data.email || null,
            name: profileRes.data.name || null,
          });
        } catch (profileError) {
          // Fallback to basic info if profile fetch fails
          logger.warn("Profile fetch after login failed, using basic info");
          setUser({
            id: userInfo.id,
            realId: userInfo.realId,
            role: userInfo.role,
            college_id: userInfo.college_id || null,
            email: null,
            name: null,
          });
        }

        // Return success and user data for first-login handling
        return { 
          success: true, 
          user: userInfo 
        };
      } catch (error) {
    const errorData = error?.response?.data || {};
    const userId = errorData?.user?.id;
    const realId = errorData?.user?.realId;
    const user = userId ? { id: userId, realId } : undefined;

    return {
      success: false,
      message:
        errorData.message ||
        errorData.error?.message ||
        "Login failed",
      code:
        errorData.code ||
        errorData.error?.code ||
        null,
      user,
      lockedUntil: errorData.error?.data?.lockedUntil,
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

  const logoutDueToSessionInvalidation = async () => {
    if (isInvalidatingRef.current) return;
    isInvalidatingRef.current = true;

    try {
      await api.post("/auth/logout");
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      setUser(null);
      sessionStorage.clear();
      broadcastAuthInvalidation("SESSION_INVALIDATED");
      window.location.href = "/login?session=expired";
    }
  };

  /* ========== RESTORE SESSION ========== */
  useEffect(() => {
    // Skip auth check on public routes to avoid unnecessary API calls and redirect loops
    if (typeof window !== "undefined") {
      const publicRoutes = ["/login", "/forgot-password", "/verify-otp", "/register"];
      const isPublicRoute = publicRoutes.some((route) =>
        window.location.pathname === route || window.location.pathname.startsWith("/register/")
      );
      if (isPublicRoute) {
        setLoading(false);
        return;
      }
    }

    const checkAuthStatus = async () => {
      try {
        const res = await api.get("/auth/me");

// Store complete user data from backend
         setUser({
           id: res.data.id,
           realId: res.data.realId,
           role: res.data.role,
           college_id: res.data.college_id || null,
           email: res.data.email || null,
           name: res.data.name || null,
         });
      } catch (error) {
        // 401 is expected for unauthenticated users - don't log it as error
        // Only log if it's a different error (network issue, server error, etc.)
        if (error.response?.status !== 401) {
          logger.error(
            "Auth check error:",
            error.response?.status || error.message,
          );
        }
        // User is not authenticated - this is normal, not an error
        setUser(null);

        const errorCode = error.response?.data?.code;
        if (errorCode === "SESSION_INVALIDATED") {
          // Only redirect if we are not already on the login page with session=expired.
          // Setting window.location.href to the same URL still triggers a browser reload,
          // which would cause an infinite loop because checkAuthStatus() would run again.
          if (typeof window !== "undefined") {
            const alreadyOnLoginExpired =
              window.location.pathname === "/login" &&
              window.location.search.includes("session=expired");
            if (!alreadyOnLoginExpired) {
              window.location.href = "/login?session=expired";
            }
          }
        }
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
        logoutDueToSessionInvalidation,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
