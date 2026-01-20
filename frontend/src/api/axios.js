

// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000/api",
// });

// api.interceptors.request.use((req) => {
//   const token = localStorage.getItem("accessToken");
//   if (token) {
//     req.headers.Authorization = `Bearer ${token}`;
//   }
//   return req;
// });

// export default api;

  



import axios from "axios";

/* ================= AXIOS INSTANCE ================= */
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false,
});

/* ================= REQUEST INTERCEPTOR ================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response (network error)
    if (!error.response) {
      return Promise.reject(error);
    }

    // If unauthorized & not retried yet
    if (
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue requests until refresh completes
        return new Promise(function (resolve, reject) {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization =
                "Bearer " + token;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post(
          "http://localhost:5000/api/auth/refresh",
          { refreshToken }
        );

        const newAccessToken = res.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);
        api.defaults.headers.Authorization =
          "Bearer " + newAccessToken;

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization =
          "Bearer " + newAccessToken;

        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
