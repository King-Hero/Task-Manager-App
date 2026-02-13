"use client";

import { createContext, useEffect, useState } from "react";
import api, { setAuthToken } from "../lib/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      setToken(saved);
      setAuthToken(saved);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const t = res.data.access_token;
    localStorage.setItem("token", t);
    setAuthToken(t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuthToken(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
