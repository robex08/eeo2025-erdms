# Implementace řešení Race Condition v OrderForm25

## 📋 Přehled problému

**Původní problém:**
- Formulář má dva režimy: "Nový" (prázdný) a "Editace" (načítá data podle `formId` z API)
- Formulář potřebuje číselníky (seznamy pro `<select>` boxy), které se načítají z API
- V režimu "Editace" se stávalo, že data formuláře (např. `{ "cityId": 10 }`) se načetla dříve, než byly k dispozici číselníky (např. `[{ id: 10, name: 'Praha' }]`)
- Výsledek: `<select>` boxy se nevyplnily správně, přestože data dorazila

## ✅ Implementované řešení

### 1. Přidané stavy (useState)

```javascript
// 🎯 NOVÉ STAVY PRO ŘEŠENÍ RACE CONDITION
// Stav načítání číselníků (selecty, dropdown options)
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
// Stav načítání dat formuláře (editace objednávky)
const [isLoadingFormData, setIsLoadingFormData] = useState(false);
```

**Účel:**
- `isLoadingCiselniky` - sleduje, zda se aktuálně načítají číselníky (uživatelé, střediska, financování, atd.)
- `isLoadingFormData` - sleduje, zda se aktuálně načítají data objednávky z databáze (pouze v editačním režimu)

### 2. Logika načítání číselníků (initializeForm)

**Upravená funkce:**
```javascript
const initializeForm = async () => {
  // ... validace tokenu ...
  
  try {
    setIsFormInitializing(true);
    setIsLoadingCiselniky(true); // 🎯 NOVÉ: Začínáme načítat číselníky
    
    // ... načítání číselníků přes FormDataManager ...
    
    // Po úspěšném načtení:
    setAreDictionariesReady(true);
    setIsLoadingCiselniky(false); // 🎯 NOVÉ: Číselníky jsou načtené!
    
  } catch (error) {
    setIsLoadingCiselniky(false); // 🎯 NOVÉ: Chyba při načítání
  }
};
```

**Kdy se spouští:**
- Automaticky při mount komponenty (`useEffect` s prázdnými dependencies)
- VŽDY jako první krok - před načítáním jakýchkoliv dat formuláře

### 3. Logika načítání dat formuláře - EDITACE (useEffect)

**Pro editační režim (`?edit=ID`):**
```javascript
useEffect(() => {
  const loadOrderForEdit = async () => {
    if (!editOrderId || !token || !username) {
      return;
    }
    
    // ✅ ČEKEJ na Promise dokud nejsou číselníky hotové
    await dictionariesReadyPromiseRef.current;
    
    // 🎯 NOVÉ: Nastavit stav načítání dat formuláře
    setIsLoadingFormData(true);
    
    try {
      // ... načítání objednávky z DB ...
      
      setFormData(transformedData);
      setIsLoadingFormData(false); // 🎯 Dokončeno
      
    } catch (error) {
      setIsLoadingFormData(false); // 🎯 Chyba
    }
  };
  
  loadOrderForEdit();
}, [editOrderId, token, username, archivovanoParam, isFormInitializing]);
```

**Klíčové body:**
- Čeká na Promise `dictionariesReadyPromiseRef.current` - garantuje, že číselníky jsou načtené
- Nastaví `isLoadingFormData = true` před načítáním
- Nastaví `isLoadingFormData = false` po dokončení (úspěch i chyba)

### 4. Logika načítání dat formuláře - NOVÝ (useEffect)

**Pro novou objednávku (bez `?edit`):**
```javascript
useEffect(() => {
  // Spustit POUZE pro NOVOU objednávku (ne editaci)
  if (editOrderId) {
    return;
  }

  const loadUserDataAndDraft = async () => {
    // ✅ ČEKEJ na Promise dokud nejsou číselníky hotové
    await dictionariesReadyPromiseRef.current;
    
    // 🎯 NOVÉ: Číselníky jsou načtené, teď načteme draft
    setIsLoadingFormData(true);
    
    const draftLoaded = await loadDraft();
    
    // ... aplikace draftu nebo výchozích hodnot ...
    
    setIsLoadingFormData(false); // 🎯 Dokončeno
    setIsDraftLoaded(true);
  };
  
  loadUserDataAndDraft();
}, [editOrderId, isDraftLoaded, userDetail, user_id, isNewOrder, token, username]);
```

### 5. Implementace "Loading Gate"

**Souhrn stavu načítání:**
```javascript
// 🎯 NOVÁ LOADING GATE: Souhrn všech načítání pro RACE CONDITION FIX
const isFormLoading = React.useMemo(() => {
  // 1. Pokud se načítají číselníky, formulář NENÍ připraven
  if (isLoadingCiselniky) {
    return true;
  }
  
  // 2. V EDITAČNÍM REŽIMU: Pokud se načítají data formuláře, formulář NENÍ připraven
  if (isEditMode && isLoadingFormData) {
    return true;
  }
  
  // 3. Všechna data jsou připravena!
  return false;
}, [isLoadingCiselniky, isEditMode, isLoadingFormData]);
```

**Loading Gate implementace:**
```javascript
// 🎯 LOADING GATE: Zobrazit splash screen dokud nejsou data připravena
if (isFormLoading) {
  return (
    <LoadingOverlay $visible={true}>
      <LoadingSpinner $visible={true} />
      <LoadingMessage $visible={true}>
        {isLoadingCiselniky && !isLoadingFormData && 'Načítám číselníky...'}
        {isLoadingCiselniky && isLoadingFormData && 'Načítám číselníky a data objednávky...'}
        {!isLoadingCiselniky && isLoadingFormData && 'Načítám data objednávky...'}
      </LoadingMessage>
      <LoadingSubtext $visible={true}>
        {isLoadingCiselniky && 'Zpracovávám seznamy pro výběrová pole...'}
        {!isLoadingCiselniky && isLoadingFormData && 'Zpracovávám data z databáze...'}
      </LoadingSubtext>
    </LoadingOverlay>
  );
}

// TEPRVE NYNÍ se vykreslí formulář - data jsou GARANTOVANĚ připravená!
const formContent = (
  <Container isFullscreen={isFullscreen}>
    {/* ... tělo formuláře ... */}
  </Container>
);
```

## 🎯 Jak to funguje - Pořadí operací

### Scénář A: Nová objednávka (bez `?edit`)

1. **Mount komponenty** → `useEffect` volá `initializeForm()`
2. **`initializeForm()`**:
   - Nastaví `isLoadingCiselniky = true`
   - Načte číselníky (uživatelé, střediska, financování, ...)
   - Nastaví `isLoadingCiselniky = false`
   - Resolve-uje `dictionariesReadyPromiseRef`
3. **`loadUserDataAndDraft()`**:
   - Čeká na `dictionariesReadyPromiseRef` (číselníky připravené)
   - Nastaví `isLoadingFormData = true`
   - Načte draft z localStorage (pokud existuje)
   - Nastaví `isLoadingFormData = false`
4. **Loading Gate**:
   - `isFormLoading = false` → formulář se vykreslí s daty!

### Scénář B: Editace objednávky (`?edit=123`)

1. **Mount komponenty** → `useEffect` volá `initializeForm()`
2. **`initializeForm()`**:
   - Nastaví `isLoadingCiselniky = true`
   - Načte číselníky
   - Nastaví `isLoadingCiselniky = false`
   - Resolve-uje `dictionariesReadyPromiseRef`
3. **`loadOrderForEdit()`**:
   - Čeká na `dictionariesReadyPromiseRef` (KRITICKÉ - zaručuje načtené číselníky!)
   - Nastaví `isLoadingFormData = true`
   - Načte objednávku z DB
   - Parsuje data (střediska, financování, faktury, ...)
   - Nastaví `isLoadingFormData = false`
4. **Loading Gate**:
   - `isFormLoading = false` → formulář se vykreslí s daty!
   - **Select boxy jsou SPRÁVNĚ naplněné**, protože číselníky byly načtené PŘED daty!

## 📊 Výhody implementace

✅ **Eliminace Race Condition**
- Data formuláře se nikdy nenačtou dříve než číselníky
- Promise `dictionariesReadyPromiseRef` garantuje správné pořadí

✅ **Čistý kód bez wrapperů**
- Žádné nové komponenty
- Pouze základní React Hooks (`useState`, `useEffect`, `useMemo`)

✅ **Přehledné loading stavy**
- Uživatel vidí dynamické zprávy o průběhu načítání
- `isFormLoading` sdružuje všechny loading stavy na jednom místě

✅ **Zpětná kompatibilita**
- Původní `isFormInitializing` je zachován jako fallback
- Existující kód zůstává funkční

✅ **Testovatelnost**
- Každý stav má jasně definovaný význam
- Loading gate je izolovaná logika (useMemo)

## 🔍 Klíčové komponenty řešení

| Komponenta | Účel | Kdy je `true` |
|-----------|------|---------------|
| `isLoadingCiselniky` | Načítání číselníků | Během volání API pro číselníky |
| `isLoadingFormData` | Načítání dat formuláře | Během načítání objednávky z DB nebo draftu |
| `isFormLoading` | Souhrn všech loadingů | Pokud `isLoadingCiselniky` NEBO (`isEditMode` A `isLoadingFormData`) |
| `dictionariesReadyPromiseRef` | Promise pro čekání | Resolve-uje se po načtení číselníků |

## 🚀 Použití v podobných komponentách

Pokud máte podobný problém s race condition v jiné komponentě, použijte tento pattern:

```javascript
// 1. Stavy
const [isLoadingCiselniky, setIsLoadingCiselniky] = useState(true);
const [isLoadingFormData, setIsLoadingFormData] = useState(false);

// 2. Promise pro čekání
const dictionariesReadyPromiseRef = useRef(null);
const dictionariesReadyResolveRef = useRef(null);

// 3. Načítání číselníků
useEffect(() => {
  const loadDictionaries = async () => {
    setIsLoadingCiselniky(true);
    // ... načítání ...
    setIsLoadingCiselniky(false);
    dictionariesReadyResolveRef.current?.(true);
  };
  loadDictionaries();
}, []);

// 4. Načítání dat formuláře
useEffect(() => {
  const loadData = async () => {
    await dictionariesReadyPromiseRef.current; // ČEKEJ!
    setIsLoadingFormData(true);
    // ... načítání ...
    setIsLoadingFormData(false);
  };
  if (dataId) loadData();
}, [dataId]);

// 5. Loading Gate
const isFormLoading = isLoadingCiselniky || (isEditMode && isLoadingFormData);
if (isFormLoading) return <Spinner />;

// 6. Formulář - GARANTOVANĚ má data!
return <Form />;
```

## 📝 Poznámky pro další vývoj

- **Performance:** `useMemo` pro `isFormLoading` zajišťuje, že se re-calculuje pouze při změně dependencies
- **Debugování:** Console logy byly záměrně odstraněny pro production - lze je znovu zapnout pro debugging
- **Existing код:** Původní `isFormInitializing` je zachován jako záložní mechanismus - lze odstranit po důkladném testování
- **Testování:** Testujte oba scénáře:
  1. Nová objednávka (refreshnout stránku na `/order-form`)
  2. Editace objednávky (refreshnout stránku na `/order-form?edit=123`)

---

**Autor:** Senior React Developer  
**Datum:** 28. října 2025  
**Verze:** 1.0
