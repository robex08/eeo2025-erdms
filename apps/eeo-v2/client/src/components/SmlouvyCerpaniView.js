/**
 * SmlouvyCerpaniView
 * 
 * Přehled čerpání smluv ve stylu jezevčík progress baru (stejný jako LimitovanePrislibyManager).
 * Zobrazuje smlouvy s: Limit / Vyčerpáno / Zbývá / Čerpání (progress bar) / Stav
 *
 * Pole ze smlouvy:
 *   cislo_smlouvy, nazev_smlouvy, nazev_firmy, ico, usek_zkr
 *   platnost_od, platnost_do
 *   hodnota_s_dph   → limit
 *   cerpano_celkem  → vyčerpáno
 *   procento_cerpani
 *   zbyva
 *   stav, aktivni
 */

import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSyncAlt, faSearch, faTimes, faCheckCircle, faTriangleExclamation,
  faTimesCircle, faFilter, faFileContract
} from '@fortawesome/free-solid-svg-icons';
import { getSmlouvyList, STAV_SMLOUVY_OPTIONS, getStavSmlouvyConfig } from '../services/apiSmlouvy';
import { AuthContext } from '../context/AuthContext';

// ─── Styled components ───────────────────────────────────────────────────────

const Wrap = styled.div`
  width: 100%;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 420px;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.55rem 2.2rem 0.55rem 2.2rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.88rem;
  background: #f8fafc;
  outline: none;
  &:focus { border-color: #3b82f6; background: white; }
`;

const ClearBtn = styled.button`
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.15rem;
  &:hover { color: #475569; }
`;

const FilterSelect = styled.select`
  padding: 0.55rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.88rem;
  background: #f8fafc;
  color: #374151;
  outline: none;
  cursor: pointer;
  &:focus { border-color: #3b82f6; }
`;

const RefreshBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: #f1f5f9; border-color: #cbd5e1; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SummaryBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const SummaryLabel = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
`;

const SummaryValue = styled.span`
  font-size: 1.05rem;
  font-weight: 800;
  color: ${props => props.$color || '#1e293b'};
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.02em;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', system-ui, sans-serif;
  font-size: 0.85rem;
`;

const Thead = styled.thead`
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  position: sticky;
  top: 0;
  z-index: 2;
`;

const Th = styled.th`
  padding: 0.55rem 0.75rem;
  text-align: ${props => props.$right ? 'right' : 'left'};
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
  border-bottom: 2px solid #cbd5e1;
  white-space: nowrap;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  &:hover { color: ${props => props.$sortable ? '#1e293b' : '#475569'}; }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
  &:hover { background: #f8fafc; }
  &:last-child { border-bottom: none; }
`;

const Td = styled.td`
  padding: 0.6rem 0.75rem;
  vertical-align: middle;
  color: #1e293b;
`;

const TdRight = styled(Td)`
  text-align: right;
`;

const LPCode = styled.span`
  font-weight: 700;
  font-size: 0.88rem;
  color: #1e293b;
`;

const SmallMeta = styled.div`
  font-size: 0.68rem;
  color: #94a3b8;
  margin-top: 0.1rem;
`;

const MainAmount = styled.div`
  font-weight: 700;
  font-family: monospace;
  color: ${props => props.$color || '#10b981'};
  font-size: 0.9rem;
  white-space: nowrap;
`;

const SubAmount = styled.div`
  font-size: 0.68rem;
  color: #64748b;
  margin-top: 1px;
  white-space: nowrap;
`;

// ─── Jezevčík bar ─────────────────────────────────────────────────────────────

const JezWrap = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 220px;
`;

const JezHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3px;
`;

const JezBarOuter = styled.div`
  position: relative;
  height: 20px;
  background: #f1f5f9;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.5);
  &:hover .jez-num { color: rgba(148, 163, 184, 0.7) !important; }
`;

const JezBarFill = styled.div`
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  z-index: 10;
  transition: width 0.6s ease;
  background: ${props => props.$color || '#10b981'};
  width: ${props => Math.min(props.$percent || 0, 100)}%;
`;

const JezBarPlanned = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 5;
  transition: width 0.7s ease, left 0.7s ease;
  opacity: 0.4;
  background-color: ${props => props.$color || '#86efac'};
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.3) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255,255,255,0.3) 50%,
    rgba(255,255,255,0.3) 75%,
    transparent 75%,
    transparent
  );
  background-size: 8px 8px;
  left: ${props => props.$left || 0}%;
  width: ${props => {
    const maxW = 100 - (props.$left || 0);
    return Math.min(props.$percent || 0, maxW);
  }}%;
`;

const JezTargetLine = styled.div`
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: rgba(100, 116, 139, 0.55);
  z-index: 30;
  left: ${props => props.$percent || 0}%;
`;

const JezLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`;

const JezStatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 7px;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1px solid;
  ${props => {
    if (props.$level === 'critical') return `background:#fef2f2;color:#dc2626;border-color:#fecaca;`;
    if (props.$level === 'warning') return `background:#fff7ed;color:#ea580c;border-color:#fed7aa;`;
    return `background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;`;
  }}
`;

const StavBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${props => props.$bg || '#f1f5f9'};
  color: ${props => props.$color || '#475569'};
`;

const LoadingBox = styled.div`
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 1rem;
`;

const EmptyBox = styled.div`
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (v) => `${Number(v || 0).toLocaleString('cs-CZ')} Kč`;

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return String(v).slice(0, 10);
  return d.toLocaleDateString('cs-CZ');
};

/**
 * Spočítá % plynutí doby trvání smlouvy (0–100)
 * Pokud je platnost_do v minulosti → 100
 * Pokud není datum → fallback na calendar-year month%
 */
const calcTargetPct = (platnost_od, platnost_do) => {
  if (!platnost_do) {
    const m = new Date().getMonth() + 1;
    return Math.round((m / 12) * 100);
  }
  const now = new Date();
  const end = new Date(platnost_do);
  if (now >= end) return 100;
  const start = platnost_od ? new Date(platnost_od) : new Date(end.getFullYear(), 0, 1);
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = now - start;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
};

const calcState = (cerpanoPct, targetPct) => {
  if (cerpanoPct >= 100) return { level: 'critical', barColor: '#ef4444' };
  if (cerpanoPct > targetPct * 1.3) return { level: 'warning', barColor: '#f59e0b' };
  return { level: 'ok', barColor: '#10b981' };
};

// bg barva odvozená z API color hodnoty stavu
const STAV_BG_MAP = {
  '#10b981': '#dcfce7',  // zelená
  '#dc2626': '#fee2e2',  // červená
  '#f59e0b': '#fef3c7',  // oranžová
  '#f97316': '#ffedd5',  // oranžová2
  '#6b7280': '#e5e7eb',  // šedá
};

// ─── Komponenta ──────────────────────────────────────────────────────────────

export default function SmlouvyCerpaniView({ forceUnrestricted = false }) {
  const { user, token, username } = useContext(AuthContext);

  const [smlouvy, setSmlouvy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStav, setFilterStav] = useState('');
  const [sortCol, setSortCol] = useState('procento_cerpani');
  const [sortDir, setSortDir] = useState('desc');

  // ── Načtení smluv ──
  const loadSmlouvy = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await getSmlouvyList({
        token,
        username,
        show_inactive: false,
        limit: 2000,
      });
      // DEBUG - VÝPIS RAW API RESPONSE
      console.log('🔍 RAW API RESPONSE smlouvy:', resp);
      console.log('🔍 První smlouva z API:', resp?.data?.[0]);
      setSmlouvy(resp?.data || resp?.smlouvy || []);
    } catch (e) {
      setError(e.message || 'Chyba při načítání smluv');
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => { loadSmlouvy(); }, [loadSmlouvy]);

  // ── Třídění ──
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sortIcon = (col) => (
    <span style={{ marginLeft: '0.25rem', opacity: sortCol === col ? 1 : 0.3, fontSize: '0.65rem' }}>
      {sortCol !== col ? '⇅' : sortDir === 'asc' ? '↑' : '↓'}
    </span>
  );

  // ── Filtrování + třídění ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let arr = smlouvy.filter(s => {
      if (filterStav && s.stav !== filterStav) return false;
      if (!q) return true;
      return [s.cislo_smlouvy, s.nazev_smlouvy, s.nazev_firmy, s.ico, s.usek_zkr]
        .some(v => String(v || '').toLowerCase().includes(q));
    });

    arr = [...arr].sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      switch (sortCol) {
        case 'cislo_smlouvy': return m * String(a.cislo_smlouvy || '').localeCompare(String(b.cislo_smlouvy || ''), 'cs');
        case 'nazev_firmy': return m * String(a.nazev_firmy || '').localeCompare(String(b.nazev_firmy || ''), 'cs');
        case 'usek_zkr': return m * String(a.usek_zkr || '').localeCompare(String(b.usek_zkr || ''), 'cs');
        case 'hodnota_s_dph': return m * ((parseFloat(a.hodnota_s_dph) || 0) - (parseFloat(b.hodnota_s_dph) || 0));
        case 'cerpano_celkem': return m * ((parseFloat(a.cerpano_celkem) || 0) - (parseFloat(b.cerpano_celkem) || 0));
        case 'zbyva': return m * ((parseFloat(a.zbyva) || 0) - (parseFloat(b.zbyva) || 0));
        case 'procento_cerpani': return m * ((parseFloat(a.procento_cerpani) || 0) - (parseFloat(b.procento_cerpani) || 0));
        case 'platnost_do': return m * (new Date(a.platnost_do || 0) - new Date(b.platnost_do || 0));
        default: return 0;
      }
    });
    return arr;
  }, [smlouvy, search, filterStav, sortCol, sortDir]);

  // ── Celkové součty (jen smlouvy s limitem) ──
  const totals = useMemo(() => {
    const withLimit = filtered.filter(s => (parseFloat(s.hodnota_s_dph) || 0) > 0);
    const totalLimit = withLimit.reduce((s, c) => s + (parseFloat(c.hodnota_s_dph) || 0), 0);
    const totalCerpano = withLimit.reduce((s, c) => s + (parseFloat(c.cerpano_celkem) || 0), 0);
    const totalZbyva = totalLimit - totalCerpano;
    const totalPct = totalLimit > 0 ? (totalCerpano / totalLimit) * 100 : 0;
    return { totalLimit, totalCerpano, totalZbyva, totalPct, withLimitCount: withLimit.length };
  }, [filtered]);

  // ── Rozdělení: zastropované vs bez zastropování ──
  const { zastropovane, bezStropu } = useMemo(() => ({
    zastropovane: filtered.filter(s => (parseFloat(s.hodnota_s_dph) || 0) > 0),
    bezStropu: filtered.filter(s => !(parseFloat(s.hodnota_s_dph) > 0)),
  }), [filtered]);

  // ── Render jezevčík bar ──
  const renderJezBar = (s) => {
    const limit = parseFloat(s.hodnota_s_dph) || 0;
    if (limit <= 0) return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>;

    const solidAmt = parseFloat(s.cerpano_faktury_dokoncene) || 0;
    const inProcessAmt = parseFloat(s.cerpano_v_procesu) || 0;
    const totalAmt = solidAmt + inProcessAmt;

    // procenta pro barvy a stav = celkové čerpání (dokončené + v procesu)
    const totalPct = (totalAmt / limit) * 100;
    const solidPct = (solidAmt / limit) * 100;
    const inProcessPct = (inProcessAmt / limit) * 100;
    const volneAmt = Math.max(0, limit - totalAmt);

    const targetPct = calcTargetPct(s.platnost_od, s.platnost_do);
    const { level, barColor } = calcState(totalPct, targetPct);
    const barColorLight = barColor === '#10b981' ? '#86efac' : barColor === '#f59e0b' ? '#fcd34d' : '#fca5a5';

    return (
      <JezWrap>
        <JezHeader>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: barColor, letterSpacing: '-0.02em' }}>
              {totalPct.toFixed(1)}%
            </span>
            <span style={{ fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
              Čerpání
            </span>
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <span style={{ display: 'block', fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Cíl k datu
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
              {targetPct}%
            </span>
          </div>
        </JezHeader>

        {/* Textové zobrazení čerpání */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '6px', 
          fontSize: '0.75rem',
          fontWeight: 600,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {solidAmt > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748b' }}>Dokončeno:</span>
              <span style={{ color: barColor, fontWeight: 700 }}>
                {solidAmt.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
              </span>
            </div>
          )}
          {inProcessAmt > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748b' }}>V procesu:</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                {inProcessAmt.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
              </span>
            </div>
          )}
          {volneAmt > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#64748b' }}>Volné:</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                {volneAmt.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
              </span>
            </div>
          )}
        </div>

        <JezBarOuter>
          {/* Měsíční / časový rastr: 12 dílků */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                flex: 1,
                borderRight: '1px solid rgba(203,213,225,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="jez-num" style={{ fontSize: '0.38rem', fontWeight: 700, color: 'transparent', transition: 'color 0.2s' }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
          <JezTargetLine $percent={targetPct} />
          {/* Šrafovaný bar = v procesu (pod solid barem, z-index 5) */}
          {inProcessPct > 0 && (
            <JezBarPlanned $percent={inProcessPct} $left={solidPct} $color={barColorLight} />
          )}
          {/* Solid bar = dokončené faktury */}
          <JezBarFill $percent={solidPct} $color={barColor} />
        </JezBarOuter>

        <JezLegend>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: barColor, display: 'inline-block' }} />
            <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Dokončeno</span>
          </span>
          {inProcessPct > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '5px', borderRadius: '2px', background: barColorLight, opacity: 0.7, display: 'inline-block' }} />
              <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>V procesu</span>
            </span>
          )}
          {volneAmt > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#e2e8f0', border: '1px solid #cbd5e1', display: 'inline-block' }} />
              <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Volné</span>
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '1.5px', height: '9px', background: 'rgba(100,116,139,0.55)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Cíl</span>
          </span>
        </JezLegend>
      </JezWrap>
    );
  };

  const renderStatusBadge = (s) => {
    const limit = parseFloat(s.hodnota_s_dph) || 0;
    if (limit <= 0) return <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>;

    const totalAmt = (parseFloat(s.cerpano_faktury_dokoncene) || 0) + (parseFloat(s.cerpano_v_procesu) || 0);
    const pct = limit > 0 ? (totalAmt / limit) * 100 : 0;
    const targetPct = calcTargetPct(s.platnost_od, s.platnost_do);
    const { level } = calcState(pct, targetPct);

    return (
      <JezStatusBadge $level={level}>
        {level === 'critical'
          ? <><FontAwesomeIcon icon={faTimesCircle} /> Kritické</>
          : level === 'warning'
            ? <><FontAwesomeIcon icon={faTriangleExclamation} /> Pozor</>
            : <><FontAwesomeIcon icon={faCheckCircle} /> V normě</>
        }
      </JezStatusBadge>
    );
  };

  const stavBadgeProps = (stav) => {
    const cfg = getStavSmlouvyConfig(stav);
    const bg = STAV_BG_MAP[cfg.color] || '#e5e7eb';
    return { bg, color: cfg.color, label: cfg.label };
  };

  // ── Render ──
  if (loading) return <LoadingBox>Načítám smlouvy…</LoadingBox>;
  if (error) return <LoadingBox style={{ color: '#dc2626' }}>Chyba: {error}</LoadingBox>;

  const totalBarColor = totals.totalPct >= 100 ? '#ef4444' : totals.totalPct > 70 ? '#f59e0b' : '#10b981';

  return (
    <Wrap>
      {/* Toolbar */}
      <Toolbar>
        <SearchWrap>
          <SearchIcon><FontAwesomeIcon icon={faSearch} style={{ fontSize: '0.8rem' }} /></SearchIcon>
          <SearchInput
            type="text"
            placeholder="Hledat smlouvu, firmu, IČO…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <ClearBtn onClick={() => setSearch('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} style={{ fontSize: '0.8rem' }} />
            </ClearBtn>
          )}
        </SearchWrap>
        <FilterSelect
          value={filterStav}
          onChange={e => setFilterStav(e.target.value)}
          title="Filtrovat dle stavu"
        >
          <option value="">Všechny stavy</option>
          {(STAV_SMLOUVY_OPTIONS || []).map(opt => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </FilterSelect>
        <RefreshBtn onClick={loadSmlouvy} disabled={loading}>
          <FontAwesomeIcon icon={faSyncAlt} />
          Obnovit
        </RefreshBtn>
      </Toolbar>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <SummaryBar>
          <SummaryItem>
            <SummaryLabel>Smluv</SummaryLabel>
            <SummaryValue>{filtered.length}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Celkový limit</SummaryLabel>
            <SummaryValue $color="#1e40af">{fmtCurrency(totals.totalLimit)}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Vyčerpáno</SummaryLabel>
            <SummaryValue $color="#10b981">{fmtCurrency(totals.totalCerpano)}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Zbývá</SummaryLabel>
            <SummaryValue $color={totals.totalZbyva < 0 ? '#dc2626' : '#0f766e'}>
              {fmtCurrency(totals.totalZbyva)}
            </SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Celkové čerpání</SummaryLabel>
            <SummaryValue $color={totalBarColor}>{totals.totalPct.toFixed(1)} %</SummaryValue>
          </SummaryItem>
        </SummaryBar>
      )}

      {filtered.length === 0 ? (
        <EmptyBox>
          <FontAwesomeIcon icon={faFileContract} style={{ fontSize: '2rem', color: '#cbd5e1' }} />
          <span>Žádné smlouvy pro zvolené filtry</span>
        </EmptyBox>
      ) : (
        <>
          {/* ─── ZASTROPOVANÉ SMLOUVY ──────────────────────────────────── */}
          {zastropovane.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              {/* Sekce header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.75rem', marginBottom: '0.5rem',
                background: 'linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%)',
                borderRadius: '8px', border: '1px solid #bfdbfe'
              }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#2563eb', fontSize: '0.8rem' }} />
                <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Zastropované smlouvy
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
                  {zastropovane.length} smluv · limit {fmtCurrency(totals.totalLimit)} · čerpáno {fmtCurrency(totals.totalCerpano)} s DPH
                </span>
              </div>

              <TableContainer>
                <Table>
                  <Thead>
                    <tr>
                      <Th $sortable onClick={() => handleSort('cislo_smlouvy')}>
                        Číslo smlouvy{sortIcon('cislo_smlouvy')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('nazev_firmy')}>
                        Firma{sortIcon('nazev_firmy')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('usek_zkr')}>
                        Úsek{sortIcon('usek_zkr')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('platnost_do')}>
                        Platnost{sortIcon('platnost_do')}
                      </Th>
                      <Th $right $sortable onClick={() => handleSort('hodnota_s_dph')}>
                        Limit s DPH{sortIcon('hodnota_s_dph')}
                      </Th>
                      <Th $right $sortable onClick={() => handleSort('cerpano_celkem')}>
                        Čerpáno s DPH{sortIcon('cerpano_celkem')}
                      </Th>
                      <Th $right $sortable onClick={() => handleSort('zbyva')}>
                        Zbývá{sortIcon('zbyva')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('procento_cerpani')} style={{ minWidth: '240px' }}>
                        Čerpání{sortIcon('procento_cerpani')}
                      </Th>
                      <Th>Stav</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {zastropovane.map(s => {
                      const limit = parseFloat(s.hodnota_s_dph) || 0;
                      const cerpano = parseFloat(s.cerpano_celkem) || 0;
                      const zbyva = parseFloat(s.zbyva) ?? (limit - cerpano);
                      const stavInfo = stavBadgeProps(s.stav);
                      return (
                        <Tr key={s.id}>
                          <Td>
                            <LPCode>{s.cislo_smlouvy || '—'}</LPCode>
                            {s.nazev_smlouvy && (
                              <SmallMeta title={s.nazev_smlouvy} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.nazev_smlouvy}
                              </SmallMeta>
                            )}
                          </Td>
                          <Td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{s.nazev_firmy || '—'}</div>
                            {s.ico && <SmallMeta>{s.ico}</SmallMeta>}
                          </Td>
                          <Td>
                            <span style={{ fontSize: '0.82rem', color: '#374151' }}>{s.usek_zkr || '—'}</span>
                          </Td>
                          <Td>
                            <div style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                              {s.platnost_od && <div><span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>od</span> {fmtDate(s.platnost_od)}</div>}
                              <div><span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>do</span> {fmtDate(s.platnost_do)}</div>
                            </div>
                            <StavBadge $bg={stavInfo.bg} $color={stavInfo.color} style={{ marginTop: '3px' }}>{stavInfo.label}</StavBadge>
                          </Td>
                          <TdRight>
                            <MainAmount $color="#475569">{fmtCurrency(limit)}</MainAmount>
                          </TdRight>
                          <TdRight>
                            <MainAmount $color="#10b981">{fmtCurrency(cerpano)}</MainAmount>
                          </TdRight>
                          <TdRight>
                            <MainAmount $color={zbyva < 0 ? '#ef4444' : '#10b981'}>{fmtCurrency(zbyva)}</MainAmount>
                          </TdRight>
                          <Td style={{ minWidth: '240px' }}>{renderJezBar(s)}</Td>
                          <Td>{renderStatusBadge(s)}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </div>
          )}

          {/* ─── BEZ ZASTROPOVÁNÍ ─────────────────────────────────────── */}
          {bezStropu.length > 0 && (
            <div>
              {/* Sekce header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.75rem', marginBottom: '0.5rem',
                background: 'linear-gradient(90deg, #f0f9ff 0%, #f8fafc 100%)',
                borderRadius: '8px', border: '1px solid #bae6fd'
              }}>
                <FontAwesomeIcon icon={faFilter} style={{ color: '#0369a1', fontSize: '0.8rem' }} />
                <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Smlouvy bez zastropování
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
                  {bezStropu.length} smluv · bez finančního limitu · čerpáno {fmtCurrency(bezStropu.reduce((s, c) => s + (parseFloat(c.cerpano_celkem) || 0), 0))} s DPH
                </span>
              </div>

              <TableContainer>
                <Table>
                  <Thead>
                    <tr>
                      <Th $sortable onClick={() => handleSort('cislo_smlouvy')}>
                        Číslo smlouvy{sortIcon('cislo_smlouvy')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('nazev_firmy')}>
                        Firma{sortIcon('nazev_firmy')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('usek_zkr')}>
                        Úsek{sortIcon('usek_zkr')}
                      </Th>
                      <Th $sortable onClick={() => handleSort('platnost_do')}>
                        Platnost{sortIcon('platnost_do')}
                      </Th>
                      <Th $right $sortable onClick={() => handleSort('cerpano_celkem')}>
                        Čerpáno s DPH{sortIcon('cerpano_celkem')}
                      </Th>
                      <Th $right>Objednávek</Th>
                      <Th>Stav</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {bezStropu.map(s => {
                      const cerpano = parseFloat(s.cerpano_celkem) || 0;
                      const stavInfo = stavBadgeProps(s.stav);
                      return (
                        <Tr key={s.id}>
                          <Td>
                            <LPCode>{s.cislo_smlouvy || '—'}</LPCode>
                            {s.nazev_smlouvy && (
                              <SmallMeta title={s.nazev_smlouvy} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.nazev_smlouvy}
                              </SmallMeta>
                            )}
                          </Td>
                          <Td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{s.nazev_firmy || '—'}</div>
                            {s.ico && <SmallMeta>{s.ico}</SmallMeta>}
                          </Td>
                          <Td>
                            <span style={{ fontSize: '0.82rem', color: '#374151' }}>{s.usek_zkr || '—'}</span>
                          </Td>
                          <Td>
                            <div style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                              {s.platnost_od && <div><span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>od</span> {fmtDate(s.platnost_od)}</div>}
                              <div><span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>do</span> {fmtDate(s.platnost_do)}</div>
                            </div>
                            <StavBadge $bg={stavInfo.bg} $color={stavInfo.color} style={{ marginTop: '3px' }}>{stavInfo.label}</StavBadge>
                          </Td>
                          <TdRight>
                            <MainAmount $color="#10b981">{fmtCurrency(cerpano)}</MainAmount>
                            <SubAmount style={{ fontSize: '0.65rem', color: '#94a3b8' }}>bez limitu</SubAmount>
                          </TdRight>
                          <TdRight>
                            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                              {s.pocet_objednavek || 0}
                            </span>
                          </TdRight>
                          <Td>{stavInfo && <StavBadge $bg={stavInfo.bg} $color={stavInfo.color}>{stavInfo.label}</StavBadge>}</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </div>
          )}
        </>
      )}
    </Wrap>
  );
}
