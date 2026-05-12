'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface User {
  id: number;
  nama: string;
  email: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null, token: null, loading: true,
  login: async () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ihc_token');
    if (saved) {
      setToken(saved);
      fetch(`${BASE}/auth/me/`, { headers: { Authorization: `Bearer ${saved}` } })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then(setUser)
        .catch(() => { localStorage.removeItem('ihc_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login gagal' }));
      throw new Error(err.detail || 'Login gagal');
    }
    const data = await res.json();
    localStorage.setItem('ihc_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('ihc_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
