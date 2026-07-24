import { createContext, useEffect, useState, useRef, useCallback } from "react";
import api from "../api/axios";
import { logger } from "../utils/logger";
import { listenForAuthInvalidation, broadcastAuthInvalidation } from "../utils/authSync";

const ACCESS_TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000;
const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000;

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);
  userRef.current = user;

  // Guard to prevent concurrent or duplicate session invalidation
  const isInvalidatingRef = useRef(false);

  let performSessionInvalidationCallCount = 0;

  // Timer for proactive token expiry detection
  const tokenExpiryTimerRef = useRef(null);

   const clearTokenExpiryTimer = useCallback(() => {
     if (tokenExpiryTimerRef.current) {
       clearTimeout(tokenExpiryTimerRef.current);
       tokenExpiryTimerRef.current = null;
     }
   }, []);

   const performSessionInvalidation = useCallback(async () => {
     if (isInvalidatingRef.current) {
       console.log(
         `[performSessionInvalidation] BLOCKED by guard | CallCount=${performSessionInvalidationCallCount}`
       );
       return;
     }
     isInvalidatingRef.current = true;
     performSessionInvalidationCallCount++;

     const now = new Date().toISOString();
     console.log(
       `[performSessionInvalidation] Time=${now} | URL=/auth/logout | CallCount=${performSessionInvalidationCallCount} | Guard=${isInvalidatingRef.current}`
     );

     clearTokenExpiryTimer();

     try {
       await api.post("/auth/logout");
     } catch (error) {
       const errorCode = error?.response?.data?.code || error?.response?.status || "UNKNOWN";
       console.log(
         `[performSessionInvalidation] Time=${now} | URL=/auth/logout | ErrorCode=${errorCode} | CallCount=${performSessionInvalidationCallCount}`
       );
       logger.error("Logout error:", error);
     } finally {
       setUser(null);
       sessionStorage.clear();
       window.location.href = "/login?session=expired";
     }
   }, [clearTokenExpiryTimer]);

   const scheduleTokenExpiryCheck = useCallback(() => {
     clearTokenExpiryTimer();
     const expiryTime = ACCESS_TOKEN_EXPIRY_MS - TOKEN_EXPIRY_BUFFER_MS;
     tokenExpiryTimerRef.current = setTimeout(() => {
       if (userRef.current) {
         performSessionInvalidation();
       }
     }, expiryTime);
   }, [clearTokenExpiryTimer, performSessionInvalidation]);

  useEffect(() => {
    const unsubscribe = listenForAuthInvalidation((data) => {
      const now = new Date().toISOString();
      console.log(
        `[listenForAuthInvalidation] Time=${now} | ReceivedBroadcast | Type=${data.type} | Reason=${data.reason} | userRef.current=${!!userRef.current}`
      );
      if (userRef.current) {
        performSessionInvalidation();
      }
    });

    return () => {
      unsubscribe();
      clearTokenExpiryTimer();
    };
  }, [performSessionInvalidation, clearTokenExpiryTimer]);

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
        scheduleTokenExpiryCheck();
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
    clearTokenExpiryTimer();
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

    clearTokenExpiryTimer();

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
        const now = new Date().toISOString();
        const AUTH_ERROR_CODES = new Set([
          "SESSION_INVALIDATED",
          "TOKEN_INVALIDATED",
          "TOKEN_BLACKLISTED",
          "TOKEN_MISSING",
          "INVALID_TOKEN",
          "UNAUTHORIZED",
          "TOKEN_EXPIRED",
        ]);
        if (errorCode && AUTH_ERROR_CODES.has(errorCode)) {
          console.log(
            `[checkAuthStatus] Time=${now} | URL=/auth/me | Status=401 | ErrorCode=${errorCode} | RedirectingToLogin`
          );
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
