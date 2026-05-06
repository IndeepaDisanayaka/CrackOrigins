'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { checkAdminStatus, syncUserRecord, getMyPermissions } from '../admin-actions';


interface AuthContextType {
  user: FirebaseUser | null;
  isAdmin: boolean;
  affiliateId: string | null;
  xp: number;
  affiliateLevel: string;
  affiliateLevelDetails: any;
  affiliateCount: number;
  country: string;
  isAuthLoading: boolean;
  permissions: Record<string, string[]>;
  isOwner: boolean;
  login: (type?: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }, referralId?: string | null) => Promise<any>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [affiliateLevel, setAffiliateLevel] = useState('starter');
  const [affiliateLevelDetails, setAffiliateLevelDetails] = useState<any>(null);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [country, setCountry] = useState('Unknown');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isOwner, setIsOwner] = useState(false);

  const fetchCountry = async () => {
    // Attempt 1: ipwho.is (Fast, No API key)
    try {
      const res = await fetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.country) {
          setCountry(data.country);
          return data.country;
        }
      }
    } catch (e) {
      console.warn("Geolocation Tactic 1 failed, trying fallback...");
    }

    // Attempt 2: ipapi.co (Reliable backup)
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.country_name) {
          setCountry(data.country_name);
          return data.country_name;
        }
      }
    } catch (e) {
      console.warn("Geolocation Tactic 2 failed.");
    }

    return 'Unknown';
  };

  const refreshStatus = async () => {
    if (auth.currentUser) {
      const [res, permRes] = await Promise.all([
        checkAdminStatus(auth.currentUser.uid),
        getMyPermissions(auth.currentUser.uid)
      ]);
      
      if (res.success) {
        setIsAdmin(res.isAdmin || res.isOwner || false);
        setIsOwner(res.isOwner || false);
        setAffiliateId(res.affiliateId);
        setXp(res.xp || 0);
        setAffiliateLevel(res.affiliateLevel || 'starter');
        setAffiliateLevelDetails(res.affiliateLevelDetails || null);
        setAffiliateCount(res.affiliateCount || 0);
      }

      if (permRes.success) {
        const perms = typeof permRes.permissions === 'string' ? {} : (permRes.permissions || {});
        setPermissions(perms);
      }
    }
  };

  useEffect(() => {
    fetchCountry();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && !u.isAnonymous) {
        setUser(u);
        const [res, permRes] = await Promise.all([
          checkAdminStatus(u.uid),
          getMyPermissions(u.uid)
        ]);

        if (res.success) {
          setIsAdmin(res.isAdmin || res.isOwner || false);
          setIsOwner(res.isOwner || false);
          setAffiliateId(res.affiliateId);
          setXp(res.xp || 0);
          setAffiliateLevel(res.affiliateLevel || 'starter');
          setAffiliateLevelDetails(res.affiliateLevelDetails || null);
          setAffiliateCount(res.affiliateCount || 0);
        }

        if (permRes.success) {
          // If it's a wildcard string (owner), use an empty object as isOwner handles full access
          const perms = typeof permRes.permissions === 'string' ? {} : (permRes.permissions || {});
          setPermissions(perms);
        }

      } else {
        setUser(null);
        setIsAdmin(false);
        setIsOwner(false);
        setPermissions({});
        setAffiliateId(null);
        setXp(0);
        setAffiliateLevel('starter');
        setAffiliateLevelDetails(null);
        setAffiliateCount(0);
      }
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (type: 'google' | 'email-login' | 'email-signup' = 'google', credentials?: { email: string, password: string }, referralId?: string | null) => {
    try {
      let u: FirebaseUser;
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');

      if (type === 'google') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        u = result.user;
      } else if (type === 'email-login' && credentials) {
        const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        u = result.user;
      } else if (type === 'email-signup' && credentials) {
        const result = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
        u = result.user;
      } else {
        throw new Error("Invalid login type or credentials");
      }

      const currentCountry = await fetchCountry();

      const res = await syncUserRecord(u.uid, {
        isOwner: false,
        name: u.displayName || u.email?.split('@')[0] || "User",
        email: u.email,
        photoURL: u.photoURL || null,
        created: u.metadata.creationTime,
        last: u.metadata.lastSignInTime,
        country: currentCountry,
        referralId: referralId,
        emailVerified: u.emailVerified || false
      });

      await refreshStatus();
      return res;
    } catch (error: any) {
      console.error("Login Error:", error);
      
      // Auto-linking hints
      if (error.code === 'auth/account-exists-with-different-credential') {
        return { success: false, error: "An account already exists with this email. Please log in using Email/Password to sync your account." };
      }
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, error: "An account already exists with this email. Please sign in (try Google if Email fails)." };
      }
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        return { success: false, error: "Invalid email or password." };
      }
      
      return { success: false, error: error.message || "Authentication failed" };
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
      xp,
      affiliateLevel,
      affiliateLevelDetails,
      affiliateCount,
      country,
      isAuthLoading,
      permissions,
      isOwner,
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
