'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { checkAdminStatus, syncUserRecord, getMyPermissions } from '../admin-actions';

interface AuthUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  name: string | null;
  photoURL: string | null;
  image: string | null;
  metadata: {
    creationTime: string | null;
    lastSignInTime: string | null;
  };
  authMethod: 'google' | 'credentials' | 'guest';
  hasPassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  affiliateId: string | null;
  xp: number;
  reward_level: string;
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
  const { data: session, status } = useSession();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [reward_level, setReward_level] = useState('starter');
  const [affiliateLevelDetails, setAffiliateLevelDetails] = useState<any>(null);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [country, setCountry] = useState('Unknown');
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [metadata, setMetadata] = useState<{ creationTime: string | null, lastSignInTime: string | null }>({ creationTime: null, lastSignInTime: null });
  const [authMethod, setAuthMethod] = useState<'google' | 'credentials' | 'guest'>('guest');
  const [hasPassword, setHasPassword] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const isAuthLoading = status === 'loading';

  const fetchCountry = async () => {
    let detectedCountry = 'Unknown';
    try {
      // Primary: ipwho.is
      const res = await fetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.country) {
          detectedCountry = data.country;
        }
      }
    } catch (e) {
      console.warn("ipwho.is failed, trying fallback...");
    }

    if (detectedCountry === 'Unknown') {
      try {
        // Fallback: ipapi.co
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          if (data.country_name) {
            detectedCountry = data.country_name;
          }
        }
      } catch (e) {
        console.warn("ipapi.co failed, trying db-ip...");
      }
    }

    if (detectedCountry === 'Unknown') {
      try {
        // Tertiary: db-ip
        const res = await fetch("https://api.db-ip.com/v2/free/self");
        if (res.ok) {
          const data = await res.json();
          if (data.countryName) {
            detectedCountry = data.countryName;
          }
        }
      } catch (e) {
        // All failed, silence the error
      }
    }

    setCountry(detectedCountry);
    if (detectedCountry !== 'Unknown') {
      // Set a cookie for the server to read during auth (expires in 24 hours)
      document.cookie = `userCountry=${encodeURIComponent(detectedCountry)}; path=/; max-age=86400; SameSite=Lax`;
    }
    return detectedCountry;
  };

  const refreshStatus = async () => {
    if (session?.user?.id) {
      const [res, permRes] = await Promise.all([
        checkAdminStatus(session.user.id),
        getMyPermissions(session.user.id)
      ]);

      if (res.success) {
        setIsAdmin(res.isAdmin || res.isOwner || false);
        setIsOwner(res.isOwner || false);
        setAffiliateId(res.affiliateId);
        setXp(res.xp || 0);
        setReward_level(res.reward_level || 'starter');
        setAffiliateLevelDetails(res.affiliateLevelDetails || null);
        setAffiliateCount(res.affiliateCount || 0);
        setMetadata(res.metadata || { creationTime: null, lastSignInTime: null });
        setAuthMethod(res.authMethod || 'google');
        setHasPassword(res.hasPassword || false);
        if (res.country && res.country !== 'Unknown') {
          setCountry(res.country);
        }

        // Manually Update User State for immediate UI sync
        setUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            displayName: res.name || prev.displayName,
            name: res.name || prev.name,
            photoURL: res.photoURL || prev.photoURL,
            image: res.photoURL || prev.image,
            authMethod: res.authMethod || prev.authMethod,
            hasPassword: res.hasPassword ?? prev.hasPassword
          };
        });
      }

      if (permRes.success) {
        const perms = typeof permRes.permissions === 'string' ? {} : (permRes.permissions || {});
        setPermissions(perms);
      }
    }
  };

  useEffect(() => {
    fetchCountry();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const u = session.user;
      setUser({
        uid: u.id || '',
        id: u.id || '',
        email: u.email || null,
        displayName: u.name || null,
        name: u.name || null,
        photoURL: u.image || null,
        image: u.image || null,
        metadata: metadata,
        authMethod: authMethod,
        hasPassword: hasPassword
      });

      // Only refresh status once when session is first established
      if (status === 'authenticated' && !isAdmin && !user) {
        refreshStatus();
      }
    } else {
      setUser(null);
      setIsAdmin(false);
      setIsOwner(false);
      setPermissions({});
      setAffiliateId(null);
      setXp(0);
      setReward_level('starter');
      setAffiliateLevelDetails(null);
      setAffiliateCount(0);
    }
  }, [session]); // Removed metadata from dependencies to prevent infinite loop

  const login = async (type: 'google' | 'email-login' | 'email-signup' = 'google', credentials?: { email: string, password: string }, referralId?: string | null) => {
    if (referralId) {
      document.cookie = `referralId=${referralId}; path=/; max-age=3600; SameSite=Lax`;
    }

    if (type === 'google') {
      await signIn('google', { callbackUrl: '/', redirect: true });
      return { success: true };
    }

    if (type === 'email-login') {
      if (!credentials?.email || !credentials?.password) {
        return { success: false, error: "Email and password are required." };
      }
      const res = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      });
      if (res?.error) {
        return { success: false, error: "Invalid email or password." };
      }
      return { success: true };
    }

    if (type === 'email-signup') {
      if (!credentials?.email || !credentials?.password) {
        return { success: false, error: "Email and password are required." };
      }
      const { emailSignup } = await import('../admin-actions');
      const res = await emailSignup({ 
        email: credentials.email, 
        password: credentials.password, 
        referralId 
      });
      if (res.success) {
        // Automatically login after signup
        return login('email-login', credentials);
      }
      return res;
    }

    return { success: false, error: "Unknown login type." };
  };

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      affiliateId,
      xp,
      reward_level,
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
