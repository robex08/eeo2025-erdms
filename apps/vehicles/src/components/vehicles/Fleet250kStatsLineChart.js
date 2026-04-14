import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

function getYearMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
}

export default function Fleet250kStatsLineChart({ stats }) {
  if (!stats || !stats.results || stats.results.length === 0) return null;
  // Seskupit vozidla podle roku/měsíce dosažení 250k km
  const buckets = {};
  stats.results.forEach(row => {
    const kmDo250k = 250000 - (row.stavKm || 0);
    const mesicuDo250k = row.prumerZaMesic > 0 ? Math.ceil(kmDo250k / row.prumerZaMesic) : null;
    let odhadDatum = '';
    if (mesicuDo250k && mesicuDo250k > 0) {
      const aktualizaceDate = row.aktualizace ? new Date(row.aktualizace) : new Date();
      aktualizaceDate.setMonth(aktualizaceDate.getMonth() + mesicuDo250k);
      odhadDatum = getYearMonth(aktualizaceDate);
      buckets[odhadDatum] = (buckets[odhadDatum] || 0) + 1;
    }
  });
  // Seřadit podle data a kumulovat
  const labels = Object.keys(buckets).sort();
  let cumulative = 0;
  const data = labels.map(label => {
    cumulative += buckets[label];
    return cumulative;
  });
  // Začátek osy X je dnešní měsíc/rok
  const today = new Date();
  const todayLabel = getYearMonth(today);
  if (!labels.includes(todayLabel)) {
    labels.unshift(todayLabel);
    data.unshift(0);
  }
  return (
    <div style={{margin:'2em 0'}}>
      <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:'0.7em'}}>Kumulovaný počet vozidel, která dosáhnou 250 000 km v jednotlivých měsících/letech (osa X začíná dnes)</div>
      <Line
        data={{
          labels,
          datasets: [{
            label: 'Kumulovaný počet vozidel',
            data,
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25,118,210,0.08)',
            pointRadius: 4,
            tension: 0.2,
            fill: true,
          }]
        }}
        options={{
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'Měsíc/Rok' } },
            y: { title: { display: true, text: 'Kumulovaný počet vozidel' }, beginAtZero: true }
          }
        }}
      />
    </div>
  );
}
