import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
  organizationId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  username: string;
  email?: string;
  password: string;
  passwordConfirm: string;
  organizationId?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Загружаем токен из localStorage при монтировании
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      // Загружаем информацию о пользователе
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (authToken: string) => {
    try {
      const response = await api.auth.me();
      setUser(response.data);
    } catch (error) {
      // Токен невалиден, удаляем его
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await api.auth.login(username, password);
      const { token: authToken, user: userData } = response.data;
      
      localStorage.setItem('auth_token', authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка при входе');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.auth.register(data);
      const { token: authToken, user: userData } = response.data;
      
      localStorage.setItem('auth_token', authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка при регистрации');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
