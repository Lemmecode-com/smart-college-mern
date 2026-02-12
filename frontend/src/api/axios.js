import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true  // Enable sending cookies with requests
});

// Remove the interceptor that adds Bearer token since we're using httpOnly cookies
// The authentication header will be handled automatically by the browser with httpOnly cookies

export default api;
