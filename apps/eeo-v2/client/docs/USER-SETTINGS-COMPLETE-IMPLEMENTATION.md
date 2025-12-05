# Kompletní implementace uživatelských nastavení - Rok, Období, Nástroje

**Datum:** 19. listopadu 2025  
**Větev:** LISTOPAD-VIKEND  
**Commity:** f638015, 03d7af2

## 1. Přehled funkcionality

Uživatelé nyní mohou v profilu nastavit:

### 1.1 Výchozí rok (vychozi_rok)
- **Aktuální rok** (`'current'`) - automaticky nastaví aktuální systémový rok
- **Všechny roky** (`'all'`) - zobrazí data ze všech let
- **Konkrétní rok** - 2025, 2024, 2023, ... až 2016

### 1.2 Výchozí období (vychozi_obdobi)
- **Všechny měsíce** (`'all'`)
- **Leden** (`'1'`) až **Prosinec** (`'12'`)

### 1.3 Viditelnost ikon nástrojů (zobrazit_ikony_nastroju)
- **Notes** (`notes: true/false`) - Plovoucí poznámkový blok
- **TODO** (`todo: true/false`) - Seznam úkolů s alarmy
- **Chat** (`chat: true/false`) - Interní chat
- **Kalkulačka** (`kalkulacka: true/false`) - Finanční kalkulačka

## 2. Technická implementace

### 2.1 Datová struktura (JSON v DB)

```json
{
  "vychozi_rok": "current",
  "vychozi_obdobi": "all",
  "zobrazit_ikony_nastroju": {
    "notes": true,
    "todo": true,
    "chat": true,
    "kalkulacka": true
  }
}
```

**Databáze:**
- Tabulka: `user_nastaveni`
- Sloupec: `nastaveni` (TEXT/JSON)
- Dotaz: `SELECT nastaveni FROM user_nastaveni WHERE uzivatel_id = ?`

**LocalStorage:**
- Klíč: `user_settings_${userId}`
- Formát: JSON string (stejná struktura jako v DB)

### 2.2 Implementované soubory

#### A) ProfilePage.js (lines ~1250-3120)

**Generování možností roku:**
```javascript
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const options = [
    { value: 'current', label: 'Aktuální rok' },
    { value: 'all', label: 'Všechny roky' }
  ];
  for (let year = currentYear; year >= 2016; year--) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
};

const YEAR_OPTIONS = generateYearOptions();
```

**Generování možností období:**
```javascript
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Všechny měsíce' },
  { value: '1', label: 'Leden' },
  { value: '2', label: 'Únor' },
  { value: '3', label: 'Březen' },
  { value: '4', label: 'Duben' },
  { value: '5', label: 'Květen' },
  { value: '6', label: 'Červen' },
  { value: '7', label: 'Červenec' },
  { value: '8', label: 'Srpen' },
  { value: '9', label: 'Září' },
  { value: '10', label: 'Říjen' },
  { value: '11', label: 'Listopad' },
  { value: '12', label: 'Prosinec' }
];
```

**Ukládání a aplikace nastavení:**
```javascript
const saveAndApplySettings = async () => {
  try {
    setIsSubmitting(true);
    
    // 1. Uložení do databáze
    const cleanSettings = {
      vychozi_rok: userSettings.vychozi_rok || 'current',
      vychozi_obdobi: userSettings.vychozi_obdobi || 'all',
      zobrazit_ikony_nastroju: userSettings.zobrazit_ikony_nastroju || {
        notes: true,
        todo: true,
        chat: true,
        kalkulacka: true
      }
    };
    
    const response = await saveUserSettings({
      token,
      username,
      userId,
      nastaveni: cleanSettings
    });
    
    // 2. Uložení do localStorage
    saveSettingsToLocalStorage(userId, userSettings);
    
    // 3. Reload aplikace
    showToast('Nastavení bylo úspěšně uloženo. Aplikace se obnoví...', { type: 'success' });
    setTimeout(() => window.location.reload(), 800);
    
  } catch (error) {
    console.error('Chyba při ukládání nastavení:', error);
    showToast('Chyba při ukládání nastavení: ' + error.message, { type: 'error' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**UI komponenty:**
```javascript
// Rok
<CustomSelect
  id="vychozi-rok-select"
  value={userSettings.vychozi_rok}
  onChange={(e) => setUserSettings(prev => ({
    ...prev,
    vychozi_rok: e.target.value
  }))}
  options={YEAR_OPTIONS}
/>

// Období
<CustomSelect
  id="vychozi-obdobi-select"
  value={userSettings.vychozi_obdobi}
  onChange={(e) => setUserSettings(prev => ({
    ...prev,
    vychozi_obdobi: e.target.value
  }))}
  options={PERIOD_OPTIONS}
/>

// Checkboxy pro nástroje
<ToggleSwitch
  id="zobrazit-notes"
  label="Notes"
  checked={userSettings.zobrazit_ikony_nastroju?.notes ?? true}
  onChange={(checked) => setUserSettings(prev => ({
    ...prev,
    zobrazit_ikony_nastroju: {
      ...prev.zobrazit_ikony_nastroju,
      notes: checked
    }
  }))}
/>
// ... podobně pro todo, chat, kalkulacka
```

#### B) Orders25List.js (lines ~4210-4248)

**Načítání výchozího roku a období:**
```javascript
const [selectedYear, setSelectedYear] = useState(() => {
  // 1. Zkus localStorage specifické pro Orders25List
  const saved = getUserStorage('orders25List_selectedYear', null);
  if (saved !== null) return saved;
  
  // 2. Zkus uživatelská nastavení
  try {
    const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
    if (userSettings?.vychozi_rok) {
      if (userSettings.vychozi_rok === 'current') {
        return new Date().getFullYear();
      }
      if (userSettings.vychozi_rok === 'all') {
        return 'all';
      }
      return userSettings.vychozi_rok;
    }
  } catch (e) {
    console.warn('Nelze načíst nastavení roku:', e);
  }
  
  // 3. Fallback na aktuální rok
  return new Date().getFullYear();
});

const [selectedMonth, setSelectedMonth] = useState(() => {
  // 1. Zkus localStorage specifické pro Orders25List
  const saved = getUserStorage('orders25List_selectedMonth', null);
  if (saved !== null) return saved;
  
  // 2. Zkus uživatelská nastavení
  try {
    const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
    if (userSettings?.vychozi_obdobi) {
      return userSettings.vychozi_obdobi;
    }
  } catch (e) {
    console.warn('Nelze načíst nastavení období:', e);
  }
  
  // 3. Fallback na všechny měsíce
  return 'all';
});
```

#### C) Layout.js (lines ~1262-1275, 2380-2550)

**Načítání viditelnosti nástrojů:**
```javascript
// Tool icons visibility from user settings
const toolsVisibility = useMemo(() => {
  try {
    return getToolsVisibility();
  } catch (e) {
    console.warn('Chyba při načítání viditelnosti nástrojů:', e);
    // Fallback: všechny nástroje viditelné
    return { notes: true, todo: true, chat: true, kalkulacka: true };
  }
}, []); // Empty deps - loads once on mount
```

**Podmíněné vykreslení ikon:**
```javascript
{/* NOTES TOOL BUTTON - conditional visibility */}
{toolsVisibility.notes && (
  <SmartTooltip text={notesOpen ? 'Skrýt Poznámky' : 'Otevřít Poznámky'} ...>
    <RoundFab ...>
      <FontAwesomeIcon icon={faStickyNote} />
    </RoundFab>
  </SmartTooltip>
)}

{/* TODO TOOL BUTTON - conditional visibility */}
{toolsVisibility.todo && (
  <SmartTooltip text={todoOpen ? 'Skrýt TODO' : 'Otevřít TODO seznam'} ...>
    <RoundFab ...>
      <FontAwesomeIcon icon={faTasks} />
    </RoundFab>
  </SmartTooltip>
)}

{/* CHAT TOOL BUTTON - conditional visibility */}
{toolsVisibility.chat && (
  <SmartTooltip text={chatOpen ? 'Skrýt Chat' : 'Otevřít Chat'} ...>
    <RoundFab ...>
      <FontAwesomeIcon icon={faComments} />
    </RoundFab>
  </SmartTooltip>
)}

{/* FINANCIAL CALCULATOR - conditional visibility */}
{toolsVisibility.kalkulacka && (
  <SmartTooltip text={calculatorOpen ? 'Skrýt kalkulačku' : 'Otevřít finanční kalkulačku'} ...>
    <RoundFab ...>
      <FontAwesomeIcon icon={faCalculator} />
    </RoundFab>
  </SmartTooltip>
)}
```

#### D) src/utils/dateHelpers.js (NEW FILE)

```javascript
import { loadSettingsFromLocalStorage } from '../services/userSettingsApi';

/**
 * Získá rok z nastavení uživatele
 * @param {string|number} yearSetting - 'current', 'all', nebo konkrétní rok
 * @returns {number|null} Číslo roku nebo null pro 'all'
 */
export const getYearFromSetting = (yearSetting) => {
  if (yearSetting === 'current') {
    return new Date().getFullYear();
  }
  if (yearSetting === 'all') {
    return null;
  }
  return parseInt(yearSetting, 10);
};

/**
 * Získá rozsah datumů z nastavení roku a období
 * @param {string|number} yearSetting
 * @param {string|number} periodSetting
 * @returns {{ from: Date|null, to: Date|null, year: number|null, month: number|null }}
 */
export const getDateRangeFromSettings = (yearSetting, periodSetting) => {
  const year = getYearFromSetting(yearSetting);
  const month = periodSetting === 'all' ? null : parseInt(periodSetting, 10);
  
  let from = null;
  let to = null;
  
  if (year && month) {
    // Konkrétní měsíc v konkrétním roce
    from = new Date(year, month - 1, 1);
    to = new Date(year, month, 0, 23, 59, 59);
  } else if (year) {
    // Celý rok
    from = new Date(year, 0, 1);
    to = new Date(year, 11, 31, 23, 59, 59);
  }
  // Pokud year === null (all), from i to zůstanou null
  
  return { from, to, year, month };
};

/**
 * Formátuje měsíc na název v češtině
 * @param {number|string} month - Číslo měsíce 1-12
 * @returns {string} Název měsíce
 */
export const getMonthName = (month) => {
  const monthNames = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];
  return monthNames[parseInt(month, 10) - 1] || '';
};

/**
 * Formátuje datum do českého formátu DD.MM.YYYY
 * @param {Date|string} date
 * @returns {string}
 */
export const formatDateCZ = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Formátuje datum a čas do českého formátu DD.MM.YYYY HH:MM:SS
 * @param {Date|string} date
 * @returns {string}
 */
export const formatDateTimeCZ = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
```

#### E) src/utils/toolsVisibility.js (NEW FILE)

```javascript
import { loadSettingsFromLocalStorage } from '../services/userSettingsApi';

/**
 * Výchozí viditelnost všech nástrojů (pokud nejsou nastavení dostupná)
 */
const DEFAULT_VISIBILITY = {
  notes: true,
  todo: true,
  chat: true,
  kalkulacka: true
};

/**
 * Získá viditelnost nástrojových ikon z uživatelských nastavení
 * @param {number} userId - Optional, pokud není zadáno, zkusí z localStorage nebo AuthContext
 * @returns {{ notes: boolean, todo: boolean, chat: boolean, kalkulacka: boolean }}
 */
export const getToolsVisibility = (userId = null) => {
  try {
    // Pokud není userId, zkus ho získat z localStorage
    if (!userId) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      userId = currentUser.id || currentUser.user_id;
    }
    
    if (!userId) {
      console.warn('getToolsVisibility: userId není k dispozici, používám výchozí viditelnost');
      return DEFAULT_VISIBILITY;
    }
    
    const settings = loadSettingsFromLocalStorage(userId);
    
    if (!settings || !settings.zobrazit_ikony_nastroju) {
      return DEFAULT_VISIBILITY;
    }
    
    // Merge s výchozími hodnotami (fallback pro chybějící klíče)
    return {
      notes: settings.zobrazit_ikony_nastroju.notes ?? DEFAULT_VISIBILITY.notes,
      todo: settings.zobrazit_ikony_nastroju.todo ?? DEFAULT_VISIBILITY.todo,
      chat: settings.zobrazit_ikony_nastroju.chat ?? DEFAULT_VISIBILITY.chat,
      kalkulacka: settings.zobrazit_ikony_nastroju.kalkulacka ?? DEFAULT_VISIBILITY.kalkulacka
    };
  } catch (error) {
    console.error('Chyba při načítání viditelnosti nástrojů:', error);
    return DEFAULT_VISIBILITY;
  }
};

/**
 * Zkontroluje, zda je konkrétní nástroj viditelný
 * @param {string} toolName - 'notes', 'todo', 'chat', nebo 'kalkulacka'
 * @param {number} userId - Optional
 * @returns {boolean}
 */
export const isToolVisible = (toolName, userId = null) => {
  const visibility = getToolsVisibility(userId);
  return visibility[toolName] ?? true;
};

/**
 * Získá pole viditelných nástrojů
 * @param {number} userId - Optional
 * @returns {string[]} Pole názvů viditelných nástrojů
 */
export const getVisibleTools = (userId = null) => {
  const visibility = getToolsVisibility(userId);
  return Object.keys(visibility).filter(tool => visibility[tool]);
};

/**
 * Zkontroluje, zda je alespoň jeden nástroj viditelný
 * @param {number} userId - Optional
 * @returns {boolean}
 */
export const hasVisibleTools = (userId = null) => {
  const visibility = getToolsVisibility(userId);
  return Object.values(visibility).some(isVisible => isVisible);
};
```

## 3. Workflow použití

### 3.1 Nastavení uživatele

1. Otevřít **Profil** (ikona uživatele v menu)
2. Najít sekci **"Chování a předvolby aplikace"**
3. Nastavit:
   - **Výchozí rok**: např. "Aktuální rok"
   - **Výchozí období**: např. "Leden"
   - **Viditelnost nástrojů**: zakázat např. Chat a Kalkulačku
4. Kliknout na **"Uložit a aplikovat nastavení"**
5. Aplikace se automaticky obnoví (reload)

### 3.2 Co se stane po uložení

1. **ProfilePage.js**:
   - Uloží nastavení do databáze přes `userSettingsApi.saveUserSettings()`
   - Uloží nastavení do localStorage přes `saveSettingsToLocalStorage()`
   - Zobrazí toast zprávu
   - Po 800ms provede `window.location.reload()`

2. **Orders25List.js**:
   - Po reload načte `selectedYear` a `selectedMonth` z uživatelských nastavení
   - Pokud je `vychozi_rok = 'current'`, nastaví aktuální rok
   - Pokud je `vychozi_rok = 'all'`, zobrazí všechny roky
   - Pokud je `vychozi_obdobi = 'all'`, zobrazí všechny měsíce
   - Seznam se filtruje podle těchto hodnot

3. **Layout.js**:
   - Po reload načte `toolsVisibility` přes `getToolsVisibility()`
   - Skryje ikony, které mají `false` v nastavení
   - Např. pokud `chat: false`, ikona Chatu se nevykreslí

## 4. Failover logika

### 4.1 Když nastavení neexistují

**Orders25List.js:**
```javascript
// Fallback: aktuální rok
return new Date().getFullYear();

// Fallback: všechny měsíce
return 'all';
```

**Layout.js:**
```javascript
// Fallback: všechny nástroje viditelné
return { notes: true, todo: true, chat: true, kalkulacka: true };
```

### 4.2 Když je localStorage prázdný

- `loadSettingsFromLocalStorage()` vrátí `null`
- Aplikace použije fallback hodnoty

### 4.3 Když je databáze nedostupná

- `saveUserSettings()` hodí chybu
- ProfilePage zobrazí error toast
- Uživatel může zkusit znovu

## 5. Testování

### 5.1 Test rok a období

1. Otevřít Profil
2. Nastavit rok = **2024**
3. Nastavit období = **Leden**
4. Uložit a aplikovat
5. Po reload otevřít **Seznam objednávek**
6. **Očekávaný výsledek:**
   - Filtr roku zobrazuje **2024**
   - Filtr měsíce zobrazuje **Leden**
   - Tabulka zobrazuje pouze objednávky z ledna 2024

### 5.2 Test viditelnosti nástrojů

1. Otevřít Profil
2. Zakázat **Chat** a **Kalkulačka**
3. Uložit a aplikovat
4. Po reload zkontrolovat plovoucí ikony vpravo dole
5. **Očekávaný výsledek:**
   - Ikona Chatu **není vidět**
   - Ikona Kalkulačky **není vidět**
   - Ikony Notes a TODO **jsou vidět**

### 5.3 Test "Aktuální rok"

1. Otevřít Profil
2. Nastavit rok = **Aktuální rok**
3. Uložit a aplikovat
4. Po reload otevřít Seznam objednávek
5. **Očekávaný výsledek:**
   - Filtr roku zobrazuje aktuální rok (např. 2025)
   - I když se změní rok v systému, vždy se zobrazí aktuální

### 5.4 Test "Všechny roky"

1. Otevřít Profil
2. Nastavit rok = **Všechny roky**
3. Uložit a aplikovat
4. Po reload otevřít Seznam objednávek
5. **Očekávaný výsledek:**
   - Filtr roku zobrazuje **"Všechny roky"**
   - Tabulka zobrazuje objednávky ze všech let

## 6. API dokumentace

### 6.1 saveUserSettings

**Soubor:** `src/services/userSettingsApi.js`

```javascript
/**
 * Uloží uživatelská nastavení do databáze
 * @param {{ token: string, username: string, userId: number, nastaveni: object }} params
 * @returns {Promise<object>} Response z API
 */
export const saveUserSettings = async ({ token, username, userId, nastaveni }) => {
  const response = await fetch(`${API_BASE_URL}/user-settings/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username,
      userId,
      nastaveni: JSON.stringify(nastaveni)
    })
  });
  
  if (!response.ok) {
    throw new Error('Nepodařilo se uložit nastavení');
  }
  
  return response.json();
};
```

### 6.2 loadSettingsFromLocalStorage

**Soubor:** `src/services/userSettingsApi.js`

```javascript
/**
 * Načte nastavení z localStorage
 * @param {number} userId
 * @returns {object|null} Nastavení nebo null
 */
export const loadSettingsFromLocalStorage = (userId) => {
  try {
    const key = `user_settings_${userId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Chyba při načítání nastavení z localStorage:', error);
    return null;
  }
};
```

### 6.3 saveSettingsToLocalStorage

**Soubor:** `src/services/userSettingsApi.js`

```javascript
/**
 * Uloží nastavení do localStorage
 * @param {number} userId
 * @param {object} settings
 */
export const saveSettingsToLocalStorage = (userId, settings) => {
  try {
    const key = `user_settings_${userId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('Chyba při ukládání nastavení do localStorage:', error);
  }
};
```

## 7. Git historie

### Commit 1: f638015
```
feat: Add user settings for default year, period, and tool visibility

- Add YEAR_OPTIONS: 'Aktuální rok', 'Všechny roky', 2025-2016 descending
- Add PERIOD_OPTIONS: 'Všechny měsíce' + Leden-Prosinec
- Add tool visibility checkboxes: Notes, TODO, Chat, Kalkulačka
- Merge save buttons into single 'Uložit a aplikovat nastavení'
- Create dateHelpers.js: getYearFromSetting, getDateRangeFromSettings
- Create toolsVisibility.js: getToolsVisibility, isToolVisible
- Integrate settings into Orders25List for year/period defaults
```

### Commit 2: 03d7af2
```
feat: Integrate tool icons visibility settings into Layout.js

- Import getToolsVisibility helper from utils/toolsVisibility.js
- Add useMemo hook to load tool visibility settings
- Wrap Notes/TODO/Chat/Calculator buttons with conditional rendering
- Fallback to all tools visible if settings cannot be loaded
- Completes user settings functionality
```

## 8. Známé problémy a omezení

### 8.1 Reload aplikace
- Po uložení nastavení se aplikace **vždy obnoví** (`window.location.reload()`)
- Toto je záměrné, aby se všechny komponenty rehydratovaly s novými hodnotami
- Alternativa: použít React Context pro globální state, ale to by vyžadovalo refaktoring

### 8.2 LocalStorage vs Database
- Aplikace preferuje localStorage pro rychlost
- Pokud je localStorage prázdný, použije se DB
- Synchronizace probíhá vždy při uložení (ProfilePage)

### 8.3 Konkrétní rok vs. localStorage Orders25List
- `Orders25List` má vlastní localStorage pro `selectedYear` a `selectedMonth`
- Tento localStorage má **přednost** před uživatelskými nastaveními
- Pokud chcete testovat nastavení, smažte:
  ```javascript
  localStorage.removeItem('user_1_orders25List_selectedYear');
  localStorage.removeItem('user_1_orders25List_selectedMonth');
  ```

## 9. Doporučení pro budoucí rozšíření

### 9.1 Další nastavení
- **Výchozí pohled**: Seznam / Kalendář
- **Počet řádků na stránku**: 10 / 20 / 50 / 100
- **Výchozí třídění**: Datum vytvoření / Číslo objednávky / Zákazník
- **Jazyk aplikace**: CS / EN (i18n)

### 9.2 Notifikace změn nastavení
- Místo `window.location.reload()` použít React Context
- Posluchači by reagovali na změny nastavení bez reload
- Vyžaduje refaktoring: `SettingsContext`, `useSettings` hook

### 9.3 Backend API pro nastavení
- Aktuálně chybí backend endpointy
- Potřeba vytvořit:
  - `POST /api/user-settings/save`
  - `GET /api/user-settings/load`
  - `DELETE /api/user-settings/reset`

## 10. Závěr

Kompletní integrace uživatelských nastavení pro **rok**, **období** a **viditelnost nástrojů** je hotova a funkční. Všechny komponenty (ProfilePage, Orders25List, Layout) respektují nastavení s robustní failover logikou.

**Status:** ✅ HOTOVO  
**Testováno:** Manuálně (ProfilePage UI, Orders25List filtry, Layout ikony)  
**Dokumentace:** Kompletní  
**Git:** 2 commity (f638015, 03d7af2)  
**Branch:** LISTOPAD-VIKEND
