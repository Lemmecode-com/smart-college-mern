import axios from "axios";
import { broadcastAuthInvalidation } from "../utils/authSync";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error(
    "VITE_API_BASE_URL is not defined. Please set it in your .env file.",
  );
}

const api = axios.create({
  baseURL,
  withCredentials: true, // Enable sending cookies with requests
});

const AUTH_ERROR_CODES = new Set([
  "SESSION_INVALIDATED",
  "TOKEN_INVALIDATED",
  "TOKEN_BLACKLISTED",
  "TOKEN_MISSING",
  "INVALID_TOKEN",
  "UNAUTHORIZED",
]);

// Request interceptor - ensure credentials are always sent
api.interceptors.request.use(
  (config) => {
    // Mark logout requests so the response interceptor can skip broadcasting
    // auth errors for them. This prevents infinite broadcast loops when
    // performSessionInvalidation calls /auth/logout on other tabs.
    if (config.url === "/auth/logout") {
      config._skipAuthBroadcast = true;
    }

    // No need to manually add Authorization header with httpOnly cookies
    // The browser automatically sends cookies with requests
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 🔒 RESPONSE INTERCEPTOR - Standardize API Response Format
// This unwraps the new standardized format so frontend code doesn't break
// Backend sends: { success: true, data: {...}, message: "..." }
// Frontend receives: Depends on the data type
api.interceptors.response.use(
  (response) => {
    // Check if response has standardized format
    if (response.data && response.data.success !== undefined) {
      const { success, data, message, pagination, error } = response.data;

      // Case 1: Response has array data - return array directly for backward compatibility
      if (Array.isArray(data)) {
        response.data = data; // Return: [...]
      }
      // Case 2: Response has nested 'data' object
      else if (data && typeof data === "object") {
        // Check if data object contains a single key with array data
        const keys = Object.keys(data);
        if (keys.length === 1 && Array.isArray(data[keys[0]])) {
          // Extract array from nested object (e.g., { departments: [...] })
          response.data = data[keys[0]];
        } else {
          // Keep the object structure for single object responses
          response.data = {
            ...data,
            success,
            message,
            pagination,
            error,
          };
        }
      }
      // Case 3: No 'data' field - response is already flat
      else {
        response.data = {
          ...response.data,
          message: message || response.data.message,
          pagination: pagination || response.data.pagination,
          error: error || response.data.error,
        };
      }
    }
    return response;
  },
  (error) => {
    // 🔒 STANDARDIZE ERROR FORMAT
    // Backend sends: { success: false, error: { code, message, details } }
    // Transform to: { success: false, message, code, details }
    if (error.response?.data?.error) {
      const { error: errorObj } = error.response.data;
      error.response.data.message = errorObj.message;
      error.response.data.code = errorObj.code;
      error.response.data.details = errorObj.details;
    }

    // Handle 401 errors globally
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;

      if (errorCode && AUTH_ERROR_CODES.has(errorCode) && !error.config?._skipAuthBroadcast) {
        broadcastAuthInvalidation(errorCode);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
