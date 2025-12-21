---
agent: agent
name: JS-TAB
model: Claude Sonnet 4.5 (copilot)
---
**DŮLEŽITÉ: Komunikuj vždy v češtině.**

---

## 🎯 KRITICKÁ PRAVIDLA (vždy dodržovat)
pokude upravujeme nase tabulky na strance, tak vzdy dodrzuj nasledujici pravidla:

hlavicky tabulek:
- vzdy pouzivej `<th> abys mohl udelat podbarveni gradientem`
halvicka ma prvni radek zahlavi nazvy sloupcu
druhy radek ma tzv,. hledacky, vyhledavani ve sloupci
pak uz bezne radky
kazda tabulka by mela mit nas paginaci dole

vzhled vychozi te tabulky vzdy podle tabulky v soiboru Order25List,js

poseldni slouepc je vzdy akce/ zahlavi je symbol ikona blesku
ikonky mame drobne, do odstinu sedive, nebarvene

pri jakekoliv zmene vzdy over, po sobe zkontroluj spravne premisteni hledacku a jejich funkcnost. aby filtrovali tam kde maji

## 🎈 FLOATING HEADER PRO DLOUHÉ TABULKY

Pro tabulky s velkým množstvím dat implementuj floating header panel, který se zobrazí při scrollování:

### Implementace:

1. **State a refs:**
```js
const [showFloatingHeader, setShowFloatingHeader] = useState(false);
const [columnWidths, setColumnWidths] = useState([]);
const tableRef = useRef(null);
const headerSentinelRef = useRef(null);
```

2. **Sentinel element** (před tabulkou):
```jsx
<div ref={headerSentinelRef} style={{ height: '1px', visibility: 'hidden' }} />
<TableWrapper ref={tableRef}>
```

3. **Intersection Observer** (detekce scrollu):
```js
useEffect(() => {
  if (!headerSentinelRef.current) return;
  const totalHeaderHeight = 96 + 48; // header + menubar
  const observer = new IntersectionObserver(
    ([entry]) => setShowFloatingHeader(!entry.isIntersecting),
    { rootMargin: `-${totalHeaderHeight}px 0px 0px 0px`, threshold: 0 }
  );
  observer.observe(headerSentinelRef.current);
  return () => observer.disconnect();
}, []);
```

4. **Měření šířek sloupců:**
```js
useEffect(() => {
  const measureColumnWidths = () => {
    if (!tableRef.current) return;
    const headerCells = tableRef.current.querySelectorAll('thead tr:first-child th');
    const widths = Array.from(headerCells).map(cell => cell.offsetWidth);
    setColumnWidths(widths);
  };
  measureColumnWidths();
  window.addEventListener('resize', measureColumnWidths);
  const timer = setTimeout(measureColumnWidths, 100);
  return () => {
    window.removeEventListener('resize', measureColumnWidths);
    clearTimeout(timer);
  };
}, [data, loading]);
```

5. **Styled component:**
```js
const FloatingHeaderPanel = styled.div`
  position: fixed;
  top: calc(var(--app-header-height, 96px) + 48px);
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 85;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  border-top: 2px solid #cbd5e1;
  border-bottom: 3px solid #3b82f6;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: translateY(${props => props.$visible ? '0' : '-10px'});
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const FloatingTableWrapper = styled.div`
  overflow-x: auto;
  max-width: 100%;
  padding: 0 1rem;
  box-sizing: border-box;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
`;
```

6. **React Portal rendering** (před konečným `</>`):
```jsx
{ReactDOM.createPortal(
  <FloatingHeaderPanel $visible={showFloatingHeader}>
    <FloatingTableWrapper>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {columnWidths.length > 0 && (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={index} style={{ width: `${width}px` }} />
            ))}
          </colgroup>
        )}
        <TableHead>
          {/* Zkopíruj oba řádky: hlavičku + filtry */}
        </TableHead>
      </table>
    </FloatingTableWrapper>
  </FloatingHeaderPanel>,
  document.body
)}
```

7. **Import ReactDOM:**
```js
import ReactDOM from 'react-dom';
```

**Klíčové body:**
- Používej React Portal pro rendering mimo DOM hierarchii
- `colgroup` zajistí správné šířky sloupců
- Intersection Observer je výkonnější než scroll listener
- Z-index: 85 (pod menubar 90, nad obsahem)
- Zkopíruj kompletně oba řádky hlavičky (názvy + filtry)
- Všechny event handlery (onClick, onChange) fungují normálně

## DOPROUCENI 

- pokud heldaci pole je pole datumu tak pouzij nas datepicker, ale bez pridavny iokonek : dnes a smazat, vetsinou se to tamnevejde, a vypadato blbe

- nasledne radneover, zda filtrovani dle datumu vubec funguje


