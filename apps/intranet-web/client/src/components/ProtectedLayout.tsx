import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedLayout: React.FC = () => {
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Načítání...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Intranet Web
            </h1>
            <p className="text-gray-600 mb-6">
              Pro přístup se přihlaste pomocí firemního účtu Microsoft
            </p>
            <button
              onClick={login}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-medium"
            >
              Přihlásit se přes EntraID
            </button>
            <p className="mt-6 text-sm text-gray-500">
              © 2026 ZZS SK, p.o.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedLayout;
