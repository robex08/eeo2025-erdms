import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginApi2, getUserDetailApi2, normalizeApiError, getNameday } from '../services/api2auth';
import {
  saveAuthData,
  loadAuthData,
  clearAuthData,
  migrateAuthDataToSessionStorage,
  hasAuthData
} from '../utils/authStorage';
import { performLogoutCleanup, saveCurrentLocation } from '../utils/logoutCleanup';
import { handleUserChange as handleUserChangeCleanup } from '../utils/userDataCleanup';
import {
  checkAndCleanUserChange,
  clearAllUserData,
  migrateOldUserData,
  setCurrentUserId
} from '../utils/userStorage';
import {
  initTabSync,
  closeTabSync,
  onTabSyncMessage,
  broadcastLogin,
  broadcastLogout,
  BROADCAST_TYPES
} from '../utils/tabSync';
import ordersCacheService from '../services/ordersCacheService';
import backgroundTaskService from '../services/backgroundTaskService';
import { fetchUserSettings, clearSettingsFromLocalStorage } from '../services/userSettingsApi';
import { tokenRefreshService } from '../utils/tokenRefresh'; // 🔄 Token refresh

// Globální flag pro potlačení duplikátních logů
let initCount = 0;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState(''); // Store full name of the user
  const [loading, setLoading] = useState(true); // Add loading state
  const [user_id, setUserId] = useState(null); // Ensure user_id is part of the context
  const [userDetail, setUserDetail] = useState(null); // Ulož detail uživatele
  const [userPermissions, setUserPermissions] = useState([]); // array of normalized permission codes
  const [authMethod, setAuthMethod] = useState(null); // 🔐 EntraID: Authentication method ('local' or 'entra_id')
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false); // 🔑 Vynucená změna hesla
  const [temporaryPassword, setTemporaryPassword] = useState(''); // 🔑 Dočasné heslo pro vynucenou změnu
  const [tempToken, setTempToken] = useState(null); // 🔑 Dočasný token pro změnu hesla
  const [isRefreshingToken, setIsRefreshingToken] = useState(false); // 🔄 Flag pro sledování token refreshu
  
  // 🌲 HIERARCHIE WORKFLOW: Stav hierarchie pro aktuálního uživatele
  const [hierarchyStatus, setHierarchyStatus] = useState({
    hierarchyEnabled: false,
    isImmune: false,
    profileId: null,
    profileName: null,
    logic: 'OR',
    logicDescription: ''
  });
  
  // 🔐 HIERARCHIE PERMISSIONS: Rozšířená práva s hierarchií
  const [expandedPermissions, setExpandedPermissions] = useState([]);
  
  // 🔐 USER IMPERSONATION: Feature flag zda je impersonation povolen
  const [impersonationFeatureEnabled, setImpersonationFeatureEnabled] = useState(false);
  
  // 🔐 USER IMPERSONATION STATE: Aktivní stav impersonation
  // Načíst initial state SYNCHRONNĚ z localStorage (aby byl k dispozici při prvním renderu)
  const [impersonationActive, setImpersonationActive] = useState(() => {
    try {
      return localStorage.getItem('impersonation_active') === 'true';
    } catch {
      return false;
    }
  });
  
  const [originalAdminUser, setOriginalAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('impersonation_original_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 AuthContext initial state: Načten originalAdminUser z localStorage:', parsed.username);
        }
        return parsed;
      }
    } catch (err) {
      console.warn('⚠️ Chyba při načítání original admin user:', err);
    }
    return null;
  }); // {id, username, token, userDetail, permissions}

  const login = async (username, password) => {
    try {
      // 🔐 IMPERSONATION: Vyčistit impersonation state při novém přihlášení
      // Fresh login = NOVÁ session, starý impersonation state musí být smazán
      try {
        localStorage.removeItem('impersonation_active');
        localStorage.removeItem('impersonation_original_user');
        localStorage.removeItem('impersonation_target_user_id');
        localStorage.removeItem('impersonation_started_at');
        setImpersonationActive(false);
        setOriginalAdminUser(null);
      } catch (error) {
        console.warn('⚠️ Chyba při čištění impersonation state při login:', error);
      }
      
      // Přihlášení přes nové API2
      const loginData = await loginApi2(username, password);

      // ✅ KRITICKÉ: Zkontroluj změnu uživatele a vyčisti data předchozího uživatele
      const userChanged = checkAndCleanUserChange(loginData.id);
      if (userChanged && process.env.NODE_ENV === 'development') {
      }

      // Migrace starých dat bez user_id na nové s user_id
      migrateOldUserData(loginData.id);

      setUser({ id: loginData.id, username: loginData.username });
      setToken(loginData.token);
      setUserId(loginData.id); // ✅ Nastavíme user_id hned po přihlášení

      // 🎯 CENTRALIZED: Notifikuj DraftManager o novém uživateli
      try {
        import('../services/DraftManager').then(({ default: draftManager }) => {
          draftManager.setCurrentUser(loginData.id);
        });
      } catch (error) {
      }
      await saveAuthData.user({ id: loginData.id, username: loginData.username });
      await saveAuthData.token(loginData.token);
      setError('');

      // Načti detail uživatele pouze při přihlášení
      const userDetail = await getUserDetailApi2(loginData.username, loginData.token, loginData.id);
      setUserDetail(userDetail);
      // Kontrola aktivního účtu (DB: aktivni = 1). Backend má také vracet chybu, ale FE to ihned zastaví.
      try {
        const activeFlag = userDetail?.aktivni ?? userDetail?.active ?? userDetail?.is_active;
        if (activeFlag === 0 || activeFlag === '0' || activeFlag === false || activeFlag === 'false') {
          // Uživatel není aktivní – okamžitě zneplatnit session
          setError('Účet je neaktivní. Kontaktujte administrátora.');
          // Lokální cleanup
          setUser(null); setToken(null); setIsLoggedIn(false); setUserId(null); setUserDetail(null);
          clearAuthData.all();
          return; // neprovádět další kroky
        }
      } catch {}

      // extract and store normalized permission codes
      try {
        const perms = extractPermissionCodes(userDetail || {});
        setUserPermissions(perms);
        await saveAuthData.userPermissions(perms);
        
        // 🔐 Inicializovat expandedPermissions (hierarchie se načte později)
        setExpandedPermissions(perms);
      } catch (err) {
        console.error('❌ Chyba při extrakci oprávnění:', err);
      }
      setAuthMethod(userDetail.auth_method || null); // 🔐 EntraID: Set authentication method
      setFullName(`${userDetail.jmeno || ''} ${userDetail.prijmeni || ''}`.trim());
      await saveAuthData.userDetail(userDetail);

      // 🎨 USER SETTINGS: Načíst nastavení po přihlášení PŘED setIsLoggedIn(true)
      // KRITICKÉ: App.js useEffect čeká na isLoggedIn && potřebuje aktuální userSettings v localStorage
      try {
        await fetchUserSettings({
          token: loginData.token,
          username: loginData.username,
          userId: loginData.id
        });
      } catch (error) {
        console.warn('⚠️ Chyba při načítání user settings (použije se výchozí):', error);
      }

      // 🔐 TRIGGER LOGIN STATE: Nastavit isLoggedIn = true AŽ PO načtení userSettings
      // Tím zajistíme, že App.js useEffect najde aktuální data v localStorage
      setIsLoggedIn(true);
      
      // � TOKEN REFRESH: Spustit auto-refresh timer (10 min před expirací)
      try {
        // Token byl právě vytvořen, vyprší za 12 hodin
        const expiresAt = Date.now() + (12 * 60 * 60 * 1000);
        tokenRefreshService.startRefreshTimer(expiresAt);
        if (process.env.NODE_ENV === 'development') {

        }
      } catch (error) {
        console.warn('⚠️ Chyba při startu token refresh timeru:', error);
      }
      
      // 🔔 POST-LOGIN MODAL: Zkontrolovat a zobrazit modal po přihlášení
      // Spustit po prvním renderovacím cyklu (200ms stačí pro UI)
      setTimeout(async () => {
        try {
          const { checkPostLoginModal } = await import('../services/postLoginModalService');
          const modalConfig = await checkPostLoginModal(
            loginData.id,
            loginData.token,
            loginData.username
          );
          
          if (modalConfig && modalConfig.enabled) {
            // Vyvolat custom event - App.js ho zachytí a zobrazí modal
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('show-post-login-modal', {
                detail: modalConfig
              }));
            }
          }
        } catch (error) {
          console.warn('⚠️ Chyba při kontrole post-login modal:', error);
          // Tiše ignorovat - modal není kritický pro přihlášení
        }
      }, 200); // 200ms po přihlášení - dát čas na dokončení renderování UI
      // 🌲 HIERARCHIE WORKFLOW: Načíst stav hierarchie po přihlášení
      try {
        const { getHierarchyConfig } = await import('../services/hierarchyService');
        const { expandPermissionsWithHierarchy } = await import('../services/permissionHierarchyService');
        const config = await getHierarchyConfig(loginData.token, loginData.username);
        
        // 🛡️ Zkontrolovat, zda uživatel má právo HIERARCHY_IMMUNE
        const currentPerms = extractPermissionCodes(userDetail || {});
        const hasImmunity = currentPerms.includes('HIERARCHY_IMMUNE');
        
        // Převést na formát kompatibilní s hierarchyStatus
        const newHierarchyStatus = {
          hierarchyEnabled: config.enabled,
          isImmune: hasImmunity,
          profileId: config.profileId,
          profileName: config.profileName,
          logic: config.logic,
          logicDescription: config.logicDescription
        };
        setHierarchyStatus(newHierarchyStatus);
        
        // 🔐 Rozšířit práva podle hierarchie
        const hierarchyEnabled = Boolean(config.enabled && config.profileId);
        const expanded = expandPermissionsWithHierarchy(currentPerms, hierarchyEnabled, true, true);
        setExpandedPermissions(expanded);
      } catch (error) {
        console.warn('⚠️ Chyba při načítání stavu hierarchie (použije se výchozí):', error);
        // Fallback: bez hierarchie používej pouze základní práva
        // Získej aktuální userPermissions
        const currentPerms = extractPermissionCodes(userDetail || {});
        setExpandedPermissions(currentPerms);
      }
      
      // 🔐 USER IMPERSONATION: Načíst feature flag z Global Settings
      try {
        const { getGlobalSettings } = await import('../services/globalSettingsApi');
        const settings = await getGlobalSettings(loginData.token, loginData.username);
        const impersonationEnabled = settings?.user_impersonation_enabled === true || settings?.user_impersonation_enabled === '1' || settings?.user_impersonation_enabled === 1;
        setImpersonationFeatureEnabled(impersonationEnabled);
      } catch (error) {
        setImpersonationFeatureEnabled(false);
      }

      // ✅ BROADCAST: Oznámit ostatním záložkám, že došlo k přihlášení
      broadcastLogin(loginData.id, loginData.username);

      // 🔑 VYNUCENÁ ZMĚNA HESLA: Nastavit flag POUZE při prvním přihlášení (login() je volán jen z Login.js handleSubmit)
      // ⚠️ KRITICKÉ: Toto NESMÍ být v page reload logice (checkToken funkce v useEffect)
      const forcePasswordChange = userDetail?.vynucena_zmena_hesla === 1 || userDetail?.vynucena_zmena_hesla === '1';
      if (forcePasswordChange) {
        setNeedsPasswordChange(true);
        // ⚠️ ŽÁDNÝ return! - uživatel musí být přihlášen, dialog se zobrazí v Login.js
      } else {
        // ✅ Reset flag pokud backend NEVRÁTIL vynucenou změnu (např. po úspěšné změně hesla)
        setNeedsPasswordChange(false);
      }

      // 🎯 SPLASH SCREEN: Nastavit příznak, že aplikace byla inicializována
      // (aby se splash screen již nezobrazoval při dalších načteních)
      try {
        sessionStorage.setItem('app_initialized', 'true');
      } catch (e) {
        // Ignorovat chyby se sessionStorage
      }

      // 🎉 UVÍTACÍ TOAST: Zobraz uvítání s jmeninami
      setTimeout(async () => {
        try {
          const days = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
          const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
          const now = new Date();
          const dayName = days[now.getDay()];
          const hours = now.getHours();
          
          let greeting = 'Dobrý den';
          if (hours < 9) greeting = 'Dobré ráno';
          else if (hours < 12) greeting = 'Dobré dopoledne';
          else if (hours < 18) greeting = 'Dobré odpoledne';
          else greeting = 'Dobrý večer';
          
          let message = `${greeting}! Dnes je ${dayName} ${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()}`;
          
          // Načti jmeniny z BE
          const namedayResult = await getNameday();
          if (namedayResult.success && namedayResult.name) {
            message += ` a svátek má 🌸 ${namedayResult.name}`;
          }
          
          // Vyvolej custom event pro toast (App.js ho zachytí)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('show-welcome-toast', {
              detail: { message }
            }));
          }
        } catch (error) {
          // Tiše ignorovat chybu v toastu
        }
      }, 500);

      // 🪙 TRIGGER: Spustit initial fetch směnných kurzů po úspěšném přihlášení
      // ✅ DŮLEŽITÉ: Tento event se spouští POUZE při login(), NIKDY při refresh stránky (F5)!
      // ⚠️ KRITICKÉ: Odložit do event loopu aby NIKDY neblokoval přihlášení
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          try {
            window.dispatchEvent(new CustomEvent('trigger-initial-exchange-rates'));
          } catch (error) {
            // Tiše ignorovat - kurzový lístek není kritický pro přihlášení
          }
        }, 100); // 100ms zpoždění - přihlášení už je hotové
      }

    } catch (err) {
      // Kontrola na vynucenou změnu hesla
      if (err.forcePasswordChange) {
        setNeedsPasswordChange(true);
        setError(err.message || 'Musíte si změnit heslo');
        // Nastavit dočasné údaje pro změnu hesla včetně tokenu
        setUser({ id: err.userId, username: err.username });
        setTempToken(err.tempToken); // Dočasný token pro změnu hesla
        return; // Nepropagovat error dál
      }
      
      const norm = normalizeApiError(err);
      setError(norm.userMessage || 'Nepodařilo se přihlásit.');
      // keep throwing the original error for logging callers if needed
      throw err;
    }
  };

  // Manual refresh of user detail (e.g., from Profile screen refresh button)
  const refreshUserDetail = useCallback(async () => {
    if (!user || !token || !user.id || !user.username) return null;
    try {
      const fresh = await getUserDetailApi2(user.username, token, user.id);
      setUserDetail(fresh);
      setAuthMethod(fresh.auth_method || null); // 🔐 EntraID: Update authentication method
      setFullName(`${fresh.jmeno || ''} ${fresh.prijmeni || ''}`.trim());
      // Aktivní účet kontrola i při refreshi
      try {
        const activeFlag = fresh?.aktivni ?? fresh?.active ?? fresh?.is_active;
        // Odhlásit pouze pokud je EXPLICITNĚ deaktivován (ne při undefined/null)
        if (activeFlag === 0 || activeFlag === '0' || activeFlag === false || activeFlag === 'false' || activeFlag === 'inactive') {
          setError('Účet byl deaktivován administrátorem. Přihlášení ukončeno.');
          // Broadcast auth-logout se provede automaticky v logout() funkci
          logout('account_deactivated');
          return null;
        }
      } catch {}
      await saveAuthData.userDetail(fresh);
      // recalc permissions
      try {
        const perms = extractPermissionCodes(fresh || {});
        setUserPermissions(perms);
        await saveAuthData.userPermissions(perms);
        
        // 🛡️ Zkontrolovat, zda uživatel má právo HIERARCHY_IMMUNE (může se změnit)
        const hasImmunity = perms.includes('HIERARCHY_IMMUNE');
        
        // Aktualizovat hierarchyStatus s aktuálním isImmune
        if (hierarchyStatus.hierarchyEnabled) {
          setHierarchyStatus(prev => ({
            ...prev,
            isImmune: hasImmunity
          }));
        }
        
        // 🔐 Přepočítat expandedPermissions s hierarchií
        try {
          const { expandPermissionsWithHierarchy } = await import('../services/permissionHierarchyService');
          const hierarchyEnabled = Boolean(hierarchyStatus.hierarchyEnabled && hierarchyStatus.profileId);
          const expanded = expandPermissionsWithHierarchy(perms, hierarchyEnabled, true, true);
          setExpandedPermissions(expanded);
        } catch (err) {
          console.warn('⚠️ Chyba při rozšíření práv hierarchií:', err);
          setExpandedPermissions(perms); // Fallback bez hierarchie
        }
      } catch {}
      return fresh;
    } catch (e) {
      // NEZAVOL logout automaticky! Nech volající rozhodnout
      return null;
    }
  }, [user, token]);

  /**
   * 🔐 USER IMPERSONATION: Začít impersonation - přepnout se na cílového uživatele
   * @param {number} targetUserId - ID uživatele, na kterého se chceme přepnout
   * @returns {Promise<boolean>} - true pokud úspěšné, false pokud chyba
   */
  const startImpersonationContext = useCallback(async (targetUserId) => {
    try {
      if (!token || !user?.username) {
        console.error('❌ Chybí token nebo username pro impersonation');
        return false;
      }

      // Zavolat service pro impersonation
      const impersonationService = await import('../services/impersonationService');
      const result = await impersonationService.startImpersonation(targetUserId, token, user.username);

      if (!result.success || !result.data) {
        console.error('❌ Impersonation selhal:', result.message);
        return false;
      }

      const { data } = result;

      // Uložit původní admin data PŘED přepnutím
      const adminBackup = {
        id: user_id,
        username: user.username,
        token: token,
        userDetail: userDetail,
        permissions: userPermissions // ✅ Uložit i permissions pro warning banner
      };
      setOriginalAdminUser(adminBackup);
      
      // ✅ Aktualizovat localStorage s kompletním adminBackup (včetně userDetail a permissions)
      // ImpersonationService ukládá pouze {id, username, token}, ale potřebujeme i detail pro banner
      try {
        localStorage.setItem('impersonation_original_user', JSON.stringify(adminBackup));
      } catch (error) {
        console.warn('⚠️ Chyba při ukládání adminBackup do localStorage:', error);
      }

      // Přepnout context na cílového uživatele
      setUser({ id: data.id, username: data.username });
      setToken(data.token);
      setUserId(data.id);
      setUserDetail(data.userDetail);
      setFullName(`${data.userDetail.jmeno || ''} ${data.userDetail.prijmeni || ''}`.trim());
      setAuthMethod(data.userDetail.auth_method || null);

      // ✅ Uložit data cílového uživatele do localStorage (pro page reload)
      await saveAuthData.user({ id: data.id, username: data.username });
      await saveAuthData.token(data.token);
      await saveAuthData.userDetail(data.userDetail);

      // Extrahovat práva cílového uživatele
      const targetPerms = extractPermissionCodes(data.userDetail || {});
      setUserPermissions(targetPerms);
      setExpandedPermissions(targetPerms); // Bez hierarchie pro impersonation
      await saveAuthData.userPermissions(targetPerms);

      // Nastavit hierarchyStatus na výchozí (impersonation nemá hierarchii)
      setHierarchyStatus({
        hierarchyEnabled: false,
        isImmune: false,
        profileId: null,
        profileName: null,
        logic: 'OR',
        logicDescription: ''
      });

      // Aktivovat impersonation
      setImpersonationActive(true);

      return true;

    } catch (error) {
      console.error('❌ Chyba při startu impersonation v context:', error);
      return false;
    }
  }, [user, token, user_id, userDetail]);

  /**
   * 🔙 USER IMPERSONATION: Ukončit impersonation - vrátit se zpět na admina
   * @returns {Promise<boolean>} - true pokud úspěšné, false pokud chyba
   */
  const stopImpersonationContext = useCallback(async () => {
    try {
      if (!originalAdminUser || !originalAdminUser.token || !originalAdminUser.username) {
        console.error('❌ Chybí původní admin data pro návrat');
        return false;
      }

      // Zavolat service pro stop impersonation
      const impersonationService = await import('../services/impersonationService');
      const result = await impersonationService.stopImpersonation(
        originalAdminUser.token,
        originalAdminUser.username
      );

      if (!result.success || !result.data) {
        console.error('❌ Stop impersonation selhal:', result.message);
        return false;
      }

      const { data } = result;

      // Obnovit admin context
      setUser({ id: data.id, username: data.username });
      setToken(data.token);
      setUserId(data.id);
      setUserDetail(data.userDetail);
      setFullName(`${data.userDetail.jmeno || ''} ${data.userDetail.prijmeni || ''}`.trim());
      setAuthMethod(data.userDetail.auth_method || null);

      // ✅ Uložit data admina zpět do localStorage (pro page reload)
      await saveAuthData.user({ id: data.id, username: data.username });
      await saveAuthData.token(data.token);
      await saveAuthData.userDetail(data.userDetail);

      // Obnovit práva admina
      const adminPerms = extractPermissionCodes(data.userDetail || {});
      setUserPermissions(adminPerms);
      await saveAuthData.userPermissions(adminPerms);

      // Načíst hierarchii pro admina
      try {
        const { getHierarchyConfig } = await import('../services/hierarchyService');
        const { expandPermissionsWithHierarchy } = await import('../services/permissionHierarchyService');
        const config = await getHierarchyConfig(data.token, data.username);

        const hasImmunity = adminPerms.includes('HIERARCHY_IMMUNE');

        setHierarchyStatus({
          hierarchyEnabled: config.enabled,
          isImmune: hasImmunity,
          profileId: config.profileId,
          profileName: config.profileName,
          logic: config.logic,
          logicDescription: config.logicDescription
        });

        const hierarchyEnabled = Boolean(config.enabled && config.profileId);
        const expanded = expandPermissionsWithHierarchy(adminPerms, hierarchyEnabled, true, true);
        setExpandedPermissions(expanded);
      } catch (hierError) {
        console.warn('⚠️ Chyba při načítání hierarchie po návratu:', hierError);
        setExpandedPermissions(adminPerms);
      }

      // Deaktivovat impersonation
      setImpersonationActive(false);
      setOriginalAdminUser(null);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔙 Impersonation ukončeno, vráceno na:', data.username);
      }

      return true;

    } catch (error) {
      console.error('❌ Chyba při stop impersonation v context:', error);
      return false;
    }
  }, [originalAdminUser]);

  // 🔐 USER IMPERSONATION: Refresh feature flag z Global Settings
  const refreshImpersonationFeatureFlag = useCallback(async () => {
    if (!token || !user?.username) {
      return;
    }

    try {
      const { getGlobalSettings } = await import('../services/globalSettingsApi');
      const settings = await getGlobalSettings(token, user.username);
      const impersonationEnabled = settings?.user_impersonation_enabled === true || 
                                     settings?.user_impersonation_enabled === '1' || 
                                     settings?.user_impersonation_enabled === 1;
      
      setImpersonationFeatureEnabled(impersonationEnabled);
    } catch (error) {
      // Ignorovat chyby při refresh
    }
  }, [token, user]);

  const logout = useCallback((reason = 'manual', skipBroadcast = false) => {
    // � TOKEN REFRESH: Zastavit refresh timer
    try {
      tokenRefreshService.stopRefreshTimer();
      if (process.env.NODE_ENV === 'development') {

      }
    } catch (error) {
      console.warn('⚠️ Chyba při zastavení token refresh timeru:', error);
    }
    
    // �🚀 BACKGROUND TASKS: Zastavit všechny background tasky
    try {
      backgroundTaskService.unregisterAll();
    } catch (error) {
    }

    // 🚀 CACHE: Invalidovat všechny cache při logout
    ordersCacheService.clear();

    // 🎨 USER SETTINGS: Smazat nastavení z localStorage při odhlášení
    // (pouze pokud uživatel nemá zapnuté "Zapamatovat filtry")
    if (user_id) {
      try {
        const settingsKey = `user_settings_${user_id}`;
        const settings = localStorage.getItem(settingsKey);
        
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          const rememberFilters = parsedSettings?.chovani_aplikace?.zapamatovat_filtry ?? true;
          
          if (!rememberFilters) {
            clearSettingsFromLocalStorage(user_id);
          }
        }
      } catch (error) {
        console.warn('⚠️ Chyba při kontrole/mazání user settings:', error);
      }
    }

    // Uložit současnou pozici pro pozdější obnovení
    saveCurrentLocation();

    // ❌ VYPNUTO: Duplikátní cleanup - použijeme pouze performLogoutCleanup
    // clearAllUserData(); // Způsobuje mazání draftů!

    // ✅ BROADCAST: Oznámit ostatním záložkám, že došlo k odhlášení (pokud není skipBroadcast)
    if (!skipBroadcast) {
      broadcastLogout();
    }

    // 🎯 CENTRALIZED: Notifikuj DraftManager o logout
    try {
      import('../services/DraftManager').then(({ default: draftManager }) => {
        draftManager.logout(); // Reset stav ale NEmaže persisted drafty
      });
    } catch (error) {
    }

    // Vymazat stav komponenty
    setUser(null);
    setToken(null);
    setIsLoggedIn(false);
    setFullName('');
    setUserId(null);
    setUserDetail(null);
    setUserPermissions([]);
    setExpandedPermissions([]); // 🔐 Vyčistit i rozšířená práva
    setAuthMethod(null); // 🔐 EntraID: Reset authentication method
    setNeedsPasswordChange(false); // 🔑 Reset vynucené změny hesla
    setImpersonationActive(false); // 🔐 IMPERSONATION: Reset impersonation state
    setOriginalAdminUser(null); // 🔐 IMPERSONATION: Vyčistit backup admin data
    
    // 🔐 IMPERSONATION: Vyčistit localStorage impersonation state
    try {
      localStorage.removeItem('impersonation_active');
      localStorage.removeItem('impersonation_original_user');
      localStorage.removeItem('impersonation_target_user_id');
      localStorage.removeItem('impersonation_started_at');
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Logout: Vyčištěn impersonation state z localStorage');
      }
    } catch (error) {
      console.warn('⚠️ Chyba při mazání impersonation state:', error);
    }
    
    setHierarchyStatus({
      hierarchyEnabled: false,
      isImmune: false,
      profileId: null,
      profileName: null,
      logic: 'OR',
      logicDescription: ''
    });

    // Smart cleanup - smaže citlivá data, zachová užitečné preference
    try {
      performLogoutCleanup({
        dryRun: false,
        preserveUnknown: true,
        logActions: process.env.NODE_ENV === 'development'
      });
    } catch (error) {

      // Fallback - základní čištění
      try {
        // Vymaž veškerý sessionStorage (citlivá data)
        // 🎯 VÝJIMKA: Zachovat app_initialized (pro splash screen kontrolu)
        const appInitialized = sessionStorage.getItem('app_initialized');
        sessionStorage.clear();
        if (appInitialized) {
          sessionStorage.setItem('app_initialized', appInitialized);
        }

        // Zachovej pouze kritické lokální data
        const keep = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (
            k.startsWith('order_draft') ||
            k.startsWith('order_templates') ||
            k.startsWith('ui_') ||
            k.startsWith('suppliers_cache') ||
            k.startsWith('post_login_modal_dismissed_') ||
            k === 'lastVisitedSection' ||
            k === 'activeSection' ||
            k === 'last_location'
          )) {
            keep[k] = localStorage.getItem(k);
          }
        }

        localStorage.clear();
        Object.entries(keep).forEach(([k,v]) => {
          try { localStorage.setItem(k, v); } catch {}
        });
      } catch {
      }
    }

    // ✅ Stav isLoggedIn je nastaven na false → LogoutRedirectListener v App.js zařídí redirect
  // AuthContext logged out (debug output omitted)
  }, [setUser, setToken, setIsLoggedIn, setFullName, setUserId]);

  // TODO: Implement validateToken for API2 if needed
  const validateToken = useCallback(async (storedToken, storedUser) => {
    setLoading(false);
  }, [setLoading]);

  useEffect(() => {
    const initAuth = async () => {
      // Prevent duplicate initialization in React Strict Mode
      initCount++;
      if (initCount > 1) {
        setLoading(false);
        return;
      }

      // 🔐 USER IMPERSONATION: State je už načtený v initial useState (pomocí lazy init)
      // Není potřeba načítat znovu tady

      // ❌ ZAKÁZÁNO: Migrace starých dat z localStorage do sessionStorage
      // Tato funkce je ZASTARALÁ a používá sessionStorage místo localStorage!
      // Způsobuje ztrátu session mezi záložkami a po F5 refresh
      // migrateAuthDataToSessionStorage();

      const storedUser = await loadAuthData.user();
      const storedToken = await loadAuthData.token();

      if (storedUser && storedToken) {
      // ✅ KRITICKÉ: Zkontroluj, jestli je to stále stejný uživatel
      const oldUserId = localStorage.getItem('current_user_id');
      checkAndCleanUserChange(storedUser.id);

      // 🧹 NOVÉ: Pokročilé čištění dat při změně uživatele - POUZE při skutečné změně
      if (oldUserId && oldUserId !== storedUser.id.toString()) {
        handleUserChangeCleanup(oldUserId, storedUser.id.toString());
      }

      // 🎯 CRITICAL FIX: Inicializuj DraftManager i při "same user login"
      try {
        import('../services/DraftManager').then(({ default: draftManager }) => {
          draftManager.setCurrentUser(storedUser.id);
        });
      } catch (error) {
      }

      // Nastavit základní user data, ale ještě NE isLoggedIn
      setUser(storedUser);
      setToken(storedToken);
      setUserId(storedUser.id);

      // Ověř platnost tokenu (např. jednoduchý request na backend)
      // Pokud je token platný, použij userDetail z localStorage, jinak proveď logout
      const checkToken = async () => {
        // 🔐 USER IMPERSONATION: Zkontroluj impersonation state na začátku funkce
        let impState = null;
        try {
          const impersonationService = await import('../services/impersonationService');
          impState = impersonationService.getImpersonationState();
        } catch (impError) {
          console.warn('⚠️ Chyba při načítání impersonation state:', impError);
        }
        
        try {
          // Načti cached userDetail PŘED voláním API
          const storedDetail = await loadAuthData.userDetail();
          const storedPerms = await loadAuthData.userPermissions();

          // 🔐 PŘEDCHOZÍ KONTROLA: Zkontroluj lokální expiraci tokenu PŘED voláním API
          // Zabraň zbytečným API callům pokud token už expiroval lokálně
          try {
            const tokenData = await loadAuthData.token();
            
            // 🔐 VALIDACE: Zkontroluj konzistenci impersonation state
            // Pokud je impersonation aktivní, ale current user je stejný jako originalAdminUser,
            // jedná se o nekonzistentní stav (admin se znovu přihlásil) → vyčistit state
            if (impState && impState.active && impState.originalUser) {
              const currentUsername = storedUser?.username;
              const originalUsername = impState.originalUser.username;
              
              if (currentUsername === originalUsername) {
                // Nekonzistentní stav: jsme přihlášeni jako admin, ale impersonation stav říká že máme být přepnutí
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ Nekonzistentní impersonation state - current user je stejný jako original admin → čištění');
                }
                const impersonationService = await import('../services/impersonationService');
                impersonationService.clearImpersonationState();
                setImpersonationActive(false);
                setOriginalAdminUser(null);
              }
            }
            
            if (!tokenData) {
              // 🔐 USER IMPERSONATION: Pokud je impersonation aktivní, NESMÍME volat logout
              if (impState && impState.active) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ Token chybí při impersonation reload - neukončuji session');
                }
                // Pokračovat bez logout - impersonation se obnoví z localStorage
              } else {
                // Token není v localStorage a není impersonation -> logout
                if (process.env.NODE_ENV === 'development') {
                  console.warn('🔐 Token chybí v localStorage při page load → logout');
                }
                logout('token_missing');
                setLoading(false);
                return;
              }
            }
            // Token je validní lokálně, pokračuj s API validací
            if (process.env.NODE_ENV === 'development') {
              // (bez logování)
            }
          } catch (tokenCheckError) {
            console.warn('⚠️ Chyba při kontrole lokální expirace tokenu:', tokenCheckError);
          }

          // Zkus validovat token na backendu
          // Pokud selže (401, network error, ...), použij cached data níže v catch bloku
          const freshDetailResult = await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
          
          // Použij čerstvá data z API (mají usek, lokalita z JOINů), fallback na cached
          const activeDetail = freshDetailResult || storedDetail;
          if (freshDetailResult) {
            await saveAuthData.userDetail(freshDetailResult); // Aktualizuj cache
          }

          // Pokud je userDetail dostupný, použij ho
          if (activeDetail) {
            setUserDetail(activeDetail);
            setAuthMethod(activeDetail.auth_method || null); // 🔐 EntraID: Set auth method from stored detail
            setFullName(`${activeDetail.jmeno || ''} ${activeDetail.prijmeni || ''}`.trim());

            if (storedPerms && storedPerms.length > 0) {
              setUserPermissions(storedPerms);
              // 🔐 Inicializovat expandedPermissions (hierarchie se načte níže)
              setExpandedPermissions(storedPerms);
            } else {
              const perms = extractPermissionCodes(activeDetail);
              setUserPermissions(perms);
              setExpandedPermissions(perms);
              await saveAuthData.userPermissions(perms);
            }
            
            // 🌲 HIERARCHIE: Načíst při page reload
            try {
              const { getHierarchyConfig } = await import('../services/hierarchyService');
              const { expandPermissionsWithHierarchy } = await import('../services/permissionHierarchyService');
              const config = await getHierarchyConfig(storedToken, storedUser.username);
              
              // 🛡️ Načíst ČERSTVÝ userDetail pro detekci HIERARCHY_IMMUNE
              // (cached data v localStorage nemají všechna práva)
              let hasImmunity = false;
              let currentPerms = storedPerms && storedPerms.length > 0 ? storedPerms : extractPermissionCodes(storedDetail);
              
              try {
                const freshDetail = await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
                const freshPerms = extractPermissionCodes(freshDetail || {});
                hasImmunity = freshPerms.includes('HIERARCHY_IMMUNE');
                currentPerms = freshPerms; // Použij čerstvá práva
              } catch (freshError) {
                console.warn('⚠️ Nepodařilo se načíst fresh userDetail, použiju cached:', freshError);
                hasImmunity = currentPerms.includes('HIERARCHY_IMMUNE');
              }
              
              setHierarchyStatus({
                hierarchyEnabled: config.enabled,
                isImmune: hasImmunity,
                profileId: config.profileId,
                profileName: config.profileName,
                logic: config.logic,
                logicDescription: config.logicDescription
              });
              
              // currentPerms už bylo získáno výše
              const hierarchyEnabled = Boolean(config.enabled && config.profileId);
              const expanded = expandPermissionsWithHierarchy(currentPerms, hierarchyEnabled, true, true);
              setExpandedPermissions(expanded);
            } catch (hierError) {
              console.warn('⚠️ Chyba při načítání hierarchie při page reload:', hierError);
            }
            
            // 🔐 USER IMPERSONATION: Načíst feature flag i při page reload
            try {
              const { getGlobalSettings } = await import('../services/globalSettingsApi');
              const settings = await getGlobalSettings(storedToken, storedUser.username);
              const impersonationEnabled = settings?.user_impersonation_enabled === true || settings?.user_impersonation_enabled === '1' || settings?.user_impersonation_enabled === 1;
              setImpersonationFeatureEnabled(impersonationEnabled);
            } catch (impError) {
              console.warn('⚠️ Chyba při načítání impersonation feature flag při page reload:', impError);
              setImpersonationFeatureEnabled(false);
            }
          } else {
            // fallback: načti detail
            const userDetail = await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
            setUserDetail(userDetail);
            setAuthMethod(userDetail.auth_method || null); // 🔐 EntraID: Set auth method
            setFullName(`${userDetail.jmeno || ''} ${userDetail.prijmeni || ''}`.trim());
            await saveAuthData.userDetail(userDetail);

            try {
              const perms = extractPermissionCodes(userDetail || {});
              setUserPermissions(perms);
              setExpandedPermissions(perms); // 🔐 Inicializovat
              await saveAuthData.userPermissions(perms);
            } catch {}
          }
          
          // ✅ KRITICKÉ: Nastavit isLoggedIn = true PO úspěšné validaci tokenu!
          setIsLoggedIn(true);
          setLoading(false);
          
          // 🔄 TOKEN REFRESH: Spustit auto-refresh timer i při page reload
          try {
            // Token byl načten z localStorage, zkus zjistit expiraci
            // Pro teď předpokládáme, že token vyprší za zbývající část 12h
            const expiresAt = Date.now() + (12 * 60 * 60 * 1000);
            tokenRefreshService.startRefreshTimer(expiresAt);
            if (process.env.NODE_ENV === 'development') {

            }
          } catch (error) {
            console.warn('⚠️ Chyba při startu token refresh timeru:', error);
          }
        } catch (error) {
          // ⚠️ KRITICKÁ LOGIKA: Rozpoznej TYP chyby a chovej se VELMI KONZERVATIVNĚ

          // Zkontroluj typ chyby - rozpoznej skutečné auth errory (401, 403) vs network errors
          const isAuthError = error.response?.status === 401 ||
                              error.response?.status === 403 ||
                              error.status === 401 ||
                              error.status === 403;

          const isNetworkError = error.code === 'ERR_NETWORK' ||
                                 error.message?.includes('Network Error') ||
                                 error.message?.includes('fetch') ||
                                 error.message?.includes('network') ||
                                 error.name === 'NetworkError' ||
                                 error.code === 'ECONNABORTED' ||
                                 error.code === 'TIMEOUT' ||
                                 !navigator.onLine;

          // Přidej detekci CORS chyb a server timeout chyb
          const isCorsOrServerError = error.message?.includes('CORS') ||
                                     error.message?.includes('blocked') ||
                                     error.response?.status >= 500 ||
                                     error.status >= 500;

          // 🔐 KRITICKÉ: Zkontroluj, jestli máme cached data před jakýmkoliv rozhodnutím o logout
          const storedDetail = await loadAuthData.userDetail();
          const storedPerms = await loadAuthData.userPermissions();
          
          const hasCachedData = storedDetail && storedUser && storedToken;

          if (isAuthError) {
            // 401/403 během page load - může být false positive
            // Pokud máme CACHED data, použij je a NEODHLAŠUJ okamžitě
            if (hasCachedData) {
              setUserDetail(storedDetail);
              setAuthMethod(storedDetail.auth_method || null); // 🔐 EntraID: Set auth method
              setFullName(`${storedDetail.jmeno || ''} ${storedDetail.prijmeni || ''}`.trim());
              if (storedPerms && storedPerms.length > 0) {
                setUserPermissions(storedPerms);
                setExpandedPermissions(storedPerms);
              }
              setIsLoggedIn(true);
              setLoading(false);
              
              if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ API vrátilo 401 při page load, ale používám cached data → ZŮSTÁVÁM přihlášen');
              }
            } else {
              // 🔐 USER IMPERSONATION: Pokud je impersonation aktivní, NESMÍME volat logout
              if (impState && impState.active) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ API vrátilo 401 při impersonation reload - neukončuji session');
                }
                // Použít minimální data pro obnovení
                setIsLoggedIn(true);
                setLoading(false);
              } else {
                // Žádná cached data + 401 + není impersonation = skutečný auth error
                logout('token_invalid');
                setLoading(false);
              }
            }
          } else if (isNetworkError || isCorsOrServerError) {
            // Network/server error - použij cached data, NEODHLAŠUJ
            if (hasCachedData) {
              setUserDetail(storedDetail);
              setAuthMethod(storedDetail.auth_method || null); // 🔐 EntraID: Set auth method
              setFullName(`${storedDetail.jmeno || ''} ${storedDetail.prijmeni || ''}`.trim());
              if (storedPerms && storedPerms.length > 0) {
                setUserPermissions(storedPerms);
                setExpandedPermissions(storedPerms);
              }
              setIsLoggedIn(true);
            }
            setLoading(false);
            // NEZAVOL logout() - nechej uživatele přihlášeného
          } else {
            // Jiná chyba - použij cached data pokud existují, jinak odhlásit
            if (hasCachedData) {
              setUserDetail(storedDetail);
              setAuthMethod(storedDetail.auth_method || null); // 🔐 EntraID: Set auth method
              setFullName(`${storedDetail.jmeno || ''} ${storedDetail.prijmeni || ''}`.trim());
              if (storedPerms && storedPerms.length > 0) {
                setUserPermissions(storedPerms);
                setExpandedPermissions(storedPerms);
              }
              setIsLoggedIn(true);
              setLoading(false);
            } else {
              // 🔐 USER IMPERSONATION: Pokud je impersonation aktivní, NESMÍME volat logout
              if (impState && impState.active) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ Chyba při reload během impersonation - neukončuji session');
                }
                // Použít minimální data pro obnovení
                setIsLoggedIn(true);
                setLoading(false);
              } else {
                // Žádná cached data + není impersonation - odhlásit
                logout('unknown_error');
                setLoading(false);
              }
            }
          }
        }
      };
      checkToken();
      } else {
        setIsLoggedIn(false);
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  // ✅ BROADCAST: Poslouchej změny z ostatních záložek
  useEffect(() => {
    // ⚠️ VYPNUTO v development mode (způsobuje problémy)
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Inicializuj broadcast channel
    initTabSync();

    // Registruj listener pro zprávy z ostatních záložek
    const cleanup = onTabSyncMessage(async (message) => {
      if (!message || !message.type) return;

      if (process.env.NODE_ENV === 'development') {
      }

      switch (message.type) {
        case BROADCAST_TYPES.LOGOUT:
          // Jiná záložka se odhlásila → odhlásit i tuto záložku (BEZ dalšího broadcast - zamezí loop)
          logout('other_tab_logout', true); // skipBroadcast = true
          break;

        case BROADCAST_TYPES.LOGIN:
          // Jiná záložka se přihlásila → načíst auth data z localStorage
          if (message.payload?.userId) {

            // Pokud je to jiný uživatel, než aktuální, logout a reload stránky
            if (user_id && message.payload.userId !== user_id) {
              logout('different_user_login', true); // skipBroadcast = true (přišlo přes broadcast)
              // Po logout počkat chvíli a pak reload (aby se vyčistila všechna data)
              setTimeout(() => window.location.reload(), 300);
              return;
            }

            // Pokud není nikdo přihlášen, načti data z localStorage
            if (!user_id || !token) {
              try {
                const storedUser = await loadAuthData.user();
                const storedToken = await loadAuthData.token();
                const storedDetail = await loadAuthData.userDetail();
                const storedPerms = await loadAuthData.userPermissions();

                if (storedUser && storedToken) {
                  setUser(storedUser);
                  setToken(storedToken);
                  setUserId(storedUser.id);

                  if (storedDetail) {
                    setUserDetail(storedDetail);
                    setFullName(`${storedDetail.jmeno || ''} ${storedDetail.prijmeni || ''}`.trim());
                  }

                  setIsLoggedIn(true);

                  if (storedPerms && storedPerms.length > 0) {
                    setUserPermissions(storedPerms);
                    setExpandedPermissions(storedPerms); // 🔐 Inicializovat
                  }
                }
              } catch (error) {
              }
            }
          }
          break;

        case BROADCAST_TYPES.USER_CHANGED:
          // Změna uživatele → force logout (redirect se provede automaticky přes auth-logout event)
          logout('user_change_detected', true); // skipBroadcast = true (už přišlo přes broadcast)
          // ❌ NEDĚLAT reload - logout už vyvolá auth-logout event který redirectne na /login
          break;

        default:
          // Ostatní zprávy ignoruj
          break;
      }
    });

    // Cleanup při unmount
    return () => {
      if (cleanup) cleanup();
      closeTabSync();
    };
  }, [logout, user_id, token]);

  // Helper: normalize permission codes from various possible shapes in userDetail
  const extractPermissionCodes = (detail) => {
    try {
      const out = new Set();
      const norm = (s) => (s || '').toString().trim().toUpperCase();

      const scanValue = (val) => {
        if (!val && val !== 0) return;
        if (typeof val === 'string') {
          val.split(/[;,|\s]+/).map(p => p.trim()).filter(Boolean).forEach(p => out.add(norm(p)));
          return;
        }
        if (Array.isArray(val)) {
          val.forEach(item => scanValue(item));
          return;
        }
        if (typeof val === 'object') {
          // try common keys inside object - UPDATED pro novou strukturu BE
          const candidateKeys = ['kod_prava','code','kod','name','nazev','nazev_role','permission','pravo','right'];
          let foundKey = false;
          for (const k of candidateKeys) {
            if (val[k] && typeof val[k] === 'string') {
              out.add(norm(val[k]));
              foundKey = true;
            }
          }

          // Pouze pokud jsme nenašli klíč s kódem, pokračuj v rekurzi
          if (!foundKey) {
            Object.values(val).forEach(v => {
              if (v === val) return; // avoid recursion
              if (v && (typeof v === 'string' || Array.isArray(v))) scanValue(v);
              // Už neskenuj vnořené objekty automaticky, aby se nepřidaly celé objekty
            });
          }
        }
      };

      // Common container keys
  const candidatePermKeys = ['permissions','perms','permissionList','prava','rights','privileges','scopes','opravneni','user_permissions','direct_rights','directRights'];
      const candidateFuncKeys = ['functions','funkce','funkceList','roles','role','roleList','user_roles'];

      for (const k of candidatePermKeys) if (detail[k]) scanValue(detail[k]);
      for (const k of candidateFuncKeys) if (detail[k]) scanValue(detail[k]);
      
      // 🔥 EXPLICITNÍ skenování roles[].rights (pro API struktu freshDetail)
      if (detail.roles && Array.isArray(detail.roles)) {
        detail.roles.forEach(role => {
          if (role.rights && Array.isArray(role.rights)) {
            scanValue(role.rights);
          }
          if (role.prava && Array.isArray(role.prava)) {
            scanValue(role.prava);
          }
        });
      }

      // also scan top-level values just in case
      Object.keys(detail || {}).forEach(k => {
        if (candidatePermKeys.includes(k) || candidateFuncKeys.includes(k)) return;
        const v = detail[k];
        if (typeof v === 'string' && /ORDER_APPROVE|ORDER|APPROVE|SCHVAL|PRAVO|PRAVY|HIERARCHY/i.test(v)) scanValue(v);
      });

      const result = Array.from(out).filter(Boolean);

      return result;
    } catch (e) {
      return [];
    }
  };

  // Expose helper to check permission existence quickly
  const hasPermission = useCallback((code) => {
    try {
      if (!code) return false;
      const norm = code.toString().trim().toUpperCase();
      
      // 🚨 SPECIÁLNÍ PŘÍPAD: 'ADMIN' není právo, ale alias pro kontrolu admin rolí!
      // Kontroluje, zda má uživatel roli SUPERADMIN nebo ADMINISTRATOR
      if (norm === 'ADMIN') {
        let ud = userDetail || {};
        // fallback: try persisted userDetail from localStorage
        try {
          if ((!ud || Object.keys(ud).length === 0) && typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem('auth_user_detail_persistent');
            if (raw) {
              try {
                ud = JSON.parse(raw) || ud;
              } catch {
                // Možná je to šifrované, ignoruj
              }
            }
          }
        } catch (e) {
          /* ignore */
        }
        
        if (ud?.roles && Array.isArray(ud.roles)) {
          return ud.roles.some(role => 
            role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
          );
        }
        return false;
      }
      
      // 🔐 HIERARCHIE: Použij expandedPermissions (obsahuje základní + hierarchická práva)
      // 1) fast path: precomputed expandedPermissions (obsahuje hierarchii)
      if ((expandedPermissions || []).some(p => p === norm)) return true;
      
      // 2) fallback: precomputed userPermissions (bez hierarchie)
      if ((userPermissions || []).some(p => p === norm)) return true;
      // 2) check raw userDetail direct_rights if present (array of objects or codes)
      let ud = userDetail || {};
      // fallback: try persisted userDetail from localStorage with PERSISTENT key
      try {
        if ((!ud || Object.keys(ud).length === 0) && typeof window !== 'undefined' && window.localStorage) {
          // ✅ OPRAVA: Použij správný PERSISTENT klíč
          const raw = localStorage.getItem('auth_user_detail_persistent');
          if (raw) {
            // Pokus se dešifrovat/parsovat
            try {
              ud = JSON.parse(raw) || ud;
            } catch {
              // Možná je to šifrované, ignoruj
            }
          }
        }
      } catch (e) {
        /* ignore */
      }
      const direct = ud.direct_rights || ud.directRights || ud.direct_rights?.data || ud.directRights?.data;
      if (Array.isArray(direct) && direct.length) {
        for (const d of direct) {
          if (!d) continue;
          if (typeof d === 'string' && d.toUpperCase() === norm) return true;
          if (typeof d === 'object') {
            const codeCandidate = (d.kod_prava || d.code || d.kod || d.key || d.id || d.name || d.code || '').toString().trim().toUpperCase();
            if (codeCandidate === norm) return true;
          }
        }
      }
      // 3) as a fallback, scan entire userDetail for whole-token matches only
      // Avoid naive substring matches (e.g. ORDER_READ matching ORDER_READ_OWN).
      if (typeof ud === 'object') {
        const flat = JSON.stringify(ud).toUpperCase();
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const token = escapeRegExp(norm);
        // Match token as a standalone word separated by non-alphanumerics/underscore so
        // ORDER_READ won't match ORDER_READ_OWN.
        const re = new RegExp(`(^|[^A-Z0-9_])${token}($|[^A-Z0-9_])`);
        if (re.test(flat)) return true;
      }
      return false;
    } catch (e) { return false; }
  }, [expandedPermissions, userPermissions, userDetail]); // 🔐 Závislost na expandedPermissions

  // Helper pro kontrolu admin role (SUPERADMIN nebo ADMINISTRATOR)
  // POZNÁMKA: 'ADMIN' NENÍ právo, je to alias pro kontrolu admin rolí!
  const hasAdminRole = useCallback(() => {
    if (!userDetail?.roles) return false;
    return userDetail.roles.some(role => 
      role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
    );
  }, [userDetail]);

  const username = user?.username || null;

  // 🔑 Funkce pro změnu hesla při vynuceném heslu  
  const changeForcePassword = async (newPassword) => {
    
    if (!user || !user.username || !tempToken) {
      console.error('❌ Chybí data:', { user, tempToken });
      throw new Error('Chybí informace o uživateli nebo token');
    }

    const username = user.username;
    
    try {
      // Změnit heslo přes správné API s tokenem z 403
      // NEPOTŘEBUJEME oldPassword - backend ověří vynucena_zmena_hesla flag
      const { changePasswordApi2 } = await import('../services/api2auth');
      
      const result = await changePasswordApi2({
        token: tempToken,
        username,
        oldPassword: '', // Prázdné - backend to nevyžaduje při vynucené změně
        newPassword
      });
      

      // Backend vrátil potvrzení o změně hesla
      if (result.success || result.token) {
        // Vyčisti temporary token (ale NECHEJ needsPasswordChange = true pro zobrazení dialogu)
        setTempToken(null);
        
        // 🔄 KOMPLETNÍ RELOGIN: Zavolat login() s novým heslem
        // Tím se načte všechno stejně jako při běžném přihlášení
        // DŮLEŽITÉ: login() automaticky nastaví needsPasswordChange = false pokud backend nevrátí forcePasswordChange
        await login(username, newPassword);
        
        // � POST-LOGIN MODAL: Po změně hesla zobrazit post-login modal PŘED reload
        // Toto je kritické - uživatel musí vidět důležité informace po prvním přihlášení
        try {
          const { checkPostLoginModal } = await import('../services/postLoginModalService');
          const modalConfig = await checkPostLoginModal(
            user.id,
            result.token || token, // Použít nový token z výsledku změny hesla
            username
          );
          
          if (modalConfig && modalConfig.enabled) {
            modalConfig.fromPasswordChange = true;
            
            // Vyvolat custom event - App.js ho zachytí a zobrazí modal
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('show-post-login-modal', {
                detail: modalConfig
              }));
            }
            
            // ⏱️ ODLOŽENÝ RELOAD: Dát uživateli čas přečíst modal PŘED reload
            // Modal je nyní viditelný, reload provedeme až po jeho zavření
            // Uživatel může modal zavřít nebo kliknout "Příště nezobrazovat"
            // Reload se provede automaticky po 30 sekundách jako fallback
            setTimeout(() => {
              const basePath = process.env.PUBLIC_URL || '/eeo-v2';
              window.location.href = basePath + '/';
            }, 30000); // 30 sekund fallback
            
            return; // DŮLEŽITÉ: Nekončit funkci, modal je zobrazen
          }
        } catch (modalError) {
          console.warn('⚠️ Chyba při kontrole post-login modal po změně hesla:', modalError);
          // Pokračovat s reload i při chybě modalu
        }
        
        // Pokud modal není k dispozici, provést normální reload
        setTimeout(() => {
          // Použij PUBLIC_URL pro správnou cestu v DEV i PROD
          const basePath = process.env.PUBLIC_URL || '/eeo-v2';
          window.location.href = basePath + '/';
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Chyba při vynucené změně hesla:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      username, 
      token, 
      isLoggedIn, 
      login, 
      logout, 
      error, 
      fullName, 
      setToken, 
      loading, 
      user_id, 
      userDetail, 
      userPermissions,
      expandedPermissions, // 🔐 HIERARCHIE: Rozšířená práva
      authMethod, // 🔐 EntraID: Authentication method ('local' or 'entra_id')
      hasPermission, 
      hasAdminRole, 
      refreshUserDetail,
      hierarchyStatus, // 🌲 HIERARCHIE WORKFLOW
      setHierarchyStatus, // 🌲 HIERARCHIE: Setter pro hierarchyStatus
      impersonationFeatureEnabled, // 🔐 USER IMPERSONATION: Feature flag
      impersonationActive, // 🔐 USER IMPERSONATION: Je aktivní impersonation?
      originalAdminUser, // 🔐 USER IMPERSONATION: Původní admin uživatel (backup)
      startImpersonationContext, // 🔐 USER IMPERSONATION: Začít impersonation
      stopImpersonationContext, // 🔐 USER IMPERSONATION: Ukončit impersonation
      refreshImpersonationFeatureFlag, // 🔐 USER IMPERSONATION: Refresh feature flag
      needsPasswordChange, // 🔑 Flag pro vynucenou změnu hesla
      changeForcePassword, // 🔑 Funkce pro změnu hesla
      isRefreshingToken, // 🔄 Flag pro sledování token refreshu
      setIsRefreshingToken // 🔄 Setter pro isRefreshingToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
export { AuthContext };
