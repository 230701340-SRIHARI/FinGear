import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("fingear_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fingear_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem("fingear_token"));
  const [authError, setAuthError] = useState("");

  async function persistAuth(response) {
    localStorage.setItem("fingear_token", response.access_token);
    localStorage.setItem("fingear_user", JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
    setAuthReady(true);
  }

  async function login(payload) {
    setAuthError("");
    try {
      const cleanPayload = {
        email: (payload.email || "").trim().toLowerCase(),
        password: (payload.password || "").trim(),
      };
      await persistAuth(await api.auth.login(cleanPayload));
      return true;
    } catch (err) {
      let detail = "";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.detail) detail = parsed.detail;
      } catch (_) {
        if (err.message && !err.message.includes("{")) detail = err.message;
      }
      setAuthError(detail || "Invalid email or password. Please check your credentials or create a new account.");
      return false;
    }
  }

  async function register(payload) {
    setAuthError("");
    try {
      const cleanPayload = {
        name: (payload.name || "").trim(),
        email: (payload.email || "").trim().toLowerCase(),
        password: (payload.password || "").trim(),
      };
      await persistAuth(await api.auth.register(cleanPayload));
      return true;
    } catch (err) {
      let detail = "";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.detail) detail = parsed.detail;
      } catch (_) {
        if (err.message && !err.message.includes("{")) detail = err.message;
      }
      setAuthError(detail || "Could not register this account. Try another email.");
      return false;
    }
  }

  async function completeExternalLogin(accessToken) {
    setAuthError("");
    setAuthReady(false);
    localStorage.setItem("fingear_token", accessToken);
    setToken(accessToken);
    try {
      const currentUser = await api.auth.me(accessToken);
      localStorage.setItem("fingear_user", JSON.stringify(currentUser));
      setUser(currentUser);
      setAuthReady(true);
      return true;
    } catch {
      if (localStorage.getItem("fingear_token") === accessToken) logout();
      setAuthError("Google login could not be completed.");
      setAuthReady(true);
      return false;
    }
  }

  function logout() {
    localStorage.removeItem("fingear_token");
    localStorage.removeItem("fingear_user");
    setToken(null);
    setUser(null);
    setAuthReady(true);
  }

  useEffect(() => {
    if (!token) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    const checkedToken = token;
    setAuthReady(false);
    api.auth.me(checkedToken)
      .then((currentUser) => {
        if (cancelled) return;
        if (localStorage.getItem("fingear_token") !== checkedToken) return;
        localStorage.setItem("fingear_user", JSON.stringify(currentUser));
        setUser(currentUser);
        setAuthReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (localStorage.getItem("fingear_token") === checkedToken) logout();
        setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({ token, user, authReady, isAuthenticated: Boolean(token && user), authError, login, register, completeExternalLogin, logout }),
    [token, user, authReady, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
