// Stránka s číselníky (read-only)
import React, { useState, useEffect } from 'react';
import { FaList, FaBuilding, FaDoorOpen, FaLayerGroup, FaSearch } from 'react-icons/fa';
import './CommonPage.css';

function CiselnikyPage() {
  const [activeTab, setActiveTab] = useState('useky');
  const [budovy, setBudovy] = useState([]);
  const [mistnosti, setMistnosti] = useState([]);
  const [useky, setUseky] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'useky', label: 'Inv. úseky', icon: <FaLayerGroup /> },
    { id: 'budovy', label: 'Budovy', icon: <FaBuilding /> },
    { id: 'mistnosti', label: 'Místnosti', icon: <FaDoorOpen /> },
  ];

  // Formátování data platnosti (zaplf = od, koplf = do)
  const formatPlatnost = (zaplf, koplf) => {
    const parts = [];
    if (zaplf) parts.push(`od ${zaplf}`);
    if (koplf) parts.push(`do ${koplf}`);
    return parts.length ? parts.join(' ') : null;
  };

  // Formátování datetime na datum
  const formatDate = (datetime) => {
    if (!datetime) return null;
    // Z "2026-04-22 07:20:18" -> "22.04.2026"
    const date = new Date(datetime);
    if (isNaN(date)) return datetime;
    return date.toLocaleDateString('cs-CZ');
  };

  // Odstranění diakritiky pro vyhledávání
  const removeDiacritics = (str) => {
    if (!str) return '';
    return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  // Filtrování dat podle searchTerm
  const filterData = (items, type) => {
    if (!searchTerm.trim()) return items;
    
    const search = removeDiacritics(searchTerm);
    
    return items.filter(item => {
      if (type === 'budovy') {
        return removeDiacritics(item.budt).includes(search) ||
               removeDiacritics(item.budovat).includes(search) ||
               removeDiacritics(item.bmist).includes(search);
      }
      if (type === 'mistnosti') {
        return removeDiacritics(item.mist).includes(search) ||
               removeDiacritics(item.mistt).includes(search) ||
               removeDiacritics(item.budt).includes(search) ||
               removeDiacritics(item.budova_nazev).includes(search);
      }
      if (type === 'useky') {
        return removeDiacritics(item.cinv).includes(search) ||
               removeDiacritics(item.nazinv).includes(search) ||
               removeDiacritics(item.prac).includes(search);
      }
      return false;
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // V development módu (npm start) použít /dev/api.inventik, v produkci podle URL
      const isDev = process.env.NODE_ENV === 'development' || window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      let endpoint = '';
      if (activeTab === 'budovy') endpoint = 'budovy';
      else if (activeTab === 'mistnosti') endpoint = 'mistnosti';
      else if (activeTab === 'useky') endpoint = 'inventarni_useky';
      
      const response = await fetch(`${apiUrl}?endpoint=${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const items = Array.isArray(data.data) ? data.data : [data.data];
        
        if (activeTab === 'budovy') setBudovy(items);
        else if (activeTab === 'mistnosti') setMistnosti(items);
        else if (activeTab === 'useky') setUseky(items);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Chyba při načítání dat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="common-page full-width">
      <div className="page-header">
        <FaList className="page-icon" />
        <h1>Číselníky</h1>
        <p>Přehled číselníků - budovy, místnosti, inventární úseky (read-only)</p>
      </div>

      <div className="content-box">
        <div className="tabs">
          {tabs.map(tab => {
            let count = 0;
            if (tab.id === 'budovy') count = filterData(budovy, 'budovy').length;
            else if (tab.id === 'mistnosti') count = filterData(mistnosti, 'mistnosti').length;
            else if (tab.id === 'useky') count = filterData(useky, 'useky').length;
            
            return (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {count > 0 && <span className="tab-badge">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Hledat podle názvu, čísla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tab-content">
          {loading && <p className="loading">Načítám data...</p>}
          {error && <p className="error">{error}</p>}
          
          {!loading && !error && activeTab === 'budovy' && (() => {
            const filtered = filterData(budovy, 'budovy');
            return (
            <div>
              {filtered.length === 0 && <p className="no-results">Nic nenalezeno</p>}
              <div className="items-list">
                {filtered.map((item, idx) => {
                  const platnost = formatPlatnost(item.zaplf, item.koplf);
                  const created = formatDate(item.created_at);
                  const updated = formatDate(item.updated_at);
                  return (
                    <div key={idx} className="item-card">
                      <div className="item-title">
                        <FaBuilding />
                        <strong>{item.budt}</strong> {item.budovat}
                      </div>
                      {platnost && <p className="item-detail muted">Platnost: {platnost}</p>}
                      {(created || updated) && (
                        <p className="item-detail muted" style={{fontSize: '0.85em'}}>
                          {created && `Vytvořeno: ${created}`}
                          {created && updated && ' | '}
                          {updated && `Upraveno: ${updated}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}
          
          {!loading && !error && activeTab === 'mistnosti' && (() => {
            const filtered = filterData(mistnosti, 'mistnosti');
            return (
            <div>
              {filtered.length === 0 && <p className="no-results">Nic nenalezeno</p>}
              <div className="items-list">
                {filtered.map((item, idx) => {
                  const platnost = formatPlatnost(item.zaplf, item.koplf);
                  const created = formatDate(item.created_at);
                  const updated = formatDate(item.updated_at);
                  return (
                    <div key={idx} className="item-card">
                      <div className="item-title">
                        <FaDoorOpen />
                        <strong>{item.mist}</strong> {item.mistt}
                      </div>
                      {(item.budt || item.budova_nazev) && (
                        <p className="item-detail">
                          Budova: <strong>{item.budt}</strong>
                          {item.budova_nazev ? ` ${item.budova_nazev}` : ''}
                        </p>
                      )}
                      {platnost && <p className="item-detail muted">Platnost: {platnost}</p>}
                      {(created || updated) && (
                        <p className="item-detail muted" style={{fontSize: '0.85em'}}>
                          {created && `Vytvořeno: ${created}`}
                          {created && updated && ' | '}
                          {updated && `Upraveno: ${updated}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}
          
          {!loading && !error && activeTab === 'useky' && (() => {
            const filtered = filterData(useky, 'useky');
            return (
            <div>
              {filtered.length === 0 && <p className="no-results">Nic nenalezeno</p>}
              <div className="items-list">
                {filtered.map((item, idx) => {
                  const platnost = formatPlatnost(item.zaplf, item.koplf);
                  const created = formatDate(item.created_at);
                  const updated = formatDate(item.updated_at);
                  return (
                    <div key={idx} className="item-card">
                      <div className="item-title">
                        <FaLayerGroup />
                        <strong>{item.cinv}</strong> {item.nazinv}
                      </div>
                      {item.prac && item.prac !== item.cinv && (
                        <p className="item-detail">Pracoviště: {item.prac}</p>
                      )}
                      {platnost && <p className="item-detail muted">Platnost: {platnost}</p>}
                      {(created || updated) && (
                        <p className="item-detail muted" style={{fontSize: '0.85em'}}>
                          {created && `Vytvořeno: ${created}`}
                          {created && updated && ' | '}
                          {updated && `Upraveno: ${updated}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default CiselnikyPage;
