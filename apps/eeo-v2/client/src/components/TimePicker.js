/**
 * TimePicker Component
 * Vlastní time picker s ciferníkovým rozhraním + dropdown výběr
 * Inspirováno DatePicker komponentou
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { Clock } from 'lucide-react';

// TimePicker styled components
const TimePickerWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const InputWithIcon = styled.div`
  position: relative;
  width: 100%;

  svg {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
  }
`;

const TimeInputButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  padding-left: 2rem;
  padding-right: ${props => props.hasValue ? '4rem' : '0.625rem'};
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

const TimeClearButton = styled.button`
  position: absolute;
  right: 8px;
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
  }
`;

const TimeNowButton = styled.button`
  position: absolute;
  right: 36px;
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
  }
`;

const TimePopup = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483647;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: ${props => props.$isPositioned ? 1 : 0};
  pointer-events: ${props => props.$isPositioned ? 'auto' : 'none'};
  transition: opacity 0.15s ease;
  will-change: transform;
`;

// Levá strana - ciferník
const ClockFace = styled.div`
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(145deg, #f0f9ff, #e0f2fe);
  border: 3px solid #3b82f6;
  flex-shrink: 0;
`;

const ClockCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1e40af;
  z-index: 2;
`;

const ClockHand = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0 50%;
  height: 4px;
  background: linear-gradient(90deg, #1e40af, #3b82f6);
  border-radius: 2px;
  transition: transform 0.3s ease;
  z-index: 1;
  pointer-events: none;
`;

const ClockNumber = styled.button`
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  background: ${props => props.isSelected ? '#3b82f6' : 'transparent'};
  color: ${props => props.isSelected ? 'white' : '#374151'};
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${props => props.isSelected ? '#2563eb' : '#e0f2fe'};
  }
`;

// Pravá strana - dropdown seznamy
const TimeDropdowns = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-width: 140px;
`;

const DropdownLabel = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TimeDropdown = styled.select`
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s ease;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;

  &:hover {
    border-color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: none;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
`;

const QuickButton = styled.button`
  flex: 1;
  padding: 0.4rem;
  border: none;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.now {
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

/**
 * TimePicker Component
 *
 * @param {Object} props
 * @param {string} props.value - Hodnota času ve formátu HH:MM
 * @param {function} props.onChange - Callback pro změnu hodnoty: (newValue) => void
 * @param {boolean} props.disabled - Zda je picker disabled
 * @param {boolean} props.hasError - Zda má picker chybový stav
 * @param {string} props.placeholder - Placeholder text
 */
function TimePicker({ value, onChange, onTimeComplete, disabled = false, hasError = false, placeholder = 'Vyberte čas' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const wrapperRef = useRef(null);
  const popupRef = useRef(null);
  const positionRef = useRef({ top: 0, left: 0, width: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  // Parse value to hours and minutes
  const [parsedHours, parsedMinutes] = value ? value.split(':').map(Number) : [0, 0];
  const [localHours, setLocalHours] = useState(parsedHours);
  const [localMinutes, setLocalMinutes] = useState(parsedMinutes);
  const selectedHourRef = useRef(parsedHours);

  // Sync local state with external value
  useEffect(() => {
    setLocalHours(parsedHours);
    setLocalMinutes(parsedMinutes);
    selectedHourRef.current = parsedHours;
  }, [parsedHours, parsedMinutes]);

  // Reset mode to hours when opening popup
  useEffect(() => {
    if (isOpen) {
      setMode('hours');
    }
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
      const clickedInsidePopup = popupRef.current && popupRef.current.contains(event.target);
      if (!clickedInsideWrapper && !clickedInsidePopup) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
      return;
    }

    const updatePosition = () => {
      if (!wrapperRef.current || !popupRef.current) return;

      const buttonRect = wrapperRef.current.getBoundingClientRect();
      const popupHeight = popupRef.current.offsetHeight || 280;
      const popupWidth = Math.max(260, Math.round(buttonRect.width || 0));
      const buffer = 12;

      const spaceBelow = window.innerHeight - buttonRect.bottom - buffer;
      const spaceAbove = buttonRect.top - buffer;
      const shouldOpenUpwards = spaceBelow < popupHeight && spaceAbove > spaceBelow;

      const top = shouldOpenUpwards
        ? buttonRect.top - popupHeight - 4
        : buttonRect.bottom + 4;
      let left = buttonRect.left;

      if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 10;
      }
      if (left < 10) left = 10;

      positionRef.current = { top, left, width: popupWidth };
      popupRef.current.style.transform = `translate(${left}px, ${top}px)`;
      popupRef.current.style.width = `${popupWidth}px`;

      if (!isPositioned) {
        setIsPositioned(true);
      }
    };

    requestAnimationFrame(updatePosition);

    const handleScroll = () => updatePosition();

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isPositioned]);

  // Format time for display
  const formatDisplayTime = (time) => {
    if (!time) return placeholder;
    return time; // Already in HH:MM format
  };

  // Format time for input (HH:MM)
  const formatTime = (h, m) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleTimeChange = (newHours, newMinutes) => {
    onChange(formatTime(newHours, newMinutes));
  };

  const handleHourClick = (hour) => {
    selectedHourRef.current = hour;
    setLocalHours(hour);
    handleTimeChange(hour, localMinutes);
    setMode('minutes'); // Switch to minutes after selecting hour
  };

  const handleMinuteClick = (minute) => {
    const hourToUse = selectedHourRef.current ?? localHours;
    setLocalMinutes(minute);
    handleTimeChange(hourToUse, minute);
    // Close popup after selecting minute
    setIsOpen(false);
    // Notify parent that time is fully selected (hours + minutes)
    if (onTimeComplete) {
      onTimeComplete(formatTime(hourToUse, minute));
    }
  };

  const handleNow = () => {
    const now = new Date();
    selectedHourRef.current = now.getHours();
    setLocalHours(now.getHours());
    setLocalMinutes(now.getMinutes());
    onChange(formatTime(now.getHours(), now.getMinutes()));
    setIsOpen(false);
    if (onTimeComplete) {
      onTimeComplete(formatTime(now.getHours(), now.getMinutes()));
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Get clock number positions (12 numbers around circle)
  const getClockPosition = (number, total = 12) => {
    // Pozice: 12 je nahoře (0°), čísla jdou po směru hodinových ručiček
    // Normalizuj do rozsahu 0..(total-1) aby 12 bylo nahoře
    const normalizedNumber = ((number % total) + total) % total;
    const angle = (normalizedNumber * 360 / total - 90) * Math.PI / 180;
    const radius = 75; // Distance from center (zvětšeno z 55 na 75 pro 200px ciferník)
    return {
      left: `calc(50% + ${Math.cos(angle) * radius}px - 18px)`, // -18px pro 36px široká tlačítka
      top: `calc(50% + ${Math.sin(angle) * radius}px - 18px)`
    };
  };

  // Calculate hand rotation
  const getHandRotation = () => {
    if (mode === 'hours') {
      // 24-hodinový formát: 0-23
      // CSS rotate: 0° je vpravo, 90° je dole, 180° vlevo, 270° nahoře (-90°)
      // Chceme, aby 12/0 hodin bylo nahoře (-90° nebo 270°)
      const hour12 = localHours % 12; // 0-11
      // Pro 12/0 chceme -90° (270°), pro 1 chceme -60° (300°), pro 2 chceme -30° (330°)
      // Pro 3 chceme 0°, pro 6 chceme 90°, pro 9 chceme 180°, pro 11 chceme -120° (240°)
      const angle = hour12 * 30 - 90;
      return angle;
    } else {
      // Minuty: 0-59
      // 0 minut ukazuje nahoru (na 12), pak po směru hodinových ručiček
      const angle = Math.floor(localMinutes / 5) * 30 - 90;
      return angle;
    }
  };

  const getHandLength = () => {
    return mode === 'hours' ? '55px' : '65px';
  };

  return (
    <TimePickerWrapper ref={wrapperRef}>
      <InputWithIcon hasIcon>
        <Clock />
        <TimeInputButton
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          hasError={hasError}
          hasValue={!!value}
          data-time-input="true"
        >
          {formatDisplayTime(value)}
        </TimeInputButton>

        {/* Křížek pro smazání */}
        {value && !disabled && (
          <TimeClearButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Smazat čas"
          >
            ✕
          </TimeClearButton>
        )}

        {/* Tlačítko "Nyní" */}
        {!disabled && (
          <TimeNowButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNow();
            }}
            title="Aktuální čas"
          >
            🕐
          </TimeNowButton>
        )}
      </InputWithIcon>

      {isOpen && !disabled && createPortal(
        <TimePopup
          ref={popupRef}
          $isPositioned={isPositioned}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Levá strana - Ciferník */}
          <ClockFace>
            <ClockCenter />
            <ClockHand
              style={{
                width: getHandLength(),
                transform: `rotate(${getHandRotation()}deg)`
              }}
            />

            {mode === 'hours' ? (
              // 24-hodinový ciferník: vnější kruh 12-23, vnitřní kruh 0-11
              <>
                {/* Vnější kruh: 12-23 */}
                {[...Array(12)].map((_, i) => {
                  const hour = i + 12; // 12, 13, 14, ..., 23
                  const displayHour = i === 0 ? 12 : i + 12; // Zobraz 12 místo 0
                  return (
                    <ClockNumber
                      key={`outer-${i}`}
                      onClick={() => handleHourClick(hour)}
                      isSelected={localHours === hour}
                      style={getClockPosition(i)}
                    >
                      {displayHour}
                    </ClockNumber>
                  );
                })}

                {/* Vnitřní kruh: 0-11 */}
                {[...Array(12)].map((_, i) => {
                  const hour = i; // 0, 1, 2, ..., 11
                  const displayHour = i === 0 ? '00' : i; // Zobraz 00 místo 0
                  const innerRadius = 38; // Menší radius pro vnitřní čísla (zvětšeno z 28 na 38)
                  const angle = (i * 360 / 12 - 90) * Math.PI / 180;
                  return (
                    <ClockNumber
                      key={`inner-${i}`}
                      onClick={() => handleHourClick(hour)}
                      isSelected={localHours === hour}
                      style={{
                        left: `calc(50% + ${Math.cos(angle) * innerRadius}px - 18px)`,
                        top: `calc(50% + ${Math.sin(angle) * innerRadius}px - 18px)`,
                        fontSize: '0.8rem',
                        opacity: 0.7
                      }}
                    >
                      {displayHour}
                    </ClockNumber>
                  );
                })}
              </>
            ) : (
              // Minuty: 0, 5, 10, 15, ..., 55
              [...Array(12)].map((_, i) => {
                const minute = i * 5;
                const displayMinute = minute.toString().padStart(2, '0');
                return (
                  <ClockNumber
                    key={i}
                    onClick={() => handleMinuteClick(minute)}
                    isSelected={Math.floor(localMinutes / 5) === i}
                    style={getClockPosition(i)}
                  >
                    {minute === 0 ? '00' : String(minute).padStart(2, '0')}
                  </ClockNumber>
                );
              })
            )}
          </ClockFace>
        </TimePopup>,
        document.body
      )}
    </TimePickerWrapper>
  );
}

export default TimePicker;
