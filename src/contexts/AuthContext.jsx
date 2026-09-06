import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL, setToken, getCustomerToken, clearCustomerToken } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login state on mount
  useEffect(() => {
    const token = getCustomerToken();
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
          setUser(null);
        }
      })
      .catch(() => {
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
      // Stores under customer key only — does not overwrite admin JWT
      setToken(data.token);
      setUser(data.user);
      return { user: data.user, error: null };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearCustomerToken();
  }, []);

  const updatePhone = useCallback(async (phone) => {
    const token = getCustomerToken();
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
