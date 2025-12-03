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

  const loadEmployees = async () => {
    console.log('🟣 Dashboard: loadEmployees() START');
    try {
      setLoadingEmployees(true);
      const response = await fetch('/api/entra/users?limit=50', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟣 Dashboard: Employees loaded:', data);
      
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (err) {
      console.error('🔴 loadEmployees ERROR:', err);
    } finally {
      setLoadingEmployees(false);
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
                <a href="/eeo" className="app-card">
                  <div className="app-icon">📦</div>
                  <h4>EEO</h4>
                  <p>Elektronická evidence objednávek</p>
                </a>
                <a href="/intranet" className="app-card">
                  <div className="app-icon">📋</div>
                  <h4>Intranet</h4>
                  <p>Interní systém</p>
                </a>
                <a href="/vozidla" className="app-card">
                  <div className="app-icon">🚑</div>
                  <h4>Vozidla</h4>
                  <p>Správa vozového parku</p>
                </a>
                <a href="/szm" className="app-card">
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
                  <div className="entra-section" style={{background: 'rgba(102, 126, 234, 0.1)', marginTop: '1.5rem'}}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: '#5a67d8'}}>📊 Rozšířené informace z Microsoft Graph API</h4>
                    <p style={{margin: 0, fontSize: '0.85rem', color: '#4a5568'}}>
                      Data níže vyžadují oprávnění v Azure Portal. 
                      {!entraProfile && !loadingEntra && ' Nastavte oprávnění podle docs/GRAPH_API_QUICKSTART.md'}
                    </p>
                  </div>

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
                  {loadingEmployees ? (
                    <div className="entra-loading">
                      <div className="spinner-small"></div>
                      <span>Načítám seznam zaměstnanců...</span>
                    </div>
                  ) : employees.length > 0 ? (
                    <div className="employees-list">
                      <div className="employees-header">
                        <h4>Seznam zaměstnanců ({employees.length})</h4>
                        <p className="employees-subtitle">První zaměstnanci seřazení podle jména</p>
                      </div>
                      <div className="employees-grid">
                        {employees.map((emp, idx) => (
                          <div key={emp.id || idx} className="employee-card">
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
                              <div className="employee-detail-item">
                                <span className="detail-label">🆔</span>
                                <span className="detail-value entra-guid-small">{emp.id}</span>
                              </div>
                              <div className="employee-status">
                                {emp.accountEnabled ? (
                                  <span className="status-badge active">✓ Aktivní</span>
                                ) : (
                                  <span className="status-badge inactive">✗ Neaktivní</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="entra-info-box">
                      <p>ℹ️ Nejsou dostupná data o zaměstnancích.</p>
                      <p className="entra-info-small">
                        Nastavte oprávnění v Azure Portal podle <strong>docs/GRAPH_API_QUICKSTART.md</strong>
                      </p>
                      <button 
                        className="btn-retry"
                        onClick={loadEmployees}
                      >
                        Zkusit znovu
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
