import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { logger } from "@/lib/logger";
import { getApiUrl } from "@/lib/init";


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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token by fetching current user
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
            logger.info('Auth restored from token');
          }
        } else {
          // Token invalid/expired - clear it
          logger.warn('Token invalid, clearing auth');
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        logger.error('Auth check failed', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
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
      // Clear local state
      setUser(null);
      setSession(null);
      localStorage.removeItem('auth_token');
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
