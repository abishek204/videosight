"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUserAction, logoutAction } from "@/app/actions/auth";

interface User {
  id: string;
  uid: string;
  name: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  isAnonymous: boolean;
  isLoggedIn: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  signIn: async () => {},
  logout: async () => {},
});

// Safe localStorage helpers (can throw in private browsing/incognito)
function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Silently fail - storage full or blocked
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Silently fail
  }
}

// Generate a unique user ID for anonymous users
function generateUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  let storedId = safeGetItem('vidinsight_user_id');
  if (!storedId) {
    storedId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    safeSetItem('vidinsight_user_id', storedId);
  }
  return storedId;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUserAction();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Fallback to anonymous for now if no session
          const storedUser = safeGetItem('vidinsight_user');
          let parsed: User | null = null;
          if (storedUser) {
            try { parsed = JSON.parse(storedUser); } catch { parsed = null; }
          }
          if (parsed) {
            setUser(parsed);
          } else {
            const anonymousUser: User = {
              id: generateUserId(),
              uid: generateUserId(),
              name: 'Anonymous User',
              isAnonymous: true,
              isLoggedIn: false,
            };
            setUser(anonymousUser);
            safeSetItem('vidinsight_user', JSON.stringify(anonymousUser));
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        // Ensure we still have a user even on error
        const fallbackUser: User = {
          id: 'fallback',
          uid: 'fallback',
          name: 'Anonymous User',
          isAnonymous: true,
          isLoggedIn: false,
        };
        setUser(fallbackUser);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async () => {
    // This is now handled by the login page calling loginAction
    // We just ensure we have some user state if needed
    if (!user) {
      const newUser: User = {
        id: generateUserId(),
        uid: generateUserId(),
        name: 'Anonymous User',
        isAnonymous: true,
        isLoggedIn: false,
      };
      setUser(newUser);
      safeSetItem('vidinsight_user', JSON.stringify(newUser));
    }
  };

  const logout = async () => {
    try { await logoutAction(); } catch { /* suppress */ }
    safeRemoveItem('vidinsight_user');
    safeRemoveItem('vidinsight_user_id');
    
    // Create new anonymous user
    const newUser: User = {
      id: generateUserId(),
      uid: generateUserId(),
      name: 'Anonymous User',
      isAnonymous: true,
      isLoggedIn: false,
    };
    setUser(newUser);
    safeSetItem('vidinsight_user', JSON.stringify(newUser));
    try { window.location.reload(); } catch { /* suppress */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

