// Responsible for: holding auth state, user object, token and loading state
// Defines auth actions: login, logout, refresh token, check session
// Wraps app and “injects” auth data, so every component inside can access it.
// Backend of frontend system.

import { useEffect, useState } from "react";
import { api, setAccessToken } from "../api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

async function login(username, password) {
  const res = await api.post("/login", {
    username, 
    password
  });

  setAccessToken(res.data.access_token);

  const me = await api.get("/me");
  setUser(me.data);

  return me.data;
}

async function refreshUser() {
  const res = await api.get("/me");
  setUser(res.data);
  return res.data;
}

async function logout() {
  try {
    await api.post("/logout");
  } catch (err) {
    if (err?.response?.status !== 401) {
      console.error("Logout error:", err);
    }
  } finally {
    setUser(null);
    setAccessToken(null);
    delete api.defaults.headers.common["Authorization"];
  }
}

// Runs after React has rendered component.
useEffect(() => {
  async function bootstrapAuth() {
    try {
      // 1. try access token
      const res = await api.get("/me");
      setUser(res.data);
    } catch {
      try {
        // 2. fallback: refresh cookie
        const refresh = await api.post("/refresh");

        setAccessToken(refresh.data.access_token);

        const res = await api.get("/me");
        setUser(res.data);
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    } finally {
      setLoading(false);
    }
  }

  bootstrapAuth();
}, []);

  return (
    <AuthContext.Provider value={{
       user, 
       login, 
       logout, 
       loading, 
       isAuthenticated: !!user,
       refreshUser}}>
      {children}
    </AuthContext.Provider>
  );
}