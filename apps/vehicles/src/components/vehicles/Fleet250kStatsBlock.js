import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { MdRefresh } from 'react-icons/md';
import './Fleet250kStatsBlock.css';
import { fetchVehicleKmMonthWithRefresh } from '../../api/webDispecinkDB';
import Fleet250kStatsGanttChart from './Fleet250kStatsGanttChart';

export default function Fleet250kStatsBlock({ data, positions, onChartFilter, chartCarids, onClearChartFilter }) {
  // Get carid filter from parent via localStorage or context (not available here), so use window. For now, expect parent to pass a clear callback.
  // We'll add a prop for clearing filter if needed, but for now, use window statically.
  // Instead, accept an optional prop: chartCarids, and onClearChartFilter.
  const [visible, setVisible] = useState(() => {
    const stored = localStorage.getItem('fleet250kStatsVisible');
    return stored === null ? false : stored === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  // Helper: get vehicles under 250k km
  const getUnder250kVehicles = () => {
    return data.filter(v => {
      const posArr = positions[v.w_carid];
      if (!posArr || !Array.isArray(posArr) || posArr.length === 0) return false;
      const last = [...posArr].sort((a, b) => (b.dt_aktualizace || '').localeCompare(a.dt_aktualizace || ''))[0];
      const lastKm = last && last.w_km ? Number(last.w_km) : null;
      return lastKm !== null && lastKm < 250000;
    });
  };

  // Load stats from API for all under-250-k vehicles, cache per carid set
  const handleLoadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const interval = Number(process.env.REACT_APP_KM_MONTHS_BACK) || 12;
      const vehicles = getUnder250kVehicles();
      const carids = vehicles.map(v => v.w_carid).sort();
      const cacheKey = 'fleet250kStats-' + JSON.stringify(carids);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setStats(JSON.parse(cached));
        setLoading(false);
        return;
      }
      const results = [];
      for (const v of vehicles) {
        // interval: z .env nebo default 12 měsíců
        const res = await fetchVehicleKmMonthWithRefresh(v.w_carid, interval);
        if (res.status === 'success' && res.km && res.km.length > 0) {
          // Vezmi první záznam (nejnovější)
          const row = res.km[0];
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
            datDo: row.w_datdo
          });
        }
      }
      const statsObj = {
        updated: new Date().toISOString(),
        results
      };
      localStorage.setItem(cacheKey, JSON.stringify(statsObj));
      setStats(statsObj);
    } catch (e) {
      setError('Chyba při načítání statistik: ' + (e.message || e));
    }
    setLoading(false);
  };
  // Always reload stats when data changes (filtered vehicles)
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
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.98em', color:'#888', marginBottom:'0.7em'}}>
                <span style={{fontWeight:'bold', color:'#1976d2', fontSize:'1em'}}>{`Počet vozidel pod 250 000 km a do 10 let jejich dosažení  : ${stats.results.filter(row => {
  const kmDo250k = 250000 - (row.stavKm || 0);
  const mesicuDo250k = row.prumerZaMesic > 0 ? Math.ceil(kmDo250k / row.prumerZaMesic) : null;
  return mesicuDo250k !== null && mesicuDo250k <= 120;
}).length}`} ks</span><span>Aktualizováno: {new Date(stats.updated).toLocaleString('cs-CZ')}</span>
              </div>
              <Fleet250kStatsGanttChart
                stats={stats}
                onRefresh={handleLoadStats}
                loading={loading}
                onChartFilter={onChartFilter}
                chartCarids={chartCarids}
                onClearChartFilter={onClearChartFilter}
              />
            </div>
          )}
        </div>
      )}
      </div>
  );
}
