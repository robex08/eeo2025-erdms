import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiAlertTriangle } from 'react-icons/fi';
import { MdRefresh } from 'react-icons/md';
import './Fleet250kStatsBlock.css';
import { fetchAllVehiclesKmMonth } from '../../api/webDispecinkDB';
import Fleet250kStatsGanttChart from './Fleet250kStatsGanttChart';

/** Max stáří dat pro predikci (v měsících) */
const MAX_DATA_AGE_MONTHS = 6;
/** Varování pro data starší než X měsíců */
const WARN_DATA_AGE_MONTHS = 3;
/** Interval pro sync z WebDispečinku (měsíce zpět) */
const SYNC_INTERVAL_MONTHS = 3;

export default function Fleet250kStatsBlock({ data, positions, onChartFilter, chartCarids, onClearChartFilter }) {
  const [visible, setVisible] = useState(() => {
    const stored = localStorage.getItem('fleet250kStatsVisible');
    return stored === null ? false : stored === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState('');
  const [progressData, setProgressData] = useState(null); // {percent, processed, total, synced, skipped}
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [lastKmSync, setLastKmSync] = useState(null);

  // Helper: get vehicles under 250k km
  const getUnder250kVehicles = () => {
    return data.filter(v => {
      const lastKm = v.pos_km ? Number(v.pos_km) : null;
      return lastKm !== null && lastKm < 250000;
    });
  };

  /** Spočítat stáří dat v měsících */
  const getDataAgeMonths = (dtAktualizace) => {
    if (!dtAktualizace) return Infinity;
    const now = new Date();
    const dt = new Date(dtAktualizace);
    return (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
  };

  /** Načíst stats z DB (rychlé, 1 request) */
  const handleLoadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const vehicles = getUnder250kVehicles();

      const res = await fetchAllVehiclesKmMonth();
      if (res.status !== 'success' || !res.km) {
        throw new Error(res.message || 'Nepodařilo se načíst KM data');
      }

      const kmData = res.km;
      const results = [];
      let staleCount = 0;
      let maxDt = null;

      for (const v of vehicles) {
        const row = kmData[v.w_carid];
        if (!row) continue;

        // Track nejnovější dt_aktualizace
        if (row.dt_aktualizace && (!maxDt || row.dt_aktualizace > maxDt)) {
          maxDt = row.dt_aktualizace;
        }

        const ageMonths = getDataAgeMonths(row.dt_aktualizace);
        if (ageMonths > MAX_DATA_AGE_MONTHS) {
          staleCount++;
          continue;
        }

        const prumer = row.pocet_mesicu > 0 ? row.km / row.pocet_mesicu : 0;
        results.push({
          carid: v.w_carid,
          spz: v.w_spz,
          typ: v.zzs_typ,
          popis: v.w_popis,
          stavKm: row.stavTach,
          najetoKm: row.km,
          pocetMesicu: row.pocet_mesicu,
          prumerZaMesic: prumer,
          aktualizace: row.dt_aktualizace,
          datOd: row.w_datod,
          datDo: row.w_datdo,
          dataAgeMonths: ageMonths,
          isStale: ageMonths > WARN_DATA_AGE_MONTHS
        });
      }

      setStats({
        updated: new Date().toISOString(),
        results,
        staleCount,
        totalUnder250k: vehicles.length,
        withData: results.length
      });
      setLastKmSync(maxDt);
    } catch (e) {
      setError('Chyba při načítání statistik: ' + (e.message || e));
    }
    setLoading(false);
  };

  /** Refresh z WebDispečinku — force sync VŠECH vozidel, pak reload stats */
  const handleFullRefresh = async () => {
    setRefreshing(true);
    setError('');
    setRefreshProgress('Zahajuji synchronizaci...');
    
    try {
      const API_POST_URL = process.env.REACT_APP_APIURL_POST;
      const API_GET_URL = process.env.REACT_APP_APIURL_GET;
      
      // Spustit sync (vrátí progressId okamžitě, pak běží na pozadí)
      const formData = new FormData();
      formData.append('action', 'wdCarsIDKmMesic');
      formData.append('interval', String(SYNC_INTERVAL_MONTHS));
      formData.append('force', '1');

      const response = await fetch(API_POST_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Chyba při synchronizaci (HTTP ${response.status})`);
      }

      const json = await response.json();
      
      if (json.status !== 'success' || !json.data?.progressId) {
        throw new Error('Backend nevrátil progressId');
      }

      const progressId = json.data.progressId;
      const totalCars = json.data.total || 192;
      
      setRefreshProgress('Synchronizace spuštěna...');
      setProgressData({ percent: 0, processed: 0, total: totalCars, synced: 0, skipped: 0 });

      // Polling pro skutečný progress
      const pollInterval = setInterval(async () => {
        try {
          const url = `${API_GET_URL}?action=getSyncProgress&progressId=${encodeURIComponent(progressId)}`;
          const res = await fetch(url);
          
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'success' && data.data) {
              const p = data.data;
              const percent = p.total > 0 ? Math.round((p.processed / p.total) * 100) : 0;
              
              // Aktualizovat progress data pro vizuální progress bar
              setProgressData({
                percent,
                processed: p.processed,
                total: p.total,
                synced: p.synced,
                skipped: p.skipped
              });
              setRefreshProgress('Synchronizace probíhá...');
              
              if (p.status === 'completed') {
                clearInterval(pollInterval);
                setRefreshProgress('Dokončeno. Načítám statistiku...');
                setProgressData(null);
                await handleLoadStats();
                setRefreshing(false);
                setRefreshProgress('');
              } else if (p.status === 'error') {
                clearInterval(pollInterval);
                setError(`Synchronizace selhala: ${p.error}`);
                setRefreshing(false);
                setRefreshProgress('');
                setProgressData(null);
              }
            }
          }
        } catch (e) {
          // Ignorovat chyby pollingu, pokračovat dál
          console.warn('Progress polling error:', e);
        }
      }, 2000); // Poll každé 2 sekundy

      // Timeout fallback (10 minut)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (refreshing) {
          setError('Synchronizace trvá příliš dlouho (timeout 10 minut)');
          setRefreshing(false);
          setRefreshProgress('');
          setProgressData(null);
        }
      }, 600000);

    } catch (e) {
      setError('Chyba při synchronizaci z WebDispečinku: ' + (e.message || e));
      setRefreshing(false);
      setRefreshProgress('');
      setProgressData(null);
    }
  };

  // Reload stats when data changes (filtered vehicles)
  React.useEffect(() => {
    if (visible) {
      handleLoadStats();
    }
    // eslint-disable-next-line
  }, [data, visible]);

  // Store visibility state in localStorage
  React.useEffect(() => {
    localStorage.setItem('fleet250kStatsVisible', String(visible));
  }, [visible]);

  // UI rendering
  return (
    <div className="fleet250k-block">
      <div className="fleet250k-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{fontWeight:'bold', fontSize:'1.08rem', color:'#1976d2', letterSpacing:'0.01em'}}>
          Statistika vozidel do 250 000 km
        </div>
        <button className="fleet250k-toggle" onClick={() => setVisible(v => !v)} style={{border:'none', background:'transparent', cursor:'pointer', fontSize:'1.5rem', color:'#1976d2', padding:4, marginLeft:8, transition:'transform 0.2s'}}>
          {visible ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      {visible && (
        <div className="fleet250k-content">
          {loading ? (
            <div style={{textAlign:'center', padding:'2em'}}>
              <span className="fleet250k-loader" /> Načítám statistiku...
            </div>
          ) : !stats ? (
            <div className="fleet250k-refresh-wrapper">
              <button className="fleet250k-refresh-btn" onClick={handleLoadStats} disabled={loading}>
                <MdRefresh style={{fontSize:'2.2em', marginRight:10, verticalAlign:'middle'}} />
                <span style={{fontSize:'1.18em', fontWeight:'bold', verticalAlign:'middle'}}>Načíst statistiku</span>
              </button>
              {error && <div style={{color:'red', marginTop:'1em'}}>{error}</div>}
            </div>
          ) : (
            <div style={{position:'relative'}}>
              {/* Loading overlay při refreshi z WebDispečinku */}
              {refreshing && (
                <div className="fleet250k-refresh-overlay">
                  <div className="fleet250k-refresh-overlay-content">
                    <MdRefresh className="fleet250k-spin" style={{fontSize:'2.5rem', color:'#1976d2'}} />
                    <div style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1976d2', marginTop:'0.5rem'}}>
                      Synchronizace z WebDispečinku
                    </div>
                    
                    {progressData ? (
                      <div className="fleet250k-progress-wrapper">
                        <div className="fleet250k-progress-header">
                          <span>Zpracováváno vozidel...</span>
                          <span className="fleet250k-progress-percent">{progressData.percent}%</span>
                        </div>
                        <div className="fleet250k-progress-bar-bg">
                          <div 
                            className="fleet250k-progress-bar-fill" 
                            style={{width: `${progressData.percent}%`}}
                          />
                        </div>
                        <div className="fleet250k-progress-details">
                          <div className="fleet250k-progress-stat">
                            <span className="fleet250k-progress-stat-label">Zpracováno:</span>
                            <span className="fleet250k-progress-stat-value">{progressData.processed} / {progressData.total}</span>
                          </div>
                          <div className="fleet250k-progress-stat synced">
                            <span className="fleet250k-progress-stat-label">Synchronizováno:</span>
                            <span className="fleet250k-progress-stat-value">{progressData.synced}</span>
                          </div>
                          <div className="fleet250k-progress-stat skipped">
                            <span className="fleet250k-progress-stat-label">Přeskočeno:</span>
                            <span className="fleet250k-progress-stat-value">{progressData.skipped}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{color:'#555', fontSize:'0.95rem', marginTop:'1rem'}}>
                        {refreshProgress || 'Zahajuji synchronizaci...'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div style={{display:'flex', flexDirection:'column', fontSize:'0.98em', color:'#888', marginBottom:'0.7em', gap:'0.2em'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5em'}}>
                  <span style={{fontWeight:'bold', color:'#1976d2', fontSize:'1em'}}>{`Počet vozidel pod 250 000 km a do 10 let jejich dosažení: ${stats.results.filter(row => {
  const kmDo250k = 250000 - (row.stavKm || 0);
  const mesicuDo250k = row.prumerZaMesic > 0 ? Math.ceil(kmDo250k / row.prumerZaMesic) : null;
  return mesicuDo250k !== null && mesicuDo250k <= 120;
}).length}`} ks</span>
                  <span style={{display:'flex', alignItems:'center', gap:'0.5em'}}>
                    {stats.staleCount > 0 && (
                      <span style={{color:'#e67e22', fontSize:'0.92em', display:'inline-flex', alignItems:'center', gap:4}}>
                        <FiAlertTriangle /> {stats.staleCount} vozidel vyřazeno (data starší než 6 měsíců)
                      </span>
                    )}
                    {lastKmSync && (
                      <span style={{fontSize:'0.88rem', color:'#888', whiteSpace:'nowrap'}}>
                        Aktualizováno: {new Date(lastKmSync).toLocaleString('cs-CZ', {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                      </span>
                    )}
                  </span>
                </div>
                <div style={{color:'#888', fontSize:'0.9em'}}>
                  (predikce z posledních {stats.results[0]?.pocetMesicu || 3} měsíců nájezdu)
                </div>
              </div>
              <Fleet250kStatsGanttChart
                stats={stats}
                onRefresh={handleFullRefresh}
                loading={loading || refreshing}
                onChartFilter={onChartFilter}
                chartCarids={chartCarids}
                onClearChartFilter={onClearChartFilter}
              />
              {error && <div style={{color:'red', marginTop:'0.5em', fontSize:'0.95em'}}>{error}</div>}
            </div>
          )}
        </div>
      )}
      </div>
  );
}
