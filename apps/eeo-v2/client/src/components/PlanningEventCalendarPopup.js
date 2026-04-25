import React, { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PopupContainer = styled.div`
  display: flex;
  gap: 1rem;
  height: 100%;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  width: fit-content;
`;

const CalendarSection = styled.div`
  flex: 0 0 auto;
  width: 440px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  cursor: ${props => props.$hasEvent ? 'pointer' : 'default'};
  background: ${props => {
    if (props.$isSelected) return '#3b82f6';
    if (props.$hasEvent) return '#e0f2fe';
    if (props.$isOtherMonth) return 'transparent';
    return 'white';
  }};
  color: ${props => {
    if (props.$isSelected) return 'white';
    if (props.$isOtherMonth) return '#cbd5e1';
    return '#1e293b';
  }};
  font-size: 0.8rem;
  font-weight: ${props => props.$hasEvent ? '600' : '400'};
  border: 2px solid ${props => {
    if (props.$isSelected) return '#3b82f6';
    if (props.$hasEvent) return '#3b82f6';
    return 'transparent';
  }};
  transition: all 0.15s;

  &:hover {
    ${props => props.$hasEvent && !props.$isSelected && `
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
  flex: 0 0 380px;
  width: 380px;
  border-left: 1px solid #e2e8f0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
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

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  flex: 1;

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

const UserCard = styled.div`
  padding: 0.6rem;
  background: ${props => props.$type === 'accepted' ? '#f0fdf4' : '#fef2f2'};
  border-left: 3px solid ${props => props.$type === 'accepted' ? '#16a34a' : '#dc2626'};
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    transform: translateX(2px);
  }
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
  gap: 0.5rem;
`;

const UserName = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
`;

const UserDate = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  font-size: 0.7rem;
  color: #64748b;
  line-height: 1.4;
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
  padding: 2rem 1rem;
`;

// =============================================================================
// COMPONENT
// =============================================================================

const PlanningEventCalendarPopup = ({ event, responses }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Začni měsícem prvního termínu události
    if (event.terminy && event.terminy.length > 0) {
      const firstDate = new Date(event.terminy[0].dt_od);
      return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    }
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState(null);

  // Připrav data termínů s reakcemi
  const terminsMap = useMemo(() => {
    const map = new Map();
    
    if (!event.terminy || !Array.isArray(event.terminy)) return map;

    event.terminy.forEach(termin => {
      const dateKey = new Date(termin.dt_od).toISOString().split('T')[0];
      
      // Spočítej reakce pro tento termín
      const terminResponses = Array.isArray(responses) 
        ? responses.filter(r => r.termin_id === termin.id)
        : [];
      
      const accepted = terminResponses.filter(r => r.typ_odpovedi === 'accepted').length;
      const declined = terminResponses.filter(r => r.typ_odpovedi === 'declined').length;

      map.set(dateKey, {
        termin,
        accepted,
        declined,
        responses: terminResponses
      });
    });

    return map;
  }, [event.terminy, responses]);

  // Generuj dny pro aktuální měsíc
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Kolik dnů z předchozího měsíce zobrazit
    const firstDayOfWeek = firstDay.getDay();
    const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Po = 0
    
    const days = [];
    
    // Dny z předchozího měsíce
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isOtherMonth: true,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Dny aktuálního měsíce
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const eventData = terminsMap.get(dateKey);
      
      days.push({
        day,
        isOtherMonth: false,
        date,
        dateKey,
        hasEvent: !!eventData,
        eventData
      });
    }
    
    // Doplň dny z dalšího měsíce do 42 (6 řádků)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isOtherMonth: true,
        date: new Date(year, month + 1, day)
      });
    }
    
    return days;
  }, [currentMonth, terminsMap]);

  // Uživatelé pro vybraný den
  const selectedDayUsers = useMemo(() => {
    if (!selectedDate) return [];
    
    const dateKey = selectedDate.toISOString().split('T')[0];
    const eventData = terminsMap.get(dateKey);
    
    if (!eventData || !eventData.responses) return [];
    
    return eventData.responses
      .map(r => ({
        ...r,
        name: `${r.prijmeni || ''} ${r.jmeno || ''}`.trim() || 'Neznámý uživatel'
      }))
      .sort((a, b) => {
        // Nejdřív podle typu (accepted před declined)
        if (a.typ_odpovedi !== b.typ_odpovedi) {
          return a.typ_odpovedi === 'accepted' ? -1 : 1;
        }
        // Pak podle jména
        return a.name.localeCompare(b.name, 'cs');
      });
  }, [selectedDate, terminsMap]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dayData) => {
    if (!dayData.hasEvent) return;
    setSelectedDate(dayData.date);
  };

  const monthName = currentMonth.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
    <PopupContainer>
      <CalendarSection>
        <CalendarHeader>
          <NavButton onClick={handlePrevMonth}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </NavButton>
          <MonthTitle>{monthName}</MonthTitle>
          <NavButton onClick={handleNextMonth}>
            <FontAwesomeIcon icon={faChevronRight} />
          </NavButton>
        </CalendarHeader>

        <CalendarGrid>
          {weekDays.map(day => (
            <DayHeader key={day}>{day}</DayHeader>
          ))}
          {calendarDays.map((dayData, idx) => {
            const isSelected = selectedDate && dayData.date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
            
            return (
              <DayCell
                key={idx}
                $isOtherMonth={dayData.isOtherMonth}
                $hasEvent={dayData.hasEvent}
                $isSelected={isSelected}
                onClick={() => handleDayClick(dayData)}
              >
                <DayNumber>{dayData.day}</DayNumber>
                {dayData.hasEvent && dayData.eventData && (
                  <ReactionsBadge>
                    {dayData.eventData.accepted > 0 && (
                      <ReactionCount $type="accept">✓{dayData.eventData.accepted}</ReactionCount>
                    )}
                    {dayData.eventData.declined > 0 && (
                      <ReactionCount $type="decline">✗{dayData.eventData.declined}</ReactionCount>
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
            ? `${selectedDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}${selectedDayUsers.length > 0 ? ` (${selectedDayUsers.length})` : ''}`
            : 'Výběr termínu'
          }
        </UsersSectionTitle>
        
        {selectedDate && selectedDayUsers.length > 0 ? (
          <UsersList>
            {selectedDayUsers.map((user, idx) => {
              const reactionDate = user.dt_odpovedi || user.dt_created;
              const formattedDate = reactionDate 
                ? new Date(reactionDate).toLocaleString('cs-CZ', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : null;
              
              return (
                <UserCard key={idx} $type={user.typ_odpovedi}>
                  <UserHeader>
                    <UserName>
                      <FontAwesomeIcon 
                        icon={user.typ_odpovedi === 'accepted' ? faCheckCircle : faTimesCircle} 
                        color={user.typ_odpovedi === 'accepted' ? '#16a34a' : '#dc2626'}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name}
                      </span>
                    </UserName>
                    {formattedDate && (
                      <UserDate>
                        🕐 {formattedDate}
                      </UserDate>
                    )}
                  </UserHeader>
                  <UserDetails>
                    {(user.email || user.telefon) && (
                      <ContactRow>
                        {user.email && <div>📧 {user.email}</div>}
                        {user.telefon && <div>📞 {user.telefon}</div>}
                      </ContactRow>
                    )}
                    {user.poznamka && <div style={{ fontStyle: 'italic' }}>💬 {user.poznamka}</div>}
                  </UserDetails>
                </UserCard>
              );
            })}
          </UsersList>
        ) : (
          <EmptyState>
            {selectedDate ? (
              <>Žádné reakce pro tento den</>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👈</div>
                <div>Klikněte na den v kalendáři</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', opacity: 0.7 }}>
                  Zobrazí se seznam uživatelů a jejich reakcí
                </div>
              </>
            )}
          </EmptyState>
        )}
      </UsersSection>
    </PopupContainer>
  );
};

export default PlanningEventCalendarPopup;
