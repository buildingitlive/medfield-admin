import React, { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface UpdatePasswordScreenProps {
  onNavigate: (route: string) => void;
}

export const UpdatePasswordScreen: React.FC<UpdatePasswordScreenProps> = ({ onNavigate }) => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          onNavigate('/dashboard');
        }
      });
    }
  }, [onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-8">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest opacity-80 pointer-events-none" />
        <main className="relative z-10 w-full max-w-[420px] px-4">
          <div className="glass-panel rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.08)] p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight mb-2">Password Updated!</h2>
            <p className="text-sm text-on-surface-variant max-w-sm">
              Your password has been successfully reset. Redirecting you to the dashboard...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-8">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest opacity-80 pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-fixed/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-secondary-fixed/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-[420px] px-4">
        <div className="glass-panel rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.08)] p-8 flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-surface-container-lowest shadow-sm mb-3 flex items-center justify-center border border-outline-variant/30">
              <img
                alt="MedField Logo"
                className="w-full h-full object-contain"
                src="/logo.png"
              />
            </div>
            <h1 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">Create New Password</h1>
            <p className="text-xs text-on-surface-variant mt-1">Enter your new password below to secure your account.</p>
          </div>

          {errorMsg && (
            <div className="w-full mb-4 p-3 bg-error-container/50 text-on-error-container rounded-lg text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wider text-on-surface-variant" htmlFor="password">
                New Password
              </label>
              <div className="relative flex items-center group input-focus-ring rounded-lg border border-outline-variant bg-surface-container-lowest transition-all duration-200">
                <Lock className="w-4 h-4 text-outline ml-2.5 pointer-events-none group-focus-within:text-primary transition-colors" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-transparent border-none py-2.5 px-2.5 text-on-surface text-sm focus:ring-0 placeholder:text-outline-variant"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-primary text-on-primary font-semibold text-sm h-[44px] rounded-lg shadow-sm hover:bg-primary-container hover:shadow-md hover:-translate-y-[1px] active:translate-y-[0px] active:shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
