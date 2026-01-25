/**
 * DatePicker Component
 * Vlastní date picker s kalendářním rozhraním
 * Převzato z OrderForm25.js - funkční verze
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { Calendar } from 'lucide-react';

function DatePicker({ fieldName, value, onChange, onBlur, disabled, hasError, placeholder = 'Vyberte datum', variant = 'standard', highlight = false, limitToMonth, limitToYear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(''); // Lokální stav pro ruční zadání
  
  // 🆕 Inicializace currentMonth na měsíc knihy, pokud je limitToMonth nastaveno
  const getInitialMonth = () => {
    if (limitToMonth !== undefined && limitToYear !== undefined) {
      // Měsíc knihy (např. prosinec 2025)
      return new Date(limitToYear, limitToMonth - 1, 1);
    }
    return new Date(); // Systémové datum jako fallback
  };
  
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  const [openUpwards, setOpenUpwards] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const wrapperRef = useRef(null);
  const calendarRef = useRef(null);
  const positionRef = useRef({ top: 0, left: 0, width: 0 });
  
  const isCompact = variant === 'compact';

  // Parse value to Date
  const selectedDate = value ? new Date(value) : null;

  // Update currentMonth when value changes to show correct month
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date);
      }
    }
  }, [value]);

  // Close calendar when clicking outside or when closeAllDatePickers event is fired
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    const handleCloseAllDatePickers = () => {
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('closeAllDatePickers', handleCloseAllDatePickers);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('closeAllDatePickers', handleCloseAllDatePickers);
      };
    }
  }, [isOpen]);

  // Detekce směru otevření kalendáře a výpočet pozice pro portal
  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
      return;
    }

    if (!wrapperRef.current) return;

    const checkPosition = () => {
      if (!wrapperRef.current || !calendarRef.current) return;

      const buttonRect = wrapperRef.current.getBoundingClientRect();
      // Měřit skutečnou výšku kalendáře místo hardcoded hodnoty
      const calendarHeight = calendarRef.current.offsetHeight || 380;
      const footerHeight = 54;
      const buffer = 20;

      const spaceBelow = window.innerHeight - buttonRect.bottom - footerHeight - buffer;
      const spaceAbove = buttonRect.top - buffer;

      const shouldOpenUpward = spaceBelow < 300 || (spaceBelow < calendarHeight && spaceAbove > spaceBelow + 50);

      // Updateovat pozici přímo v DOM bez state update
      // Použít transform místo top/left pro GPU akceleraci
      // POZOR: Pro fixed positioning nepřidávat scrollY (fixed je vůči viewportu, ne dokumentu)
      const top = shouldOpenUpward ? buttonRect.top - calendarHeight - 4 : buttonRect.bottom + 4;
      let left = buttonRect.left;
      
      // Zajistit, že kalendář se nevejde mimo viewport
      const calendarWidth = 220; // Fixní šířka kalendáře (200px grid + 2*10px padding)
      if (left + calendarWidth > window.innerWidth) {
        left = window.innerWidth - calendarWidth - 10; // 10px margin
      }
      if (left < 10) {
        left = 10; // Minimální 10px zleva
      }
      
      positionRef.current = { top, left, width: calendarWidth };
      
      // Aplikovat přímo do DOM - použít transform pro lepší performance
      calendarRef.current.style.transform = `translate(${left}px, ${top}px)`;
      calendarRef.current.style.width = `${calendarWidth}px`;
      
      // Update openUpwards pouze pokud se změnil (kvůli CSS transition)
      if (shouldOpenUpward !== openUpwards) {
        setOpenUpwards(shouldOpenUpward);
      }

      // Po prvním výpočtu označit jako positioned
      if (!isPositioned) {
        setIsPositioned(true);
      }
    };

    // Počkat na dostupnost calendarRef před prvním výpočtem
    if (calendarRef.current) {
      checkPosition();
    } else {
      // Pokud ref ještě není dostupný, počkat na další frame
      requestAnimationFrame(() => {
        checkPosition();
      });
    }

    // Track floating header state for detection during scroll
    let previousFloatingState = window.__floatingHeaderVisible || false;

    // Při scrollu aktualizovat pozici okamžitě - BEZ throttlingu pro plynulost
    const handleScroll = () => {
      // Detekce změny floating header stavu během scrollu
      const currentFloatingState = window.__floatingHeaderVisible || false;
      if (currentFloatingState !== previousFloatingState) {
        setIsOpen(false);
        previousFloatingState = currentFloatingState;
        return;
      }
      
      // Volat přímo bez RAF pro maximální plynulost
      checkPosition();
    };

    const scrollContainer = document.querySelector('[class*="ScrollableContent"]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', checkPosition, { passive: true });
    
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', checkPosition);
    };
  }, [isOpen, isPositioned]);

  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (err) {
      return '';
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

    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
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
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isOtherMonth: true });
    }

    return days;
  };

  const handleDateSelect = (date) => {
    const formattedDate = formatInputDate(date);
    onChange(formattedDate);
    if (onBlur) {
      onBlur(formattedDate);
    }
    setIsOpen(false);
  };

  const handleToday = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const today = new Date();
    let dateToSet = today;
    
    // Pokud je limitToMonth a limitToYear nastaveno, zkontroluj, zda dnešní datum je v tomto měsíci
    if (limitToMonth !== undefined && limitToYear !== undefined) {
      const currentMonthInBook = limitToMonth; // 1-12
      const currentYearInBook = limitToYear;
      
      // Pokud systémové datum není v měsíci knihy, nastav poslední den měsíce knihy
      if (today.getMonth() + 1 !== currentMonthInBook || today.getFullYear() !== currentYearInBook) {
        // Poslední den měsíce = new Date(rok, měsíc, 0)
        dateToSet = new Date(currentYearInBook, currentMonthInBook, 0);
      }
    }
    
    handleDateSelect(dateToSet);
  };

  const handleClear = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange('');
    if (onBlur) {
      onBlur('');
    }
    setIsOpen(false);
  };

  const prevMonth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Pokud je limitToMonth nastaveno, zakázat navigaci mimo tento měsíc
    if (limitToMonth !== undefined && limitToYear !== undefined) {
      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
      if (newMonth.getMonth() + 1 !== limitToMonth || newMonth.getFullYear() !== limitToYear) {
        return; // Zakázat navigaci
      }
    }
    
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Pokud je limitToMonth nastaveno, zakázat navigaci mimo tento měsíc
    if (limitToMonth !== undefined && limitToYear !== undefined) {
      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
      if (newMonth.getMonth() + 1 !== limitToMonth || newMonth.getFullYear() !== limitToYear) {
        return; // Zakázat navigaci
      }
    }
    
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const today = new Date();
  const calendarDays = getCalendarDays();

  // Display text - použít inputValue pokud uživatel píše, jinak formátované datum
  const displayText = inputValue !== '' ? inputValue : (value ? formatDisplayDate(value) : '');
  
  // Synchronizovat inputValue s value při změně value zvenčí
  useEffect(() => {
    // ✅ OPRAVA: Vždy aktualizovat inputValue když se změní value (i když uživatel nepíše)
    const formattedValue = value ? formatDisplayDate(value) : '';
    // Aktualizovat pouze pokud se liší od aktuální hodnoty (zabránit zbytečným rerenderům)
    if (inputValue !== formattedValue) {
      setInputValue(formattedValue);
    }
  }, [value]);
  
  // Handler pro ruční zadání z klávesnice
  const handleManualInput = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue); // Aktualizovat lokální stav pro zobrazení při psaní
  };
  
  // Handler pro klávesové zkratky (DELETE, BACKSPACE pro smazání)
  const handleKeyDown = (e) => {
    // DELETE nebo BACKSPACE = smazat celé datum když je pole prázdné nebo na začátku
    if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.selectionStart === 0 && e.target.selectionEnd === e.target.value.length) {
      e.preventDefault();
      setInputValue('');
      onChange('');
      if (onBlur) onBlur('');
      return;
    }
    
    // ESC = zavřít kalendář
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };
  
  // Handler pro blur - validace a zpracování ručně zadaného data
  const handleManualBlur = (e) => {
    const typedValue = e.target.value;
    
    // Zavřít dropdown při ztrátě fokusu
    setIsOpen(false);
    
    if (!typedValue.trim()) {
      setInputValue('');
      onChange('');
      if (onBlur) onBlur('');
      return;
    }
    
    // Pokus o parsování formátu dd.mm.rrrr nebo d.m.rrrr
    const match = typedValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      
      // Validace (základní kontrola)
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        
        // Kontrola, zda je datum platné (např. 31.2. by bylo neplatné)
        if (date.getDate() === day) {
          const formattedDate = formatInputDate(date);
          setInputValue(''); // Vyčistit lokální stav - použije se formátované datum
          onChange(formattedDate);
          if (onBlur) onBlur(formattedDate);
          return;
        }
      }
    }
    
    // Pokud se nepodařilo parsovat, vrátit původní hodnotu
    setInputValue('');
    if (value) {
      // Ponechat původní hodnotu beze změny
    } else {
      onChange('');
    }
    if (onBlur) onBlur(value || '');
  };

  return (
    <DatePickerWrapper ref={wrapperRef} data-field={fieldName}>
      <InputWithIcon hasIcon={!isCompact}>
        {!isCompact && <Calendar />}
        <DateInputField
          type="text"
          value={displayText}
          onChange={handleManualInput}
          onKeyDown={handleKeyDown}
          onBlur={handleManualBlur}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          hasError={hasError}
          $highlight={highlight}
          placeholder={placeholder}
          data-datepicker={fieldName}
          $variant={variant}
          $hasValue={!!value}
        />

        {/* Tlačítko pro smazání - zobrazuje se pouze když je hodnota vyplněná */}
        {value && !disabled && (
          <ClearButtonCompact
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClear(e);
            }}
            title="Smazat datum"
            $variant={variant}
          >
            ×
          </ClearButtonCompact>
        )}
      </InputWithIcon>

      {isOpen && !disabled && createPortal(
        <DateCalendarPopup 
          ref={calendarRef} 
          openUpwards={openUpwards} 
          $isPositioned={isPositioned}
          onMouseDown={(e) => {
            // Zabrání zavření kalendáře při kliknutí dovnitř
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <CalendarHeader>
            <CalendarNav onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevMonth(e);
            }}>◀</CalendarNav>
            <CalendarTitle>
              <span>{currentMonth.toLocaleDateString('cs-CZ', { month: 'long' })}</span>
              <span>{currentMonth.getFullYear()}</span>
            </CalendarTitle>
            <CalendarNav onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nextMonth(e);
            }}>▶</CalendarNav>
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
              
              // Zakázat dny mimo měsíc knihy (pokud je limitToMonth a limitToYear nastaveno)
              const isDisabled = limitToMonth !== undefined && limitToYear !== undefined && 
                (day.date.getMonth() + 1 !== limitToMonth || day.date.getFullYear() !== limitToYear);

              return (
                <CalendarDate
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      handleDateSelect(day.date);
                    }
                  }}
                  isToday={isToday}
                  isSelected={isSelected}
                  isOtherMonth={day.isOtherMonth || isDisabled}
                  style={{ 
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.3 : 1
                  }}
                >
                  {day.date.getDate()}
                </CalendarDate>
              );
            })}
          </CalendarGrid>

          <CalendarFooter>
            <CalendarButton 
              type="button"
              className="today" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToday(e);
              }}
            >
              📅 Dnes
            </CalendarButton>
            <CalendarButton 
              type="button"
              className="clear" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear(e);
              }}
            >
              🗑️ Smazat
            </CalendarButton>
          </CalendarFooter>
        </DateCalendarPopup>,
        document.body
      )}
    </DatePickerWrapper>
  );
}

// Styled Components
const DatePickerWrapper = styled.div`
  position: relative;
  width: 100%;
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
    color: #6b7280;
    pointer-events: none;
    z-index: 1;
  }
`;

const DateInputField = styled.input`
  width: 100%;
  display: block;
  padding: ${props => props.$variant === 'compact' ? '0.375rem 0.625rem' : '0.5rem 2.75rem'};
  padding-left: ${props => props.$variant === 'compact' ? '0.625rem' : '2.75rem'};
  padding-right: ${props => props.$variant === 'compact' && props.$hasValue ? '1.5rem' : props.$variant === 'compact' ? '0.625rem' : '0.75rem'};
  border: 1px solid ${props => props.hasError ? '#ef4444' : '#cbd5e1'};
  border-radius: 6px;
  background: ${props => props.disabled ? '#f1f5f9' : 'white'};
  color: ${props => props.disabled ? '#6b7280' : '#1e293b'};
  font-size: ${props => props.$variant === 'compact' ? '0.75rem' : '0.95rem'};
  font-weight: ${props => props.$hasValue ? '500' : '400'};
  cursor: text;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: #94a3af;
    font-weight: 400;
  }

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

const ClearButtonCompact = styled.button`
  position: absolute;
  right: ${props => props.$variant === 'compact' ? '4px' : '8px'};
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  color: #94a3b8;
  border: none;
  border-radius: ${props => props.$variant === 'compact' ? '3px' : '4px'};
  width: ${props => props.$variant === 'compact' ? '18px' : '24px'};
  height: ${props => props.$variant === 'compact' ? '18px' : '24px'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: ${props => props.$variant === 'compact' ? '16px' : '18px'};
  font-weight: normal;
  line-height: 1;
  transition: all 0.15s ease;
  z-index: 2;
  padding: 0;
  opacity: 0.7;

  &:hover {
    background: transparent;
    color: #64748b;
    transform: translateY(-50%) scale(1.15);
    opacity: 1;
  }

  &:active {
    transform: translateY(-50%) scale(0.9);
  }
`;

const DateClearButton = styled.button`
  position: absolute;
  right: 36px;
  top: 50%;
  transform: translateY(-50%);
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    background: #dc2626;
    transform: translateY(-50%) scale(1.1);
  }
`;

const DateTodayButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  color: #3b82f6;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    background: transparent;
    color: #2563eb;
    transform: translateY(-50%) scale(1.15);
  }
`;

const DateCalendarPopup = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999999;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  opacity: ${props => props.$isPositioned ? 1 : 0};
  pointer-events: ${props => props.$isPositioned ? 'auto' : 'none'};
  transition: opacity 0.15s ease;
  padding: 0.5rem;
  will-change: transform;
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
  width: 200px;
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
  color: ${props => props.isSelected ? 'white' : props.isOtherMonth ? '#9ca3af' : '#374151'};
  font-weight: ${props => props.isToday || props.isSelected ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.isSelected ? '#2563eb' : '#f3f4f6'};
    transform: scale(1.1);
    color: ${props => props.isSelected ? 'white' : '#111827'};
  }
`;

const CalendarFooter = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 2px solid #e5e7eb;
`;

const CalendarButton = styled.button`
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.today {
    background: #dbeafe;
    color: #1e40af;

    &:hover {
      background: #bfdbfe;
    }
  }

  &.clear {
    background: #fee2e2;
    color: #991b1b;

    &:hover {
      background: #fecaca;
    }
  }
`;

export default DatePicker;
