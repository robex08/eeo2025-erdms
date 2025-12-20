// CSS migrováno do GlobalStyles (emotion)
import { css } from '@emotion/react';
import React, { useContext, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext'; // Ensure correct import
import { ToastProvider, ToastContext } from './context/ToastContext';
import { DictionaryCacheProvider } from './context/DictionaryCacheContext';
import { ActivityProvider } from './context/ActivityContext';
import { BackgroundTasksProvider, useBackgroundTasks as useBgTasksContext } from './context/BackgroundTasksContext';
import { ExchangeRatesProvider, useExchangeRates } from './context/ExchangeRatesContext';
import { useBackgroundTasks } from './hooks/useBackgroundTasks';
import { useUserActivity } from './hooks/useUserActivity';
import { createStandardTasks } from './services/backgroundTasks';
import Layout from './components/Layout';
import { setupEncryptionDebug } from './utils/encryptionUtils';
import { initSecurityMeasures } from './utils/securityImprovements';
import ordersCacheService from './services/ordersCacheService';
import { getCacheConfig } from './config/cacheConfig';
import useDevice from './hooks/useDevice';
const MobileLoginPage = lazy(() => import('./components/mobile/MobileLoginPage'));
const MobileDashboard = lazy(() => import('./components/mobile/MobileDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Orders = lazy(() => import('./pages/Orders'));
const Users = lazy(() => import('./pages/Users'));
// const Dictionaries = lazy(() => import('./pages/Dictionaries')); // Old version
const DictionariesNew = lazy(() => import('./pages/DictionariesNew')); // New modern version
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrderForm25 = lazy(() => import('./forms/OrderForm25'));

const Orders25List = lazy(() => import('./pages/Orders25List'));
const Invoices25List = lazy(() => import('./pages/Invoices25List'));
const InvoiceEvidencePage = lazy(() => import('./pages/InvoiceEvidencePage'));
const AddressBookPage = lazy(() => import('./pages/AddressBookPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const NotificationTestPanel = lazy(() => import('./pages/NotificationTestPanel'));
const OrderV2TestPanel = lazy(() => import('./pages/OrderV2TestPanel'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const DebugPanel = lazy(() => import('./pages/DebugPanel'));
const CashBookPage = lazy(() => import('./pages/CashBookPage'));
const About = lazy(() => import('./components/About'));
const ReportsPlaceholder = lazy(() => import('./pages/ReportsPlaceholder'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const AppSettings = lazy(() => import('./pages/AppSettings'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const OrganizationHierarchy = lazy(() => import('./pages/OrganizationHierarchy'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const SplashScreen = lazy(() => import('./components/SplashScreen'));
const AppShell = ({ children }) => (
  <div css={css`display:flex; flex-direction:column; min-height:100vh;`}>{children}</div>
);

// 🔐 Logout redirect listener - sleduje změnu isLoggedIn a přesměrovává na login
function LogoutRedirectListener({ isLoggedIn }) {
  const navigate = useNavigate();
  const location = useLocation();
  const wasLoggedInRef = useRef(isLoggedIn);

  useEffect(() => {
    // Detekuj změnu z přihlášen → odhlášen
    if (wasLoggedInRef.current && !isLoggedIn && location.pathname !== '/login') {
      // Uživatel se právě odhlásil → redirect na login
      navigate('/login', { replace: true });
    }
    
    wasLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn, navigate, location.pathname]);

  return null;
}

// 🛠️ Maintenance mode wrapper - zobrazí MaintenancePage PŘED layoutem
function MaintenanceModeWrapper({ isLoggedIn, userDetail, children }) {
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  
  const isSuperAdmin = React.useMemo(() => {
    return userDetail?.roles?.some(role => role.kod_role === 'SUPERADMIN');
  }, [userDetail]);
  
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { checkMaintenanceMode } = await import('./services/globalSettingsApi');
        const isMaintenanceActive = await checkMaintenanceMode();
        setMaintenanceMode(isMaintenanceActive);
      } catch (error) {
        console.error('Chyba při kontrole maintenance mode:', error);
        setMaintenanceMode(false);
      } finally {
        setChecking(false);
      }
    };
    
    if (isLoggedIn) {
      checkMaintenance();
      
      // Kontrola každých 30 sekund
      const interval = setInterval(checkMaintenance, 30000);
      
      return () => clearInterval(interval);
    } else {
      setChecking(false);
    }
  }, [isLoggedIn]);
  
  // Pokud stále kontrolujeme - ŽÁDNÝ splash screen při reload
  // (pouze při cold start je splash z HTML, který se skryje v index.js)
  if (checking) {
    return null; // Tichá kontrola na pozadí, žádný loading
  }
  
  // Pokud je údržba aktivní a uživatel NENÍ SUPERADMIN a JE přihlášen
  if (maintenanceMode && isLoggedIn && !isSuperAdmin) {
    return (
      <Suspense fallback={null}>
        <MaintenancePage />
      </Suspense>
    );
  }
  
  // Jinak zobrazíme normální aplikaci
  return children;
}

// Simple helper component for last route restoration
function RestoreLastRoute({ isLoggedIn, userId, user, hasPermission, userDetail }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Save current location to localStorage only for menu routes
  useEffect(() => {
    if (isLoggedIn && location.pathname !== '/login' && location.pathname !== '/') {
      // Whitelist of routes that should be saved for restoration
      const validRoutes = ['/order-form-25', '/orders25-list', '/users', '/dictionaries', '/profile', '/address-book', '/change-password', '/statistics', '/orders', '/debug', '/cash-book'];

      if (validRoutes.includes(location.pathname)) {
        localStorage.setItem('app_lastRoute', location.pathname);
      }
    }
  }, [isLoggedIn, location.pathname]);

  // Migrate old route paths
  useEffect(() => {
    const lastRoute = localStorage.getItem('app_lastRoute');
    if (lastRoute === '/statistics-new') {
      localStorage.setItem('app_lastRoute', '/statistics');
    }
  }, []);

  // Restore last location only on initial load from root
  useEffect(() => {
    if (isLoggedIn && location.pathname === '/') {
      // 🎨 PRIORITA: userSettings.vychozi_sekce_po_prihlaseni → lastRoute → fallback
      // Po čerstvém přihlášení má prioritu nastavení uživatele
      
      try {
        // ✅ OPRAVA: Načíst user_id z AuthContext místo neexistujícího localStorage klíče
        const user_id = userId || user?.id;
        
        if (user_id) {
          const { loadSettingsFromLocalStorage } = require('./services/userSettingsApi');
          const userSettings = loadSettingsFromLocalStorage(user_id);
          
          if (userSettings?.vychozi_sekce_po_prihlaseni) {
            // ✅ SPRÁVNÉ MAPOVÁNÍ: Podle availableSections.js
            const sectionMap = {
              'address-book': '/address-book',
              'contacts': '/contacts',
              'dictionaries': '/dictionaries',
              'debug': '/debug',
              'suppliers': '/address-book', // Dodavatelé jsou v adresáři (alias)
              'notifications': '/notifications',
              'orders-old': '/orders', // Staré objednávky před 2026
              'reports': '/reports',
              'statistics': '/statistics',
              'app-settings': '/app-settings',
              'organization-hierarchy': '/organization-hierarchy',
              'cash-book': '/cash-book',
              'profile': '/profile',
              'orders25-list': '/orders25-list',
              'invoices25-list': '/invoices25-list',
              'users': '/users'
            };
            
            let targetSection = userSettings.vychozi_sekce_po_prihlaseni;
            let targetRoute = sectionMap[targetSection];
            
            // 🔒 SECURITY: Zkontroluj, zda má uživatel oprávnění k této sekci
            const { isSectionAvailable, getFirstAvailableSection } = require('./utils/availableSections');
            
            if (!isSectionAvailable(targetSection, hasPermission, userDetail)) {
              console.warn('⚠️ User does not have permission for section:', targetSection);
              // Fallback: Použij první dostupnou sekci
              targetSection = getFirstAvailableSection(hasPermission, userDetail);
              targetRoute = sectionMap[targetSection] || '/profile';
            }
            
            // ✅ Fallback pokud route není v mapě
            if (!targetRoute) {
              console.warn('⚠️ Unknown section in userSettings:', targetSection);
              targetSection = getFirstAvailableSection(hasPermission, userDetail);
              targetRoute = sectionMap[targetSection] || '/orders25-list';
            }
            
            navigate(targetRoute, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ Chyba při načítání výchozí sekce:', error);
      }
      
      // Fallback 1: lastRoute (pro případ kdy userSettings není nastaveno)
      const lastRoute = localStorage.getItem('app_lastRoute');
      if (lastRoute && lastRoute !== '/orders-list-new') {
        navigate(lastRoute, { replace: true });
        return;
      }
      
      // Fallback 2: Seznam objednávek
      navigate('/orders25-list', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, navigate, location.pathname]);

  return null;
}

function App() {
  const { isMobile } = useDevice();
  const { isLoggedIn, loading, hasPermission, hasAdminRole, token, username, logout, setToken, userDetail, userId, user } = useContext(AuthContext); // Use isLoggedIn, loading, hasPermission, hasAdminRole, token, username, setToken, userDetail, userId, user from AuthContext
  const { showToast } = useContext(ToastContext) || {};
  const bgTasksContext = useBgTasksContext();
  const exchangeRatesContext = useExchangeRates(); // ← Nový context pro směnné kurzy

  // ✅ KRITICKÉ: Stabilní reference na bgTasks - vytvoří se POUZE JEDNOU
  const bgTasksConfigRef = useRef({ trackState: false });
  const bgTasks = useBackgroundTasks(bgTasksConfigRef.current);
  const bgTasksRef = useRef(bgTasks);
  useEffect(() => {
    bgTasksRef.current = bgTasks;
  }, [bgTasks]);

  // ✅ TOKEN AUTO-REFRESH: Callback pro automatickou aktualizaci tokenu
  const handleTokenRefresh = useCallback((newToken) => {
    setToken(newToken);
    // Uložit nový token do storage
    import('./utils/authStorage').then(({ saveAuthData }) => {
      saveAuthData.token(newToken);
    });
  }, [setToken]);

  // User activity tracking - pings every 3 minutes, triggers on login/save operations
  // ✅ Nyní předává handleTokenRefresh pro automatický refresh tokenu
  const { triggerActivity } = useUserActivity(token, username, handleTokenRefresh);

  // Stabilní reference na context pro background tasks (zamezí re-registraci)
  const bgTasksContextRef = useRef(bgTasksContext);
  useEffect(() => {
    bgTasksContextRef.current = bgTasksContext;
  }, [bgTasksContext]);

  // 🚫 CRITICAL: Track jestli už byly tasky zaregistrovány (zamezí infinite loop)
  const tasksRegisteredRef = useRef(false);

  // Initialize debug functions for development
  useEffect(() => {
    setupEncryptionDebug();

    // 🔒 SECURITY: Initialize security measures
    initSecurityMeasures();

    // 🚀 CACHE: Initialize cache service
    const cacheConfig = getCacheConfig();
    ordersCacheService.configure(cacheConfig);
  }, []);

  // 🔐 KRITICKÉ: Token expiration handler - redirect na login s toast notifikací
  useEffect(() => {
    const handleAuthError = (event) => {
      const message = event.detail?.message || 'Vaše přihlášení vypršelo. Budete přesměrováni na přihlašovací stránku.';

      // 🎯 KRITICKÉ: Toast notifikace
      if (showToast) {
        showToast(message, { type: 'error' });
      }

      // ⏱️ Po 1.5 sekundách odhlásit
      setTimeout(() => {
        if (logout) {
          logout('token_expired');
        }
      }, 1500);
    };

    window.addEventListener('authError', handleAuthError);
    return () => window.removeEventListener('authError', handleAuthError);
  }, [showToast, logout]);

  // 🎉 Uvítací toast po přihlášení s jmeninami
  useEffect(() => {
    const handleWelcomeToast = (event) => {
      const message = event.detail?.message;
      if (message && showToast) {
        showToast(message, { type: 'info', duration: 8000 });
      }
    };

    window.addEventListener('show-welcome-toast', handleWelcomeToast);
    return () => window.removeEventListener('show-welcome-toast', handleWelcomeToast);
  }, [showToast]);

  // Registrace background tasks po přihlášení
  useEffect(() => {
    if (!isLoggedIn || !bgTasksRef.current) {
      // Reset registrace při odhlášení
      tasksRegisteredRef.current = false;
      return;
    }

    // 🚫 CRITICAL: Zamezení infinite loop - registrovat pouze jednou
    if (tasksRegisteredRef.current) {
      return;
    }

    const bgTasksInstance = bgTasksRef.current;

    // Vytvoření standardních tasků s callbacky
    const tasks = createStandardTasks({
      // Callback pro refresh objednávek
      onOrdersRefreshed: (ordersData) => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.triggerOrdersRefresh) {
          ctx.triggerOrdersRefresh(ordersData);
        }
      },

      // Callback pro získání aktuálních filtrů (ROK, OBDOBÍ, ARCHIV)
      // Volá BackgroundTasksContext.getCurrentFilters() který volá registrovaný callback z Orders25List
      getCurrentFilters: () => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.getCurrentFilters) {
          return ctx.getCurrentFilters();
        }
        return {};  // Fallback: prázdné filtry
      },

      // Callback pro změnu počtu nepřečtených notifikací
      onUnreadCountChange: (count) => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.handleUnreadCountChange) {
          ctx.handleUnreadCountChange(count);
        }
      },

      // Callback pro nové notifikace - pouze badge, bez toastu
      onNewNotifications: (notifications, unreadCount) => {
        // Toast notifikace jsou zakázány - pouze badge se aktualizuje
        const ctx = bgTasksContextRef.current;
        if (ctx?.handleNewNotifications) {
          ctx.handleNewNotifications(notifications, unreadCount);
        }
      },

      // Callback pro aktualizaci směnných kurzů
      onExchangeRatesUpdated: (rates) => {
        if (exchangeRatesContext?.updateRates) {
          exchangeRatesContext.updateRates(rates);
        }
      }
    });

    // Registrace všech tasků
    tasks.forEach(taskConfig => {
      try {
        bgTasksInstance.register(taskConfig);
      } catch (error) {
      }
    });

    // Označit jako zaregistrováno
    tasksRegisteredRef.current = true;

    // Cleanup se provede automaticky při unmount díky autoCleanup
  }, [isLoggedIn]); // ✅ OPRAVENO: Pouze isLoggedIn - bgTasks je stabilní reference!

  // 🪙 Exchange rates - načítání POUZE po přihlášení uživatele
  // ✅ DŮLEŽITÉ: Event 'trigger-initial-exchange-rates' se spouští POUZE v AuthContext.login()
  // ✅ NIKDY při refresh stránky (F5) - pouze při skutečném přihlášení!
  // Po inicializaci se kurzy aktualizují automaticky každých 30 minut (background task)
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleInitialExchangeRates = () => {
      try {
        const bgTasksInstance = bgTasksRef.current;
        if (!bgTasksInstance) {
          console.warn('⚠️ Background tasks not initialized yet');
          return;
        }

        // Spustit task exchangeRatesRefresh okamžitě po přihlášení
        bgTasksInstance.runNow('exchangeRatesRefresh').catch(err => {
          // Tiše ignorovat chyby - background task to zkusí znovu za 30 minut
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Exchange rates fetch failed:', err);
          }
        });
      } catch (error) {
        // ✅ OCHRANA: Zajistit že chyba v načítání kurzů NIKDY nerozbije aplikaci
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Critical error in exchange rates handler:', error);
        }
      }
    };

    // Poslouchat na trigger z AuthContext po úspěšném přihlášení
    window.addEventListener('trigger-initial-exchange-rates', handleInitialExchangeRates);

    return () => {
      window.removeEventListener('trigger-initial-exchange-rates', handleInitialExchangeRates);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // NOTE: navigate/useLocation must be called inside Router context. We render
  // a small child component inside the Router below to perform the restore.
  // If auth initialization is still in progress, don't mount the Router/routes.
  // This avoids a premature redirect to /login when a stored token is being validated
  // and preserves current location (so refresh on /orders-new doesn't lose the form).
  // 🎯 OPTIMALIZACE: Žádný splash screen při reload - pouze při cold start (viz index.js)
  if (loading) {
    return null; // Tichá kontrola tokenu na pozadí
  }

  // 📱 MOBILE VERSION: Pokud je zařízení mobilní, zobrazí se mobilní verze
  if (isMobile) {
    return (
      <Router basename={process.env.PUBLIC_URL || ''}>
        <Suspense fallback={<div style={{display:'none'}}></div>}>
          {!isLoggedIn ? (
            <MobileLoginPage />
          ) : (
            <MobileDashboard />
          )}
        </Suspense>
      </Router>
    );
  }

  // 🖥️ DESKTOP VERSION
  return (
    <ActivityProvider triggerActivity={triggerActivity}>
      <Router basename={process.env.PUBLIC_URL || ''}>
        <MaintenanceModeWrapper isLoggedIn={isLoggedIn} userDetail={userDetail}>
          <AppShell>
            <Layout>
              {/* Logout redirect listener */}
              <LogoutRedirectListener isLoggedIn={isLoggedIn} />
              {/* Run restore after Layout mounts so it has a chance to persist the current location first */}
              <RestoreLastRoute isLoggedIn={isLoggedIn} userId={userId} user={user} hasPermission={hasPermission} userDetail={userDetail} />
              <Suspense fallback={<div style={{display:'none'}}></div>}>
                <Routes>
                  {!isLoggedIn && <Route path="*" element={<Navigate to="/login" replace />} />}
                  <Route
                    path="/login"
                    element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
                  />
                  {/* Root route "/" is handled by RestoreLastRoute component */}
                  {isLoggedIn && <Route path="/" element={<div style={{display:'none'}} />} />}

                  {isLoggedIn && <Route path="/orders" element={<Orders />} />}

                  {isLoggedIn && <Route path="/orders25-list" element={<Orders25List />} />}
                  {isLoggedIn && <Route path="/invoices25-list" element={<Invoices25List />} />}
                  {isLoggedIn && <Route path="/invoice-evidence/:orderId?" element={<InvoiceEvidencePage />} />}
                  {isLoggedIn && <Route path="/order-form-25" element={<OrderForm25 />} />}
                  {isLoggedIn && hasPermission && (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE')) && <Route path="/users" element={<Users />} />}
                  {isLoggedIn && hasPermission && (hasPermission('DICT_VIEW') || hasPermission('DICT_MANAGE')) && <Route path="/dictionaries" element={<DictionariesNew />} />}
                  {isLoggedIn && hasAdminRole && hasAdminRole() && <Route path="/reports-old" element={<ReportsPlaceholder />} />}
                  {isLoggedIn && <Route path="/reports" element={<ReportsPage />} />}
                  {isLoggedIn && <Route path="/statistics" element={<StatisticsPage />} />}
                  {isLoggedIn && hasAdminRole && hasAdminRole() && <Route path="/app-settings" element={<AppSettings />} />}
                  {isLoggedIn && hasAdminRole && hasAdminRole() && <Route path="/organization-hierarchy" element={<OrganizationHierarchy />} />}
                  {isLoggedIn && hasPermission && hasPermission('CONTACT_READ') && <Route path="/address-book" element={<AddressBookPage />} />}
                  {isLoggedIn && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) && <Route path="/contacts" element={<ContactsPage />} />}
                  {isLoggedIn && <Route path="/profile" element={<ProfilePage />} />}
                  {isLoggedIn && <Route path="/about" element={<About />} />}
                  {isLoggedIn && <Route path="/change-password" element={<ChangePasswordPage />} />}
                  {isLoggedIn && <Route path="/notifications" element={<NotificationsPage />} />}
                  {isLoggedIn && <Route path="/cash-book" element={<CashBookPage />} />}
                  {isLoggedIn && hasPermission && hasPermission('SUPERADMIN') && <Route path="/debug" element={<DebugPanel />} />}
                  {isLoggedIn && process.env.NODE_ENV === 'development' && <Route path="/test-notifications" element={<NotificationTestPanel />} />}
                  {isLoggedIn && process.env.NODE_ENV === 'development' && <Route path="/test-order-v2" element={<OrderV2TestPanel />} />}
                </Routes>
              </Suspense>
            </Layout>
          </AppShell>
        </MaintenanceModeWrapper>
      </Router>
    </ActivityProvider>
  );
}

export default function RootApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DictionaryCacheProvider>
          <BackgroundTasksProvider>
            <ExchangeRatesProvider>
              <App />
            </ExchangeRatesProvider>
          </BackgroundTasksProvider>
        </DictionaryCacheProvider>
      </ToastProvider>
    </AuthProvider>
  );
}