import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

function getYearMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
}

export default function Fleet250kStatsTimelineChart({ stats }) {
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
  // Seřadit podle data
  const labels = Object.keys(buckets).sort();
  const data = labels.map(label => buckets[label]);
  return (
    <div style={{margin:'2em 0'}}>
      <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:'0.7em'}}>Kumulovaný počet vozidel, která dosáhnou 250 000 km v daném měsíci/roce</div>
      <Bar
        data={{
          labels,
          datasets: [{
            label: 'Počet vozidel',
            data,
            backgroundColor: '#ff9800',
            borderRadius: 6,
          }]
        }}
        options={{
          indexAxis: 'x',
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'Měsíc/Rok' } },
            y: { title: { display: true, text: 'Počet vozidel' }, beginAtZero: true }
          }
        }}
      />
    </div>
  );
}
