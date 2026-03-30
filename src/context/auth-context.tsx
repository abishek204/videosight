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

// Generate a unique user ID for anonymous users
function generateUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  let storedId = localStorage.getItem('vidinsight_user_id');
  if (!storedId) {
    storedId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('vidinsight_user_id', storedId);
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
          const storedUser = localStorage.getItem('vidinsight_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            const anonymousUser: User = {
              id: generateUserId(),
              uid: generateUserId(),
              name: 'Anonymous User',
              isAnonymous: true,
              isLoggedIn: false,
            };
            setUser(anonymousUser);
            localStorage.setItem('vidinsight_user', JSON.stringify(anonymousUser));
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
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
      localStorage.setItem('vidinsight_user', JSON.stringify(newUser));
    }
  };

  const logout = async () => {
    await logoutAction();
    localStorage.removeItem('vidinsight_user');
    localStorage.removeItem('vidinsight_user_id');
    
    // Create new anonymous user
    const newUser: User = {
      id: generateUserId(),
      uid: generateUserId(),
      name: 'Anonymous User',
      isAnonymous: true,
      isLoggedIn: false,
    };
    setUser(newUser);
    localStorage.setItem('vidinsight_user', JSON.stringify(newUser));
    window.location.reload(); // Refresh to clear states
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

