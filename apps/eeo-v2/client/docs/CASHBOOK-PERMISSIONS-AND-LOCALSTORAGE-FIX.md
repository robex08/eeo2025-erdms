# CASHBOOK: Oprava oprávnění + LocalStorage pro selector

**Datum:** 9.11.2025  
**Status:** ✅ Kompletní

---

## 📋 Požadavky

### 1. Oprávnění pro uzavírání měsíce
- Běžný uživatel s `CASH_BOOK_EDIT_OWN` může uzavřít/odemknout **jen svou vlastní** knihu
- Admin s `CASH_BOOK_MANAGE` může uzavřít/odemknout jakoukoli knihu
- Zamčení správcem (`zamknuta_spravcem`) může odemknout **jen admin**

### 2. LocalStorage pro CashboxSelector
- Uložit výběr měsíce/roku do localStorage (hlavně pro adminy)
- Uložit výběr pokladny do localStorage (hlavně pro adminy)
- Obnovit poslední výběr po F5 nebo routingu

---

## ✅ Implementované změny

### 1. `handleCloseMonth` - Kontrola EDIT_OWN

**Soubor:** `src/pages/CashBookPage.js` (řádek ~2372)

**Předtím:**
```javascript
const handleCloseMonth = async () => {
  if (!currentBookId) {
    showToast('Chyba: Kniha není načtena', 'error');
    return;
  }
```

**Nyní:**
```javascript
const handleCloseMonth = async () => {
  // ✅ Uživatel s EDIT_OWN může uzavřít jen svou vlastní knihu
  // ✅ Admin s MANAGE může uzavřít jakoukoli knihu
  if (!hasManagePermission && !(canEditOwn && isCurrentUserCashbook)) {
    showToast('Nemáte oprávnění uzavřít tento měsíc', 'error');
    return;
  }

  if (!currentBookId) {
    showToast('Chyba: Kniha není načtena', 'error');
    return;
  }
```

**Logika:**
- Admin (`hasManagePermission`) → ✅ může vždy
- Běžný uživatel s `EDIT_OWN` (`canEditOwn`) + vlastní kniha (`isCurrentUserCashbook`) → ✅ může
- Jinak → ❌ nemá oprávnění

---

### 2. `handleUnlockBook` - Kontrola EDIT_OWN

**Soubor:** `src/pages/CashBookPage.js` (řádek ~2446)

**Předtím:**
```javascript
const handleUnlockBook = async () => {
  if (bookStatus === 'zamknuta_spravcem' && !hasManagePermission) {
    showToast('Kniha je zamčená správcem. Kontaktujte administrátora.', 'error');
    return;
  }
```

**Nyní:**
```javascript
const handleUnlockBook = async () => {
  // ✅ Admin s MANAGE může odemknout cokoli (uzavrena_uzivatelem i zamknuta_spravcem)
  // ✅ Běžný uživatel s EDIT_OWN může odemknout jen svou vlastní uzavrena_uzivatelem knihu
  // ❌ Běžný uživatel NEMŮŽE odemknout zamknuta_spravcem (ani svou)
  
  if (bookStatus === 'zamknuta_spravcem' && !hasManagePermission) {
    showToast('Kniha je zamčená správcem. Kontaktujte administrátora.', 'error');
    return;
  }
  
  if (bookStatus === 'uzavrena_uzivatelem' && !hasManagePermission && !(canEditOwn && isCurrentUserCashbook)) {
    showToast('Nemáte oprávnění odemknout tento měsíc', 'error');
    return;
  }
```

**Logika pro `uzavrena_uzivatelem`:**
- Admin (`hasManagePermission`) → ✅ může vždy
- Běžný uživatel s `EDIT_OWN` + vlastní kniha → ✅ může
- Jinak → ❌ nemá oprávnění

**Logika pro `zamknuta_spravcem`:**
- Jen admin (`hasManagePermission`) → ✅ může
- Běžný uživatel → ❌ nemá oprávnění (ani když má EDIT_OWN)

---

### 3. Workflow tlačítka - Viditelnost podle EDIT_OWN

**Soubor:** `src/pages/CashBookPage.js` (řádek ~2661)

**Předtím:**
```javascript
{(canCreateEntries || hasManagePermission) && (
  <div className="info-actions">
```

**Nyní:**
```javascript
{/* ✅ Zobrazit uživatelům s EDIT_OWN (jen pro vlastní knihu) nebo MANAGE (všechny knihy) */}
{((canEditOwn && isCurrentUserCashbook) || hasManagePermission) && (
  <div className="info-actions">
```

**Výsledek:**
- Běžný uživatel vidí workflow tlačítka **jen pro svou vlastní knihu**
- Admin vidí workflow tlačítka **pro všechny knihy**

---

### 4. LocalStorage pro výběr měsíce/roku

**Soubor:** `src/pages/CashBookPage.js`

#### A) Načtení při mount (řádek ~713)

```javascript
// 🆕 Načíst poslední výběr období z localStorage (hlavně pro adminy)
const loadSavedPeriod = () => {
  try {
    const saved = localStorage.getItem('cashbook_selector_period');
    if (saved) {
      const { year, month } = JSON.parse(saved);
      return { year, month };
    }
  } catch (err) {
    console.warn('⚠️ Chyba při načítání uloženého období:', err);
  }
  return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
};

const savedPeriod = loadSavedPeriod();

// Aktuální měsíc a rok pro paging
const [currentMonth, setCurrentMonth] = useState(savedPeriod.month); // 1-12
const [currentYear, setCurrentYear] = useState(savedPeriod.year);
```

#### B) Uložení při změně (řádek ~1395)

```javascript
// 🆕 Uložit výběr období do localStorage (hlavně pro adminy)
useEffect(() => {
  try {
    localStorage.setItem('cashbook_selector_period', JSON.stringify({
      year: currentYear,
      month: currentMonth
    }));
  } catch (err) {
    console.warn('⚠️ Chyba při ukládání období do localStorage:', err);
  }
}, [currentYear, currentMonth]);
```

**Klíč:** `cashbook_selector_period`  
**Formát:** `{ "year": 2025, "month": 11 }`

---

### 5. LocalStorage pro výběr pokladny

**Soubor:** `src/pages/CashBookPage.js`

#### A) Načtení při mount (řádek ~1365)

```javascript
// 🆕 Pro adminy zkontrolovat localStorage (pamatovat poslední výběr)
let selectedAssignment = null;

try {
  const saved = localStorage.getItem('cashbook_selector_cashbox');
  if (saved) {
    const savedData = JSON.parse(saved);
    // Najít uložené přiřazení v seznamu
    selectedAssignment = assignments.find(a => a.id === savedData.id);
  }
} catch (err) {
  console.warn('⚠️ Chyba při načítání uloženého výběru pokladny:', err);
}

// Pokud nebylo uložené nebo již neexistuje, najít hlavní
if (!selectedAssignment) {
  const main = assignments.find(a => a.je_hlavni == 1);
  selectedAssignment = main || assignments[0];
}

setMainAssignment(selectedAssignment);
```

#### B) Uložení při změně (řádek ~1815)

```javascript
// 🆕 Uložit výběr pokladny do localStorage (hlavně pro adminy)
try {
  localStorage.setItem('cashbook_selector_cashbox', JSON.stringify({
    id: newAssignment.id,
    cislo_pokladny: newAssignment.cislo_pokladny,
    uzivatel_id: newAssignment.uzivatel_id
  }));
} catch (err) {
  console.warn('⚠️ Chyba při ukládání výběru pokladny:', err);
}
```

**Klíč:** `cashbook_selector_cashbox`  
**Formát:** `{ "id": 123, "cislo_pokladny": 1, "uzivatel_id": 456 }`

---

## 🧪 Testovací scénáře

### Test 1: Běžný uživatel - vlastní kniha

**Uživatel:** Běžný s `CASH_BOOK_EDIT_OWN`  
**Kniha:** Vlastní (isCurrentUserCashbook = true)

| Akce | Status knihy | Očekávaný výsledek |
|------|--------------|-------------------|
| Zobrazení tlačítek | aktivni | ✅ Vidí "Uzavřít měsíc" |
| Uzavřít měsíc | aktivni → uzavrena_uzivatelem | ✅ Povoleno |
| Odemknout měsíc | uzavrena_uzivatelem → aktivni | ✅ Povoleno |
| Odemknout admin lock | zamknuta_spravcem | ❌ Blokováno |

---

### Test 2: Běžný uživatel - cizí kniha

**Uživatel:** Běžný s `CASH_BOOK_EDIT_OWN`  
**Kniha:** Cizí (isCurrentUserCashbook = false)

| Akce | Status knihy | Očekávaný výsledek |
|------|--------------|-------------------|
| Zobrazení tlačítek | jakýkoli | ❌ Skryto (podmínka `canEditOwn && isCurrentUserCashbook` = false) |

---

### Test 3: Admin s MANAGE

**Uživatel:** Admin s `CASH_BOOK_MANAGE`  
**Kniha:** Jakákoli

| Akce | Status knihy | Očekávaný výsledek |
|------|--------------|-------------------|
| Zobrazení tlačítek | aktivni | ✅ Vidí "Uzavřít měsíc" + "Zamknout" |
| Zobrazení tlačítek | uzavrena_uzivatelem | ✅ Vidí "Odemknout" |
| Zobrazení tlačítek | zamknuta_spravcem | ✅ Vidí "Odemknout (Admin)" |
| Uzavřít měsíc | aktivni → uzavrena_uzivatelem | ✅ Povoleno |
| Zamknout knihu | aktivni → zamknuta_spravcem | ✅ Povoleno |
| Odemknout user close | uzavrena_uzivatelem → aktivni | ✅ Povoleno |
| Odemknout admin lock | zamknuta_spravcem → aktivni | ✅ Povoleno |

---

### Test 4: LocalStorage - Persistence

**Postup:**

1. **Admin** přepne na jiný měsíc (např. říjen 2025)
2. **Admin** přepne na jinou pokladnu (např. pokladna č. 5)
3. Stisknout **F5** (reload stránky)

**Očekávaný výsledek:**
- ✅ Stránka se načte s říjnem 2025 (ne aktuální měsíc)
- ✅ Stránka se načte s pokladnou č. 5 (ne hlavní pokladna)

**Kontrola localStorage:**
```javascript
localStorage.getItem('cashbook_selector_period')
// → {"year":2025,"month":10}

localStorage.getItem('cashbook_selector_cashbox')
// → {"id":123,"cislo_pokladny":5,"uzivatel_id":456}
```

---

### Test 5: LocalStorage - Routing

**Postup:**

1. **Admin** v pokladně, měsíc listopad 2025, pokladna č. 3
2. Přejít na jinou stránku (např. Objednávky)
3. Vrátit se zpět na Pokladnu

**Očekávaný výsledek:**
- ✅ Pokladna se načte s listopadem 2025
- ✅ Pokladna se načte s pokladnou č. 3

---

## 📊 Matice oprávnění - finální

| Oprávnění | Vlastní kniha | Cizí kniha | Zamknuto správcem |
|-----------|---------------|------------|-------------------|
| **EDIT_OWN** | ✅ Uzavřít/Odemknout | ❌ Nic | ❌ Nemůže odemknout |
| **EDIT_ALL** | ✅ Uzavřít/Odemknout | ❌ Nic (zatím) | ❌ Nemůže odemknout |
| **MANAGE** | ✅ Vše (Uzavřít/Zamknout/Odemknout) | ✅ Vše | ✅ Může odemknout |

**Poznámka:** `EDIT_ALL` momentálně nezobrazuje workflow tlačítka pro cizí knihy. Pokud to má fungovat, je potřeba změnit podmínku z:
```javascript
{((canEditOwn && isCurrentUserCashbook) || hasManagePermission) && (
```
na:
```javascript
{((canEditOwn && isCurrentUserCashbook) || canEditAll || hasManagePermission) && (
```

---

## 🔄 Workflow diagram

```
AKTIVNÍ KNIHA
    │
    ├─→ [Uzavřít měsíc] (EDIT_OWN pro vlastní / MANAGE pro všechny)
    │       │
    │       ↓
    │   UZAVŘENA UŽIVATELEM
    │       │
    │       ├─→ [Odemknout] (EDIT_OWN pro vlastní / MANAGE pro všechny)
    │       │       │
    │       │       ↓
    │       │   (zpět na AKTIVNÍ)
    │       │
    │       └─→ [Zamknout] (jen MANAGE)
    │               │
    │               ↓
    │         ZAMKNUTA SPRÁVCEM
    │               │
    │               └─→ [Odemknout (Admin)] (jen MANAGE)
    │                       │
    │                       ↓
    │                   (zpět na AKTIVNÍ)
    │
    └─→ [Zamknout] (jen MANAGE - přímý lock)
            │
            ↓
        ZAMKNUTA SPRÁVCEM
            │
            └─→ [Odemknout (Admin)] (jen MANAGE)
                    │
                    ↓
                (zpět na AKTIVNÍ)
```

---

## 📝 Changelog

### 9.11.2025 - Oprávnění + LocalStorage

**Opraveno:**
1. ✅ `handleCloseMonth` - kontroluje `EDIT_OWN` + vlastnictví knihy
2. ✅ `handleUnlockBook` - kontroluje `EDIT_OWN` + vlastnictví pro `uzavrena_uzivatelem`, blokuje `zamknuta_spravcem` pro ne-adminy
3. ✅ Workflow tlačítka - viditelná jen pro uživatele s `EDIT_OWN` (vlastní kniha) nebo `MANAGE` (všechny knihy)

**Přidáno:**
4. ✅ LocalStorage persistence pro výběr měsíce/roku (`cashbook_selector_period`)
5. ✅ LocalStorage persistence pro výběr pokladny (`cashbook_selector_cashbox`)

**Testováno:**
- ⏳ Čeká na manuální test v prohlížeči

---

## 🎯 Příští kroky

1. **Test v prohlížeči:**
   - Ověřit oprávnění pro běžného uživatele (EDIT_OWN)
   - Ověřit oprávnění pro admina (MANAGE)
   - Ověřit LocalStorage persistence (F5 + routing)

2. **Rozšíření pro EDIT_ALL (volitelné):**
   - Pokud má `EDIT_ALL` zobrazovat workflow tlačítka i pro cizí knihy, změnit podmínku viditelnosti

3. **Backend kontrola:**
   - Ověřit, že backend API (`/close-month`, `/reopen-book`, `/lock-book`) kontrolují oprávnění na serveru

---

## ✅ Status: KOMPLETNÍ

Všechny požadované změny byly implementovány. Čeká se na test v prohlížeči.
