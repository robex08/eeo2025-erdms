import React, { useState, useMemo, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCheckCircle, faTimesCircle, faTimes, faChevronDown, faChevronRight as faChevronRightSolid } from '@fortawesome/free-solid-svg-icons';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 1100px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ModalBody = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  height: 550px;
  overflow: hidden;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const CalendarSection = styled.div`
  flex: 0 0 auto;
  width: 440px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 6px;
  color: white;
`;

const MonthTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
`;

const NavButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.85rem;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  background: #f8fafc;
  padding: 0.4rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
`;

const DayHeader = styled.div`
  text-align: center;
  font-weight: 600;
  font-size: 0.7rem;
  color: #64748b;
  padding: 0.3rem 0;
  text-transform: uppercase;
`;

const DayCell = styled.div`
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: ${props => props.$hasEvents ? 'pointer' : 'default'};
  background: ${props => {
    if (props.$isSelected) return '#3b82f6';
    if (props.$hasEvents) return '#e0f2fe';
    if (props.$isOtherMonth) return 'transparent';
    return 'white';
  }};
  color: ${props => {
    if (props.$isSelected) return 'white';
    if (props.$isOtherMonth) return '#cbd5e1';
    return '#1e293b';
  }};
  font-size: 0.8rem;
  font-weight: ${props => props.$hasEvents ? '600' : '400'};
  border: 2px solid ${props => {
    if (props.$isSelected) return '#3b82f6';
    if (props.$hasEvents) return '#3b82f6';
    return 'transparent';
  }};
  transition: all 0.15s;

  &:hover {
    ${props => props.$hasEvents && !props.$isSelected && `
      background: #bae6fd;
      transform: scale(1.05);
    `}
  }
`;

const DayNumber = styled.div`
  font-size: 0.8rem;
`;

const ReactionsBadge = styled.div`
  display: flex;
  gap: 0.2rem;
  font-size: 0.6rem;
  margin-top: 0.1rem;
`;

const ReactionCount = styled.span`
  color: ${props => props.$type === 'accept' ? '#16a34a' : '#dc2626'};
  font-weight: 700;
`;

const UsersSection = styled.div`
  flex: 1;
  height: 100%;
  border-left: 1px solid #e2e8f0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const UsersSectionTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
`;

const EventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  flex: 1;
  min-height: 0;

  /* Stylovaný scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    border: 2px solid #f1f5f9;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const EventCard = styled.div`
  background: ${props => props.$level === 'event' ? '#eff6ff' : props.$level === 'termin' ? '#f0fdfa' : '#f8fafc'};
  border-left: 3px solid ${props => props.$level === 'event' ? '#3b82f6' : props.$level === 'termin' ? '#14b8a6' : '#64748b'};
  border-radius: 6px;
  padding: 0.75rem;
  transition: all 0.15s;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  margin-left: ${props => props.$indent || '0'};

  &:hover {
    background: ${props => props.$level === 'event' ? '#dbeafe' : props.$level === 'termin' ? '#ccfbf1' : '#f1f5f9'};
  }
`;

const EventTitle = styled.div`
  font-size: ${props => props.$level === 'event' ? '0.9rem' : '0.8rem'};
  font-weight: ${props => props.$level === 'event' ? '700' : '600'};
  color: ${props => props.$level === 'event' ? '#1e40af' : '#0f766e'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EventDate = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const TerminsWrapper = styled.div`
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UsersListWrapper = styled.div`
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const UserCard = styled.div`
  padding: 0.5rem;
  background: ${props => props.$type === 'accepted' ? '#f0fdf4' : '#fef2f2'};
  border-left: 3px solid ${props => props.$type === 'accepted' ? '#16a34a' : '#dc2626'};
  border-radius: 4px;
  transition: all 0.15s;
  font-size: 0.75rem;

  &:hover {
    background: ${props => props.$type === 'accepted' ? '#dcfce7' : '#fee2e2'};
  }
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
  gap: 0.4rem;
`;

const UserName = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex: 1;
  min-width: 0;
`;

const UserDate = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  flex-shrink: 0;
`;

const ResponseStats = styled.div`
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  margin-top: 0.3rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: ${props => props.$type === 'accepted' ? '#16a34a' : '#dc2626'};
  font-weight: 600;
`;

const UserDetails = styled.div`
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ContactRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PlanningAllEventsCalendar = ({ events, eventResponses, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [expandedTermins, setExpandedTermins] = useState(new Set());

  // Toggle rozbalení události
  const toggleEvent = (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
        // Sbalit i všechny termíny této události
        setExpandedTermins(prevTermins => {
          const newTermins = new Set(prevTermins);
          const event = events.find(e => e.id === eventId);
          if (event) {
            (event.terminy || []).forEach(t => newTermins.delete(`${eventId}-${t.id}`));
          }
          return newTermins;
        });
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Toggle rozbalení termínu
  const toggleTermin = (eventId, terminId) => {
    const key = `${eventId}-${terminId}`;
    setExpandedTermins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Navigace měsíců
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Formátování data
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Mapa událostí a odpovědí podle datumů
  const dateEventsMap = useMemo(() => {
    const map = {};

    events.forEach(event => {
      // Termíny události
      const terminy = event.terminy || [];
      terminy.forEach(termin => {
        const dateKey = new Date(termin.dt_od).toDateString();
        if (!map[dateKey]) {
          map[dateKey] = { eventIds: new Set(), responses: { accepted: 0, declined: 0 } };
        }
        map[dateKey].eventIds.add(event.id);

        // Přidáme odpovědi pro tento termín
        const responses = eventResponses[event.id] || [];
        responses.forEach(resp => {
          if (resp.termin_id === termin.id) {
            if (resp.typ_odpovedi === 'accepted') {
              map[dateKey].responses.accepted++;
            } else if (resp.typ_odpovedi === 'declined') {
              map[dateKey].responses.declined++;
            }
          }
        });
      });
    });

    return map;
  }, [events, eventResponses]);

  // Vygenerování kalendářní mřížky
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // První den v týdnu (0 = neděle, 1 = pondělí, ...)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Převod na pondělí = 0
    
    const days = [];
    
    // Dny z předchozího měsíce
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay.getDate() - i),
        inMonth: false,
      });
    }
    
    // Dny aktuálního měsíce
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({
        date: new Date(year, month, day),
        inMonth: true,
      });
    }
    
    // Dny z následujícího měsíce
    const remainingDays = 42 - days.length; // 6 řádků × 7 dní
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        inMonth: false,
      });
    }
    
    return days;
  }, [currentDate]);

  // Události pro vybraný den - vrátíme celé události s VŠEMI termíny
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toDateString();
    const data = dateEventsMap[dateKey];
    if (!data) return [];
    
    // Najdeme události které mají termín v tento den
    const eventIds = Array.from(data.eventIds);
    return events.filter(e => eventIds.includes(e.id));
  }, [selectedDate, dateEventsMap, events]);

  // Automaticky rozbalit všechny události a termíny při výběru dne
  useEffect(() => {
    if (!selectedDate || selectedDayEvents.length === 0) return;

    // Rozbalit všechny události
    const newExpandedEvents = new Set();
    const newExpandedTermins = new Set();

    selectedDayEvents.forEach(event => {
      newExpandedEvents.add(event.id);
      
      // Rozbalit všechny termíny této události
      const terminy = event.terminy || [];
      terminy.forEach(termin => {
        newExpandedTermins.add(`${event.id}-${termin.id}`);
      });
    });

    setExpandedEvents(newExpandedEvents);
    setExpandedTermins(newExpandedTermins);
  }, [selectedDate, selectedDayEvents]);

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            📅 Přehled všech událostí v kalendáři
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <CalendarSection>
            <CalendarHeader>
              <NavButton onClick={goToPrevMonth}>
                <FontAwesomeIcon icon={faChevronLeft} />
              </NavButton>
              <MonthTitle>
                {currentDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
              </MonthTitle>
              <NavButton onClick={goToNextMonth}>
                <FontAwesomeIcon icon={faChevronRight} />
              </NavButton>
            </CalendarHeader>

            <CalendarGrid>
              {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(day => (
                <DayHeader key={day}>{day}</DayHeader>
              ))}
              {calendarDays.map((day, idx) => {
                const dateKey = day.date.toDateString();
                const dayData = dateEventsMap[dateKey];
                const hasEvents = !!dayData;
                const isSelected = selectedDate && selectedDate.toDateString() === dateKey;

                return (
                  <DayCell
                    key={idx}
                    $isOtherMonth={!day.inMonth}
                    $hasEvents={hasEvents}
                    $isSelected={isSelected}
                    onClick={() => hasEvents && setSelectedDate(day.date)}
                  >
                    <DayNumber>{day.date.getDate()}</DayNumber>
                    {hasEvents && (
                      <ReactionsBadge>
                        {dayData.responses.accepted > 0 && (
                          <ReactionCount $type="accept">
                            ✓{dayData.responses.accepted}
                          </ReactionCount>
                        )}
                        {dayData.responses.declined > 0 && (
                          <ReactionCount $type="decline">
                            ✗{dayData.responses.declined}
                          </ReactionCount>
                        )}
                      </ReactionsBadge>
                    )}
                  </DayCell>
                );
              })}
            </CalendarGrid>
          </CalendarSection>

          <UsersSection>
            <UsersSectionTitle>
              {selectedDate 
                ? `Události dne ${selectedDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Klikněte na den s událostmi'}
            </UsersSectionTitle>
            <EventsList>
              {selectedDate && selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event, eventIdx) => {
                  const responses = eventResponses[event.id] || [];
                  const terminy = event.terminy || [];
                  const isEventExpanded = expandedEvents.has(event.id);

                  // Statistiky celé události
                  const totalAccepted = responses.filter(r => r.typ_odpovedi === 'accepted').length;
                  const totalDeclined = responses.filter(r => r.typ_odpovedi === 'declined').length;

                  return (
                    <div key={`event-${event.id}-${eventIdx}`} style={{ marginBottom: '0.75rem' }}>
                      {/* Hlavní karta události - klikací */}
                      <EventCard 
                        $level="event" 
                        $clickable={true}
                        onClick={() => toggleEvent(event.id)}
                      >
                        <EventTitle $level="event">
                          <FontAwesomeIcon 
                            icon={isEventExpanded ? faChevronDown : faChevronRightSolid} 
                            style={{ fontSize: '0.75rem', color: '#64748b' }}
                          />
                          <span style={{ flex: 1 }}>{event.nazev}</span>
                          {(totalAccepted > 0 || totalDeclined > 0) && (
                            <ResponseStats style={{ marginTop: 0, marginLeft: 'auto' }}>
                              {totalAccepted > 0 && (
                                <StatItem $type="accepted">
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                  {totalAccepted}
                                </StatItem>
                              )}
                              {totalDeclined > 0 && (
                                <StatItem $type="declined">
                                  <FontAwesomeIcon icon={faTimesCircle} />
                                  {totalDeclined}
                                </StatItem>
                              )}
                            </ResponseStats>
                          )}
                        </EventTitle>
                      </EventCard>

                      {/* Termíny události - zobrazit pouze pokud je událost rozbalená */}
                      {isEventExpanded && terminy.length > 0 && (
                        <TerminsWrapper>
                          {terminy.map((termin, terminIdx) => {
                            const terminResponses = responses.filter(r => r.termin_id === termin.id);
                            const accepted = terminResponses.filter(r => r.typ_odpovedi === 'accepted').length;
                            const declined = terminResponses.filter(r => r.typ_odpovedi === 'declined').length;
                            const isTerminExpanded = expandedTermins.has(`${event.id}-${termin.id}`);

                            // Seřadit uživatele
                            const sortedResponses = [...terminResponses].sort((a, b) => {
                              const order = { accepted: 0, declined: 1 };
                              const oa = order[a.typ_odpovedi] ?? 2;
                              const ob = order[b.typ_odpovedi] ?? 2;
                              if (oa !== ob) return oa - ob;
                              const na = `${(a.prijmeni || '').trim()} ${(a.jmeno || '').trim()}`.trim().toLowerCase();
                              const nb = `${(b.prijmeni || '').trim()} ${(b.jmeno || '').trim()}`.trim().toLowerCase();
                              return na.localeCompare(nb, 'cs');
                            });

                            return (
                              <div key={`termin-${termin.id}-${terminIdx}`}>
                                {/* Karta termínu - klikací */}
                                <EventCard 
                                  $level="termin" 
                                  $clickable={sortedResponses.length > 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (sortedResponses.length > 0) {
                                      toggleTermin(event.id, termin.id);
                                    }
                                  }}
                                >
                                  <EventTitle $level="termin">
                                    {sortedResponses.length > 0 && (
                                      <FontAwesomeIcon 
                                        icon={isTerminExpanded ? faChevronDown : faChevronRightSolid} 
                                        style={{ fontSize: '0.7rem', color: '#64748b' }}
                                      />
                                    )}
                                    <EventDate>
                                      🕐 {formatDate(termin.dt_od)}
                                      {termin.dt_do && ` – ${formatDate(termin.dt_do)}`}
                                    </EventDate>
                                    {(accepted > 0 || declined > 0) && (
                                      <ResponseStats style={{ marginTop: 0, marginLeft: 'auto' }}>
                                        {accepted > 0 && (
                                          <StatItem $type="accepted">
                                            <FontAwesomeIcon icon={faCheckCircle} />
                                            {accepted}
                                          </StatItem>
                                        )}
                                        {declined > 0 && (
                                          <StatItem $type="declined">
                                            <FontAwesomeIcon icon={faTimesCircle} />
                                            {declined}
                                          </StatItem>
                                        )}
                                      </ResponseStats>
                                    )}
                                  </EventTitle>
                                </EventCard>

                                {/* Uživatelé - zobrazit pouze pokud je termín rozbalený */}
                                {isTerminExpanded && sortedResponses.length > 0 && (
                                  <UsersListWrapper>
                                    {sortedResponses.map((user, userIdx) => {
                                      const isAccepted = user.typ_odpovedi === 'accepted';
                                      const userName = `${(user.prijmeni || '').trim()} ${(user.jmeno || '').trim()}`.trim() || `Uživatel #${user.user_id}`;
                                      const reactionDate = user.dt_odpovedi || user.dt_created;
                                      const formattedDate = reactionDate ? new Date(reactionDate).toLocaleString('cs-CZ', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : '';

                                      return (
                                        <UserCard key={`${user.user_id}-${userIdx}`} $type={user.typ_odpovedi}>
                                          <UserHeader>
                                            <UserName>
                                              <FontAwesomeIcon icon={isAccepted ? faCheckCircle : faTimesCircle} />
                                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {userName}
                                              </span>
                                            </UserName>
                                            {formattedDate && <UserDate>🕐 {formattedDate}</UserDate>}
                                          </UserHeader>
                                          {(user.email || user.telefon || user.poznamka) && (
                                            <UserDetails>
                                              {(user.email || user.telefon) && (
                                                <ContactRow>
                                                  {user.email && <div>📧 {user.email}</div>}
                                                  {user.telefon && <div>📞 {user.telefon}</div>}
                                                </ContactRow>
                                              )}
                                              {user.poznamka && <div style={{ fontStyle: 'italic' }}>💬 {user.poznamka}</div>}
                                            </UserDetails>
                                          )}
                                        </UserCard>
                                      );
                                    })}
                                  </UsersListWrapper>
                                )}
                              </div>
                            );
                          })}
                        </TerminsWrapper>
                      )}
                    </div>
                  );
                })
              ) : (
                selectedDate && selectedDayEvents.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                    Žádné události pro tento den
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                    Vyberte den v kalendáři pro zobrazení událostí
                  </div>
                )
              )}
            </EventsList>
          </UsersSection>
        </ModalBody>
      </ModalContainer>
    </Overlay>
  );
};

export default PlanningAllEventsCalendar;
