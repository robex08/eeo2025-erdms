// CSS migrováno do GlobalStyles (emotion)
import { css } from '@emotion/react';
import React, { useContext, lazy, Suspense, useEffect, useRef, useCallback, useState } from 'react';
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
import { createStandardTasks } from './services/backgroundTasks';
import Layout from './components/Layout';
import { setupEncryptionDebug } from './utils/encryptionUtils';
import { initSecurityMeasures } from './utils/securityImprovements';
import ordersCacheService from './services/ordersCacheService';
import { getCacheConfig } from './config/cacheConfig';
import useDevice from './hooks/useDevice';
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
const AppSettings = lazy(() => import('./pages/AppSettings'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const OrganizationHierarchy = lazy(() => import('./pages/OrganizationHierarchy'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const SplashScreen = lazy(() => import('./components/SplashScreen'));
const PostLoginModal = lazy(() => import('./components/PostLoginModal'));
const UpdateNotificationModal = lazy(() => import('./components/UpdateNotificationModal'));
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
function RestoreLastRoute({ isLoggedIn, userId, user, hasPermission, userDetail, moduleSettings, moduleSettingsLoaded }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Save current location to localStorage only for menu routes
  useEffect(() => {
    if (isLoggedIn && location.pathname !== '/login' && location.pathname !== '/') {
      // Whitelist of routes that should be saved for restoration
      const validRoutes = ['/order-form-25', '/orders25-list', '/users', '/dictionaries', '/profile', '/address-book', '/change-password', '/statistics', '/orders', '/debug', '/cash-book', '/cerpani', '/majetek-overview'];

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
    // ⏳ KRITICKÉ: Počkat na načtení moduleSettings PŘED navigací
    if (isLoggedIn && location.pathname === '/' && moduleSettingsLoaded) {
      // 🎨 PRIORITA: userSettings.vychozi_sekce_po_prihlaseni → lastRoute → fallback
      // Po čerstvém přihlášení má prioritu nastavení uživatele
      
      try {
        // ✅ OPRAVA: Načíst user_id z AuthContext místo neexistujícího localStorage klíče
        const user_id = userId || user?.id;
        
        if (user_id) {
          const { loadSettingsFromLocalStorage } = require('./services/userSettingsApi');
          const userSettings = loadSettingsFromLocalStorage(user_id);
          
          // PRIORITA 1: userSettings.vychozi_sekce_po_prihlaseni (pokud je dostupná)
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
              'cerpani': '/cerpani',
              'material-overview': '/majetek-overview',
              'majetek-overview': '/majetek-overview',
              'app-settings': '/app-settings',
              'organization-hierarchy': '/organization-hierarchy',
              'cash-book': '/cash-book',
              'profile': '/profile',
              'orders25-list': '/orders25-list',
              'orders25-list-v3': '/orders25-list-v3', // Objednávky V3 (BETA)
              'annual-fees': '/annual-fees', // Roční poplatky (BETA)
              'invoices25-list': '/invoices25-list',
              'users': '/users',
              'help': '/help' // Nápověda a manuály
            };
            
            const targetSection = userSettings.vychozi_sekce_po_prihlaseni;
            const targetRoute = sectionMap[targetSection];
            
            // 🔒 SECURITY: Zkontroluj, zda má uživatel oprávnění k této sekci
            const { isSectionAvailable } = require('./utils/availableSections');
            
            if (targetRoute && isSectionAvailable(targetSection, hasPermission, userDetail)) {
              // ✅ User settings sekce JE dostupná → použij ji (NEJVYŠŠÍ PRIORITA)
              // (bez logování)
              navigate(targetRoute, { replace: true });
              return;
            } else {
              console.warn('⚠️ User settings sekce není dostupná:', targetSection);
              // Pokračuj na PRIORITU 2 (global homepage)
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Chyba při načítání user settings:', error);
      }
      
      // PRIORITA 2: Global homepage (pokud je dostupná)
      try {
        const { getDefaultHomepageSync } = require('./utils/homepageHelper');
        const { isSectionAvailable } = require('./utils/availableSections');
        
        const homepage = getDefaultHomepageSync();
        const homepageSection = homepage.replace('/', '').replace('-', '_');
        
        // Kontrola dostupnosti homepage
        const homepageSectionKey = homepage.replace('/', '');
        if (homepageSectionKey && isSectionAvailable(homepageSectionKey, hasPermission, userDetail)) {
          console.log('✅ PRIORITA 2: Použita global homepage:', homepage);
          navigate(homepage, { replace: true });
          return;
        } else {
          console.warn('⚠️ Global homepage není dostupná:', homepage);
          // Pokračuj na PRIORITU 3 (lastRoute)
        }
      } catch (error) {
        console.warn('⚠️ Chyba při načítání global homepage:', error);
      }
      
      // PRIORITA 3: lastRoute per-user
      // ⚠️ VALIDACE: Ignoruj neplatné nebo problematické cesty
      const lastRoute = userId ? localStorage.getItem(`app_lastRoute_user_${userId}`) : null;
      const invalidRoutes = ['/orders-list-new', '/login', '/logout', '/', ''];
      
      if (lastRoute && !invalidRoutes.includes(lastRoute)) {
        // ✅ BEZPEČNÉ: Validuj že route začíná s '/' a neobsahuje podezřelé znaky
        if (lastRoute.startsWith('/') && !/[<>{}]/.test(lastRoute)) {
          try {
            console.log('✅ PRIORITA 3: Použita lastRoute:', lastRoute);
            navigate(lastRoute, { replace: true });
            return;
          } catch (navError) {
            console.warn('⚠️ Chyba při navigaci na lastRoute:', lastRoute, navError);
            // Pokračuj na PRIORITU 4 (ultimate fallback)
          }
        }
      }
      
      // PRIORITA 4: Ultimate fallback - první dostupný modul nebo /profile
      try {
        const { getFirstAvailableSection } = require('./utils/availableSections');
        const fallbackSection = getFirstAvailableSection(hasPermission, userDetail);
        
        const fallbackMap = {
          'orders25-list': '/orders25-list',
          'orders25-list-v3': '/orders25-list-v3',
          'invoices25-list': '/invoices25-list',
          'profile': '/profile'
        };
        
        const fallbackRoute = fallbackMap[fallbackSection] || '/profile';
        console.log('✅ PRIORITA 4 (ultimate fallback):', fallbackRoute);
        navigate(fallbackRoute, { replace: true });
      } catch (error) {
        console.error('❌ Kritická chyba při fallback navigaci:', error);
        navigate('/profile', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, navigate, location.pathname, moduleSettingsLoaded]);

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
    module_orders_v3_visible: false,
    module_invoices_visible: true,
    module_annual_fees_visible: true,
    module_default_homepage: 'orders25-list' // 'orders25-list' nebo 'orders25-list-v3'
  });
  const [moduleSettingsLoaded, setModuleSettingsLoaded] = useState(false);

  // 🔔 POST-LOGIN MODAL: State pro modal dialog po přihlášení
  const [postLoginModal, setPostLoginModal] = React.useState({
    isOpen: false,
    config: null,
    fromPasswordChange: false // 🔑 Flag pokud modal přišel po změně hesla
  });

  // 🔄 VERSION CHECKER: Automatická detekce nové verze aplikace
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [updateData, setUpdateData] = React.useState(null);
  
  useVersionChecker({
    // Zakázat v development režimu (npm start), povolit jen v production buildech
    enabled: process.env.NODE_ENV === 'production',
    checkInterval: 5 * 60 * 1000, // 5 minut
    gracePeriod: 60 * 1000, // 60 sekund po načtení
    onUpdate: (versionData) => {
      setUpdateData(versionData);
      setUpdateAvailable(true);
      
      // Optional: Toast notifikace
      if (showToast) {
        showToast(`Je dostupná nová verze aplikace ${process.env.REACT_APP_VERSION || 'N/A'}`, { 
          type: 'info',
          autoClose: 8000
        });
      }
    }
  });

  const handleCloseUpdateModal = () => {
    setUpdateAvailable(false);
  };

  const handleUpdateApp = () => {
    // Hard reload
    window.location.reload(true);
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
      hasPerm('SPEDNIG_VIEW_ALL') || hasPerm('SPNDING_VIEW_ALL') || hasPerm('SPEDNING_VIEW_ALL') || hasPerm('SPENDING_VIEW_ALL') || hasPerm('CERPANI_VIEW_ALL');
    const hasGlobalViewOwn =
      hasPerm('SPEDNIG_VIEW_OWN') || hasPerm('SPNDING_VIEW_OWN') || hasPerm('SPEDNING_VIEW_OWN') || hasPerm('SPENDING_VIEW_OWN') || hasPerm('CERPANI_VIEW_OWN');

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
          module_orders_v3_visible: settings.module_orders_v3_visible ?? false,
          module_invoices_visible: settings.module_invoices_visible ?? true,
          module_annual_fees_visible: settings.module_annual_fees_visible ?? true,
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
        if (!hasOrdersV3) {
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

          // Zaregistruj pouze chybějící tasky (BackgroundTaskService deduplikuje podle jména)
          tasks.forEach(taskConfig => {
            if (taskConfig?.name === 'autoRefreshOrdersV3') {
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
        <Suspense fallback={<RouteLoadingFallback />}>
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
              <RestoreLastRoute isLoggedIn={isLoggedIn} userId={user_id} user={user} hasPermission={hasPermission} userDetail={userDetail} moduleSettings={moduleSettings} moduleSettingsLoaded={moduleSettingsLoaded} />
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  {!isLoggedIn && <Route path="*" element={<Navigate to="/login" replace />} />}
                  <Route
                    path="/login"
                    element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
                  />
                  {/* Root route "/" is handled by RestoreLastRoute component */}
                  {isLoggedIn && <Route path="/" element={<div style={{display:'none'}} />} />}

                  {isLoggedIn && <Route path="/orders" element={<Orders />} />}

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
                  {isLoggedIn && <Route path="/cerpani" element={
                    cerpaniAccessMode
                      ? <CerpaniPage
                          mode={cerpaniAccessMode.mode}
                          contractsUnrestricted={cerpaniAccessMode.contractsUnrestricted}
                          lpUnrestricted={cerpaniAccessMode.lpUnrestricted}
                        />
                      : <Navigate to="/access-denied" replace />
                  } />}
                  {isLoggedIn && <Route path="/reports" element={<ReportsPage />} />}
                  {isLoggedIn && <Route path="/statistics" element={<StatisticsPage />} />}
                  {isLoggedIn && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/stats-reports" element={<StatsReportsPage />} />}
                  {isLoggedIn && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/majetek-overview" element={<MajetekOverviewPage />} />}
                  {isLoggedIn && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && hasPermission('BETA_TESTER'))
                  ) && <Route path="/material-overview" element={<Navigate to="/majetek-overview" replace />} />}
                  {isLoggedIn && userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR') && <Route path="/app-settings" element={<AppSettings />} />}
                  {isLoggedIn && userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN') && <Route path="/organization-hierarchy" element={<OrganizationHierarchy />} />}
                  {isLoggedIn && (
                    (hasAdminRole && hasAdminRole()) ||
                    (hasPermission && (
                      hasPermission('SUPPLIER_MANAGE') || hasPermission('SUPPLIER_VIEW') || 
                      hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_CREATE') ||
                      hasPermission('PHONEBOOK_MANAGE')
                    ))
                  ) && <Route path="/address-book" element={<AddressBookPage />} />}
                  {isLoggedIn && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) && <Route path="/contacts" element={<ContactsPage />} />}
                  {isLoggedIn && <Route path="/profile" element={<ProfilePage />} />}
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
            </Layout>
          </AppShell>
        </MaintenanceModeWrapper>
        
        {/* 🔔 POST-LOGIN MODAL: Zobrazí se po přihlášení podle globální konfigurace */}
        {postLoginModal.isOpen && postLoginModal.config && (
          <Suspense fallback={null}>
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
          </Suspense>
        )}

        {/* 🔄 UPDATE NOTIFICATION: Zobrazí se při detekci nové verze aplikace */}
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