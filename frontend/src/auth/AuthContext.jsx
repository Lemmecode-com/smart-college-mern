

// import { createContext, useEffect, useState } from "react";
// import api from "../api/axios";

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   /* ================= LOGIN ================= */
//   const login = async (credentials) => {
//     const res = await api.post("/auth/login", credentials);

//     const { accessToken, refreshToken, user } = res.data;

//     // 🔥 STORE TOKENS CORRECTLY
//     localStorage.setItem("accessToken", accessToken);
//     localStorage.setItem("refreshToken", refreshToken);

//     setUser(user);
//   };

//   /* ================= LOGOUT ================= */
//   const logout = async () => {
//     try {
//       await api.post("/auth/logout");
//     } catch (e) {}

//     localStorage.removeItem("accessToken");
//     localStorage.removeItem("refreshToken");
//     setUser(null);
//   };

//   /* ================= RESTORE SESSION ================= */
//   useEffect(() => {
//     const token = localStorage.getItem("accessToken");

//     if (!token) {
//       setLoading(false);
//       return;
//     }

//     api
//       .get("/auth/me")
//       .then((res) => setUser(res.data))
//       .catch(() => {
//         localStorage.removeItem("accessToken");
//         localStorage.removeItem("refreshToken");
//         setUser(null);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         login,
//         logout,
//         loading,
//         isAuthenticated: !!user
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };



import { createContext, useEffect, useState } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOGIN ================= */
  const login = async (credentials) => {
    const res = await api.post("/auth/login", credentials);

    const { accessToken, refreshToken, user } = res.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    setUser(user);
  };

  /* ================= LOGOUT ================= */
  const logout = async () => {
    try {
      await api.post("/auth/logout", null, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
    } catch (e) {
      // ignore error
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  /* ================= RESTORE SESSION ================= */
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        // 🔁 TRY REFRESH TOKEN
        if (refreshToken) {
          try {
            const refreshRes = await api.post("/auth/refresh", {
              refreshToken,
            });

            localStorage.setItem(
              "accessToken",
              refreshRes.data.accessToken
            );

            const meRes = await api.get("/auth/me");
            setUser(meRes.data);
          } catch {
            localStorage.clear();
            setUser(null);
          }
        } else {
          localStorage.clear();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
