# ✅ CASHBOX SELECTOR - IMPLEMENTAČNÍ SHRNUTÍ

**Datum:** 9. listopadu 2025  
**Branch:** LISTOPAD-25 / POKLADNA-SYNC  
**Status:** 🟡 Připraveno k integraci

---

## 🎯 CO BYLO VYTVOŘENO

### 1️⃣ **Frontend komponenta**
📁 `src/components/CashboxSelector.jsx` ✅

**Features:**
- Material-UI design (moderní, profesionální)
- Dropdown menu s vyhledáváním
- Kategorizace pro uživatele (Hlavní / Zástupní / Neaktivní)
- Admin view (všechny pokladny)
- Vizuální upozornění na končící platnost
- Responsive design

**Props:**
```javascript
{
  currentCashbox,      // Aktuální pokladna
  userCashboxes,       // Pokladny uživatele
  allCashboxes,        // Všechny (admin)
  isAdmin,             // Boolean
  onCashboxChange,     // Handler změny
  onAddCashbox,        // Handler přidání (optional)
  onManageCashbox      // Handler nastavení (optional)
}
```

---

### 2️⃣ **API Service rozšíření**
📁 `src/services/cashbookService.js` ✅

**Nové metody:**

```javascript
// Pro ADMINA - všechny pokladny
listAllAssignments: async () => {...}

// Rozšířená metoda pro uživatele
listAssignments: async (userId, activeOnly, includeExpired) => {...}
```

---

### 3️⃣ **Dokumentace**
📁 `CASHBOX-SELECTOR-UX-DESIGN.md` ✅

**Obsahuje:**
- UX koncepty (wireframes v ASCII)
- Admin vs User views
- Technickou specifikaci
- Integrační příklady
- Checklist implementace

---

### 4️⃣ **Backend šablona**
📁 `BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php` ✅

**Pro backend vývojáře:**
- SQL dotazy (hotové)
- PHP implementace (příklad)
- Kontrola oprávnění
- Response formát
- Test scénáře
- Checklist

---

## 🔄 CO JE POTŘEBA DOKONČIT

### **A) FRONTEND INTEGRACE**

**1. Instalovat Material-UI (pokud není):**
```bash
cd /home/holovsky/dokumenty/Jazyky/react/wObj/r-app-zzs-eeo-25
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
```

**2. Upravit `src/pages/CashBookPage.js`:**

```javascript
// Import
import CashboxSelector from '../components/CashboxSelector';

// State
const [allCashboxes, setAllCashboxes] = useState([]);

// Detekce admin role
const isAdmin = useMemo(() => {
  return userDetail?.roles?.some(r => 
    r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR'
  );
}, [userDetail]);

// Načtení dat pro admina
useEffect(() => {
  if (!isAdmin) return;
  
  const fetchAllCashboxes = async () => {
    try {
      const result = await cashbookAPI.listAllAssignments();
      setAllCashboxes(result.data);
    } catch (error) {
      console.error('Chyba při načítání všech pokladen:', error);
      showToast('Nepodařilo se načíst seznam všech pokladen', 'error');
    }
  };
  
  fetchAllCashboxes();
}, [isAdmin]);

// Handler pro změnu pokladny
const handleCashboxChange = useCallback((cashbox) => {
  setCurrentAssignment(cashbox);
  // Načíst knihu pro vybranou pokladnu
  // ... implementace
}, []);

// Do render():
<CashboxSelector
  currentCashbox={currentAssignment}
  userCashboxes={assignments}
  allCashboxes={allCashboxes}
  isAdmin={isAdmin}
  onCashboxChange={handleCashboxChange}
/>
```

---

### **B) BACKEND IMPLEMENTACE**

**1. Vytvořit nový endpoint:**
📁 `/api.eeo/cashbook-assignments-all.php`

**Struktura:**
```php
<?php
// 1. Kontrola autentizace
// 2. Kontrola ADMIN role
// 3. SQL dotaz (viz BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php)
// 4. Response
?>
```

**SQL je připraven v dokumentaci!** ✅

**2. Rozšířit existující endpoint:**
📁 `/api.eeo/cashbook-assignments-list.php`

**Změna:**
```php
$includeExpired = $_POST['include_expired'] ?? false;

// WHERE clause:
if (!$includeExpired) {
    $where .= " AND (ppu.platne_do IS NULL OR ppu.platne_do >= CURDATE())";
}
```

---

## 📊 VIZUÁLNÍ NÁHLED ROZDÍLŮ

### **ADMIN VIEW:**
```
┌─────────────────────────────────────────┐
│ 🔍 [Vyhledat...]                        │
├─────────────────────────────────────────┤
│ 📊 VŠECHNY POKLADNY (15)                │
├─────────────────────────────────────────┤
│ ✓ 🏛️ Pokladna 600 - Příbram           │
│   👤 Správce: Jan Novák | 📅 2 uživatelé│
├─────────────────────────────────────────┤
│   🏢 Pokladna 100 - Hradec Králové     │
│   👤 Správce: Marie | 📅 5 uživatelů    │
├─────────────────────────────────────────┤
│   🏢 Pokladna 200 - Mladá Boleslav     │
│   👤 Správce: Petr | 📅 3 uživatelé     │
├─────────────────────────────────────────┤
│ [ + Přidat novou pokladnu ]             │
└─────────────────────────────────────────┘
```

### **USER VIEW:**
```
┌─────────────────────────────────────────┐
│ 🏛️ MOJE HLAVNÍ POKLADNA                │
├─────────────────────────────────────────┤
│ ✓ 🏛️ Pokladna 600 - Příbram [Hlavní]  │
│   📅 Platnost: Trvale                   │
│   💰 Stav: 12,450.50 Kč                │
├─────────────────────────────────────────┤
│ 🔄 ZÁSTUPNÍ POKLADNY (2)               │
├─────────────────────────────────────────┤
│   🏢 Pokladna 100 - HK                 │
│   📅 1.11. - 30.11.2025                │
│   ⚠️ Vyprší za 21 dní                  │
├─────────────────────────────────────────┤
│   🏢 Pokladna 200 - MB                 │
│   📅 15.10. - 15.12.2025               │
│   ✅ Aktivní                            │
├─────────────────────────────────────────┤
│ 📋 NEAKTIVNÍ POKLADNY (1)              │
├─────────────────────────────────────────┤
│   🚫 Pokladna 300 - Kolín              │
│   📅 Platnost skončila: 31.10.2025     │
└─────────────────────────────────────────┘
```

---

## 🎨 BAREVNÉ KÓDOVÁNÍ

| Stav | Barva | Popis |
|------|-------|-------|
| 🔵 Hlavní | Primary | `je_hlavni = 1` |
| ✅ Aktivní | Success | V platnosti |
| ⚠️ Warning | Warning | Vyprší za ≤30 dní |
| 🔴 Kritické | Error | Vyprší za ≤7 dní |
| 🚫 Neaktivní | Error | Platnost vypršela |

---

## ✅ CHECKLIST

### **Frontend:**
- [x] Komponenta CashboxSelector.jsx vytvořena
- [x] API metoda listAllAssignments() přidána
- [x] Dokumentace UX design vytvořena
- [ ] Material-UI instalováno
- [ ] Integrace do CashBookPage.js
- [ ] Handler handleCashboxChange implementován
- [ ] Testování admin view
- [ ] Testování user view
- [ ] Testování vyhledávání

### **Backend:**
- [ ] Endpoint cashbook-assignments-all.php vytvořen
- [ ] SQL dotaz implementován
- [ ] Kontrola ADMIN role
- [ ] Rozšíření cashbook-assignments-list.php
- [ ] Parametr include_expired přidán
- [ ] Testování přístupu (admin vs user)
- [ ] Testování SQL výsledků

---

## 🚀 DALŠÍ KROKY

**1. Instalace závislostí:**
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

**2. Backend implementace:**
- Backend vývojář použije připravený SQL
- Implementuje kontrolu oprávnění
- Otestuje oba endpointy

**3. Frontend integrace:**
- Přidat CashboxSelector do CashBookPage
- Připojit handlery
- Testovat přepínání pokladen

**4. End-to-end test:**
- Admin může vidět všechny pokladny ✓
- User vidí jen své pokladny ✓
- Kategorizace funguje správně ✓
- Varování u končících platností ✓
- Vyhledávání funguje ✓

---

## 📝 POZNÁMKY PRO VÝVOJÁŘE

**Frontend dev:**
- CashboxSelector je standalone komponenta
- Material-UI komponenty už mají styling
- Props jsou dobře typované (JSDoc)
- Vyhledávání funguje lokálně (useMemo)

**Backend dev:**
- SQL dotaz je **HOTOVÝ** (copy-paste ready)
- Kontrola role je kritická (security)
- Response formát je standardizovaný
- Testovací curl příkazy jsou v dokumentaci

**UX/UI:**
- Design je moderní a čistý
- Barevné kódování je intuitivní
- Hierarchie je jasná (hlavní > zástupní > neaktivní)
- Feedback je okamžitý (vizuální chipsy)

---

**🎯 Všechno je připraveno k implementaci!**

**💡 Priorita:** Backend API → Material-UI instalace → Frontend integrace
