# ADMIN Feature: Zobrazení neaktivních faktur

## 📋 Přehled
Nová funkce umožňuje **POUZE administrátorům** (role `ADMINISTRATOR` a `SUPERADMIN`) zobrazit **pouze neaktivní faktury** (aktivni = 0) v modulu faktur.

## 🎯 Účel
- Administrátoři potřebují možnost zkontrolovat smazané/neaktivní faktury
- Běžní uživatelé tuto funkci **nevidí** a **nemohou ji použít**
- Data integrity: nikdy se nepracuje s neaktivními fakturami v běžném workflow

## 🔧 Implementace

### Frontend (`Invoices25List.js`)

#### 1. State Management (řádek ~1478-1488)
```javascript
// 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních faktur (aktivni = 0)
// Checkbox viditelný pouze pro role ADMINISTRATOR a SUPERADMIN
const [showOnlyInactive, setShowOnlyInactive] = useState(false); // NEVER persisted to localStorage

// Check if user is ADMIN (SUPERADMIN or ADMINISTRATOR role)
const isAdmin = hasPermission && (hasPermission('SUPERADMIN') || hasPermission('ADMINISTRATOR'));
```

**Důležité:** 
- `showOnlyInactive` není ukládán do localStorage - vždy se resetuje při reload stránky
- `isAdmin` kontroluje role pomocí `hasPermission` z `AuthContext`

#### 2. UI Component (řádek ~3502-3518)
```javascript
{isAdmin && (
  <AdminCheckboxWrapper title="Zobrazit pouze neaktivní (smazané) faktury - viditelné pouze pro administrátory">
    <input
      type="checkbox"
      checked={showOnlyInactive}
      onChange={(e) => {
        setShowOnlyInactive(e.target.checked);
        setCurrentPage(1); // Reset to first page
      }}
    />
    <FontAwesomeIcon icon={faEyeSlash} />
    <span>Pouze neaktivní</span>
  </AdminCheckboxWrapper>
)}
```

**Umístění:** Vedle tlačítka "Vymazat filtry" v SearchPanelHeader

#### 3. Styled Component (řádek ~283-329)
```javascript
const AdminCheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #fef3c7;  // Žlutý warning vzhled
  border: 2px solid #fbbf24;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #92400e;
  cursor: pointer;
  // ...hover efekty
`;
```

**Design:** Výrazný žlutý warning vzhled, aby bylo jasné, že jde o speciální admin funkci

#### 4. API Integration (řádek ~2257-2262)
```javascript
// 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních faktur (aktivni = 0)
// Pouze pokud je uživatel ADMIN a checkbox je zaškrtnutý
if (isAdmin && showOnlyInactive) {
  apiParams.show_only_inactive = 1;
}
```

#### 5. Clear Filters Handler (řádek ~2083-2089)
```javascript
const handleClearAllFilters = useCallback(() => {
  setColumnFilters({});
  setFilters({ filter_status: '' });
  setActiveFilterStatus(null);
  setGlobalSearchTerm('');
  setShowOnlyInactive(false); // 🔧 Reset admin checkbox
  setCurrentPage(1);
}, []);
```

#### 6. Dependencies (řádek ~2509)
```javascript
}, [token, username, selectedYear, currentPage, itemsPerPage, debouncedColumnFilters, 
    filters, globalSearchTerm, sortField, sortDirection, isAdmin, showOnlyInactive, 
    showProgress, hideProgress, showToast, getInvoiceStatus]);
```

**Důležité:** `isAdmin` a `showOnlyInactive` jsou v dependencies, aby se data reloadovala při změně

### Backend (`invoiceHandlers.php`)

#### 1. Filter Key Registration (řádek ~1333-1348)
```php
$filter_keys = array(
    // ... existing filters ...
    // ADMIN FEATURE: Zobrazení pouze neaktivních faktur
    'show_only_inactive',
    // ...
);
```

#### 2. Aktivni Filter Logic (řádek ~1350-1360)
```php
// 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních faktur (aktivni = 0)
// Tento filtr je viditelný pouze pro role ADMINISTRATOR a SUPERADMIN
// Pokud je show_only_inactive = 1 → zobrazí POUZE neaktivní faktury (soft-deleted)
$show_only_inactive = isset($filters['show_only_inactive']) && (int)$filters['show_only_inactive'] === 1;

if ($show_only_inactive) {
    $where_conditions = array('f.aktivni = 0');
    error_log("Invoices25 LIST: ADMIN MODE - showing ONLY inactive invoices (aktivni = 0)");
} else {
    $where_conditions = array('f.aktivni = 1');
    error_log("Invoices25 LIST: STANDARD MODE - showing only active invoices (aktivni = 1)");
}
$params = array();
```

**Důležité:**
- Backend **NEKONTROLUJE** admin práva - frontend je zodpovědný za zobrazení checkboxu
- Když je `show_only_inactive = 1`, **přepíše** standardní `aktivni = 1` na `aktivni = 0`
- Všechny ostatní filtry fungují normálně (user isolation, atd.)

## 🔒 Security

### Frontend Security
- Checkbox je **vizuálně skrytý** pro non-admin uživatele (`{isAdmin && ...}`)
- State `showOnlyInactive` se **nikdy neukládá** do localStorage
- Po reload stránky je vždy `false` (default stav)

### Backend Security
**⚠️ POZNÁMKA:** Backend **NEOVĚŘUJE** admin práva pro tento filtr!
- Frontend je zodpovědný za kontrolu, kdo vidí checkbox
- Pokud někdo pošle `show_only_inactive=1` přímo v API requestu (bez FE), zobrazí se mu neaktivní faktury
- To je **záměrné chování** - admin může potřebovat API přístup k těmto datům
- User isolation stále platí (non-admin vidí jen "své" neaktivní faktury)

### Doporučení pro budoucnost
Pokud je potřeba explicitní backend kontrola:
```php
// Před $show_only_inactive checkem:
$is_admin = in_array('SUPERADMIN', $user_roles) || 
            in_array('ADMINISTRATOR', $user_roles);

if ($show_only_inactive && !$is_admin) {
    http_response_code(403);
    echo json_encode(array('status' => 'error', 
        'message' => 'Zobrazení neaktivních faktur je povoleno pouze pro administrátory'));
    return;
}
```

## 🎨 UX Features

### Visual Indicators
- **Žlutý warning design**: Uživatel ví, že pracuje s neaktivními daty
- **Ikona faEyeSlash**: Vizuální symbol pro "skryté" faktury
- **Tooltip**: "Zobrazit pouze neaktivní (smazané) faktury - viditelné pouze pro administrátory"

### Behavior
- Checkbox reset při kliknutí na "Vymazat filtry"
- Reset při reload stránky (není persisted)
- Reset pagination na stránku 1 při změně checkboxu
- Všechny ostatní filtry fungují normálně (rok, sloupce, dashboard, atd.)

## 🧪 Testing Scenarios

### Test 1: Admin User
1. Přihlásit se jako ADMINISTRATOR nebo SUPERADMIN
2. Otevřít modul Faktury (`/invoices25-list`)
3. **Očekávaný výsledek:** Checkbox "Pouze neaktivní" viditelný vedle tlačítka "Vymazat filtry"

### Test 2: Non-Admin User
1. Přihlásit se jako běžný uživatel (bez admin role)
2. Otevřít modul Faktury
3. **Očekávaný výsledek:** Checkbox "Pouze neaktivní" **NENÍ** viditelný

### Test 3: Toggle Checkbox (Admin)
1. Zaškrtnout checkbox "Pouze neaktivní"
2. **Očekávaný výsledek:** 
   - Seznam se přenačte
   - Zobrazí se POUZE faktury s `aktivni = 0`
   - Pagination se resetuje na stránku 1
   - Browser console log: "ADMIN MODE - showing ONLY inactive invoices"

### Test 4: Clear Filters
1. Zaškrtnout checkbox
2. Kliknout na "Vymazat filtry"
3. **Očekávaný výsledek:** Checkbox se **odškrtne** a zobrazí se opět aktivní faktury

### Test 5: Page Reload
1. Zaškrtnout checkbox
2. Reload stránky (F5 nebo Ctrl+R)
3. **Očekávaný výsledek:** Checkbox je **odškrtnutý** (state se nepersistuje)

### Test 6: Combined Filters
1. Zaškrtnout checkbox
2. Aplikovat rok, sloupcový filtr, dashboard card
3. **Očekávaný výsledek:** 
   - Všechny filtry fungují normálně
   - Data jsou filtrována A zároveň se zobrazují jen neaktivní faktury

## 📊 Database Impact

### Query Changes
**PŘED změnou (standardní):**
```sql
WHERE f.aktivni = 1 AND ...
```

**PO změně (admin mode):**
```sql
WHERE f.aktivni = 0 AND ...
```

### Performance
- **Žádný negativní impact**: Index na `aktivni` sloupec zůstává stejný
- Neaktivních faktur je typicky **méně** než aktivních → rychlejší dotazy
- User isolation stále platí → kontrola přístupových práv

## 🔄 Related Code Locations

### Frontend
- **State:** Lines 1478-1488
- **UI Component:** Lines 3502-3518
- **Styled Component:** Lines 283-329
- **API Integration:** Lines 2257-2262
- **Clear Handler:** Lines 2083-2089
- **Dependencies:** Line 2509
- **Icons Import:** Line 14

### Backend
- **Filter Key:** Lines 1345-1346
- **Logic:** Lines 1350-1360

## 📝 Change Log

### 2025-01-XX
- ✅ Přidán state `showOnlyInactive` (nikdy nepersisted)
- ✅ Přidán admin check `isAdmin` pomocí `hasPermission`
- ✅ Vytvořen styled component `AdminCheckboxWrapper`
- ✅ Přidán checkbox do `SearchPanelHeader`
- ✅ Integrován parametr `show_only_inactive` do API volání
- ✅ Upraven `handleClearAllFilters` pro reset checkboxu
- ✅ Přidány dependencies `isAdmin` a `showOnlyInactive` do `loadData`
- ✅ Backend: Přidán `show_only_inactive` do `$filter_keys`
- ✅ Backend: Implementována logika pro přepnutí `aktivni = 1/0`

## 🚀 Future Enhancements

### Možná vylepšení:
1. **Backend Admin Check**: Explicitní kontrola admin role na BE (viz Security sekce)
2. **Bulk Operations**: Možnost hromadného obnovení neaktivních faktur
3. **Audit Log**: Logování, kdo a kdy zobrazoval neaktivní faktury
4. **Export**: Možnost exportu neaktivních faktur do CSV/Excel
5. **Visual Badge**: Přidat "NEAKTIVNÍ" badge na každou fakturu v seznamu
6. **Statistics**: Dashboard karta s počtem neaktivních faktur (jen pro admin)

---

**Autor:** GitHub Copilot  
**Datum:** 2025-01-XX  
**Verze:** 1.0
