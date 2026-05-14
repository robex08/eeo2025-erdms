import { useState, type FormEvent } from 'react';
import { Lock, User } from 'lucide-react';

interface LoginFormCardProps {
  onLogin: (loginId: string, password: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export default function LoginFormCard({ onLogin, isLoading = false, error = null }: LoginFormCardProps) {
  const [email, setEmail] = useState('admin@zachranka.cz');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      return;
    }

    await onLogin(email.trim(), password);
  };

  return (
    <div className="w-full max-w-md bg-[#1e2330] rounded-2xl shadow-2xl p-8 border border-gray-800">
      <div className="text-center mb-8">
        <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
          <Lock className="text-blue-400 w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Přihlášení do systému</h1>
        <p className="text-gray-400 text-sm mt-2">Zadejte své přístupové údaje</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-id" className="block text-sm text-gray-400 mb-1 ml-1">
            E-mail / Přihlašovací jméno
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <input
              id="login-id"
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@zachranka.cz"
              className="w-full bg-[#111216] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-400 mb-1 ml-1">
            Heslo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#111216] border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors mt-6 flex justify-center items-center"
        >
          {isLoading ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Přihlásit se'}
        </button>

        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
