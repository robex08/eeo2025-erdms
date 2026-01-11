# 📋 Changelog: Validace hlavního správce pokladny

**Datum:** 2025-01-04  
**Autor:** Development Team  
**Verze:** 1.95b+

---

## 🎯 Cíl změny

Zabránit situaci, kdy uživatel je hlavním správcem více pokladen současně, aniž by o tom věděl. Systém nyní:
1. **Varuje** uživatele před přiřazením, pokud už je hlavním správcem jiné pokladny
2. **Nabídne** možnost přidat uživatele jako zástupce místo hlavního
3. **Zajišťuje** konzistenci dat v databázi

---

## 📝 Popis problému

### Původní stav
- Uživatel mohl být přiřazen jako hlavní správce více pokladen
- Backend automaticky odebral hlavní status z předchozí pokladny, ale **bez upozornění**
- Správce pokladny nevěděl, že přesunul hlavní status z jiné pokladny
- Nebylo jasné, kde je uživatel skutečně hlavním správcem

### Požadované chování
- Při přiřazování uživatele jako hlavního správce zkontrolovat, jestli už není hlavním jinde
- Zobrazit **warning dialog** s názvem konfliktní pokladny
- Dát uživateli možnost:
  - **Zrušit** operaci
  - **Přidat jako zástupce** místo hlavního

---

## 🔧 Implementované změny

### 1. **CreateCashboxDialog.js** - Vytváření nové pokladny

**Soubor:** `apps/eeo-v2/client/src/components/cashbook/CreateCashboxDialog.js`

**Funkce:** `handleAddUser` (upraveno na `async`)

**Změny:**
```javascript
// PŘED
const handleAddUser = () => {
  // ... validace
  const jeHlavni = !newUserForm.je_zastupce;
  if (jeHlavni) {
    setAssignedUsers(prev => prev.map(u => ({ ...u, je_hlavni: false })));
  }
  // ... zbytek
};

// PO
const handleAddUser = async () => {
  // ... validace
  let jeHlavni = !newUserForm.je_zastupce;
  
  // 🆕 KONTROLA EXISTUJÍCÍ HLAVNÍ PŘIŘAZENÍ
  if (jeHlavni) {
    try {
      const allAssignmentsResult = await cashbookAPI.listAssignments(parseInt(userId), true);
      const existingMain = allAssignmentsResult.data.assignments.find(
        a => parseInt(a.je_hlavni) === 1 && a.pokladna_id !== formData.id
      );
      
      if (existingMain) {
        const cashboxName = existingMain.cislo_pokladny || `Pokladna ${existingMain.pokladna_id}`;
        const confirmed = window.confirm(
          `Uživatel "${userName}" je již hlavním správcem pokladny "${cashboxName}".\n\n` +
          `Uživatel může být hlavním správcem pouze u jedné pokladny.\n\n` +
          `Chcete jej přidat jako zástupce?`
        );
        
        if (!confirmed) {
          return; // Zrušit operaci
        }
        
        jeHlavni = false; // Přidat jako zástupce
        showToast('Uživatel přidán jako zástupce', 'info');
      } else {
        // Pokud je hlavní a nemá jinou hlavní pokladnu, odebrat hlavní status ostatním v této pokladně
        setAssignedUsers(prev => prev.map(u => ({ ...u, je_hlavni: false })));
      }
    } catch (error) {
      console.error('Chyba při kontrole přiřazení:', error);
      showToast('Chyba při kontrole přiřazení uživatele', 'error');
      return;
    }
  }
  // ... zbytek
};
```

---

### 2. **EditCashboxDialog.js** - Editace existující pokladny

**Soubor:** `apps/eeo-v2/client/src/components/cashbook/EditCashboxDialog.js`

#### 2a. Funkce `handleAddUser`

**Změny:** Přidána stejná validace jako v CreateCashboxDialog

```javascript
const handleAddUser = async () => {
  if (!selectedUser) return;

  try {
    let jeHlavni = isMainUser ? 0 : 1; // isMainUser checkbox = "Zástupce"

    // 🆕 KONTROLA EXISTUJÍCÍ HLAVNÍ PŘIŘAZENÍ
    if (jeHlavni === 1) {
      try {
        const allAssignmentsResult = await cashbookAPI.listAssignments(parseInt(selectedUser), true);
        const existingMain = allAssignmentsResult.data.assignments.find(
          a => parseInt(a.je_hlavni) === 1 && parseInt(a.pokladna_id) !== parseInt(cashbox.id)
        );
        
        if (existingMain) {
          const cashboxName = existingMain.cislo_pokladny || `Pokladna ${existingMain.pokladna_id}`;
          const addedUser = availableUsers.find(u => u.id === parseInt(selectedUser));
          const userName = addedUser?.name || 'Uživatel';
          
          const confirmed = window.confirm(
            `Uživatel "${userName}" je již hlavním správcem pokladny "${cashboxName}".\n\n` +
            `Uživatel může být hlavním správcem pouze u jedné pokladny.\n\n` +
            `Chcete jej přidat jako zástupce?`
          );
          
          if (!confirmed) {
            return;
          }
          
          jeHlavni = 0;
          showToast('Uživatel bude přidán jako zástupce', 'info');
        }
      } catch (checkError) {
        console.error('Chyba při kontrole přiřazení:', checkError);
        showToast('Chyba při kontrole přiřazení uživatele', 'error');
        return;
      }
    }

    // ... pokračování s assignUserToCashbox(je_hlavni: jeHlavni)
  } catch (err) {
    // ... error handling
  }
};
```

#### 2b. Funkce `handleToggleMain`

**Změny:** Přidán parametr `uzivatelId` a validace při změně statusu

```javascript
// PŘED
const handleToggleMain = async (assignmentId, currentStatus, userName) => {
  const newStatus = currentStatus === 1 ? 0 : 1;
  const result = await cashbookAPI.updateUserMainStatus(assignmentId, newStatus);
  // ...
};

// PO
const handleToggleMain = async (assignmentId, currentStatus, userName, uzivatelId) => {
  try {
    const newStatus = currentStatus === 1 ? 0 : 1;

    // 🆕 KONTROLA PŘI NASTAVENÍ JAKO HLAVNÍ
    if (newStatus === 1) {
      try {
        const allAssignmentsResult = await cashbookAPI.listAssignments(parseInt(uzivatelId), true);
        const existingMain = allAssignmentsResult.data.assignments.find(
          a => parseInt(a.je_hlavni) === 1 && parseInt(a.pokladna_id) !== parseInt(cashbox.id)
        );
        
        if (existingMain) {
          const cashboxName = existingMain.cislo_pokladny || `Pokladna ${existingMain.pokladna_id}`;
          const confirmed = window.confirm(
            `Uživatel "${userName}" je již hlavním správcem pokladny "${cashboxName}".\n\n` +
            `Uživatel může být hlavním správcem pouze u jedné pokladny.\n\n` +
            `Pokud potvrdíte, bude automaticky odebrán jako hlavní z "${cashboxName}" a nastaven jako hlavní zde.\n\n` +
            `Pokračovat?`
          );
          
          if (!confirmed) {
            return;
          }
        }
      } catch (checkError) {
        console.error('Chyba při kontrole přiřazení:', checkError);
        showToast('Chyba při kontrole přiřazení uživatele', 'error');
        return;
      }
    }

    const result = await cashbookAPI.updateUserMainStatus(assignmentId, newStatus);
    // ...
  } catch (err) {
    // ...
  }
};
```

**⚠️ Poznámka:** Funkce `handleToggleMain` není aktuálně používána v UI, ale byla upravena pro budoucí použití.

---

## 🔄 Backend logika (beze změn)

Backend již měl implementovanou automatickou správu hlavních přiřazení:

**Soubor:** `v2025.03_25/models/CashboxAssignmentModel.php`

```php
public function updateAssignment($assignmentId, $data) {
    // ...
    
    // Pokud se nastavuje jako hlavní, deaktivovat ostatní hlavní
    if (isset($data['je_hlavni']) && $data['je_hlavni'] == 1) {
        $this->unsetMainAssignment($assignment['uzivatel_id'], $assignmentId);
    }
    
    // ...
}

public function createAssignment($data) {
    // ...
    
    // Pokud je hlavní, odebrat hlavní status ostatním přiřazením téhož uživatele
    if ($jeHlavni == 1) {
        $this->unsetMainAssignment($data['uzivatel_id']);
    }
    
    // ...
}
```

**Problém:** Backend automaticky odebírá hlavní status z jiných pokladen, ale uživatel o tom neví.

**Řešení:** Frontend nyní kontroluje situaci PŘED odesláním na backend a upozorní uživatele.

---

## 📊 Testovací scénáře

### Scénář 1: Vytvoření nové pokladny s hlavním správcem
1. Otevřít dialog "Nová pokladna"
2. Vyplnit základní údaje
3. Přidat uživatele, který již je hlavním správcem jiné pokladny
4. Ponechat checkbox "Je zástupce" **nezaškrtnutý** (= hlavní)
5. Kliknout "Přidat"

**Očekávaný výsledek:**
- Zobrazí se dialog: `Uživatel "Jan Novák" je již hlavním správcem pokladny "POKLADNA-001". Chcete jej přidat jako zástupce?`
- Možnosti: `OK` (přidat jako zástupce) nebo `Zrušit`

### Scénář 2: Přidání uživatele k existující pokladně
1. Otevřít existující pokladnu k editaci
2. V sekci "Přiřazení uživatelé" vybrat uživatele, který je hlavním jinde
3. Ponechat checkbox "Zástupce" **nezaškrtnutý** (= hlavní)
4. Kliknout "Přidat"

**Očekávaný výsledek:**
- Zobrazí se dialog s upozorněním
- Uživatel může zrušit nebo potvrdit přidání jako zástupce

### Scénář 3: Přidání uživatele jako zástupce (bez konfliktu)
1. Otevřít dialog vytvoření/editace pokladny
2. Přidat uživatele
3. Zaškrtnout checkbox "Je zástupce"
4. Kliknout "Přidat"

**Očekávaný výsledek:**
- Žádný warning dialog
- Uživatel přidán jako zástupce okamžitě

### Scénář 4: Změna statusu existujícího přiřazení (pokud bude implementováno v UI)
1. U existujícího přiřazení kliknout na tlačítko pro změnu statusu
2. Pokud měníme z "Zástupce" na "Hlavní" a uživatel je hlavním jinde

**Očekávaný výsledek:**
- Zobrazí se dialog s upozorněním
- Informace, že hlavní status bude odebrán z jiné pokladny

---

## 🎨 UI/UX změny

### Confirm dialog (window.confirm)

```
┌─────────────────────────────────────────────────────────┐
│  Webová stránka říká:                                   │
│                                                          │
│  Uživatel "Jan Novák" je již hlavním správcem pokladny  │
│  "POKLADNA-001".                                         │
│                                                          │
│  Uživatel může být hlavním správcem pouze u jedné       │
│  pokladny.                                               │
│                                                          │
│  Chcete jej přidat jako zástupce?                       │
│                                                          │
│              [ OK ]            [ Zrušit ]               │
└─────────────────────────────────────────────────────────┘
```

### Toast notifikace

Po kliknutí na **OK**:
```
ℹ️ Uživatel bude přidán jako zástupce
```

---

## 🔍 Technické detaily

### API endpoint použitý pro validaci

**Endpoint:** `/cashbox-assignments-list`

**Request:**
```javascript
await cashbookAPI.listAssignments(uzivatelId, true);
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "assignments": [
      {
        "prirazeni_id": 123,
        "uzivatel_id": 45,
        "pokladna_id": 10,
        "cislo_pokladny": "POKLADNA-001",
        "je_hlavni": 1,
        "platne_od": "2024-01-01",
        "platne_do": null
      }
    ]
  }
}
```

### Kontrolní logika

```javascript
const existingMain = allAssignmentsResult.data.assignments.find(
  a => parseInt(a.je_hlavni) === 1 && 
       parseInt(a.pokladna_id) !== parseInt(currentCashboxId)
);

if (existingMain) {
  // Zobrazit warning
}
```

**Podmínky:**
- `je_hlavni === 1` - uživatel je hlavním správcem
- `pokladna_id !== currentCashboxId` - jedná se o JINOU pokladnu, ne tu aktuálně editovanou

---

## ✅ Co se změnilo vs. nezměnilo

### ✅ Změněno
- **Frontend validace** při přidávání uživatele jako hlavního
- **Uživatelská zkušenost** - jasné upozornění na konflikt
- **Možnost zrušení** operace

### ❌ Nezměněno
- **Backend logika** - stále automaticky odebírá hlavní status z jiných přiřazení
- **Databázová struktura** - žádné nové tabulky nebo sloupce
- **API endpointy** - používají se existující endpointy

---

## 🐛 Známé limitace

1. **Window.confirm místo custom modalu**
   - Používá nativní browser dialog místo vlastního modalu
   - Důvod: Rychlejší implementace, konzistentní napříč browsery
   - Možné budoucí vylepšení: Vlastní modal s lepším designem

2. **handleToggleMain není používána**
   - Funkce má validaci, ale není volána z UI
   - Pokud bude v budoucnu přidáno tlačítko pro změnu statusu, bude validace fungovat

---

## 📚 Související dokumentace

- [CASHBOX_ASSIGNMENT_LOGIC_EXPLAINED.md](./CASHBOX_ASSIGNMENT_LOGIC_EXPLAINED.md) - Vysvětlení logiky je_hlavni
- [CHANGELOG_CASHBOOK_ASSIGNMENT_DATE_VALIDATION.md](./CHANGELOG_CASHBOOK_ASSIGNMENT_DATE_VALIDATION.md) - Validace datumů přiřazení
- [CHANGELOG_NOTIFICATION_TRIGGERS_FIX.md](./CHANGELOG_NOTIFICATION_TRIGGERS_FIX.md) - Oprava FK constraints

---

## 🎓 Příklady použití

### Příklad 1: Přidání prvního hlavního správce
```
Uživatel: Jan Novák
Pokladna: POKLADNA-NEW (nová)
Checkbox "Je zástupce": NEzaškrtnutý

→ Žádný warning
→ Jan Novák přidán jako hlavní správce
```

### Příklad 2: Přidání druhého hlavního správce
```
Uživatel: Jan Novák (již hlavní u POKLADNA-001)
Pokladna: POKLADNA-002
Checkbox "Je zástupce": NEzaškrtnutý

→ Warning dialog se zobrazí
→ Uživatel zvolí "OK" → Jan přidán jako zástupce
→ Toast: "Uživatel bude přidán jako zástupce"
```

### Příklad 3: Přidání zástupce (bez konfliktu)
```
Uživatel: Jan Novák (již hlavní u POKLADNA-001)
Pokladna: POKLADNA-002
Checkbox "Je zástupce": Zaškrtnutý

→ Žádný warning
→ Jan Novák přidán jako zástupce okamžitě
```

---

## 🔐 Bezpečnost

- **Frontend validace** je pouze UX vylepšení
- **Backend** stále provádí finální kontrolu a automaticky upravuje data
- **Žádná nová security rizika** zavedena

---

## 📅 Historie verzí

| Verze | Datum | Autor | Popis |
|-------|-------|-------|-------|
| 1.0 | 2025-01-04 | Dev Team | První implementace validace hlavního správce |

---

**Konec dokumentu**
