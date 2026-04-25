/**
 * PlanningEventDetailPanel.js
 * Sdílený komponent pro zobrazení planning události s termíny
 * Používá se v:
 * - DashboardPage.js (kalendář widget)
 * - Layout.js (notification bell)
 * - NotificationsPage.js (stránka notifikací)
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

export const EventCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: #f8fafc;
`;

export const EventMeta = styled.div`
  font-size: 0.72rem;
  color: #64748b;
`;

export const EventName = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
`;

export const EventDescription = styled.div`
  font-size: 0.78rem;
  line-height: 1.45;
  color: #334155;

  p { margin: 0 0 0.35rem; }
  ul, ol { margin: 0 0 0.35rem; padding-left: 1.1rem; }
`;

export const EventTerms = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

export const EventTermRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.55rem 0.6rem;
  border-radius: 10px;
  background: ${p => p.$selected ? '#eef2ff' : '#ffffff'};
  border: 1px solid ${p => p.$selected ? '#93c5fd' : '#e2e8f0'};
`;

export const EventTermLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
`;

export const EventTermStatus = styled.div`
  font-size: 0.72rem;
  color: #475569;
`;

export const EventActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const EventActionButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${p => p.disabled ? '#94a3b8' : (p.$variant === 'decline' ? '#991b1b' : '#166534')};
  background: ${p => p.disabled ? '#f1f5f9' : (p.$variant === 'decline' ? '#fee2e2' : '#dcfce7')};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: transform 0.12s, box-shadow 0.12s, background 0.2s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const flashAccept = keyframes`
  0%   { background: #dcfce7; box-shadow: 0 0 0 3px rgba(22,163,74,0.45); }
  60%  { background: #bbf7d0; box-shadow: 0 0 0 6px rgba(22,163,74,0.25); }
  100% { background: #ffffff; box-shadow: 0 0 0 0 rgba(22,163,74,0); }
`;

const flashDecline = keyframes`
  0%   { background: #fee2e2; box-shadow: 0 0 0 3px rgba(220,38,38,0.45); }
  60%  { background: #fecaca; box-shadow: 0 0 0 6px rgba(220,38,38,0.25); }
  100% { background: #ffffff; box-shadow: 0 0 0 0 rgba(220,38,38,0); }
`;

export const EventTermFlash = styled.div`
  animation: ${p => p.$type === 'accepted' ? flashAccept : flashDecline} 1.2s ease-out;
  border-radius: 10px;
`;

export const EventTermNoteInput = styled.textarea`
  width: 100%;
  min-height: 48px;
  resize: vertical;
  padding: 0.4rem 0.55rem;
  font-size: 0.72rem;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
  }
`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const parseSqlDateTime = (str) => {
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  if (!datePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = (timePart || '00:00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss);
};

export const formatCzDateTime = (isoOrSql) => {
  if (!isoOrSql) return '';
  const d = typeof isoOrSql === 'string' ? parseSqlDateTime(isoOrSql) : new Date(isoOrSql);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
};

export const formatResponseLabel = (value) => {
  if (value === 'accepted') return 'Akceptováno';
  if (value === 'declined') return 'Odmítnuto';
  return value || '—';
};

export const getTermLabel = (term) => {
  if (!term?.dt_od) return 'Termín';
  const start = formatCzDateTime(term.dt_od);
  const end = term.dt_do ? formatCzDateTime(term.dt_do) : '';
  return end ? `${start} – ${end}` : start;
};

export const getResponseDeadline = (event, term) => {
  if (term?.deadline) {
    return parseSqlDateTime(term.deadline);
  }
  const start = parseSqlDateTime(term?.dt_od || event?.dt_od);
  if (!start) return null;
  const end = parseSqlDateTime(term?.dt_do);
  const created = parseSqlDateTime(event?.dt_vytvoreno || event?.dt_create || event?.dt_created);
  const startDate = new Date(start);
  const isMultiDay = end && startDate.toDateString() !== new Date(end).toDateString();
  const sameDayCreated = created && new Date(created).toDateString() === startDate.toDateString();

  let deadline = new Date(startDate);
  if (sameDayCreated) {
    deadline.setHours(deadline.getHours() - 1);
  } else if (isMultiDay) {
    deadline.setHours(deadline.getHours() - 24);
  } else {
    deadline.setHours(deadline.getHours() - 6);
  }
  return deadline;
};

export const canChangeResponse = (event, term) => {
  if (term?.can_change !== undefined && term?.can_change !== null) {
    return Boolean(term.can_change);
  }
  const deadline = getResponseDeadline(event, term);
  if (!deadline) return true;
  return new Date() <= deadline;
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PlanningEventDetailPanel
 * @param {Object} event - Událost s termíny
 * @param {Function} onRespond - Callback pro odpověď na termín (event, term, type)
 * @param {Object} flashState - Stav flash animace {termId: 'accepted-timestamp' | 'declined-timestamp'}
 * @param {Object} termNotes - Poznámky k termínům {termId: string}
 * @param {Function} onTermNoteChange - Callback pro změnu poznámky (termId, note)
 * @param {boolean} requiresResponse - Zda událost vyžaduje odpověď (default: true)
 * @param {Function} isTermSelected - Funkce pro zjištění zda je termín vybrán (term, event) (default: false)
 * @param {boolean} showAuthor - Zobrazit autora (default: true)
 * @param {string} title - Volitelný nadpis místo názvu události
 */
export default function PlanningEventDetailPanel({ 
  event, 
  onRespond, 
  flashState = {}, 
  termNotes = {}, 
  onTermNoteChange,
  requiresResponse = true,
  isTermSelected = () => false,
  showAuthor = true,
  title = null
}) {
  if (!event) return null;

  const authorName = event.autor_jmeno && event.autor_prijmeni 
    ? `${event.autor_jmeno} ${event.autor_prijmeni}`.trim()
    : (event.autor_jmeno || event.autor_prijmeni || 'RH ADMIN');

  const description = event.popis_html || event.popis || '';
  const displayTerms = Array.isArray(event.terminy) ? [...event.terminy] : [];

  if (displayTerms.length === 0) {
    return (
      <EventCard>
        {showAuthor && <EventMeta>{authorName ? `Autor: ${authorName}` : 'Autor neuveden'}</EventMeta>}
        <EventName>{title || event.nazev}</EventName>
        {description && <EventDescription dangerouslySetInnerHTML={{ __html: description }} />}
        <EventMeta>Tato událost nemá žádné termíny.</EventMeta>
      </EventCard>
    );
  }

  return (
    <EventCard>
      {showAuthor && <EventMeta>{authorName ? `Autor: ${authorName}` : 'Autor neuveden'}</EventMeta>}
      <EventName>{title || event.nazev}</EventName>
      {description && <EventDescription dangerouslySetInnerHTML={{ __html: description }} />}

      <EventTerms>
        {displayTerms.map(term => {
          const response = term?.moje_odpoved?.typ_odpovedi;
          const responseTime = term?.moje_odpoved?.dt_odpovedi;
          const deadline = getResponseDeadline(event, term);
          const canChange = requiresResponse ? canChangeResponse(event, term) : false;
          const termLabel = getTermLabel(term);
          const isSelected = isTermSelected(term, event);
          const flashKey = flashState[term.id];
          const flashType = flashKey ? flashKey.split('-')[0] : null;

          // Kontrola kapacity termínu
          const hasCapacity = term.kapacita !== null && term.kapacita !== undefined && term.kapacita > 0;
          const acceptedCount = term.accepted_count || 0;
          const isFull = term.is_full === true;
          const isUserAccepted = response === 'accepted';
          const canAccept = canChange && (!isFull || isUserAccepted);

          const rowContent = (
            <EventTermRow key={term.id} $selected={isSelected}>
              <EventTermLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span>
                  {termLabel}
                  {isSelected && <span style={{ color: '#1d4ed8' }}> (vybráno)</span>}
                </span>
                {/* Badge kapacity v pravém rohu - vždy zobrazit (X/Y nebo X/∞) */}
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  background: hasCapacity ? (isFull ? '#fee2e2' : '#dcfce7') : '#f1f5f9',
                  color: hasCapacity ? (isFull ? '#dc2626' : '#059669') : '#64748b',
                  border: `1px solid ${hasCapacity ? (isFull ? '#fca5a5' : '#86efac') : '#cbd5e1'}`,
                  whiteSpace: 'nowrap'
                }}>
                  {hasCapacity ? (
                    <>{isFull ? '🔴 ' : '✅ '}{acceptedCount}/{term.kapacita}</>
                  ) : (
                    <>{acceptedCount}/∞</>
                  )}
                </span>
              </EventTermLabel>
              <EventTermStatus>
                Odpověď: {formatResponseLabel(response)}
                {responseTime ? ` • ${formatCzDateTime(responseTime)}` : ''}
              </EventTermStatus>
              {requiresResponse && deadline && (
                <EventMeta>{canChange ? `Změna do ${formatCzDateTime(deadline.toISOString())}` : 'Změna už není možná'}</EventMeta>
              )}
              {requiresResponse && (
                <>
                  <EventTermNoteInput
                    placeholder="Poznámka k odpovědi (nepovinné)"
                    value={termNotes[term.id] ?? (term?.moje_odpoved?.poznamka || '')}
                    onChange={(e) => onTermNoteChange && onTermNoteChange(term.id, e.target.value)}
                    disabled={!canChange}
                  />
                  <EventActions>
                    <EventActionButton
                      type="button"
                      $variant="accept"
                      disabled={!canAccept}
                      title={!canAccept && isFull && !isUserAccepted ? 'Termín je plně obsazen' : !canChange ? 'Změna už není možná' : ''}
                      onClick={(e) => { e.stopPropagation(); onRespond && onRespond(event, term, 'accepted'); }}
                    >
                      Potvrdit
                    </EventActionButton>
                    <EventActionButton
                      type="button"
                      $variant="decline"
                      disabled={!canChange}
                      title={!canChange ? 'Změna už není možná' : ''}
                      onClick={(e) => { e.stopPropagation(); onRespond && onRespond(event, term, 'declined'); }}
                    >
                      Odmítnout
                    </EventActionButton>
                  </EventActions>
                </>
              )}
            </EventTermRow>
          );

          return flashType ? (
            <EventTermFlash key={`flash-${term.id}-${flashKey}`} $type={flashType}>
              {rowContent}
            </EventTermFlash>
          ) : rowContent;
        })}
      </EventTerms>
    </EventCard>
  );
}
