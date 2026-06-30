import { useState, useEffect } from 'react';
import authService from '../services/authService';
import './Dashboard.css';
// import CopilotWidget from './CopilotWidget'; // SKRYTÝ - čeká na Azure OpenAI

// Verze aplikace z environment
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('apps');
  const [employees, setEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterNonZachranka, setFilterNonZachranka] = useState(false);
  const [filterWithEmail, setFilterWithEmail] = useState(false);
  const [filterLicense, setFilterLicense] = useState('all');
  const [filterAccountStatus, setFilterAccountStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [availableLicenses, setAvailableLicenses] = useState([]);
  const [expandedSupervisors, setExpandedSupervisors] = useState(new Set());
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [darkMode, setDarkMode] = useState(() => {
    // Načíst z localStorage nebo použít systémové nastavení
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [expandedEmployeeGroups, setExpandedEmployeeGroups] = useState({});
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarHoverTimeout, setCalendarHoverTimeout] = useState(null);
  const [lastSessionCheck, setLastSessionCheck] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [loadingGraphTest, setLoadingGraphTest] = useState(false);
  const [graphTestData, setGraphTestData] = useState(null);
  const [graphTestError, setGraphTestError] = useState('');
  const [graphTestLastRun, setGraphTestLastRun] = useState(null);

  const usernameLower = (user?.username || '').toLowerCase();
  const upnLower = (user?.upn || '').toLowerCase();
  const userFullName = user ? `${user.jmeno || ''} ${user.prijmeni || ''}`.trim() : '';
  const userRole = user?.entraData?.jobTitle || user?.jobTitle || '';
  const userDepartment = user?.entraData?.department || user?.department || '';
  const userManager = user?.entraData?.manager?.displayName || '';
  const userGroupsCount = user?.entraData?.memberOf?.length || 0;

  const withM365LoginHints = (url) => {
    if (!user?.upn) return url;

    try {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set('login_hint', user.upn);
      parsedUrl.searchParams.set('domain_hint', 'organizations');
      return parsedUrl.toString();
    } catch (error) {
      console.warn('Cannot append M365 login hints:', error);
      return url;
    }
  };

  const extractGuid = (value) => {
    if (!value || typeof value !== 'string') return null;
    const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = value.match(guidRegex);
    return match ? match[0] : null;
  };
  
  // Kontrola zda je admin (u03924, u09721, u09694 nebo u09764)
  const isAdmin = usernameLower === 'u03924' || 
                  upnLower.startsWith('u03924@') ||
                  usernameLower === 'u09721' || 
                  upnLower.startsWith('u09721@') ||
                  usernameLower === 'u09694' || 
                  upnLower.startsWith('u09694@') ||
                  usernameLower === 'u09764' || 
                  upnLower.startsWith('u09764@');
  const isGraphTester = usernameLower === 'u03924' || upnLower.startsWith('u03924@');

  const safeFetchGraph = async (url) => {
    const startedAt = performance.now();
    try {
      const response = await fetch(url, { credentials: 'include' });
      const durationMs = Math.round(performance.now() - startedAt);
      const payload = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        status: response.status,
        durationMs,
        payload,
        error: response.ok ? null : (payload.error || `HTTP ${response.status}`)
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        durationMs: Math.round(performance.now() - startedAt),
        payload: null,
        error: error.message
      };
    }
  };

  const runGraphApiTest = async () => {
    if (!isGraphTester || !user) return;

    setLoadingGraphTest(true);
    setGraphTestError('');

    try {
      const ownUserId =
        extractGuid(user?.entraData?.id) ||
        extractGuid(user?.entra_id) ||
        extractGuid(user?.id);
      const ownEmail = user.email;
      const ownNameQuery = `${user.jmeno || ''} ${user.prijmeni || ''}`.trim();

      if (!ownUserId) {
        throw new Error('Chybí user.id, nelze spustit Graph test profilů.');
      }

      const [
        selfProfile,
        selfGroups,
        selfManager,
        selfDirectReports,
        calendarEvents,
        calendarDebug,
        searchByEmail,
        usersSample,
        usersSearch,
        recentMessages,
        recentDocuments
      ] = await Promise.all([
        safeFetchGraph(`/api/entra/user/${ownUserId}/profile`),
        safeFetchGraph(`/api/entra/user/${ownUserId}/groups`),
        safeFetchGraph(`/api/entra/user/${ownUserId}/manager`),
        safeFetchGraph(`/api/entra/user/${ownUserId}/direct-reports`),
        safeFetchGraph('/api/entra/me/calendar/events?days=14'),
        safeFetchGraph('/api/entra/me/calendar/debug'),
        ownEmail ? safeFetchGraph(`/api/entra/search/user?email=${encodeURIComponent(ownEmail)}`) : Promise.resolve(null),
        safeFetchGraph('/api/entra/users/paginated?pageSize=20'),
        ownNameQuery.length >= 3
          ? safeFetchGraph(`/api/entra/users/search?q=${encodeURIComponent(ownNameQuery)}&limit=20`)
          : Promise.resolve(null),
        safeFetchGraph('/api/entra/me/messages/recent?limit=5'),
        safeFetchGraph('/api/entra/me/documents/recent?limit=5')
      ]);

      const allCalendarEvents = Array.isArray(calendarEvents?.payload?.data) ? calendarEvents.payload.data : [];
      const todayDateKey = new Date().toISOString().slice(0, 10);
      const todayMeetings = allCalendarEvents.filter((event) => {
        const dt = event?.start?.dateTime;
        if (!dt) return false;
        return String(dt).slice(0, 10) === todayDateKey;
      });

      const messageItems = Array.isArray(recentMessages?.payload?.data) ? recentMessages.payload.data : [];
      const unreadMessages = messageItems.filter((m) => m?.isRead === false);
      const documentItems = Array.isArray(recentDocuments?.payload?.data) ? recentDocuments.payload.data : [];

      const endpointHealth = {
        selfProfile:
          !!selfProfile?.ok &&
          !!selfProfile?.payload?.success &&
          !!selfProfile?.payload?.data?.user,
        selfGroups: !!selfGroups?.ok && !!selfGroups?.payload?.success,
        selfManager: !!selfManager?.ok && !!selfManager?.payload?.success,
        selfDirectReports: !!selfDirectReports?.ok && !!selfDirectReports?.payload?.success,
        calendarEvents: !!calendarEvents?.ok && !!calendarEvents?.payload?.success,
        calendarDebug: !!calendarDebug?.ok && !!calendarDebug?.payload?.success,
        searchByEmail: searchByEmail ? !!searchByEmail?.ok && !!searchByEmail?.payload?.success : true,
        usersSample: !!usersSample?.ok && !!usersSample?.payload?.success,
        usersSearch: usersSearch ? !!usersSearch?.ok && !!usersSearch?.payload?.success : true,
        recentMessages: !!recentMessages?.ok && !!recentMessages?.payload?.success,
        recentDocuments: !!recentDocuments?.ok && !!recentDocuments?.payload?.success
      };

      const allResults = {
        selfProfile,
        selfGroups,
        selfManager,
        selfDirectReports,
        calendarEvents,
        calendarDebug,
        searchByEmail,
        usersSample,
        usersSearch,
        recentMessages,
        recentDocuments
      };

      const totalChecks = Object.values(endpointHealth).length;
      const okChecks = Object.values(endpointHealth).filter(Boolean).length;

      const summary = {
        totalChecks,
        okChecks,
        failedChecks: totalChecks - okChecks,
        graphUserIdUsed: ownUserId,
        groupCount: selfGroups?.payload?.count || 0,
        directReportsCount: selfDirectReports?.payload?.count || 0,
        calendarEventsCount: Array.isArray(calendarEvents?.payload?.data) ? calendarEvents.payload.data.length : 0,
        usersSampleCount: usersSample?.payload?.data?.count || usersSample?.payload?.count || 0,
        managerName: selfManager?.payload?.data?.displayName || null,
        recentMessagesCount: messageItems.length,
        unreadMessagesCount: unreadMessages.length,
        recentDocumentsCount: documentItems.length,
        todayMeetingsCount: todayMeetings.length
      };

      setGraphTestData({ summary, endpointHealth, results: allResults });
      setGraphTestLastRun(new Date());
    } catch (error) {
      console.error('Graph API test failed:', error);
      setGraphTestError(error.message || 'Neočekávaná chyba při Graph testu');
    } finally {
      setLoadingGraphTest(false);
    }
  };
  
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Aplikovat dark mode na body
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    let minuteIntervalId;

    const updateDateTime = () => {
      setCurrentDateTime(new Date());
    };

    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const firstTickTimeoutId = setTimeout(() => {
      updateDateTime();
      minuteIntervalId = setInterval(updateDateTime, 60 * 1000);
    }, msToNextMinute);

    return () => {
      clearTimeout(firstTickTimeoutId);
      if (minuteIntervalId) {
        clearInterval(minuteIntervalId);
      }
    };
  }, []);

  // Keep-alive session: pravidelný ping + obnovení při návratu do záložky.
  // Záměrně nemažeme user state při krátkém výpadku sítě, aby nemizely prvky v hlavičce.
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const keepSessionAlive = async () => {
      try {
        const freshUser = await authService.getCurrentUser();
        if (!isMounted) return;

        if (freshUser) {
          setUser(freshUser);
          setLastSessionCheck(Date.now());
        }
      } catch (error) {
        console.warn('Session keep-alive failed:', error);
      }
    };

    const intervalId = setInterval(keepSessionAlive, 4 * 60 * 1000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (!lastSessionCheck || now - lastSessionCheck > 60 * 1000) {
          keepSessionAlive();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [user, lastSessionCheck]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingEmployees(true);
      console.log('📥 Načítám zaměstnance...');
      
      const response = await fetch('/api/entra/users?limit=1500', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Zaměstnanci načteni:', result);
        console.log('📊 Prvních 5 zaměstnanců:', result.data?.slice(0, 5));
        
        if (result.success && result.data) {
          setEmployees(result.data);
          setTotalEmployees(result.count || result.data.length);
          console.log('👥 Počet zaměstnanců:', result.data.length);
          
          // Načti skupiny pro všechny zaměstnance (postupně pro získání licencí)
          loadAllEmployeeGroups(result.data);
        }
      } else {
        const error = await response.text();
        console.error('❌ Chyba při načítání:', error);
      }
    } catch (err) {
      console.error('❌ Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadAllEmployeeGroups = async (employeeList) => {
    console.log('📋 Načítám skupiny pro VŠECHNY zaměstnance (může trvat déle)...');
    const licenseSet = new Set();
    const batchSize = 50;
    
    // Načti skupiny pro VŠECHNY zaměstnance v dávkách
    for (let i = 0; i < employeeList.length; i += batchSize) {
      const batch = employeeList.slice(i, i + batchSize);
      console.log(`📦 Načítám dávku ${i + 1}-${Math.min(i + batchSize, employeeList.length)} z ${employeeList.length}...`);
      
      const promises = batch.map(async (emp) => {
        try {
          const response = await fetch(`/api/entra/user/${emp.id}/groups`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Ulož skupiny pro filtrování
              setEmployeeDetails(prev => ({
                ...prev,
                [emp.id]: { groups: data.data }
              }));
              
              // Extrahuj M365-License skupiny
              data.data.forEach(group => {
                if (group.displayName && group.displayName.startsWith('M365-License')) {
                  licenseSet.add(group.displayName);
                }
              });
            }
          }
        } catch (err) {
          console.error(`Failed to load groups for ${emp.displayName}:`, err);
        }
      });
      
      await Promise.all(promises);
      
      // Aktualizuj seznam licencí po každé dávce
      const licenses = Array.from(licenseSet).sort();
      setAvailableLicenses(licenses);
    }
    
    console.log('✅ Skupiny načteny pro všechny zaměstnance');
    console.log('📜 Celkem nalezeno licencí:', Array.from(licenseSet).length);
  };

  const getFilteredEmployees = () => {
    let filtered = searchQuery.length >= 3 ? searchResults : employees;
    const startCount = filtered.length;
    
    // Filtr pro status účtu
    if (filterAccountStatus === 'active') {
      filtered = filtered.filter(emp => emp.accountEnabled === true);
      console.log(`🔍 Filtr aktivní: ${filtered.length} z ${startCount}`);
    } else if (filterAccountStatus === 'inactive') {
      filtered = filtered.filter(emp => emp.accountEnabled === false);
      console.log(`🔍 Filtr neaktivní: ${filtered.length} z ${startCount}`);
    }
    
    // Filtr pro vyplněný email (AND s non-zachranka)
    if (filterWithEmail) {
      const beforeEmail = filtered.length;
      filtered = filtered.filter(emp => {
        const email = (emp.mail || '').trim();
        return email.length > 0;
      });
      console.log(`🔍 Filtr s emailem: ${filtered.length} z ${beforeEmail}`);
    }
    
    // Filtr pro non-zachranka emailové domény (AND s filterWithEmail)
    if (filterNonZachranka) {
      const beforeDomain = filtered.length;
      filtered = filtered.filter(emp => {
        const email = (emp.mail || emp.userPrincipalName || '').toLowerCase();
        return !email.endsWith('@zachranka.cz');
      });
      console.log(`🔍 Filtr non-zachranka: ${filtered.length} z ${beforeDomain}`);
    }
    
    // Filtr pro licence (založený na skupinách)
    if (filterLicense !== 'all') {
      const beforeLicense = filtered.length;
      const employeesWithGroups = filtered.filter(emp => employeeDetails[emp.id]?.groups);
      console.log(`📋 Zaměstnanců s načtenými skupinami: ${employeesWithGroups.length} z ${filtered.length}`);
      
      filtered = filtered.filter(emp => {
        const details = employeeDetails[emp.id];
        if (!details || !details.groups) {
          console.log(`⚠️ ${emp.displayName} nemá načtené skupiny`);
          return false;
        }
        
        if (filterLicense === 'any-license') {
          // Jakákoliv M365-License* skupina
          const hasLicense = details.groups.some(g => g.displayName && g.displayName.startsWith('M365-License'));
          if (hasLicense) {
            console.log(`✓ ${emp.displayName} má licenci:`, details.groups.filter(g => g.displayName?.startsWith('M365-License')).map(g => g.displayName));
          }
          return hasLicense;
        } else {
          // Konkrétní licence
          const hasSpecificLicense = details.groups.some(g => g.displayName === filterLicense);
          if (hasSpecificLicense) {
            console.log(`✓ ${emp.displayName} má licenci ${filterLicense}`);
          }
          return hasSpecificLicense;
        }
      });
      console.log(`🔍 Filtr licence "${filterLicense}": ${filtered.length} z ${beforeLicense}`);
    }
    
    // Filtr pro úsek (department)
    if (filterDepartment !== 'all') {
      const beforeDept = filtered.length;
      if (filterDepartment === 'with-department') {
        // Pouze zaměstnanci s vyplněným úsekem
        filtered = filtered.filter(emp => {
          const dept = (emp.department || '').trim();
          return dept.length > 0;
        });
        console.log(`🔍 Filtr s úsekem: ${filtered.length} z ${beforeDept}`);
      } else if (filterDepartment === 'without-department') {
        // Pouze zaměstnanci bez vyplněného úseku
        filtered = filtered.filter(emp => {
          const dept = (emp.department || '').trim();
          return dept.length === 0;
        });
        console.log(`🔍 Filtr bez úseku: ${filtered.length} z ${beforeDept}`);
      }
    }
    
    return filtered;
  };

  // Normalizace textu - odstraní diakritiku a převede na lowercase
  const normalizeText = (text) => {
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    // Vyhledávání lokálně v již načtených zaměstnancích (1500)
    const searchTerm = normalizeText(query.trim());
    console.log('🔍 Lokální hledání:', searchTerm, 'v', employees.length, 'zaměstnancích');
    
    const filtered = employees.filter(emp => {
      const fields = [
        emp.displayName,
        emp.givenName,
        emp.surname,
        emp.mail,
        emp.userPrincipalName,
        emp.jobTitle,
        emp.department,
        emp.employeeId,
        emp.id,
      ];
      
      // Prohledej i názvy skupin (pokud jsou načtené)
      const groups = (employeeDetails[emp.id]?.groups || []).map(g => g.displayName || '');
      
      return fields.some(f => normalizeText(f).includes(searchTerm)) ||
             groups.some(g => normalizeText(g).includes(searchTerm));
    });
    
    console.log('📊 Nalezeno:', filtered.length, 'zaměstnanců');
    setSearchResults(filtered);
  };

  const toggleEmployeeDetail = async (employee) => {
    if (expandedEmployee === employee.id) {
      setExpandedEmployee(null);
      return;
    }

    setExpandedEmployee(employee.id);

    if (employeeDetails[employee.id]) {
      return;
    }

    try {
      const response = await fetch(`/api/entra/user/${employee.id}/profile`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEmployeeDetails(prev => ({
            ...prev,
            [employee.id]: data.data
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load employee details:', err);
    }
  };
  
  const handleLogout = async () => {
    await authService.logout();
  };

  // Pokročilé parsování organizační struktury s AI přiřazováním
  const parseDepartmentAdvanced = (department, jobTitle = '') => {
    if (!department) return null;
    
    const dept = department.toLowerCase();
    const job = (jobTitle || '').toLowerCase();
    
    // AI/Heuristické přiřazení k náměstkům na základě klíčových slov
    const assignToSupervisor = (deptName) => {
      const name = deptName.toLowerCase();
      
      // Lékařský náměstek (LN)
      if (name.includes('lékař') || name.includes('lekar') || name.includes('medicín') || 
          name.includes('primář') || name.includes('primar') || name.includes('ordinac') ||
          name.includes('amb') || name.includes('rtg') || name.includes('lab')) {
        return 'LN';
      }
      
      // Ekonomický náměstek (EN) 
      if (name.includes('ekonom') || name.includes('účet') || name.includes('ucet') ||
          name.includes('majetek') || name.includes('pojišť') || name.includes('pojist') ||
          name.includes('finance') || name.includes('rozpočet') || name.includes('rozpoct')) {
        return 'EN';
      }
      
      // Personální náměstek (PN) - HR, mzdy, zaměstnanci
      if (name.includes('personal') || name.includes('mzd') || name.includes('hr') ||
          name.includes('zaměstnanec') || name.includes('zamestnanec') ||
          name.includes('kadry') || name.includes('pracovní') || name.includes('pracovni') ||
          name.includes('lidsk') || name.includes('sociál') || name.includes('social')) {
        return 'PN';
      }
      
      // Náměstek pro dispečink (ND)
      if (name.includes('disp') || name.includes('operac') || name.includes('voj') ||
          name.includes('oznam') || name.includes('komunikac')) {
        return 'ND';
      }
      
      // NNLZP (Náměstek pro nelékařské zdravotnické pracovníky) - včetně řidičů a záchranářů
      if (name.includes('záchran') || name.includes('zachran') || name.includes('zzp') ||
          name.includes('nelékař') || name.includes('nelekar') || name.includes('zdravot') ||
          name.includes('param') || name.includes('řidič') || name.includes('ridic') ||
          name.includes('vozidl') || name.includes('doprav') || name.includes('sanitk') ||
          name.includes('ambulanc')) {
        return 'NNLZP';
      }
      
      // Technický náměstek (PT/PTN) - Provozně technická správa
      if (name.includes('technick') || name.includes('tech') || name.includes('údržb') || 
          name.includes('udrzb') || name.includes('provoz') || name.includes('pt') ||
          name.includes('ptn') || name.includes('thp') || name.includes('pes') ||
          name.includes('provozně') || name.includes('provozne') || name.includes('správ') ||
          name.includes('sprav') || name.includes('ekonomická správa') || name.includes('ekonomicka sprava')) {
        return 'PT';
      }
      
      // IT a informatika (NS) - oddělené od technického úseku
      if (name.includes('it') || name.includes('informatik') || name.includes('počítač') ||
          name.includes('pocitac') || name.includes('software') || name.includes('hardware') ||
          name.includes('síť') || name.includes('sit') || name.includes('server')) {
        return 'NS';
      }
      
      return 'OTHER';
    };

    // Detekce hierarchie pozic
    const detectPositionLevel = (jobTitle, department) => {
      const job = (jobTitle || '').toLowerCase();
      const dept = (department || '').toLowerCase();
      
      // Ředitel
      if (job.includes('ředitel') || job.includes('reditel') || job.includes('generál')) {
        return 'DIRECTOR';
      }
      
      // Náměstek nebo zástupce
      if (job.includes('náměst') || job.includes('namest') || job.includes('zást') || 
          job.includes('zast') || job.includes('deputy') || job.includes('vice')) {
        return 'DEPUTY';
      }
      
      // Primář
      if (job.includes('primář') || job.includes('primar') || job.includes('primár')) {
        return 'PRIMARY';
      }
      
      // Vedoucí - rozšířená detekce (ale NE zástupce vedoucího)
      if ((job.includes('vedouc') || job.includes('šéf') || job.includes('sef') || 
          job.includes('manag') || job.includes('koordin') || job.includes('head') ||
          job.includes('chief') || job.includes('leader') || job.includes('supervisor')) &&
          !job.includes('zást') && !job.includes('zast') && !job.includes('deputy')) {
        return 'MANAGER';
      }
      
      // Specializované pozice
      if (job.includes('lékař') || job.includes('lekar') || job.includes('md') || job.includes('mudr')) {
        return 'DOCTOR';
      }
      
      if (job.includes('záchran') || job.includes('zachran') || job.includes('param')) {
        return 'PARAMEDIC';
      }
      
      if (job.includes('účet') || job.includes('ucet') || job.includes('ekonom')) {
        return 'ACCOUNTANT';
      }
      
      if (job.includes('personal') || job.includes('hr') || job.includes('mzd')) {
        return 'HR';
      }
      
      return 'EMPLOYEE';
    };

    // Parsing různých formátů
    let unitNumber = null;
    let unitName = department;
    let supervisor = null;
    
    // Formát: "901 - Úsek ekonomický"
    const match1 = department.match(/^(\d+)\s*-\s*(.+)$/);
    if (match1) {
      unitNumber = match1[1];
      unitName = match1[2].trim();
    }
    
    // Formát: "901-Personální a mzdové"
    const match2 = department.match(/^(\d+)-(.+)$/);
    if (match2) {
      unitNumber = match2[1];
      unitName = match2[2].trim();
    }
    
    // AI přiřazení k náměstkovi
    supervisor = assignToSupervisor(unitName);
    
    // Detekce pozice v hierarchii
    const positionLevel = detectPositionLevel(jobTitle, department);
    
    return {
      unitNumber,
      unitName,
      supervisor,
      positionLevel,
      original: department,
      jobTitle: jobTitle
    };
  };

  // Vytvoření pokročilé organizační hierarchie
  const buildAdvancedOrganizationHierarchy = () => {
    const hierarchy = {
      reditelstvi: { 
        name: 'Ředitelství',
        employees: [],
        totalCount: 0
      },
      namestci: {}
    };

    employees.forEach(emp => {
      const parsed = parseDepartmentAdvanced(emp.department, emp.jobTitle);
      
      if (!parsed) {
        // Nezařazení
        if (!hierarchy.namestci['OTHER']) {
          hierarchy.namestci['OTHER'] = {
            name: 'OTHER',
            fullName: 'Ostatní / Nezařazení',
            employees: [],
            units: {},
            managers: {},
            totalCount: 0
          };
        }
        hierarchy.namestci['OTHER'].employees.push(emp);
        hierarchy.namestci['OTHER'].totalCount++;
        return;
      }

      // Ředitelé
      if (parsed.positionLevel === 'DIRECTOR') {
        hierarchy.reditelstvi.employees.push(emp);
        hierarchy.reditelstvi.totalCount++;
        return;
      }

      // Náměstci a jejich struktura
      if (!hierarchy.namestci[parsed.supervisor]) {
        hierarchy.namestci[parsed.supervisor] = {
          name: parsed.supervisor,
          fullName: getSupervisorFullName(parsed.supervisor),
          employees: [], // Přímo podřízení náměstkovi
          units: {},     // Úseky
          managers: {},  // Vedoucí/Primáři
          totalCount: 0
        };
      }

      const supervisor = hierarchy.namestci[parsed.supervisor];

      // Náměstci sami
      if (parsed.positionLevel === 'DEPUTY') {
        supervisor.employees.push(emp);
        supervisor.totalCount++;
        return;
      }

      // Úseky
      if (parsed.unitNumber) {
        const unitKey = `${parsed.unitNumber}-${parsed.unitName}`;
        
        if (!supervisor.units[unitKey]) {
          supervisor.units[unitKey] = {
            number: parsed.unitNumber,
            name: parsed.unitName,
            employees: [],
            managers: {}, // Primáři/Vedoucí v úseku
            totalCount: 0
          };
        }

        const unit = supervisor.units[unitKey];

        // Primáři/Vedoucí v úseku
        if (parsed.positionLevel === 'PRIMARY' || parsed.positionLevel === 'MANAGER') {
          const managerKey = `${emp.id}-${emp.displayName}`;
          
          if (!unit.managers[managerKey]) {
            unit.managers[managerKey] = {
              manager: emp,
              subordinates: [],
              totalCount: 1
            };
          }
        } else {
          // Běžní zaměstnanci - přiřadíme k primáři pokud existuje
          let assignedToManager = false;
          
          // Pokud je to lékař, pokusíme se přiřadit k primáři
          if (parsed.positionLevel === 'DOCTOR' && Object.keys(unit.managers).length > 0) {
            const primaryKey = Object.keys(unit.managers)[0]; // Vezmi prvního primáře
            unit.managers[primaryKey].subordinates.push(emp);
            unit.managers[primaryKey].totalCount++;
            assignedToManager = true;
          }
          
          if (!assignedToManager) {
            unit.employees.push(emp);
          }
        }
        
        unit.totalCount++;
        supervisor.totalCount++;
      } else {
        // Bez čísla úseku - přímo pod náměstka
        supervisor.employees.push(emp);
        supervisor.totalCount++;
      }
    });

    return hierarchy;
  };

  // Toggle funkce pro rozbalovací uzly
  const toggleSupervisor = (supervisorCode) => {
    const newExpanded = new Set(expandedSupervisors);
    if (newExpanded.has(supervisorCode)) {
      newExpanded.delete(supervisorCode);
    } else {
      newExpanded.add(supervisorCode);
    }
    setExpandedSupervisors(newExpanded);
  };

  const toggleUnit = (unitKey) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitKey)) {
      newExpanded.delete(unitKey);
    } else {
      newExpanded.add(unitKey);
    }
    setExpandedUnits(newExpanded);
  };

  // Mapování zkratek na plné názvy
  const getSupervisorFullName = (code) => {
    const mapping = {
      'NNLZP': 'Náměstek pro nelékařské zdravotnické pracovníky',
      'LN': 'Lékařský náměstek',
      'PN': 'Personální náměstek',
      'EN': 'Ekonomický náměstek',
      'PT': 'Technický náměstek (Provozně technická správa)', 
      'NS': 'Náměstek pro IT a informatiku',
      'ND': 'Náměstek pro dispečink',
      'NE': 'Náměstek pro ekonomiku',
      'ZZ': 'Zdravotnický záchranář',
      'DIR': 'Ředitelství',
      'OTHER': 'Ostatní'
    };
    return mapping[code] || code;
  };

  const getPositionFullName = (code) => {
    const mapping = {
      'ZZ': 'Zdravotnický záchranář',
      'LN': 'Lékař',
      'VED': 'Vedoucí',
      'DIR': 'Ředitel',
      'PN': 'Provozní pracovník',
      'EN': 'Ekonom'
    };
    return mapping[code] || code;
  };

  const loadCalendarEvents = async (forceReload = false) => {
    // Pokud už načítáme nebo už máme data (a není force reload), skipni
    if (loadingCalendar || (!forceReload && calendarEvents.length > 0)) return;
    
    try {
      setLoadingCalendar(true);
      const response = await fetch('/api/entra/me/calendar/events?days=7', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log('📅 Calendar events received:', data.data.length, 'events');
          setCalendarEvents(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Auto-refresh kalendáře každých 5 minut na pozadí
  useEffect(() => {
    if (!user) return;

    // První načtení
    loadCalendarEvents();

    // Background refresh každých 5 minut (300000 ms)
    const intervalId = setInterval(() => {
      console.log('📅 Auto-refresh kalendáře...');
      loadCalendarEvents(true); // Force reload
    }, 5 * 60 * 1000);

    // Cleanup při unmount
    return () => clearInterval(intervalId);
  }, [user]);

  const toggleCalendarDropdown = () => {
    if (!calendarDropdownOpen) {
      loadCalendarEvents();
    }
    setCalendarDropdownOpen(!calendarDropdownOpen);
  };

  const formatEventDate = (startDateTime, endDateTime) => {
    // Graph API vrací {dateTime: '2025-12-25T11:30:00.0000000', timeZone: 'Europe/Prague'}
    // Čas už JE v pražském timezone, takže NESMÍME konvertovat!
    let startStr, endStr;
    if (typeof startDateTime === 'string') {
      startStr = startDateTime;
    } else if (startDateTime && startDateTime.dateTime) {
      startStr = startDateTime.dateTime;
    } else {
      return 'Invalid date';
    }
    
    if (endDateTime) {
      if (typeof endDateTime === 'string') {
        endStr = endDateTime;
      } else if (endDateTime && endDateTime.dateTime) {
        endStr = endDateTime.dateTime;
      }
    }
    
    // Parsuj datum a čas přímo (už je v pražském čase)
    // Format: 2025-12-25T11:30:00.0000000
    const matchStart = startStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!matchStart) return startStr;
    
    const [, year, month, day, hourStart, minuteStart] = matchStart;
    const timeStart = `${hourStart}:${minuteStart}`;
    
    // Parsuj konec pokud existuje
    let timeEnd = '';
    if (endStr) {
      const matchEnd = endStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (matchEnd) {
        timeEnd = `${matchEnd[4]}:${matchEnd[5]}`;
      }
    }
    
    // Porovnej s dneškem a zítřkem
    const now = new Date();
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    const timeRange = timeEnd ? `${timeStart} – ${timeEnd}` : timeStart;
    
    if (eventDateOnly.getTime() === today.getTime()) {
      return `Dnes ${timeRange}`;
    } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
      return `Zítra ${timeRange}`;
    } else {
      return `${parseInt(day)}.${parseInt(month)}. ${timeRange}`;
    }
  };

  const calculateDuration = (startDateTime, endDateTime) => {
    if (!startDateTime || !endDateTime) return null;
    
    let startStr, endStr;
    if (typeof startDateTime === 'string') {
      startStr = startDateTime;
    } else if (startDateTime && startDateTime.dateTime) {
      startStr = startDateTime.dateTime;
    }
    
    if (typeof endDateTime === 'string') {
      endStr = endDateTime;
    } else if (endDateTime && endDateTime.dateTime) {
      endStr = endDateTime.dateTime;
    }
    
    if (!startStr || !endStr) return null;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return `${diffMinutes}min`;
    } else if (diffHours % 1 === 0) {
      return `${diffHours}h`;
    } else {
      return `${diffHours.toFixed(1)}h`;
    }
  };

  const isEventPast = (endDateTime) => {
    if (!endDateTime) return false;
    
    let endStr;
    if (typeof endDateTime === 'string') {
      endStr = endDateTime;
    } else if (endDateTime && endDateTime.dateTime) {
      endStr = endDateTime.dateTime;
    }
    
    if (!endStr) return false;
    
    const end = new Date(endStr);
    const now = new Date();
    return end < now;
  };

  const getCategoryColor = (categories) => {
    if (!categories || categories.length === 0) return '#0078D4';
    
    // Skutečné barvy z Outlook kalendarů
    const categoryColors = {
      // České názvy
      'Červená kategorie': '#E74856',
      'Oranžová kategorie': '#CA5010',
      'Hnědá kategorie': '#8E562E',
      'Žlutá kategorie': '#C19C00',
      'Zelená kategorie': '#10893E',
      'Tyrkysová kategorie': '#00B7C3',
      'Modrá kategorie': '#0078D4',
      'Fialová kategorie': '#8764B8',
      'Šedá kategorie': '#69797E',
      // Anglické názvy
      'Red category': '#E74856',
      'Orange category': '#CA5010',
      'Brown category': '#8E562E',
      'Yellow category': '#C19C00',
      'Green category': '#10893E',
      'Teal category': '#00B7C3',
      'Blue category': '#0078D4',
      'Purple category': '#8764B8',
      'Gray category': '#69797E',
      'Grey category': '#69797E'
    };
    
    return categoryColors[categories[0]] || '#0078D4';
  };

  const handleCalendarMouseEnter = () => {
    if (calendarHoverTimeout) {
      clearTimeout(calendarHoverTimeout);
      setCalendarHoverTimeout(null);
    }
    setCalendarDropdownOpen(true);
    loadCalendarEvents();
  };

  const handleCalendarMouseLeave = () => {
    const timeout = setTimeout(() => {
      setCalendarDropdownOpen(false);
    }, 300);
    setCalendarHoverTimeout(timeout);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <div className="logo-ring"></div>
            <div className="logo-ring"></div>
            <div className="logo-ring"></div>
            <span className="logo-text">ERDMS</span>
          </div>
          <h2 className="loading-title">Elektronický Rozcestník pro Document Management Systém</h2>
          <div className="loading-bar">
            <div className="loading-bar-progress"></div>
          </div>
          <p className="loading-message">Načítání systému...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <img src="/logo-ZZS.png" alt="ZZS Logo" className="header-logo" />
          <div className="header-title">
            <h1>ERDMS portál aplikaci <span className="version-badge">v{APP_VERSION}</span></h1>
            <span className="header-subtitle">Zdravotnická záchranná služba Středočeského kraje, příspěvková organizace</span>
          </div>
        </div>
        <div className="user-info">
          <div className="header-datetime" title="Aktuální datum a čas">
            <span className="header-datetime-date">
              {currentDateTime.toLocaleDateString('cs-CZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
            <span className="header-datetime-time">
              {currentDateTime.toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </span>
          </div>

          {user && user.upn && (
            <div 
              className="calendar-dropdown-container"
              onMouseEnter={handleCalendarMouseEnter}
              onMouseLeave={handleCalendarMouseLeave}
            >
              <a 
                href={withM365LoginHints(`https://outlook.office.com/calendar/view/week?realm=zachranka.cz`)}
                className="calendar-icon-btn" 
                title="Můj kalendář - následující týden"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {!loadingCalendar && calendarEvents.length > 0 && (
                  <span className="calendar-badge">{calendarEvents.length}</span>
                )}
              </a>
              {calendarDropdownOpen && (
                <div className="calendar-dropdown">
                  <div className="calendar-dropdown-header">
                    <h3>Nadcházející události</h3>
                    <div className="calendar-header-actions">
                      <span className="calendar-count">
                        {loadingCalendar ? '...' : calendarEvents.length > 0 ? `${calendarEvents.length} událostí` : '0 událostí'}
                      </span>
                      <button 
                        className="calendar-refresh-btn" 
                        onClick={() => loadCalendarEvents(true)}
                        disabled={loadingCalendar}
                        title="Obnovit události"
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={loadingCalendar ? 'spinning' : ''}>
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="calendar-events-list">
                    {loadingCalendar ? (
                      <div className="calendar-loading">Načítám události...</div>
                    ) : calendarEvents.length > 0 ? (
                      calendarEvents.map((event, index) => {
                        const isPast = isEventPast(event.end);
                        return (
                        <div 
                          key={index} 
                          className={`calendar-event-item ${isPast ? 'event-past' : ''}`}
                          title={event.bodyPreview ? event.bodyPreview : ''}
                          style={{ borderLeftColor: getCategoryColor(event.categories) }}
                        >
                          <div className="event-time">{formatEventDate(event.start, event.end)}</div>
                          <div className="event-header">
                            <div 
                              className="event-subject" 
                              style={{ 
                                backgroundColor: getCategoryColor(event.categories),
                                color: 'white'
                              }}
                            >
                              {event.subject}
                            </div>
                            {event.onlineMeeting && event.onlineMeeting.joinUrl && (
                              <a 
                                href={event.onlineMeeting.joinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="teams-join-btn"
                                title="Připojit se k Teams schůzce"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M19.19 8.77q.27 0 .46.19t.19.46v5.16q0 .27-.19.46t-.46.19h-2.83q-.27 0-.46-.19t-.19-.46V9.42q0-.27.19-.46t.46-.19h2.83zM12.85 4.5q1.43 0 2.44 1.01t1.01 2.44v8.1q0 1.43-1.01 2.44t-2.44 1.01H7.5V4.5h5.35zm-1.33 8.16V9.03q0-.13-.09-.22t-.22-.09H9.03q-.13 0-.22.09t-.09.22v3.63q0 .13.09.22t.22.09h2.18q.13 0 .22-.09t.09-.22zm0 2.91q0-.13-.09-.22t-.22-.09H9.03q-.13 0-.22.09t-.09.22v2.18q0 .13.09.22t.22.09h2.18q.13 0 .22-.09t.09-.22v-2.18zm2.91-2.91V9.03q0-.13-.09-.22t-.22-.09h-2.18q-.13 0-.22.09t-.09.22v3.63q0 .13.09.22t.22.09h2.18q.13 0 .22-.09t.09-.22z"/>
                                </svg>
                              </a>
                            )}
                            {calculateDuration(event.start, event.end) && (
                              <span className="event-duration">{calculateDuration(event.start, event.end)}</span>
                            )}
                          </div>
                          {event.location && event.location.displayName && (
                            <div className="event-location">📍 {event.location.displayName}</div>
                          )}
                        </div>
                        );
                      })
                    ) : (
                      <div className="calendar-empty">Žádné nadcházející události</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Microsoft Copilot Chat Widget - SKRYTÝ dokud nebude Azure OpenAI nebo MS Copilot API
          <CopilotWidget />
          */}
          
          {user ? (
            <div className="user-profile-hover" tabIndex={0} aria-label="Profil přihlášeného uživatele">
              <span className="user-identity-inline">
                <span className="user-avatar-chip" aria-hidden="true">
                  <svg className="user-avatar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="user-name-text">{userFullName || 'Neznámý uživatel'}</span>
              </span>

              <div className="user-profile-tooltip" role="tooltip">
                <div className="tooltip-title">Můj profil</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Email</span>
                  <span className="tooltip-value">{user.email || '-'}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Uživatel</span>
                  <span className="tooltip-value">{user.username || '-'}</span>
                </div>
                {user.upn && (
                  <div className="tooltip-row">
                    <span className="tooltip-label">UPN</span>
                    <span className="tooltip-value">{user.upn}</span>
                  </div>
                )}
                {userRole && (
                  <div className="tooltip-row">
                    <span className="tooltip-label">Pozice</span>
                    <span className="tooltip-value">{userRole}</span>
                  </div>
                )}
                {userDepartment && (
                  <div className="tooltip-row">
                    <span className="tooltip-label">Oddělení</span>
                    <span className="tooltip-value">{userDepartment}</span>
                  </div>
                )}
                {userManager && (
                  <div className="tooltip-row manager-row">
                    <span className="tooltip-label">Nadřízený</span>
                    <span className="tooltip-value">{userManager}</span>
                  </div>
                )}
                <div className="tooltip-row">
                  <span className="tooltip-label">Skupiny</span>
                  <span className="tooltip-value">{userGroupsCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <span>Načítání...</span>
          )}
          <button onClick={toggleDarkMode} className="theme-toggle-btn" title={darkMode ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}>
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 1v6m0 6v6m11-11h-6m-6 0H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <a href="#settings" className="settings-icon-btn" title="Nastavení">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <button onClick={handleLogout} className="logout-btn">
            Odhlásit
          </button>
        </div>
      </div>

      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          🏠 Aplikace
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Můj profil
        </button>
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('employees');
              if (employees.length === 0) {
                loadEmployees();
              }
            }}
          >
            👥 Zaměstnanci
          </button>
        )}
        {isGraphTester && (
          <button
            className={`tab-button ${activeTab === 'graph-test' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('graph-test');
              if (!graphTestData && !loadingGraphTest) {
                runGraphApiTest();
              }
            }}
          >
            🔬 Graph API test
          </button>
        )}
        {false && isAdmin && (
          <button
            className={`tab-button ${activeTab === 'org-structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('org-structure')}
          >
            🏢 Organizační struktura
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {/* Tab: Aplikace */}
        {activeTab === 'apps' && (
          <>
            {/* Organizační aplikace */}
            <div className="apps-section">
              <h2 className="section-title">📋 Interní aplikace organizace</h2>
              <div className="apps-grid">
                <a href={`https://erdms.zachranka.cz/eeo-v2/?sso=auto&v=${APP_VERSION}`} className="app-card eeo-card m365-app-card" target="_self">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
                      <span className="app-badge ms365-badge">M365</span>
                    </div>
                  </div>
                  <h3 className="app-title">EEO v2</h3>
                  <p className="app-description">Elektronická správa a workflow objednávek a změn</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                {(user?.username?.toLowerCase() === 'u03924' || user?.upn?.toLowerCase()?.startsWith('u03924@') ||
                  user?.username?.toLowerCase() === 'u09694' || user?.upn?.toLowerCase()?.startsWith('u09694@')) && (
                <a href={`https://erdms.zachranka.cz/dev/eeo-v2/?sso=auto&v=${APP_VERSION}`} className="app-card eeo-card dev-card" target="_self">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>DEV</span>
                      <span className="app-badge ms365-badge">M365</span>
                    </div>
                  </div>
                  <h3 className="app-title">EEO v2 DEV</h3>
                  <p className="app-description">Development verze EEO – testování nových funkcí</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>
                )}

                <a href="https://webmail.zachranka.cz" className="app-card webmail-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
                    </div>
                  </div>
                  <h3 className="app-title">Webmail</h3>
                  <p className="app-description">Interní emailová komunikace</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://szm.zachranka.cz" className="app-card szm-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 7h-9a2 2 0 00-2 2v6a2 2 0 002 2h9a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h7a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
                    </div>
                  </div>
                  <h3 className="app-title">SZM</h3>
                  <p className="app-description">Objednávkový systém zdravotnického materiálu</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://intranet.zachranka.cz" className="app-card intranet-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
                    </div>
                  </div>
                  <h3 className="app-title">Intranet</h3>
                  <p className="app-description">Interní portál organizace - aktuality, dokumenty a firemní informace</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href={`https://erdms.zachranka.cz/dev/intranet-v26/?sso=auto&v=${APP_VERSION}`} className="app-card intranet-card dev-card" target="_self">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>DEV</span>
                      <span className="app-badge ms365-badge">M365</span>
                    </div>
                  </div>
                  <h3 className="app-title">Intranet 2026</h3>
                  <p className="app-description">Nový moderní intranet - React + NestJS - Development verze</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://editace.zachranka.cz/ZZSDocWeb/" className="app-card editace-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 3v4a2 2 0 002 2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
                    </div>
                  </div>
                  <h3 className="app-title">Editace / Profie</h3>
                  <p className="app-description">Zdravotnická dokumentace</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                {/* Dělící čára */}
                <div className="section-divider" style={{ gridColumn: '1 / -1' }}></div>

                <a href="https://portal.zachranka.cz" className="app-card portal-hr-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Aktivní</span>
                  </div>
                  <h3 className="app-title">Portal HR / Vema</h3>
                  <p className="app-description">Mzdy, personalistika, docházka, cestovní příkazy</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://dms.zachranka.cz/ix-ELO/plugin/auth2/sign-in" className="app-card elo-dms-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Aktivní</span>
                  </div>
                  <h3 className="app-title">ELO DMS</h3>
                  <p className="app-description">Inteligentní správa dokumentů a digitální transformace</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://vzdelavani.zachranka.cz" className="app-card vzdelavani-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Aktivní</span>
                  </div>
                  <h3 className="app-title">Vzdělávací platforma</h3>
                  <p className="app-description">Kurzy a vzdělávací materiály</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://inspektor.zachranka.cz" className="app-card inspektor-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Aktivní</span>
                  </div>
                  <h3 className="app-title">Inspektor</h3>
                  <p className="app-description">Inspekční systém a kontroly</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://redmine.zachranka.cz/" className="app-card redmine-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 12h6m-6 4h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Aktivní</span>
                  </div>
                  <h3 className="app-title">Redmine</h3>
                  <p className="app-description">Správa projektů a úkolů</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://itop.zachranka.cz/" className="app-card itop-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Aktivní</span>
                  </div>
                  <h3 className="app-title">iTOP</h3>
                  <p className="app-description">IT service management a helpdesk</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>
              </div>
            </div>

            {/* Microsoft 365 aplikace */}
            <div className="apps-section">
              <h2 className="section-title">☁️ Microsoft 365</h2>
              <div className="apps-grid ms-apps-grid">
                <a href={withM365LoginHints('https://outlook.office.com')} className="app-card ms-outlook-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper ms-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4l8 5 8-5v12l-8 5-8-5V4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 4l8 5 8-5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="app-badge ms-badge">Microsoft</span>
                  </div>
                  <h3 className="app-title">MS Outlook</h3>
                  <p className="app-description">E-mailová komunikace a kalendář</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href={withM365LoginHints('https://teams.microsoft.com')} className="app-card ms-teams-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper ms-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <span className="app-badge ms-badge">Microsoft</span>
                  </div>
                  <h3 className="app-title">MS Teams</h3>
                  <p className="app-description">Komunikace, videokonference a týmová spolupráce</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href={withM365LoginHints('https://www.office.com/launch/word')} className="app-card ms-word-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper ms-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4h16v16H4V4z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="app-badge ms-badge">Microsoft</span>
                  </div>
                  <h3 className="app-title">MS Word</h3>
                  <p className="app-description">Textové dokumenty a úprava textu</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href={withM365LoginHints('https://www.office.com/launch/excel')} className="app-card ms-excel-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper ms-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3h18v18H3V3z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="app-badge ms-badge">Microsoft</span>
                  </div>
                  <h3 className="app-title">MS Excel</h3>
                  <p className="app-description">Tabulky, grafy a analýza dat</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href={withM365LoginHints('https://m365.cloud.microsoft/')} className="app-card ms-copilot-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper ms-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                      </svg>
                    </div>
                    <span className="app-badge ms-badge">Microsoft</span>
                  </div>
                  <h3 className="app-title">MS Copilot</h3>
                  <p className="app-description">AI asistent pro zvýšení produktivity a kreativní práci</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href={withM365LoginHints('https://zachrankacz-my.sharepoint.com/')} className="app-card ms-onedrive-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper ms-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-10 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge ms-badge">Microsoft</span>
                  </div>
                  <h3 className="app-title">MS OneDrive</h3>
                  <p className="app-description">Cloudové úložiště a sdílení souborů</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}

        {/* Tab: Můj profil */}
        {activeTab === 'profile' && user && (
          <div className="profile-section">
            <h2>Moje údaje</h2>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="label">Jméno:</span>
                <span className="value">{user.jmeno} {user.prijmeni}</span>
              </div>
              <div className="profile-item">
                <span className="label">Email:</span>
                <span className="value">{user.email}</span>
              </div>
              <div className="profile-item">
                <span className="label">Uživatelské jméno:</span>
                <span className="value">{user.username}</span>
              </div>
              {user.upn && (
                <div className="profile-item">
                  <span className="label">UPN:</span>
                  <span className="value">{user.upn}</span>
                </div>
              )}
              {(user.entraData?.jobTitle || user.jobTitle) && (
                <div className="profile-item">
                  <span className="label">Pozice:</span>
                  <span className="value">{user.entraData?.jobTitle || user.jobTitle}</span>
                </div>
              )}
              {(user.entraData?.department || user.department) && (
                <div className="profile-item">
                  <span className="label">Oddělení:</span>
                  <span className="value">{user.entraData?.department || user.department}</span>
                </div>
              )}
              {user.entraData && (
                <>
                  {user.entraData.officeLocation && (
                    <div className="profile-item">
                      <span className="label">Lokalita/Pracoviště:</span>
                      <span className="value">{user.entraData.officeLocation}</span>
                    </div>
                  )}
                  {user.entraData.city && (
                    <div className="profile-item">
                      <span className="label">Město:</span>
                      <span className="value">{user.entraData.city}</span>
                    </div>
                  )}
                  {user.entraData.manager && (
                    <div className="profile-item profile-item-manager">
                      <span className="label">Nadřízený:</span>
                      <span className="value">
                        <strong>{user.entraData.manager.displayName}</strong>
                        {user.entraData.manager.jobTitle && (
                          <span className="manager-title"> • {user.entraData.manager.jobTitle}</span>
                        )}
                        {user.entraData.manager.mail && (
                          <a href={`mailto:${user.entraData.manager.mail}`} className="manager-email">
                            📧 {user.entraData.manager.mail}
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                  {user.entraData.memberOf && user.entraData.memberOf.length > 0 && (
                    <div className="profile-item profile-item-groups">
                      <span className="label">Skupiny ({user.entraData.memberOf.length}):</span>
                      <span className="value">
                        <div className="groups-list-compact">
                          {(showAllGroups ? user.entraData.memberOf : user.entraData.memberOf.slice(0, 5)).map((group, idx) => (
                            <span key={idx} className="group-badge">{group.displayName}</span>
                          ))}
                          {!showAllGroups && user.entraData.memberOf.length > 5 && (
                            <span 
                              className="group-badge-more" 
                              onClick={() => setShowAllGroups(true)}
                              style={{ cursor: 'pointer' }}
                            >
                              +{user.entraData.memberOf.length - 5} dalších
                            </span>
                          )}
                          {showAllGroups && user.entraData.memberOf.length > 5 && (
                            <span 
                              className="group-badge-more" 
                              onClick={() => setShowAllGroups(false)}
                              style={{ cursor: 'pointer' }}
                            >
                              Zobrazit méně
                            </span>
                          )}
                        </div>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab: Organizační struktura - TEMPORARILY DISABLED */}
        {false && activeTab === 'org-structure' && isAdmin && (
          <div className="org-structure-section">
            <div className="org-structure-header">
              <h2>🏢 Organizační struktura</h2>
              <p className="org-structure-subtitle">
                Hierarchické zobrazení organizace ZZS SK podle úseků a nadřízených
              </p>
            </div>

            {employees.length === 0 ? (
              <div className="org-structure-empty">
                <button onClick={loadEmployees} className="load-button">
                  Načíst zaměstnance
                </button>
              </div>
            ) : (
              <div className="org-structure-content">
                {(() => {
                  const hierarchy = buildAdvancedOrganizationHierarchy();
                  
                  return (
                    <div className="org-hierarchy-tree">
                      {/* Ředitelství - vždy nahoře */}
                      {hierarchy.reditelstvi.totalCount > 0 && (
                        <div className="org-tree-node org-tree-root">
                          <div 
                            className="org-node-card org-card-director"
                            onClick={() => toggleUnit('reditelstvi')}
                          >
                            <div className="org-node-icon">🏛️</div>
                            <div className="org-node-content">
                              <div className="org-node-title">{hierarchy.reditelstvi.name}</div>
                              <div className="org-node-count">
                                {hierarchy.reditelstvi.totalCount} zaměstnanců
                              </div>
                            </div>
                            <div className="org-expand-icon">
                              {expandedUnits.has('reditelstvi') ? '🔽' : '▶️'}
                            </div>
                          </div>

                          {/* Zaměstnanci ředitelství */}
                          {expandedUnits.has('reditelstvi') && (
                            <div className="org-employees-list">
                              {hierarchy.reditelstvi.employees.map(emp => (
                                <div key={emp.id} className="org-employee-mini">
                                  <div className="org-employee-avatar">
                                    {emp.givenName?.[0]}{emp.surname?.[0]}
                                  </div>
                                  <div className="org-employee-info">
                                    <div className="org-employee-name">{emp.displayName}</div>
                                    {emp.jobTitle && (
                                      <div className="org-employee-title">{emp.jobTitle}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Náměstci */}
                      <div className="org-deputies-grid">
                        {Object.entries(hierarchy.namestci)
                          .filter(([_, deputy]) => deputy.totalCount > 0)
                          .sort((a, b) => b[1].totalCount - a[1].totalCount) // Řazení podle počtu
                          .map(([code, deputy]) => (
                          <div key={code} className="org-tree-branch">
                            <div 
                              className="org-node-card org-card-deputy"
                              onClick={() => toggleSupervisor(code)}
                            >
                              <div className="org-node-icon">
                                {code === 'LN' ? '🩺' : 
                                 code === 'NNLZP' ? '🚑' :
                                 code === 'PN' ? '👥' :
                                 code === 'EN' ? '💰' :
                                 code === 'PT' ? '🔧' :
                                 code === 'NS' ? '💻' :
                                 code === 'ND' ? '📞' :
                                 code === 'OTHER' ? '❓' : '👔'}
                              </div>
                              <div className="org-node-content">
                                <div className="org-node-title">{deputy.fullName}</div>
                                <div className="org-node-subtitle">{code}</div>
                                <div className="org-node-count">
                                  {Object.keys(deputy.units).length} úseků • {deputy.totalCount} zaměstnanců
                                </div>
                              </div>
                              <div className="org-expand-icon">
                                {expandedSupervisors.has(code) ? '🔽' : '▶️'}
                              </div>
                            </div>

                            {/* Úseky a zaměstnanci pod náměstkem */}
                            {expandedSupervisors.has(code) && (
                              <div className="org-units-container">
                                {/* Úseky s čísly */}
                                {Object.keys(deputy.units).length > 0 && (
                                  <div className="org-units-list">
                                    <div className="org-section-title">📊 Úseky:</div>
                                    {Object.entries(deputy.units).map(([unitKey, unit]) => (
                                      <div key={unitKey} className="org-unit-item">
                                        <div 
                                          className="org-unit-card"
                                          onClick={() => toggleUnit(unitKey)}
                                        >
                                          <div className="org-unit-number">{unit.number}</div>
                                          <div className="org-unit-info">
                                            <div className="org-unit-name">{unit.name}</div>
                                            <div className="org-unit-count">
                                              {unit.totalCount} zaměstnanců
                                            </div>
                                          </div>
                                          <div className="org-expand-icon-small">
                                            {expandedUnits.has(unitKey) ? '🔽' : '▶️'}
                                          </div>
                                        </div>

                                        {/* Vedoucí a zaměstnanci v úseku */}
                                        {expandedUnits.has(unitKey) && (
                                          <div className="org-employees-list">
                                            {/* VEDOUCÍ - zobrazit PRVNÍ */}
                                            {Object.entries(unit.managers || {}).map(([managerKey, manager]) => (
                                              <div key={managerKey} className="org-manager-section">
                                                <div className="org-manager-card">
                                                  <div className="org-employee-avatar org-manager-avatar">
                                                    {manager.givenName?.[0]}{manager.surname?.[0]}
                                                  </div>
                                                  <div className="org-employee-info">
                                                    <div className="org-employee-name org-manager-name">
                                                      👑 {manager.displayName}
                                                    </div>
                                                    {manager.jobTitle && (
                                                      <div className="org-employee-title org-manager-title">
                                                        {manager.jobTitle}
                                                      </div>
                                                    )}
                                                    {manager.subordinates?.length > 0 && (
                                                      <div className="org-subordinates-count">
                                                        {manager.subordinates.length} podřízených
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                {/* Podřízení vedoucího */}
                                                {manager.subordinates?.map(sub => (
                                                  <div key={sub.id} className="org-employee-mini org-subordinate">
                                                    <div className="org-employee-avatar">
                                                      {sub.givenName?.[0]}{sub.surname?.[0]}
                                                    </div>
                                                    <div className="org-employee-info">
                                                      <div className="org-employee-name">↳ {sub.displayName}</div>
                                                      {sub.jobTitle && (
                                                        <div className="org-employee-title">{sub.jobTitle}</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ))}
                                            
                                            {/* OSTATNÍ ZAMĚSTNANCI - zobrazit PO vedoucích */}
                                            {unit.employees.map(emp => (
                                              <div key={emp.id} className="org-employee-mini">
                                                <div className="org-employee-avatar">
                                                  {emp.givenName?.[0]}{emp.surname?.[0]}
                                                </div>
                                                <div className="org-employee-info">
                                                  <div className="org-employee-name">{emp.displayName}</div>
                                                  {emp.jobTitle && (
                                                    <div className="org-employee-title">{emp.jobTitle}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Zaměstnanci přímo pod náměstkem (bez úseku) */}
                                {deputy.employees.length > 0 && (
                                  <div className="org-direct-employees">
                                    <div className="org-section-title">👥 Přímo podřízení:</div>
                                    <div className="org-employees-list">
                                      {deputy.employees.map(emp => (
                                        <div key={emp.id} className="org-employee-mini">
                                          <div className="org-employee-avatar">
                                            {emp.givenName?.[0]}{emp.surname?.[0]}
                                          </div>
                                          <div className="org-employee-info">
                                            <div className="org-employee-name">{emp.displayName}</div>
                                            {emp.jobTitle && (
                                              <div className="org-employee-title">{emp.jobTitle}</div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Debug info */}
                      <div className="org-debug">
                        <details>
                          <summary>🔧 Debug informace</summary>
                          <div style={{fontSize: '0.8rem', color: '#666', marginTop: '0.5rem'}}>
                            <div>Celkem zaměstnanců: {employees.length}</div>
                            <div>Náměstci: {Object.keys(hierarchy.namestci).length}</div>
                            <div>Ředitelství: {hierarchy.reditelstvi.totalCount}</div>
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Tab: Zaměstnanci (jen pro u03924, u09721, u09694 a u09764) */}
        {activeTab === 'employees' && isAdmin && (
          <div className="employees-section">
            <div className="employees-header">
              <div className="employees-title-wrapper">
                <h2>Přehled zaměstnanců</h2>
                {totalEmployees > 0 && (
                  <p className="employees-count">
                    {searchQuery.length >= 3 
                      ? `Zobrazeno ${getFilteredEmployees().length} z celkem ${totalEmployees} zaměstnanců dle vyhledávání` 
                      : `Zobrazeno ${getFilteredEmployees().length} z celkem ${totalEmployees} zaměstnanců`
                    }
                  </p>
                )}
              </div>
              <div className="search-controls">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Hledat zaměstnance..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      className="search-clear-btn"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      title="Vymazat vyhledávání"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div className="filters-section">
                  <div className="filter-group">
                    <span className="filter-label">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                      Status účtu
                    </span>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="accountStatus"
                          value="all"
                          checked={filterAccountStatus === 'all'}
                          onChange={(e) => setFilterAccountStatus(e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        <span>Všichni</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="accountStatus"
                          value="active"
                          checked={filterAccountStatus === 'active'}
                          onChange={(e) => setFilterAccountStatus(e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        <span>Jen aktivní</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="accountStatus"
                          value="inactive"
                          checked={filterAccountStatus === 'inactive'}
                          onChange={(e) => setFilterAccountStatus(e.target.value)}
                        />
                        <span className="radio-custom"></span>
                        <span>Jen neaktivní</span>
                      </label>
                    </div>
                    
                    <label htmlFor="department-filter" className="filter-label" style={{marginTop: '1rem'}}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                      </svg>
                      Úsek (901, 101 apod.)
                    </label>
                    <select
                      id="department-filter"
                      className="license-select"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      style={{marginTop: '0.5rem'}}
                    >
                      <option value="all">Všichni (bez filtru)</option>
                      <option value="with-department">Pouze s vyplněným úsekem</option>
                      <option value="without-department">Pouze bez úseku</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                      </svg>
                      Email
                    </span>
                    <div className="checkbox-group">
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={filterWithEmail}
                          onChange={(e) => setFilterWithEmail(e.target.checked)}
                        />
                        <span className="checkbox-custom">
                          <svg className="checkbox-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </span>
                        <span>Pouze s vyplněným emailem</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={filterNonZachranka}
                          onChange={(e) => setFilterNonZachranka(e.target.checked)}
                        />
                        <span className="checkbox-custom">
                          <svg className="checkbox-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </span>
                        <span>Pouze jiné domény než @zachranka.cz</span>
                      </label>
                    </div>
                  </div>

                  <div className="filter-group">
                    <label htmlFor="license-filter" className="filter-label">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                      </svg>
                      Licence M365
                    </label>
                    <select
                      id="license-filter"
                      className="license-select"
                      value={filterLicense}
                      onChange={(e) => setFilterLicense(e.target.value)}
                    >
                      <option value="all">Všichni (bez filtru)</option>
                      <option value="any-license">Všichni s licencí (M365-License*)</option>
                      {availableLicenses.map(license => (
                        <option key={license} value={license}>{license}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {loadingEmployees && (
              <div className="employees-loading">
                <div className="loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">Načítám zaměstnance...</p>
              </div>
            )}

            <div className="employees-grid">
              {getFilteredEmployees().map((emp) => {
                const isExpanded = expandedEmployee === emp.id;
                const details = employeeDetails[emp.id];

                return (
                  <div
                    key={emp.id}
                    className={`employee-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div className={`employee-status-indicator ${emp.accountEnabled ? 'active' : 'inactive'}`} 
                         title={emp.accountEnabled ? 'Aktivní účet' : 'Neaktivní účet'}>
                    </div>
                    <div className="employee-header" onClick={() => toggleEmployeeDetail(emp)}>
                      <div className="employee-avatar">
                        {emp.givenName?.[0]}{emp.surname?.[0]}
                      </div>
                      <div className="employee-info">
                        <div className="employee-name">
                          {emp.displayName}
                        </div>
                        {emp.jobTitle && (
                          <div className="employee-title">
                            {emp.jobTitle}
                            {emp.employeeId && (
                              <span className="employee-id-badge" title="Osobní číslo">
                                {emp.employeeId}
                              </span>
                            )}
                          </div>
                        )}
                        {emp.userPrincipalName && (
                          <div className="employee-username">
                            👤 Uživatelské jméno: <strong>{emp.userPrincipalName.split('@')[0]}</strong>
                          </div>
                        )}
                        {(emp.createdDateTime || emp.employeeHireDate) && (
                          <div className="employee-dates">
                            {emp.createdDateTime && (
                              <span className="date-badge" title="Datum vytvoření účtu">
                                📅 Vytvořen: {new Date(emp.createdDateTime).toLocaleDateString('cs-CZ')}
                              </span>
                            )}
                            {emp.employeeHireDate && (
                              <span className="date-badge" title="Datum nástupu">
                                💼 Nástup: {new Date(emp.employeeHireDate).toLocaleDateString('cs-CZ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="expand-icon">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    <div className="employee-basic-info">
                      {emp.mail && (
                        <div className="employee-info-item">
                          <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                          </svg>
                          <span>{emp.mail}</span>
                        </div>
                      )}
                      {emp.department && (
                        <div className="employee-info-item">
                          <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                          </svg>
                          <span>{emp.department}</span>
                        </div>
                      )}
                      {emp.officeLocation && (
                        <div className="employee-info-item">
                          <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                          </svg>
                          <span>{emp.officeLocation}</span>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="employee-details">
                        <div className="details-section">
                          <h4 className="details-title">📋 Detailní informace</h4>
                          {emp.userPrincipalName && (
                            <div className="employee-detail-item">
                              <span className="detail-label">UPN:</span>
                              <span className="detail-value">{emp.userPrincipalName}</span>
                            </div>
                          )}
                        </div>

                        {details && details.manager && (
                          <div className="details-section">
                            <h4 className="details-title">👤 Nadřízený</h4>
                            <div className="manager-card">
                              <div className="manager-avatar">
                                {details.manager.displayName?.[0]}
                              </div>
                              <div>
                                <div className="manager-name">{details.manager.displayName}</div>
                                {details.manager.jobTitle && (
                                  <div className="manager-title">{details.manager.jobTitle}</div>
                                )}
                                {details.manager.mail && (
                                  <div className="manager-email">{details.manager.mail}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {details && details.groups && details.groups.length > 0 && (
                          <div className="details-section">
                            <h4 className="details-title">👥 Členství ve skupinách ({details.groups.length})</h4>
                            <div className="groups-list">
                              {(expandedEmployeeGroups[emp.id] ? details.groups : details.groups.slice(0, 5)).map((group) => (
                                <div key={group.id} className="group-item">
                                  <svg className="group-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                                  </svg>
                                  <div className="group-info">
                                    <div className="group-name">{group.displayName}</div>
                                    {group.description && (
                                      <div className="group-desc">{group.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {!expandedEmployeeGroups[emp.id] && details.groups.length > 5 && (
                                <div 
                                  className="groups-more" 
                                  onClick={() => setExpandedEmployeeGroups({...expandedEmployeeGroups, [emp.id]: true})}
                                  style={{ cursor: 'pointer' }}
                                >
                                  +{details.groups.length - 5} dalších skupin
                                </div>
                              )}
                              {expandedEmployeeGroups[emp.id] && details.groups.length > 5 && (
                                <div 
                                  className="groups-more" 
                                  onClick={() => setExpandedEmployeeGroups({...expandedEmployeeGroups, [emp.id]: false})}
                                  style={{ cursor: 'pointer' }}
                                >
                                  Zobrazit méně
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {details && details.directReports && details.directReports.length > 0 && (
                          <div className="details-section">
                            <h4 className="details-title">👥 Podřízení ({details.directReports.length})</h4>
                            <div className="direct-reports-list">
                              {details.directReports.map((report) => (
                                <div key={report.id} className="direct-report-item">
                                  <div className="report-avatar">{report.displayName?.[0]}</div>
                                  <div className="report-info">
                                    <div className="report-name">{report.displayName}</div>
                                    {report.jobTitle && (
                                      <div className="report-title">{report.jobTitle}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'graph-test' && isGraphTester && (
          <div className="graph-test-section">
            <div className="graph-test-header">
              <h2>🔬 Graph API Test (u03924)</h2>
              <p className="graph-test-subtitle">
                Diagnostika dostupných dat pro vývoj custom intranet dashboardu. Využívá existující backend endpointy.
              </p>
              <div className="graph-test-actions">
                <button
                  className="graph-test-run-btn"
                  onClick={runGraphApiTest}
                  disabled={loadingGraphTest}
                >
                  {loadingGraphTest ? 'Načítám Graph data...' : 'Spustit / obnovit test'}
                </button>
                {graphTestLastRun && (
                  <span className="graph-test-last-run">
                    Poslední běh: {graphTestLastRun.toLocaleString('cs-CZ')}
                  </span>
                )}
              </div>
            </div>

            {graphTestError && (
              <div className="graph-test-error">
                ⚠️ {graphTestError}
              </div>
            )}

            {graphTestData && (
              <>
                <div className="graph-summary-grid">
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Kontroly OK</div>
                    <div className="graph-summary-value">{graphTestData.summary.okChecks}/{graphTestData.summary.totalChecks}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Skupiny</div>
                    <div className="graph-summary-value">{graphTestData.summary.groupCount}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Kalendář události (14 dní)</div>
                    <div className="graph-summary-value">{graphTestData.summary.calendarEventsCount}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Podřízení</div>
                    <div className="graph-summary-value">{graphTestData.summary.directReportsCount}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Nadřízený</div>
                    <div className="graph-summary-value graph-summary-text">{graphTestData.summary.managerName || 'N/A'}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Vzorek uživatelů</div>
                    <div className="graph-summary-value">{graphTestData.summary.usersSampleCount}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Graph user ID použito</div>
                    <div className="graph-summary-value graph-summary-text">{graphTestData.summary.graphUserIdUsed || 'N/A'}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Maily (poslední / nepřečtené)</div>
                    <div className="graph-summary-value">{graphTestData.summary.recentMessagesCount || 0} / {graphTestData.summary.unreadMessagesCount || 0}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Dokumenty (poslední)</div>
                    <div className="graph-summary-value">{graphTestData.summary.recentDocumentsCount || 0}</div>
                  </div>
                  <div className="graph-summary-card">
                    <div className="graph-summary-label">Dnešní schůzky</div>
                    <div className="graph-summary-value">{graphTestData.summary.todayMeetingsCount || 0}</div>
                  </div>
                </div>

                <div className="mini-preview-section">
                  <h3>🧪 Mini produktový náhled (pilot pouze u03924)</h3>
                  <p className="mini-preview-subtitle">
                    Prototyp dashboardu z Graph dat: Mail + Dokumenty + Dnešní schůzky.
                  </p>
                  <div className="mini-preview-grid">
                    <div className="mini-preview-card">
                      <div className="mini-preview-card-title">📧 Mail (poslední)</div>
                      <div className="mini-preview-list">
                        {graphTestData.results.recentMessages?.error && (
                          <div className="mini-preview-error">
                            Chyba endpointu: {graphTestData.results.recentMessages.error}
                          </div>
                        )}
                        {(graphTestData.results.recentMessages?.payload?.data || []).slice(0, 5).map((msg) => (
                          <a
                            key={msg.id}
                            className="mini-preview-item"
                            href={msg.webLink || '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <div className="mini-preview-item-main">{msg.subject || '(bez předmětu)'}</div>
                            <div className="mini-preview-item-meta">
                              {(msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Neznámý odesílatel')}
                              {msg.isRead === false ? ' • nepřečtené' : ''}
                            </div>
                          </a>
                        ))}
                        {!(graphTestData.results.recentMessages?.payload?.data || []).length && (
                          <div className="mini-preview-empty">Žádné mailové položky.</div>
                        )}
                      </div>
                    </div>

                    <div className="mini-preview-card">
                      <div className="mini-preview-card-title">📄 Dokumenty (recent)</div>
                      <div className="mini-preview-list">
                        {graphTestData.results.recentDocuments?.error && (
                          <div className="mini-preview-error">
                            Chyba endpointu: {graphTestData.results.recentDocuments.error}
                          </div>
                        )}
                        {(graphTestData.results.recentDocuments?.payload?.data || []).slice(0, 5).map((doc, idx) => {
                          const name = doc.name || doc.remoteItem?.name || 'Dokument';
                          const link = doc.webUrl || doc.remoteItem?.webUrl || '#';
                          const modified = doc.lastModifiedDateTime || doc.remoteItem?.lastModifiedDateTime || null;
                          return (
                            <a
                              key={doc.id || `${name}-${idx}`}
                              className="mini-preview-item"
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <div className="mini-preview-item-main">{name}</div>
                              <div className="mini-preview-item-meta">
                                {modified ? new Date(modified).toLocaleString('cs-CZ') : 'Bez času úpravy'}
                              </div>
                            </a>
                          );
                        })}
                        {!(graphTestData.results.recentDocuments?.payload?.data || []).length && (
                          <div className="mini-preview-empty">Žádné dokumenty.</div>
                        )}
                      </div>
                    </div>

                    <div className="mini-preview-card">
                      <div className="mini-preview-card-title">📅 Dnešní schůzky</div>
                      <div className="mini-preview-list">
                        {(graphTestData.results.calendarEvents?.payload?.data || [])
                          .filter((event) => {
                            const dt = event?.start?.dateTime;
                            if (!dt) return false;
                            return String(dt).slice(0, 10) === new Date().toISOString().slice(0, 10);
                          })
                          .slice(0, 5)
                          .map((event) => (
                            <div key={event.id} className="mini-preview-item static">
                              <div className="mini-preview-item-main">{event.subject || '(bez názvu schůzky)'}</div>
                              <div className="mini-preview-item-meta">
                                {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '??:??'}
                                {' - '}
                                {event.end?.dateTime ? new Date(event.end.dateTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '??:??'}
                              </div>
                            </div>
                          ))}
                        {!((graphTestData.results.calendarEvents?.payload?.data || []).filter((event) => {
                          const dt = event?.start?.dateTime;
                          if (!dt) return false;
                          return String(dt).slice(0, 10) === new Date().toISOString().slice(0, 10);
                        }).length) && (
                          <div className="mini-preview-empty">Dnes bez schůzky.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="graph-endpoints-list">
                  {Object.entries(graphTestData.results).map(([key, result]) => {
                    if (!result) return null;

                    const semanticOk = graphTestData.endpointHealth?.[key] !== false;

                    return (
                      <div key={key} className={`graph-endpoint-item ${result.ok && semanticOk ? 'ok' : 'error'}`}>
                        <div className="graph-endpoint-name">{key}</div>
                        <div className="graph-endpoint-meta">
                          <span className="graph-endpoint-status">{result.ok && semanticOk ? 'OK' : 'ERROR'} ({result.status})</span>
                          <span className="graph-endpoint-time">{result.durationMs} ms</span>
                        </div>
                        {result.error && <div className="graph-endpoint-error">{result.error}</div>}
                      </div>
                    );
                  })}
                </div>

                <details className="graph-raw-data">
                  <summary>Raw Graph test payload (pro vývoj)</summary>
                  <pre>{JSON.stringify(graphTestData, null, 2)}</pre>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
