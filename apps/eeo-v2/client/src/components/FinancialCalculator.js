import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBackspace, faEquals } from '@fortawesome/free-solid-svg-icons';

const CalculatorPanel = styled.div`
  position: fixed;
  width: 350px;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  z-index: 4500;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  backdrop-filter: blur(10px);
  user-select: none;
  transition: opacity 0.22s ease;

  &[data-floating-panel] {
    /* marker for outside click detection */
  }
`;

const CalculatorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border-radius: 12px 12px 0 0;
  cursor: move;
`;

const CalculatorTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.5px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #e2e8f0;
    background: rgba(148, 163, 184, 0.1);
  }
`;

const Display = styled.div`
  padding: 16px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #475569 rgba(0, 0, 0, 0.1);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 3px;
  }
`;

const DisplayValue = styled.div`
  font-size: 28px;
  font-weight: 300;
  color: #ffffff;
  text-align: right;
  min-height: 35px;
  word-break: break-all;
  line-height: 1.2;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: ${props => props.$selected ? '2px solid #3b82f6' : '1px solid rgba(148, 163, 184, 0.2)'};
  cursor: ${props => props.$selectable ? 'pointer' : 'default'};
  transition: all 0.2s ease;

  &:hover {
    ${props => props.$selectable && `
      background: rgba(59, 130, 246, 0.1);
      border-color: #3b82f6;
    `}
  }
`;

const DisplayOperation = styled.div`
  font-size: 14px;
  color: #94a3b8;
  text-align: right;
  min-height: 20px;
  margin-bottom: 8px;
`;

const HistoryList = styled.div`
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
`;

const HistoryItem = styled.div`
  padding: 6px 12px;
  font-size: 12px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => props.$selected ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};

  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const HistoryExpression = styled.span`
  color: #94a3b8;
  flex: 1;
`;

const HistoryResult = styled.span`
  color: #ffffff;
  font-weight: 600;
  margin-left: 8px;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0 0 12px 12px;
`;

const CalcButton = styled.button`
  height: 50px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #ffffff;
  font-family: inherit;

  /* KRITICKÉ: Zabránit focusu tlačítek při kliknutí myší */
  &:focus {
    outline: none;
  }

  ${props => {
    if (props.$variant === 'clear') {
      return `
        background: linear-gradient(135deg, #ef4444, #dc2626);
        &:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); }
      `;
    }
    if (props.$variant === 'operator') {
      return `
        background: linear-gradient(135deg, #f59e0b, #d97706);
        &:hover { background: linear-gradient(135deg, #d97706, #b45309); }
      `;
    }
    if (props.$variant === 'equals') {
      return `
        background: linear-gradient(135deg, #10b981, #059669);
        &:hover { background: linear-gradient(135deg, #059669, #047857); }
      `;
    }
    // number buttons
    return `
      background: linear-gradient(135deg, #475569, #334155);
      &:hover { background: linear-gradient(135deg, #334155, #1e293b); }
    `;
  }}

  &:active {
    transform: scale(0.95);
  }
`;

const FinancialCalculator = ({ isOpen, onClose, position, onPositionChange, isActive = false, onEngage, onLastResultChange }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState('');
  const [calculationHistory, setCalculationHistory] = useState([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);
  const [memory, setMemory] = useState(0);

  const panelRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Opacity states - podobně jako v todo/notes panelech
  const basePanelOpacity = 0.35;   // když není aktivní ani hover (65% transparent)
  const hoverPanelOpacity = 0.90;  // při hover (10% transparent)
  const engagedOpacity = 0.95;     // když je aktivní/focus (5% transparent)

  const [isHovered, setIsHovered] = useState(false);
  const computedOpacity = isActive ? engagedOpacity : (isHovered ? hoverPanelOpacity : basePanelOpacity);

  // Oznámit změnu posledního výsledku pro tooltip
  useEffect(() => {
    if (onLastResultChange && calculationHistory.length > 0) {
      const lastResult = calculationHistory[calculationHistory.length - 1];
      onLastResultChange(lastResult.result, lastResult.expression);
    } else if (onLastResultChange && calculationHistory.length === 0) {
      onLastResultChange(null, null);
    }
  }, [calculationHistory, onLastResultChange]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen || !isActive) return; // OPRAVA: Poslouchej jen když je kalkulačka otevřená A aktivní

    const handleKeyDown = (e) => {
      // OPRAVA: Kontroluj, zda má kalkulačka focus (je aktivní)
      // Pokud je focus v input/textarea mimo kalkulačku, ignoruj
      const activeElement = document.activeElement;
      const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );

      // DŮLEŽITÉ: Pokud je aktivní JAKÝKOLIV input/textarea, VŽDY ignoruj
      if (isInputActive) {
        return;
      }

      // Pokud kalkulačka NENÍ aktivní, ignoruj všechny klávesy
      if (!isActive) {
        return;
      }

      // Prevent default behavior for calculator keys
      const key = e.key;

      // Numbers 0-9
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        inputNumber(key);
        return;
      }

      // Operators
      switch (key) {
        case '+':
          e.preventDefault();
          performOperation('add');
          break;
        case '-':
          e.preventDefault();
          performOperation('subtract');
          break;
        case '*':
        case 'x':
        case 'X':
          e.preventDefault();
          performOperation('multiply');
          break;
        case '/':
          e.preventDefault();
          performOperation('divide');
          break;
        case '%':
          e.preventDefault();
          performOperation('percentage');
          break;
        case '.':
        case ',': // Support Czech decimal separator
          e.preventDefault();
          inputDecimal();
          break;
        case '=':
        case 'Enter':
          e.preventDefault();
          handleEquals();
          break;
        case 'Backspace':
          e.preventDefault();
          backspace();
          break;
        case 'Delete':
        case 'c':
        case 'C':
          e.preventDefault();
          clear();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (calculationHistory.length > 0) {
            const newIndex = selectedHistoryIndex < calculationHistory.length - 1
              ? selectedHistoryIndex + 1
              : calculationHistory.length - 1;
            selectHistoryItem(newIndex);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (selectedHistoryIndex > 0) {
            selectHistoryItem(selectedHistoryIndex - 1);
          } else if (selectedHistoryIndex === 0) {
            setSelectedHistoryIndex(-1);
            setDisplay('0');
            clear();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          // Ctrl+M variants for memory functions
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              memorySubtract(); // Ctrl+Shift+M = M-
            } else {
              memoryAdd(); // Ctrl+M = M+
            }
          } else {
            memoryRecall(); // M = MR (Memory Recall)
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          memoryRecall(); // R = MR
          break;
        default:
          // Ctrl+C - Copy result to clipboard
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            try {
              navigator.clipboard.writeText(display);
              // Visual feedback - briefly change display background
              const calcPanel = panelRef.current;
              if (calcPanel) {
                const displayEl = calcPanel.querySelector('[data-display]');
                if (displayEl) {
                  displayEl.style.backgroundColor = '#10b981';
                  displayEl.style.transition = 'background-color 0.2s ease';
                  setTimeout(() => {
                    displayEl.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                  }, 200);
                }
              }
            } catch (error) {
            }
          }
          // Ctrl+L - Clear all history
          else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            clearAll();
          }
          // Don't prevent default for other keys
          break;
      }
    };

    // Add event listener when calculator is open
    document.addEventListener('keydown', handleKeyDown);

    // Focus the panel to ensure it receives keyboard events (jen když je aktivní)
    if (panelRef.current && isActive) {
      panelRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isActive, display, previousValue, operation, waitingForOperand, onClose]); // OPRAVA: Přidán isActive do dependencies

  // Automaticky zruš focus/aktivaci při kliknutí mimo kalkulačku
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Kliknutí mimo kalkulačku - VŽDY deaktivovat (i když neměla focus)
        if (isActive && onEngage) {
          // Tady nemůžeme přímo volat deaktivaci, protože nemáme prop pro to
          // Místo toho spoléháme na Layout.js, který má handleClickOutside
        }
        // Odeber focus z panelu
        if (panelRef.current === document.activeElement) {
          panelRef.current.blur();
        }
        // Pokud má focus nějaký element uvnitř kalkulačky, odeber mu ho
        const activeElement = document.activeElement;
        if (activeElement && panelRef.current.contains(activeElement)) {
          activeElement.blur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isActive, onEngage]);

  // Když kalkulačka není aktivní, VŽDY odeber focus
  useEffect(() => {
    if (!isActive && panelRef.current) {
      panelRef.current.blur();
      // Odeber focus i z jakéhokoliv child elementu
      const activeElement = document.activeElement;
      if (activeElement && panelRef.current.contains(activeElement)) {
        activeElement.blur();
      }
    }
  }, [isActive]);

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;

    isDragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !panelRef.current) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    onPositionChange({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Calculator logic
  const inputNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setHistory('');
    setSelectedHistoryIndex(-1);
  };

  const clearAll = () => {
    clear();
    setCalculationHistory([]);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setHistory(`${inputValue} ${getOperatorSymbol(nextOperation)}`);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
      setHistory(`${currentValue} ${getOperatorSymbol(operation)} ${inputValue} = ${newValue}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case 'add':
        return firstValue + secondValue;
      case 'subtract':
        return firstValue - secondValue;
      case 'multiply':
        return firstValue * secondValue;
      case 'divide':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      case 'percentage':
        return firstValue * (secondValue / 100);
      default:
        return secondValue;
    }
  };

  const getOperatorSymbol = (op) => {
    switch (op) {
      case 'add': return '+';
      case 'subtract': return '−';
      case 'multiply': return '×';
      case 'divide': return '÷';
      case 'percentage': return '%';
      default: return '';
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      const expression = `${previousValue} ${getOperatorSymbol(operation)} ${inputValue}`;
      const result = String(newValue);

      // Add to calculation history
      const newHistoryItem = {
        expression,
        result,
        timestamp: Date.now()
      };

      setCalculationHistory(prev => [newHistoryItem, ...prev].slice(0, 20)); // Keep last 20 calculations
      setDisplay(result);
      setHistory(`${expression} = ${result}`);
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
      setSelectedHistoryIndex(-1);
    }
  };

  const selectHistoryItem = (index) => {
    const item = calculationHistory[index];
    if (item) {
      setDisplay(item.result);
      setSelectedHistoryIndex(index);
      setWaitingForOperand(true);
      setPreviousValue(null);
      setOperation(null);
      setHistory('');
    }
  };

  // Memory functions
  const memoryAdd = () => {
    const currentValue = parseFloat(display) || 0;
    setMemory(prev => prev + currentValue);
  };

  const memorySubtract = () => {
    const currentValue = parseFloat(display) || 0;
    setMemory(prev => prev - currentValue);
  };

  const memoryClear = () => {
    setMemory(0);
  };

  const memoryRecall = () => {
    setDisplay(String(memory));
    setWaitingForOperand(true);
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // Univerzální handler pro zabránění focusu na tlačítka
  const preventFocus = (e) => {
    e.preventDefault(); // Zabránit focusu
  };

  if (!isOpen) return null;

  return (
    <CalculatorPanel
      ref={panelRef}
      data-floating-panel="calculator"
      tabIndex={isActive ? 0 : -1} // Focusable jen když je aktivní
      style={{
        left: position.x,
        top: position.y,
        outline: 'none', // Remove focus outline since we have custom styling
        opacity: computedOpacity,
      }}
      onMouseDown={(e) => {
        if (e.target.closest('button')) return; // Don't handle if clicking buttons
        if (!isActive && onEngage) {
          onEngage(); // Aktivovat kalkulačku na klik
        }
        handleMouseDown(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CalculatorHeader>
        <CalculatorTitle title="💰 Finanční kalkulačka - Ovládání: číslice 0-9, +, -, *, /, %, Enter/=, Backspace, Delete/C, ↑↓ (historie), M/R (paměť), Ctrl+M (M+), Ctrl+Shift+M (M-), Ctrl+C (kopírovat), Ctrl+L (vymazat historii), Escape (zavřít)">
          💰 Finanční kalkulačka
        </CalculatorTitle>
        <CloseButton onClick={onClose} onMouseDown={preventFocus} title="Zavřít kalkulačku (Escape)">
          <FontAwesomeIcon icon={faTimes} />
        </CloseButton>
      </CalculatorHeader>

      <Display data-display>
        {calculationHistory.length > 0 && (
          <HistoryList>
            {calculationHistory.map((item, index) => (
              <HistoryItem
                key={`${item.timestamp}-${index}`}
                $selected={index === selectedHistoryIndex}
                onClick={() => selectHistoryItem(index)}
                onMouseDown={preventFocus}
                title="Klikněte pro výběr tohoto výsledku"
              >
                <HistoryExpression>{item.expression}</HistoryExpression>
                <HistoryResult>{item.result}</HistoryResult>
              </HistoryItem>
            ))}
          </HistoryList>
        )}

        <DisplayOperation>{history}</DisplayOperation>
        <DisplayValue
          $selected={selectedHistoryIndex >= 0}
          $selectable={false}
        >
          {display}
        </DisplayValue>

        <div style={{
          fontSize: '10px',
          color: '#64748b',
          textAlign: 'center',
          marginTop: '4px',
          fontFamily: 'inherit',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⌨️ ↑↓ Historie • Ctrl+C Kopírovat • M/R Paměť</span>
          {memory !== 0 && (
            <span style={{
              background: '#6366f1',
              color: 'white',
              padding: '1px 4px',
              borderRadius: '3px',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>
              M: {memory}
            </span>
          )}
          {calculationHistory.length > 0 && (
            <button
              onClick={clearAll}
              onMouseDown={preventFocus}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title="Vymazat historii (Ctrl+L)"
            >
              Vymazat historii
            </button>
          )}
        </div>
      </Display>

      <ButtonGrid>
        <CalcButton
          $variant="clear"
          onClick={clear}
          onMouseDown={preventFocus}
          onDoubleClick={clearAll}
          title="Klik: Clear | Dvojklik: Vymazat historii"
        >
          C
        </CalcButton>
        <CalcButton $variant="operator" onClick={backspace} onMouseDown={preventFocus}>
          <FontAwesomeIcon icon={faBackspace} />
        </CalcButton>
        <CalcButton $variant="operator" onClick={() => performOperation('percentage')} onMouseDown={preventFocus}>%</CalcButton>
        <CalcButton $variant="operator" onClick={() => performOperation('divide')} onMouseDown={preventFocus}>÷</CalcButton>

        <CalcButton onClick={() => inputNumber('7')} onMouseDown={preventFocus}>7</CalcButton>
        <CalcButton onClick={() => inputNumber('8')} onMouseDown={preventFocus}>8</CalcButton>
        <CalcButton onClick={() => inputNumber('9')} onMouseDown={preventFocus}>9</CalcButton>
        <CalcButton $variant="operator" onClick={() => performOperation('multiply')} onMouseDown={preventFocus}>×</CalcButton>

        <CalcButton onClick={() => inputNumber('4')} onMouseDown={preventFocus}>4</CalcButton>
        <CalcButton onClick={() => inputNumber('5')} onMouseDown={preventFocus}>5</CalcButton>
        <CalcButton onClick={() => inputNumber('6')} onMouseDown={preventFocus}>6</CalcButton>
        <CalcButton $variant="operator" onClick={() => performOperation('subtract')} onMouseDown={preventFocus}>−</CalcButton>

        <CalcButton onClick={() => inputNumber('1')} onMouseDown={preventFocus}>1</CalcButton>
        <CalcButton onClick={() => inputNumber('2')} onMouseDown={preventFocus}>2</CalcButton>
        <CalcButton onClick={() => inputNumber('3')} onMouseDown={preventFocus}>3</CalcButton>
        <CalcButton $variant="operator" onClick={() => performOperation('add')} onMouseDown={preventFocus}>+</CalcButton>

        <CalcButton onClick={() => inputNumber('0')} onMouseDown={preventFocus} style={{ gridColumn: 'span 2' }}>0</CalcButton>
        <CalcButton onClick={inputDecimal} onMouseDown={preventFocus}>.</CalcButton>
        <CalcButton $variant="equals" onClick={handleEquals} onMouseDown={preventFocus}>
          <FontAwesomeIcon icon={faEquals} />
        </CalcButton>

        {/* Memory Row - dolní řada s MR společně */}
        <CalcButton
          $variant="memory"
          onClick={memoryRecall}
          onMouseDown={preventFocus}
          title="Memory Recall (M nebo R)"
          style={{ background: '#6366f1', fontSize: '14px', fontWeight: '600' }}
        >
          MR
        </CalcButton>
        <CalcButton
          $variant="memory"
          onClick={memoryClear}
          onMouseDown={preventFocus}
          title="Memory Clear (vymaže paměť)"
          style={{ background: '#6366f1', fontSize: '14px', fontWeight: '600' }}
        >
          MC
        </CalcButton>
        <CalcButton
          $variant="memory"
          onClick={memoryAdd}
          onMouseDown={preventFocus}
          title="Memory Add (Ctrl+M)"
          style={{ background: '#6366f1', fontSize: '14px', fontWeight: '600' }}
        >
          M+
        </CalcButton>
        <CalcButton
          $variant="memory"
          onClick={memorySubtract}
          onMouseDown={preventFocus}
          title="Memory Subtract (Ctrl+Shift+M)"
          style={{ background: '#6366f1', fontSize: '14px', fontWeight: '600' }}
        >
          M−
        </CalcButton>
      </ButtonGrid>
    </CalculatorPanel>
  );
};

export default FinancialCalculator;