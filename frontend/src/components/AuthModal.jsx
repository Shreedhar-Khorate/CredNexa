import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, Mail, User, X, AlertCircle, Sparkles, Loader2, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const data = await registerUser({ full_name: fullName, email, password });
        onAuthSuccess(data.user);
      } else {
        const data = await loginUser({ email, password });
        onAuthSuccess(data.user);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@crednexa.com');
      setPassword('admin123');
    } else {
      setEmail('user@crednexa.com');
      setPassword('user123');
    }
    setIsRegister(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cn-modal-backdrop p-4 animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="cn-card-elevated w-full max-w-md p-6 sm:p-7 relative text-[var(--cn-text-main)] shadow-2xl transition-all max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute top-4 right-4 text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)] p-1.5 rounded-xl hover:bg-[var(--cn-surface-muted)] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand & Header */}
        <div className="text-center space-y-2 mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#4f46e5] text-white shadow-md shadow-[#0284c7]/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-xs font-semibold tracking-wider uppercase">
            <span className="cn-brand-cred">Cred</span>
            <span className="cn-brand-nexa">Nexa</span>
            <span className="text-[var(--cn-text-muted)] font-normal ml-1">Platform</span>
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-extrabold text-[var(--cn-text-main)] tracking-tight">
            {isRegister ? 'Create CredNexa Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-[var(--cn-text-muted)] max-w-xs mx-auto">
            {isRegister
              ? 'Register to track credit risk scores and personal evaluations'
              : 'Sign in to access your saved credit evaluations & reports'}
          </p>
        </div>

        {/* Segmented Sign In | Register Switch */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--cn-surface-muted)] border border-[var(--cn-border)] mb-5">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isRegister
                ? 'bg-[var(--cn-surface)] text-[var(--cn-text-main)] shadow-sm border border-[var(--cn-border-muted)]'
                : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRegister
                ? 'bg-[var(--cn-surface)] text-[var(--cn-text-main)] shadow-sm border border-[var(--cn-border-muted)]'
                : 'text-[var(--cn-text-muted)] hover:text-[var(--cn-text-main)]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Demo Quick Fill Credentials (Shown in Sign In mode) */}
        {!isRegister && (
          <div className="mb-5 p-3.5 rounded-xl bg-[var(--cn-surface-muted)] border border-[var(--cn-border)] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-sky-500 dark:text-sky-400 font-semibold">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Demo Access</span>
              </div>
              <span className="text-[10px] text-[var(--cn-text-subtle)] font-normal">Click role to fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="p-2.5 rounded-lg bg-[var(--cn-surface)] hover:bg-[var(--cn-surface-elevated)] text-xs border border-[var(--cn-border)] hover:border-indigo-500/50 transition-all text-left cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[10px] text-indigo-400 uppercase tracking-wide">Admin</span>
                  <ArrowRight className="w-3 h-3 text-[var(--cn-text-subtle)] group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-medium text-[var(--cn-text-main)] text-[11px]">Underwriter</div>
                <div className="text-[10px] text-[var(--cn-text-subtle)] font-mono truncate">admin@crednexa.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('user')}
                className="p-2.5 rounded-lg bg-[var(--cn-surface)] hover:bg-[var(--cn-surface-elevated)] text-xs border border-[var(--cn-border)] hover:border-sky-500/50 transition-all text-left cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[10px] text-sky-500 dark:text-sky-400 uppercase tracking-wide">Applicant</span>
                  <ArrowRight className="w-3 h-3 text-[var(--cn-text-subtle)] group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-medium text-[var(--cn-text-main)] text-[11px]">Loan Applicant</div>
                <div className="text-[10px] text-[var(--cn-text-subtle)] font-mono truncate">user@crednexa.com</div>
              </button>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="cn-label" htmlFor="auth-fullname">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--cn-text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="cn-input pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label className="cn-label" htmlFor="auth-email">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--cn-text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="cn-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="cn-label" htmlFor="auth-password">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--cn-text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="cn-input pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cn-text-subtle)] hover:text-[var(--cn-text-main)] transition cursor-pointer p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cn-btn cn-btn-primary w-full py-2.5 text-sm mt-2 shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{isRegister ? 'Create CredNexa Account' : 'Sign In to CredNexa'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Modal Footer */}
        <div className="mt-5 text-center text-xs text-[var(--cn-text-muted)] border-t border-[var(--cn-border)] pt-4">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                className="text-sky-500 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                className="text-sky-500 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
              >
                Register
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
