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
  signIn: (emailOrPhone: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    emailOrPhone: string;
    password: string;
    name: string;
    role: 'admin' | 'partner';
    phone?: string;
    region?: string;
    city?: string;
  }) => Promise<{ error: string | null }>;
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
    const userEmail = currentUser.email;
    const userPhone = currentUser.phone;
    const phoneClean = userPhone ? userPhone.replace(/\D/g, '').slice(-10) : '';

    // Check admin_users first by id, or email, or phone
    let { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!adminData && userEmail) {
      const { data } = await supabase.from('admin_users').select('*').eq('email', userEmail).maybeSingle();
      adminData = data;
    }
    if (!adminData && phoneClean) {
      const { data } = await supabase.from('admin_users').select('*').ilike('phone', `%${phoneClean}%`).maybeSingle();
      adminData = data;
    }

    if (adminData) {
      setRole('admin');
      setAdminProfile(adminData);
      setPartnerProfile(null);
      return;
    }

    // Check partners by email, or phone, or user id
    let partnerData = null;
    if (userEmail) {
      const { data } = await supabase.from('partners').select('*').eq('email', userEmail).maybeSingle();
      partnerData = data;
    }
    if (!partnerData && phoneClean) {
      const { data } = await supabase.from('partners').select('*').ilike('phone', `%${phoneClean}%`).maybeSingle();
      partnerData = data;
    }
    if (!partnerData) {
      const { data } = await supabase.from('partners').select('*').eq('id', currentUser.id).maybeSingle();
      partnerData = data;
    }

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

  const signIn = async (emailOrPhone: string, password: string): Promise<{ error: string | null }> => {
    const input = emailOrPhone.trim();
    if (input.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: input, password });
      return { error: error ? error.message : null };
    } else {
      const phoneClean = input.replace(/\D/g, '').slice(-10);
      const formattedPhone = input.startsWith('+') ? input : `+91${phoneClean}`;
      
      let { error } = await supabase.auth.signInWithPassword({ phone: formattedPhone, password });
      if (!error) return { error: null };

      const syntheticEmail = `phone_${phoneClean}@medfield.phone`;
      let { error: synthError } = await supabase.auth.signInWithPassword({ email: syntheticEmail, password });
      if (!synthError) return { error: null };

      let partnerEmailErrorObj = null;
      try {
        const { data: partner } = await supabase.from('partners').select('email').ilike('phone', `%${phoneClean}%`).maybeSingle();
        if (partner?.email) {
          let { error: partnerEmailError } = await supabase.auth.signInWithPassword({ email: partner.email, password });
          if (!partnerEmailError) return { error: null };
          partnerEmailErrorObj = partnerEmailError;
        }
      } catch (e) {
        // RLS will typically block this for anonymous users, which is expected for security.
      }

      // We do NOT search admin_users by phone because the phone column does not exist on admin_users and it causes a 400 Bad Request.

      return { error: error?.message || synthError?.message || partnerEmailErrorObj?.message || 'Invalid credentials for this phone number.' };
    }
  };

  const signUp = async (params: {
    emailOrPhone: string;
    password: string;
    name: string;
    role: 'admin' | 'partner';
    phone?: string;
    region?: string;
    city?: string;
  }): Promise<{ error: string | null }> => {
    const input = params.emailOrPhone.trim();
    const isEmail = input.includes('@');
    let userId: string | null = null;
    let registeredEmail = isEmail ? input : `phone_${input.replace(/\D/g, '').slice(-10)}@medfield.phone`;
    let registeredPhone = !isEmail ? input : (params.phone || '');

    if (isEmail) {
      const { data, error } = await supabase.auth.signUp({
        email: registeredEmail,
        password: params.password,
        options: { data: { name: params.name, role: params.role } }
      });
      if (error) return { error: error.message };
      userId = data.user?.id || null;
    } else {
      const phoneClean = input.replace(/\D/g, '').slice(-10);
      const formattedPhone = input.startsWith('+') ? input : `+91${phoneClean}`;
      
      const { data: phoneData, error: phoneError } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: params.password,
        options: { data: { name: params.name, role: params.role } }
      });

      if (!phoneError && phoneData?.user) {
        userId = phoneData.user.id;
      } else {
        const { data: synthData, error: synthError } = await supabase.auth.signUp({
          email: registeredEmail,
          password: params.password,
          options: { data: { name: params.name, role: params.role } }
        });
        if (synthError) return { error: synthError.message };
        userId = synthData?.user?.id || null;
      }
    }

    if (params.role === 'admin') {
      const adminRow: any = {
        name: params.name,
        email: registeredEmail,
        role: 'admin'
      };
      if (userId) adminRow.id = userId;
      if (registeredPhone) adminRow.phone = registeredPhone;

      const { error: insertErr } = await supabase.from('admin_users').insert(adminRow);
      if (insertErr) {
        const coreRow: any = { name: params.name, email: registeredEmail, role: 'admin' };
        if (userId) coreRow.id = userId;
        await supabase.from('admin_users').insert(coreRow);
      }
    } else {
      const partnerRow: any = {
        name: params.name,
        email: registeredEmail,
        phone: registeredPhone || input,
        region: params.region || 'city_wide',
        city: params.city || 'Gorakhpur',
        margin_share: 0,
        is_active: true
      };
      if (userId) partnerRow.id = userId;

      const { error: partnerErr } = await supabase.from('partners').insert(partnerRow);
      if (partnerErr) return { error: partnerErr.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setAdminProfile(null);
    setPartnerProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, adminProfile, partnerProfile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
