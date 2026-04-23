// Stránka s přehledem majetku (read-only)
import React, { useState, useEffect, useRef } from 'react';
import { FaList, FaSearch, FaTable, FaTh, FaUser, FaCheckCircle, FaTimesCircle, FaChevronLeft, FaChevronRight, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import './CommonPage.css';

function PrehledPage() {
  const [majetek, setMajetek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // pro debounce
  const [userFilter, setUserFilter] = useState('all');
  const [inventarizovanoFilter, setInventarizovanoFilter] = useState('all');
  const [users, setUsers] = useState([]);
  
  // Modal pro detail inventarizací
  const [showModal, setShowModal] = useState(false);
  const [modalInventarizace, setModalInventarizace] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedMajetek, setSelectedMajetek] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Stats z DB (nezavislé na filtrech)
  const [globalStats, setGlobalStats] = useState({ total: 0, inventarizovano: 0, neinventarizovano: 0 });
  
  // View mode: 'table' nebo 'cards'
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth < 768 ? 'cards' : 'table';
  });

  const debounceRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounce pro search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1); // reset na první stránku při změně search
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Reset na první stránku při změně filtrů
  useEffect(() => {
    setPage(1);
  }, [userFilter, inventarizovanoFilter, perPage]);

  useEffect(() => {
    fetchMajetek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilter, inventarizovanoFilter, page, perPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development' || window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const response = await fetch(`${apiUrl}?endpoint=inventura_users`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchMajetek = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const isDev = process.env.NODE_ENV === 'development' || window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const params = new URLSearchParams({
        endpoint: 'majetek',
        page: page,
        per_page: perPage,
      });
      
      if (userFilter !== 'all') params.append('uzivatel', userFilter);
      if (inventarizovanoFilter !== 'all') params.append('inventarizovano', inventarizovanoFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      
      const response = await fetch(`${apiUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setMajetek(Array.isArray(data.data) ? data.data : [data.data]);
        if (data.pagination) {
          setTotalCount(data.pagination.total);
          setTotalPages(data.pagination.total_pages);
        }
        if (data.stats) {
          setGlobalStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching majetek:', err);
      setError('Chyba při načítání dat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventarizace = async (cislo, majetekItem) => {
    setModalLoading(true);
    setShowModal(true);
    setSelectedMajetek(majetekItem);
    setModalInventarizace([]);
    
    try {
      const apiUrl = '/dev/api.inventik/api.php';
      const response = await fetch(`${apiUrl}?endpoint=majetek_inventarizace&cislo=${encodeURIComponent(cislo)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setModalInventarizace(data.data);
      }
    } catch (err) {
      console.error('Error fetching inventarizace:', err);
      setError('Chyba při načítání inventarizací: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Filtrování je teď na backendu - používáme přímo majetek
  const filteredMajetek = majetek;

  const inventarizovanyCount = globalStats.inventarizovano;
  const neinventarizovanyCount = globalStats.neinventarizovano;

  return (
    <div className="common-page full-width">
      <div className="page-header">
        <FaList className="page-icon" />
        <h1>Přehled veškerého majetku</h1>
        <p>Kompletní databáze majetku s informacemi o inventarizaci</p>
      </div>

      <div className="content-box">
        {/* Filtry */}
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {/* Filtr podle uživatele */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <FaUser style={{ color: '#0891b2', fontSize: '0.875rem' }} />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="filter-select"
              style={{ padding: '0.5rem', fontSize: '0.9rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
            >
              <option value="all">Všichni uživatelé</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Filtr inventarizováno */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setInventarizovanoFilter('all')}
              className={`filter-btn ${inventarizovanoFilter === 'all' ? 'active' : 'inactive'}`}
            >
              Vše
            </button>
            <button
              onClick={() => setInventarizovanoFilter('ano')}
              className={`filter-btn ${inventarizovanoFilter === 'ano' ? 'active' : 'inactive'}`}
            >
              <FaCheckCircle style={{ fontSize: '0.8rem' }} /> Inventarizováno
            </button>
            <button
              onClick={() => setInventarizovanoFilter('ne')}
              className={`filter-btn ${inventarizovanoFilter === 'ne' ? 'active' : 'inactive'}`}
            >
              <FaTimesCircle style={{ fontSize: '0.8rem' }} /> Neinventarizováno
            </button>
          </div>

          {/* View mode toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('table')}
              className={`filter-btn ${viewMode === 'table' ? 'active' : 'inactive'}`}
              title="Tabulkové zobrazení"
            >
              <FaTable />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`filter-btn ${viewMode === 'cards' ? 'active' : 'inactive'}`}
              title="Dlaždice"
            >
              <FaTh />
            </button>
          </div>
        </div>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Hledat podle názvu, inv. čísla, budovy, místnosti, úseku..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <div className="loading">Načítám data...</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && (
          <>
            <div className="stats-row">
              <div className="stat-box" onClick={() => setInventarizovanoFilter('all')} style={{ cursor: 'pointer' }}>
                <span className="stat-value">{totalCount}</span>
                <span className="stat-label">{searchTerm || userFilter !== 'all' || inventarizovanoFilter !== 'all' ? 'Po filtru' : 'Položek celkem'}</span>
              </div>
              <div className="stat-box" onClick={() => setInventarizovanoFilter('ano')} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', cursor: 'pointer' }}>
                <span className="stat-value">{inventarizovanyCount}</span>
                <span className="stat-label">Inventarizováno</span>
              </div>
              <div className="stat-box" onClick={() => setInventarizovanoFilter('ne')} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', cursor: 'pointer' }}>
                <span className="stat-value">{neinventarizovanyCount}</span>
                <span className="stat-label">Neinventarizováno</span>
              </div>
            </div>

            {viewMode === 'cards' ? (
              <div className="items-list">
                {filteredMajetek.map((item, index) => (
                  <div key={index} className={`item-card ${item.inventarizoval_uzivatel ? 'inventarizovan' : 'neinventarizovan'}`}>
                    <div className="item-header">
                      <strong>{item.nazev || 'Bez názvu'}</strong>
                      <span className="item-code">{item.cislo}</span>
                    </div>
                    <div className="item-details">
                      <div className="item-detail-row">
                        <span>Cena:</span>
                        <span>{item.cena_mj_num ? `${item.cena_mj_num} Kč` : '-'}</span>
                      </div>
                      <div className="item-detail-row">
                        <span>Inv. úsek:</span>
                        <span>{(item.cinv && item.inv_usek_nazev) ? `${item.cinv} - ${item.inv_usek_nazev}` : (item.inv_usek_nazev || item.cinv || '-')}</span>
                      </div>
                      <div className="item-detail-row">
                        <span>Budova:</span>
                        <span>{(item.budt && item.budova_nazev) ? `${item.budt} - ${item.budova_nazev}` : (item.budova_nazev || item.budt || '-')}</span>
                      </div>
                      <div className="item-detail-row">
                        <span>Místnost:</span>
                        <span>{(item.mist && item.mistnost_nazev) ? `${item.mist} - ${item.mistnost_nazev}` : (item.mistnost_nazev || item.mist || '-')}</span>
                      </div>
                      <div className="item-detail-row">
                        <span>Zařazeno:</span>
                        <span>{item.datum_zarazeni ? item.datum_zarazeni.split('-').reverse().join('.') : '-'}</span>
                      </div>
                    </div>
                    
                    {/* Metadata o inventarizaci - zvýrazněné */}
                    {item.inventarizoval_uzivatel ? (
                      <div 
                        onClick={() => fetchInventarizace(item.cislo, item)}
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '2px solid #10b981',
                          background: 'linear-gradient(to right, rgba(16, 185, 129, 0.1), transparent)',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <FaCheckCircle style={{ color: '#10b981' }} />
                          <strong style={{ color: '#059669' }}>Inventarizováno</strong>
                          {item.inventarizace_count > 1 && (
                            <span style={{
                              background: '#f59e0b',
                              color: 'white',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              marginLeft: '0.25rem'
                            }}>
                              <FaExclamationTriangle style={{ fontSize: '0.7rem' }} /> {item.inventarizace_count}× DUPLIKÁT!
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          <div>Uživatel: <strong>{item.inventarizoval_uzivatel}</strong></div>
                          <div>Datum: <strong>{new Date(item.inventarizoval_datum).toLocaleString('cs-CZ')}</strong></div>
                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#0891b2' }}>
                            📋 Klikněte pro detail inventarizace
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '2px solid #f59e0b',
                        background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), transparent)',
                        padding: '0.5rem',
                        borderRadius: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaTimesCircle style={{ color: '#f59e0b' }} />
                          <strong style={{ color: '#d97706' }}>Neinventarizováno</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredMajetek.length === 0 && (
                  <div className="no-results">Žádné položky nenalezeny</div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Inv. číslo</th>
                      <th>Název</th>
                      <th>Cena</th>
                      <th>Budova</th>
                      <th>Místnost</th>
                      <th>Inv. úsek</th>
                      <th>Status</th>
                      <th>Inventarizoval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMajetek.map((item, index) => (
                      <tr key={index} className={item.inventarizoval_uzivatel ? 'inventarizovan' : 'neinventarizovan'}>
                        <td><strong>{item.cislo}</strong></td>
                        <td>{item.nazev || 'Bez názvu'}</td>
                        <td>{item.cena_mj_num ? `${item.cena_mj_num} Kč` : '-'}</td>
                        <td>{(item.budt && item.budova_nazev) ? `${item.budt} - ${item.budova_nazev}` : (item.budova_nazev || item.budt || '-')}</td>
                        <td>{(item.mist && item.mistnost_nazev) ? `${item.mist} - ${item.mistnost_nazev}` : (item.mistnost_nazev || item.mist || '-')}</td>
                        <td>{(item.cinv && item.inv_usek_nazev) ? `${item.cinv} - ${item.inv_usek_nazev}` : (item.inv_usek_nazev || item.cinv || '-')}</td>
                        <td>
                          {item.inventarizoval_uzivatel ? (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <FaCheckCircle /> Ano
                              {item.inventarizace_count > 1 && (
                                <span style={{
                                  background: '#f59e0b',
                                  color: 'white',
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '8px',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  marginLeft: '0.25rem'
                                }}>
                                  {item.inventarizace_count}×
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <FaTimesCircle /> Ne
                            </span>
                          )}
                        </td>
                        <td>
                          {item.inventarizoval_uzivatel ? (
                            <div 
                              style={{ fontSize: '0.875rem', cursor: 'pointer', color: '#0891b2' }}
                              onClick={() => fetchInventarizace(item.cislo, item)}
                              title="Klikněte pro detail inventarizace"
                            >
                              <div><strong>{item.inventarizoval_uzivatel}</strong></div>
                              <div style={{ color: '#64748b' }}>{new Date(item.inventarizoval_datum).toLocaleDateString('cs-CZ')}</div>
                              <div style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                📋 Detail
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMajetek.length === 0 && (
                  <div className="no-results">Žádné položky nenalezeny</div>
                )}
              </div>
            )}

            {/* Paginace */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Zobrazeno <strong>{(page - 1) * perPage + 1}</strong>–<strong>{Math.min(page * perPage, totalCount)}</strong> z <strong>{totalCount}</strong>
                </div>
                <div className="pagination-controls">
                  <button
                    className="filter-btn inactive"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    «
                  </button>
                  <button
                    className="filter-btn inactive"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="pagination-page">
                    Stránka <strong>{page}</strong> / {totalPages}
                  </span>
                  <button
                    className="filter-btn inactive"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <FaChevronRight />
                  </button>
                  <button
                    className="filter-btn inactive"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    »
                  </button>
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className="filter-select"
                    style={{ marginLeft: '0.5rem' }}
                  >
                    <option value={20}>20 / stránku</option>
                    <option value={50}>50 / stránku</option>
                    <option value={100}>100 / stránku</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal s detaily inventarizací */}
        {showModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}
            onClick={() => setShowModal(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '1.5rem',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <FaTimes />
              </button>

              <h2 style={{ marginBottom: '1rem', color: '#0891b2' }}>
                Detail inventarizace
              </h2>

              {selectedMajetek && (
                <div style={{ 
                  background: '#f1f5f9', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>
                    {selectedMajetek.nazev || 'Bez názvu'}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    <strong>Číslo:</strong> {selectedMajetek.cislo} | 
                    <strong> Cena:</strong> {selectedMajetek.cena_mj_num ? `${selectedMajetek.cena_mj_num} Kč` : '-'}
                  </div>
                </div>
              )}

              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="loading">Načítám inventarizace...</div>
                </div>
              ) : modalInventarizace.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Žádné inventarizace nenalezeny
                </div>
              ) : (
                <>
                  {modalInventarizace.length > 1 && (
                    <div style={{
                      background: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '1.5rem' }} />
                      <div>
                        <strong>DUPLICITNÍ INVENTARIZACE!</strong>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          Tato položka byla naskenována <strong>{modalInventarizace.length}×</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {modalInventarizace.map((inv, index) => (
                      <div 
                        key={inv.id}
                        style={{
                          border: index === 0 ? '2px solid #10b981' : '2px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '1rem',
                          background: index === 0 ? '#f0fdf4' : 'white'
                        }}
                      >
                        {index === 0 && modalInventarizace.length > 1 && (
                          <div style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            display: 'inline-block'
                          }}>
                            ⭐ HLAVNÍ (nejstarší)
                          </div>
                        )}
                        {index > 0 && (
                          <div style={{
                            background: '#dc2626',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            display: 'inline-block'
                          }}>
                            ⚠️ DUPLIKÁT #{index + 1}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                          <div>
                            <strong style={{ color: '#64748b' }}>Uživatel:</strong>
                            <div>{inv.jmeno_uzivatele}</div>
                          </div>
                          <div>
                            <strong style={{ color: '#64748b' }}>Datum:</strong>
                            <div>{new Date(inv.datum_vytvoreni).toLocaleString('cs-CZ')}</div>
                          </div>
                          <div>
                            <strong style={{ color: '#64748b' }}>Inv. úsek:</strong>
                            <div>{inv.cinv && inv.inv_usek_nazev ? `${inv.cinv} - ${inv.inv_usek_nazev}` : (inv.cinv || '-')}</div>
                          </div>
                          <div>
                            <strong style={{ color: '#64748b' }}>Budova:</strong>
                            <div>{inv.budt && inv.budova_nazev ? `${inv.budt} - ${inv.budova_nazev}` : (inv.budt || '-')}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <strong style={{ color: '#64748b' }}>Místnost:</strong>
                            <div>{inv.mist && inv.mistnost_nazev ? `${inv.mist} - ${inv.mistnost_nazev}` : (inv.mist || '-')}</div>
                          </div>
                          {inv.poznamka && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <strong style={{ color: '#64748b' }}>Poznámka:</strong>
                              <div>{inv.poznamka}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrehledPage;
