import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardMetrics, fetchFleetForecast, refreshFleetForecast, triggerQuickSync } from '../services/apiClient';
import AppIcon from '../components/ui/AppIcon';
import SyncGate from '../components/vehicles/SyncGate';

const DASHBOARD_SETTINGS_KEY = 'vehicles_v2_dashboard_settings';

const PIE_COLORS = ['#d9dce3', '#ede8d2', '#f0deab', '#f7c94a', '#f59e0b', '#ea580c', '#c2410c', '#9a3412'];
const FORECAST_MONTH_COLORS = ['#1976d2', '#388e3c', '#fbc02d', '#d84315', '#8e24aa', '#00838f', '#43a047', '#ff9800', '#e53935', '#00897b', '#6d4c41', '#7e57c2'];
const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

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

function formatDateTimeCs(value) {
  if (!value) {
    return 'Neznámé';
  }

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeForecastType(rawType) {
  const value = String(rawType || '').trim();
  if (
    value === ''
    || value === '--'
    || value.toLowerCase() === 'null'
    || value.toLowerCase() === '-- prazdne'
    || value.toLowerCase() === '-- prázdné'
    || value.toLowerCase() === 'prazdne'
    || value.toLowerCase() === 'prázdné'
  ) {
    return 'Nezadáno';
  }

  return value;
}

function extractForecastTypeOptions(forecastData) {
  const chart = Array.isArray(forecastData?.chart) ? forecastData.chart : [];
  const labels = new Set();

  chart.forEach((column) => {
    const segments = Array.isArray(column?.segments) ? column.segments : [];
    segments.forEach((segment) => {
      const cars = Array.isArray(segment?.cars) ? segment.cars : [];
      cars.forEach((car) => {
        labels.add(normalizeForecastType(car?.typ));
      });
    });
  });

  const sortedLabels = Array.from(labels).sort((a, b) => {
    if (a === 'Nezadáno' && b !== 'Nezadáno') {
      return -1;
    }
    if (a !== 'Nezadáno' && b === 'Nezadáno') {
      return 1;
    }
    return a.localeCompare(b, 'cs');
  });

  return sortedLabels;
}

function filterForecastByTypes(forecastData, selectedTypes) {
  if (!forecastData || !Array.isArray(selectedTypes) || selectedTypes.length === 0) {
    return forecastData;
  }

  const chart = Array.isArray(forecastData?.chart) ? forecastData.chart : [];
  const uniqueCars = new Set();
  const selectedSet = new Set(selectedTypes);

  const filteredChart = chart.map((column) => {
    const segments = Array.isArray(column?.segments) ? column.segments : [];
    const filteredSegments = segments.map((segment) => {
      const cars = Array.isArray(segment?.cars) ? segment.cars : [];
      const filteredCars = cars.filter((car) => selectedSet.has(normalizeForecastType(car?.typ)));
      filteredCars.forEach((car) => {
        const carId = Number(car?.carid || 0);
        if (Number.isFinite(carId) && carId > 0) {
          uniqueCars.add(`id:${carId}`);
        } else {
          uniqueCars.add(`spz:${String(car?.spz || '').trim()}`);
        }
      });

      return {
        ...segment,
        count: filteredCars.length,
        cars: filteredCars,
      };
    });

    const total = filteredSegments.reduce((sum, segment) => sum + Number(segment?.count || 0), 0);

    return {
      ...column,
      total,
      segments: filteredSegments,
    };
  });

  const totalVehicles = uniqueCars.size;

  return {
    ...forecastData,
    chart: filteredChart,
    summary: {
      ...(forecastData.summary || {}),
      within10Years: totalVehicles,
      withData: totalVehicles,
    },
  };
}

function selectedLabel(values, fallback) {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.length} vybráno`;
}

function countForecastRowsUnique(forecastData, selectedTypes = [], predicate = null) {
  const rows = Array.isArray(forecastData?.results) ? forecastData.results : [];
  if (rows.length === 0) {
    return 0;
  }

  const typeSet = selectedTypes.length > 0 ? new Set(selectedTypes) : null;
  const unique = new Set();

  rows.forEach((row) => {
    const typeLabel = normalizeForecastType(row?.typ);
    if (typeSet && !typeSet.has(typeLabel)) {
      return;
    }

    const estimate = String(row?.odhadDatum || '').trim();
    if (!/^\d{4}-\d{2}$/.test(estimate)) {
      return;
    }

    const [yearRaw, monthRaw] = estimate.split('-');
    const targetYear = Number(yearRaw);
    const targetMonth = Number(monthRaw);
    if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth)) {
      return;
    }

    if (typeof predicate === 'function' && !predicate({ row, targetYear, targetMonth })) {
      return;
    }

    const carId = Number(row?.carid || 0);
    if (Number.isFinite(carId) && carId > 0) {
      unique.add(`id:${carId}`);
      return;
    }

    const spz = String(row?.spz || '').trim();
    if (spz !== '') {
      unique.add(`spz:${spz}`);
    }
  });

  return unique.size;
}

function countDueTo250kWithinMonths(forecastData, selectedTypes = [], maxMonthsAhead = 2) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  return countForecastRowsUnique(
    forecastData,
    selectedTypes,
    ({ targetYear, targetMonth }) => {
      const monthsDiff = (targetYear - nowYear) * 12 + (targetMonth - nowMonth);
      return monthsDiff >= 0 && monthsDiff <= maxMonthsAhead;
    }
  );
}

function countDueTo250kThisYear(forecastData, selectedTypes = []) {
  const nowYear = new Date().getFullYear();

  return countForecastRowsUnique(
    forecastData,
    selectedTypes,
    ({ targetYear }) => targetYear === nowYear
  );
}

function normalizeOverviewLabel(value) {
  const normalized = String(value || '').trim();
  const normalizedLower = normalized.toLowerCase();
  if (normalized === '' || normalizedLower === 'nezname' || normalizedLower === 'neznámé') {
    return 'Nezadáno';
  }
  return normalized;
}

function ChartCard({ title, subtitle, rows, onRowSelect }) {
  const cardRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  function handleRowEnter(event, row) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = Math.max(12, Math.min(event.clientX - rect.left + 16, rect.width - 260));
    const y = Math.max(10, event.clientY - rect.top - 18);

    setTooltip({
      x,
      y,
      label: row.label,
      value: row.value,
    });
  }

  function handleRowMove(event) {
    if (!tooltip || !cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.max(12, Math.min(event.clientX - rect.left + 16, rect.width - 260));
    const y = Math.max(10, event.clientY - rect.top - 18);

    setTooltip((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        x,
        y,
      };
    });
  }

  function handleRowLeave() {
    setTooltip(null);
  }

  const isInteractive = typeof onRowSelect === 'function';

  return (
    <article className="info-card dashboard-chart-card" ref={cardRef} onMouseLeave={handleRowLeave}>
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>

      <div className="dashboard-chart-list">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              className={`dashboard-chart-row${isInteractive ? ' dashboard-chart-row-clickable' : ''}`}
              key={row.label}
              onMouseEnter={(event) => handleRowEnter(event, row)}
              onMouseMove={handleRowMove}
              onClick={isInteractive ? () => onRowSelect(row) : undefined}
              onKeyDown={isInteractive ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowSelect(row);
                }
              } : undefined}
              role={isInteractive ? 'button' : undefined}
              tabIndex={isInteractive ? 0 : undefined}
            >
              <div className="dashboard-chart-label">
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

      {tooltip ? (
        <div className="dashboard-smart-tooltip" style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }} role="status" aria-live="polite">
          <div className="dashboard-smart-tooltip-head">
            <span className="dashboard-smart-tooltip-dot" aria-hidden="true" />
            <strong>{tooltip.label}</strong>
          </div>
          <div className="dashboard-smart-tooltip-value">{tooltip.value} vozidel</div>
          <div className="dashboard-smart-tooltip-meta">Kategorie v aktuálním přehledu</div>
        </div>
      ) : null}
    </article>
  );
}

function PieChartCard({ title, subtitle, rows, compactLegend = false, onSegmentSelect }) {
  const cardRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
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
      percentage: total > 0 ? Math.round((segment.value / total) * 1000) / 10 : 0,
    };
  });

  function handleSegmentEnter(event, segment) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = Math.max(12, Math.min(event.clientX - rect.left + 16, rect.width - 280));
    const y = Math.max(10, event.clientY - rect.top - 18);

    setTooltip({
      x,
      y,
      color: segment.color,
      label: segment.displayLabel,
      shortLabel: segment.label,
      value: segment.value,
      percentage: segment.percentage,
    });
  }

  function handleSegmentMove(event) {
    if (!tooltip || !cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.max(12, Math.min(event.clientX - rect.left + 16, rect.width - 280));
    const y = Math.max(10, event.clientY - rect.top - 18);

    setTooltip((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        x,
        y,
      };
    });
  }

  function handleSegmentLeave() {
    setTooltip(null);
  }

  const isInteractive = typeof onSegmentSelect === 'function';

  return (
    <article className="info-card dashboard-chart-card" ref={cardRef} onMouseLeave={handleSegmentLeave}>
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>

      <div className="dashboard-pie-layout">
        <div className="dashboard-pie-chart" role="img" aria-label={title}>
          <svg className="dashboard-pie-svg" viewBox="0 0 100 100" aria-hidden="true">
            {svgSlices.length > 0 ? (
              svgSlices.map((segment) => (
                <g key={segment.label}>
                  <path
                    className="dashboard-pie-slice"
                    d={segment.path}
                    fill={segment.color}
                    stroke="var(--surface)"
                    strokeWidth="1.2"
                    onMouseEnter={(event) => handleSegmentEnter(event, segment)}
                    onMouseMove={handleSegmentMove}
                    onClick={isInteractive ? () => onSegmentSelect(segment) : undefined}
                    style={isInteractive ? { cursor: 'pointer' } : undefined}
                  />
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
              <div
                className={`dashboard-pie-legend-row${compactLegend ? ' dashboard-pie-legend-row-compact' : ''}`}
                key={segment.label}
              >
                <span className="dashboard-pie-dot" style={{ background: segment.color }} aria-hidden="true" />
                <span className="dashboard-pie-label">
                  <span className="dashboard-pie-label-short">{compactLegend ? `${segment.label} (${segment.value})` : segment.label}</span>
                  {!compactLegend ? <span className="dashboard-pie-label-full">{segment.displayLabel}</span> : null}
                </span>
                {!compactLegend ? (
                  <span className="dashboard-pie-legend-count" aria-label={`Počet vozidel: ${segment.value}`}>
                    {segment.value}
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <p className="muted">Data zatím nejsou k dispozici.</p>
          )}
        </div>
      </div>

      {tooltip ? (
        <div
          className="dashboard-smart-tooltip"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, borderColor: tooltip.color }}
          role="status"
          aria-live="polite"
        >
          <div className="dashboard-smart-tooltip-head">
            <span className="dashboard-smart-tooltip-dot" style={{ background: tooltip.color }} aria-hidden="true" />
            <strong>{tooltip.label}</strong>
            <span>{tooltip.shortLabel}</span>
          </div>
          <div className="dashboard-smart-tooltip-value">{tooltip.value} vozidel</div>
          <div className="dashboard-smart-tooltip-meta">Podíl: {tooltip.percentage} %</div>
        </div>
      ) : null}
    </article>
  );
}

function FleetForecastCard({ data, months, selectedTypes, typeOptions, onMonthsChange, onTypeToggle, onTypeClear, loading, refreshing, onRefresh, onSegmentSelect }) {
  const stageRef = useRef(null);
  const typeFilterRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const chart = Array.isArray(data?.chart) ? data.chart : [];
  const labels = chart.map((item) => item.label);
  const maxTotal = chart.reduce((acc, item) => Math.max(acc, Number(item?.total || 0)), 0);
  const summary = data?.summary || { within10Years: 0, withData: 0 };
  const updatedAt = data?.updatedAt || null;
  const updatedAtLabel = formatDateTimeCs(updatedAt);
  const updatedAgeDays = Number.isFinite(Number(data?.updatedAgeDays)) ? Number(data?.updatedAgeDays) : null;
  const isStale = Boolean(data?.isDataOlderThanMonth);
  const usedFallback = Boolean(data?.usedFallback);
  const fallbackMessage = String(data?.fallbackMessage || '').trim();
  const hasAnyData = summary.withData > 0 && chart.length > 0;
  const showLoadingGate = loading || refreshing;

  useEffect(() => {
    if (!showLoadingGate) {
      setLoadingSeconds(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLoadingSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showLoadingGate]);

  useEffect(() => {
    if (!isTypeFilterOpen) {
      return undefined;
    }

    function handleOutsidePointerDown(event) {
      if (!typeFilterRef.current) {
        return;
      }

      if (!typeFilterRef.current.contains(event.target)) {
        setIsTypeFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [isTypeFilterOpen]);

  function getSegment(item, monthIndex) {
    const segments = Array.isArray(item?.segments) ? item.segments : [];
    return segments.find((segment) => Number(segment?.monthIndex) === monthIndex) || null;
  }

  function formatKm(value) {
    const km = Number(value);
    if (!Number.isFinite(km) || km < 0) {
      return '--- km';
    }
    return `${Math.round(km).toLocaleString('cs-CZ')} km`;
  }

  function formatAvgKmPerMonth(value) {
    const avg = Number(value);
    if (!Number.isFinite(avg) || avg <= 0) {
      return 'Ø --- km/měs.';
    }
    return `Ø ${Math.round(avg).toLocaleString('cs-CZ')} km/měs.`;
  }

  function getSegmentCount(item, monthIndex) {
    const segment = getSegment(item, monthIndex);
    return Number(segment?.count || 0);
  }

  function handleSegmentEnter(event, payload) {
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) {
      return;
    }

    const x = Math.max(12, Math.min(event.clientX - stageRect.left + 16, stageRect.width - 320));
    const y = Math.max(10, event.clientY - stageRect.top - 24);

    setTooltip({
      ...payload,
      x,
      y,
    });
  }

  function handleSegmentMove(event) {
    if (!tooltip || !stageRef.current) {
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const x = Math.max(12, Math.min(event.clientX - stageRect.left + 16, stageRect.width - 320));
    const y = Math.max(10, event.clientY - stageRect.top - 24);

    setTooltip((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        x,
        y,
      };
    });
  }

  function handleSegmentLeave() {
    setTooltip(null);
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
          <details
            className="overview-multifilter dashboard-forecast-type-filter"
            ref={typeFilterRef}
            open={isTypeFilterOpen}
            onToggle={(event) => setIsTypeFilterOpen(event.currentTarget.open)}
          >
            <summary>Typ: {selectedLabel(selectedTypes, 'vše')}</summary>
            <div className="overview-multifilter-menu">
              <label className="overview-multifilter-option">
                <input
                  type="checkbox"
                  checked={selectedTypes.length === 0}
                  onChange={onTypeClear}
                  disabled={loading || refreshing}
                />
                <span>Všechny typy</span>
              </label>

              {typeOptions.map((value) => (
                <label key={`forecast-type-${value}`} className="overview-multifilter-option">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(value)}
                    onChange={() => onTypeToggle(value)}
                    disabled={loading || refreshing}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </details>
          <label>
            Průměr:
            <select value={months} onChange={(event) => onMonthsChange(Number(event.target.value))} disabled={loading}>
              <option value={3}>3 měsíce</option>
              <option value={5}>5 měsíců</option>
            </select>
          </label>
          <button
            type="button"
            className="icon-action-btn icon-action-btn-primary dashboard-forecast-refresh-btn"
            onClick={onRefresh}
            disabled={loading || refreshing}
            title={refreshing ? 'Aktualizace dat probíhá' : 'Načíst data pro zvolený průměr'}
            aria-label={refreshing ? 'Aktualizace dat probíhá' : 'Načíst data pro zvolený průměr'}
          >
            <AppIcon name="sync" size={18} weight="duotone" />
          </button>
        </div>
      </div>

      <p className="muted dashboard-forecast-subtitle">
        Počet vozidel pod 250 000 km a do 10 let jejich dosažení: <strong>{summary.within10Years} ks</strong>
      </p>
      {updatedAt ? <p className="muted dashboard-forecast-updated">Aktualizováno: {updatedAtLabel}</p> : null}
      {isStale && updatedAgeDays !== null ? (
        <p className="dashboard-forecast-warning">Data jsou {updatedAgeDays} dní stará. Pro přesnost je potřeba provést aktualizaci.</p>
      ) : null}
      {usedFallback && fallbackMessage !== '' ? (
        <p className="dashboard-forecast-warning">{fallbackMessage}</p>
      ) : null}

      <div className="dashboard-forecast-stage" ref={stageRef} onMouseLeave={handleSegmentLeave}>
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
                    <div className="dashboard-forecast-stack-wrap" style={{ height: '290px' }}>
                      <div className="dashboard-forecast-stack" style={{ height: `${heightPercent}%` }}>
                        {Array.from({ length: 12 }).map((_, monthIndex) => {
                          const count = monthCounts[monthIndex];
                          const segment = getSegment(chart[index], monthIndex);
                          if (count <= 0) {
                            return null;
                          }

                          const segmentPercent = segmentHeights[monthIndex];
                          const cars = Array.isArray(segment?.cars) ? segment.cars : [];
                          const monthName = MONTH_NAMES[monthIndex] || `${monthIndex + 1}. měsíc`;
                          const color = FORECAST_MONTH_COLORS[monthIndex % FORECAST_MONTH_COLORS.length];
                          return (
                            <div
                              key={`${label}-${monthIndex}`}
                              className="dashboard-forecast-segment"
                              style={{
                                flex: `${segmentPercent} 0 0`,
                                background: color,
                              }}
                              role="button"
                              tabIndex={0}
                              onMouseEnter={(event) =>
                                handleSegmentEnter(event, {
                                  color,
                                  halfYearLabel: label,
                                  monthName,
                                  count,
                                  cars,
                                })
                              }
                              onMouseMove={handleSegmentMove}
                              onClick={() => {
                                const carIds = cars.map((car) => Number(car?.carid || 0)).filter((id) => Number.isFinite(id) && id > 0);
                                if (carIds.length > 0 && typeof onSegmentSelect === 'function') {
                                  onSegmentSelect(carIds);
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  const carIds = cars.map((car) => Number(car?.carid || 0)).filter((id) => Number.isFinite(id) && id > 0);
                                  if (carIds.length > 0 && typeof onSegmentSelect === 'function') {
                                    onSegmentSelect(carIds);
                                  }
                                }
                              }}
                            >
                              {count}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="dashboard-forecast-label">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !showLoadingGate && (
            <div className="dashboard-forecast-empty" role="status" aria-live="polite">
              <span className="dashboard-forecast-empty-icon" aria-hidden="true">
                <AppIcon name="vehicles" size={24} weight="duotone" />
              </span>
              <strong>Pro predikci zatím nejsou dostupná data</strong>
              <span>Pro načtení použijte ikonu synchronizace vpravo nahoře.</span>
            </div>
          )
        )}

        {showLoadingGate ? (
          <div className="dashboard-forecast-loading-gate" role="status" aria-live="polite">
            <SyncGate
              inline
              compact
              showRuntime
              syncSeconds={loadingSeconds}
              eyebrow="Aktualizace dat"
              title={refreshing ? 'Průběžně načítám aktuální data' : 'Načítám predikci nájezdů'}
              description={refreshing
                ? 'Prosím vyčkejte. Po dokončení se statistiky automaticky obnoví.'
                : 'Prosím vyčkejte. Připravuji aktuální predikci nájezdů.'}
            />
          </div>
        ) : null}

        {tooltip ? (
          <div
            className="dashboard-forecast-tooltip"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              borderColor: tooltip.color,
            }}
            role="status"
            aria-live="polite"
          >
            <div className="dashboard-forecast-tooltip-head">
              <span className="dashboard-forecast-tooltip-dot" style={{ background: tooltip.color }} aria-hidden="true" />
              <strong>{tooltip.monthName}</strong>
              <span>{tooltip.halfYearLabel}</span>
            </div>
            <div className="dashboard-forecast-tooltip-count">{tooltip.count} vozidel</div>
            <div className="dashboard-forecast-tooltip-list">
              {tooltip.cars.slice(0, 8).map((car) => (
                <div key={`${car.spz}-${car.carid}`} className="dashboard-forecast-tooltip-row">
                  <span className="dashboard-forecast-tooltip-spz">{car.spz || '---'}</span>
                  <span className="dashboard-forecast-tooltip-type">{car.typ || 'Bez typu'} • {formatKm(car.stavKm)} • {formatAvgKmPerMonth(car.prumerZaMesic)}</span>
                  <span className="dashboard-forecast-tooltip-meta">{Number(car.mesicuDo250k || 0)} m</span>
                </div>
              ))}
              {tooltip.cars.length > 8 ? <div className="dashboard-forecast-tooltip-more">+{tooltip.cars.length - 8} dalších</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [forecastRaw, setForecastRaw] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(() => {
    if (typeof window === 'undefined') {
      return 3;
    }

    try {
      const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
      if (!raw) {
        return 3;
      }

      const parsed = JSON.parse(raw);
      const months = Number(parsed?.forecastMonths);
      return months === 5 ? 5 : 3;
    } catch {
      return 3;
    }
  });
  const [forecastStatus, setForecastStatus] = useState(() => {
    if (typeof window === 'undefined') {
      return 'aktivni';
    }

    try {
      const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
      if (!raw) {
        return 'aktivni';
      }

      const parsed = JSON.parse(raw);
      const status = String(parsed?.forecastStatus || 'aktivni').toLowerCase();
      return ['all', 'aktivni', 'vyrazene', 'neaktivni'].includes(status) ? status : 'aktivni';
    } catch {
      return 'aktivni';
    }
  });
  const [forecastTypes, setForecastTypes] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.forecastTypes)) {
        return Array.from(new Set(parsed.forecastTypes.map((value) => String(value || '').trim()).filter((value) => value !== '')));
      }

      const legacyType = String(parsed?.forecastType || '').trim();
      return legacyType ? [legacyType] : [];
    } catch {
      return [];
    }
  });
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastRefreshing, setForecastRefreshing] = useState(false);
  const [dashboardSyncing, setDashboardSyncing] = useState(false);
  const [dashboardSyncSeconds, setDashboardSyncSeconds] = useState(0);
  const [dashboardSyncMessage, setDashboardSyncMessage] = useState('');
  const [dashboardSyncMessageVisible, setDashboardSyncMessageVisible] = useState(false);

  useEffect(() => {
    if (!dashboardSyncing) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setDashboardSyncSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [dashboardSyncing]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(
      DASHBOARD_SETTINGS_KEY,
      JSON.stringify({
        forecastMonths,
        forecastStatus,
        forecastTypes,
      })
    );
  }, [forecastMonths, forecastStatus, forecastTypes]);

  const forecastTypeOptions = useMemo(() => extractForecastTypeOptions(forecastRaw), [forecastRaw]);

  useEffect(() => {
    setForecastTypes((prev) => prev.filter((value) => forecastTypeOptions.includes(value)));
  }, [forecastTypeOptions]);

  const forecast = useMemo(() => filterForecastByTypes(forecastRaw, forecastTypes), [forecastRaw, forecastTypes]);

  function toggleForecastType(typeValue) {
    const normalized = String(typeValue || '').trim();
    if (!normalized) {
      return;
    }

    setForecastTypes((prev) => {
      const set = new Set(prev);
      if (set.has(normalized)) {
        set.delete(normalized);
      } else {
        set.add(normalized);
      }
      return Array.from(set);
    });
  }

  function clearForecastTypes() {
    setForecastTypes([]);
  }

  useEffect(() => {
    fetchDashboardMetrics({ status: forecastStatus })
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
  }, [forecastStatus]);

  useEffect(() => {
    setForecastLoading(true);
    fetchFleetForecast({ months: forecastMonths, status: forecastStatus })
      .then((response) => {
        setForecastRaw(response?.data || null);
      })
      .catch(() => {
        setForecastRaw(null);
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
      setForecastRaw(response?.data || null);
    } catch {
      // keep existing chart state, empty message will remain visible if no data
    } finally {
      setForecastRefreshing(false);
    }
  }

  async function handleDashboardSync() {
    setDashboardSyncMessage('');
    setDashboardSyncMessageVisible(false);
    setDashboardSyncSeconds(0);
    setDashboardSyncing(true);

    try {
      const syncResponse = await triggerQuickSync();
      const [metricsResponse, forecastResponse, summaryResponse] = await Promise.all([
        fetchDashboardMetrics({ status: forecastStatus }),
        fetchFleetForecast({ months: forecastMonths, status: forecastStatus }),
        fetchDashboardMetrics({ status: 'all' }),
      ]);

      const synchronized = Number(syncResponse?.data?.affectedRows || 0);
      const summary = summaryResponse?.data?.summary || {};
      const active = Number(summary?.active || 0);
      const retired = Number(summary?.retired || 0);
      const inactive = Number(summary?.inactive || 0);
      setDashboardSyncMessage(`Synchronizace dat byla úspěšně dokončena. Synchronizováno: ${synchronized}. Aktivní: ${active}, vyřazené: ${retired}, neaktivní: ${inactive}.`);
      setDashboardSyncMessageVisible(true);

      setMetrics(metricsResponse?.data || null);
      setForecastRaw(forecastResponse?.data || null);
    } catch {
      setDashboardSyncMessage('Synchronizace dat na nástěnce se nepodařila.');
      setDashboardSyncMessageVisible(true);
    } finally {
      setDashboardSyncing(false);
    }
  }

  function navigateToOverview(extraParams = {}) {
    const params = new URLSearchParams();
    params.set('status', forecastStatus);
    params.set('page', '1');
    params.set('sortBy', 'spz');
    params.set('sortDir', 'asc');
    params.set('perPage', '25');

    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        params.set(key, String(value));
      }
    });

    navigate(`/vehicles?${params.toString()}`);
  }

  function handleTypeDistributionSelect(row) {
    const label = normalizeOverviewLabel(row?.label);
    navigateToOverview({ types: label });
  }

  function handleGroupDistributionSelect(row) {
    const label = normalizeOverviewLabel(row?.label);
    navigateToOverview({ groups: label });
  }

  function handleFuelDistributionSelect(row) {
    const rawLabel = String(row?.label || '').trim().toLowerCase();

    const fuelMap = {
      nafta: ['nafta', 'nm', 'd'],
      benzin: ['benzin', 'benzin natural', 'b'],
      'benzín': ['benzin', 'benzin natural', 'b'],
      alternativni: ['cng', 'lpg', 'hybrid'],
      'alternativní': ['cng', 'lpg', 'hybrid'],
      elektro: ['ev', 'elektro'],
      nezname: ['Nezadáno'],
      'neznámé': ['Nezadáno'],
    };

    const values = fuelMap[rawLabel] || [normalizeOverviewLabel(row?.label)];
    navigateToOverview({ fuels: values.join(',') });
  }

  function handleMileageDistributionSelect(segment) {
    const band = String(segment?.label || '').trim().toUpperCase();
    if (!band) {
      return;
    }

    navigateToOverview({ mileageBands: band });
  }

  function handleForecastSegmentSelect(carIds) {
    if (!Array.isArray(carIds) || carIds.length === 0) {
      return;
    }

    const uniqueIds = Array.from(new Set(carIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)));
    if (uniqueIds.length === 0) {
      return;
    }

    const params = new URLSearchParams();
    params.set('chartCarids', uniqueIds.join(','));
    params.set('status', forecastStatus);
    params.set('page', '1');
    params.set('sortBy', 'spz');
    params.set('sortDir', 'asc');
    params.set('perPage', '25');
    if (forecastTypes.length > 0) {
      params.set('types', forecastTypes.join(','));
    }
    navigate(`/vehicles?${params.toString()}`);
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
  const dashboardUpdatedAtRaw = metrics?.updatedAt || forecast?.updatedAt || null;
  const dashboardUpdatedAtLabel = formatDateTimeCs(dashboardUpdatedAtRaw);
  const urgent250kCount = countDueTo250kWithinMonths(forecastRaw, forecastTypes, 2);
  const urgent250kThisYearCount = countDueTo250kThisYear(forecastRaw, forecastTypes);

  return (
    <section>
      <div className="dashboard-global-head">
        <div>
          <h2>Operační dashboard vozidel</h2>
          <p className="muted">Klíčové metriky flotily a grafický přehled nad daty.</p>
        </div>
        <div className="dashboard-global-actions">
          <span className={`dashboard-global-alert-pill${urgent250kCount > 0 ? ' is-alert' : ''}`}>
            250k do 2 měsíců: <strong>{urgent250kCount}</strong>
            {' | '}letos celkem: <strong>{urgent250kThisYearCount}</strong>
          </span>

          <span className="dashboard-global-last-update" title={`Poslední aktualizace: ${dashboardUpdatedAtLabel}`}>
            Poslední aktualizace: <strong>{dashboardUpdatedAtLabel}</strong>
          </span>

          <label className="dashboard-global-status">
            Stav:
            <select value={forecastStatus} onChange={(event) => setForecastStatus(event.target.value)}>
              <option value="aktivni">Jen aktivní</option>
              <option value="all">Všechna vozidla</option>
              <option value="vyrazene">Jen vyřazená</option>
              <option value="neaktivni">Jen neaktivní</option>
            </select>
          </label>

          <button
            type="button"
            className="icon-action-btn icon-action-btn-primary dashboard-global-sync-btn"
            onClick={handleDashboardSync}
            disabled={dashboardSyncing || forecastRefreshing || forecastLoading}
            title={dashboardSyncing ? 'Probíhá rychlá aktualizace vozidel' : 'Rychle aktualizovat vozidla'}
            aria-label={dashboardSyncing ? 'Probíhá rychlá aktualizace vozidel' : 'Rychle aktualizovat vozidla'}
          >
            <AppIcon name="sync" size={18} weight="regular" />
          </button>
        </div>
      </div>

      {dashboardSyncing ? (
        <SyncGate
          syncSeconds={dashboardSyncSeconds}
          eyebrow="Aktualizace dat"
          title="Průběžně načítám aktuální data"
          description="Prosím vyčkejte. Po dokončení se seznam vozidel automaticky obnoví."
        />
      ) : null}

      {dashboardSyncMessage && dashboardSyncMessageVisible ? (
        <div className="status-box sync-message-box" role="status" aria-live="polite">
          <span>{dashboardSyncMessage}</span>
          <button
            type="button"
            className="sync-message-close"
            onClick={() => setDashboardSyncMessageVisible(false)}
            aria-label="Skrýt informační hlášku"
            title="Skrýt"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="cards-grid dashboard-stats-grid">
        {tileData.map((tile) => (
          <article className={`info-card dashboard-stat-card dashboard-stat-card-${tile.tone}`} key={tile.label}>
            <p className="dashboard-stat-label">{tile.label}</p>
            <p className="dashboard-stat-value">{tile.value}</p>
          </article>
        ))}
      </div>

      <div className="dashboard-distribution-layout">
        <div className="dashboard-distribution-main">
          <ChartCard
            title="Rozložení dle PHM"
            subtitle="Nafta, benzín a alternativní pohony"
            rows={fuelRows}
            onRowSelect={handleFuelDistributionSelect}
          />
          <div className="dashboard-pie-pair">
            <PieChartCard
              title="Nájezdy (měsíční pásma)"
              subtitle="Koláčový přehled měsíčních kilometrů"
              rows={mileageRows}
              compactLegend
              onSegmentSelect={handleMileageDistributionSelect}
            />
            <PieChartCard
              title="Rozložení dle typu"
              subtitle="Koláčový přehled kategorií typu vozidla"
              rows={typeRows}
              compactLegend
              onSegmentSelect={handleTypeDistributionSelect}
            />
          </div>
        </div>
        <div className="dashboard-distribution-lists">
          <ChartCard
            title="Rozložení dle typu"
            subtitle="Kategorie ZZS typu vozidla"
            rows={typeRows}
            onRowSelect={handleTypeDistributionSelect}
          />
          <ChartCard
            title="Rozložení dle skupin"
            subtitle="Přehled rozložení vozidel podle skupin"
            rows={groupRows}
            onRowSelect={handleGroupDistributionSelect}
          />
        </div>
      </div>

      <div className="cards-grid">
        <FleetForecastCard
          data={forecast}
          months={forecastMonths}
          selectedTypes={forecastTypes}
          typeOptions={forecastTypeOptions}
          onMonthsChange={setForecastMonths}
          onTypeToggle={toggleForecastType}
          onTypeClear={clearForecastTypes}
          loading={forecastLoading}
          refreshing={forecastRefreshing}
          onRefresh={handleForecastRefresh}
          onSegmentSelect={handleForecastSegmentSelect}
        />
      </div>
    </section>
  );
}
