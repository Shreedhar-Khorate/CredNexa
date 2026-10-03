import React, { useState } from 'react';
import { UserCheck, Lock, Mail, User, X, AlertCircle, Sparkles } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRegister ? 'Create CredNexa Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegister
              ? 'Register to save your assessment reports & audit history'
              : 'Sign in to access your saved credit evaluations'}
          </p>
        </div>

        {/* Demo Quick Fill Buttons */}
        {!isRegister && (
          <div className="mb-6 p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs text-sky-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Demo Credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-mono text-slate-300 border border-slate-700 hover:border-sky-500 transition text-left"
              >
                <div className="font-semibold text-sky-400">Admin Account</div>
                <div className="text-[10px] text-slate-400">admin@crednexa.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('user')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-mono text-slate-300 border border-slate-700 hover:border-sky-500 transition text-left"
              >
                <div className="font-semibold text-emerald-400">User Account</div>
                <div className="text-[10px] text-slate-400">user@crednexa.com</div>
              </button>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Shreedhar Khorate"
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-sky-500 text-white placeholder-slate-600"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-sky-500 text-white placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-sky-500 text-white placeholder-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-semibold text-white text-sm shadow-lg shadow-sky-500/25 transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                className="text-sky-400 hover:underline font-semibold"
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
                className="text-sky-400 hover:underline font-semibold"
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
