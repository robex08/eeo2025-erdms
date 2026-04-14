import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip } from 'chart.js';
import vehicleKmColors from '../../utils/vehicleKmColors';

Chart.register(ArcElement, Tooltip);

function getKmCategory(km) {
  if (km >= 500000) return '\u2265500 000';
  if (km >= 400000) return '400 000+';
  if (km >= 300000) return '300 000+';
  if (km >= 200000) return '200 000+';
  if (km >= 100000) return '100 000+';
  if (km >= 0) return '0+';
  return '-1';
}

export default function VehicleCharts({ data, positions, filteredCount, onKmSliceClick, activeKmFilter, onTypeSliceClick, activeTypeFilter, onStationSliceClick, activeStationFilter, under100kCount }) {
  // --- Graf 1: Počet aut podle najetých km (pouze filtrovaná data) ---
  const kmCounts = { '0+': 0, '100 000+': 0, '200 000+': 0, '300 000+': 0, '400 000+': 0, '\u2265500 000': 0 };
  data.forEach(v => {
    let lastKm = null;
    if (positions[v.w_carid] && Array.isArray(positions[v.w_carid]) && positions[v.w_carid].length > 0) {
      const sorted = [...positions[v.w_carid]].sort((a, b) => (b.dt_aktualizace || '').localeCompare(a.dt_aktualizace || ''));
      const last = sorted[0];
      lastKm = last && last.w_km ? Number(last.w_km) : null;
    }
    if (lastKm !== null) {
      if (lastKm >= 0 && lastKm < 100000) kmCounts['0+']++;
      else if (lastKm >= 100000 && lastKm < 200000) kmCounts['100 000+']++;
      else if (lastKm >= 200000 && lastKm < 300000) kmCounts['200 000+']++;
      else if (lastKm >= 300000 && lastKm < 400000) kmCounts['300 000+']++;
      else if (lastKm >= 400000 && lastKm < 500000) kmCounts['400 000+']++;
      else if (lastKm >= 500000) kmCounts['\u2265500 000']++;
    }
  });
  const kmLabels = Object.keys(kmCounts);
  const kmData = Object.values(kmCounts);
  const kmColors = ['#e0e0e0', ...vehicleKmColors];

  // --- Graf 2: Počet aut podle stanoviště (w_groupname) ---
  const stanCounts = {};
  data.forEach(v => {
    const stan = v.w_groupname || 'Neznámé';
    stanCounts[stan] = (stanCounts[stan] || 0) + 1;
  });
  // Stabilní pořadí stanovišť (abecedně)
  const stanLabels = Object.keys(stanCounts).sort();
  const stanData = stanLabels.map(label => stanCounts[label]);
  // Odstíny zelené pro stanoviště (jedna barevná rodina)
  const stanColors = [
    '#e8f5e9', // světle zelená
    '#c8e6c9',
    '#a5d6a7',
    '#81c784',
    '#66bb6a',
    '#4caf50',
    '#43a047',
    '#388e3c',
    '#2e7d32',
    '#1b5e20',
    '#b9f6ca',
    '#69f0ae',
    '#00e676',
    '#00c853',
    '#b2dfdb',
    '#80cbc4',
    '#4db6ac',
    '#26a69a',
    '#009688',
    '#00897b'
  ];

  const pieLabel = {
    id: 'pieLabel',
    afterDraw(chart) {
      const { ctx, chartArea: area, data } = chart;
      chart.getDatasetMeta(0).data.forEach((arc, i) => {
        const val = data.datasets[0].data[i];
        if (!val) return;
        const label = data.labels[i] + '\n' + val;
        const angle = (arc.startAngle + arc.endAngle) / 2;
        const radius = arc.outerRadius * 0.7;
        const x = arc.x + Math.cos(angle) * radius;
        const y = arc.y + Math.sin(angle) * radius;
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#222';
        label.split('\n').forEach((line, idx) => {
          ctx.fillText(line, x, y + idx * 15 - 7);
        });
        ctx.restore();
      });
    }
  };

  // --- Graf 3: Počet aut podle typu vozidla ---
  const typCounts = {};
  data.forEach(v => {
    const typ = v.zzs_typ || 'Neznámý typ';
    typCounts[typ] = (typCounts[typ] || 0) + 1;
  });
  // Zajistit stabilní pořadí typů (abecedně)
  const typLabels = Object.keys(typCounts).sort();
  const typData = typLabels.map(label => typCounts[label]);
  // Odstíny modré pro typy vozidel (jedna barevná rodina)
  const typColors = [
    '#e3f2fd', // světle modrá
    '#bbdefb',
    '#90caf9',
    '#64b5f6',
    '#42a5f5',
    '#2196f3',
    '#1e88e5',
    '#1976d2',
    '#1565c0',
    '#0d47a1',
    '#82b1ff',
    '#448aff',
    '#2979ff',
    '#2962ff',
    '#b3e5fc',
    '#81d4fa',
    '#4fc3f7',
    '#29b6f6',
    '#039be5',
    '#0288d1'
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '2.5rem',
      marginBottom: '2.5rem',
      alignItems: 'stretch',
      width: '100%',
      justifyContent: 'center',
      boxSizing: 'border-box'
    }}>
      {/* Graf najetých km */}
      <div style={{flex:'1 1 340px', minWidth:320, maxWidth:340, background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', padding:'1.2rem 1.5rem', marginBottom: '2rem'}}>
        <div style={{textAlign:'center', fontWeight:'bold', fontSize:'1.22rem', marginBottom:12, letterSpacing:'0.01em', color:'#1976d2'}}>Nájezd vozů (km)</div>
        <div
          style={{position:'relative', cursor:'pointer'}}
          onClick={e => {
            if (e.target.tagName !== 'CANVAS' && onKmSliceClick) onKmSliceClick(null);
          }}
        >
          <Pie
            data={{
              labels: kmLabels,
              datasets: [{ data: kmData, backgroundColor: kmColors }]
            }}
            width={320}
            height={320}
            options={{
              plugins: { legend: { display: false } },
              onHover: (event, elements) => {
                event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
              },
              onClick: (e, elements, chart) => {
                if (elements.length && onKmSliceClick) {
                  const idx = elements[0].index;
                  onKmSliceClick(kmLabels[idx]);
                }
              }
            }}
            plugins={[pieLabel]}
          />
        </div>
      </div>
      {/* Graf podle typu vozidla */}
      <div style={{flex:'1 1 340px', minWidth:320, maxWidth:340, background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', padding:'1.2rem 1.5rem', marginBottom: '2rem'}}>
        <div style={{textAlign:'center', fontWeight:'bold', fontSize:'1.22rem', marginBottom:12, letterSpacing:'0.01em', color:'#1976d2'}}>Typ vozidla</div>
        <div
          style={{position:'relative', cursor:'pointer'}}
          onClick={e => {
            if (e.target.tagName !== 'CANVAS' && onTypeSliceClick) onTypeSliceClick(null);
          }}
        >
          <Pie
            data={{
              labels: typLabels,
              datasets: [{
                data: typData,
                backgroundColor: typLabels.map((t, i) => activeTypeFilter && t === activeTypeFilter ? '#ffb300' : typColors[i % typColors.length])
              }]
            }}
            width={320}
            height={320}
            options={{
              plugins: { legend: { display: false } },
              onHover: (event, elements) => {
                event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
              },
              onClick: (e, elements, chart) => {
                if (elements.length && onTypeSliceClick) {
                  const idx = elements[0].index;
                  onTypeSliceClick(typLabels[idx]);
                }
              }
            }}
            plugins={[pieLabel]}
          />
        </div>
      </div>
      {/* Graf podle stanoviště */}
      <div style={{flex:'1 1 340px', minWidth:320, maxWidth:340, background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', padding:'1.2rem 1.5rem', marginBottom: '2rem'}}>
        <div style={{textAlign:'center', fontWeight:'bold', fontSize:'1.22rem', marginBottom:12, letterSpacing:'0.01em', color:'#1976d2'}}>Stanoviště</div>
        <div
          style={{position:'relative', cursor:'pointer'}}
          onClick={e => {
            if (e.target.tagName !== 'CANVAS' && onStationSliceClick) onStationSliceClick(null);
          }}
        >
          <Pie
            data={{
              labels: stanLabels,
              datasets: [{
                data: stanData,
                backgroundColor: stanLabels.map((s, i) => activeStationFilter && s === activeStationFilter ? '#00bcd4' : stanColors[i % stanColors.length])
              }]
            }}
            width={320}
            height={320}
            options={{
              plugins: { legend: { display: false } },
              onHover: (event, elements) => {
                event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
              },
              onClick: (e, elements, chart) => {
                if (elements.length && onStationSliceClick) {
                  const idx = elements[0].index;
                  onStationSliceClick(stanLabels[idx]);
                }
              }
            }}
            plugins={[pieLabel]}
          />
        </div>
      </div>
    </div>
  );
}
