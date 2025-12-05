import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { createPortal } from 'react-dom';
import { PanelHeader, TinyBtn } from './PanelPrimitives';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const Bubble = styled.div`
  position: fixed;
  width: 360px;
  max-width: 94vw;
  max-height: 75vh;
  background: linear-gradient(180deg, rgba(15,23,42,0.95), rgba(9,12,20,0.95));
  box-shadow: inset 0 0 0 2000px rgba(32,45,101,0.10), 0 12px 40px rgba(2,6,23,0.6);
  border: 1px solid rgba(32,45,101,0.22);
  border-radius: 14px;
  padding: 0.5rem 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #e6eefc;
  z-index: 5000;
  transform-origin: right top;
  transition: opacity .18s ease, transform .18s ease;
  opacity: 0;
  transform: scale(.92);
  pointer-events: none; /* block interactions when hidden */
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
  border-radius: 8px;
  user-select: none;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;

  &.muted { opacity: 0.45; }
  &.today { background: rgba(56,189,248,0.17); box-shadow: 0 0 0 1px rgba(56,189,248,0.35) inset; }
  &:hover:not(.muted) { background: rgba(148,163,184,0.15); }

  /* Range selection styles */
  &.range-start, &.range-end {
    background: rgba(16,185,129,0.3) !important;
    box-shadow: 0 0 0 2px rgba(16,185,129,0.5) inset !important;
  }

  &.in-range {
    background: rgba(16,185,129,0.15) !important;
    border-radius: 0;
  }

  &.range-hover {
    background: rgba(16,185,129,0.1);
  }
`;

const Weekday = styled.div`
  text-align: center;
  font-weight: 700;
  font-size: 0.8rem;
  opacity: 0.85;
  padding: 4px 0 6px 0;
`;

const FooterLine = styled.div`
  display:flex; align-items:center; justify-content:space-between; gap:.6rem; opacity:.75; font-size:.75rem;
`;

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
  // Monday=1..Sunday=7 mapping; JS getDay(): Sun=0..Sat=6
  const mapDay = (jsDay) => (jsDay === 0 ? 7 : jsDay);
  const days = [];
  const leading = mapDay(start.getDay()) - 1; // how many days from prev month
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

  // Load dot map from localStorage (provided by OrdersListNew page) - only when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setDotMap({});
      return;
    }

    const load = () => {
      try {
        const raw = localStorage.getItem('calendar_order_counts') || '{}';
        setDotMap(JSON.parse(raw));
      } catch { setDotMap({}); }
    };
    load();
    // Optionally listen for storage events (another tab) or a timestamp change
    const onStorage = (e) => { if (e.key === 'calendar_order_counts' || e.key === 'calendar_order_counts_updated') load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isLoggedIn]);

  useEffect(() => {
    const compute = () => {
      try {
        const anchor = anchorRef && anchorRef.current;
        if (!anchor) return setPos({ left: undefined, top: undefined });
        const rect = anchor.getBoundingClientRect();
        const width = Math.min(340, window.innerWidth * 0.9);
        // Position calendar to the left of the anchor button
        const preferredLeft = rect.left - width + 100; // Position from left edge of button, move left by calendar width minus offset
        const left = Math.max(8, preferredLeft); // Only ensure it doesn't go off left edge
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

  // Close on outside click
  useEffect(() => {
    if (!isVisible) return;
    const handleDown = (e) => {
      try {
        const b = bubbleRef.current;
        if (b && b.contains(e.target)) return; // inside panel
        const a = anchorRef && anchorRef.current;
        if (a && a.contains(e.target)) return; // click on anchor toggles separately
        onClose && onClose();
      } catch (_) {}
    };
    document.addEventListener('mousedown', handleDown, true);
    return () => document.removeEventListener('mousedown', handleDown, true);
  }, [isVisible, onClose, anchorRef]);

  const weeks = useMemo(() => getWeeks(viewMonth), [viewMonth]);
  const monthLabel = useMemo(() => viewMonth.toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long' }), [viewMonth]);

  const bubble = (
    <Bubble ref={bubbleRef} className={isVisible ? 'open' : ''} style={{ left: pos.left, top: pos.top }}>
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
          const cls = `${w.inMonth ? '' : 'muted'} ${isToday ? 'today' : ''}`.trim();
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const count = dotMap[key] || 0;
          const handleClick = () => {
            try {
              const cz = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
              if (onDateSelect) onDateSelect(cz);
              onClose && onClose();
            } catch (_) {}
          };
          return (
            <DayCell key={idx} className={cls} title={`${d.toLocaleDateString('cs-CZ')}${count? ` • ${count} objednávek` : ''}`} onClick={handleClick} style={{cursor:'pointer'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span>{d.getDate()}</span>
                {count > 0 && (
                  <span style={{width:6, height:6, borderRadius:'50%', background:'rgba(56,189,248,0.9)'}} />
                )}
              </div>
            </DayCell>
          );
        })}
      </CalendarGrid>
      <FooterLine>
        <span>{today.toLocaleDateString('cs-CZ')}</span>
        <button type="button" onClick={() => setViewMonth(startOfMonth(new Date()))} style={{background:'transparent', border:'1px solid rgba(148,163,184,0.35)', color:'#e6eefc', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>Dnes</button>
      </FooterLine>
    </Bubble>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(bubble, document.body);
};

export default CalendarPanel;
