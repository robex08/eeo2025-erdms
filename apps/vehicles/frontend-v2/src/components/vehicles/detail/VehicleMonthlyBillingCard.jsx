import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchVehicleMonthlyBilling } from '../../../services/apiClient';
import SyncGate from '../SyncGate';

function getNowPeriod() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function getAvailableMonths(selectedYear) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (selectedYear < currentYear) {
    return Array.from({ length: 12 }, (_, index) => ({
      value: index + 1,
      label: `${index + 1}. ${selectedYear}`,
    }));
  }
  
  if (selectedYear === currentYear) {
    return Array.from({ length: currentMonth }, (_, index) => ({
      value: index + 1,
      label: `${index + 1}. ${selectedYear}`,
    }));
  }
  
  return [{
    value: 1,
    label: `1. ${selectedYear}`,
  }];
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCzk(value) {
  return `${formatNumber(value).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
}

function formatLiters(value) {
  return `${formatNumber(value).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} l`;
}

function formatKm(value) {
  return `${formatNumber(value).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

function formatCardExpiration(value) {
  const normalized = String(value || '').trim();
  if (normalized === '') {
    return 'Neuvedeno ve WebDispečinku';
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }

  return date.toLocaleDateString('cs-CZ');
}

export default function VehicleMonthlyBillingCard({ vehicleId, carName }) {
  const now = useMemo(() => getNowPeriod(), []);
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);
  const [enabled, setEnabled] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [billing, setBilling] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled || !Number.isFinite(vehicleId) || vehicleId <= 0) {
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    setNotice('');

    fetchVehicleMonthlyBilling(vehicleId, { year, month })
      .then((response) => {
        if (requestRef.current !== requestId) {
          return;
        }

        setPeriodLabel(String(response?.data?.period || ''));
        setNotice(String(response?.data?.notice || ''));
        setBilling(response?.data?.item || null);
      })
      .catch((apiError) => {
        if (requestRef.current !== requestId) {
          return;
        }

        const message = String(apiError?.response?.data?.error?.message || apiError?.message || '').trim();
        setError(message !== '' ? message : 'Vyúčtování se nepodařilo načíst.');
        setBilling(null);
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [enabled, vehicleId, year, month, refreshToken]);

  const safe = {
    driverName: String(billing?.driver_name || '').trim(),
    driverPersonalNumber: String(billing?.driver_personal_number || '').trim(),
    business: formatNumber(billing?.km_business),
    private: formatNumber(billing?.km_private),
    total: formatNumber(billing?.km_total),
    avg: formatNumber(billing?.avg_consumption),
    costs: formatNumber(billing?.total_costs_czk),
    costsBusiness: formatNumber(billing?.costs_business_czk),
    costsPrivate: formatNumber(billing?.costs_private_czk),
    fuelStart: formatNumber(billing?.fuel_start_l),
    fuelEnd: formatNumber(billing?.fuel_end_l),
    fuelDraw: formatNumber(billing?.fuel_draw_l),
    fuelDrawCost: formatNumber(billing?.fuel_draw_cost_czk),
    paidByDriver: formatNumber(billing?.paid_by_driver_czk),
    avgFuelPrice: formatNumber(billing?.avg_fuel_price_czk_l),
    totalConsumption: formatNumber(billing?.total_consumption_l),
    amortization: formatNumber(billing?.amortization_czk),
    reimbursement: formatNumber(billing?.driver_reimbursement_czk),
    ccsCardNumber: String(billing?.ccs_card_number || '').trim(),
    ccsCardExpiration: String(billing?.ccs_card_expiration || '').trim(),
  };

  const businessPct = safe.total > 0 ? Math.max(0, Math.min(100, (safe.business / safe.total) * 100)) : 0;

  return (
    <section className="vehicle-detail-drawer-block vehicle-billing-card">
      <div className="vehicle-billing-head">
        <h4>Měsíční vyúčtování</h4>
        <span className="vehicle-billing-subtitle">WebDispečink API 2.0</span>
      </div>

      <p className="vehicle-billing-note">
        Data se načítají jen pro tuto kartu vozidla, bez plošné synchronizace.
      </p>

      <div className="vehicle-billing-filter-row">
        <label className="overview-filter-label">
          <span>Rok:</span>
          <input
            type="number"
            className="overview-filter-input"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            disabled={loading}
          />
        </label>

        <label className="overview-filter-label">
          <span>Měsíc:</span>
          <select
            className="overview-filter-select"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            disabled={loading}
          >
            {getAvailableMonths(year).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {!enabled ? (
          <button type="button" className="vehicle-billing-load-btn" onClick={() => setEnabled(true)}>
            Načíst vyúčtování
          </button>
        ) : (
          <button type="button" className="vehicle-billing-load-btn" onClick={() => setRefreshToken((previous) => previous + 1)} disabled={loading}>
            Obnovit data
          </button>
        )}
      </div>

      {!enabled ? (
        <div className="vehicle-billing-idle">
          Klikněte na „Načíst vyúčtování“. Vozidlo: <strong>{carName || 'Neznámé vozidlo'}</strong>.
        </div>
      ) : null}

      {loading ? (
        <SyncGate
          syncSeconds={0}
          eyebrow="Načítání vyúčtování"
          title={`Načítám data za ${month}/${year}`}
          description={`Probíhá načítání měsíčního vyúčtování z WebDispečinku pro vozidlo ${carName || 'N/A'}.`}
          showRuntime={false}
          inline={true}
          compact={true}
        />
      ) : null}
      {error ? <div className="status-box status-box-warning">{error}</div> : null}
      {!error && notice ? <div className="status-box status-box-warning">{notice}</div> : null}

      {enabled && !loading && !error && billing ? (
        <div className="vehicle-billing-content">
          <p className="vehicle-billing-period">Období: {periodLabel || `${month}/${year}`}</p>

          <div className="vehicle-billing-ccs">
            <span>Řidič:</span>
            <strong>{safe.driverName !== '' ? safe.driverName : 'Nedostupné v API'}</strong>
          </div>

          <div className="vehicle-billing-ccs">
            <span>Osobní číslo:</span>
            <strong>{safe.driverPersonalNumber !== '' ? safe.driverPersonalNumber : '-'}</strong>
          </div>

          <div className="vehicle-billing-ccs">
            <span>CCS karta:</span>
            <strong>{billing.ccs_card_imported ? 'Nahráno' : 'Čeká na nahrání'}</strong>
          </div>

          <div className="vehicle-billing-ccs">
            <span>Číslo CCS karty:</span>
            <strong>{safe.ccsCardNumber !== '' ? safe.ccsCardNumber : '-'}</strong>
          </div>

          <div className="vehicle-billing-ccs">
            <span>Platnost CCS karty:</span>
            <strong>{formatCardExpiration(safe.ccsCardExpiration)}</strong>
          </div>

          <div className="vehicle-billing-km-head">
            <span>Služební: {safe.business.toLocaleString('cs-CZ')} km</span>
            <span>Soukromé: {safe.private.toLocaleString('cs-CZ')} km</span>
          </div>

          <div className="vehicle-billing-bar" role="presentation" aria-hidden="true">
            <span className="vehicle-billing-bar-fill" style={{ width: `${businessPct}%` }} />
          </div>

          <p className="vehicle-billing-total">Celkem: {safe.total.toLocaleString('cs-CZ')} km</p>

          <div className="vehicle-billing-metrics">
            <article>
              <span>Průměrná spotřeba</span>
              <strong>{safe.avg.toFixed(2)} l/100 km</strong>
            </article>
            <article>
              <span>Úhrada řidiči</span>
              <strong>{formatCzk(safe.reimbursement)}</strong>
            </article>
            <article>
              <span>Náklad celkem</span>
              <strong>{formatCzk(safe.costs)}</strong>
            </article>
          </div>

          <details className="vehicle-billing-details">
            <summary>Detail vyúčtování</summary>
            <div className="vehicle-billing-lines" role="list" aria-label="Vyúčtování soukromých jízd">
              <p role="listitem"><span>Počet ujetých kilometrů celkem</span><strong>{formatKm(safe.total)}</strong></p>
              <p role="listitem"><span>Z toho služební km</span><strong>{formatKm(safe.business)}</strong></p>
              <p role="listitem"><span>Z toho soukromé km</span><strong>{formatKm(safe.private)}</strong></p>
              <p role="listitem"><span>Náklad celkem</span><strong>{formatCzk(safe.costs)}</strong></p>
              <p role="listitem"><span>Náklad služební (poměr)</span><strong>{formatCzk(safe.costsBusiness)}</strong></p>
              <p role="listitem"><span>Náklad soukromé (poměr)</span><strong>{formatCzk(safe.costsPrivate)}</strong></p>
              <p role="listitem"><span>Počáteční stav PHM</span><strong>{formatLiters(safe.fuelStart)}</strong></p>
              <p role="listitem"><span>Konečný stav PHM</span><strong>{formatLiters(safe.fuelEnd)}</strong></p>
              <p role="listitem"><span>Čerpání PHM</span><strong>{formatLiters(safe.fuelDraw)}</strong></p>
              <p role="listitem"><span>Čerpání PHM (Kč)</span><strong>{formatCzk(safe.fuelDrawCost)}</strong></p>
              <p role="listitem"><span>Odpočet za platbu z vlastních prostředků</span><strong>{formatCzk(safe.paidByDriver)}</strong></p>
              <p role="listitem"><span>Průměrná cena PHM</span><strong>{formatCzk(safe.avgFuelPrice).replace(' Kč', ' Kč/l')}</strong></p>
              <p role="listitem"><span>Celková spotřeba PHM</span><strong>{formatLiters(safe.totalConsumption)}</strong></p>
              <p role="listitem"><span>Průměrná spotřeba PHM</span><strong>{safe.avg.toFixed(2)} l/100 km</strong></p>
              <p role="listitem"><span>Amortizace</span><strong>{formatCzk(safe.amortization)}</strong></p>
              <p role="listitem"><span>K úhradě řidiči</span><strong>{formatCzk(safe.reimbursement)}</strong></p>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}