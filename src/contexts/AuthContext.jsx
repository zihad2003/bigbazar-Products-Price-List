import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL, setToken, getToken } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login state on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Try to verify existing token against /account/me
    fetch(`${API_URL}/api/account/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          // Token is for admin or invalid — don't clear it (admin might need it)
          setUser(null);
        }
      })
      .catch(() => {
        // Token might be admin token — don't clear it
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Login failed' };
      }
      setToken(data.token);
      setUser(data.user);
      return { user: data.user, error: null };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    // Only clear customer-specific state — don't clear admin tokens
    setUser(null);
    // Check if the current token is a customer token before clearing
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.type === 'customer') {
          setToken(null);
        }
      } catch {
        // Can't decode — leave it
      }
    }
  }, []);

  const updatePhone = useCallback(async (phone) => {
    const token = getToken();
    if (!token) return { error: 'Not logged in' };
    try {
      const res = await fetch(`${API_URL}/api/account/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) throw new Error('Update failed');
      setUser(prev => prev ? { ...prev, phone } : prev);
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      loading,
      loginWithGoogle,
      logout,
      updatePhone
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
