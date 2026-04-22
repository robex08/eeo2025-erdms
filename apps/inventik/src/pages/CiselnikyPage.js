// Stránka s číselníky (read-only)
import React, { useState, useEffect } from 'react';
import { FaList, FaBuilding, FaDoorOpen, FaLayerGroup } from 'react-icons/fa';
import './CommonPage.css';

function CiselnikyPage() {
  const [activeTab, setActiveTab] = useState('budovy');
  const [budovy, setBudovy] = useState([]);
  const [mistnosti, setMistnosti] = useState([]);
  const [useky, setUseky] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'budovy', label: 'Budovy', icon: <FaBuilding /> },
    { id: 'mistnosti', label: 'Místnosti', icon: <FaDoorOpen /> },
    { id: 'useky', label: 'Inv. úseky', icon: <FaLayerGroup /> },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Zjistit prostředí podle URL v prohlížeči (spolehlivější než build-time proměnná)
      const isDev = window.location.pathname.startsWith('/dev/');
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
    <div className="common-page">
      <div className="page-header">
        <FaList className="page-icon" />
        <h1>Číselníky</h1>
        <p>Přehled číselníků - budovy, místnosti, inventární úseky (read-only)</p>
      </div>

      <div className="content-box">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {loading && <p className="loading">Načítám data...</p>}
          {error && <p className="error">{error}</p>}
          
          {!loading && !error && activeTab === 'budovy' && (
            <div>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value">{budovy.length}</div>
                  <div className="stat-label">Celkem budov</div>
                </div>
              </div>
              <div className="items-list">
                {budovy.map((item, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-title">
                      <FaBuilding />
                      <strong>{item.budt}</strong> - {item.budovat}
                    </div>
                    {item.bmist && <p className="item-detail">Místo: {item.bmist}</p>}
                    {item.zaplf && <p className="item-detail muted">Zaplf: {item.zaplf}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!loading && !error && activeTab === 'mistnosti' && (
            <div>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value">{mistnosti.length}</div>
                  <div className="stat-label">Celkem místností</div>
                </div>
              </div>
              <div className="items-list">
                {mistnosti.map((item, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-title">
                      <FaDoorOpen />
                      <strong>{item.mist}</strong> - {item.mistt}
                    </div>
                    {item.budova_nazev && <p className="item-detail">Budova: {item.budova_nazev}</p>}
                    {item.budt && <p className="item-detail muted">Kód budovy: {item.budt}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!loading && !error && activeTab === 'useky' && (
            <div>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value">{useky.length}</div>
                  <div className="stat-label">Celkem inv. úseků</div>
                </div>
              </div>
              <div className="items-list">
                {useky.map((item, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-title">
                      <FaLayerGroup />
                      <strong>{item.cinv}</strong> - {item.nazinv}
                    </div>
                    {item.prac && <p className="item-detail">Prac: {item.prac}</p>}
                    {item.zaplf && <p className="item-detail muted">Zaplf: {item.zaplf}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CiselnikyPage;
