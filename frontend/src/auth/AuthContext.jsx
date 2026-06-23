import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!tokenStore.getAccessToken() && !tokenStore.getRefreshToken()) {
        setIsAuthChecking(false);
        return;
      }

      try {
        const response = await api.me();
        setUser(response.user);
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.login(email, password);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const response = await api.register(name, email, password);
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthChecking, login, register, logout }),
    [user, isAuthChecking, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
