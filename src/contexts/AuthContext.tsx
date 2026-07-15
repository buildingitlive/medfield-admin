import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'partner' | null;

interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  city: string;
  is_active: boolean;
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  adminProfile: AdminProfile | null;
  partnerProfile: PartnerProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const detectRole = useCallback(async (currentUser: User) => {
    // Check admin_users first
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (adminData) {
      setRole('admin');
      setAdminProfile(adminData);
      setPartnerProfile(null);
      return;
    }

    // Check partners
    const { data: partnerData } = await supabase
      .from('partners')
      .select('*')
      .eq('email', currentUser.email)
      .maybeSingle();

    if (partnerData && partnerData.is_active) {
      setRole('partner');
      setPartnerProfile(partnerData);
      setAdminProfile(null);
      return;
    }

    // Neither admin nor partner
    setRole(null);
    setAdminProfile(null);
    setPartnerProfile(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        detectRole(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        detectRole(s.user).finally(() => setLoading(false));
      } else {
        setRole(null);
        setAdminProfile(null);
        setPartnerProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [detectRole]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setAdminProfile(null);
    setPartnerProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, adminProfile, partnerProfile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
