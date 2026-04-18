  // ...existing code...
import React from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { BarController } from 'chart.js';
import { FiRefreshCw } from 'react-icons/fi';
import { FiX } from 'react-icons/fi';
import ChartFullscreenWrapper from './ChartFullscreenWrapper';
import './Fleet250kStatsGanttChart.css';

// Register required Chart.js components
Chart.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip);

function getHalfYear(dateObj) {
  if (!dateObj || !(dateObj instanceof Date)) return '';
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  // Always return '1. pol YYYY' or '2. pol YYYY' for correct half-year labeling
  return month < 6 ? `1. pol ${year}` : `2. pol ${year}`;
// ...existing code...

// Helper to ensure both half-years for each year are present in labels
function getSortedHalfYearLabels(halfYearBuckets) {
  // Extract all years from keys
  const years = Array.from(new Set(Object.keys(halfYearBuckets).map(label => label.split(' ')[2])));
  // For each year, add both half-years
  const labels = [];
  years.sort().forEach(year => {
    const first = `1. pol ${year}`;
    const second = `2. pol ${year}`;
    if (halfYearBuckets[first]) labels.push(first);
    if (halfYearBuckets[second]) labels.push(second);
  });
  return labels;
}
}
// Helper to ensure both half-years for each year are present in labels
function getSortedHalfYearLabels(halfYearBuckets) {
  // Extract all years from keys
  const years = Array.from(new Set(Object.keys(halfYearBuckets).map(label => label.split(' ')[2])));
  // For each year, add both half-years
  const labels = [];
  years.sort().forEach(year => {
    const first = `1. pol ${year}`;
    const second = `2. pol ${year}`;
    if (halfYearBuckets[first]) labels.push(first);
    if (halfYearBuckets[second]) labels.push(second);
  });
  return labels;
}

export default function Fleet250kStatsGanttChart({ stats, onRefresh, loading, onChartFilter, chartCarids, onClearChartFilter }) {
  // Chart ref for click events (must be top-level for hooks)
  const chartRef = React.useRef();
  // Add pointer cursor on hover (must be top-level for hooks)
  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas;
    if (!canvas) return;
    const handleMouseMove = e => {
      const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
      canvas.style.cursor = points.length ? 'pointer' : 'default';
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [chartRef]);

  if (!stats || !stats.results || stats.results.length === 0) return null;
  // Prepare and sort data
  const sorted = stats.results
    .map(row => {
      const mesicuDo250k = row.prumerZaMesic > 0 ? Math.ceil((250000 - (row.stavKm || 0)) / row.prumerZaMesic) : null;
      let odhadDatum = '';
      let odhadDateObj = null;
      if (mesicuDo250k && mesicuDo250k > 0) {
        const aktualizaceDate = row.aktualizace ? new Date(row.aktualizace) : new Date();
        aktualizaceDate.setMonth(aktualizaceDate.getMonth() + mesicuDo250k);
        odhadDatum = `${aktualizaceDate.getFullYear()}-${aktualizaceDate.getMonth()+1}`;
        odhadDateObj = aktualizaceDate;
      }
      return {
        ...row,
        mesicuDo250k,
        odhadDatum,
        odhadDateObj,
        rows: [row]
      };
    })
    .filter(row => row.odhadDatum && row.mesicuDo250k <= 120)
    .sort((a, b) => a.odhadDateObj - b.odhadDateObj);

  // Seskupit vozidla podle půlroků a měsíců v rámci půlroku
  const halfYearMonthBuckets = {};
  sorted.forEach(row => {
    const halfYear = getHalfYear(row.odhadDateObj);
    const month = row.odhadDateObj.getMonth();
    if (!halfYearMonthBuckets[halfYear]) halfYearMonthBuckets[halfYear] = {};
    if (!halfYearMonthBuckets[halfYear][month]) halfYearMonthBuckets[halfYear][month] = [];
    halfYearMonthBuckets[halfYear][month].push(row);
  });
  // Vygenerovat pole pololetí od aktuálního data
  function getCurrentHalfYearLabels(buckets) {
    const today = new Date();
    const startYear = today.getFullYear();
    const startMonth = today.getMonth();
    let startHalf = startMonth < 6 ? 1 : 2;
    // Získat všechny roky v datech
    const allYears = Array.from(new Set(Object.keys(buckets).map(label => label.match(/\d{4}/)?.[0]))).map(Number).sort((a,b)=>a-b);
    // Najít nejvyšší rok v datech
    const maxYear = Math.max(...allYears);
    const labels = [];
    let year = startYear;
    let half = startHalf;
    while (year <= maxYear) {
      const label = `${half}. pol ${year}`;
      if (buckets[label]) labels.push(label);
      if (half === 1) half = 2;
      else { half = 1; year++; }
    }
    return labels;
  }
  const labels = getCurrentHalfYearLabels(halfYearMonthBuckets);
  // Plugin to draw total vehicle count above each column
  const totalCountLabelPlugin = {
    id: 'totalCountLabel',
    afterDraw: chart => {
      const { ctx, scales } = chart;
      if (!scales.x || !scales.y) return;
      labels.forEach((halfYear, idx) => {
        let total = 0;
        const months = halfYearMonthBuckets[halfYear] || {};
        Object.values(months).forEach(arr => { total += arr.length; });
        // Calculate the top of the stacked bar for this column
        let stackSum = 0;
        chart.data.datasets.forEach(ds => {
          stackSum += ds.data[idx] || 0;
        });
        // Get y position for the top of the stack
        const topY = scales.y.getPixelForValue(stackSum);
        // Get x position for the center of the bar group
        const x = scales.x.getPixelForValue(idx);
        // Draw label just above the top of the stack
        const y = topY - 8;
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1976d2';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.85;
        ctx.fillText(total, x, y);
        ctx.restore();
      });
    }
  };
  // Plugin to draw count inside each colored bar segment
  const segmentLabelPlugin = {
    id: 'segmentLabel',
    afterDraw: chart => {
      const { ctx } = chart;
      chart.data.datasets.forEach((ds, dsIdx) => {
        const meta = chart.getDatasetMeta(dsIdx);
        meta.data.forEach((bar, barIdx) => {
          const value = ds.data[barIdx];
          if (!value || value === 0) return;
          const { x, y, height, width } = bar.getProps(['x', 'y', 'height', 'width']);
          // Only show label if segment is tall enough (min 16px)
          if (height < 16) return;
          ctx.save();
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.9;
          ctx.fillText(value, x, y + height / 2);
          ctx.restore();
        });
      });
    }
  };
  // Pro každý měsíc v rámci pololetí vytvořit dataset
  const monthColors = [
    '#1976d2', '#388e3c', '#fbc02d', '#d84315', '#8e24aa', '#00838f',
    '#43a047', '#ff9800', '#e53935', '#00897b', '#6d4c41', '#7e57c2'
  ];
  const datasets = [];
  for (let m = 0; m < 12; m++) {
    const data = labels.map(halfYear => {
      return halfYearMonthBuckets[halfYear][m] ? halfYearMonthBuckets[halfYear][m].length : 0;
    });
    datasets.push({
      label: `${m+1}. měsíc`,
      data,
      backgroundColor: monthColors[m % monthColors.length],
      stack: 'months',
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    });
  }
  // Tooltip: měsíc/rok, počet aut, seznam aut (SPZ, TYP, ZKL) zalomený na nové řádky
  const tooltipCallbacks = {
    title: function (context) {
      // context[0].label = pololetí, context[0].datasetIndex = měsíc
      const halfYear = context[0].label;
      const monthIdx = context[0].datasetIndex;
      const rows = halfYearMonthBuckets[halfYear][monthIdx] || [];
      let monthYear = '';
      if (rows.length > 0 && rows[0].odhadDateObj) {
        const d = rows[0].odhadDateObj;
        monthYear = `${d.getMonth()+1}.${d.getFullYear()}`;
      }
      // Align: date left, count right (pad to 30 chars)
      const countStr = `${rows.length} vozidel`;
      const padLen = Math.max(0, 30 - (monthYear.length + countStr.length));
      let header = `${monthYear}${' '.repeat(padLen)}${countStr}`;
      return header;
    },
    label: function (context) {
      const halfYear = context.label;
      const monthIdx = context.datasetIndex;
      const rows = halfYearMonthBuckets[halfYear][monthIdx] || [];
      if (rows.length === 0) return '';
      // Each vehicle on its own line, plain string
      return rows.map(v => {
        const popis = v.popis || v.zkl || 'Bez popisu';
        return `${v.spz} ${v.typ} ${popis}`;
      });
    }
  };

  // ...existing code...

  // Handle click on bar
  const handleChartClick = e => {
    if (!onChartFilter) return;
    const chart = chartRef.current;
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
    if (points.length) {
      const { datasetIndex, index } = points[0];
      const halfYear = labels[index];
      const monthIdx = datasetIndex;
      const rows = halfYearMonthBuckets[halfYear][monthIdx] || [];
      const carids = rows.map(v => v.carid || v.w_carid).filter(Boolean);
      if (carids.length > 0) onChartFilter(carids);
    }
  };

  return (
    <>
      <div className="fleet250k-gantt-container">
        <ChartFullscreenWrapper
          title="Predikce dosažení 250 000 km"
          extraButtons={onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="chart-fs-btn"
              title="Aktualizovat data z WebDispečinku (stáhne nová KM data za poslední 3 měsíce)"
            >
              <FiRefreshCw className={loading ? 'fleet250k-spin' : ''} />
            </button>
          ) : null}
        >
        {(isFs) => (
        <div style={{display:'flex', flexDirection:'column', width:'100%', height: isFs ? 'calc(100vh - 140px)' : undefined}}>
          {/* Only render chart and button if visible (controlled by parent) */}
          {typeof stats !== 'undefined' && stats && stats.results && stats.results.length > 0 && (
            <>
              {/* Row above columns: total vehicle count per half-year */}
              <div style={{ height: isFs ? '100%' : '450px', flex: isFs ? 1 : undefined }}>
                <ReactChart
                  ref={chartRef}
                  type="bar"
                  data={{
                    labels,
                    datasets
                  }}
                  options={{
                    indexAxis: 'x',
                    maintainAspectRatio: false,
                    layout: { padding: { top: 25 } },
                    plugins: {
                      legend: { display: true },
                      tooltip: {
                        callbacks: tooltipCallbacks,
                        titleColor: '#1976d2',
                        titleFont: { weight: 'bold', size: 15 },
                      }
                    },
                    scales: {
                      x: {
                        title: { display: true, text: 'Rok / Pololetí' },
                        stacked: true,
                        ticks: {
                          display: true,
                          callback: function(value, index, values) {
                            // value je index, labels je pole pololetí
                            return labels[index] || value;
                          }
                        },
                      },
                      y: {
                        title: { display: true, text: 'Počet aut' },
                        stacked: true,
                        beginAtZero: true
                      }
                    }
                  }}
                  plugins={[totalCountLabelPlugin, segmentLabelPlugin]}
                  onClick={handleChartClick}
                />
              </div>
              {/* Clear filter button directly below chart, left aligned, with icon */}
              {!isFs && chartCarids && chartCarids.length > 0 && onClearChartFilter && (
                <div className="fleet250k-clearfilter-wrapper" style={{justifyContent:'flex-start', marginTop:'0.7em'}}>
                  <button
                    onClick={onClearChartFilter}
                    className="fleet250k-clearfilter-btn"
                    style={{fontSize:'0.95em', padding:'0.35em 1.1em'}}
                  >
                    Zrušit filtr vozidel z grafu
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        )}
        </ChartFullscreenWrapper>
      </div>
    </>
  );
}
