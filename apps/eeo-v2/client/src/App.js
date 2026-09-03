// CSS migrováno do GlobalStyles (emotion)
import { css } from '@emotion/react';
import React, { useContext, lazy, Suspense, useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext'; // Ensure correct import
import { ToastProvider, ToastContext } from './context/ToastContext';
import { DictionaryCacheProvider } from './context/DictionaryCacheContext';
import { ActivityProvider } from './context/ActivityContext';
import { BackgroundTasksProvider, useBackgroundTasks as useBgTasksContext } from './context/BackgroundTasksContext';
import { ExchangeRatesProvider, useExchangeRates } from './context/ExchangeRatesContext';
import { useBackgroundTasks } from './hooks/useBackgroundTasks';
import { useUserActivity } from './hooks/useUserActivity';
import useVersionChecker from './hooks/useVersionChecker';
import { APP_VERSION } from './config/appVersion';
import { createStandardTasks } from './services/backgroundTasks';
import Layout from './components/Layout';
import { setupEncryptionDebug } from './utils/encryptionUtils';
import { initSecurityMeasures } from './utils/securityImprovements';
import ordersCacheService from './services/ordersCacheService';
import { getCacheConfig } from './config/cacheConfig';
import useDevice from './hooks/useDevice';
import PostLoginModal from './components/PostLoginModal';
import { getGlobalSettings } from './services/globalSettingsApi';
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
const Orders25ListV3 = lazy(() => import('./pages/Orders25ListV3')); // V3 - Beta s backend paging
const AnnualFeesPage = lazy(() => import('./pages/AnnualFeesPage')); // 🆕 Evidence ročních poplatků - BETA
const Invoices25List = lazy(() => import('./pages/Invoices25List'));
const InvoiceEvidencePage = lazy(() => import('./pages/InvoiceEvidencePage'));
const AddressBookPage = lazy(() => import('./pages/AddressBookPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const NotificationTestPanel = lazy(() => import('./pages/NotificationTestPanel'));
const OrderV2TestPanel = lazy(() => import('./pages/OrderV2TestPanel'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const DebugPanel = lazy(() => import('./pages/DebugPanel'));
const CashBookPage = lazy(() => import('./pages/CashBookPage'));
const About = lazy(() => import('./components/About'));
const ReportsPlaceholder = lazy(() => import('./pages/ReportsPlaceholder'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const StatsReportsPage = lazy(() => import('./pages/StatsReportsPage'));
const CerpaniPage = lazy(() => import('./pages/CerpaniPage'));
const MajetekOverviewPage = lazy(() => import('./pages/MajetekOverviewPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AppSettings = lazy(() => import('./pages/AppSettings'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage')); // Audit log - SUPERADMIN / ADMINISTRATOR
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const VemaDenik = lazy(() => import('./pages/VemaDenik'));
const OrganizationHierarchy = lazy(() => import('./pages/OrganizationHierarchy'));
const PlanningAdminPage = lazy(() => import('./pages/PlanningAdminPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const SplashScreen = lazy(() => import('./components/SplashScreen'));
// PostLoginModal je importován přímo (ne lazy) kvůli rychlému zobrazení po loginu
const UpdateNotificationModal = lazy(() => import('./components/UpdateNotificationModal'));
const HighPriorityNotificationModal = lazy(() => import('./components/HighPriorityNotificationModal'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AppShell = ({ children }) => (
  <div css={css`display:flex; flex-direction:column; min-height:100vh;`}>{children}</div>
);

// ⏳ Loading fallback for lazy-loaded routes
const RouteLoadingFallback = () => (
  <div css={css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 1rem;
  `}>
    <div css={css`
      width: 50px;
      height: 50px;
      border: 4px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `} />
  </div>
);

const isChunkLoadError = (error) => {
  const reason = error?.reason || error;
  const name = String(reason?.name || '');
  const message = String(reason?.message || reason || '');

  return name === 'ChunkLoadError' ||
    /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
};

const clearBuildHashAndReload = () => {
  try {
    localStorage.removeItem('app_build_hash');
  } catch (error) {
    // Ignore storage errors during recovery.
  }
  window.location.reload(true);
};

const AppReloadRequired = ({ error }) => {
  const isChunkError = isChunkLoadError(error);

  return (
    <div css={css`
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f6fb;
      padding: 2rem;
    `}>
      <div css={css`
        width: min(520px, 100%);
        background: #ffffff;
        border: 1px solid #dbe3ef;
        border-radius: 12px;
        box-shadow: 0 16px 40px rgba(31, 42, 87, 0.16);
        padding: 1.75rem;
        color: #1f2a57;
      `}>
        <h1 css={css`
          font-size: 1.35rem;
          margin: 0 0 0.75rem 0;
          color: #1f2a57;
        `}>
          {isChunkError ? 'Je dostupná nová verze aplikace' : 'Aplikaci je potřeba obnovit'}
        </h1>
        <p css={css`
          margin: 0 0 1.25rem 0;
          line-height: 1.5;
          color: #4b587c;
        `}>
          {isChunkError
            ? 'Aplikace byla mezitím aktualizována a aktuálně otevřená stránka už používá staré soubory. Obnovte stránku pro načtení nové verze.'
            : 'Při načítání stránky došlo k chybě. Obnovení načte aktuální verzi aplikace.'}
        </p>
        <button
          type="button"
          onClick={clearBuildHashAndReload}
          css={css`
            border: 0;
            border-radius: 8px;
            background: #2563eb;
            color: white;
            font-weight: 700;
            padding: 0.75rem 1.1rem;
            cursor: pointer;

            &:hover {
              background: #1d4ed8;
            }
          `}
        >
          Obnovit stránku
        </button>
      </div>
    </div>
  );
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      try {
        localStorage.removeItem('app_build_hash');
      } catch (storageError) {
        // Ignore storage errors during recovery.
      }
    }
  }

  render() {
    if (this.state.error) {
      return <AppReloadRequired error={this.state.error} />;
    }

    return this.props.children;
  }
}

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

// 🔄 Redirect na /login se zachováním query parametrů (zejména ?sso=auto)
function NavigateToLoginWithQuery() {
  const location = useLocation();
  // Preserve deep-link so we can restore it after login.
  useEffect(() => {
    try {
      const fullPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;
      if (location.pathname !== '/login' && location.pathname !== '/' && fullPath !== '/login') {
        sessionStorage.setItem('post_login_redirect', fullPath);
      }
    } catch (error) {
      console.warn('⚠️ Chyba při ukládání post-login redirect:', error);
    }
  }, [location.pathname, location.search, location.hash]);

  return <Navigate to={`/login${location.search}`} replace />;
}

function extractPreferredSectionFromUserSettings(userSettings) {
  if (!userSettings || typeof userSettings !== 'object') {
    return null;
  }

  const rawCandidates = [
    userSettings.vychozi_sekce_po_prihlaseni,
    userSettings.chovani_aplikace?.vychozi_sekce_po_prihlaseni,
    userSettings.defaultMenuTab
  ];

  for (const candidate of rawCandidates) {
    const section = (typeof candidate === 'object' && candidate?.value)
      ? candidate.value
      : candidate;

    if (typeof section === 'string' && section.trim()) {
      return section.trim();
    }
  }

  return null;
}

function NavigateAfterLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userDetail, hasPermission, token, username } = useContext(AuthContext);
  const [resolved, setResolved] = React.useState(false);
  
  React.useEffect(() => {
    let isCancelled = false;
    
    const resolveRedirect = async () => {
      // 1. Vyčisti případný post_login_redirect.
      //    Požadované chování: PRIORITA je profilová výchozí sekce -> lastRoute -> dashboard.
      try {
        const stored = sessionStorage.getItem('post_login_redirect');
        if (stored) {
          sessionStorage.removeItem('post_login_redirect');
        }
      } catch (error) {
        console.warn('⚠️ Chyba při čtení post-login redirect:', error);
      }
      
      // 2. PRIORITA 1: userSettings.vychozi_sekce_po_prihlaseni
      const user_id = user?.id;
      try {
        if (user_id) {
          const { loadSettingsFromLocalStorage, fetchUserSettings } = require('./services/userSettingsApi');
          let userSettings = loadSettingsFromLocalStorage(user_id);
          if (!userSettings && token && username) {
            userSettings = await fetchUserSettings({ token, username, userId: user_id });
          }
          
          const preferredSection = extractPreferredSectionFromUserSettings(userSettings);
          if (preferredSection) {
            const sectionMap = {
              'address-book': '/address-book',
              'contacts': '/contacts',
              'vema-denik': '/vema-denik',
              'dictionaries': '/dictionaries',
              'suppliers': '/address-book',
              'notifications': '/notifications',
              'orders': '/orders25-list',
              'orders-old': '/orders',
              'reports': '/reports',
              'statistics': '/statistics',
              'stats-reports': '/stats-reports',
              'cerpani': '/cerpani',
              'material-overview': '/majetek-overview',
              'majetek-overview': '/majetek-overview',
              'app-settings': '/app-settings',
              'organization-hierarchy': '/organization-hierarchy',
              'planning': '/planning',
              'cash-book': '/cash-book',
              'profile': '/profile',
              'orders25-list': '/orders25-list',
              'orders25-list-v3': '/orders25-list-v3',
              'annual-fees': '/annual-fees',
              'invoices25-list': '/invoices25-list',
              'users': '/users',
              'help': '/help',
              'dashboard': '/dashboard'
            };
            
            const targetSection = preferredSection;
            const targetRoute = sectionMap[targetSection];
            const sectionForAvailability = targetSection === 'orders' ? 'orders25-list' : targetSection;

            const { isSectionAvailable } = require('./utils/availableSections');
            const isAvailable = targetSection === 'dashboard'
              ? true
              : isSectionAvailable(sectionForAvailability, hasPermission, userDetail);

            if (targetRoute && isAvailable) {
              if (isCancelled) return;
              navigate(targetRoute, { replace: true });
              setResolved(true);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Chyba při načítání user settings:', error);
      }

      // 3. PRIORITA 2: lastRoute z localStorage
      const lastRoute = user_id ? localStorage.getItem(`app_lastRoute_user_${user_id}`) : null;
      const invalidRoutes = ['/orders-list-new', '/login', '/logout', '/', ''];
      if (lastRoute && !invalidRoutes.includes(lastRoute) && lastRoute.startsWith('/') && !/[<>{}]/.test(lastRoute)) {
        if (isCancelled) return;
        navigate(lastRoute, { replace: true });
        setResolved(true);
        return;
      }

      // 4. FALLBACK: dashboard
      if (isCancelled) return;
      navigate('/dashboard', { replace: true });
      setResolved(true);
    };
    
    resolveRedirect();
    
    return () => {
      isCancelled = true;
    };
  }, [navigate, user, userDetail, hasPermission, token, username, location.pathname]);

  // Zobraz nic během rozhodování
  if (!resolved) {
    return <div style={{ display: 'none' }} />;
  }
  
  return null;
}

// 🛠️ Maintenance mode wrapper - zobrazí MaintenancePage PŘED layoutem
function MaintenanceModeWrapper({ isLoggedIn, userDetail, children }) {
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  
  // SUPERADMIN role má automatický přístup
  const isSuperAdmin = React.useMemo(() => {
    return userDetail?.roles?.some(role => role.kod_role === 'SUPERADMIN');
  }, [userDetail]);
  
  // Kontrola práva MAINTENANCE_ADMIN (z rolí nebo přímých práv)
  const hasMaintenanceAdmin = React.useMemo(() => {
    if (!userDetail) return false;
    
    // Kontrola přímých práv
    if (userDetail.direct_rights) {
      const hasDirectRight = Array.isArray(userDetail.direct_rights) 
        ? userDetail.direct_rights.some(r => 
            (typeof r === 'string' && r === 'MAINTENANCE_ADMIN') ||
            (typeof r === 'object' && r.kod_prava === 'MAINTENANCE_ADMIN')
          )
        : false;
      if (hasDirectRight) return true;
    }
    
    // Kontrola práv z rolí
    if (userDetail.roles && Array.isArray(userDetail.roles)) {
      for (const role of userDetail.roles) {
        if (role.rights && Array.isArray(role.rights)) {
          const hasRoleRight = role.rights.some(r => 
            (typeof r === 'string' && r === 'MAINTENANCE_ADMIN') ||
            (typeof r === 'object' && r.kod_prava === 'MAINTENANCE_ADMIN')
          );
          if (hasRoleRight) return true;
        }
      }
    }
    
    return false;
  }, [userDetail]);
  
  // Kombinovaná kontrola: SUPERADMIN NEBO MAINTENANCE_ADMIN
  const canBypassMaintenance = isSuperAdmin || hasMaintenanceAdmin;
  
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
      // Okamžitá kontrola při mount/reload (detekuje údržbu ihned při F5)
      checkMaintenance();
      
      // Kontrola každých 20 minut (bylo 10 min - optimalizace 2026-06-23 phase 2)
      // Důvod: Reload stránky detekuje údržbu okamžitě (line výše)
      // Údržba se nemění často + uživatelé reloadují průměrně každých 10-20 min
      const interval = setInterval(checkMaintenance, 20 * 60 * 1000); // 20 minut
      
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
  
  // Pokud je údržba aktivní a uživatel NEMŮŽE obejít údržbu (není SUPERADMIN ani MAINTENANCE_ADMIN)
  if (maintenanceMode && isLoggedIn && !canBypassMaintenance) {
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
function RestoreLastRoute({ isLoggedIn, userId, user, token, username, hasPermission, userDetail, moduleSettings, moduleSettingsLoaded }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Save current location to localStorage only for menu routes
  useEffect(() => {
    if (isLoggedIn && location.pathname !== '/login' && location.pathname !== '/') {
      // Whitelist of routes that should be saved for restoration
      const validRoutes = [
        '/order-form-25',
        '/dashboard',
        '/orders25-list',
        '/orders25-list-v3',
        '/invoices25-list',
        '/annual-fees',
        '/users',
        '/dictionaries',
        '/profile',
        '/address-book',
        '/contacts',
        '/vema-denik',
        '/notifications',
        '/change-password',
        '/statistics',
        '/stats-reports',
        '/reports',
        '/orders',
        '/debug',
        '/cash-book',
        '/cerpani',
        '/majetek-overview',
        '/app-settings',
        '/organization-hierarchy',
        '/planning',
        '/help'
      ];

      if (validRoutes.includes(location.pathname) && userId) {
        // Per-user localStorage key
        localStorage.setItem(`app_lastRoute_user_${userId}`, location.pathname);
      }
    }
  }, [isLoggedIn, location.pathname, userId]);

  // Migrate old route paths
  useEffect(() => {
    // Cleanup: Odstranit starý globální klíč (migrace na per-user)
    const oldGlobalRoute = localStorage.getItem('app_lastRoute');
    if (oldGlobalRoute) {
      localStorage.removeItem('app_lastRoute');
    }
    
    const lastRoute = userId ? localStorage.getItem(`app_lastRoute_user_${userId}`) : null;
    if (lastRoute === '/statistics-new' && userId) {
      localStorage.setItem(`app_lastRoute_user_${userId}`, '/statistics');
    }
  }, []);

  // Restore last location only on initial load from root
  useEffect(() => {
    // 🚫 IMPERSONATION: Vynutit dashboard po přepnutí (přebije případné auto-navigace)
    if (sessionStorage.getItem('impersonation_force_dashboard') === 'true') {
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
        return;
      }
      // ✅ Jakmile jsme na dashboardu, flag smažeme
      sessionStorage.removeItem('impersonation_force_dashboard');
      return;
    }

    // 🚫 IMPERSONATION: Pokud probíhá přepnutí uživatele, NEPROVÁDĚT auto-routing!
    if (sessionStorage.getItem('impersonation_switching') === 'true') {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[App] Impersonation probíhá, auto-routing přeskočen.');
      }
      return;
    }
    
    // ⏳ KRITICKÉ: Počkat na načtení moduleSettings PŘED navigací
    if (isLoggedIn && location.pathname === '/' && moduleSettingsLoaded && userDetail) {
      let isCancelled = false;

      const runRedirectResolution = async () => {
      // 🔗 NOVINKA: Pokud má URL parametry (např. eventId=1&openPanel=true), NEPROVÁDĚT redirect!
      const searchParams = new URLSearchParams(location.search);
      const hasEventParams = searchParams.has('eventId') && searchParams.has('openPanel');
      
      if (hasEventParams) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[App] Deep-link parametry detekovány, přesměrování na /dashboard zachováno.');
        }
        if (isCancelled) return;
        navigate('/dashboard' + location.search, { replace: true });
        return;
      }
      
      // 🎨 PRIORITA:
      // 1) userSettings.vychozi_sekce_po_prihlaseni (pokud je vyplněná)
      // 2) lastRoute z localStorage
      // 3) dashboard
      
      const user_id = userId || user?.id;

      try {
        if (user_id) {
          const { loadSettingsFromLocalStorage, fetchUserSettings } = require('./services/userSettingsApi');

          // 1) nejdřív localStorage cache
          // 2) pokud chybí, dotáhni nastavení z backendu (zabrání race condition po loginu)
          let userSettings = loadSettingsFromLocalStorage(user_id);
          if (!userSettings && token && username) {
            userSettings = await fetchUserSettings({ token, username, userId: user_id });
          }
          
          // PRIORITA 1: userSettings.vychozi_sekce_po_prihlaseni (pro všechny uživatele)
          const vychoziSekce = extractPreferredSectionFromUserSettings(userSettings);
          
          if (vychoziSekce) {
            // ✅ SPRÁVNÉ MAPOVÁNÍ: Podle availableSections.js
            const sectionMap = {
              'address-book': '/address-book',
              'contacts': '/contacts',
              'vema-denik': '/vema-denik',
              'dictionaries': '/dictionaries',
              'debug': '/debug',
              'suppliers': '/address-book', // Dodavatelé jsou v adresáři (alias)
              'notifications': '/notifications',
              'orders': '/orders25-list', // Legacy hodnota ve starších user settings
              'orders-old': '/orders', // Staré objednávky před 2026
              'reports': '/reports',
              'statistics': '/statistics',
              'stats-reports': '/stats-reports',
              'cerpani': '/cerpani',
              'material-overview': '/majetek-overview',
              'majetek-overview': '/majetek-overview',
              'app-settings': '/app-settings',
              'organization-hierarchy': '/organization-hierarchy',
              'planning': '/planning',
              'cash-book': '/cash-book',
              'profile': '/profile',
              'orders25-list': '/orders25-list',
              'orders25-list-v3': '/orders25-list-v3', // Objednávky V3 (BETA)
              'annual-fees': '/annual-fees', // Roční poplatky (BETA)
              'invoices25-list': '/invoices25-list',
              'users': '/users',
              'help': '/help', // Nápověda a manuály
              'dashboard': '/dashboard' // Nový dashboard
            };
            
            const targetSectionRaw = vychoziSekce;
            const targetSection = (typeof targetSectionRaw === 'object' && targetSectionRaw?.value)
              ? targetSectionRaw.value
              : targetSectionRaw;
            const targetRoute = sectionMap[targetSection];
            const sectionForAvailability = targetSection === 'orders' ? 'orders25-list' : targetSection;

            const { isSectionAvailable } = require('./utils/availableSections');
            const isAvailable = targetSection === 'dashboard'
              ? true
              : isSectionAvailable(sectionForAvailability, hasPermission, userDetail);

            if (targetRoute && isAvailable) {
              // ✅ User settings sekce JE vyplněná, mapovatelná a dostupná → použij ji (NEJVYŠŠÍ PRIORITA)
              if (isCancelled) return;
              navigate(targetRoute, { replace: true });
              return;
            } else {
              console.warn('⚠️ User settings sekce není dostupná nebo mapovatelná:', targetSection);
              // Pokračuj na PRIORITU 2 (lastRoute)
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Chyba při načítání user settings:', error);
      }

      // PRIORITA 2: lastRoute per-user
      // ⚠️ VALIDACE: Ignoruj neplatné nebo problematické cesty
      const lastRoute = user_id ? localStorage.getItem(`app_lastRoute_user_${user_id}`) : null;
      const invalidRoutes = ['/orders-list-new', '/login', '/logout', '/', ''];
      const routeToSectionMap = {
        '/dashboard': 'dashboard',
        '/orders25-list': 'orders25-list',
        '/orders25-list-v3': 'orders25-list-v3',
        '/orders': 'orders-old',
        '/annual-fees': 'annual-fees',
        '/invoices25-list': 'invoices25-list',
        '/stats-reports': 'stats-reports',
        '/statistics': 'stats-reports',
        '/reports': 'stats-reports',
        '/cerpani': 'cerpani',
        '/majetek-overview': 'majetek-overview',
        '/material-overview': 'majetek-overview',
        '/address-book': 'address-book',
        '/contacts': 'contacts',
        '/vema-denik': 'vema-denik',
        '/dictionaries': 'dictionaries',
        '/users': 'users',
        '/app-settings': 'app-settings',
        '/organization-hierarchy': 'organization-hierarchy',
        '/planning': 'planning',
        '/cash-book': 'cash-book',
        '/profile': 'profile',
        '/help': 'help',
        '/notifications': 'notifications'
      };
      
      if (lastRoute && !invalidRoutes.includes(lastRoute)) {
        // ✅ BEZPEČNÉ: Validuj že route začíná s '/' a neobsahuje podezřelé znaky
        if (lastRoute.startsWith('/') && !/[<>{}]/.test(lastRoute)) {
          try {
            const { isSectionAvailable } = require('./utils/availableSections');
            const mappedSection = routeToSectionMap[lastRoute];
            const isRouteAvailable = mappedSection
              ? isSectionAvailable(mappedSection, hasPermission, userDetail)
              : true;

            if (!isRouteAvailable) {
              console.warn('⚠️ LastRoute není dostupná podle práv/modulů:', lastRoute);
            } else {
            console.log('✅ PRIORITA 2: Použita lastRoute:', lastRoute);
            if (isCancelled) return;
            navigate(lastRoute, { replace: true });
            return;
            }
          } catch (navError) {
            console.warn('⚠️ Chyba při navigaci na lastRoute:', lastRoute, navError);
            // Pokračuj na PRIORITU 3 (dashboard)
          }
        }
      }

      // PRIORITA 3: dashboard (požadovaný výchozí fallback)
      if (isCancelled) return;
      navigate('/dashboard', { replace: true });
      };

      runRedirectResolution();

      return () => {
        isCancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, navigate, location.pathname, moduleSettingsLoaded, location.search, token, username, userId, user, userDetail, hasPermission]);

  return null;
}

function App() {
  const { isMobile } = useDevice();
  const { isLoggedIn, loading, hasPermission, hasAdminRole, token, username, logout, setToken, userDetail, user_id, user, expandedPermissions, setIsRefreshingToken } = useContext(AuthContext); // Use isLoggedIn, loading, hasPermission, hasAdminRole, token, username, setToken, userDetail, user_id, user, setIsRefreshingToken from AuthContext
  const { showToast } = useContext(ToastContext) || {};
  const bgTasksContext = useBgTasksContext();
  const exchangeRatesContext = useExchangeRates(); // ← Nový context pro směnné kurzy

  // 🎛️ Module visibility settings - načítá se při loginu (MUSÍ BÝT PŘED RestoreLastRoute!)
  const [moduleSettings, setModuleSettings] = useState({
    module_orders_visible: true,
    module_orders_old_visible: true,
    module_orders_v3_visible: false,
    module_invoices_visible: true,
    module_annual_fees_visible: true,
    module_assets_visible: true,
    module_contacts_visible: true,
    module_stats_reports_visible: true,
    module_cerpani_visible: true,
    module_default_homepage: 'orders25-list' // 'orders25-list' nebo 'orders25-list-v3'
  });
  const [moduleSettingsLoaded, setModuleSettingsLoaded] = useState(false);

  // 🔔 POST-LOGIN MODAL: State pro modal dialog po přihlášení
  const [postLoginModal, setPostLoginModal] = React.useState({
    isOpen: false,
    config: null,
    fromPasswordChange: false // 🔑 Flag pokud modal přišel po změně hesla
  });

  // � HIGH PRIORITY NOTIFICATION: State pro high priority popup modal
  const [highPriorityNotif, setHighPriorityNotif] = React.useState(null);

  // �🔄 VERSION CHECKER: Automatická detekce nové verze aplikace
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [updateData, setUpdateData] = React.useState(null);
  const [runtimeChunkError, setRuntimeChunkError] = React.useState(null);
  
  // ✅ useCallback pro stabilní referenci (zabránění re-creation checkeru)
  const handleVersionUpdate = React.useCallback((versionData) => {
    setUpdateData(versionData);
    setUpdateAvailable(true);
    
    // Optional: Toast notifikace
    if (showToast) {
      showToast(`Je dostupná nová verze aplikace ${versionData.version || APP_VERSION}`, {
        type: 'info',
        autoClose: 8000
      });
    }
  }, [showToast]);
  
  const versionChecker = useVersionChecker({
    enabled: true,
    checkInterval: 10 * 60 * 1000, // 10 minut
    gracePeriod: 10 * 1000, // 10 sekund po načtení
    onUpdate: handleVersionUpdate // ✅ Stabilní reference
  });

  useEffect(() => {
    if (!isLoggedIn) return;

    versionChecker.checkNow({ force: true });
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleRuntimeError = (event) => {
      const error = event.reason || event.error || event.message;

      if (!isChunkLoadError(error)) {
        return;
      }

      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      try {
        localStorage.removeItem('app_build_hash');
      } catch (storageError) {
        // Ignore storage errors during recovery.
      }

      setRuntimeChunkError(error);
    };

    window.addEventListener('unhandledrejection', handleRuntimeError);
    window.addEventListener('error', handleRuntimeError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRuntimeError);
      window.removeEventListener('error', handleRuntimeError);
    };
  }, []);

  const handleCloseUpdateModal = () => {
    setUpdateAvailable(false);
  };

  const handleUpdateApp = () => {
    clearBuildHashAndReload();
  };

  // 🔐 ČERPÁNÍ: Přístupová matice + scope (all/own) pro jednotlivá ouška
  const cerpaniAccessMode = React.useMemo(() => {
    if (!isLoggedIn) return null;

    const perms = Array.isArray(expandedPermissions)
      ? expandedPermissions.map((p) => String(p || '').toUpperCase())
      : [];

    const hasPerm = (code) =>
      perms.includes(String(code || '').toUpperCase()) ||
      (typeof hasPermission === 'function' && hasPermission(code));

    const hasLpToken = (perm) => /(^|_)LP(_|$)/.test(perm);

    const hasAnyPermLike = (matcher) => perms.some((perm) => matcher(perm));

    const isAdminOrManage =
      (typeof hasAdminRole === 'function' && hasAdminRole()) ||
      hasPerm('SPEDNIG_MANAGE') ||
      hasPerm('SPNDING_MANAGE') ||
      hasPerm('SPENDING_MANAGE') ||
      hasPerm('LP_MANAGE') ||
      hasPerm('CONTRACT_MANAGE');

    if (isAdminOrManage) {
      return {
        mode: 'all',
        contractsUnrestricted: true,
        lpUnrestricted: true,
      };
    }

    const hasGlobalViewAll =
      hasPerm('SPEDNIG_VIEW_ALL') || hasPerm('SPNDING_VIEW_ALL') || hasPerm('SPEDNING_VIEW_ALL') || 
      hasPerm('SPENDING_CONTRACT_VIEW_ALL') || hasPerm('SPENDING_LP_VIEW_ALL') || hasPerm('CERPANI_VIEW_ALL');
    const hasGlobalViewOwn =
      hasPerm('SPEDNIG_VIEW_OWN') || hasPerm('SPNDING_VIEW_OWN') || hasPerm('SPEDNING_VIEW_OWN') || 
      hasPerm('SPENDING_CONTRACT_VIEW_OWN') || hasPerm('SPENDING_LP_VIEW_OWN') || hasPerm('CERPANI_VIEW_OWN');

    const hasContractViewAll =
      hasPerm('CONTRACT_VIEW_ALL') ||
      hasAnyPermLike((perm) => perm.endsWith('_VIEW_ALL') && (perm.includes('SMLOUV') || perm.includes('CONTRACT')));

    const hasContractViewOwn =
      hasPerm('CONTRACT_VIEW_OWN') || hasPerm('CONTRACT_VIEW') ||
      hasAnyPermLike((perm) => {
        const isViewScope = perm.endsWith('_VIEW_OWN') || perm.endsWith('_VIEW');
        return isViewScope && (perm.includes('SMLOUV') || perm.includes('CONTRACT'));
      });

    const hasLpViewAll =
      hasPerm('LP_VIEW_ALL') ||
      hasAnyPermLike((perm) => perm.endsWith('_VIEW_ALL') && (
        hasLpToken(perm) ||
        perm.includes('LIMIT') ||
        perm.includes('PRISLIB')
      ));

    const hasLpViewOwn =
      hasPerm('LP_VIEW_OWN') || hasPerm('LP_VIEW') ||
      hasAnyPermLike((perm) => {
        const isViewScope = perm.endsWith('_VIEW_OWN') || perm.endsWith('_VIEW');
        return isViewScope && (
          hasLpToken(perm) ||
          perm.includes('LIMIT') ||
          perm.includes('PRISLIB')
        );
      });

    const canContracts = hasGlobalViewAll || hasGlobalViewOwn || hasContractViewAll || hasContractViewOwn;
    const canLp = hasGlobalViewAll || hasGlobalViewOwn || hasLpViewAll || hasLpViewOwn;

    if (!canContracts && !canLp) {
      return null;
    }

    return {
      mode: canContracts && canLp ? 'all' : (canContracts ? 'contracts' : 'lp'),
      contractsUnrestricted: hasGlobalViewAll || hasContractViewAll,
      lpUnrestricted: hasGlobalViewAll || hasLpViewAll,
      // VIEW_OWN bez VIEW_ALL/MANAGE → vidí jen LP ze kterých osobně čerpal
      lpViewOwnOnly: hasLpViewOwn && !hasGlobalViewAll && !hasLpViewAll,
    };
  }, [isLoggedIn, expandedPermissions, hasAdminRole, hasPermission]);

  // ✅ KRITICKÉ: Stabilní reference na bgTasks - vytvoří se POUZE JEDNOU
  const bgTasksConfigRef = useRef({ trackState: false });
  const bgTasks = useBackgroundTasks(bgTasksConfigRef.current);
  const bgTasksRef = useRef(bgTasks);
  useEffect(() => {
    bgTasksRef.current = bgTasks;
  }, [bgTasks]);

  // Načíst module settings po přihlášení
  useEffect(() => {
    if (!isLoggedIn || !token || !username) {
      // 🔄 RESET: Při logout resetovat flag aby se znovu načetly při dalším login
      setModuleSettingsLoaded(false);
      return;
    }

    const loadModuleSettings = async () => {
      try {
        const settings = await getGlobalSettings(token, username);
        const moduleSettingsData = {
          module_orders_visible: settings.module_orders_visible ?? true,
          module_orders_old_visible: settings.module_orders_old_visible ?? true,
          module_orders_v3_visible: settings.module_orders_v3_visible ?? false,
          module_invoices_visible: settings.module_invoices_visible ?? true,
          module_annual_fees_visible: settings.module_annual_fees_visible ?? true,
          module_assets_visible: settings.module_assets_visible ?? true,
          module_contacts_visible: settings.module_contacts_visible ?? true,
          module_stats_reports_visible: settings.module_stats_reports_visible ?? true,
          module_cerpani_visible: settings.module_cerpani_visible ?? true,
          module_default_homepage: settings.module_default_homepage ?? 'orders25-list'
        };
        setModuleSettings(moduleSettingsData);
        // 💾 Uložit do localStorage pro sync přístup (NotFound, AccessDenied)
        try {
          localStorage.setItem('app_moduleSettings', JSON.stringify(moduleSettingsData));
        } catch (storageError) {
          console.warn('⚠️ Nelze uložit module settings do localStorage:', storageError);
        }
        // ✅ KRITICKÉ: Nastavit flag že settings jsou načtené
        setModuleSettingsLoaded(true);
      } catch (error) {
        console.error('❌ Chyba při načítání module settings:', error);
        // I při chybě nastavit flag aby se RestoreLastRoute neblokoval
        setModuleSettingsLoaded(true);
      }
    };

    loadModuleSettings();
  }, [isLoggedIn, token, username]);

  // ✅ TOKEN AUTO-REFRESH: Callback pro automatickou aktualizaci tokenu
  const handleTokenRefresh = useCallback(async (newToken) => {
    try {
      setIsRefreshingToken(true);
      
      // KRITICKÉ: Uložit token SYNCHRONNĚ před nastavením state
      const { saveAuthData } = await import('./utils/authStorage');
      await saveAuthData.token(newToken);
      
      // Pak teprve aktualizovat state
      setToken(newToken);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Token byl úspěšně refreshnut a uložen');
      }
    } catch (error) {
      console.error('❌ Chyba při ukládání nového tokenu:', error);
    } finally {
      // Počkat chvíli před zrušením flagu (aby probíhající API calls stihly použít nový token)
      setTimeout(() => setIsRefreshingToken(false), 500);
    }
  }, [setToken, setIsRefreshingToken]);

  // 💓 User activity tracking:
  // - Keepalive ping každých 5 minut (BEZ validace, jen "user is alive")  
  // - Activity update každou 1 hodinu (S možností token refresh)
  // - Manual triggers při login/save operacích
  // ✅ Nyní předává handleTokenRefresh pro automatický refresh tokenu
  const { triggerActivity } = useUserActivity(token, username, handleTokenRefresh);

  // Stabilní reference na context pro background tasks (zamezí re-registraci)
  const bgTasksContextRef = useRef(bgTasksContext);
  useEffect(() => {
    bgTasksContextRef.current = bgTasksContext;
  }, [bgTasksContext]);

  // 🚫 CRITICAL: Track jestli už byly tasky zaregistrovány (zamezí infinite loop)
  const tasksRegisteredRef = useRef(false);
  const authErrorLogoutScheduledRef = useRef(false);
  const authErrorLogoutTimerRef = useRef(null);

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
      if (!isLoggedIn || authErrorLogoutScheduledRef.current) {
        return;
      }

      authErrorLogoutScheduledRef.current = true;
      const message = event.detail?.message || 'Vaše přihlášení vypršelo. Budete přesměrováni na přihlašovací stránku.';

      // 🎯 KRITICKÉ: Toast notifikace
      if (showToast) {
        showToast(message, { type: 'error' });
      }

      // ⏱️ Po 1.5 sekundách odhlásit
      authErrorLogoutTimerRef.current = setTimeout(() => {
        if (logout) {
          window.__erdmsAuthLogoutInProgress = true;
          logout('token_expired');
        }
      }, 1500);
    };

    window.addEventListener('authError', handleAuthError);
    return () => {
      window.removeEventListener('authError', handleAuthError);
      if (authErrorLogoutTimerRef.current) {
        clearTimeout(authErrorLogoutTimerRef.current);
        authErrorLogoutTimerRef.current = null;
      }
    };
  }, [showToast, logout, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      authErrorLogoutScheduledRef.current = false;
      window.__erdmsAuthLogoutInProgress = false;
    }
  }, [isLoggedIn]);

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

  // 🔔 Post-login modal handler
  useEffect(() => {
    const handlePostLoginModal = (event) => {
      const modalConfig = event.detail;
      
      if (modalConfig && modalConfig.enabled) {
        setPostLoginModal({
          isOpen: true,
          config: modalConfig,
          fromPasswordChange: modalConfig.fromPasswordChange || false // 🔑 Zachytit flag
        });
      }
    };

    window.addEventListener('show-post-login-modal', handlePostLoginModal);
    return () => window.removeEventListener('show-post-login-modal', handlePostLoginModal);
  }, []);

  // 🚨 HIGH PRIORITY NOTIFICATION: Handler pro high priority popup modal
  useEffect(() => {
    if (!bgTasksContext?.registerNewNotificationsCallback) {
      return;
    }

    const handleNewNotifications = (notifications, unreadCount) => {
      if (!notifications || notifications.length === 0) {
        return;
      }

      // 🔍 Filtruj high priority nepřečtené notifikace
      const highPriorityNotifs = notifications.filter(n =>
        n.precteno === false &&
        (
          (n.priorita || '').toLowerCase() === 'high' ||
          (n.priorita || '').toLowerCase() === 'urgent'
        )
      );

      if (highPriorityNotifs.length > 0) {
        // Zobraz první high priority notifikaci
        const notification = highPriorityNotifs[0];

        // Parsuj data z notifikace
        let notifData = {};
        try {
          notifData = typeof notification.data === 'string'
            ? JSON.parse(notification.data)
            : (notification.data || {});
        } catch (e) {
          notifData = notification.data || {};
        }

        // Parsuj placeholder_data
        let placeholderData = {};
        try {
          placeholderData = typeof notification.placeholder_data === 'string'
            ? JSON.parse(notification.placeholder_data)
            : (notification.placeholder_data || {});
        } catch (e) {
          placeholderData = notification.placeholder_data || {};
        }

        // 🎯 Vytvoř objekt kompatibilní s HighPriorityNotificationModal
        setHighPriorityNotif({
          id: notification.id,
          nadpis: notification.titulek || notification.nadpis || 'Důležitá zpráva',
          zprava: notification.zprava || '',
          priorita: notification.priorita || 'high',
          dt_created: notification.vytvoren_kdy || notification.dt_created || new Date().toISOString(),
          typ: notification.typ || 'ADMIN_MESSAGE',
          from_user_name: notification.from_user_name || placeholderData.sender_name || notifData.sender_name || null,
          data_json: {
            placeholder_data: {
              sender_name: notification.from_user_name || placeholderData.sender_name || notifData.sender_name || null,
              sender_username: placeholderData.sender_username || notifData.sender_username || null
            }
          }
        });
      }

      // ✅ Refresh dashboardu pokud je aktivní (tichý reload dat)
      if (bgTasksContext?.triggerDashboardRefresh) {
        bgTasksContext.triggerDashboardRefresh();
      }
    };

    bgTasksContext.registerNewNotificationsCallback(handleNewNotifications);

    return () => {
      bgTasksContext.registerNewNotificationsCallback?.(null);
    };
  }, [bgTasksContext]);

  // Registrace background tasks po přihlášení
  useEffect(() => {
    if (!isLoggedIn || !bgTasksRef.current) {
      // Reset registrace při odhlášení
      tasksRegisteredRef.current = false;
      return;
    }

    const bgTasksInstance = bgTasksRef.current;

    // 🚫 CRITICAL: Zamezení infinite loop
    // Původně se tasky registrovaly pouze jednou. To ale znamená, že v dlouhé session
    // (bez logout/login) se nově přidaný task nemusí zaregistrovat.
    // Řešení: když už jsou tasky registrované, ověř, že existuje i nový task a případně ho doplň.
    if (tasksRegisteredRef.current) {
      try {
        const existing = bgTasksInstance?.service?.getTasksInfo?.() || [];
        const hasOrdersV3 = existing.some(t => t?.name === 'autoRefreshOrdersV3');
        const hasInvoices = existing.some(t => t?.name === 'autoRefreshInvoices');
        if (!hasOrdersV3 || !hasInvoices) {
          const tasks = createStandardTasks({
            onOrdersRefreshed: (ordersData) => {
              const ctx = bgTasksContextRef.current;
              if (ctx?.triggerOrdersRefresh) {
                ctx.triggerOrdersRefresh(ordersData);
              }
            },
            onOrdersV3AutoRefresh: async () => {
              const ctx = bgTasksContextRef.current;
              if (ctx?.triggerOrdersV3Refresh) {
                return await ctx.triggerOrdersV3Refresh();
              }
              return undefined;
            },
            onInvoicesAutoRefresh: async () => {
              const ctx = bgTasksContextRef.current;
              if (ctx?.triggerInvoicesRefresh) {
                return await ctx.triggerInvoicesRefresh();
              }
              return undefined;
            },
            getCurrentFilters: () => {
              const ctx = bgTasksContextRef.current;
              if (ctx?.getCurrentFilters) {
                return ctx.getCurrentFilters();
              }
              return {};
            },
            onUnreadCountChange: (count, badgeColor) => {
              const ctx = bgTasksContextRef.current;
              if (ctx?.handleUnreadCountChange) {
                ctx.handleUnreadCountChange(count, badgeColor);
              }
            },
            onNewNotifications: (notifications, unreadCount) => {
              const ctx = bgTasksContextRef.current;
              if (ctx?.handleNewNotifications) {
                ctx.handleNewNotifications(notifications, unreadCount);
              }
            },
            onExchangeRatesUpdated: (rates) => {
              if (exchangeRatesContext?.updateRates) {
                exchangeRatesContext.updateRates(rates);
              }
            }
          });

          const missingTaskNames = [];
          if (!hasOrdersV3) missingTaskNames.push('autoRefreshOrdersV3');
          if (!hasInvoices) missingTaskNames.push('autoRefreshInvoices');

          // Zaregistruj pouze chybějící tasky (BackgroundTaskService deduplikuje podle jména)
          tasks.forEach(taskConfig => {
            if (missingTaskNames.includes(taskConfig?.name)) {
              bgTasksInstance.register(taskConfig);
            }
          });
        }
      } catch (_) {
        // Tichá ochrana
      }
      return;
    }

    // Vytvoření standardních tasků s callbacky
    const tasks = createStandardTasks({
      // Callback pro refresh objednávek
      onOrdersRefreshed: (ordersData) => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.triggerOrdersRefresh) {
          ctx.triggerOrdersRefresh(ordersData);
        }
      },

      // Callback pro Orders V3 auto-refresh (tichý refresh v komponentě)
      onOrdersV3AutoRefresh: async () => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.triggerOrdersV3Refresh) {
          return await ctx.triggerOrdersV3Refresh();
        }
        return undefined;
      },

      // Callback pro invoices auto-refresh (tichý refresh v komponentě)
      onInvoicesAutoRefresh: async () => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.triggerInvoicesRefresh) {
          return await ctx.triggerInvoicesRefresh();
        }
        return undefined;
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
      onUnreadCountChange: (count, badgeColor) => {
        const ctx = bgTasksContextRef.current;
        if (ctx?.handleUnreadCountChange) {
          ctx.handleUnreadCountChange(count, badgeColor);
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
        console.error(`Error registering task ${taskConfig.name}:`, error);
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

  // 🔔 POST-LOGIN MODAL: Handler funkce
  const handleClosePostLoginModal = async () => {
    const wasFromPasswordChange = postLoginModal.fromPasswordChange;
    
    setPostLoginModal({
      isOpen: false,
      config: null,
      fromPasswordChange: false
    });
    
    // 🔄 RELOAD po zavření modalu pokud přišel po změně hesla
    if (wasFromPasswordChange) {
      setTimeout(() => {
        const basePath = process.env.PUBLIC_URL || '/eeo-v2';
        window.location.href = basePath + '/';
      }, 300); // Krátké zpoždění pro hladší přechod
    }
  };

  const handleDontShowAgainPostLoginModal = async () => {
    const { config } = postLoginModal;
    
    if (config?.modalGuid && user_id) {
      // Uložit do localStorage, že uživatel nechce modal zobrazovat
      const { dismissModalForUser } = await import('./services/postLoginModalService');
      dismissModalForUser(user_id, config.modalGuid);
    } else {
      console.warn('❌ Chybí modalGuid nebo user_id!', { 
        modalGuid: config?.modalGuid, 
        user_id: user_id,
        hasConfig: !!config,
        hasModalGuid: !!(config?.modalGuid),
        hasUserId: !!user_id
      });
    }
    
    // Zavřít modal
    handleClosePostLoginModal();
  };

  // 🚨 HIGH PRIORITY NOTIFICATION: Handler pro zavření high priority modalu
  const handleCloseHighPriorityNotif = async () => {
    if (highPriorityNotif?.id) {
      try {
        // Dynamický import pro markNotificationAsRead
        const { markNotificationAsRead } = await import('./services/notificationsApi');
        await markNotificationAsRead(highPriorityNotif.id);
      } catch (error) {
        console.error('❌ Chyba při označování notifikace jako přečtené:', error);
      }
    }
    setHighPriorityNotif(null);
  };

  // NOTE: navigate/useLocation must be called inside Router context. We render
  // a small child component inside the Router below to perform the restore.
  // If auth initialization is still in progress, don't mount the Router/routes.
  // This avoids a premature redirect to /login when a stored token is being validated
  // and preserves current location (so refresh on /orders-new doesn't lose the form).
  // 🎯 OPTIMALIZACE: Žádný splash screen při reload - pouze při cold start (viz index.js)
  if (loading) {
    return <RouteLoadingFallback />; // Zobrazit lightweight loader místo bílé stránky
  }

  // Self-healing: pokud je app otevřena bez PUBLIC_URL prefixu, oprav URL dříve než se mountne Router.
  const routerBase = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  if (routerBase && typeof window !== 'undefined') {
    const currentPath = window.location.pathname || '/';
    const hasBase = currentPath === routerBase || currentPath.startsWith(`${routerBase}/`);

    if (!hasBase) {
      const fixedUrl = `${routerBase}${currentPath}${window.location.search || ''}${window.location.hash || ''}`;
      window.location.replace(fixedUrl);
      return null;
    }
  }

  // 📱 MOBILE VERSION: Pokud je zařízení mobilní, zobrazí se mobilní verze
  if (isMobile) {
    return (
      <Router basename={process.env.PUBLIC_URL || ''}>
        <AppErrorBoundary>
          {runtimeChunkError ? (
            <AppReloadRequired error={runtimeChunkError} />
          ) : (
            <Suspense fallback={<RouteLoadingFallback />}>
              {!isLoggedIn ? (
                <MobileLoginPage />
              ) : (
                <MobileDashboard />
              )}
            </Suspense>
          )}
        </AppErrorBoundary>
      </Router>
    );
  }

  // 🖥️ DESKTOP VERSION
  return (
    <ActivityProvider triggerActivity={triggerActivity}>
      <Router basename={process.env.PUBLIC_URL || ''}>
        <AppErrorBoundary>
          {runtimeChunkError ? (
            <AppReloadRequired error={runtimeChunkError} />
          ) : (
            <>
              <MaintenanceModeWrapper isLoggedIn={isLoggedIn} userDetail={userDetail}>
                <AppShell>
                  <Layout>
                    {/* Logout redirect listener */}
                    <LogoutRedirectListener isLoggedIn={isLoggedIn} />
                    {/* Run restore after Layout mounts so it has a chance to persist the current location first */}
                    <RestoreLastRoute isLoggedIn={isLoggedIn} userId={user_id} user={user} token={token} username={username} hasPermission={hasPermission} userDetail={userDetail} moduleSettings={moduleSettings} moduleSettingsLoaded={moduleSettingsLoaded} />
                    <AppErrorBoundary>
                      <Suspense fallback={<RouteLoadingFallback />}>
                        <Routes>
                  {!isLoggedIn && <Route path="*" element={<NavigateToLoginWithQuery />} />}
                  <Route
                    path="/login"
                    element={isLoggedIn ? <NavigateAfterLogin /> : <Login />}
                  />
                  {/* Root route "/" is handled by RestoreLastRoute component */}
                  {isLoggedIn && <Route path="/" element={<div style={{display:'none'}} />} />}

                  {isLoggedIn && hasPermission && (
                    hasPermission('ORDER_MANAGE') || hasPermission('ORDER_OLD')
                  ) && (
                    moduleSettings.module_orders_old_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/orders" element={<Orders />} />}

                  {/* 📋 Objednávky - pokud disabled → jen admin/BETA_TESTER */}
                  {isLoggedIn && hasPermission && (
                    hasPermission('ORDER_MANAGE') ||
                    hasPermission('ORDER_READ_ALL') || hasPermission('ORDER_VIEW_ALL') || hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_DELETE_ALL') ||
                    hasPermission('ORDER_READ_OWN') || hasPermission('ORDER_VIEW_OWN') || hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_DELETE_OWN')
                  ) && (
                    moduleSettings.module_orders_visible || 
                    (hasAdminRole && hasAdminRole()) || 
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/orders25-list" element={<Orders25List />} />}
                  {/* 🚀 V3 - BETA: Pokud disabled → jen admin/BETA_TESTER, pokud enabled → stejná práva jako Orders25List */}
                  {isLoggedIn && hasPermission && (
                    hasPermission('ORDER_MANAGE') ||
                    hasPermission('ORDER_READ_ALL') || hasPermission('ORDER_VIEW_ALL') || hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_DELETE_ALL') ||
                    hasPermission('ORDER_READ_OWN') || hasPermission('ORDER_VIEW_OWN') || hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_DELETE_OWN')
                  ) && (
                    moduleSettings.module_orders_v3_visible || 
                    (hasAdminRole && hasAdminRole()) || 
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/orders25-list-v3" element={<Orders25ListV3 />} />}
                  {/* 💰 BETA: Evidence ročních poplatků - pokud disabled → jen admin/BETA_TESTER */}
                  {isLoggedIn && hasPermission && (
                    hasPermission('ANNUAL_FEES_MANAGE') ||
                    hasPermission('ANNUAL_FEES_VIEW') ||
                    hasPermission('ANNUAL_FEES_CREATE') ||
                    hasPermission('ANNUAL_FEES_EDIT') ||
                    hasPermission('ADMIN')
                  ) && (
                    moduleSettings.module_annual_fees_visible || 
                    (hasAdminRole && hasAdminRole()) || 
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/annual-fees" element={<AnnualFeesPage />} />}
                  {/* 📄 Faktury - pokud disabled → jen admin/BETA_TESTER */}
                  {isLoggedIn && (
                    moduleSettings.module_invoices_visible || 
                    (hasAdminRole && hasAdminRole()) || 
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/invoices25-list" element={<Invoices25List />} />}
                  {isLoggedIn && <Route path="/invoice-evidence/:orderId?" element={<InvoiceEvidencePage />} />}
                  {isLoggedIn && <Route path="/order-form-25" element={<OrderForm25 />} />}
                  {isLoggedIn && hasPermission && (hasPermission('USER_VIEW') || hasPermission('USER_MANAGE')) && <Route path="/users" element={<Users />} />}
                  {isLoggedIn && hasPermission && (
                    hasAdminRole() ||
                    hasPermission('DICT_MANAGE') ||
                    hasPermission('LOCATIONS_VIEW') || hasPermission('LOCATIONS_CREATE') || hasPermission('LOCATIONS_EDIT') || hasPermission('LOCATIONS_DELETE') ||
                    hasPermission('POSITIONS_VIEW') || hasPermission('POSITIONS_CREATE') || hasPermission('POSITIONS_EDIT') || hasPermission('POSITIONS_DELETE') ||
                    hasPermission('CONTRACT_VIEW') || hasPermission('CONTRACT_CREATE') || hasPermission('CONTRACT_EDIT') || hasPermission('CONTRACT_DELETE') ||
                    hasPermission('ORGANIZATIONS_VIEW') || hasPermission('ORGANIZATIONS_CREATE') || hasPermission('ORGANIZATIONS_EDIT') || hasPermission('ORGANIZATIONS_DELETE') ||
                    hasPermission('DEPARTMENTS_VIEW') || hasPermission('DEPARTMENTS_CREATE') || hasPermission('DEPARTMENTS_EDIT') || hasPermission('DEPARTMENTS_DELETE') ||
                    hasPermission('STATES_VIEW') || hasPermission('STATES_CREATE') || hasPermission('STATES_EDIT') || hasPermission('STATES_DELETE') ||
                    hasPermission('ROLES_VIEW') || hasPermission('ROLES_CREATE') || hasPermission('ROLES_EDIT') || hasPermission('ROLES_DELETE') ||
                    hasPermission('PERMISSIONS_VIEW') || hasPermission('PERMISSIONS_CREATE') || hasPermission('PERMISSIONS_EDIT') || hasPermission('PERMISSIONS_DELETE') ||
                    hasPermission('DOCX_TEMPLATES_VIEW') || hasPermission('DOCX_TEMPLATES_CREATE') || hasPermission('DOCX_TEMPLATES_EDIT') || hasPermission('DOCX_TEMPLATES_DELETE') ||
                    hasPermission('CASH_BOOKS_VIEW') || hasPermission('CASH_BOOKS_CREATE') || hasPermission('CASH_BOOKS_EDIT') || hasPermission('CASH_BOOKS_DELETE')
                  ) && <Route path="/dictionaries" element={<DictionariesNew />} />}
                  {isLoggedIn && hasAdminRole && hasAdminRole() && <Route path="/reports-old" element={<ReportsPlaceholder />} />}
                  {isLoggedIn && (
                    moduleSettings.module_cerpani_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/cerpani" element={
                    cerpaniAccessMode
                      ? <CerpaniPage
                          mode={cerpaniAccessMode.mode}
                          contractsUnrestricted={cerpaniAccessMode.contractsUnrestricted}
                          lpUnrestricted={cerpaniAccessMode.lpUnrestricted}
                          lpViewOwnOnly={cerpaniAccessMode.lpViewOwnOnly || false}
                        />
                        : <Navigate to="/access-denied" replace />
                      } />}
                  {/* Staré routes /reports a /statistics → přesměrování na nový modul */}
                  {isLoggedIn && <Route path="/reports" element={<Navigate to="/stats-reports" replace />} />}
                  {isLoggedIn && <Route path="/statistics" element={<Navigate to="/stats-reports" replace />} />}
                  {isLoggedIn && (
                    moduleSettings.module_stats_reports_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && (
                      hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE') ||
                      hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') ||
                      hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE') ||
                      hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE') ||
                      hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE') ||
                      hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE') ||
                      hasPermission('STATS_SPENDING_VIEW') || hasPermission('STATS_SPENDING_EDIT') || hasPermission('STATS_SPENDING_MANAGE') ||
                      hasPermission('CASHBOOK_REPORTS_VIEW') || hasPermission('CASHBOOK_REPORTS_MANAGE') || hasPermission('CASHBOOK_REPORTS_EXPORT') ||
                      hasPermission('DEFERRALS_VIEW') || hasPermission('DEFERRALS_EDIT') || hasPermission('DEFERRALS_MANAGE')
                    ))
                  ) && <Route path="/stats-reports" element={<StatsReportsPage />} />}
                  {isLoggedIn && (
                    moduleSettings.module_assets_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && (
                      hasPermission('ASSET_VIEW') || hasPermission('ASSET_MANAGE') || hasPermission('ASSET_EXPORT')
                    ))
                  ) && <Route path="/majetek-overview" element={<MajetekOverviewPage />} />}
                  {isLoggedIn && (
                    moduleSettings.module_assets_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && (
                      hasPermission('ASSET_VIEW') || hasPermission('ASSET_MANAGE') || hasPermission('ASSET_EXPORT')
                    ))
                  ) && <Route path="/material-overview" element={<Navigate to="/majetek-overview" replace />} />}
                  {isLoggedIn && hasAdminRole && hasAdminRole() && <Route path="/app-settings" element={<AppSettings />} />}
                  {isLoggedIn && hasAdminRole && hasAdminRole() && <Route path="/admin/audit-log" element={<AuditLogPage />} />}
                  {isLoggedIn && hasPermission && hasPermission('SUPERADMIN') && <Route path="/organization-hierarchy" element={<OrganizationHierarchy />} />}
                  {isLoggedIn && hasPermission && hasPermission('PLANNING_MANAGE') && <Route path="/planning" element={<PlanningAdminPage />} />}
                  {isLoggedIn && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && (
                      hasPermission('SUPPLIER_MANAGE') || hasPermission('SUPPLIER_VIEW') || 
                      hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_CREATE') ||
                      hasPermission('PHONEBOOK_MANAGE')
                    ))
                  ) && <Route path="/address-book" element={<AddressBookPage />} />}
                  {isLoggedIn && (
                    moduleSettings.module_contacts_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) && <Route path="/contacts" element={<ContactsPage />} />}
                  {isLoggedIn && (
                    moduleSettings.module_contacts_visible ||
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('VEMA_VIEW'))) && <Route path="/vema-denik" element={<VemaDenik />} />}
                  {isLoggedIn && <Route path="/profile" element={<ProfilePage />} />}
                  {isLoggedIn && <Route path="/dashboard" element={<DashboardPage />} />}
                  {/* Redirect root to dashboard for logged in users */}
                  {isLoggedIn && <Route path="/" element={<DashboardPage />} />}
                  {isLoggedIn && <Route path="/help" element={<HelpPage />} />}
                  {isLoggedIn && <Route path="/about" element={<About />} />}
                  {isLoggedIn && <Route path="/change-password" element={<ChangePasswordPage />} />}
                  {isLoggedIn && <Route path="/notifications" element={<NotificationsPage />} />}
                  {isLoggedIn && <Route path="/cash-book" element={<CashBookPage />} />}
                  {isLoggedIn && hasPermission && hasPermission('SUPERADMIN') && <Route path="/debug" element={<DebugPanel />} />}
                  {isLoggedIn && process.env.NODE_ENV === 'development' && <Route path="/test-notifications" element={<NotificationTestPanel />} />}
                  {isLoggedIn && process.env.NODE_ENV === 'development' && <Route path="/test-order-v2" element={<OrderV2TestPanel />} />}
                  
                  {/* 403 - Access Denied */}
                  {isLoggedIn && <Route path="/access-denied" element={<AccessDenied />} />}
                  
                  {/* 404 - Catch-all pro neexistující routes */}
                  {isLoggedIn && <Route path="*" element={<NotFound />} />}
                        </Routes>
                      </Suspense>
                    </AppErrorBoundary>
                  </Layout>
                </AppShell>
              </MaintenanceModeWrapper>

              {/* 🔔 POST-LOGIN MODAL: Zobrazí se po přihlášení podle globální konfigurace */}
              {postLoginModal.isOpen && postLoginModal.config && (
                <PostLoginModal
                  isOpen={postLoginModal.isOpen}
                  onClose={handleClosePostLoginModal}
                  onDontShowAgain={handleDontShowAgainPostLoginModal}
                  title={postLoginModal.config.title}
                  htmlContent={postLoginModal.config.htmlContent}
                  validFrom={postLoginModal.config.validFrom}
                  validTo={postLoginModal.config.validTo}
                  modalGuid={postLoginModal.config.modalGuid}
                />
              )}

              {/* � HIGH PRIORITY NOTIFICATION: Popup modal pro urgent/high priority notifikace */}
              {highPriorityNotif && (
                <Suspense fallback={null}>
                  <HighPriorityNotificationModal
                    notification={highPriorityNotif}
                    onClose={handleCloseHighPriorityNotif}
                  />
                </Suspense>
              )}

              {/* �🔄 UPDATE NOTIFICATION: Zobrazí se při detekci nové verze aplikace */}
              {updateAvailable && updateData && (
                <Suspense fallback={null}>
                  <UpdateNotificationModal
                    open={updateAvailable}
                    onClose={handleCloseUpdateModal}
                    onUpdate={handleUpdateApp}
                    versionData={updateData}
                  />
                </Suspense>
              )}
            </>
          )}
        </AppErrorBoundary>
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