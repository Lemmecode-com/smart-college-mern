// import { createContext, useEffect, useState } from "react";
// import api from "../api/axios";

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Login
//   const login = async (credentials) => {
//     const res = await api.post("/auth/login", credentials);
//     localStorage.setItem("token", res.data.token);

//     const me = await api.get("/auth/me");
//     setUser(me.data);
//   };

//   // Logout
//   const logout = async () => {
//     try {
//       await api.post("/auth/logout");
//     } catch (e) {}
//     localStorage.removeItem("token");
//     setUser(null);
//   };

//   // Restore session
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setLoading(false);
//       return;
//     }

//     api
//       .get("/auth/me")
//       .then((res) => setUser(res.data))
//       .catch(() => {
//         localStorage.removeItem("token");
//         setUser(null);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   return (
//     <AuthContext.Provider value={{ user, login, logout, loading }}>
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

  // LOGIN
  const login = async (credentials) => {
    const res = await api.post("/auth/login", credentials);

    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);

    setUser(res.data.user);
  };

  // LOGOUT
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {}

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  // RESTORE SESSION
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
