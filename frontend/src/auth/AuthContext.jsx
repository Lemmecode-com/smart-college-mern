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
  const [sessionInvalidReason, setSessionInvalidReason] = useState(null);
  const [authError, setAuthError] = useState(null);
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

   const performSessionInvalidation = useCallback(async (reason = "TOKEN_EXPIRED", currentPathname = null) => {
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
         `[performSessionInvalidation] Time=${now} | URL=/auth/logout | CallCount=${performSessionInvalidationCallCount} | Guard=${isInvalidatingRef.current} | Reason=${reason}`
       );

       clearTokenExpiryTimer();
       setSessionInvalidReason(reason);

       try {
         await api.post("/auth/logout");
       } catch (error) {
         const errorCode = error?.response?.data?.code || error?.response?.status || "UNKNOWN";
         console.log(
           `[performSessionInvalidation] Time=${now} | URL=/auth/logout | ErrorCode=${errorCode} | CallCount=${performSessionInvalidationCallCount} | Reason=${reason}`
         );
         logger.error("Logout error:", error);
       } finally {
         setUser(null);
         sessionStorage.clear();
         const publicRoutes = ["/", "/login", "/forgot-password", "/verify-otp", "/register"];
         const onPublicRoute = currentPathname && publicRoutes.some(route =>
           currentPathname === route || currentPathname.startsWith("/register/")
         );
         if (!onPublicRoute) {
           window.location.href = `/login?session=expired&reason=${encodeURIComponent(reason)}`;
         }
       }
     }, [clearTokenExpiryTimer]);

   const scheduleTokenExpiryCheck = useCallback(() => {
     clearTokenExpiryTimer();
     const expiryTime = ACCESS_TOKEN_EXPIRY_MS - TOKEN_EXPIRY_BUFFER_MS;
     tokenExpiryTimerRef.current = setTimeout(() => {
       if (userRef.current) {
         performSessionInvalidation("TOKEN_EXPIRED");
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
          const currentPath = window.location.pathname;
          performSessionInvalidation(data.reason || "SESSION_INVALIDATED", currentPath);
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
        setSessionInvalidReason(null);
        setAuthError(null);
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
    setAuthError(null);
    try {
      await api.post("/auth/logout");
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  const logoutDueToSessionInvalidation = async () => {
    if (isInvalidatingRef.current) return;
    isInvalidatingRef.current = true;

    clearTokenExpiryTimer();
    setSessionInvalidReason("SESSION_INVALIDATED");
    setAuthError(null);

    try {
      await api.post("/auth/logout");
    } catch (error) {
      logger.error("Logout error:", error);
    } finally {
      setUser(null);
      sessionStorage.clear();
      broadcastAuthInvalidation("SESSION_INVALIDATED");
      const publicRoutes = ["/", "/login", "/forgot-password", "/verify-otp", "/register"];
      const currentPath = window.location.pathname;
      const onPublicRoute = publicRoutes.some(route =>
        currentPath === route || currentPath.startsWith("/register/")
      );
      if (!onPublicRoute) {
        window.location.href = "/login?session=expired&reason=SESSION_INVALIDATED";
      }
    }
   };

    const checkAuthStatus = useCallback(async () => {
      const currentPath = window.location.pathname;
      try {
        const res = await api.get("/auth/me");
        setUser({
          id: res.data.id,
          realId: res.data.realId,
          role: res.data.role,
          college_id: res.data.college_id || null,
          email: res.data.email || null,
          name: res.data.name || null,
        });
        setAuthError(null);
        scheduleTokenExpiryCheck();
      } catch (error) {
        const isNetworkError = !error.response || error.code === "ERR_NETWORK";
        if (isNetworkError) {
          logger.error(
            "Auth check network error:",
            error.message || "No response received",
          );
          setUser(null);
          setAuthError({
            code: "NETWORK_ERROR",
            message: "Unable to connect to the server. Check your internet connection.",
          });
          return;
        }

        if (error.response?.status !== 401) {
          logger.error(
            "Auth check error:",
            error.response?.status || error.message,
          );
        }
        setUser(null);
        setAuthError(null);

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
          if (typeof window !== "undefined") {
            const alreadyOnLoginExpired =
              currentPath === "/login" &&
              window.location.search.includes("session=expired");
            if (!alreadyOnLoginExpired) {
              performSessionInvalidation(errorCode, currentPath);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    }, [performSessionInvalidation, scheduleTokenExpiryCheck]);

    const retryAuthCheck = useCallback(() => {
      setAuthError(null);
      checkAuthStatus();
    }, [checkAuthStatus]);

    /* ========== RESTORE SESSION ========== */
    useEffect(() => {
      if (typeof window !== "undefined") {
        const publicRoutes = ["/", "/login", "/forgot-password", "/verify-otp", "/register"];
        const isPublicRoute = publicRoutes.some((route) =>
          window.location.pathname === route || window.location.pathname.startsWith("/register/")
        );

         if (isPublicRoute) {
           setLoading(false);
           return;
         }
      }

      checkAuthStatus();
    }, [checkAuthStatus]);

   const clearSessionInvalidReason = useCallback(() => {
    setSessionInvalidReason(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionInvalidReason,
        authError,
        clearSessionInvalidReason,
        retryAuthCheck,
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
