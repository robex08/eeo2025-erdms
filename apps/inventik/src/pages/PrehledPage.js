// Stránka s přehledem majetku (read-only)
import React, { useState, useEffect } from 'react';
import { FaList, FaSearch } from 'react-icons/fa';
import './CommonPage.css';

function PrehledPage() {
  const [majetek, setMajetek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMajetek();
  }, []);

  const fetchMajetek = async () => {
    try {
      // Zjistit prostředí podle URL v prohlížeči (spolehlivější než build-time proměnná)
      const isDev = window.location.pathname.startsWith('/dev/');
      const apiUrl = isDev ? '/dev/api.inventik/api.php' : '/api.inventik/api.php';
      
      const response = await fetch(`${apiUrl}?endpoint=majetek&limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setMajetek(Array.isArray(data.data) ? data.data : [data.data]);
      }
    } catch (err) {
      console.error('Error fetching majetek:', err);
      setError('Chyba při načítání dat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMajetek = majetek.filter(item =>
    item.nazev?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cislo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="common-page">
      <div className="page-header">
        <FaList className="page-icon" />
        <h1>Přehled majetku</h1>
        <p>Celkový přehled evidovaného majetku (read-only)</p>
      </div>

      <div className="content-box">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Hledat podle názvu nebo inv. čísla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <div className="loading">Načítám data...</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && (
          <>
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-value">{filteredMajetek.length}</span>
                <span className="stat-label">Položek celkem</span>
              </div>
            </div>

            <div className="items-list">
              {filteredMajetek.map((item, index) => (
                <div key={index} className="item-card">
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
                      <span>cinv:</span>
                      <span>{item.cinv || '-'}</span>
                    </div>
                    <div className="item-detail-row">
                      <span>budt:</span>
                      <span>{item.budt || '-'}</span>
                    </div>
                    <div className="item-detail-row">
                      <span>mist:</span>
                      <span>{item.mist || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredMajetek.length === 0 && (
                <div className="no-results">
                  Žádné položky nenalezeny
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PrehledPage;
