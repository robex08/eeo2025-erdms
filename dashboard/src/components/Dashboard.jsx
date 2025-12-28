import { useState, useEffect } from 'react';
import authService from '../services/authService';
import './Dashboard.css';

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
  const [availableLicenses, setAvailableLicenses] = useState([]);
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
  
  // Kontrola zda je admin (u03924 nebo u09721)
  const isAdmin = user?.username?.toLowerCase() === 'u03924' || 
                  user?.upn?.toLowerCase().startsWith('u03924@') ||
                  user?.username?.toLowerCase() === 'u09721' || 
                  user?.upn?.toLowerCase().startsWith('u09721@');
  
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Aplikovat dark mode na body
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

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
    
    return filtered;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    // Vyhledávání lokálně v již načtených zaměstnancích (1500)
    const searchTerm = query.toLowerCase().trim();
    console.log('🔍 Lokální hledání:', searchTerm, 'v', employees.length, 'zaměstnancích');
    
    const filtered = employees.filter(emp => {
      const displayName = (emp.displayName || '').toLowerCase();
      const givenName = (emp.givenName || '').toLowerCase();
      const surname = (emp.surname || '').toLowerCase();
      const email = (emp.mail || emp.userPrincipalName || '').toLowerCase();
      const jobTitle = (emp.jobTitle || '').toLowerCase();
      const department = (emp.department || '').toLowerCase();
      
      return displayName.includes(searchTerm) ||
             givenName.includes(searchTerm) ||
             surname.includes(searchTerm) ||
             email.includes(searchTerm) ||
             jobTitle.includes(searchTerm) ||
             department.includes(searchTerm);
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
            <h1>ERDMS Portál <span className="version-badge">v1.74</span></h1>
            <span className="header-subtitle">Zdravotnická záchranná služba Středočeského kraje, příspěvková organizace</span>
          </div>
        </div>
        <div className="user-info">
          {user && user.upn && (
            <div 
              className="calendar-dropdown-container"
              onMouseEnter={handleCalendarMouseEnter}
              onMouseLeave={handleCalendarMouseLeave}
            >
              <a 
                href={`https://outlook.office.com/calendar/view/week?realm=zachranka.cz&login_hint=${user.upn}`}
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
          <span>👤 {user ? `${user.jmeno} ${user.prijmeni}` : 'Načítání...'}</span>
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
      </div>

      <div className="dashboard-content">
        {/* Tab: Aplikace */}
        {activeTab === 'apps' && (
          <>
            {/* Organizační aplikace */}
            <div className="apps-section">
              <h2 className="section-title">📋 Organizační aplikace</h2>
              <div className="apps-grid">
                <a href="https://erdms.zachranka.cz/eeo-v2/" className="app-card eeo-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
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

                <a href="https://erdms.zachranka.cz/dev/intranet-v26" className="app-card intranet-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>DEV</span>
                      <span className="app-badge ms365-badge">MS365</span>
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

                <a href="https://dms.zachranka.cz/ix-ELO/plugin/auth2/sign-in" className="app-card elo-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 13h6m-6 4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="app-badges">
                      <span className="app-badge">Aktivní</span>
                    </div>
                  </div>
                  <h3 className="app-title">ELO</h3>
                  <p className="app-description">Elektronický dokument management systém</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <a href="https://editace.zzssck.cz" className="app-card editace-card" target="_blank" rel="noopener noreferrer">
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

                <a href="https://vzdelavani.zachranka.cz" className="app-card vzdelavani-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper" style={{ background: "rgba(255, 255, 255, 0.25)" }}>
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Vzdělávání</span>
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
                    <span className="app-badge" style={{ background: "rgba(255, 255, 255, 0.3)" }}>Kontrola</span>
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
                    <div className="app-icon-wrapper support-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 12h6m-6 4h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="app-badge support-badge">Podpora</span>
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
                    <div className="app-icon-wrapper support-icon">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge support-badge">Podpora</span>
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
                <a href="https://outlook.office.com" className="app-card ms-outlook-card" target="_blank" rel="noopener noreferrer">
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

                <a href="https://teams.microsoft.com" className="app-card ms-teams-card" target="_blank" rel="noopener noreferrer">
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

                <a href="https://www.office.com/launch/word" className="app-card ms-word-card" target="_blank" rel="noopener noreferrer">
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

                <a href="https://www.office.com/launch/excel" className="app-card ms-excel-card" target="_blank" rel="noopener noreferrer">
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

                <a href="https://m365.cloud.microsoft/" className="app-card ms-copilot-card" target="_blank" rel="noopener noreferrer">
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

                <a href="https://zachrankacz-my.sharepoint.com/" className="app-card ms-onedrive-card" target="_blank" rel="noopener noreferrer">
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

        {/* Tab: Zaměstnanci (jen pro u03924 a u09721) */}
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
                        <div className="employee-name">{emp.displayName}</div>
                        {emp.jobTitle && (
                          <div className="employee-title">{emp.jobTitle}</div>
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
      </div>
    </div>
  );
}

export default Dashboard;
