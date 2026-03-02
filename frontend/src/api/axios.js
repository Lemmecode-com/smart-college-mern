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

// Response interceptor - handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get 401, the session has expired or is invalid
    // Don't do anything here - let the component handle it
    // The AuthContext will detect 401 and set user to null
    if (error.response?.status === 401) {
      // Optionally: Clear any local storage if you store anything there
      // localStorage.removeItem('someKey');
    }
    return Promise.reject(error);
  }
);

export default api;
