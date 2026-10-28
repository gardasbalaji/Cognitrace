import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authAPI,
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
  AUTH_EXPIRED_EVENT,
} from '../services/api';

/**
 * SECURITY NOTE ON TOKEN STORAGE:
 * In this implementation, tokens are stored in browser sessionStorage
 * for the lifetime of the active browser tab/session.
 * Note that browser-accessible storage remains exposed to client-side JavaScript,
 * so it does NOT provide immunity against Cross-Site Scripting (XSS).
 * For maximum security in production, tokens should be managed via httpOnly, secure,
 * sameSite cookies with CSRF defense.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on initial application load
  const restoreSession = useCallback(async () => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      // Validate token with backend /api/auth/me
      const userData = await authAPI.getMe();
      setUser(userData);
      setToken(existingToken);
      // Keep storage in sync with fresh backend profile
      setStoredSession(existingToken, userData, false);
    } catch (err) {
      console.warn('Session restoration failed (token expired or invalid):', err.message);
      clearStoredSession();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Listen for 401 expiration events dispatched by api.js
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [restoreSession]);

  // Standard email & password login
  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, user: loggedInUser } = response;

    setToken(access_token);
    setUser(loggedInUser);
    setStoredSession(access_token, loggedInUser, false);

    return loggedInUser;
  };

  // Student or faculty registration
  const register = async (registrationData) => {
    const response = await authAPI.register(registrationData);
    const { access_token, user: registeredUser } = response;

    // If registration immediately returns a valid access token, log them in
    if (access_token && registeredUser) {
      setToken(access_token);
      setUser(registeredUser);
      setStoredSession(access_token, registeredUser, false);
    }

    return response;
  };

  // Google authentication
  const googleLogin = async (payload) => {
    const response = await authAPI.googleAuth(payload);

    // If backend reports first-time Google user needing role details
    if (response.needs_profile) {
      return response;
    }

    const { access_token, user: loggedInUser } = response;
    if (access_token && loggedInUser) {
      setToken(access_token);
      setUser(loggedInUser);
      setStoredSession(access_token, loggedInUser, false);
    }

    return response;
  };

  // Logout
  const logout = () => {
    clearStoredSession();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(user && token),
    loading,
    login,
    register,
    googleLogin,
    logout,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
