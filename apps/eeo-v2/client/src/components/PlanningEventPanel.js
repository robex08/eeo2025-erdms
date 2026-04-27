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
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.2rem;
  position: relative;
`;

export const EventMeta = styled.div`
  font-size: 0.72rem;
  color: #64748b;
`;

export const EventHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const EventName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
`;

export const EventBadge = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  gap: 0.3rem;
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
  background: ${
    p => p.$suppressResponseVisual ?
         (p.$selected ? '#eef2ff' : '#f9fafb') :
         p.$responseType === 'accepted' ? '#dcfce7' :
         p.$responseType === 'declined' ? '#fee2e2' :
         p.$selected ? '#eef2ff' : '#f9fafb'
  };
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

const flashBorder = keyframes`
  0%   { box-shadow: 0 0 0 3px rgba(59,130,246,0.45); }
  60%  { box-shadow: 0 0 0 6px rgba(59,130,246,0.25); }
  100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
`;

export const EventTermFlash = styled.div`
  animation: ${flashBorder} 1.2s ease-out;
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
  let d;
  if (isoOrSql instanceof Date) {
    d = isoOrSql;
  } else if (typeof isoOrSql === 'string') {
    // ✅ Pokud obsahuje 'T' (ISO formát), použij new Date(), jinak SQL parser
    if (isoOrSql.includes('T')) {
      d = new Date(isoOrSql);
    } else {
      d = parseSqlDateTime(isoOrSql);
    }
  } else {
    d = new Date(isoOrSql);
  }
  if (!d || isNaN(d.getTime())) return '';
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

/**
 * Zkontroluje, zda termín již proběhl (je v minulosti)
 * @param {Object} term - Termín události
 * @returns {boolean} - True pokud termín již proběhl
 */
export const isTermInPast = (term) => {
  if (!term) return false;
  
  // Kontrola podle dt_do (konec termínu) - pokud existuje
  if (term.dt_do) {
    const endDate = parseSqlDateTime(term.dt_do);
    if (endDate) {
      return new Date() > endDate;
    }
  }
  
  // Fallback na dt_od (začátek termínu)
  if (term.dt_od) {
    const startDate = parseSqlDateTime(term.dt_od);
    if (startDate) {
      // Termín je v minulosti pokud začátek + 24 hodin < teď
      const endTime = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      return new Date() > endTime;
    }
  }
  
  return false;
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
 * @param {boolean} showResponseStatus - Zobrazit textový stav odpovědi (default: true)
 * @param {boolean} suppressResponseVisual - Potlačit barevné zvýraznění dle odpovědi (default: false)
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
  title = null,
  showResponseStatus = true,
  suppressResponseVisual = false
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
        <EventHeader>
          <EventName>{title || event.nazev}</EventName>
          <EventBadge>
            <span>📅</span>
            <span>0 termínů</span>
          </EventBadge>
        </EventHeader>
        {description && <EventDescription dangerouslySetInnerHTML={{ __html: description }} />}
        <EventMeta>Tato událost nemá žádné termíny.</EventMeta>
      </EventCard>
    );
  }

  return (
    <EventCard>
      {showAuthor && <EventMeta>{authorName ? `Autor: ${authorName}` : 'Autor neuveden'}</EventMeta>}
      <EventHeader>
        <EventName>{title || event.nazev}</EventName>
        <EventBadge>
          <span>📅</span>
          <span>{displayTerms.length} {displayTerms.length === 1 ? 'termín' : displayTerms.length < 5 ? 'termíny' : 'termínů'}</span>
        </EventBadge>
      </EventHeader>
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
          
          // ✅ Kontrola zda termín již proběhl (je v minulosti)
          const isPast = isTermInPast(term);

          // Kontrola kapacity termínu
          const hasCapacity = term.kapacita !== null && term.kapacita !== undefined && term.kapacita > 0;
          const acceptedCount = term.accepted_count || 0;
          const isFull = term.is_full === true;
          const isUserAccepted = response === 'accepted';
          // ✅ OBOJE má stejnou podmínku: pokud je plno a nejsi accepted, nemůžeš ANI potvrdit ANI odmítnout
          // ✅ A TAKÉ pokud je termín v minulosti, nemůžeš už reagovat
          const canInteract = canChange && (!isFull || isUserAccepted) && !isPast;
          const canAccept = canInteract;
          const canDecline = canInteract;

          const rowContent = (
            <EventTermRow
              key={term.id}
              $selected={isSelected}
              $responseType={response}
              $suppressResponseVisual={suppressResponseVisual}
            >
              <EventTermLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {termLabel}
                  {/* ✅ Badge "Uskutečněno" pro termíny v minulosti */}
                  {isPast && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      whiteSpace: 'nowrap'
                    }}>
                      ✓ Uskutečněno
                    </span>
                  )}
                </span>
                {/* Badge kapacity v pravém rohu - vždy zobrazit (X/Y nebo X/∞) */}
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '10px',
                  background: hasCapacity ? (isFull ? '#fca5a5' : '#86efac') : '#cbd5e1',
                  color: hasCapacity ? (isFull ? '#7f1d1d' : '#14532d') : '#1e293b',
                  border: `1.5px solid ${hasCapacity ? (isFull ? '#ef4444' : '#22c55e') : '#94a3b8'}`,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {hasCapacity ? (
                    <>{isFull ? '🔴 ' : '✓ '}{acceptedCount}/{term.kapacita}</>
                  ) : (
                    <>👥 {acceptedCount}/∞</>
                  )}
                </span>
              </EventTermLabel>
              {/* Zobrazit odpověď jen když může uživatel reagovat NEBO už má odpověď */}
              {showResponseStatus && (canInteract || response) && (
                <>
                  <EventTermStatus style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span>Odpověď:</span>
                    <span>{formatResponseLabel(response)}</span>
                    {responseTime ? (
                      <span>• {formatCzDateTime(responseTime)}</span>
                    ) : response ? (
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic' }}>• datum neuloženo</span>
                    ) : null}
                    {response === 'accepted' && (
                      <span style={{marginLeft: '8px', fontSize: '1rem', color: '#16a34a'}}>✓</span>
                    )}
                    {response === 'declined' && (
                      <span style={{marginLeft: '8px', fontSize: '1rem', color: '#dc2626'}}>✕</span>
                    )}
                  </EventTermStatus>
                </>
              )}
              {/* Badge "Termín již obsazen" pro plné termíny */}
              {isFull && !isUserAccepted && (
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.4rem 0.6rem',
                  marginTop: '0.25rem',
                  borderRadius: '6px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  display: 'inline-block',
                  width: 'fit-content'
                }}>
                  ⛔ Termín již obsazen
                </div>
              )}
              {requiresResponse && deadline && canInteract && (
                <EventMeta>{canChange ? `Změna do ${formatCzDateTime(deadline)}` : 'Změna už není možná'}</EventMeta>
              )}
              {requiresResponse && canInteract && (
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
                      title={!canInteract && isFull && !isUserAccepted ? 'Termín je plně obsazen' : !canChange ? 'Změna už není možná' : ''}
                      onClick={(e) => { e.stopPropagation(); onRespond && onRespond(event, term, 'accepted'); }}
                    >
                      Potvrdit
                    </EventActionButton>
                    <EventActionButton
                      type="button"
                      $variant="decline"
                      disabled={!canDecline}
                      title={!canInteract && isFull && !isUserAccepted ? 'Termín je plně obsazen' : !canChange ? 'Změna už není možná' : ''}
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
            <EventTermFlash key={`flash-${term.id}-${flashKey}`}>
              {rowContent}
            </EventTermFlash>
          ) : rowContent;
        })}
      </EventTerms>
    </EventCard>
  );
}
