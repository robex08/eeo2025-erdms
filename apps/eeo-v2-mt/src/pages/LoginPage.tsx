/**
 * Login Page - Modern Design
 */

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scaleIn">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 card-shadow">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">EEO Mobile</h1>
          <p className="text-slate-400">Přihlaste se do svého účtu</p>
        </div>

        {/* Login Form */}
        <div className="glass rounded-2xl p-6 card-shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Uživatelské jméno
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="jmeno.prijmeni"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Heslo
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed card-shadow"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Přihlašování...
                </span>
              ) : (
                'Přihlásit se'
              )}
            </button>
          </form>

          {/* MS Entra ID - TODO */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              disabled
              className="w-full bg-white/5 hover:bg-white/10 text-slate-400 font-medium py-3 px-4 rounded-xl transition-all opacity-50 cursor-not-allowed"
            >
              Přihlásit přes Microsoft
            </button>
          </div>
        </div>

        {/* Environment Badge */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            DEV prostředí
          </span>
        </div>
      </div>
    </div>
  );
}
