import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function Fleet250kStatsForecastChart({ stats }) {
  if (!stats || !stats.results || stats.results.length === 0) return null;
  // Připravit data pro graf: SPZ vs. měsíce do 250k km
  const labels = stats.results.map(row => row.spz);
  const data = stats.results.map(row => {
    const kmDo250k = 250000 - (row.stavKm || 0);
    return row.prumerZaMesic > 0 ? Math.ceil(kmDo250k / row.prumerZaMesic) : null;
  });
  return (
    <div style={{margin:'2em 0'}}>
      <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:'0.7em'}}>Odhad měsíců do 250 000 km (vozidla pod 250 000 km)</div>
      <Bar
        data={{
          labels,
          datasets: [{
            label: 'Měsíce do 250k km',
            data,
            backgroundColor: '#43a047',
            borderRadius: 6,
          }]
        }}
        options={{
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'SPZ' } },
            y: { title: { display: true, text: 'Měsíce do 250k km' }, beginAtZero: true }
          }
        }}
      />
    </div>
  );
}
