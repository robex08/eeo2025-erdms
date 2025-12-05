/**
 * DatePicker Component
 * Vlastní date picker s kalendářním rozhraním
 * Převzato z OrderForm25.js pro opakované použití
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';

// DatePicker styled components
const DatePickerWrapper = styled.div`
  position: relative;
  width: 100%;
  overflow: visible;
`;

const InputWithIcon = styled.div`
  position: relative;
  width: 100%;

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
  }
`;

const DateInputButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  padding-right: ${props => props.hasValue ? '2.5rem' : '0.75rem'};
  border: 1px solid ${props => props.hasError ? '#ef4444' : '#d1d5db'};
  border-radius: 8px;
  background: ${props => props.disabled ? '#f3f4f6' : 'white'};
  color: ${props => props.disabled ? '#9ca3af' : props.hasValue ? '#111827' : '#9ca3af'};
  font-size: 0.875rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  text-align: left;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const DateTodayButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    background: #059669;
    transform: translateY(-50%) scale(1.1);
  }
`;

const DateCalendarPopup = styled.div`
  position: fixed;
  z-index: 10001;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 0.5rem;
  min-width: 280px;
`;

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid #e5e7eb;
`;

const CalendarNav = styled.button`
  background: #f3f4f6;
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background: #3b82f6;
    color: white;
    transform: scale(1.1);
  }
`;

const CalendarTitle = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: #111827;
  display: flex;
  gap: 0.35rem;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
`;

const CalendarDay = styled.div`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0.15rem;
`;

const CalendarDate = styled.button`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  border: none;
  border-radius: 4px;
  background: ${props => props.isToday ? '#dbeafe' : props.isSelected ? '#3b82f6' : 'transparent'};
  color: ${props => props.isSelected ? 'white' : props.isOtherMonth ? '#d1d5db' : '#374151'};
  font-weight: ${props => props.isToday || props.isSelected ? '600' : '400'};
  cursor: ${props => props.isOtherMonth ? 'default' : 'pointer'};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.isSelected ? '#2563eb' : props.isOtherMonth ? 'transparent' : '#f3f4f6'};
    transform: ${props => props.isOtherMonth ? 'none' : 'scale(1.1)'};
  }
`;

/**
 * DatePicker Component
 *
 * @param {Object} props
 * @param {string} props.value - Hodnota data ve formátu YYYY-MM-DD
 * @param {function} props.onChange - Callback pro změnu hodnoty: (newValue) => void
 * @param {boolean} props.disabled - Zda je picker disabled
 * @param {boolean} props.hasError - Zda má picker chybový stav
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.limitToMonth - Omezit výběr jen na tento měsíc (1-12)
 * @param {number} props.limitToYear - Omezit výběr jen na tento rok
 */
function DatePicker({
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = 'Vyberte datum',
  limitToMonth = null,
  limitToYear = null
}) {
  // Inicializuj currentMonth na základě limitToMonth/limitToYear nebo value nebo dnešní datum
  const getInitialMonth = () => {
    if (limitToMonth && limitToYear) {
      return new Date(limitToYear, limitToMonth - 1, 1);
    }
    if (value) {
      return new Date(value);
    }
    return new Date();
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth);
  const wrapperRef = useRef(null);
  const popupRef = useRef(null);

  // Parse value to Date
  const selectedDate = value ? new Date(value) : null;

  // Při změně limitToMonth/limitToYear nastav správný měsíc
  useEffect(() => {
    if (limitToMonth && limitToYear) {
      setCurrentMonth(new Date(limitToYear, limitToMonth - 1, 1));
    }
  }, [limitToMonth, limitToYear]);

  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return placeholder;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return placeholder; // Invalid date check
      return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (err) {
      return placeholder;
    }
  };

  // Format date for input (YYYY-MM-DD)
  const formatInputDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    const days = [];

    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isOtherMonth: true });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isOtherMonth: false });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isOtherMonth: true });
    }

    return days;
  };

  const handleDateSelect = (date) => {
    const formattedDate = formatInputDate(date);
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleToday = () => {
    handleDateSelect(new Date());
  };

  const prevMonth = () => {
    // Zakázat změnu měsíce pokud je limitToMonth nastaveno
    if (limitToMonth && limitToYear) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    // Zakázat změnu měsíce pokud je limitToMonth nastaveno
    if (limitToMonth && limitToYear) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const today = new Date();
  const calendarDays = getCalendarDays();

  // Vypočítat pozici pro portal
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Zavřít při kliknutí mimo nebo při scrollování
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      // Klik je mimo pokud není na wrapperu ANI na popup elementu
      const clickedWrapper = wrapperRef.current && wrapperRef.current.contains(e.target);
      const clickedPopup = popupRef.current && popupRef.current.contains(e.target);

      if (!clickedWrapper && !clickedPopup) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setPopupPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // true = capture phase pro všechny scroll eventy
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <DatePickerWrapper ref={wrapperRef}>
      <InputWithIcon>
        <DateInputButton
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          hasError={hasError}
          hasValue={!!value}
        >
          {formatDisplayDate(value)}
        </DateInputButton>

        {/* Tlačítko pro dnešní datum */}
        {!disabled && (
          <DateTodayButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToday();
            }}
            title="Nastavit dnešní datum"
          >
            📅
          </DateTodayButton>
        )}
      </InputWithIcon>

      {isOpen && !disabled && createPortal(
        <DateCalendarPopup
          ref={popupRef}
          data-datepicker-popup
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            width: `${popupPosition.width}px`
          }}
        >
          <CalendarHeader>
            <CalendarNav
              onClick={prevMonth}
              disabled={limitToMonth && limitToYear}
              style={{
                opacity: (limitToMonth && limitToYear) ? 0.3 : 1,
                cursor: (limitToMonth && limitToYear) ? 'not-allowed' : 'pointer'
              }}
            >
              ◀
            </CalendarNav>
            <CalendarTitle>
              <span>{currentMonth.toLocaleDateString('cs-CZ', { month: 'long' })}</span>
              <span>{currentMonth.getFullYear()}</span>
            </CalendarTitle>
            <CalendarNav
              onClick={nextMonth}
              disabled={limitToMonth && limitToYear}
              style={{
                opacity: (limitToMonth && limitToYear) ? 0.3 : 1,
                cursor: (limitToMonth && limitToYear) ? 'not-allowed' : 'pointer'
              }}
            >
              ▶
            </CalendarNav>
          </CalendarHeader>

          <CalendarGrid>
            <CalendarDay>Po</CalendarDay>
            <CalendarDay>Út</CalendarDay>
            <CalendarDay>St</CalendarDay>
            <CalendarDay>Čt</CalendarDay>
            <CalendarDay>Pá</CalendarDay>
            <CalendarDay>So</CalendarDay>
            <CalendarDay>Ne</CalendarDay>

            {calendarDays.map((day, index) => {
              const isToday = day.date.toDateString() === today.toDateString();
              const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();

              // Když je limitToMonth nastaven, povolit kliknutí POUZE na dny daného měsíce
              let isClickable;
              if (limitToMonth && limitToYear) {
                const dayMonth = day.date.getMonth() + 1;
                const dayYear = day.date.getFullYear();
                isClickable = dayMonth === limitToMonth && dayYear === limitToYear;
              } else {
                // Když není limit, zakázat kliknutí na dny jiných měsíců
                isClickable = !day.isOtherMonth;
              }

              return (
                <CalendarDate
                  key={index}
                  onClick={() => isClickable && handleDateSelect(day.date)}
                  isToday={isToday}
                  isSelected={isSelected}
                  isOtherMonth={day.isOtherMonth || !isClickable}
                  style={{
                    cursor: isClickable ? 'pointer' : 'not-allowed',
                    opacity: isClickable ? 1 : 0.3
                  }}
                >
                  {day.date.getDate()}
                </CalendarDate>
              );
            })}
          </CalendarGrid>
        </DateCalendarPopup>,
        document.body
      )}
    </DatePickerWrapper>
  );
}

export default DatePicker;
