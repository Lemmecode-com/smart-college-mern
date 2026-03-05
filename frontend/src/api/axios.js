import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true  // Enable sending cookies with requests
});

// Request interceptor - ensure credentials are always sent
api.interceptors.request.use(
  (config) => {
    // No need to manually add Authorization header with httpOnly cookies
    // The browser automatically sends cookies with requests
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔒 RESPONSE INTERCEPTOR - Standardize API Response Format
// This unwraps the new standardized format so frontend code doesn't break
// Backend sends: { success: true, data: {...}, message: "..." }
// Frontend receives: { success: true, ...data, message: "..." }
api.interceptors.response.use(
  (response) => {
    // Check if response has standardized format
    if (response.data && response.data.success !== undefined) {
      const { success, data, message, pagination, error } = response.data;
      
      // Only unwrap if 'data' exists and is an object
      // Some endpoints (like login) return data at root level
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Unwrap data for backward compatibility
        // This makes new format look like old format to existing code
        response.data = {
          ...data,        // Spread actual data (student, teachers, etc.)
          success,        // Keep success flag
          message,        // Keep message
          pagination,     // Keep pagination if present
          error           // Keep error if present (shouldn't be on success)
        };
      } else {
        // If no 'data' field or it's an array, just add success/message
        response.data = {
          success,
          message,
          pagination,
          error,
          // Keep original data if it's not an object (e.g., login returns accessToken directly)
          ...(data !== undefined ? { data } : {})
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
      // Optionally: Clear any local storage if you store anything there
      // localStorage.removeItem('someKey');
    }
    
    return Promise.reject(error);
  }
);

export default api;
