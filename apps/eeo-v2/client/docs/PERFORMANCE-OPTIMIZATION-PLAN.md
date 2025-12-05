# 🚀 Performance Optimization Plan - OrderForm25

**Datum:** 29. října 2025  
**Komponenta:** OrderForm25.js (22,475 řádků)  
**Cíl:** Optimalizovat render performance pomocí React.memo, useMemo, useCallback

---

## 📊 Aktuální Analýza

### Detekované Performance Problémy

1. **Velký monolitický formulář** - 22,475 řádků v jedné komponentě
2. **Časté re-rendery** - Každá změna formData způsobí re-render celého formuláře
3. **Expensive computations** - Kalkulace, validace, transformace dat běží při každém renderu
4. **Nested inline komponenty** - Desítky anonymních komponent v JSX
5. **Neoptimalizované selecty** - Dropdown menu se renderuje při každé změně
6. **Faktury a položky** - Arrays se kompletně re-renderují při změně jedné položky

### Už Implementováno ✅

```javascript
export default React.memo(OrderForm25); // ✅ Hlavní komponenta je memoizovaná
```

---

## 🎯 Optimalizační Strategie

### 1. **Rozdělit na Sub-komponenty** (Nejvyšší priorita)

#### A) Extrahovat Form Sections
Každá sekce formuláře by měla být samostatná memoizovaná komponenta:

```javascript
// src/forms/OrderForm25/components/sections/ObjednatelSection.jsx
import React from 'react';

const ObjednatelSection = React.memo(({ 
  formData, 
  onFieldChange, 
  onFieldBlur,
  isCollapsed,
  onToggle,
  isLocked,
  errors 
}) => {
  return (
    <FormSection>
      {/* Obsah sekce objednatele */}
    </FormSection>
  );
});

export default ObjednatelSection;
```

**Sekce k extrakci:**
- `ObjednatelSection` - Základní info o objednateli
- `SchvaleniSection` - Schvalovací proces
- `FinancovaniSection` - Financování a střediska
- `DodavatelSection` - Info o dodavateli + kontakty
- `DetailySection` - Druh objednávky, položky
- `DodaciPodminkySection` - Dodací podmínky
- `StavOdeslaniSection` - Stav odeslání
- `FakturySection` - Seznam faktur (nejvíc náročná)
- `PrilohySection` - Přílohy objednávky

#### B) Extrahovat Item Components

```javascript
// src/forms/OrderForm25/components/PolozkaItem.jsx
const PolozkaItem = React.memo(({ 
  polozka, 
  index, 
  onUpdate, 
  onDelete, 
  isLocked,
  strediskaOptions,
  financovaniOptions 
}) => {
  const handleChange = useCallback((field, value) => {
    onUpdate(polozka.id, field, value);
  }, [polozka.id, onUpdate]);

  return (
    <div className="polozka-item">
      {/* Obsah položky */}
    </div>
  );
});

export default PolozkaItem;
```

```javascript
// src/forms/OrderForm25/components/FakturaItem.jsx
const FakturaItem = React.memo(({ 
  faktura, 
  index, 
  onUpdate, 
  onDelete, 
  isLocked,
  typyFakturOptions,
  strediskaOptions 
}) => {
  // Memoizace handlers
  const handleChange = useCallback((field, value) => {
    onUpdate(faktura.id, field, value);
  }, [faktura.id, onUpdate]);

  // Memoizace computed values
  const castkaSDph = useMemo(() => {
    return calculateDPH(faktura.fa_castka_bez_dph, faktura.fa_sazba_dph);
  }, [faktura.fa_castka_bez_dph, faktura.fa_sazba_dph]);

  return (
    <div className="faktura-item">
      {/* Obsah faktury */}
    </div>
  );
});

export default FakturaItem;
```

---

### 2. **useMemo pro Expensive Computations**

#### Kalkulace a Transformace

```javascript
// ❌ PŘED - běží při každém renderu
const totalPrice = formData.polozky_objednavky?.reduce((sum, p) => {
  return sum + (parseFloat(p.cena_s_dph) || 0);
}, 0) || 0;

// ✅ PO - běží jen když se polozky změní
const totalPrice = useMemo(() => {
  return formData.polozky_objednavky?.reduce((sum, p) => {
    return sum + (parseFloat(p.cena_s_dph) || 0);
  }, 0) || 0;
}, [formData.polozky_objednavky]);
```

#### Filtrace a Mapování

```javascript
// ❌ PŘED
const activeUsers = allUsers.filter(u => u.aktivni);
const userOptions = activeUsers.map(u => ({ 
  value: u.id, 
  label: `${u.prijmeni} ${u.jmeno}` 
}));

// ✅ PO
const userOptions = useMemo(() => {
  return allUsers
    .filter(u => u.aktivni)
    .map(u => ({ 
      value: u.id, 
      label: `${u.prijmeni} ${u.jmeno}` 
    }));
}, [allUsers]);
```

#### Validace

```javascript
// ❌ PŘED - validuje při každém renderu
const isFormValid = validateForm(formData, currentPhase);

// ✅ PO
const isFormValid = useMemo(() => {
  return validateForm(formData, currentPhase);
}, [formData, currentPhase]);
```

#### Seznam expensive operací k optimalizaci:

1. **Cenové kalkulace**
   - `totalPrice` - suma všech položek
   - `totalFaktury` - suma všech faktur
   - `prekroceniMaxCeny` - porovnání faktury vs max cena
   - DPH kalkulace pro každou položku/fakturu

2. **Transformace dat pro selecty**
   - `strediskaOptions` - transformace číselníku
   - `financovaniOptions` - transformace číselníku
   - `userOptions` - filtrace a transformace uživatelů
   - `approverOptions` - filtrace schvalovatelů

3. **Workflow výpočty**
   - `currentPhase` - aktuální fáze workflow
   - `canTransition` - možné přechody
   - `sectionVisibility` - viditelnost sekcí
   - `fieldEditability` - editovatelnost polí

4. **Validace**
   - `isFormValid` - celková validace
   - `hasRequiredFields` - kontrola povinných polí
   - `validationErrors` - seznam chyb

---

### 3. **useCallback pro Event Handlers**

#### Field Change Handlers

```javascript
// ❌ PŘED - vytváří se nový handler při každém renderu
const handleFieldChange = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

// ✅ PO
const handleFieldChange = useCallback((field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
}, []); // Žádné dependencies - setFormData je stabilní
```

#### Array Item Handlers

```javascript
// ✅ Optimalizovaný handler pro položky
const updatePolozka = useCallback((polozkaId, field, value) => {
  setFormData(prev => ({
    ...prev,
    polozky_objednavky: prev.polozky_objednavky.map(p =>
      p.id === polozkaId ? { ...p, [field]: value } : p
    )
  }));
}, []);

const deletePolozka = useCallback((polozkaId) => {
  setFormData(prev => ({
    ...prev,
    polozky_objednavky: prev.polozky_objednavky.filter(p => p.id !== polozkaId)
  }));
}, []);

const addPolozka = useCallback(() => {
  setFormData(prev => ({
    ...prev,
    polozky_objednavky: [
      ...prev.polozky_objednavky,
      { id: Date.now(), popis: '', cena_bez_dph: '', sazba_dph: '21', cena_s_dph: '' }
    ]
  }));
}, []);
```

#### Seznam handlers k optimalizaci:

1. **Form field handlers**
   - `handleFieldChange`
   - `handleFieldBlur`
   - `handleSelectChange`
   - `handleMultiSelectChange`

2. **Array handlers**
   - `updatePolozka` / `deletePolozka` / `addPolozka`
   - `updateFaktura` / `deleteFaktura` / `addFaktura`
   - `updatePriloha` / `deletePriloha`

3. **Section handlers**
   - `toggleSection`
   - `expandAllSections`
   - `collapseAllSections`

4. **API handlers**
   - `handleSave`
   - `handleSubmit`
   - `handleApprove`
   - `handleReject`

---

### 4. **Custom Select Optimalizace**

Současný problém: Custom select komponenty se re-renderují příliš často.

```javascript
// src/forms/OrderForm25/components/OptimizedSelect.jsx
const OptimizedSelect = React.memo(({ 
  options, 
  value, 
  onChange, 
  placeholder,
  disabled,
  isMulti,
  ...props 
}) => {
  // Memoize filtered options
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const normalized = normalizeText(searchTerm);
    return options.filter(opt => 
      normalizeText(opt.label).includes(normalized)
    );
  }, [options, searchTerm]);
  
  const handleChange = useCallback((newValue) => {
    onChange(newValue);
  }, [onChange]);
  
  return (
    <SelectWrapper>
      {/* Select implementation */}
    </SelectWrapper>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - re-render only if these change
  return (
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.options.length === nextProps.options.length
  );
});

export default OptimizedSelect;
```

---

### 5. **List Rendering Optimalizace**

#### Virtualizace dlouhých seznamů

Pro seznamy s 50+ položkami použít virtualizaci:

```bash
npm install react-window
```

```javascript
import { FixedSizeList } from 'react-window';

const VirtualizedPolozkyList = React.memo(({ polozky, onUpdate, onDelete }) => {
  const Row = useCallback(({ index, style }) => {
    const polozka = polozky[index];
    return (
      <div style={style}>
        <PolozkaItem
          polozka={polozka}
          index={index}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    );
  }, [polozky, onUpdate, onDelete]);

  return (
    <FixedSizeList
      height={600}
      itemCount={polozky.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
});
```

---

### 6. **Lazy Loading Sections**

Těžké sekce (faktury, přílohy) načíst jen když jsou expandované:

```javascript
const FakturySection = React.lazy(() => 
  import('./sections/FakturySection')
);

// V render:
{!sectionStates.faktury && (
  <Suspense fallback={<LoadingSpinner />}>
    <FakturySection {...props} />
  </Suspense>
)}
```

---

## 📋 Implementační Checklist

### Phase 1: Quick Wins (1-2 hodiny)

- [ ] Přidat `useMemo` pro všechny cenové kalkulace
- [ ] Přidat `useMemo` pro transformace číselníků
- [ ] Přidat `useCallback` pro všechny event handlers
- [ ] Přidat `useMemo` pro workflow výpočty
- [ ] Přidat `useMemo` pro validace

### Phase 2: Component Extraction (4-6 hodin)

- [ ] Extrahovat `ObjednatelSection`
- [ ] Extrahovat `SchvaleniSection`
- [ ] Extrahovat `FinancovaniSection`
- [ ] Extrahovat `DodavatelSection`
- [ ] Extrahovat `DetailySection`
- [ ] Extrahovat `PolozkaItem`
- [ ] Extrahovat `FakturaItem`
- [ ] Extrahovat `PrilohySection`

### Phase 3: Advanced Optimizations (3-4 hodiny)

- [ ] Implementovat `OptimizedSelect`
- [ ] Přidat virtualizaci pro dlouhé seznamy
- [ ] Implementovat lazy loading pro těžké sekce
- [ ] Přidat React DevTools Profiler monitoring

### Phase 4: Testing & Validation (2 hodiny)

- [ ] Změřit FPS při scrollování
- [ ] Změřit čas prvního renderu
- [ ] Změřit čas re-renderu při změně pole
- [ ] Validovat že vše funguje stejně
- [ ] Otestovat edge cases

---

## 📈 Očekávané Výsledky

### Metriky k měření:

1. **First Render Time** - Čas prvního zobrazení formuláře
   - Aktuální: ~2-3s (odhad)
   - Cíl: <1s

2. **Re-render Time** - Čas aktualizace při změně pole
   - Aktuální: ~200-300ms
   - Cíl: <50ms

3. **Scroll Performance** - FPS při scrollování
   - Aktuální: ~30-40 FPS
   - Cíl: 60 FPS

4. **Memory Usage** - Spotřeba RAM
   - Aktuální: ~150MB
   - Cíl: <100MB

### Použití React DevTools Profiler:

```javascript
import { Profiler } from 'react';

<Profiler id="OrderForm25" onRender={onRenderCallback}>
  <OrderForm25 />
</Profiler>
```

---

## 🔧 Příklady Kódu

### Před Optimalizací:

```javascript
// ❌ Vše v jedné komponentě, žádná memoizace
function OrderForm25() {
  const totalPrice = formData.polozky_objednavky.reduce(...); // Běží pořád
  
  const handleChange = (field, value) => { // Nová funkce při každém renderu
    setFormData(...);
  };
  
  return (
    <div>
      {formData.polozky_objednavky.map((polozka, index) => (
        <div key={index}> {/* Anonymní komponenta, vždy re-render */}
          <input onChange={e => handleChange(...)} /> {/* Nová funkce */}
        </div>
      ))}
    </div>
  );
}
```

### Po Optimalizaci:

```javascript
// ✅ Rozděleno, memoizováno, optimalizováno
function OrderForm25() {
  const totalPrice = useMemo(() => 
    formData.polozky_objednavky.reduce(...)
  , [formData.polozky_objednavky]); // Jen když se polozky změní
  
  const handleChange = useCallback((field, value) => {
    setFormData(...);
  }, []); // Stabilní funkce
  
  const updatePolozka = useCallback((id, field, value) => {
    setFormData(prev => ({
      ...prev,
      polozky_objednavky: prev.polozky_objednavky.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    }));
  }, []);
  
  return (
    <div>
      {formData.polozky_objednavky.map(polozka => (
        <PolozkaItem // Memoizovaná komponenta
          key={polozka.id}
          polozka={polozka}
          onUpdate={updatePolozka} // Stabilní callback
        />
      ))}
    </div>
  );
}

const PolozkaItem = React.memo(({ polozka, onUpdate }) => {
  // Re-render jen když se polozka nebo onUpdate změní
  return <div>...</div>;
});
```

---

## 🚨 Důležité Poznámky

1. **Nememoizovat všechno** - Pouze expensive operace a komponenty s častými re-rendery
2. **Testovat po každé změně** - Ověřit že optimalizace opravdu pomáhá
3. **Měřit performance** - Používat React DevTools Profiler
4. **Postupně** - Implementovat po částech, ne najednou
5. **Backwards compatibility** - Zachovat všechnu funkcionalitu

---

## 📚 Resources

- [React.memo docs](https://react.dev/reference/react/memo)
- [useMemo docs](https://react.dev/reference/react/useMemo)
- [useCallback docs](https://react.dev/reference/react/useCallback)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [react-window](https://github.com/bvaughn/react-window)

---

**Autor:** GitHub Copilot  
**Datum:** 29. října 2025
