# TODO Alarm - Custom DatePicker Implementation

## Změny

### 1. Vytvoření samostatného DatePicker komponentu
**Soubor:** `src/components/DatePicker.js`

- Extrahována komponenta DatePicker z OrderForm25.js
- Plně funkční kalendářní picker s českým lokalizováním
- Podporuje:
  - Výběr data z kalendáře
  - Navigace mezi měsíci (◀ ▶)
  - Tlačítko "Dnes" (📅) - rychlé nastavení dnešního data
  - Tlačítko "Smazat" (✕) - vymazání data
  - Click outside pro zavření
  - Zvýraznění dnešního dne
  - Zvýraznění vybraného dne
  - Disabled stav

### 2. Integrace do TodoPanel
**Soubor:** `src/components/panels/TodoPanel.js`

#### Změny v importech:
```javascript
import DatePicker from '../DatePicker';
```

#### Změny v alarm modalu:
Nahrazeno:
```javascript
<input 
  type="date" 
  value={date} 
  onChange={e => setDate(e.target.value)}
  style={{...}}
/>
```

Za:
```javascript
<DatePicker
  value={date}
  onChange={(newDate) => setDate(newDate)}
  placeholder="Vyberte datum"
/>
```

## Props API

### DatePicker Component

```typescript
interface DatePickerProps {
  value: string;          // Hodnota data ve formátu YYYY-MM-DD
  onChange: (newValue: string) => void;  // Callback pro změnu hodnoty
  disabled?: boolean;     // Zda je picker disabled (default: false)
  hasError?: boolean;     // Zda má picker chybový stav (default: false)
  placeholder?: string;   // Placeholder text (default: 'Vyberte datum')
}
```

## UI Vylepšení

### Původní nativní picker
- ❌ Závislý na browseru (různý vzhled)
- ❌ Obtížně stylizovatelný
- ❌ Špatná UX na mobilu
- ❌ Žádné quick actions (dnes, zítra)

### Nový vlastní picker
- ✅ Konzistentní vzhled napříč browsery
- ✅ Plně stylizovatelný
- ✅ Lepší UX - kalendář s navigací
- ✅ Quick actions: "Dnes" tlačítko
- ✅ Tlačítko pro smazání
- ✅ Emoji ikony pro lepší vizuální identifikaci
- ✅ Česká lokalizace (Po, Út, St, ...)
- ✅ Zvýraznění dnešního dne (modrý background)
- ✅ Zvýraznění vybraného dne (tmavomodrý)
- ✅ Hover efekty

## Styling

### Barvy
- **Primary:** #3b82f6 (modrá)
- **Today:** #dbeafe (světle modrá)
- **Selected:** #3b82f6 (modrá)
- **Clear:** #ef4444 (červená)
- **Success (Dnes):** #10b981 (zelená)

### Animace
- Scale na hover (1.1x)
- Smooth transitions (0.2s ease)
- Box shadow on focus

## Použití jinde v aplikaci

DatePicker je nyní standalone komponenta a může být použita kdekoli:

```javascript
import DatePicker from './components/DatePicker';

function MyComponent() {
  const [date, setDate] = useState('');
  
  return (
    <DatePicker
      value={date}
      onChange={setDate}
      placeholder="Vyberte datum objednávky"
    />
  );
}
```

## Testování

1. Otevři TODO panel
2. Klikni na ikonu zvonku (🔔) u nějakého TODO
3. V sekci "Datum" by měl být nový picker s ikonou kalendáře
4. Klikni na picker → otevře se kalendář
5. Testuj funkce:
   - Navigace mezi měsíci (◀ ▶)
   - Výběr konkrétního dne (klik na číslo)
   - Tlačítko "Dnes" (zelené 📅 vpravo)
   - Tlačítko "Smazat" (červený ✕)
   - Quick action v kalendáři: "Dnes", "Smazat"
   - Click mimo kalendář → zavře se

## Soubory změněny

- ✅ `src/components/DatePicker.js` (NOVÝ)
- ✅ `src/components/panels/TodoPanel.js` (import + použití)

## Related Components

- OrderForm25.js - Původní místo DatePickeru (tam zůstává také)
- NotesPanel.js - Mohla by potenciálně použít DatePicker pokud by potřebovala datum

## Výhody pro budoucnost

- **Reusability:** Picker může být použit kdekoli
- **Consistency:** Stejný vzhled a chování napříč aplikací
- **Maintainability:** Změny na jednom místě
- **Accessibility:** Lepší než nativní pickery
- **Mobile-friendly:** Touch optimized

---

**Implementováno:** 2025-01-XX  
**Autor:** GitHub Copilot  
**Status:** ✅ Hotovo, žádné ESLint chyby
