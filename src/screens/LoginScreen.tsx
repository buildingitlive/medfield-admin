import React, { useState } from 'react';
import { Mail, Lock, Loader2, Shield, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await signIn(emailOrPhone, password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.includes('@')) {
      setError('Please enter a valid email address to reset your password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: err } = await resetPassword(emailOrPhone);
    if (err) {
      setError(err);
    } else {
      setSuccess('Check your email for the reset link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-8">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest opacity-80 pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-fixed/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-secondary-fixed/10 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <main className="relative z-10 w-full max-w-[420px] px-4">
        <div className="glass-panel rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.08)] p-8 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-surface-container-lowest shadow-sm mb-3 flex items-center justify-center border border-outline-variant/30">
              <img
                alt="MedField Logo"
                className="w-full h-full object-contain"
                src="/logo.png"
              />
            </div>
            <h1 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
              {mode === 'LOGIN' ? 'Admin & Partner Portal' : 'Reset Password'}
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              {mode === 'LOGIN' ? 'Sign in with your email address or phone number.' : 'Enter your email address to receive a reset link.'}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="w-full mb-4 p-3 bg-secondary-container/50 text-on-secondary-container rounded-lg text-xs font-medium">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 p-3 bg-error-container/50 text-on-error-container rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'LOGIN' ? handleSubmit : handleForgotPassword} className="w-full flex flex-col gap-4">
            {/* Email or Phone */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wider text-on-surface-variant" htmlFor="emailOrPhone">
                Email Address or Phone Number
              </label>
              <div className="relative flex items-center group input-focus-ring rounded-lg border border-outline-variant bg-surface-container-lowest transition-all duration-200">
                {emailOrPhone.includes('@') ? (
                  <Mail className="w-4 h-4 text-outline ml-2.5 pointer-events-none group-focus-within:text-primary transition-colors" />
                ) : (
                  <Phone className="w-4 h-4 text-outline ml-2.5 pointer-events-none group-focus-within:text-primary transition-colors" />
                )}
                <input
                  id="emailOrPhone"
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="admin@medfield.internal or 9876543210"
                  required
                  className="w-full bg-transparent border-none py-2.5 px-2.5 text-on-surface text-sm focus:ring-0 placeholder:text-outline-variant placeholder:text-xs"
                />
              </div>
            </div>

            {/* Password */}
            {mode === 'LOGIN' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold tracking-wider text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('FORGOT_PASSWORD');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative flex items-center group input-focus-ring rounded-lg border border-outline-variant bg-surface-container-lowest transition-all duration-200">
                <Lock className="w-4 h-4 text-outline ml-2.5 pointer-events-none group-focus-within:text-primary transition-colors" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent border-none py-2.5 px-2.5 text-on-surface text-sm focus:ring-0 placeholder:text-outline-variant"
                />
              </div>
            </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-primary text-on-primary font-semibold text-sm h-[44px] rounded-lg shadow-sm hover:bg-primary-container hover:shadow-md hover:-translate-y-[1px] active:translate-y-[0px] active:shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'LOGIN' ? 'Sign In' : 'Send Reset Link'}
            </button>
          </form>

          {/* Toggle Login */}
          {mode === 'FORGOT_PASSWORD' && (
            <div className="mt-4 w-full flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs font-semibold text-primary hover:text-primary-container transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 pt-4 border-t border-outline-variant/30 w-full text-center">
            <p className="text-[11px] font-medium text-outline flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Authorized administrator and delivery partner portal
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
