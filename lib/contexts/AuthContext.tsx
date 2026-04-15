'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { checkAdminStatus, syncUserRecord } from '../admin-actions';

interface AuthContextType {
  user: FirebaseUser | null;
  isAdmin: boolean;
  affiliateId: string | null;
  discount: number;
  affiliateCount: number;
  country: string;
  isAuthLoading: boolean;
  login: (referralId?: string | null) => Promise<any>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [country, setCountry] = useState('Unknown');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const fetchCountry = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        setCountry(data.country_name || 'Unknown');
        return data.country_name || 'Unknown';
      }
    } catch (e) {
      console.warn("Geolocation failed, using default.");
    }
    return 'Unknown';
  };

  const refreshStatus = async () => {
    if (auth.currentUser) {
      const res = await checkAdminStatus(auth.currentUser.uid);
      setIsAdmin(res.isOwner);
      setAffiliateId(res.affiliateId);
      setDiscount(res.discount || 0);
      setAffiliateCount(res.affiliateCount || 0);
    }
  };

  useEffect(() => {
    fetchCountry();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && !u.isAnonymous) {
        setUser(u);
        const res = await checkAdminStatus(u.uid);
        setIsAdmin(res.isOwner);
        setAffiliateId(res.affiliateId);
        setDiscount(res.discount || 0);
        setAffiliateCount(res.affiliateCount || 0);
      } else {
        setUser(null);
        setIsAdmin(false);
        setAffiliateId(null);
        setDiscount(0);
        setAffiliateCount(0);
      }
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (referralId?: string | null) => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const currentCountry = await fetchCountry();

      const res = await syncUserRecord(u.uid, {
        isOwner: false,
        name: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        created: u.metadata.creationTime,
        last: u.metadata.lastSignInTime,
        country: currentCountry,
        referralId: referralId
      });

      await refreshStatus();
      return res;
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: "Authentication failed" };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      affiliateId,
      discount,
      affiliateCount,
      country,
      isAuthLoading,
      login,
      logout,
      refreshStatus
    }}>
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
