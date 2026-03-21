import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    const token = api.getToken();

    if (!token) {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await api.get<{ success: boolean; data: User }>('/auth/me');
      setAuthState({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      api.setToken(null);
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<{ success: boolean; data: { token: string; user: User } }>(
        '/auth/login',
        { email, password }
      );
      api.setToken(response.data.token);
      setAuthState({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const logout = useCallback(() => {
    api.setToken(null);
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
}
