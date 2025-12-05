# ✅ Backend API: Invoice Status Filtering - IMPLEMENTED

## 📋 Status

**Datum:** 30. listopadu 2025  
**Komponenta:** Invoices25List.js  
**Endpoint:** `invoices25/list`  
**Status:** 🟢 **IMPLEMENTOVÁNO A PŘIPRAVENO** (Backend commit: `0783884`)

---

## 🎯 Cíl

Umožnit filtrování faktur přímo na backendu podle **stavu** (zaplaceno, nezaplaceno, po splatnosti, bez objednávky, moje faktury) prostřednictvím clickable dashboard karet.

---

## 🔧 Navrhovaná změna API

### Nový parametr: `filter_status`

Přidat nový **volitelný** parametr do endpointu `invoices25/list`:

```
GET /invoices25/list
```

**Nový parametr:**

| Parametr | Typ | Povinný | Možné hodnoty | Popis |
|----------|-----|---------|---------------|-------|
| `filter_status` | string | Ne | `paid`, `unpaid`, `overdue`, `without_order`, `my_invoices`, prázdný/null | Filtr podle stavu faktury |

---

## 📝 Popis hodnot `filter_status`

### 1. `paid` (Zaplaceno)
- **Logika:** `fa_zaplacena = 1`
- **Popis:** Vrátí pouze faktury, které byly zaplaceny
- **UI karta:** "Zaplaceno" (zelená, ✓ ikona)

### 2. `unpaid` (Nezaplaceno)
- **Logika:** `fa_zaplacena = 0 AND fa_datum_splatnosti >= CURDATE()`
- **Popis:** Vrátí faktury, které nejsou zaplacené a ještě NEpřekročily splatnost
- **UI karta:** "Nezaplaceno" (oranžová, ⏳ ikona)

### 3. `overdue` (Po splatnosti)
- **Logika:** `fa_zaplacena = 0 AND fa_datum_splatnosti < CURDATE()`
- **Popis:** Vrátí faktury, které nejsou zaplacené a již PŘEKROČILY splatnost
- **UI karta:** "Po splatnosti" (červená, ⚠️ ikona)

### 4. `without_order` (Bez objednávky)
- **Logika:** `objednavka_id IS NULL OR objednavka_id = 0`
- **Popis:** Vrátí faktury, které nejsou přiřazené k žádné objednávce
- **UI karta:** "Bez objednávky" (šedá, ✕ ikona)

### 5. `my_invoices` (Moje faktury)
- **Logika:** `vytvoril_uzivatel_id = {current_user_id}`
- **Popis:** Vrátí pouze faktury, které zaevidoval aktuálně přihlášený uživatel
- **UI karta:** "Moje faktury" (tyrkysová, 👤 ikona)
- **Viditelnost:** Pouze pro uživatele s rolí `ADMIN` nebo oprávněním `INVOICE_MANAGE`

### 6. prázdný/null (Vše)
- **Logika:** Žádný status filtr, vrátí všechny faktury (současné chování)
- **Popis:** Defaultní stav, žádné omezení podle stavu
- **UI karta:** "Celková částka" nebo "Celkem faktur"

---

## 🔄 Příklad použití (Frontend)

### Současný request (bez filter_status):
```javascript
const response = await listInvoices25({
  year: 2025,
  page: 1,
  limit: 50,
  objednavka_id: '',
  fa_cislo_vema: '',
  datum_od: '',
  datum_do: '',
  stredisko: '',
  organizace_id: '',
  usek_id: ''
});
```

### Nový request (s filter_status):
```javascript
// Příklad: Uživatel klikne na kartu "Zaplaceno"
const response = await listInvoices25({
  year: 2025,
  page: 1,
  limit: 50,
  filter_status: 'paid', // ← NOVÝ PARAMETR
  objednavka_id: '',
  fa_cislo_vema: '',
  datum_od: '',
  datum_do: '',
  stredisko: '',
  organizace_id: '',
  usek_id: ''
});
```

---

## 📊 Očekávaná response (beze změny)

Response zůstává stejná jako dosud:

```json
{
  "faktury": [
    {
      "id": 1,
      "fa_cislo_vema": "FA-2025-001",
      "fa_zaplacena": 1,
      "fa_datum_splatnosti": "2025-01-15",
      "objednavka_id": 123,
      "vytvoril_uzivatel_id": 5,
      ...
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total": 500,
    "per_page": 50
  },
  "statistiky": {
    "pocet_zaplaceno": 250,
    "pocet_nezaplaceno": 150,
    "pocet_po_splatnosti": 100,
    "celkem_castka": "5000000.00",
    "celkem_zaplaceno": "3000000.00",
    "celkem_nezaplaceno": "1500000.00",
    "celkem_po_splatnosti": "500000.00"
  },
  "user_info": {
    "is_admin": true,
    "uzivatel_id": 5
  }
}
```

**Poznámka:** Statistiky v response by měly **vždy odrážet celkový filtr** (včetně `filter_status`), ne jen aktuální stránku.

---

## 🎨 Frontend implementace

### 1. Kliknutí na dashboard kartu:
```javascript
const handleDashboardCardClick = useCallback((filterType) => {
  setFilters(prev => ({
    ...prev,
    filter_status: filterType === 'all' ? '' : filterType
  }));
}, []);
```

### 2. Dashboard karty s onClick:
```jsx
{/* Zaplaceno */}
<DashboardCard onClick={() => handleDashboardCardClick('paid')}>
  <StatHeader>
    <StatLabel>Zaplaceno</StatLabel>
    <StatIcon $color="#22c55e">
      <FontAwesomeIcon icon={faCheckCircle} />
    </StatIcon>
  </StatHeader>
  <StatValue>{stats.paid}</StatValue>
  <StatLabel>Uhrazené faktury</StatLabel>
</DashboardCard>

{/* Nezaplaceno */}
<DashboardCard onClick={() => handleDashboardCardClick('unpaid')}>
  ...
</DashboardCard>

{/* Po splatnosti */}
<DashboardCard onClick={() => handleDashboardCardClick('overdue')}>
  ...
</DashboardCard>

{/* Bez objednávky */}
<DashboardCard onClick={() => handleDashboardCardClick('without_order')}>
  ...
</DashboardCard>

{/* Moje faktury - pouze admin/invoice_manage */}
{canViewAllInvoices && (
  <DashboardCard onClick={() => handleDashboardCardClick('my_invoices')}>
    ...
  </DashboardCard>
)}
```

---

## 🧪 Testovací scénáře

### 1. Filtr "Zaplaceno"
- **Request:** `filter_status=paid`
- **Očekávaný výsledek:** Pouze faktury s `fa_zaplacena = 1`
- **Statistiky:** `pocet_zaplaceno`, `celkem_zaplaceno` by měly odpovídat vrácenému seznamu

### 2. Filtr "Nezaplaceno"
- **Request:** `filter_status=unpaid`
- **Očekávaný výsledek:** Faktury s `fa_zaplacena = 0` a `fa_datum_splatnosti >= dnes`
- **Statistiky:** `pocet_nezaplaceno`, `celkem_nezaplaceno`

### 3. Filtr "Po splatnosti"
- **Request:** `filter_status=overdue`
- **Očekávaný výsledek:** Faktury s `fa_zaplacena = 0` a `fa_datum_splatnosti < dnes`
- **Statistiky:** `pocet_po_splatnosti`, `celkem_po_splatnosti`

### 4. Filtr "Bez objednávky"
- **Request:** `filter_status=without_order`
- **Očekávaný výsledek:** Faktury s `objednavka_id IS NULL`
- **Statistiky:** Součet pouze těchto faktur

### 5. Filtr "Moje faktury"
- **Request:** `filter_status=my_invoices`
- **Očekávaný výsledek:** Faktury s `vytvoril_uzivatel_id = {current_user_id}`
- **Statistiky:** Součet pouze mých faktur

### 6. Kombinace filtrů
- **Request:** `filter_status=paid&year=2024&stredisko=IT`
- **Očekávaný výsledek:** Zaplacené faktury z roku 2024 na středisku IT
- **Statistiky:** Musí odpovídat VŠEM aplikovaným filtrům

---

## 📌 Důležité poznámky

### 1. Kompatibilita
- Parametr je **volitelný** - pokud není zadán, API vrací všechny faktury (současné chování)
- Nezmění se struktura response
- Backwards compatible - stávající FE kód bude fungovat i bez změn

### 2. Oprávnění
- Filtr `my_invoices` by měl respektovat `vytvoril_uzivatel_id` z user session
- Ověřit, že běžný uživatel nemůže vidět cizí faktury pomocí tohoto filtru

### 3. Performance
- Doporučujeme přidat **database index** na:
  - `fa_zaplacena`
  - `fa_datum_splatnosti`
  - `objednavka_id`
  - `vytvoril_uzivatel_id`

### 4. Statistiky
- Statistiky v response **MUSÍ** respektovat `filter_status`
- Pokud je `filter_status=paid`, pak `statistiky.pocet_zaplaceno` = `pagination.total`

---

## 🚀 Priorita

**Střední** - Feature zlepšuje UX, ale není kritická pro základní funkcionalitu.

---

## ✅ Checklist pro BE implementaci

- [x] Přidat `filter_status` jako volitelný parametr do endpointu ✅
- [x] Implementovat logiku pro všech 5 hodnot filtru ✅
- [x] Zajistit, že statistiky respektují `filter_status` ✅
- [x] Ověřit oprávnění u `my_invoices` filtru ✅
- [x] Přidat database indexy (pokud chybí) ✅
- [x] Otestovat všechny kombinace filtrů ✅
- [x] Aktualizovat API dokumentaci ✅
- [x] Notifikovat FE tým o dostupnosti featury ✅

---

## 📞 Kontakt

**Frontend implementace:** ✅ Připravena včetně UI  
**Backend implementace:** ✅ **HOTOVO** (commit `0783884`)  
**Next step:** Aktivace feature ve FE - odkomentovat řádky v `handleDashboardCardClick`

---

## 🎉 Backend je připraven!

Backend API `invoices25/list` je **plně funkční** a podporuje `filter_status` parametr.

**Frontend aktivace:**
1. Otevřít `src/pages/Invoices25List.js`
2. Najít funkci `handleDashboardCardClick`
3. Odkomentovat řádky:
   ```javascript
   setFilters(prev => ({
     ...prev,
     filter_status: filterType === 'all' ? '' : filterType
   }));
   ```
4. Odstranit/upravit toast notifikaci
5. Přidat `filter_status` do API volání v `listInvoices25()`
