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

export default function Fleet250kStatsBubbleChart({ stats }) {
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
      if (!buckets[odhadDatum]) buckets[odhadDatum] = [];
      buckets[odhadDatum].push(row);
    }
  });
  // Seřadit podle data
  const labels = Object.keys(buckets).sort();
  const data = labels.map(label => buckets[label].length);
  // Tooltip s výpisem SPZ, typů a ZKL
  const tooltipCallbacks = {
    title: (ctx) => `Období: ${ctx[0].label}`,
    label: (ctx) => {
      const label = ctx.label;
      const rows = buckets[label] || [];
      return rows.map(row => `SPZ: ${row.spz}, Typ: ${row.typ}, ZKL: ${row.popis}`).join('\n');
    }
  };
  return (
    <div style={{margin:'2em 0'}}>
      <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:'0.7em'}}>Kumulovaný počet vozidel, která dosáhnou 250 000 km v daném období (bublina = seznam vozidel)</div>
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
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: tooltipCallbacks
            }
          },
          scales: {
            x: { title: { display: true, text: 'Měsíc/Rok' } },
            y: { title: { display: true, text: 'Počet vozidel' }, beginAtZero: true }
          }
        }}
      />
    </div>
  );
}
