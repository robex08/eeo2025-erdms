# 🚀 FRONTEND IMPLEMENTACE - CASHBOOK API V2

**Datum:** 8. listopadu 2025  
**BE API Status:** ✅ DOKONČENO (commit 4e3aebc)  
**FE Status:** 🔄 PŘIPRAVENO K IMPLEMENTACI

---

## 📋 OVĚŘENÍ BE IMPLEMENTACE

Před zahájením FE implementace **MUSÍME** ověřit, že BE API skutečně vrací všechna pole podle dokumentace:

### ✅ Test 1: Přiřazení pokladen
```bash
# Test GET assignments
curl -X POST http://localhost/api.eeo/cashbox-assignments-list \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","token":"BASE64_TOKEN","active_only":true}'

# Očekávaný response:
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "uzivatel_id": 1,
      "cislo_pokladny": 100,
      "ciselna_rada_vpd": "599",
      "ciselna_rada_ppd": "499",
      "je_hlavni": 1,
      "platne_od": "2025-11-08",
      "platne_do": null,
      "poznamka": "Sdílená pokladna"
    }
  ]
}
```

### ✅ Test 2: Globální nastavení
```bash
curl -X POST http://localhost/api.eeo/cashbox-settings-get \
  -d '{"username":"admin","token":"..."}'

# Očekáváno:
{
  "status": "ok",
  "data": {
    "cashbook_use_prefix": "1"
  }
}
```

### ✅ Test 3: Kniha s prefixem
```bash
# Vytvořit knihu
curl -X POST http://localhost/api.eeo/cashbook-create \
  -d '{"username":"admin","token":"...","prirazeni_pokladny_id":1,"rok":2025,"mesic":11}'

# Vytvořit položku
curl -X POST http://localhost/api.eeo/cashbook-entry-create \
  -d '{"username":"admin","token":"...","book_id":1,"datum_zapisu":"2025-11-08","obsah_zapisu":"Test","castka_vydaj":100}'

# Zkontrolovat číslo dokladu
curl -X POST http://localhost/api.eeo/cashbook-get \
  -d '{"username":"admin","token":"...","book_id":1}'

# Očekáváno v položkách:
{
  "entries": [
    {
      "cislo_dokladu": "V599-001",  // S PREFIXEM!
      "cislo_poradi_v_roce": 1
    }
  ]
}
```

### ✅ Test 4: 3 stavy knihy
```bash
# 1. Uzavřít měsíc (uživatel)
curl -X POST http://localhost/api.eeo/cashbook-close \
  -d '{"username":"admin","token":"...","book_id":1,"akce":"uzavrit_mesic"}'

# GET - očekáváno:
{
  "stav_knihy": "uzavrena_uzivatelem",
  "uzavrena_uzivatelem_kdy": "2025-11-08 15:30:00"
}

# 2. Zamknout (správce)
curl -X POST http://localhost/api.eeo/cashbook-lock \
  -d '{"username":"admin","token":"...","book_id":1}'

# GET - očekáváno:
{
  "stav_knihy": "zamknuta_spravcem",
  "zamknuta_spravcem_kdy": "2025-11-08 15:35:00",
  "zamknuta_spravcem_kym": 1
}

# 3. Odemknout
curl -X POST http://localhost/api.eeo/cashbook-reopen \
  -d '{"username":"admin","token":"...","book_id":1}'

# GET - očekáváno:
{
  "stav_knihy": "aktivni"
}
```

---

## 🎯 IMPLEMENTAČNÍ PLÁN KROK PO KROKU

### KROK 1: Vytvoření cashbookService.js ⏱️ 2-3 hodiny

**Soubor:** `src/services/cashbookService.js`

**Struktura:**
```javascript
// Importy
import axios from 'axios';

const API_BASE = '/api.eeo';

// Helper pro autentizaci
const getAuthData = () => {
  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token'); // nebo odkud berete auth
  return { username, token };
};

// API wrapper
const cashbookAPI = {
  // === PŮVODNÍ ENDPOINTY ===
  
  // 1. Seznam knih
  listBooks: async (userId, rok, mesic) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-list`, {
      ...auth,
      uzivatel_id: userId,
      rok,
      mesic
    });
    return response.data;
  },
  
  // 2. Detail knihy
  getBook: async (bookId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-get`, {
      ...auth,
      book_id: bookId
    });
    return response.data;
  },
  
  // 3. Vytvořit knihu
  createBook: async (prirazeniPokladnyId, rok, mesic) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-create`, {
      ...auth,
      prirazeni_pokladny_id: prirazeniPokladnyId,
      rok,
      mesic
    });
    return response.data;
  },
  
  // 4. Upravit knihu
  updateBook: async (bookId, updates) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-update`, {
      ...auth,
      book_id: bookId,
      ...updates
    });
    return response.data;
  },
  
  // 5. Uzavřít měsíc (uživatel)
  closeMonth: async (bookId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-close`, {
      ...auth,
      book_id: bookId,
      akce: 'uzavrit_mesic'
    });
    return response.data;
  },
  
  // 6. Znovu otevřít knihu
  reopenBook: async (bookId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-reopen`, {
      ...auth,
      book_id: bookId
    });
    return response.data;
  },
  
  // 7. Vytvořit položku
  createEntry: async (entryData) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-entry-create`, {
      ...auth,
      ...entryData
    });
    return response.data;
  },
  
  // 8. Upravit položku
  updateEntry: async (entryId, updates) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-entry-update`, {
      ...auth,
      entry_id: entryId,
      ...updates
    });
    return response.data;
  },
  
  // 9. Smazat položku (soft delete)
  deleteEntry: async (entryId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-entry-delete`, {
      ...auth,
      entry_id: entryId
    });
    return response.data;
  },
  
  // 10. Obnovit položku
  restoreEntry: async (entryId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-entry-restore`, {
      ...auth,
      entry_id: entryId
    });
    return response.data;
  },
  
  // 11. Audit log
  getAuditLog: async (bookId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-audit-log`, {
      ...auth,
      book_id: bookId
    });
    return response.data;
  },
  
  // === NOVÉ ENDPOINTY - PŘIŘAZENÍ ===
  
  // 12. Seznam přiřazení
  listAssignments: async (userId = null, activeOnly = true) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbox-assignments-list`, {
      ...auth,
      uzivatel_id: userId,
      active_only: activeOnly
    });
    return response.data;
  },
  
  // 13. Vytvořit přiřazení
  createAssignment: async (assignmentData) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbox-assignment-create`, {
      ...auth,
      ...assignmentData
    });
    return response.data;
  },
  
  // 14. Upravit přiřazení
  updateAssignment: async (assignmentId, updates) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbox-assignment-update`, {
      ...auth,
      assignment_id: assignmentId,
      ...updates
    });
    return response.data;
  },
  
  // 15. Smazat přiřazení
  deleteAssignment: async (assignmentId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbox-assignment-delete`, {
      ...auth,
      assignment_id: assignmentId
    });
    return response.data;
  },
  
  // === NOVÉ ENDPOINTY - NASTAVENÍ ===
  
  // 16. Získat nastavení
  getSettings: async (key = null) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbox-settings-get`, {
      ...auth,
      key
    });
    return response.data;
  },
  
  // 17. Upravit nastavení
  updateSetting: async (key, value, description = null) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbox-settings-update`, {
      ...auth,
      key,
      value,
      description
    });
    return response.data;
  },
  
  // === NOVÉ ENDPOINTY - ZAMYKÁNÍ ===
  
  // 18. Zamknout knihu (správce)
  lockBook: async (bookId) => {
    const auth = getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-lock`, {
      ...auth,
      book_id: bookId
    });
    return response.data;
  }
};

export default cashbookAPI;
```

**Git backup po dokončení:**
```bash
git add src/services/cashbookService.js
git commit -m "CASHBOOK FE: Service layer - 18 API endpoints"
git push
```

---

### KROK 2: Přiřazení pokladen v CashBookPage.js ⏱️ 2-3 hodiny

**Úkoly:**
1. Načíst seznam přiřazení při mount
2. Dropdown pro výběr pokladny (pokud více přiřazení)
3. Zobrazit číslo pokladny + číselné řady
4. Použít `prirazeni_pokladny_id` při vytváření knihy

**Implementace:**

```javascript
// CashBookPage.js - přidat state
const [assignments, setAssignments] = useState([]);
const [selectedAssignment, setSelectedAssignment] = useState(null);
const [loadingAssignments, setLoadingAssignments] = useState(true);

// Při mount načíst přiřazení
useEffect(() => {
  const loadAssignments = async () => {
    try {
      const result = await cashbookAPI.listAssignments(userId, true);
      if (result.status === 'ok') {
        setAssignments(result.data);
        
        // Vybrat hlavní pokladnu jako default
        const mainAssignment = result.data.find(a => a.je_hlavni === 1);
        setSelectedAssignment(mainAssignment || result.data[0]);
      }
    } catch (error) {
      console.error('Chyba při načítání přiřazení:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };
  
  loadAssignments();
}, [userId]);

// UI - Dropdown pro výběr pokladny
{assignments.length > 1 && (
  <div className="cashbook-assignment-selector">
    <label>Pokladna:</label>
    <select 
      value={selectedAssignment?.id} 
      onChange={(e) => {
        const assignment = assignments.find(a => a.id === parseInt(e.target.value));
        setSelectedAssignment(assignment);
      }}
    >
      {assignments.map(assignment => (
        <option key={assignment.id} value={assignment.id}>
          Pokladna {assignment.cislo_pokladny} - 
          VPD: {assignment.ciselna_rada_vpd}, 
          PPD: {assignment.ciselna_rada_ppd}
          {assignment.je_hlavni === 1 && ' (hlavní)'}
        </option>
      ))}
    </select>
  </div>
)}

// Při vytváření knihy použít assignment
const createNewBook = async (year, month) => {
  if (!selectedAssignment) {
    alert('Není vybráno přiřazení pokladny!');
    return;
  }
  
  const result = await cashbookAPI.createBook(
    selectedAssignment.id,  // ✅ NOVÝ PARAMETR
    year,
    month
  );
  
  // ... zbytek logiky
};
```

**Git backup:**
```bash
git add src/pages/CashBookPage.js
git commit -m "CASHBOOK FE: Přiřazení pokladen - dropdown a výběr"
git push
```

---

### KROK 3: 3-stavový workflow uzavírání ⏱️ 2 hodiny

**Stavy knihy:**
- `aktivni` → zelená, lze editovat
- `uzavrena_uzivatelem` → žlutá, čeká na schválení
- `zamknuta_spravcem` → červená, archivováno

**UI komponenta:**

```javascript
// BookStatusBadge.js
const BookStatusBadge = ({ book, userPermissions }) => {
  const getStatusInfo = (stav) => {
    switch (stav) {
      case 'aktivni':
        return { label: 'Aktivní', color: 'green', icon: '✓' };
      case 'uzavrena_uzivatelem':
        return { label: 'Uzavřená (čeká na schválení)', color: 'orange', icon: '⏳' };
      case 'zamknuta_spravcem':
        return { label: 'Zamknutá správcem', color: 'red', icon: '🔒' };
      default:
        return { label: 'Neznámý', color: 'gray', icon: '?' };
    }
  };
  
  const statusInfo = getStatusInfo(book.stav_knihy);
  
  return (
    <div className={`book-status book-status-${statusInfo.color}`}>
      <span className="status-icon">{statusInfo.icon}</span>
      <span className="status-label">{statusInfo.label}</span>
      
      {/* Datum uzavření uživatelem */}
      {book.uzavrena_uzivatelem_kdy && (
        <small>Uzavřeno: {formatDate(book.uzavrena_uzivatelem_kdy)}</small>
      )}
      
      {/* Datum zamknutí správcem */}
      {book.zamknuta_spravcem_kdy && (
        <small>Zamknuto: {formatDate(book.zamknuta_spravcem_kdy)}</small>
      )}
      
      {/* Akční tlačítka */}
      <div className="status-actions">
        {/* Uzavřít měsíc - pouze pokud aktivní a je majitel */}
        {book.stav_knihy === 'aktivni' && book.is_owner && (
          <button onClick={() => handleCloseMonth(book.id)}>
            Uzavřít měsíc
          </button>
        )}
        
        {/* Zamknout - pouze správce a pokud uzavřená uživatelem */}
        {book.stav_knihy === 'uzavrena_uzivatelem' && userPermissions.includes('CASH_BOOK_MANAGE') && (
          <button onClick={() => handleLockBook(book.id)}>
            Zamknout knihu
          </button>
        )}
        
        {/* Odemknout - pouze správce */}
        {book.stav_knihy !== 'aktivni' && userPermissions.includes('CASH_BOOK_MANAGE') && (
          <button onClick={() => handleReopenBook(book.id)}>
            Odemknout knihu
          </button>
        )}
      </div>
    </div>
  );
};

// Handlers
const handleCloseMonth = async (bookId) => {
  if (!confirm('Opravdu chcete uzavřít tento měsíc? Čeká pak na schválení správce.')) {
    return;
  }
  
  try {
    const result = await cashbookAPI.closeMonth(bookId);
    if (result.status === 'ok') {
      alert('Měsíc byl uzavřen. Čeká na schválení správce.');
      // Reload book
      await loadBooks();
    }
  } catch (error) {
    alert('Chyba při uzavírání měsíce: ' + error.message);
  }
};

const handleLockBook = async (bookId) => {
  if (!confirm('Opravdu chcete zamknout tuto knihu? Uživatel nebude moci dále editovat.')) {
    return;
  }
  
  try {
    const result = await cashbookAPI.lockBook(bookId);
    if (result.status === 'ok') {
      alert('Kniha byla zamknuta.');
      await loadBooks();
    }
  } catch (error) {
    alert('Chyba při zamykání knihy: ' + error.message);
  }
};

const handleReopenBook = async (bookId) => {
  if (!confirm('Opravdu chcete odemknout knihu? Bude opět aktivní pro editaci.')) {
    return;
  }
  
  try {
    const result = await cashbookAPI.reopenBook(bookId);
    if (result.status === 'ok') {
      alert('Kniha byla odemknuta.');
      await loadBooks();
    }
  } catch (error) {
    alert('Chyba při odemykání knihy: ' + error.message);
  }
};
```

**Validace před editací:**
```javascript
// Před každou editací zkontrolovat stav
const canEditEntry = (book) => {
  return book.stav_knihy === 'aktivni';
};

// Při pokusu o editaci
if (!canEditEntry(currentBook)) {
  alert('Kniha je uzavřená nebo zamknutá. Nelze editovat položky.');
  return;
}
```

**Git backup:**
```bash
git add src/pages/CashBookPage.js src/components/BookStatusBadge.js
git commit -m "CASHBOOK FE: 3-stavový workflow uzavírání knih"
git push
```

---

### KROK 4: Zobrazení prefixovaných čísel dokladů ⏱️ 1 hodina

**Úkoly:**
1. Načíst globální nastavení `cashbook_use_prefix`
2. Zobrazit číslo dokladu s prefixem (V599-001 místo V001)
3. BE generuje automaticky - FE pouze zobrazuje

**Implementace:**

```javascript
// State pro nastavení
const [usePrefixSetting, setUsePrefixSetting] = useState(true);

// Načíst při mount
useEffect(() => {
  const loadSettings = async () => {
    try {
      const result = await cashbookAPI.getSettings('cashbook_use_prefix');
      if (result.status === 'ok') {
        setUsePrefixSetting(result.data.value === '1');
      }
    } catch (error) {
      console.error('Chyba při načítání nastavení:', error);
    }
  };
  
  loadSettings();
}, []);

// Zobrazení v tabulce položek
<td className="entry-number">
  {entry.cislo_dokladu}  {/* BE vrací už s prefixem - V599-001 */}
</td>

// Tooltip s informacemi
<td className="entry-number" title={`Pořadí v roce: ${entry.cislo_poradi_v_roce}`}>
  {entry.cislo_dokladu}
</td>
```

**CSS pro zvýraznění:**
```css
.entry-number {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #2c3e50;
  white-space: nowrap;
}

.entry-number-prefix {
  color: #e74c3c; /* Červený prefix */
}

.entry-number-main {
  color: #3498db; /* Modrá číslice */
}
```

**Git backup:**
```bash
git add src/pages/CashBookPage.js src/styles/cashbook.css
git commit -m "CASHBOOK FE: Zobrazení prefixovaných čísel dokladů"
git push
```

---

### KROK 5: Hybrid localStorage + DB sync ⏱️ 3-4 hodiny

**Strategie:**
- **localStorage** - primární pro rychlost
- **DB** - sync při každém uložení
- **Load from DB** - pokud localStorage prázdný (první přístup nebo nový device)

**Implementace:**

```javascript
// CashBookPage.js

// Konstanty pro localStorage keys
const LS_PREFIX = 'cashbook_';

const getLocalStorageKey = (userId, year, month) => {
  return `${LS_PREFIX}${userId}_${year}_${month}`;
};

// Load data - hybrid přístup
const loadBookData = async (userId, year, month) => {
  const lsKey = getLocalStorageKey(userId, year, month);
  
  try {
    // 1. Zkusit localStorage první
    const localData = localStorage.getItem(lsKey);
    
    if (localData) {
      console.log('✓ Načteno z localStorage (rychlé)');
      const parsed = JSON.parse(localData);
      setCurrentBook(parsed);
      return parsed;
    }
    
    // 2. Pokud není v localStorage, načíst z DB
    console.log('→ localStorage prázdný, načítám z DB...');
    const result = await cashbookAPI.listBooks(userId, year, month);
    
    if (result.status === 'ok' && result.data.books.length > 0) {
      const book = result.data.books[0];
      
      // Načíst detail včetně položek
      const detailResult = await cashbookAPI.getBook(book.id);
      
      if (detailResult.status === 'ok') {
        const fullBook = detailResult.data;
        
        // Uložit do localStorage pro příště
        localStorage.setItem(lsKey, JSON.stringify(fullBook));
        console.log('✓ Načteno z DB a uloženo do localStorage');
        
        setCurrentBook(fullBook);
        return fullBook;
      }
    } else {
      // Kniha neexistuje ani v DB - vytvořit novou
      console.log('→ Kniha neexistuje, vytváření nové...');
      return await createNewBook(userId, year, month);
    }
    
  } catch (error) {
    console.error('Chyba při načítání knihy:', error);
    // Fallback na localStorage pokud DB nedostupná
    const localData = localStorage.getItem(lsKey);
    if (localData) {
      console.warn('⚠ DB nedostupná, použit localStorage backup');
      return JSON.parse(localData);
    }
    throw error;
  }
};

// Save data - sync do obou míst
const saveEntry = async (entryData) => {
  try {
    // 1. Uložit do DB
    const result = await cashbookAPI.createEntry(entryData);
    
    if (result.status === 'ok') {
      const newEntry = result.data;
      
      // 2. Aktualizovat localStorage
      const updatedBook = {
        ...currentBook,
        entries: [...currentBook.entries, newEntry]
      };
      
      const lsKey = getLocalStorageKey(userId, currentYear, currentMonth);
      localStorage.setItem(lsKey, JSON.stringify(updatedBook));
      
      setCurrentBook(updatedBook);
      console.log('✓ Položka uložena do DB + localStorage');
      
      return newEntry;
    }
  } catch (error) {
    console.error('Chyba při ukládání:', error);
    
    // Offline mode - uložit pouze do localStorage
    // Označit pro pozdější sync
    const offlineEntry = {
      ...entryData,
      _offline: true,
      _tempId: Date.now()
    };
    
    const updatedBook = {
      ...currentBook,
      entries: [...currentBook.entries, offlineEntry]
    };
    
    const lsKey = getLocalStorageKey(userId, currentYear, currentMonth);
    localStorage.setItem(lsKey, JSON.stringify(updatedBook));
    
    console.warn('⚠ Offline mode - uloženo pouze do localStorage');
    setCurrentBook(updatedBook);
    
    // TODO: Přidat do fronty pro pozdější sync
    addToSyncQueue(offlineEntry);
    
    return offlineEntry;
  }
};

// Update entry
const updateEntry = async (entryId, updates) => {
  try {
    // 1. Update v DB
    const result = await cashbookAPI.updateEntry(entryId, updates);
    
    if (result.status === 'ok') {
      // 2. Update v localStorage
      const updatedBook = {
        ...currentBook,
        entries: currentBook.entries.map(e => 
          e.id === entryId ? { ...e, ...updates } : e
        )
      };
      
      const lsKey = getLocalStorageKey(userId, currentYear, currentMonth);
      localStorage.setItem(lsKey, JSON.stringify(updatedBook));
      
      setCurrentBook(updatedBook);
      console.log('✓ Položka aktualizována v DB + localStorage');
    }
  } catch (error) {
    console.error('Chyba při aktualizaci:', error);
    alert('Chyba při ukládání změn: ' + error.message);
  }
};

// Delete entry (soft delete)
const deleteEntry = async (entryId) => {
  try {
    const result = await cashbookAPI.deleteEntry(entryId);
    
    if (result.status === 'ok') {
      // Odstranit z localStorage
      const updatedBook = {
        ...currentBook,
        entries: currentBook.entries.filter(e => e.id !== entryId)
      };
      
      const lsKey = getLocalStorageKey(userId, currentYear, currentMonth);
      localStorage.setItem(lsKey, JSON.stringify(updatedBook));
      
      setCurrentBook(updatedBook);
      console.log('✓ Položka smazána z DB + localStorage');
    }
  } catch (error) {
    console.error('Chyba při mazání:', error);
    alert('Chyba při mazání: ' + error.message);
  }
};

// Sync queue pro offline režim
let syncQueue = [];

const addToSyncQueue = (entry) => {
  syncQueue.push(entry);
  localStorage.setItem('cashbook_sync_queue', JSON.stringify(syncQueue));
};

const processSyncQueue = async () => {
  if (syncQueue.length === 0) return;
  
  console.log(`→ Synchronizace ${syncQueue.length} offline položek...`);
  
  for (const entry of syncQueue) {
    try {
      await cashbookAPI.createEntry(entry);
      console.log(`✓ Synchronizována položka ${entry._tempId}`);
    } catch (error) {
      console.error(`✗ Chyba při sync položky ${entry._tempId}:`, error);
    }
  }
  
  syncQueue = [];
  localStorage.removeItem('cashbook_sync_queue');
};

// Při načtení app zkontrolovat sync queue
useEffect(() => {
  const queue = localStorage.getItem('cashbook_sync_queue');
  if (queue) {
    syncQueue = JSON.parse(queue);
    processSyncQueue();
  }
}, []);
```

**Git backup:**
```bash
git add src/pages/CashBookPage.js
git commit -m "CASHBOOK FE: Hybrid localStorage + DB sync implementace"
git push
```

---

### KROK 6: Admin panel - správa přiřazení ⏱️ 2-3 hodiny

**Pouze pro `CASH_BOOK_MANAGE` oprávnění**

**Komponenta:** `src/components/CashboxAssignmentManager.js`

```javascript
import React, { useState, useEffect } from 'react';
import cashbookAPI from '../services/cashbookService';

const CashboxAssignmentManager = ({ userPermissions }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    uzivatel_id: '',
    cislo_pokladny: '',
    ciselna_rada_vpd: '',
    ciselna_rada_ppd: '',
    je_hlavni: 0,
    platne_od: '',
    platne_do: '',
    poznamka: ''
  });
  
  // Načíst všechna přiřazení
  useEffect(() => {
    loadAssignments();
  }, []);
  
  const loadAssignments = async () => {
    try {
      const result = await cashbookAPI.listAssignments(null, false); // všechna
      if (result.status === 'ok') {
        setAssignments(result.data);
      }
    } catch (error) {
      console.error('Chyba při načítání:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Vytvořit nové
  const handleCreate = async () => {
    try {
      const result = await cashbookAPI.createAssignment(formData);
      if (result.status === 'ok') {
        alert('Přiřazení vytvořeno');
        loadAssignments();
        resetForm();
      }
    } catch (error) {
      alert('Chyba: ' + error.message);
    }
  };
  
  // Upravit existující
  const handleUpdate = async (assignmentId) => {
    try {
      const result = await cashbookAPI.updateAssignment(assignmentId, formData);
      if (result.status === 'ok') {
        alert('Přiřazení upraveno');
        loadAssignments();
        setEditingId(null);
        resetForm();
      }
    } catch (error) {
      alert('Chyba: ' + error.message);
    }
  };
  
  // Smazat
  const handleDelete = async (assignmentId) => {
    if (!confirm('Opravdu smazat přiřazení?')) return;
    
    try {
      const result = await cashbookAPI.deleteAssignment(assignmentId);
      if (result.status === 'ok') {
        alert('Přiřazení smazáno');
        loadAssignments();
      }
    } catch (error) {
      alert('Chyba: ' + error.message);
    }
  };
  
  const resetForm = () => {
    setFormData({
      uzivatel_id: '',
      cislo_pokladny: '',
      ciselna_rada_vpd: '',
      ciselna_rada_ppd: '',
      je_hlavni: 0,
      platne_od: '',
      platne_do: '',
      poznamka: ''
    });
  };
  
  // Zkontrolovat oprávnění
  if (!userPermissions.includes('CASH_BOOK_MANAGE')) {
    return <div>Nemáte oprávnění pro správu přiřazení pokladen.</div>;
  }
  
  return (
    <div className="cashbox-assignment-manager">
      <h2>Správa přiřazení pokladen</h2>
      
      {/* Tabulka přiřazení */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Uživatel</th>
            <th>Pokladna</th>
            <th>VPD</th>
            <th>PPD</th>
            <th>Hlavní</th>
            <th>Platnost od</th>
            <th>Platnost do</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map(a => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.uzivatel_id}</td>
              <td>{a.cislo_pokladny}</td>
              <td>{a.ciselna_rada_vpd}</td>
              <td>{a.ciselna_rada_ppd}</td>
              <td>{a.je_hlavni ? 'ANO' : 'NE'}</td>
              <td>{a.platne_od}</td>
              <td>{a.platne_do || '-'}</td>
              <td>
                <button onClick={() => {
                  setEditingId(a.id);
                  setFormData(a);
                }}>
                  Upravit
                </button>
                <button onClick={() => handleDelete(a.id)}>
                  Smazat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Formulář */}
      <div className="assignment-form">
        <h3>{editingId ? 'Upravit přiřazení' : 'Nové přiřazení'}</h3>
        
        <input
          type="number"
          placeholder="ID uživatele"
          value={formData.uzivatel_id}
          onChange={e => setFormData({...formData, uzivatel_id: e.target.value})}
        />
        
        <input
          type="number"
          placeholder="Číslo pokladny"
          value={formData.cislo_pokladny}
          onChange={e => setFormData({...formData, cislo_pokladny: e.target.value})}
        />
        
        <input
          type="text"
          placeholder="Číselná řada VPD (např. 591)"
          value={formData.ciselna_rada_vpd}
          onChange={e => setFormData({...formData, ciselna_rada_vpd: e.target.value})}
        />
        
        <input
          type="text"
          placeholder="Číselná řada PPD (např. 491)"
          value={formData.ciselna_rada_ppd}
          onChange={e => setFormData({...formData, ciselna_rada_ppd: e.target.value})}
        />
        
        <label>
          <input
            type="checkbox"
            checked={formData.je_hlavni === 1}
            onChange={e => setFormData({...formData, je_hlavni: e.target.checked ? 1 : 0})}
          />
          Hlavní pokladna
        </label>
        
        <input
          type="date"
          placeholder="Platnost od"
          value={formData.platne_od}
          onChange={e => setFormData({...formData, platne_od: e.target.value})}
        />
        
        <input
          type="date"
          placeholder="Platnost do"
          value={formData.platne_do}
          onChange={e => setFormData({...formData, platne_do: e.target.value})}
        />
        
        <textarea
          placeholder="Poznámka"
          value={formData.poznamka}
          onChange={e => setFormData({...formData, poznamka: e.target.value})}
        />
        
        <div className="form-actions">
          {editingId ? (
            <>
              <button onClick={() => handleUpdate(editingId)}>Uložit změny</button>
              <button onClick={() => {
                setEditingId(null);
                resetForm();
              }}>
                Zrušit
              </button>
            </>
          ) : (
            <button onClick={handleCreate}>Vytvořit</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashboxAssignmentManager;
```

**Git backup:**
```bash
git add src/components/CashboxAssignmentManager.js
git commit -m "CASHBOOK FE: Admin panel pro správu přiřazení pokladen"
git push
```

---

### KROK 7: Admin panel - globální nastavení ⏱️ 1 hodina

**Komponenta:** `src/components/CashboxSettings.js`

```javascript
import React, { useState, useEffect } from 'react';
import cashbookAPI from '../services/cashbookService';

const CashboxSettings = ({ userPermissions }) => {
  const [usePrefix, setUsePrefix] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const result = await cashbookAPI.getSettings('cashbook_use_prefix');
      if (result.status === 'ok') {
        setUsePrefix(result.data.value === '1');
      }
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await cashbookAPI.updateSetting(
        'cashbook_use_prefix',
        usePrefix ? '1' : '0',
        'Použít prefix v číslování dokladů (1=ano, 0=ne)'
      );
      
      if (result.status === 'ok') {
        alert('Nastavení uloženo');
      }
    } catch (error) {
      alert('Chyba při ukládání: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (!userPermissions.includes('CASH_BOOK_MANAGE')) {
    return <div>Nemáte oprávnění pro správu nastavení.</div>;
  }
  
  if (loading) return <div>Načítání...</div>;
  
  return (
    <div className="cashbox-settings">
      <h2>Globální nastavení pokladny</h2>
      
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={usePrefix}
            onChange={e => setUsePrefix(e.target.checked)}
          />
          Použít prefix v číslování dokladů
        </label>
        
        <div className="setting-description">
          <p>
            <strong>Zapnuto:</strong> Doklady budou mít čísla typu V591-001, P491-002<br/>
            <strong>Vypnuto:</strong> Doklady budou mít čísla typu V001, P002
          </p>
        </div>
      </div>
      
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Ukládání...' : 'Uložit nastavení'}
      </button>
    </div>
  );
};

export default CashboxSettings;
```

**Git backup:**
```bash
git add src/components/CashboxSettings.js
git commit -m "CASHBOOK FE: Admin panel pro globální nastavení"
git push
```

---

### KROK 8: Testování ⏱️ 2-3 hodiny

**Test scénáře:**

1. **Test přiřazení:**
   - [ ] Načtení seznamu přiřazení
   - [ ] Výběr pokladny z dropdownu
   - [ ] Vytvoření knihy s přiřazením
   - [ ] Zobrazení číselných řad

2. **Test prefixů:**
   - [ ] Zapnout prefix v nastavení
   - [ ] Vytvořit výdaj → V599-001
   - [ ] Vytvořit příjem → P499-001
   - [ ] Vypnout prefix
   - [ ] Vytvořit výdaj → V002 (pokračuje pořadí)

3. **Test stavů knihy:**
   - [ ] Uzavřít měsíc (uživatel)
   - [ ] Ověřit stav "uzavrena_uzivatelem"
   - [ ] Zamknout (správce)
   - [ ] Ověřit stav "zamknuta_spravcem"
   - [ ] Pokus o editaci → chybová hláška
   - [ ] Odemknout (správce)
   - [ ] Ověřit stav "aktivni"
   - [ ] Editace funguje

4. **Test hybrid sync:**
   - [ ] Vytvořit položku → uložena do DB + localStorage
   - [ ] Reload stránky → načteno z localStorage (rychlé)
   - [ ] Vymazat localStorage → načteno z DB
   - [ ] Offline mode → uloženo do localStorage
   - [ ] Online → sync queue zpracována

5. **Test admin panelů:**
   - [ ] Zobrazení pouze pro CASH_BOOK_MANAGE
   - [ ] CRUD operace s přiřazeními
   - [ ] Změna globálního nastavení

---

## 📊 SOUHRN IMPLEMENTACE

### Nové soubory (4):
1. `src/services/cashbookService.js` - API wrapper
2. `src/components/BookStatusBadge.js` - UI pro stavy knihy
3. `src/components/CashboxAssignmentManager.js` - Admin panel přiřazení
4. `src/components/CashboxSettings.js` - Admin panel nastavení

### Upravené soubory (2):
1. `src/pages/CashBookPage.js` - hlavní logika
2. `src/styles/cashbook.css` - styly

### Odhad času celkem:
- **KROK 1:** 2-3 hodiny
- **KROK 2:** 2-3 hodiny
- **KROK 3:** 2 hodiny
- **KROK 4:** 1 hodina
- **KROK 5:** 3-4 hodiny
- **KROK 6:** 2-3 hodiny
- **KROK 7:** 1 hodina
- **KROK 8:** 2-3 hodiny

**CELKEM: 15-22 hodin práce**

---

## 🚨 DŮLEŽITÉ POZNÁMKY

1. **Git backupy:** Po každém kroku commitnout změny!
2. **Testy:** Testovat po každém kroku, ne až na konci
3. **Oprávnění:** Zkontrolovat `CASH_BOOK_MANAGE` v uživatelském profilu
4. **Authentication:** Najít kde je uložen username + token
5. **Error handling:** Všude try-catch s user-friendly hláškami
6. **Offline mode:** Implementovat sync queue pro offline práci

---

**Připraveno k implementaci:** 8. listopadu 2025  
**BE commit:** 4e3aebc  
**FE branch:** RH-DOMA-DOCX-01

