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
  
  // Kontrola zda je admin (u03924 nebo u09721)
  const isAdmin = user?.username?.toLowerCase() === 'u03924' || 
                  user?.upn?.toLowerCase().startsWith('u03924@') ||
                  user?.username?.toLowerCase() === 'u09721' || 
                  user?.upn?.toLowerCase().startsWith('u09721@');
  
  useEffect(() => {
    loadUser();
  }, []);

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
        
        if (result.success && result.data) {
          setEmployees(result.data);
          setTotalEmployees(result.totalCount || result.data.length);
          console.log('👥 Počet zaměstnanců:', result.data.length, 'z celkem', result.totalCount || result.data.length);
          
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
            <h1>ERDMS Platform</h1>
            <span className="header-subtitle">Zdravotnická záchranná služba Středočeského kraje</span>
          </div>
        </div>
        <div className="user-info">
          <span>👤 {user ? `${user.jmeno} ${user.prijmeni}` : 'Načítání...'}</span>
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
                    <span className="app-badge">Aktivní</span>
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
                    <span className="app-badge">Aktivní</span>
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
                    <span className="app-badge">Aktivní</span>
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

                <a href="https://dms.zachranka.cz/ix-ELO/plugin/auth2/sign-in" className="app-card elo-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 13h6m-6 4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge">Aktivní</span>
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
                    <span className="app-badge">Aktivní</span>
                  </div>
                  <h3 className="app-title">Editace / Profilé</h3>
                  <p className="app-description">Zdravotnická dokumentace</p>
                  <div className="app-footer">
                    <span className="app-link-text">Otevřít aplikaci</span>
                    <svg className="app-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </a>

                <div className="app-card settings-card disabled">
                  <div className="app-card-header">
                    <div className="app-icon-wrapper">
                      <svg className="app-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="app-badge soon">Brzy</span>
                  </div>
                  <h3 className="app-title">Nastavení</h3>
                  <p className="app-description">Správa systému, uživatelů a nastavení oprávnění</p>
                  <div className="app-footer disabled-footer">
                    <span className="app-link-text">Připravujeme</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Microsoft 365 aplikace */}
            <div className="apps-section">
              <h2 className="section-title">☁️ Microsoft 365</h2>
              <div className="apps-grid ms-apps-grid">
                <a href="https://copilot.microsoft.com" className="app-card ms-copilot-card" target="_blank" rel="noopener noreferrer">
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
              {user.entraData && (
                <>
                  {user.entraData.jobTitle && (
                    <div className="profile-item">
                      <span className="label">Pozice:</span>
                      <span className="value">{user.entraData.jobTitle}</span>
                    </div>
                  )}
                  {user.entraData.department && (
                    <div className="profile-item">
                      <span className="label">Oddělení/Úsek:</span>
                      <span className="value">{user.entraData.department}</span>
                    </div>
                  )}
                  {user.entraData.companyName && (
                    <div className="profile-item">
                      <span className="label">Společnost:</span>
                      <span className="value">{user.entraData.companyName}</span>
                    </div>
                  )}
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
                          {user.entraData.memberOf.slice(0, 5).map((group, idx) => (
                            <span key={idx} className="group-badge">{group.displayName}</span>
                          ))}
                          {user.entraData.memberOf.length > 5 && (
                            <span className="group-badge-more">+{user.entraData.memberOf.length - 5} dalších</span>
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
              <div>
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
                <input
                  type="text"
                  className="search-input"
                  placeholder="Hledat zaměstnance..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                
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
                              {details.groups.slice(0, 5).map((group) => (
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
                              {details.groups.length > 5 && (
                                <div className="groups-more">
                                  +{details.groups.length - 5} dalších skupin
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
