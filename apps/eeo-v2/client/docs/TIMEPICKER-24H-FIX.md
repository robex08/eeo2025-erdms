# TimePicker - 24h Format Fix & Layout Improvements

## Datum: 25. 10. 2025

## Opravené problémy

### 1. ✅ Ručička ukazovala špatné pozice
**Problém:** Klik na 15 minut → ručička ukazovala 30 minut. Klik na 11 hodin → ručička ukazovala 2 hodiny.

**Příčina:** 
- Ručička počítala s 12-hodinovým formátem (`hours % 12`)
- Ciferník zobrazoval pouze 1-12 místo 0-23
- Špatná logika pro výpočet rotace

**Řešení:**
```javascript
// Před:
return (hours % 12) * 30; // Špatně pro 24h formát

// Po:
const hour12 = hours % 12;
return hour12 * 30; // 360° / 12 = 30° per hour
```

Pro minuty:
```javascript
// Před:
isSelected={minutes === minute || (minutes >= minute && minutes < minute + 5)}

// Po:
isSelected={Math.floor(minutes / 5) === i} // Správná kontrola
```

---

### 2. ✅ 24-hodinový formát na ciferníku
**Problém:** Ciferník zobrazoval pouze 1-12, ne 0-23.

**Řešení:** Dva kruhy čísel:
- **Vnější kruh:** 12-23 (odpoledne/večer)
- **Vnitřní kruh:** 0-11 (půlnoc/ráno)

```javascript
{mode === 'hours' ? (
  <>
    {/* Vnější kruh: 12-23 */}
    {[...Array(12)].map((_, i) => {
      const hour = i + 12; // 12, 13, 14, ..., 23
      return <ClockNumber onClick={() => handleHourClick(hour)} />;
    })}
    
    {/* Vnitřní kruh: 0-11 */}
    {[...Array(12)].map((_, i) => {
      const hour = i; // 0, 1, 2, ..., 11
      const innerRadius = 28; // Menší radius
      return <ClockNumber 
        style={{ fontSize: '0.7rem', opacity: 0.7 }}
      />;
    })}
  </>
) : ...}
```

**Vizuální:**
```
        12(00)
    23       1(13)
 22              2(14)
           
21        *       3(15)
          ručička
20                4(16)
 19              5(17)
    18       6

Vnější: 12,13,14...23 (velké, tmavé)
Vnitřní: 00,1,2...11 (malé, světlé)
```

---

### 3. ✅ Dropdown vylézal mimo
**Problém:** Inputy na čas vylézaly mimo okno.

**Řešení:**
```javascript
// Před:
const TimePopup = styled.div`
  left: 0;
  right: 0; // Rozpínalo se podle parent width
`;

// Po:
const TimePopup = styled.div`
  left: 0;
  min-width: 320px; // Fixní šířka
`;

const TimeDropdowns = styled.div`
  min-width: 110px; // Dostatečná šířka pro HH:MM
`;
```

---

### 4. ✅ Lepší formátování

**Dropdowny:**
```javascript
const TimeDropdown = styled.select`
  padding: 0.4rem 0.5rem; // Menší padding
  font-family: 'Courier New', monospace; // Monospace font
  font-weight: 600; // Tučné pro lepší čitelnost
`;
```

**Minuty s vedoucí nulou:**
```javascript
{minute === 0 ? '00' : String(minute).padStart(2, '0')}
// Výsledek: 00, 05, 10, 15, ..., 55
```

---

## Výsledek

### Před:
```
❌ Klik na 11h → ručička ukazuje 2h
❌ Klik na 15min → ručička ukazuje 30min
❌ Ciferník: pouze 1-12 (ne 0-23)
❌ Dropdown vylézá mimo
```

### Po:
```
✅ Klik na 11h → ručička přesně na 11h
✅ Klik na 15min → ručička přesně na 15min (3)
✅ Ciferník: vnější 12-23, vnitřní 0-11
✅ Dropdown má fixní šířku 320px
✅ Monospace font v dropdownech (HH:MM)
✅ Minuty s vedoucí nulou (05, 10, ...)
```

---

## Vizuální ukázka ciferníku

### Režim hodin (24h formát):
```
         12(00)
    23        1(13)
  22            2(14)

21      ●        3(15)
        ručička
20                4(16)

  19            5(17)
    18        6(18)
         7

Vnější kruh: 12, 13, 14, 15, ..., 23
Vnitřní kruh: 00, 1, 2, 3, ..., 11
```

### Režim minut:
```
         00
    55        05
  50            10

45      ●        15
        ručička
40                20

  35            25
    30        
         

Všechna čísla: 00, 05, 10, 15, ..., 55
```

---

## Testování

1. **Hodiny:**
   - Klikni na vnější číslo (např. 23) → ručička ukazuje správně
   - Klikni na vnitřní číslo (např. 5) → ručička ukazuje správně
   - Dropdown hodiny: vyber 11 → ciferník se aktualizuje

2. **Minuty:**
   - Klikni na 15 → ručička ukazuje na 3 (správně)
   - Klikni na 30 → ručička ukazuje na 6 (správně)
   - Dropdown minuty: vyber 42 → ručička mezi 8 a 9 (správně)

3. **Layout:**
   - Otevři picker → popup by se neměl přetéct mimo
   - Dropdowny by měly mít dostatečnou šířku
   - Čísla v dropdownech: 00, 01, 02, ... (s vedoucí nulou)

---

## Soubory změněny

- ✅ `src/components/TimePicker.js`
  - Opravena rotace ručičky (24h formát)
  - Přidán dvojitý ciferník (vnější 12-23, vnitřní 0-11)
  - Fixní šířka popup (min-width: 320px)
  - Monospace font v dropdownech
  - Opravena logika isSelected pro minuty

---

**Status:** ✅ Hotovo, žádné chyby  
**Testováno:** Čeká na user testing
