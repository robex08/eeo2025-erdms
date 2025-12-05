# 🔍 Analýza workflow časových razítek - OrderForm25

**Datum analýzy:** 14. listopadu 2025  
**Problém:** Nesedí posloupnost časů u workflow kroků

## 📋 Identifikovaný problém

Ze screenshotu workflow kroků:
```
1. Vytvořil - 09:33:05 ✅
2. Schválil - 09:42:11 ✅
3. Odeslal dodavateli - 09:59:54 ✅
4. Dodavatel potvrdil - 09:59:54 ⚠️ STEJNÝ ČAS jako #3
5. Potvrdil věcnou správnost - 08:57:12 ❌ DŘÍVE než #3 a #4!
6. Dokončil objednávku - 08:59:50 ❌ DŘÍVE než #3 a #4!
```

## 🐛 Příčina problému

### 1. Chybějící automatické nastavování timestamps

**Aktuální stav v `OrderForm25.js`:**

```javascript
// saveOrderToAPI() - řádky 7530-7550
// 🆕 FÁZE 7: Automaticky nastavit potvrdil_vecnou_spravnost_id a dt_potvrzeni_vecne_spravnosti
if ((formData.potvrzeni_vecne_spravnosti === 1 || formData.potvrzeni_vecne_spravnosti === true) &&
    !formData.potvrdil_vecnou_spravnost_id &&
    user_id) {
  const timestamp = new Date().toISOString();
  updatedFormData.potvrdil_vecnou_spravnost_id = user_id;
  updatedFormData.dt_potvrzeni_vecne_spravnosti = timestamp;
}
```

**Problém:** 
- ✅ Timestamp se nastavuje pro **věcnou správnost** (dt_potvrzeni_vecne_spravnosti)
- ❌ **CHYBÍ** automatické nastavování pro ostatní kroky:
  - `dt_odeslani` - odeslání dodavateli
  - `dt_potvrzeni_dodavatelem` - potvrzení dodavatelem
  - `dt_dokonceni` - dokončení objednávky
  - `dt_schvaleni` - je nastavováno, ale možná ne konzistentně

### 2. Workflow stavy bez časových razítek

**V `OrderForm25.js` řádky 7750-7800:**

```javascript
// 2. Schválení/zamítnutí - přepsat JEN vzájemně se vylučující stavy
if (approvalChoice === 'schvaleno') {
  workflowStates = workflowStates.filter(s => !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA'].includes(s));
  if (!workflowStates.includes('SCHVALENA')) {
    workflowStates.push('SCHVALENA');
    addDebugLog('info', 'SAVE', 'workflow-update', 'Přidán stav SCHVALENA');
  }
}
```

**Problém:**
- Workflow stavy se **přidávají do pole** `workflowStates`
- Ale **NENASTAVUJE SE** odpovídající timestamp!
- Kódy workflow kroků se ukládají, ale časy zůstávají prázdné nebo staré

### 3. Chybějící DB pole pro všechny workflow kroky

**Dokumentované pole v DB:**
- ✅ `dt_schvaleni` - datum schválení
- ✅ `dt_potvrzeni_vecne_spravnosti` - datum potvrzení věcné správnosti
- ❓ `dt_odeslani` - není jisté, jestli existuje
- ❓ `dt_potvrzeni_dodavatelem` - není jisté
- ❓ `dt_dokonceni` - není jisté

**V kódu se používají:**
```javascript
// useWorkflowManager.js - řádky 545-638
datum_odeslani: '',
dt_akceptace: '',
datum_zmeny_stavu: '',
datum_faktury: '',
datum_platby: '',
dt_zverejneni: '',
dt_potvrzeni_vecne_spravnosti: '',
dt_dokonceni: '',
```

## 🎯 Řešení

### Krok 1: Ověřit DB strukturu

Potřebujeme zkontrolovat, která pole **skutečně existují v DB tabulce objednavky**:

```sql
DESCRIBE objednavky;
-- nebo
SHOW COLUMNS FROM objednavky LIKE 'dt_%';
SHOW COLUMNS FROM objednavky LIKE 'datum_%';
```

### Krok 2: Doplnit automatické nastavování timestamps

V `OrderForm25.js` v funkci `saveOrderToAPI()` přidat automatické nastavování pro **každý workflow krok**:

```javascript
// Po řádku 7550 (před sestavováním orderData)

let updatedFormData = { ...formData };

// 🔧 AUTOMATICKÉ NASTAVENÍ TIMESTAMPS PRO WORKFLOW KROKY
const timestamp = new Date().toISOString();

// 1. Schválení - pokud se teď schvaluje
if (approvalChoice === 'schvaleno' && !formData.dt_schvaleni) {
  updatedFormData.dt_schvaleni = timestamp;
  updatedFormData.schvalil_uzivatel_id = user_id;
}

// 2. Odeslání dodavateli - pokud je ROZPRACOVANA nebo ODESLANA v workflow
if (workflowStates.includes('ROZPRACOVANA') || workflowStates.includes('ODESLANA')) {
  if (!formData.dt_odeslani) {
    updatedFormData.dt_odeslani = timestamp;
  }
}

// 3. Potvrzení dodavatelem - pokud je POTVRZENA v workflow
if (workflowStates.includes('POTVRZENA')) {
  if (!formData.dt_potvrzeni_dodavatelem) {
    updatedFormData.dt_potvrzeni_dodavatelem = timestamp;
  }
}

// 4. Věcná správnost - již implementováno
if ((formData.potvrzeni_vecne_spravnosti === 1) && !formData.potvrdil_vecnou_spravnost_id) {
  updatedFormData.dt_potvrzeni_vecne_spravnosti = timestamp;
  updatedFormData.potvrdil_vecnou_spravnost_id = user_id;
}

// 5. Dokončení - pokud je DOKONCENA v workflow
if (workflowStates.includes('DOKONCENA')) {
  if (!formData.dt_dokonceni) {
    updatedFormData.dt_dokonceni = timestamp;
  }
}
```

### Krok 3: Přidat validaci posloupnosti časů

```javascript
// Validace posloupnosti časů PŘED uložením
const validateTimestampSequence = (data) => {
  const timestamps = [
    { name: 'Vytvoření', value: data.dt_vytvoreni || data.created_at },
    { name: 'Schválení', value: data.dt_schvaleni },
    { name: 'Odeslání', value: data.dt_odeslani },
    { name: 'Potvrzení dodavatelem', value: data.dt_potvrzeni_dodavatelem },
    { name: 'Věcná správnost', value: data.dt_potvrzeni_vecne_spravnosti },
    { name: 'Dokončení', value: data.dt_dokonceni }
  ].filter(t => t.value); // Filtrovat jen vyplněné

  // Kontrola chronologické posloupnosti
  for (let i = 1; i < timestamps.length; i++) {
    const prev = new Date(timestamps[i-1].value);
    const curr = new Date(timestamps[i].value);
    
    if (curr < prev) {
      console.warn(
        `⚠️ CHYBA V POSLOUPNOSTI: ${timestamps[i].name} (${timestamps[i].value}) ` +
        `je dříve než ${timestamps[i-1].name} (${timestamps[i-1].value})`
      );
    }
  }
};
```

### Krok 4: Backend validace (SQL)

Přidat trigger nebo constraint do DB, který zajistí správnou posloupnost:

```sql
-- Trigger pro kontrolu posloupnosti časů při UPDATE
DELIMITER $$
CREATE TRIGGER check_timestamp_sequence
BEFORE UPDATE ON objednavky
FOR EACH ROW
BEGIN
  -- Kontrola: dt_schvaleni musí být >= dt_vytvoreni
  IF NEW.dt_schvaleni IS NOT NULL AND NEW.dt_schvaleni < NEW.created_at THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'dt_schvaleni nemůže být dříve než created_at';
  END IF;
  
  -- Kontrola: dt_odeslani musí být >= dt_schvaleni
  IF NEW.dt_odeslani IS NOT NULL AND NEW.dt_schvaleni IS NOT NULL 
     AND NEW.dt_odeslani < NEW.dt_schvaleni THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'dt_odeslani nemůže být dříve než dt_schvaleni';
  END IF;
  
  -- Další kontroly...
END$$
DELIMITER ;
```

## � AKTUALIZACE: Problém s časovými pásmy (UTC vs Local)

### ⚠️ HLAVNÍ PŘÍČINA - Časové pásmo!

**Zjištění z kódu:**

1. **Frontend ukládá v UTC:**
   ```javascript
   const timestamp = new Date().toISOString(); // "2025-11-14T09:33:05.000Z" (UTC)
   ```

2. **Frontend zobrazuje v lokálním čase:**
   ```javascript
   // utils/format.js - prettyDate()
   const d = new Date(dt);
   const hh = String(d.getHours()).padStart(2,'0'); // ❌ getHours() vrací LOKÁLNÍ čas!
   ```

3. **Backend pravděpodobně ukládá bez časové zóny:**
   - Pokud MySQL DATETIME nemá timezone info
   - Uloží se jako: `2025-11-14 09:33:05` (bez 'Z')
   - JavaScript to pak interpretuje **DVOJÍM ZPŮSOBEM**:
     - S 'Z' na konci → UTC → převede na lokální (UTC+1)
     - Bez 'Z' → interpretuje jako lokální čas → nepřevádí

### 🔍 Kontrola časů ze screenshotu:

```
Original times:                 +1 hodina (UTC+1):
08:57:12 → Věcná správnost     09:57:12 ✅ (po vytvoření 09:33)
08:59:50 → Dokončení           09:59:50 ✅ (logická posloupnost)
09:33:05 → Vytvoření           09:33:05 ✅
09:42:11 → Schválení           09:42:11 ✅
09:59:54 → Odeslání            09:59:54 ✅
09:59:54 → Potvrzení           09:59:54 ✅ (stejný okamžik OK)
```

**Pokud přičteme +1 hodinu k časům 08:xx, vše dává smysl!**

### 🐛 Možné scénáře:

#### Scénář A: Backend ukládá v lokálním čase (UTC+1)
- Frontend posílá UTC: `2025-11-14T08:57:12.000Z` (9:57 lokálního času)
- Backend stripne 'Z' a uloží: `2025-11-14 08:57:12` (považuje za lokální)
- **VÝSLEDEK:** Ztráta 1 hodiny!

#### Scénář B: Backend ukládá v UTC správně
- Frontend posílá UTC: `2025-11-14T08:57:12.000Z`
- Backend uloží: `2025-11-14 08:57:12` (UTC)
- Frontend číst a **NEKONVERTUJE** zpět na lokální čas
- **VÝSLEDEK:** Zobrazí UTC čas místo lokálního!

### 🎯 Řešení:

#### Řešení 1: Opravit zobrazování (doporučeno)
```javascript
// utils/format.js
export function prettyDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d)) return dt;

  // 🔧 OPRAVA: Explicitně převést na lokální čas
  // Pokud přichází UTC string (s 'Z'), automaticky se převede
  // Pokud přichází bez timezone, považovat za UTC a převést
  
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');

  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
}
```

#### Řešení 2: Backend posílat UTC s timezone
```php
// Backend - vrátit datum s timezone info
$timestamp = $row['dt_vytvoreni'];
// Převést na ISO8601 s timezone
$dt = new DateTime($timestamp, new DateTimeZone('Europe/Prague'));
return $dt->format('c'); // "2025-11-14T09:33:05+01:00"
```

#### Řešení 3: Unified timestamp handling
```javascript
// Vytvořit helper funkci pro konzistentní ukládání
export function getCurrentTimestamp() {
  // Vrátit aktuální čas v UTC jako ISO string
  return new Date().toISOString();
}

// A helper pro zobrazování
export function formatTimestamp(dt, includeTime = true) {
  if (!dt) return '';
  
  // Pokud přichází string bez timezone ('2025-11-14 09:33:05')
  // Explicitně ho považovat za UTC a převést na lokální
  let d;
  if (typeof dt === 'string' && !dt.includes('Z') && !dt.includes('+')) {
    // Přidat 'Z' pro UTC interpretaci
    d = new Date(dt + 'Z');
  } else {
    d = new Date(dt);
  }
  
  if (isNaN(d)) return dt;
  
  // Zbytek kódu...
}
```

## �📝 Kroky implementace

1. ✅ **Zálohovat do GIT** - HOTOVO
2. 🔍 **Zkontrolovat DB strukturu** - zjistit která pole existují
3. 🕐 **Ověřit backend timezone handling** - jak ukládá časy (UTC vs lokální)
4. 🔧 **Upravit prettyDate()** - správně převádět UTC na lokální čas
5. 🔧 **Upravit saveOrderToAPI()** - doplnit automatické timestamps
6. ✅ **Validovat posloupnost** - před uložením kontrolovat časy
7. 🧪 **Otestovat** - vytvořit testovací objednávku a projít všemi kroky
8. 📊 **Upravit workflow zobrazení** - zajistit správné řazení v UI

## ⚠️ Další zjištění

### Možné příčiny nesprávných časů:

1. **Uživatel upravil datum ručně** - formulář umožňuje editaci datumových polí
2. **Importovaná data** - objednávka mohla být importována z jiného systému
3. **Bug při batch operaci** - hromadné schvalování/dokončování
4. **Race condition** - současné úpravy více uživateli
5. **Cachování starých dat** - frontend zobrazuje data z cache místo DB

## 🎓 Doporučení

1. **Immutable timestamps** - jakmile se nastaví, už se neměnit
2. **Audit log** - logovat všechny změny workflow stavů s časem
3. **Server-side timestamps** - generovat na backendu, ne frontendu
4. **Validace v DB** - constraints a triggery pro konzistenci
5. **UI indikace** - zobrazit varování pokud je posloupnost nelogická
