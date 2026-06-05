import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Home, Layout, Package, Activity, User, LogOut, Maximize2, X } from 'lucide-react';
import SystemInfo from './SystemInfo';
import IntranetPreview from './IntranetPreview';
import TestLayout from './TestLayout';
import ComponentsPage from './ComponentsPage';

type TabType = 'system-info' | 'preview' | 'test-layout' | 'components';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('system-info');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const firstName = user?.name?.split(' ')[0] || user?.givenName || 'uživateli';

  // ESC key listener pro zavření fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Vypnout scroll hlavniho okna pri fullscreen
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prevBodyOverflow || '';
      document.documentElement.style.overflow = prevHtmlOverflow || '';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow || '';
      document.documentElement.style.overflow = prevHtmlOverflow || '';
    };
  }, [isFullscreen]);

  const tabs = [
    { id: 'system-info' as TabType, label: 'System Info', icon: Activity },
    { id: 'preview' as TabType, label: 'Náhled intranetu', icon: Home },
    { id: 'test-layout' as TabType, label: 'Test Layout', icon: Layout },
    { id: 'components' as TabType, label: 'Komponenty', icon: Package },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'system-info':
        return <SystemInfo />;
      case 'preview':
        return <IntranetPreview />;
      case 'test-layout':
        return <TestLayout />;
      case 'components':
        return <ComponentsPage />;
      default:
        return <SystemInfo />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Home className="w-6 h-6 text-primary-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Intranet Web - ZZS SK, p.o.
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Odhlásit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-700 text-white flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Vítejte, {firstName}!
          </h1>
          <p className="text-blue-100">
            Vývojové prostředí pro tvorbu intranetu
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className="flex items-center">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition whitespace-nowrap
                      ${isActive 
                        ? 'border-primary-600 text-primary-600' 
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                  {/* Fullscreen ikona jen pro Náhled intranetu */}
                  {tab.id === 'preview' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('preview');
                        setIsFullscreen(true);
                      }}
                      className="ml-1 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded transition"
                      title="Zobrazit na celou obrazovku"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-gray-500 text-center">
            © 2026 ZZS SK, p.o. - Intranet Web Application
          </p>
        </div>
      </footer>

      {/* Fullscreen Modal pro náhled intranetu */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white overflow-hidden">
          <div className="h-screen overflow-y-auto custom-scrollbar">
            {/* Floating close button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="fixed top-4 right-4 z-50 p-3 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-2xl transition-all hover:scale-110"
              title="Zavřít náhled (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Fullscreen obsah */}
            <IntranetPreview />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
