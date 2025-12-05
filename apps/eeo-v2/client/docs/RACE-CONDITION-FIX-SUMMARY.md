# 🎯 Race Condition Fix - Přehled změn v OrderForm25.js

## Změněné soubory
- `/src/forms/OrderForm25.js` - hlavní komponenta formuláře

## Přidané stavy

```javascript
// Řádek ~3516 (přidáno PŘED existující isFormInitializing)
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
```

## Upravené funkce a useEffects

### 1. Funkce `initializeForm()` (řádek ~9125)
**Změny:**
- Přidáno `setIsLoadingCiselniky(true)` na začátku
- Přidáno `setIsLoadingCiselniky(false)` po úspěšném načtení
- Přidáno `setIsLoadingCiselniky(false)` v catch bloku

### 2. useEffect pro editaci objednávky (řádek ~9280)
**Změny:**
- Přidáno `setIsLoadingFormData(true)` před načítáním dat
- Přidáno `setIsLoadingFormData(false)` po úspěšném načtení
- Přidáno `setIsLoadingFormData(false)` v catch bloku

### 3. useEffect pro novou objednávku (řádek ~9235)
**Změny:**
- Přidáno `setIsLoadingFormData(true)` před načítáním draftu
- Přidáno `setIsLoadingFormData(false)` po dokončení

### 4. Loading Gate (řádek ~14270)
**Nová logika:**
```javascript
// Souhrn stavu načítání
const isFormLoading = React.useMemo(() => {
  if (isLoadingCiselniky) return true;
  if (isEditMode && isLoadingFormData) return true;
  return false;
}, [isLoadingCiselniky, isEditMode, isLoadingFormData]);

// Zobrazení splash screenu
if (isFormLoading) {
  return <LoadingOverlay>...</LoadingOverlay>;
}
```

## Pořadí načítání

```
┌─────────────────────────────────────────┐
│ 1. Mount komponenty                     │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 2. initializeForm()                     │
│    - setIsLoadingCiselniky(true)        │
│    - Načtení číselníků z API            │
│    - setIsLoadingCiselniky(false)       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 3. await dictionariesReadyPromise       │
│    (ČEKÁ na dokončení kroku 2)          │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 4a. loadOrderForEdit() [editace]       │
│     - setIsLoadingFormData(true)        │
│     - Načtení z DB                      │
│     - setIsLoadingFormData(false)       │
│                                         │
│ 4b. loadUserDataAndDraft() [nová]      │
│     - setIsLoadingFormData(true)        │
│     - Načtení draftu                    │
│     - setIsLoadingFormData(false)       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 5. Loading Gate                         │
│    isFormLoading = false                │
│    → VYKRESLENÍ FORMULÁŘE!              │
└─────────────────────────────────────────┘
```

## Testování

### Test 1: Nová objednávka
1. Otevřít `/order-form` (bez parametrů)
2. Ověřit, že se zobrazí splash screen "Načítám číselníky..."
3. Ověřit, že po načtení se formulář zobrazí s prázdnými poli
4. Ověřit, že všechny `<select>` boxy jsou správně naplněné

### Test 2: Editace objednávky
1. Otevřít `/order-form?edit=123`
2. Ověřit, že se zobrazí splash screen "Načítám číselníky a data objednávky..."
3. Ověřit, že po načtení se formulář zobrazí s daty z DB
4. **KRITICKÉ:** Ověřit, že `<select>` boxy jsou SPRÁVNĚ vyplněné hodnotami z DB
   - Například: pokud DB vrací `cityId: 10`, select musí zobrazit "Praha"

### Test 3: Race condition (simulace)
1. Otevřít DevTools → Network tab
2. Nastavit "Slow 3G" throttling
3. Otevřít `/order-form?edit=123`
4. Ověřit, že:
   - Splash screen zůstane viditelný až do načtení VŠECH dat
   - Po načtení jsou všechny selecty správně vyplněné
   - **NE:** Select je prázdný i když data dorazila (= race condition)

## Přínosy

✅ **Žádné race conditions** - číselníky se načtou VŽDY před daty  
✅ **Čistý kód** - žádné wrappery, pouze hooks  
✅ **Přehledné stavy** - jasně definované loading stavy  
✅ **Zpětná kompatibilita** - původní kód zůstává funkční  
✅ **Dobrá UX** - dynamické zprávy o průběhu načítání  

## Poznámky

- Původní `isFormInitializing` je zachován jako fallback
- `dictionariesReadyPromiseRef` zajišťuje správné pořadí načítání
- `useMemo` pro `isFormLoading` optimalizuje re-rendery
- Loading zprávy jsou dynamické podle aktuálního stavu

---

**Hotovo!** Komponenta nyní korektně řeší race condition mezi číselníky a daty formuláře.
