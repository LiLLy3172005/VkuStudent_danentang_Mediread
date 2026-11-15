import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { Profile } from '../types';

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  login: (payload: { user_id?: string; phone?: string }) => Promise<void>;
  register: (payload: { full_name: string; phone?: string; birth_year?: number; sex?: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const savedToken = await api.initToken();
      if (savedToken) {
        setToken(savedToken);
        const me = await api.getMe();
        setUser(me);
      } else {
        // Auto sign-in to primary demo account for immediate evaluation
        const accounts = await api.getAccounts();
        if (accounts && accounts.length > 0) {
          const defaultUser = accounts[0];
          const loginRes = await api.login({ user_id: defaultUser.id });
          setToken(loginRes.access_token);
          setUser(loginRes.profile);
        }
      }
    } catch (e) {
      console.warn('Init auth failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (payload: { user_id?: string; phone?: string }) => {
    setLoading(true);
    try {
      const res = await api.login(payload);
      setToken(res.access_token);
      setUser(res.profile);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: { full_name: string; phone?: string; birth_year?: number; sex?: string; role?: string }) => {
    setLoading(true);
    try {
      const res = await api.register(payload);
      setToken(res.access_token);
      setUser(res.profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.clearToken();
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
