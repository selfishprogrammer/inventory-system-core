import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { User, Tenant, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (credentials: { email: string; password: string; tenantSlug?: string }) => Promise<void>;
  register: (data: { businessName: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  canManage: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(({ data }) => { setUser(data.user); setTenant(data.tenant); })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string; tenantSlug?: string }): Promise<void> => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setTenant(data.tenant);
  };

  const register = async (formData: { businessName: string; name: string; email: string; password: string }): Promise<void> => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setTenant(data.tenant);
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    setUser(null);
    setTenant(null);
  };

  const hasRole = (...roles: UserRole[]): boolean => !!user && roles.includes(user.role);
  const canManage = (): boolean => !!user && ['owner', 'manager'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, logout, hasRole, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
