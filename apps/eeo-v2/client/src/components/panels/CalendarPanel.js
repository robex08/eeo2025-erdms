import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import styled from '@emotion/styled';
import { createPortal } from 'react-dom';
import { PanelHeader, TinyBtn } from './PanelPrimitives';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../context/AuthContext';
import { listOrdersV2 } from '../../services/apiOrderV2';

// 🎨 Import STATUS_COLORS z Orders25List pro konzistentní barevné schéma
const STATUS_COLORS = {
  NOVA: { dark: '#475569', light: '#e2e8f0' },
  ODESLANA_KE_SCHVALENI: { dark: '#dc2626', light: '#fecaca' },
  SCHVALENA: { dark: '#ea580c', light: '#fed7aa' },
  ZAMITNUTA: { dark: '#7c2d12', light: '#fed7aa' },
  ROZPRACOVANA: { dark: '#ca8a04', light: '#fef08a' },
  ODESLANA: { dark: '#1d4ed8', light: '#dbeafe' },
  POTVRZENA: { dark: '#0891b2', light: '#a5f3fc' },
  UVEREJNENA: { dark: '#7c2d12', light: '#fed7aa' },
  CEKA_POTVRZENI: { dark: '#7c3aed', light: '#e9d5ff' },
  CEKA_SE: { dark: '#92400e', light: '#fef3c7' },
  DOKONCENA: { dark: '#16a34a', light: '#bbf7d0' },
  ZRUSENA: { dark: '#be185d', light: '#fce7f3' },
  SMAZANA: { dark: '#374151', light: '#d1d5db' },
  ARCHIVOVANO: { dark: '#78350f', light: '#fef3c7' }
};

// Funkce pro získání barvy podle stavu (kopie z Orders25List.js)
const getStatusColor = (stav) => {
  if (!stav) return STATUS_COLORS.NOVA;

  // Normalize status string
  const statusMap = {
    'NOVA': 'NOVA',
    'NOVÁ': 'NOVA',
    'ODESLÁNA KE SCHVÁLENÍ': 'ODESLANA_KE_SCHVALENI',
    'ODESLANA_KE_SCHVALENI': 'ODESLANA_KE_SCHVALENI',
    'KE SCHVÁLENÍ': 'ODESLANA_KE_SCHVALENI',
    'SCHVÁLENÁ': 'SCHVALENA',
    'SCHVALENA': 'SCHVALENA',
    'ZAMÍTNUTÁ': 'ZAMITNUTA',
    'ZAMITNUTA': 'ZAMITNUTA',
    'ROZPRACOVANÁ': 'ROZPRACOVANA',
    'ROZPRACOVANA': 'ROZPRACOVANA',
    'ODESLANÁ': 'ODESLANA',
    'ODESLANA': 'ODESLANA',
    'POTVRZENÁ': 'POTVRZENA',
    'POTVRZENA': 'POTVRZENA',
    'ZVEŘEJNĚNÁ': 'UVEREJNENA',
    'UVEREJNENA': 'UVEREJNENA',
    'ČEKÁ NA POTVRZENÍ': 'CEKA_POTVRZENI',
    'CEKA_POTVRZENI': 'CEKA_POTVRZENI',
    'ČEKÁ SE': 'CEKA_SE',
    'CEKA_SE': 'CEKA_SE',
    'DOKONČENÁ': 'DOKONCENA',
    'DOKONCENA': 'DOKONCENA',
    'ZRUŠENÁ': 'ZRUSENA',
    'ZRUSENA': 'ZRUSENA',
    'SMAZANÁ': 'SMAZANA',
    'SMAZANA': 'SMAZANA',
    'ARCHIVOVÁNO': 'ARCHIVOVANO',
    'ARCHIVOVANO': 'ARCHIVOVANO'
  };

  const normalized = stav.toUpperCase().trim();
  const statusCode = statusMap[normalized] || normalized;

  return STATUS_COLORS[statusCode] || STATUS_COLORS.NOVA;
};

const Bubble = styled.div`
  position: fixed;
  width: 360px;
  max-width: 94vw;
  max-height: 75vh;

  /* 🎨 PRŮHLEDNÉ POZADÍ S BLUR EFEKTEM */
  background: rgba(0, 0, 0, 0.67);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  padding: 0.5rem 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: white;
  z-index: 5000;
  transform-origin: center top;
  transition: opacity .18s ease, transform .18s ease;
  opacity: 0;
  transform: scale(.92);
  pointer-events: none;
  &.open { opacity: 1; transform: scale(1); }
  &.open { pointer-events: auto; }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
`;

const DayCell = styled.div`
  text-align: center;
  padding: 8px 0;
  border-radius: 6px;
  user-select: none;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
  color: white;

  &.muted {
    opacity: 0.4;
    color: rgba(255, 255, 255, 0.5);
    cursor: default;
  }

  &.today {
    background: rgba(255, 215, 0, 0.2);
    font-weight: 700;
    border: 2px solid rgba(255, 215, 0, 0.5);
  }

  &:hover:not(.muted) {
    background: rgba(255, 255, 255, 0.15);
  }

  /* Range selection styles */
  &.range-start, &.range-end {
    background: rgba(59, 130, 246, 0.4) !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.6) inset !important;
    font-weight: 700;
  }

  &.in-range {
    background: rgba(59, 130, 246, 0.2) !important;
    border-radius: 4px;
  }

  &.range-hover {
    background: rgba(59, 130, 246, 0.15);
  }
`;

const Weekday = styled.div`
  text-align: center;
  font-weight: 700;
  font-size: 0.75rem;
  opacity: 0.7;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
  padding: 4px 0 6px 0;
  text-transform: uppercase;
`;

const FooterLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  opacity: 0.85;
  font-size: 0.75rem;
  color: #e2e8f0;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

// 🎯 KALENDÁŘ TOOLTIP - Speciální verze smart tooltipů pro dny
const CalendarTooltip = styled.div`
  position: fixed;
  background: rgba(0, 0, 0, 0.67);
  color: white;
  padding: 0.6rem 0.875rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: pre-line;
  max-width: 280px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
  z-index: 999999;
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  opacity: ${props => props.$visible ? 1 : 0};
  transform: ${props => props.$visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-4px)'};
  transition: opacity 0.2s ease, transform 0.2s ease;
  &::before {
    content: ${props => props.$icon === 'warning' ? "'⚠️'" : props.$icon === 'calendar' ? "'📅'" : "'ℹ️'"};
    font-size: 1rem;
    margin-right: 0.5rem;
  }
`;

// 🎯 KALENDÁŘ DAY TOOLTIP KOMPONENTA
const CalendarDayTooltip = ({ children, text, icon }) => {
  const ref = useRef(null);
  const tooltipRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, visible: false });

  useEffect(() => {
    if (!hover || !text) {
      setPos(p => ({ ...p, visible: false }));
      return;
    }

    const calc = () => {
      if (!ref.current || !tooltipRef.current) return;
      const cell = ref.current.getBoundingClientRect();
      const tip = tooltipRef.current.getBoundingClientRect();
      let x = cell.left + cell.width / 2 - tip.width / 2;
      let y = cell.top - tip.height - 8;
      if (x < 10) x = 10;
      if (x + tip.width > window.innerWidth - 10) x = window.innerWidth - tip.width - 10;
      if (y < 10) y = cell.bottom + 8;
      setPos({ x, y, visible: true });
    };

    requestAnimationFrame(() => requestAnimationFrame(calc));
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [hover, text]);

  if (!text) return <>{children}</>;

  return (
    <>
      {React.cloneElement(React.Children.only(children), {
        ref,
        onMouseEnter: (e) => {
          setHover(true);
          if (children.props.onMouseEnter) children.props.onMouseEnter(e);
        },
        onMouseLeave: (e) => {
          setHover(false);
          if (children.props.onMouseLeave) children.props.onMouseLeave(e);
        }
      })}
      {hover && createPortal(
        <CalendarTooltip ref={tooltipRef} $icon={icon} $visible={pos.visible} style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
          {text}
        </CalendarTooltip>,
        document.body
      )}
    </>
  );
};

function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0,0,0,0);
  return x;
}
function endOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23,59,59,999);
  return x;
}
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function getWeeks(d) {
  const start = startOfMonth(d);
  const end = endOfMonth(d);
  const mapDay = (jsDay) => (jsDay === 0 ? 7 : jsDay);
  const days = [];
  const leading = mapDay(start.getDay()) - 1;
  for (let i = leading; i > 0; i--) {
    const dt = new Date(start);
    dt.setDate(start.getDate() - i);
    days.push({ date: dt, inMonth: false });
  }
  for (let i = 1; i <= end.getDate(); i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), i);
    days.push({ date: dt, inMonth: true });
  }
  const trailing = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const dt = new Date(end);
    dt.setDate(end.getDate() + i);
    days.push({ date: dt, inMonth: false });
  }
  return days;
}

export const CalendarPanel = ({ anchorRef, isVisible, onClose, onDateSelect, onDateRangeSelect, isLoggedIn = true }) => {
  const [pos, setPos] = useState({ left: undefined, top: undefined });
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const today = useMemo(() => new Date(), []);
  const [dotMap, setDotMap] = useState({});
  const bubbleRef = useRef(null);

  // Range selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Auth context for user and permissions
  const { user, token, hasPermission } = useContext(AuthContext);
  const user_id = user?.user_id || user?.id;
  const username = user?.username;

  // ✅ NOVĚ: Načítání objednávek z V2 API pro kalendář
  useEffect(() => {
    if (!isLoggedIn || !token || !username || !user_id) {
      setDotMap({});
      return;
    }

    let isCancelled = false;

    const loadOrdersForCalendar = async () => {
      try {
        // � Vypočítej datumový rozsah: aktuální měsíc ± 1 měsíc
        const currentMonth = new Date(viewMonth);
        const startDate = new Date(currentMonth);
        startDate.setMonth(currentMonth.getMonth() - 1);
        startDate.setDate(1);

        const endDate = new Date(currentMonth);
        endDate.setMonth(currentMonth.getMonth() + 2);
        endDate.setDate(0); // Poslední den předchozího měsíce = poslední den +1 měsíce

        const dateFrom = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const dateTo = endDate.toISOString().split('T')[0];     // YYYY-MM-DD

        // 📊 V2 API: Načteme objednávky s datumovým filtrem ±1 měsíc
        const filters = {
          date_from: dateFrom,
          date_to: dateTo
        };

        // 🚀 BACKEND AUTOMATICKY RESPEKTUJE ROLE-BASED FILTERING z tokenu!
        // - Admin/ORDER_MANAGE: vidí všechny objednávky z období
        // - Běžný uživatel: vidí jen objednávky kde je v JAKÉKOLIV z 12 rolí
        //   (uzivatel_id, objednatel_id, garant_uzivatel_id, schvalovatel_id,
        //    prikazce_id, prijemce_id, kontrola_form, kontrola_vecna,
        //    schvalil, evidoval, vytvoril, zmenil)
        // ❌ NEPOSÍLÁME uzivatel_id filtr - backend to řeší sám podle tokenu!

        // 🚀 Načti objednávky z V2 API
        const orders = await listOrdersV2(filters, token, username);

        if (isCancelled) return;

        // 📅 Spočítej objednávky pro jednotlivé dny a seskup podle stavů
        const counts = {};

        (orders || []).forEach(order => {
          // Přeskoč draft/koncept objednávky
          if (order.isDraft || order.isLocalConcept) return;

          // Získej datum objednávky
          let dateStr = order.dt_objednavky || order.datum_objednavky || order.created_at || order.dt_vytvoreni;

          if (!dateStr) return;

          // Parse date - podporujeme ISO formát (YYYY-MM-DD HH:MM:SS) i Czech formát (DD.MM.YYYY)
          let year, month, day;

          // ISO formát (z DB): YYYY-MM-DD HH:MM:SS nebo YYYY-MM-DD
          const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            year = isoMatch[1];
            month = isoMatch[2];
            day = isoMatch[3];
          } else {
            // Czech formát: DD.MM.YYYY
            const czMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (czMatch) {
              day = czMatch[1];
              month = czMatch[2];
              year = czMatch[3];
            } else {
              return; // Žádný formát nesedí
            }
          }

          // Vytvoř klíč ve formátu YYYY-MM-DD
          const key = `${year}-${month}-${day}`;

          // Inicializuj data pro den pokud neexistují
          if (!counts[key]) {
            counts[key] = {
              total: 0,
              pending: 0,
              statuses: {}  // ← 🎨 Nové: sledování počtu podle stavů
            };
          }

          counts[key].total += 1;

          // 🎨 Zaznamenej stav objednávky pro barevné rozlišení
          const stavObjednavky = order.stav_objednavky || 'NOVA';
          if (!counts[key].statuses[stavObjednavky]) {
            counts[key].statuses[stavObjednavky] = 0;
          }
          counts[key].statuses[stavObjednavky] += 1;

          // 🚨 Zkontroluj NESCHVÁLENÉ objednávky
          const stavSchvaleni = order.stav_schvaleni || '';

          if (stavSchvaleni === 'neschvaleno' ||
              stavObjednavky.toLowerCase().includes('ke schválení') ||
              stavObjednavky.toLowerCase().includes('ke schvaleni')) {
            counts[key].pending += 1;
          }
        });

        if (!isCancelled) {
          setDotMap(counts);

          // Ulož do localStorage pro synchronizaci s Orders25List
          try {
            localStorage.setItem('calendar_order_counts', JSON.stringify(counts));
            localStorage.setItem('calendar_order_counts_updated', Date.now());
            window.dispatchEvent(new CustomEvent('calendar_order_counts_updated'));
          } catch (err) {
            console.warn('⚠️ [CalendarPanel] Nelze uložit do localStorage:', err);
          }
        }

      } catch (err) {
        if (!isCancelled) {
          console.error('❌ [CalendarPanel] Chyba při načítání objednávek:', err);
          setDotMap({});
        }
      }
    };

    // Načti data při otevření kalendáře
    if (isVisible) {
      loadOrdersForCalendar();
    }

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, isVisible, token, username, user_id, hasPermission, viewMonth]);

  // Load dot map from localStorage (fallback pro starý systém)
  useEffect(() => {
    if (!isLoggedIn) {
      setDotMap({});
      return;
    }

    const load = () => {
      try {
        const raw = localStorage.getItem('calendar_order_counts') || '{}';
        const parsed = JSON.parse(raw);
        setDotMap(parsed);
      } catch { setDotMap({}); }
    };

    // Initial load pouze pokud kalendář není viditelný (jinak to načte useEffect výše)
    if (!isVisible) {
      load();
    }

    // Listen for storage events from other tabs/windows
    const onStorage = (e) => {
      if (e.key === 'calendar_order_counts' || e.key === 'calendar_order_counts_updated') {
        load();
      }
    };

    // Listen for custom events from same tab (Orders25List)
    const onCustomUpdate = () => {
      load();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('calendar_order_counts_updated', onCustomUpdate);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('calendar_order_counts_updated', onCustomUpdate);
    };
  }, [isLoggedIn, isVisible]);

  useEffect(() => {
    const compute = () => {
      try {
        const anchor = anchorRef && anchorRef.current;
        if (!anchor) return setPos({ left: undefined, top: undefined });
        const rect = anchor.getBoundingClientRect();
        const width = 360;
        // CENTROVANÉ POZICOVÁNÍ vzhledem k ikoně kalendáře
        const centerX = rect.left + rect.width / 2;
        const left = Math.max(8, Math.min(centerX - width / 2, window.innerWidth - width - 8));
        const top = rect.bottom + 8;
        setPos({ left, top });
      } catch (err) { setPos({ left: undefined, top: undefined }); }
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => { window.removeEventListener('resize', compute); window.removeEventListener('scroll', compute, true); };
  }, [anchorRef]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  // Debug: Log dotMap when calendar becomes visible
  useEffect(() => {
    if (isVisible) {
      const totalDays = Object.keys(dotMap).length;
      const totalOrders = Object.values(dotMap).reduce((sum, day) => {
        return sum + (typeof day === 'number' ? day : day.total || 0);
      }, 0);
      const totalPending = Object.values(dotMap).reduce((sum, day) => {
        return sum + (typeof day === 'object' ? day.pending || 0 : 0);
      }, 0);
    }
  }, [isVisible, dotMap]);

  // Close on outside click
  useEffect(() => {
    if (!isVisible) return;
    const handleDown = (e) => {
      try {
        const b = bubbleRef.current;
        if (b && b.contains(e.target)) return;
        const a = anchorRef && anchorRef.current;
        if (a && a.contains(e.target)) return;
        onClose && onClose();
      } catch (_) {}
    };
    document.addEventListener('mousedown', handleDown, true);
    return () => document.removeEventListener('mousedown', handleDown, true);
  }, [isVisible, onClose, anchorRef]);

  const weeks = useMemo(() => getWeeks(viewMonth), [viewMonth]);
  const monthLabel = useMemo(() => viewMonth.toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long' }), [viewMonth]);

  // Helper to determine if date is in range
  const isInRange = (date) => {
    if (!rangeStart || !rangeEnd) return false;
    const time = date.getTime();
    const start = rangeStart.getTime();
    const end = rangeEnd.getTime();
    return time >= Math.min(start, end) && time <= Math.max(start, end);
  };

  // Helper to determine if date is in hover preview range
  const isInHoverRange = (date) => {
    if (!isSelecting || !rangeStart || !hoverDate) return false;
    const time = date.getTime();
    const start = rangeStart.getTime();
    const hover = hoverDate.getTime();
    return time >= Math.min(start, hover) && time <= Math.max(start, hover);
  };

  // Format date for Czech locale
  const formatDateCZ = (date) => {
    return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
  };

  const bubble = (
    <Bubble
      ref={bubbleRef}
      className={isVisible ? 'open' : ''}
      style={{ left: pos.left, top: pos.top }}
      onMouseUp={() => {
        if (isSelecting && rangeStart && hoverDate) {
          setRangeEnd(hoverDate);
          setIsSelecting(false);

          // Trigger range callback
          if (onDateRangeSelect) {
            const start = rangeStart < hoverDate ? rangeStart : hoverDate;
            const end = rangeStart < hoverDate ? hoverDate : rangeStart;
            onDateRangeSelect(formatDateCZ(start), formatDateCZ(end));
          }

          // Close calendar after selection
          setTimeout(() => {
            setRangeStart(null);
            setRangeEnd(null);
            setHoverDate(null);
            onClose && onClose();
          }, 100);
        }
      }}
      onMouseLeave={() => {
        if (isSelecting) {
          setIsSelecting(false);
          setRangeStart(null);
          setHoverDate(null);
        }
      }}
    >
      <PanelHeader>
        <div style={{display:'flex', alignItems:'center', gap:'.4rem'}}>
          <TinyBtn type="button" onClick={() => setViewMonth(m => addMonths(m, -1))} title="Předchozí měsíc"><FontAwesomeIcon icon={faChevronLeft} /></TinyBtn>
          <span style={{fontWeight:700}}>{monthLabel}</span>
          <TinyBtn type="button" onClick={() => setViewMonth(m => addMonths(m, 1))} title="Další měsíc"><FontAwesomeIcon icon={faChevronRight} /></TinyBtn>
        </div>
        <TinyBtn type="button" onClick={onClose} title="Zavřít">×</TinyBtn>
      </PanelHeader>
      <CalendarGrid>
        {["Po","Út","St","Čt","Pá","So","Ne"].map(d => (<Weekday key={d}>{d}</Weekday>))}
        {weeks.map((w, idx) => {
          const d = w.date;
          const isToday = d.toDateString() === today.toDateString();
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const dayData = dotMap[key] || { total: 0, pending: 0 };

          // Support old format (number) and new format (object)
          const count = typeof dayData === 'number' ? dayData : dayData.total;
          const pendingCount = typeof dayData === 'object' ? dayData.pending : 0;

          // Range selection classes
          const isStart = rangeStart && d.toDateString() === rangeStart.toDateString();
          const isEnd = rangeEnd && d.toDateString() === rangeEnd.toDateString();
          const inRange = isInRange(d);
          const inHover = isInHoverRange(d);

          let cls = `${w.inMonth ? '' : 'muted'} ${isToday ? 'today' : ''}`.trim();
          if (isStart) cls += ' range-start';
          if (isEnd) cls += ' range-end';
          if (inRange) cls += ' in-range';
          if (inHover && !inRange) cls += ' range-hover';

          const handleMouseDown = (e) => {
            e.preventDefault();
            if (!w.inMonth) return;
            setIsSelecting(true);
            setRangeStart(d);
            setRangeEnd(null);
            setHoverDate(d);
          };

          const handleMouseEnter = () => {
            if (isSelecting && rangeStart) {
              setHoverDate(d);
            }
          };

          const handleClick = () => {
            if (isSelecting) return; // Ignore click if we're selecting range

            try {
              const cz = formatDateCZ(d);
              if (onDateSelect) onDateSelect(cz);
              onClose && onClose();
            } catch (_) {}
          };

          // 🎨 Získej top 3 nejčastější stavy pro barevné puntíky
          const statuses = (typeof dayData === 'object' && dayData.statuses) ? dayData.statuses : {};
          const sortedStatuses = Object.entries(statuses)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3); // Max 3 puntíky

          // 📊 Vytvoř tooltip text s rozpisem stavů
          const tooltipLines = [
            `${d.toLocaleDateString('cs-CZ')}`,
            count ? `• ${count} objednávek` : null,
            pendingCount > 0 ? `(${pendingCount} neschváleno/ke schválení)` : null,
            ...sortedStatuses.map(([status, cnt]) => `• ${status}: ${cnt}×`)
          ].filter(Boolean).join('\n');
          const tooltipIcon = pendingCount > 0 ? 'warning' : count > 0 ? 'calendar' : 'info';

          return (
            <CalendarDayTooltip key={idx} text={count || pendingCount ? tooltipLines : ''} icon={tooltipIcon}>
              <DayCell
                className={cls}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onClick={handleClick}
              >
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span>{d.getDate()}</span>
                <div style={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',justifyContent:'center'}}>
                  {/* 🎨 Barevné puntíky podle stavů objednávek */}
                  {sortedStatuses.map(([status, statusCount], idx) => {
                    const statusColor = getStatusColor(status);
                    return (
                      <span
                        key={`${status}-${idx}`}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: statusColor.dark,
                          boxShadow: `0 0 4px ${statusColor.dark}66`
                        }}
                        title={`${status}: ${statusCount}×`}
                      />
                    );
                  })}

                  {/* 🚨 Vykřičník pro neschválené objednávky */}
                  {pendingCount > 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: '#ef4444',
                      textShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
                      lineHeight: 1
                    }}>!</span>
                  )}
                </div>
              </div>
            </DayCell>
          </CalendarDayTooltip>
          );
        })}
      </CalendarGrid>
      <FooterLine>
        <span>{today.toLocaleDateString('cs-CZ')}</span>
        <button
          type="button"
          onClick={() => setViewMonth(startOfMonth(new Date()))}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFD700',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.8rem',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.12)';
            e.target.style.borderColor = 'rgba(255, 215, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          Dnes
        </button>
      </FooterLine>
    </Bubble>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(bubble, document.body);
};

export default CalendarPanel;
