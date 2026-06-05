import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import { Activity, CheckCircle } from 'lucide-react';

const SystemInfo: React.FC = () => {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkAPI = async () => {
      try {
        await apiClient.get('/health');
        setApiStatus('online');
      } catch (error) {
        setApiStatus('offline');
      }
    };
    checkAPI();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Uživatel</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">Jméno:</span> {user?.name}
            </p>
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">Email:</span> {user?.email}
            </p>
            {user?.jobTitle && (
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">Pozice:</span> {user.jobTitle}
              </p>
            )}
            {user?.department && (
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">Oddělení:</span> {user.department}
              </p>
            )}
            <div className="mt-4 pt-4 border-t">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ EntraID ověřeno
              </span>
            </div>
          </div>
        </div>

        {/* API Status Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">API Status</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">Backend PHP API:</p>
              {apiStatus === 'checking' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  🔄 Kontrola...
                </span>
              )}
              {apiStatus === 'online' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Online
                </span>
              )}
              {apiStatus === 'offline' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  ✗ Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tech Stack Card */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold text-lg">⚙️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Technologie</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• React 18 + TypeScript</li>
            <li>• Vite build tool</li>
            <li>• Tailwind CSS</li>
            <li>• PHP 8.4 REST API</li>
            <li>• EntraID připraveno</li>
          </ul>
        </div>
      </div>

      {/* Next Steps Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Další kroky pro konfiguraci:
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• EntraID autentizace je aktivní a funkční</li>
          <li>• Implementujte další PHP backend API endpointy</li>
          <li>• Přidejte stránky a komponenty podle potřeby</li>
          <li>• API používá stejný Auth systém jako intranet-v26</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemInfo;
