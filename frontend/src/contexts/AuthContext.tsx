import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { logger } from "@/lib/logger";
import { getApiUrl } from "@/lib/init";
import { 
  cacheSession, 
  getCachedSession, 
  isCachedSessionValid, 
  clearCachedSession,
  CachedSession
} from "@/lib/session-crypto";


// User type
interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Session {
  user: User;
  token: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        try {
          // First, try to verify token with server (online)
          const response = await fetch(`${getApiUrl()}/api/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              setUser(data.user);
              setSession({ user: data.user, token });
              logger.info('Auth restored from token (server verified)');
            }
          } else {
            // Token invalid/expired - try cached session as fallback
            logger.warn('Token verification failed, checking cache');
            const cached = await getCachedSession();
            if (cached && isCachedSessionValid(cached)) {
              setUser(cached.user);
              setSession({ user: cached.user, token: cached.token });
              logger.info('Auth restored from encrypted cache');
            } else {
              // Cache invalid or expired too
              logger.warn('Cached session invalid or expired');
              localStorage.removeItem('auth_token');
              clearCachedSession();
            }
          }
        } catch (error) {
          // Offline or network error - try cached session
          logger.warn('Token verification failed (likely offline), checking cache', { error });
          const cached = await getCachedSession();
          if (cached && isCachedSessionValid(cached)) {
            setUser(cached.user);
            setSession({ user: cached.user, token: cached.token });
            logger.info('Auth restored from encrypted cache (offline)');
          } else {
            // Cache invalid or expired
            logger.warn('Cached session invalid or expired');
            localStorage.removeItem('auth_token');
            clearCachedSession();
          }
        }
      } else {
        // No token in localStorage, try cached session as fallback
        const cached = await getCachedSession();
        if (cached && isCachedSessionValid(cached)) {
          setUser(cached.user);
          setSession({ user: cached.user, token: cached.token });
          localStorage.setItem('auth_token', cached.token);
          logger.info('Auth restored from encrypted cache (no token in storage)');
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || data.message || `HTTP ${response.status}: ${response.statusText}` } };
      }

      if (data.error) {
        return { error: { message: data.error } };
      }

      if (data.user && data.token) {
        setUser(data.user);
        setSession({ user: data.user, token: data.token });
        localStorage.setItem('auth_token', data.token);
        
        // Cache encrypted session for offline use
        const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
        await cacheSession({
          user: data.user,
          token: data.token,
          expiresAt,
          encryptedAt: Date.now(),
          deviceId: '', // Will be set by cacheSession
        });
        
        logger.info('Signup successful', { data: { email: data.user.email } });
      }

      return { error: null };
    } catch (error: any) {
      logger.error('Signup error', error);
      return { error: { message: error.message || 'Signup failed' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // Handle rate limiting specifically
      if (response.status === 429) {
        let errorMessage = 'Too many requests. Please wait a moment and try again.';
        try {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            errorMessage = data.message || data.error || errorMessage;
          }
        } catch {
          // Use default message if parsing fails
        }
        logger.warn('Signin rate limited', { status: response.status });
        return { error: { message: errorMessage } };
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        logger.error('Signin non-JSON response', { status: response.status, text: text.substring(0, 200) });
        return { error: { message: `Server error: ${response.status} ${response.statusText}` } };
      }

      try {
        const text = await response.text();
        if (!text || text.trim() === '') {
          return { error: { message: 'Empty response from server' } };
        }
        data = JSON.parse(text);
      } catch (parseError: any) {
        logger.error('Signin JSON parse error', { error: parseError, status: response.status });
        return { error: { message: 'Invalid response from server. Please try again.' } };
      }

      if (!response.ok) {
        return { error: { message: data.error || data.message || `HTTP ${response.status}: ${response.statusText}` } };
      }

      if (data.error) {
        return { error: { message: data.error } };
      }

      if (data.user && data.token) {
        setUser(data.user);
        setSession({ user: data.user, token: data.token });
        localStorage.setItem('auth_token', data.token);
        
        // Cache encrypted session for offline use
        const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
        await cacheSession({
          user: data.user,
          token: data.token,
          expiresAt,
          encryptedAt: Date.now(),
          deviceId: '', // Will be set by cacheSession
        });
        
        logger.info('Signin successful', { data: { email: data.user.email } });
      }

      return { error: null };
    } catch (error: any) {
      logger.error('Signin error', error);
      return { error: { message: error.message || 'Network error: Could not connect to server' } };
    }
  };

  const signOut = async () => {
    try {
      // Call signout endpoint (optional with JWT)
      await fetch(`${getApiUrl()}/api/auth/signout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      logger.error('Signout error', error);
    } finally {
      // Clear local state and cache
      setUser(null);
      setSession(null);
      localStorage.removeItem('auth_token');
      clearCachedSession();
      logger.info('Signed out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
