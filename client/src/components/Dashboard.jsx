import { useState, useEffect } from 'react';
import authService from '../services/authService';
import './Dashboard.css';

/**
 * Dashboard - hlavní stránka po přihlášení
 */
function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entraProfile, setEntraProfile] = useState(null);
  const [loadingEntra, setLoadingEntra] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' nebo 'employees'
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingMoreEmployees, setLoadingMoreEmployees] = useState(false);
  const [employeesSkipToken, setEmployeesSkipToken] = useState(null);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const [managerTest, setManagerTest] = useState(null);
  const [managerDirectReports, setManagerDirectReports] = useState(null);
  const [loadingManagerTest, setLoadingManagerTest] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false); // true = zobrazit výsledky hledání

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    console.log('🟣 Dashboard: loadUserData() START');
    try {
      setLoading(true);
      console.log('🟣 Dashboard: Volám authService.getCurrentUser()...');
      const userData = await authService.getCurrentUser();
      console.log('🟣 Dashboard: getCurrentUser() response:', userData);
      
      if (!userData) {
        // Nepřihlášen - redirect na login
        console.log('🟣 Dashboard: Žádná data - redirect na /login');
        window.location.href = '/login';
        return;
      }

      console.log('🟣 Dashboard: Setting user data:', userData);
      setUser(userData);
      
      // Načti Graph API data, pokud má user entra_id
      if (userData.entra_id) {
        loadEntraProfile(userData.entra_id);
      }
    } catch (err) {
      console.error('🔴 Dashboard ERROR:', err);
      setError('Nepodařilo se načíst údaje uživatele');
      console.error(err);
    } finally {
      setLoading(false);
      console.log('🟣 Dashboard: loadUserData() KONEC');
    }
  };

  const loadEntraProfile = async (entraId) => {
    console.log('🟣 Dashboard: loadEntraProfile() START for', entraId);
    try {
      setLoadingEntra(true);
      const response = await fetch(`/api/entra/user/${entraId}/profile`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟣 Dashboard: Entra profile loaded:', data);
      
      if (data.success) {
        setEntraProfile(data.data);
      }
    } catch (err) {
      console.error('🔴 loadEntraProfile ERROR:', err);
      // Nezobrať error - Graph API může být vypnuté
    } finally {
      setLoadingEntra(false);
    }
  };

  const loadEmployees = async (reset = false) => {
    console.log('🟣 Dashboard: loadEmployees() START, reset:', reset);
    try {
      if (reset) {
        setLoadingEmployees(true);
        setEmployees([]);
        setEmployeesSkipToken(null);
        setHasMoreEmployees(true);
      } else {
        setLoadingMoreEmployees(true);
      }

      const url = reset || !employeesSkipToken
        ? `/api/entra/users/paginated?pageSize=25`
        : `/api/entra/users/paginated?pageSize=25&skipToken=${encodeURIComponent(employeesSkipToken)}`;

      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🟣 Dashboard: Employees loaded:', result);
      
      if (result.success && result.data) {
        if (reset) {
          setEmployees(result.data.users);
        } else {
          setEmployees(prev => [...prev, ...result.data.users]);
        }
        setEmployeesSkipToken(result.data.skipToken);
        setHasMoreEmployees(result.data.hasMore);
      }
    } catch (err) {
      console.error('🔴 loadEmployees ERROR:', err);
    } finally {
      setLoadingEmployees(false);
      setLoadingMoreEmployees(false);
    }
  };

  const loadMoreEmployees = () => {
    if (!loadingMoreEmployees && hasMoreEmployees) {
      loadEmployees(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    // Méně než 3 znaky = zrušit hledání
    if (query.trim().length < 3) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchMode(true);
    
    try {
      const response = await fetch(`/api/entra/users/search?q=${encodeURIComponent(query)}&limit=100`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 Search results:', result);
      
      if (result.success) {
        setSearchResults(result.data);
      }
    } catch (err) {
      console.error('🔴 handleSearch ERROR:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchMode(false);
    setSearchResults([]);
  };

  const testManagerAccess = async () => {
    console.log('🟣 Dashboard: testManagerAccess() START');
    try {
      setLoadingManagerTest(true);
      setManagerTest(null);
      setManagerDirectReports(null);

      // Zkus najít Jana Černhorského
      const searchResponse = await fetch(`/api/entra/users?search=Černhorský&limit=10`, {
        credentials: 'include'
      });
      
      if (!searchResponse.ok) {
        throw new Error(`HTTP ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      console.log('🟣 Dashboard: Search results:', searchData);
      
      if (searchData.success && searchData.data.length > 0) {
        const manager = searchData.data.find(u => 
          u.displayName?.includes('Černhorský') || 
          u.surname?.includes('Černhorský')
        );
        
        if (manager) {
          setManagerTest(manager);
          console.log('🟣 Dashboard: Manager found:', manager);

          // Zkus načíst jeho podřízené
          const reportsResponse = await fetch(`/api/entra/user/${manager.id}/direct-reports`, {
            credentials: 'include'
          });
          
          if (reportsResponse.ok) {
            const reportsData = await reportsResponse.json();
            console.log('🟣 Dashboard: Direct reports:', reportsData);
            if (reportsData.success) {
              setManagerDirectReports(reportsData.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('🔴 testManagerAccess ERROR:', err);
      setManagerTest({ error: err.message });
    } finally {
      setLoadingManagerTest(false);
    }
  };

  const toggleEmployeeDetail = async (employee) => {
    if (expandedEmployee === employee.id) {
      setExpandedEmployee(null);
      return;
    }

    setExpandedEmployee(employee.id);

    // Pokud už máme detaily, nenačítáme znovu
    if (employeeDetails[employee.id]) {
      return;
    }

    // Načteme plný profil včetně skupin
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
      console.error('Chyba při načítání detailů:', err);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Načítám data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadUserData}>Zkusit znovu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>ERDMS</h1>
            <p className="subtitle">Elektronický Rozcestník</p>
          </div>
          <div className="user-section">
            <div className="user-info">
              <span className="user-name">
                {user.entraData?.displayName || `${user.jmeno} ${user.prijmeni}`}
              </span>
              <span className="user-email">{user.entraData?.mail || user.email}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Odhlásit
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="content-grid">
          {/* Levý sloupec - Aplikace + Profil */}
          <div className="left-sidebar">
            <section className="apps-section">
              <h3>Dostupné aplikace</h3>
              <div className="apps-grid">
                <a href="https://eeo.zachranka.cz" className="app-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-icon">📦</div>
                  <h4>EEO</h4>
                  <p>Elektronická evidence objednávek</p>
                </a>
                <a href="https://intranet.zachranka.cz" className="app-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-icon">📋</div>
                  <h4>Intranet</h4>
                  <p>Interní systém</p>
                </a>
                <a href="http://10.1.1.253/vehicle" className="app-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-icon">🚑</div>
                  <h4>Vozidla</h4>
                  <p>Správa vozového parku</p>
                </a>
                <a href="https://szm.zachranka.cz" className="app-card" target="_blank" rel="noopener noreferrer">
                  <div className="app-icon">🏥</div>
                  <h4>SZM</h4>
                  <p>Zdravotnický materiál</p>
                </a>
              </div>
            </section>

            <section className="profile-card">
              <h3>Můj profil</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="label">Jméno</span>
                  <span className="value">{user.entraData?.displayName || `${user.jmeno} ${user.prijmeni}`}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Email</span>
                  <span className="value">{user.entraData?.mail || user.email}</span>
                </div>
                {user.entraData?.jobTitle && (
                  <div className="profile-item">
                    <span className="label">Pozice</span>
                    <span className="value">{user.entraData.jobTitle}</span>
                  </div>
                )}
                {user.entraData?.department && (
                  <div className="profile-item">
                    <span className="label">Oddělení</span>
                    <span className="value">{user.entraData.department}</span>
                  </div>
                )}
                {user.entraData?.officeLocation && (
                  <div className="profile-item">
                    <span className="label">Pracoviště</span>
                    <span className="value">{user.entraData.officeLocation}</span>
                  </div>
                )}
                {(user.entraData?.mobilePhone || user.entraData?.businessPhones?.[0]) && (
                  <div className="profile-item">
                    <span className="label">Telefon</span>
                    <span className="value">
                      {user.entraData.mobilePhone || user.entraData.businessPhones?.[0]}
                    </span>
                  </div>
                )}
                <div className="profile-item">
                  <span className="label">Uživatel</span>
                  <span className="value">{user.username}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Role</span>
                  <span className="value badge-role">
                    {user.role === 'admin' ? 'Admin' : 'Uživatel'}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Pravý sloupec - EntraID data */}
          <div className="right-content">
            <section className="entra-details">
              <h3>Microsoft EntraID - Informace</h3>
              
              {/* Tabs navigation */}
              <div className="tabs-navigation">
                <button 
                  className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  👤 Moje údaje
                </button>
                <button 
                  className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('employees');
                    if (employees.length === 0 && !loadingEmployees) {
                      loadEmployees();
                    }
                  }}
                >
                  👥 Zaměstnanci ({employees.length > 0 ? employees.length : '...'})
                </button>
              </div>

              {/* Tab: Moje údaje */}
              {activeTab === 'personal' && (
                <>
              {/* Základní informace */}
              {(user.entraData || user.entra_id) && (
                <div className="entra-section">
                  <div className="entra-section-title">Základní údaje</div>
                  <div className="entra-grid">
                    {(user.entraData?.id || user.entra_id) && (
                      <div className="entra-item">
                        <span className="entra-label">EntraID:</span>
                        <span className="entra-value">{user.entraData?.id || user.entra_id}</span>
                      </div>
                    )}
                    {user.entraData?.userPrincipalName && (
                      <div className="entra-item">
                        <span className="entra-label">UPN:</span>
                        <span className="entra-value">{user.entraData.userPrincipalName}</span>
                      </div>
                    )}
                    {user.entraData?.displayName && (
                      <div className="entra-item">
                        <span className="entra-label">Celé jméno:</span>
                        <span className="entra-value">{user.entraData.displayName}</span>
                      </div>
                    )}
                    {user.entraData?.givenName && (
                      <div className="entra-item">
                        <span className="entra-label">Křestní jméno:</span>
                        <span className="entra-value">{user.entraData.givenName}</span>
                      </div>
                    )}
                    {user.entraData?.surname && (
                      <div className="entra-item">
                        <span className="entra-label">Příjmení:</span>
                        <span className="entra-value">{user.entraData.surname}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pracovní údaje */}
              {user.entraData && (
                <div className="entra-section">
                  <div className="entra-section-title">Pracovní údaje</div>
                  <div className="entra-grid">
                    {user.entraData.jobTitle && (
                      <div className="entra-item">
                        <span className="entra-label">Pozice:</span>
                        <span className="entra-value">{user.entraData.jobTitle}</span>
                      </div>
                    )}
                    {user.entraData.department && (
                      <div className="entra-item">
                        <span className="entra-label">Oddělení:</span>
                        <span className="entra-value">{user.entraData.department}</span>
                      </div>
                    )}
                    {user.entraData.companyName && (
                      <div className="entra-item">
                        <span className="entra-label">Společnost:</span>
                        <span className="entra-value">{user.entraData.companyName}</span>
                      </div>
                    )}
                    {user.entraData.officeLocation && (
                      <div className="entra-item">
                        <span className="entra-label">Kancelář:</span>
                        <span className="entra-value">{user.entraData.officeLocation}</span>
                      </div>
                    )}
                    {user.entraData.employeeId && (
                      <div className="entra-item">
                        <span className="entra-label">Číslo zaměstnance:</span>
                        <span className="entra-value">{user.entraData.employeeId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Kontaktní údaje */}
              {user.entraData && (
                <div className="entra-section">
                  <div className="entra-section-title">Kontaktní údaje</div>
                  <div className="entra-grid">
                    {user.entraData.mail && (
                      <div className="entra-item">
                        <span className="entra-label">Email:</span>
                        <span className="entra-value">{user.entraData.mail}</span>
                      </div>
                    )}
                    {user.entraData.mobilePhone && (
                      <div className="entra-item">
                        <span className="entra-label">Mobil:</span>
                        <span className="entra-value">{user.entraData.mobilePhone}</span>
                      </div>
                    )}
                    {user.entraData.businessPhones && user.entraData.businessPhones.length > 0 && (
                      <div className="entra-item">
                        <span className="entra-label">Telefony:</span>
                        <div className="entra-value">
                          <div className="entra-value-list">
                            {user.entraData.businessPhones.map((phone, idx) => (
                              <span key={idx} className="entra-value-list-item">{phone}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {user.entraData.streetAddress && (
                      <div className="entra-item">
                        <span className="entra-label">Ulice:</span>
                        <span className="entra-value">{user.entraData.streetAddress}</span>
                      </div>
                    )}
                    {user.entraData.city && (
                      <div className="entra-item">
                        <span className="entra-label">Město:</span>
                        <span className="entra-value">{user.entraData.city}</span>
                      </div>
                    )}
                    {user.entraData.postalCode && (
                      <div className="entra-item">
                        <span className="entra-label">PSČ:</span>
                        <span className="entra-value">{user.entraData.postalCode}</span>
                      </div>
                    )}
                    {user.entraData.state && (
                      <div className="entra-item">
                        <span className="entra-label">Kraj:</span>
                        <span className="entra-value">{user.entraData.state}</span>
                      </div>
                    )}
                    {user.entraData.country && (
                      <div className="entra-item">
                        <span className="entra-label">Země:</span>
                        <span className="entra-value">{user.entraData.country}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === ROZŠÍŘENÉ INFORMACE Z GRAPH API === */}
              {(user.entraData?.id || user.entra_id) && (
                <>
                  {/* Manažer - z Graph API */}
                  {entraProfile?.manager && (
                    <div className="entra-section">
                      <div className="entra-section-title">🧑‍💼 Nadřízený (Manager)</div>
                      <div className="entra-grid">
                      <div className="entra-item">
                        <span className="entra-label">GUID:</span>
                        <span className="entra-value entra-guid">{entraProfile.manager.id}</span>
                      </div>
                      {entraProfile.manager.displayName && (
                        <div className="entra-item">
                          <span className="entra-label">Jméno:</span>
                          <span className="entra-value">{entraProfile.manager.displayName}</span>
                        </div>
                      )}
                      {entraProfile.manager.userPrincipalName && (
                        <div className="entra-item">
                          <span className="entra-label">UPN:</span>
                          <span className="entra-value">{entraProfile.manager.userPrincipalName}</span>
                        </div>
                      )}
                      {entraProfile.manager.jobTitle && (
                        <div className="entra-item">
                          <span className="entra-label">Pozice:</span>
                          <span className="entra-value">{entraProfile.manager.jobTitle}</span>
                        </div>
                      )}
                      {entraProfile.manager.mail && (
                        <div className="entra-item">
                          <span className="entra-label">Email:</span>
                          <span className="entra-value">{entraProfile.manager.mail}</span>
                        </div>
                      )}
                    </div>
                    </div>
                  )}

                  {/* Podřízení - z Graph API */}
                  {entraProfile?.directReports && entraProfile.directReports.length > 0 && (
                  <div className="entra-section">
                    <div className="entra-section-title">👥 Podřízení ({entraProfile.directReports.length})</div>
                    <div className="entra-list">
                      {entraProfile.directReports.map((person, idx) => (
                        <div key={idx} className="entra-list-item">
                          <div className="entra-list-item-header">
                            <strong>{person.displayName}</strong>
                            {person.jobTitle && <span className="entra-job-title"> - {person.jobTitle}</span>}
                          </div>
                          <div className="entra-list-item-details">
                            <span className="entra-guid">{person.id}</span>
                            {person.mail && <span> • {person.mail}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}

                  {/* Skupiny - prioritně z entraData (z tokenu), nebo z Graph API */}
                  {((user.entraData?.memberOf && user.entraData.memberOf.length > 0) || (entraProfile?.groups && entraProfile.groups.length > 0)) && (
                  <div className="entra-section">
                    {(() => {
                      const groups = user.entraData?.memberOf || entraProfile?.groups || [];
                      const source = user.entraData?.memberOf ? 'z access tokenu' : 'z Graph API';
                      return (
                        <>
                          <div className="entra-section-title">
                            🔐 Členství ve skupinách ({groups.length}) 
                            <span style={{fontSize: '0.75rem', color: '#718096', marginLeft: '0.5rem'}}>({source})</span>
                          </div>
                          <div className="entra-list">
                            {groups.map((group, idx) => (
                              <div key={idx} className="entra-list-item">
                                <div className="entra-list-item-header">
                                  <strong>{group.displayName}</strong>
                                  <div className="group-badges">
                                    {group.securityEnabled && <span className="badge badge-security">Security</span>}
                                    {group.mailEnabled && <span className="badge badge-mail">Mail</span>}
                                    {group.groupTypes?.includes('Unified') && <span className="badge badge-m365">M365</span>}
                                  </div>
                                </div>
                                <div className="entra-list-item-details">
                                  <span className="entra-guid">{group.id}</span>
                                  {group.mail && <span> • {group.mail}</span>}
                                </div>
                                {group.description && (
                                  <div className="entra-list-item-desc">{group.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                    </div>
                  )}
                  
                  {/* Loading indicator pro Graph API */}
                  {loadingEntra && (
                    <div className="entra-section">
                      <div className="entra-loading">
                        <div className="spinner-small"></div>
                        <span>Načítám data z Microsoft Graph API...</span>
                      </div>
                    </div>
                  )}

                  {/* Info pokud Graph API není dostupné */}
                  {!entraProfile && !loadingEntra && (
                    <div className="entra-section">
                      <div className="entra-info-box">
                        <p>⚠️ Rozšířená data z Graph API nejsou dostupná.</p>
                        <p className="entra-info-small">
                          Nastavte oprávnění v Azure Portal podle <strong>docs/GRAPH_API_QUICKSTART.md</strong>
                        </p>
                        <p className="entra-info-small">
                          Potřebná oprávnění: User.Read.All, Group.Read.All, GroupMember.Read.All
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Další údaje */}
              {user.entraData && (
                <div className="entra-section">
                  <div className="entra-section-title">Další údaje</div>
                  <div className="entra-grid">
                    {user.entraData.preferredLanguage && (
                      <div className="entra-item">
                        <span className="entra-label">Jazyk:</span>
                        <span className="entra-value">{user.entraData.preferredLanguage}</span>
                      </div>
                    )}
                    {user.entraData.usageLocation && (
                      <div className="entra-item">
                        <span className="entra-label">Lokace:</span>
                        <span className="entra-value">{user.entraData.usageLocation}</span>
                      </div>
                    )}
                    {user.entraData.accountEnabled !== undefined && (
                      <div className="entra-item">
                        <span className="entra-label">Účet aktivní:</span>
                        <span className="entra-value">{user.entraData.accountEnabled ? 'Ano' : 'Ne'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Základní data z databáze - pokud nejsou Entra data */}
              {!user.entraData && !entraProfile && !loadingEntra && (
                <div className="entra-section">
                  <div className="entra-section-title">Základní údaje (z databáze)</div>
                  <div className="entra-grid">
                    {user.entra_id && (
                      <div className="entra-item">
                        <span className="entra-label">EntraID:</span>
                        <span className="entra-value entra-guid">{user.entra_id}</span>
                      </div>
                    )}
                    {user.upn && (
                      <div className="entra-item">
                        <span className="entra-label">UPN:</span>
                        <span className="entra-value">{user.upn}</span>
                      </div>
                    )}
                    <div className="entra-item">
                      <span className="entra-label">Jméno:</span>
                      <span className="entra-value">
                        {user.titul_pred && `${user.titul_pred} `}
                        {user.jmeno} {user.prijmeni}
                        {user.titul_za && `, ${user.titul_za}`}
                      </span>
                    </div>
                    {user.email && (
                      <div className="entra-item">
                        <span className="entra-label">Email:</span>
                        <span className="entra-value">{user.email}</span>
                      </div>
                    )}
                    {user.telefon && (
                      <div className="entra-item">
                        <span className="entra-label">Telefon:</span>
                        <span className="entra-value">{user.telefon}</span>
                      </div>
                    )}
                    {user.auth_source && (
                      <div className="entra-item">
                        <span className="entra-label">Zdroj autentizace:</span>
                        <span className="entra-value">{user.auth_source}</span>
                      </div>
                    )}
                  </div>
                  {!user.entra_id && (
                    <div className="entra-info-box" style={{marginTop: '1rem'}}>
                      <p>ℹ️ Rozšířené informace z Microsoft Entra ID budou dostupné po přihlášení přes Entra ID.</p>
                    </div>
                  )}
                </div>
              )}
                </>
              )}

              {/* Tab: Zaměstnanci */}
              {activeTab === 'employees' && (
                <div className="employees-tab">
                  {/* Vyhledávací lišta */}
                  <div className="search-bar">
                    <div className="search-input-wrapper">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Hledat zaměstnance (jméno, email, pozice, oddělení, lokalita)..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                      {searchQuery && (
                        <button className="search-clear" onClick={clearSearch}>✕</button>
                      )}
                    </div>
                    {isSearching && (
                      <div className="search-status">
                        <div className="spinner-tiny"></div>
                        <span>Vyhledávám...</span>
                      </div>
                    )}
                    {searchMode && !isSearching && (
                      <div className="search-status">
                        <span>Nalezeno: {searchResults.length}</span>
                      </div>
                    )}
                  </div>

                  {loadingEmployees ? (
                    <div className="entra-loading">
                      <div className="spinner-small"></div>
                      <span>Načítám seznam zaměstnanců...</span>
                    </div>
                  ) : (
                    <div className="employees-list">
                      <div className="employees-header">
                        {searchMode ? (
                          <>
                            <h4>Výsledky hledání: "{searchQuery}"</h4>
                            <p className="employees-subtitle">
                              Nalezeno {searchResults.length} zaměstnanců
                            </p>
                          </>
                        ) : (
                          <>
                            <h4>Seznam zaměstnanců ({employees.length}{hasMoreEmployees ? '+' : ''})</h4>
                            <p className="employees-subtitle">
                              {hasMoreEmployees 
                                ? 'Načítám po 25 zaměstnancích. Seřazeni podle jména.'
                                : `Zobrazeni všichni zaměstnanci (${employees.length}).`
                              }
                            </p>
                          </>
                        )}
                      </div>
                      <div className="employees-grid">
                        {(searchMode ? searchResults : employees).map((emp, idx) => {
                          const isExpanded = expandedEmployee === emp.id;
                          const details = employeeDetails[emp.id];
                          
                          return (
                            <div 
                              key={emp.id || idx} 
                              className={`employee-card ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => toggleEmployeeDetail(emp)}
                            >
                              <div className="employee-header">
                                <div className="employee-avatar">
                                  {emp.givenName?.[0]}{emp.surname?.[0]}
                                </div>
                                <div className="employee-info">
                                  <div className="employee-name">{emp.displayName}</div>
                                  {emp.jobTitle && (
                                    <div className="employee-title">{emp.jobTitle}</div>
                                  )}
                                </div>
                                <div className="expand-icon">
                                  {isExpanded ? '▼' : '▶'}
                                </div>
                              </div>
                              
                              <div className="employee-details">
                                <div className="employee-detail-item">
                                  <span className="detail-label">📧</span>
                                  <span className="detail-value">{emp.mail || emp.userPrincipalName}</span>
                                </div>
                                {emp.department && (
                                  <div className="employee-detail-item">
                                    <span className="detail-label">🏢</span>
                                    <span className="detail-value">{emp.department}</span>
                                  </div>
                                )}
                                {emp.officeLocation && (
                                  <div className="employee-detail-item">
                                    <span className="detail-label">📍</span>
                                    <span className="detail-value">{emp.officeLocation}</span>
                                  </div>
                                )}
                                <div className="employee-status">
                                  {emp.accountEnabled ? (
                                    <span className="status-badge active">✓ Aktivní</span>
                                  ) : (
                                    <span className="status-badge inactive">✗ Neaktivní</span>
                                  )}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="employee-expanded-details">
                                  {!details ? (
                                    <div className="loading-detail">
                                      <div className="spinner-tiny"></div>
                                      <span>Načítám detaily...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="detail-section">
                                        <h5>📋 Základní informace</h5>
                                        <div className="detail-grid">
                                          {details.user?.mobilePhone && (
                                            <div className="detail-row">
                                              <span className="detail-label">📱 Mobil:</span>
                                              <span>{details.user.mobilePhone}</span>
                                            </div>
                                          )}
                                          {details.user?.businessPhones?.length > 0 && (
                                            <div className="detail-row">
                                              <span className="detail-label">☎️ Telefon:</span>
                                              <span>{details.user.businessPhones.join(', ')}</span>
                                            </div>
                                          )}
                                          <div className="detail-row">
                                            <span className="detail-label">🆔 ID:</span>
                                            <span className="entra-guid-tiny">{emp.id}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {details.groups && details.groups.length > 0 && (
                                        <div className="detail-section">
                                          <h5>👥 Skupiny ({details.groups.length})</h5>
                                          <div className="groups-list">
                                            {details.groups.map((group, i) => (
                                              <div key={i} className="group-item">
                                                <span className="group-icon">
                                                  {group.mailEnabled ? '📧' : '🔒'}
                                                </span>
                                                <div className="group-info">
                                                  <div className="group-name">{group.displayName}</div>
                                                  {group.description && (
                                                    <div className="group-desc">{group.description}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {details.manager && (
                                        <div className="detail-section">
                                          <h5>👤 Nadřízený</h5>
                                          <div className="manager-info">
                                            <div className="manager-name">{details.manager.displayName}</div>
                                            {details.manager.jobTitle && (
                                              <div className="manager-title">{details.manager.jobTitle}</div>
                                            )}
                                            {details.manager.mail && (
                                              <div className="manager-email">📧 {details.manager.mail}</div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {details.directReports && details.directReports.length > 0 && (
                                        <div className="detail-section">
                                          <h5>👥 Podřízení ({details.directReports.length})</h5>
                                          <div className="reports-list">
                                            {details.directReports.map((report, i) => (
                                              <div key={i} className="report-item">
                                                <div className="report-name">{report.displayName}</div>
                                                {report.jobTitle && (
                                                  <div className="report-title">{report.jobTitle}</div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tlačítko načíst další - jen pokud NENÍ aktivní vyhledávání */}
                      {!searchMode && hasMoreEmployees && (
                        <div className="load-more-container">
                          <button 
                            className="btn-load-more"
                            onClick={loadMoreEmployees}
                            disabled={loadingMoreEmployees}
                          >
                            {loadingMoreEmployees ? (
                              <>
                                <div className="spinner-tiny"></div>
                                <span>Načítám další...</span>
                              </>
                            ) : (
                              <>
                                <span>⬇️ Načíst dalších 25 zaměstnanců</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {!searchMode && !hasMoreEmployees && employees.length > 0 && (
                        <div className="end-of-list">
                          ✓ Načteni všichni zaměstnanci ({employees.length})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* DEBUG SEKCE - EntraID Data */}
      {user && (
        <section className="debug-section">
          <h3>🔍 Debug - EntraID Data</h3>
          
          <div className="debug-box">
            <h4>Základní info z databáze</h4>
            <pre>{JSON.stringify({
              id: user.id,
              username: user.username,
              email: user.email,
              jmeno: user.jmeno,
              prijmeni: user.prijmeni,
              auth_source: user.auth_source,
              entra_id: user.entra_id,
              upn: user.upn
            }, null, 2)}</pre>
          </div>

          {user.entraData && (
            <div className="debug-box">
              <h4>EntraID Graph API Data (/me)</h4>
              <pre>{JSON.stringify(user.entraData, null, 2)}</pre>
            </div>
          )}

          {entraProfile && (
            <div className="debug-box">
              <h4>EntraID Extended Profile</h4>
              <pre>{JSON.stringify(entraProfile, null, 2)}</pre>
            </div>
          )}

          {!user.entraData && !entraProfile && (
            <div className="debug-box warning">
              <p>⚠️ Žádná EntraID data nejsou dostupná</p>
              <p>Zkontrolujte:</p>
              <ul>
                <li>Máte nastavený <code>entra_id</code>?</li>
                <li>Je <code>auth_source === 'entra'</code>?</li>
                <li>Máte platný access token?</li>
              </ul>
            </div>
          )}

          <div className="debug-box">
            <h4>Dostupná Microsoft Graph API oprávnění</h4>
            <p>Podle konfigurace v Azure Portal by měly být dostupné:</p>
            <ul className="permissions-list">
              <li>✓ <code>User.Read</code> - Základní profil</li>
              <li>✓ <code>email</code> - Emailová adresa</li>
              <li>✓ <code>openid</code> - OpenID Connect</li>
              <li>✓ <code>profile</code> - Základní profil</li>
              <li>✓ <code>offline_access</code> - Refresh token</li>
              <li>{user.entraData?.memberOf ? '✓' : '⚠️'} <code>Group.Read.All</code> - Skupiny</li>
              <li>{user.entraData?.memberOf ? '✓' : '⚠️'} <code>GroupMember.Read.All</code> - Členství ve skupinách</li>
              <li>? <code>ProfilePhoto.Read.All</code> - Profilové fotky</li>
              <li>? <code>User.ReadBasic.All</code> - Základní info o všech uživatelích</li>
            </ul>
          </div>

          {user.entraData?.memberOf && (
            <div className="debug-box">
              <h4>Skupiny (memberOf) - {user.entraData.memberOf.length} skupin</h4>
              <pre>{JSON.stringify(user.entraData.memberOf, null, 2)}</pre>
            </div>
          )}

          {user.entraData?.manager && (
            <div className="debug-box">
              <h4>Manažer</h4>
              <pre>{JSON.stringify(user.entraData.manager, null, 2)}</pre>
            </div>
          )}

          {/* Test přístupu k jiným uživatelům */}
          <div className="debug-box">
            <h4>🧪 Test: Přístup k profilem jiných zaměstnanců</h4>
            <p>Test vyhledání manažera (Jan Černhorský) a jeho podřízených.</p>
            <p className="entra-info-small">
              Vyžaduje: <code>User.Read.All</code> nebo <code>User.ReadBasic.All</code> (Application permissions)
            </p>
            <button 
              className="btn-test"
              onClick={testManagerAccess}
              disabled={loadingManagerTest}
            >
              {loadingManagerTest ? '⏳ Testuji...' : '▶️ Spustit test'}
            </button>

            {managerTest && (
              <div style={{ marginTop: '1rem' }}>
                {managerTest.error ? (
                  <div className="debug-box warning">
                    <p>❌ Chyba: {managerTest.error}</p>
                    <p>Pravděpodobně chybí oprávnění v Azure Portal:</p>
                    <ul>
                      <li><code>User.Read.All</code> (Application permission)</li>
                      <li><code>User.ReadBasic.All</code> (Application permission)</li>
                    </ul>
                    <p>📚 Návod: <code>docs/GRAPH_API_QUICKSTART.md</code></p>
                  </div>
                ) : (
                  <>
                    <h5 style={{ color: '#48bb78', marginTop: '1rem' }}>✅ Manažer nalezen:</h5>
                    <pre>{JSON.stringify(managerTest, null, 2)}</pre>

                    {managerDirectReports && (
                      <>
                        <h5 style={{ color: '#48bb78', marginTop: '1rem' }}>
                          👥 Podřízení ({managerDirectReports.length}):
                        </h5>
                        <pre>{JSON.stringify(managerDirectReports, null, 2)}</pre>
                      </>
                    )}

                    {!managerDirectReports && (
                      <div className="debug-box warning" style={{ marginTop: '1rem' }}>
                        <p>⚠️ Podřízené se nepodařilo načíst</p>
                        <p>Chybí oprávnění: <code>User.Read.All</code> nebo endpoint není dostupný</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
