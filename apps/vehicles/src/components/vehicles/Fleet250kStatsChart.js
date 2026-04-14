import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function Fleet250kStatsChart({ stats }) {
  if (!stats || !stats.results || stats.results.length === 0) return null;
  // Připravit data pro graf: SPZ vs. průměr za měsíc
  const labels = stats.results.map(row => row.spz);
  const data = stats.results.map(row => row.prumerZaMesic);
  return (
    <div style={{margin:'2em 0'}}>
      <div style={{fontWeight:'bold', color:'#1976d2', marginBottom:'0.7em'}}>Průměrné km za měsíc (vozidla pod 250 000 km)</div>
      <Bar
        data={{
          labels,
          datasets: [{
            label: 'Průměr za měsíc',
            data,
            backgroundColor: '#1976d2',
            borderRadius: 6,
          }]
        }}
        options={{
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'SPZ' } },
            y: { title: { display: true, text: 'Průměr km/měsíc' }, beginAtZero: true }
          }
        }}
      />
    </div>
  );
}
