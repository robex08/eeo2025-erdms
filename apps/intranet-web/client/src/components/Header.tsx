import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EKGBanner from './EKGBanner';

const getInitials = (displayName?: string, givenName?: string, surname?: string) => {
  const first = (givenName || '').trim();
  const last = (surname || '').trim();
  if (first || last) {
    const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return initials || '';
  }

  if (!displayName) return '';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const Header: React.FC = () => {
  const { user } = useAuth();
  const initials = getInitials(user?.displayName, user?.givenName, user?.surname);

  return (
    <header className="shadow-sm">
      {/* Navigační lišta nahoře */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full">
          <div className="flex items-center justify-between h-16 px-0">
            {/* Logo a název - vlevo na doraz */}
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ZZS</span>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-lg font-bold text-gray-900">Intranet</h1>
                  <p className="text-xs text-gray-500">ZZS SK</p>
                </div>
              </div>
            </div>

            {/* Střední část - Vyhledávání */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Vyhledat..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Pravá část - Notifikace a uživatel - vpravo na doraz */}
            <div className="flex items-center gap-4">
              {/* Notifikace */}
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Uživatel */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.displayName || 'Uživatel'}</p>
                  <p className="text-xs text-gray-500">{user?.jobTitle || 'Zaměstnanec'}</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold hover:shadow-lg transition">
                  {initials || <User className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* EKG Banner dole */}
      <EKGBanner />
    </header>
  );
};

export default Header;
