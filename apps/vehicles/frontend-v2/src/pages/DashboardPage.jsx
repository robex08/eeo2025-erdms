import { useEffect, useState } from 'react';
import { fetchDashboardMetrics, fetchFleetForecast, refreshFleetForecast } from '../services/apiClient';
import AppIcon from '../components/ui/AppIcon';

const PIE_COLORS = ['#d9dce3', '#ede8d2', '#f0deab', '#f7c94a', '#f59e0b', '#ea580c', '#c2410c', '#9a3412'];
const FORECAST_MONTH_COLORS = ['#1976d2', '#388e3c', '#fbc02d', '#d84315', '#8e24aa', '#00838f', '#43a047', '#ff9800', '#e53935', '#00897b', '#6d4c41', '#7e57c2'];

function toChartRows(items = []) {
  const rows = Array.isArray(items) ? items : [];
  const max = rows.reduce((acc, row) => Math.max(acc, Number(row?.value || 0)), 0);

  return rows.map((row) => ({
    label: row?.label || 'Neznámé',
    value: Number(row?.value || 0),
    width: max > 0 ? Math.max(8, Math.round((Number(row?.value || 0) / max) * 100)) : 8,
  }));
}

function formatMileageLabel(label) {
  const normalized = String(label || '').trim();
  const mileageLabels = {
    '0K': '0 km',
    '100K': '100 000 km+',
    '200K': '200 000 km+',
    '250K': '250 000 km+',
    '300K': '300 000 km+',
    '400K': '400 000 km+',
    '500K+': '500 000 km+',
  };

  return mileageLabels[normalized] || normalized;
}

function ChartCard({ title, subtitle, rows }) {
  return (
    <article className="info-card dashboard-chart-card">
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>

      <div className="dashboard-chart-list">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div className="dashboard-chart-row" key={row.label}>
              <div className="dashboard-chart-label" title={row.label}>
                {row.label}
              </div>
              <div className="dashboard-chart-track" role="img" aria-label={`${row.label}: ${row.value}`}>
                <span className="dashboard-chart-fill" style={{ width: `${row.width}%` }} />
              </div>
              <div className="dashboard-chart-value">{row.value}</div>
            </div>
          ))
        ) : (
          <p className="muted">Data zatím nejsou k dispozici.</p>
        )}
      </div>
    </article>
  );
}

function PieChartCard({ title, subtitle, rows }) {
  const positiveRows = rows.filter((row) => row.value > 0);
  const total = positiveRows.reduce((sum, row) => sum + row.value, 0);

  let cursor = 0;
  const segments = positiveRows.map((row, index) => {
    const start = cursor;
    const portion = total > 0 ? (row.value / total) * 100 : 0;
    cursor += portion;

    return {
      ...row,
      start,
      end: cursor,
      color: PIE_COLORS[index % PIE_COLORS.length],
    };
  });

  function polarToCartesian(cx, cy, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  }

  function describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
    const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', outerStart.x, outerStart.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
      'L', innerStart.x, innerStart.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerEnd.x, innerEnd.y,
      'Z',
    ].join(' ');
  }

  const svgSlices = segments.map((segment) => {
    const startAngle = (segment.start / 100) * 360;
    const endAngle = (segment.end / 100) * 360;
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = 34;
    const labelPoint = polarToCartesian(50, 50, labelRadius, midAngle);

    return {
      ...segment,
      displayLabel: formatMileageLabel(segment.label),
      path: describeDonutSlice(50, 50, 46, 21, startAngle, endAngle),
      labelX: labelPoint.x,
      labelY: labelPoint.y,
    };
  });

  return (
    <article className="info-card dashboard-chart-card">
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>

      <div className="dashboard-pie-layout">
        <div className="dashboard-pie-chart" role="img" aria-label={title}>
          <svg className="dashboard-pie-svg" viewBox="0 0 100 100" aria-hidden="true">
            {svgSlices.length > 0 ? (
              svgSlices.map((segment) => (
                <g key={segment.label}>
                  <path className="dashboard-pie-slice" d={segment.path} fill={segment.color} stroke="var(--surface)" strokeWidth="1.2">
                    <title>{`${segment.displayLabel}: ${segment.value} vozidel`}</title>
                  </path>
                  <text className="dashboard-pie-slice-label" x={segment.labelX} y={segment.labelY} textAnchor="middle" dominantBaseline="middle">
                    {segment.value}
                  </text>
                </g>
              ))
            ) : null}
          </svg>
          <div className="dashboard-pie-center">
            <strong>{total}</strong>
            <span>vozidel</span>
          </div>
        </div>

        <div className="dashboard-pie-legend">
          {segments.length > 0 ? (
            segments.map((segment) => (
              <div className="dashboard-pie-legend-row" key={segment.label} title={`${segment.displayLabel}: ${segment.value} vozidel`}>
                <span className="dashboard-pie-dot" style={{ background: segment.color }} aria-hidden="true" />
                <span className="dashboard-pie-label" title={`${segment.displayLabel}: ${segment.value} vozidel`}>
                  <span className="dashboard-pie-label-short">{segment.label}</span>
                  <span className="dashboard-pie-label-full">{segment.displayLabel}</span>
                </span>
              </div>
            ))
          ) : (
            <p className="muted">Data zatím nejsou k dispozici.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function FleetForecastCard({ data, months, statusFilter, onMonthsChange, onStatusChange, loading, refreshing, onRefresh }) {
  const chart = Array.isArray(data?.chart) ? data.chart : [];
  const labels = chart.map((item) => item.label);
  const maxTotal = chart.reduce((acc, item) => Math.max(acc, Number(item?.total || 0)), 0);
  const summary = data?.summary || { within10Years: 0, withData: 0 };
  const updatedAt = data?.updatedAt || null;
  const updatedAgeDays = Number.isFinite(Number(data?.updatedAgeDays)) ? Number(data?.updatedAgeDays) : null;
  const isStale = Boolean(data?.isDataOlderThanMonth);
  const hasAnyData = summary.withData > 0 && chart.length > 0;
  const showLoadingGate = loading || refreshing;

  function getSegmentCount(item, monthIndex) {
    const segments = Array.isArray(item?.segments) ? item.segments : [];
    const found = segments.find((segment) => Number(segment?.monthIndex) === monthIndex);
    return Number(found?.count || 0);
  }

  function buildSegmentHeights(total, counts) {
    if (total <= 0) {
      return counts.map(() => 0);
    }

    const raw = counts.map((count) => (count / total) * 100);
    const floored = raw.map((value) => Math.floor(value));
    let used = floored.reduce((sum, value) => sum + value, 0);
    const remainderOrder = raw
      .map((value, index) => ({ index, frac: value - Math.floor(value) }))
      .sort((a, b) => b.frac - a.frac);

    let cursor = 0;
    while (used < 100 && remainderOrder.length > 0) {
      floored[remainderOrder[cursor % remainderOrder.length].index] += 1;
      used += 1;
      cursor += 1;
    }

    return floored;
  }

  return (
    <article className="info-card dashboard-forecast-card">
      <div className="dashboard-forecast-head">
        <h3>Statistika vozidel do 250 000 km</h3>
        <div className="dashboard-forecast-controls">
          <label>
            Průměr:
            <select value={months} onChange={(event) => onMonthsChange(Number(event.target.value))} disabled={loading}>
              <option value={3}>3 měsíce</option>
              <option value={5}>5 měsíců</option>
            </select>
          </label>
          <label>
            Stav:
            <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)} disabled={loading}>
              <option value="aktivni">Jen aktivní</option>
              <option value="all">Všechna vozidla</option>
              <option value="vyrazene">Jen vyřazená</option>
              <option value="neaktivni">Jen neaktivní</option>
            </select>
          </label>
          <button
            type="button"
            className="icon-action-btn icon-action-btn-primary dashboard-forecast-refresh-btn"
            onClick={onRefresh}
            disabled={loading || refreshing}
            title={refreshing ? 'Aktualizace dat z WebDispečinku probíhá' : 'Načíst data z WebDispečinku pro zvolený průměr'}
            aria-label={refreshing ? 'Aktualizace dat z WebDispečinku probíhá' : 'Načíst data z WebDispečinku pro zvolený průměr'}
          >
            <AppIcon name="sync" size={18} weight="duotone" />
          </button>
        </div>
      </div>

      <p className="muted dashboard-forecast-subtitle">
        Počet vozidel pod 250 000 km a do 10 let jejich dosažení: <strong>{summary.within10Years} ks</strong>
      </p>
      {updatedAt ? <p className="muted dashboard-forecast-updated">Aktualizováno: {updatedAt}</p> : null}
      {isStale && updatedAgeDays !== null ? (
        <p className="dashboard-forecast-warning">Data jsou {updatedAgeDays} dní stará. Pro přesnost je potřeba provést aktualizaci.</p>
      ) : null}

      <div className="dashboard-forecast-stage">
        {hasAnyData ? (
          <div className="dashboard-forecast-chart" role="img" aria-label="Predikce dosažení 250 000 km">
            <div className="dashboard-forecast-grid">
              {labels.map((label, index) => {
                const total = Number(chart[index]?.total || 0);
                const heightPercent = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                const monthCounts = Array.from({ length: 12 }).map((_, monthIndex) => getSegmentCount(chart[index], monthIndex));
                const segmentHeights = buildSegmentHeights(total, monthCounts);

                return (
                  <div className="dashboard-forecast-column" key={label}>
                    <div className="dashboard-forecast-total">{total}</div>
                    <div className="dashboard-forecast-stack" style={{ height: `${heightPercent}%` }}>
                      {Array.from({ length: 12 }).map((_, monthIndex) => {
                        const count = monthCounts[monthIndex];
                        if (count <= 0) {
                          return null;
                        }

                        const segmentPercent = segmentHeights[monthIndex];
                        return (
                          <div
                            key={`${label}-${monthIndex}`}
                            className="dashboard-forecast-segment"
                            style={{
                              flex: `${segmentPercent} 0 0`,
                              background: FORECAST_MONTH_COLORS[monthIndex % FORECAST_MONTH_COLORS.length],
                            }}
                            title={`${monthIndex + 1}. měsíc: ${count} vozidel`}
                          >
                            {count}
                          </div>
                        );
                      })}
                    </div>
                    <div className="dashboard-forecast-label">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !showLoadingGate && <p className="dashboard-forecast-empty">Nejsou k dispozici žádná data. Použijte ikonu synchronizace.</p>
        )}

        {showLoadingGate ? (
          <div className="dashboard-forecast-loading-gate" role="status" aria-live="polite">
            <span className="dashboard-forecast-loading-spinner" aria-hidden="true" />
            <span>{refreshing ? 'Probíhá načítání dat z WebDispečinku…' : 'Načítám predikci nájezdů…'}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(3);
  const [forecastStatus, setForecastStatus] = useState('aktivni');
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastRefreshing, setForecastRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardMetrics()
      .then((metricsResponse) => {
        setMetrics(metricsResponse?.data || null);
      })
      .catch(() => {
        setMetrics({
          summary: {
            total: 0,
            active: 0,
            retired: 0,
            inactive: 0,
            unknown: 0,
          },
          fuelDistribution: [],
          typeDistribution: [],
          groupDistribution: [],
          stationDistribution: [],
          mileageDistribution: [],
        });
      });
  }, []);

  useEffect(() => {
    setForecastLoading(true);
    fetchFleetForecast({ months: forecastMonths, status: forecastStatus })
      .then((response) => {
        setForecast(response?.data || null);
      })
      .catch(() => {
        setForecast(null);
      })
      .finally(() => {
        setForecastLoading(false);
      });
  }, [forecastMonths, forecastStatus]);

  async function handleForecastRefresh() {
    setForecastRefreshing(true);
    try {
      await refreshFleetForecast(forecastMonths);
      const response = await fetchFleetForecast({ months: forecastMonths, status: forecastStatus });
      setForecast(response?.data || null);
    } catch {
      // keep existing chart state, empty message will remain visible if no data
    } finally {
      setForecastRefreshing(false);
    }
  }

  const summary = metrics?.summary || {
    total: 0,
    active: 0,
    retired: 0,
    inactive: 0,
    unknown: 0,
  };

  const tileData = [
    { label: 'Celkem vozidel', value: summary.total, tone: 'neutral' },
    { label: 'Aktivních', value: summary.active, tone: 'active' },
    { label: 'Vyřazených', value: summary.retired, tone: 'retired' },
    { label: 'Neaktivních', value: summary.inactive, tone: 'inactive' },
  ];

  const fuelRows = toChartRows(metrics?.fuelDistribution);
  const typeRows = toChartRows(metrics?.typeDistribution);
  const groupRows = toChartRows(metrics?.groupDistribution || metrics?.stationDistribution);
  const mileageRows = toChartRows(metrics?.mileageDistribution);

  return (
    <section>
      <h2>Operační dashboard vozidel</h2>
      <p className="muted">Klíčové metriky flotily a grafický přehled nad daty.</p>

      <div className="cards-grid dashboard-stats-grid">
        {tileData.map((tile) => (
          <article className={`info-card dashboard-stat-card dashboard-stat-card-${tile.tone}`} key={tile.label}>
            <p className="dashboard-stat-label">{tile.label}</p>
            <p className="dashboard-stat-value">{tile.value}</p>
          </article>
        ))}
      </div>

      <div className="cards-grid">
        <ChartCard title="Rozložení dle PHM" subtitle="Nafta, benzin a alternativní pohony" rows={fuelRows} />
        <ChartCard title="Rozložení dle typu" subtitle="Kategorie ZZS typu vozidla" rows={typeRows} />
        <ChartCard title="Rozložení dle okresních skupin" subtitle="Skupiny z tabulky cars_group ve WebDispečinku" rows={groupRows} />
      </div>

      <div className="cards-grid">
        <PieChartCard title="Nájezdy (měsíční pásma)" subtitle="Koláčový přehled měsíčních kilometrů" rows={mileageRows} />
      </div>

      <div className="cards-grid">
        <FleetForecastCard
          data={forecast}
          months={forecastMonths}
          statusFilter={forecastStatus}
          onMonthsChange={setForecastMonths}
          onStatusChange={setForecastStatus}
          loading={forecastLoading}
          refreshing={forecastRefreshing}
          onRefresh={handleForecastRefresh}
        />
      </div>
    </section>
  );
}
