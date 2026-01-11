# 📋 Plán: UniversalSearch - Faktury s oprávněními

**Datum:** 20.12.2025  
**Branch:** feature/generic-recipient-system  
**Autor:** System Analysis

---

## 🎯 Cíl

Implementovat/ověřit správná oprávnění pro vyhledávání faktur v UniversalSearch modulu podle rolí:
1. **ADMIN** - vidí všechny faktury
2. **INVOICE_MANAGER** - vidí všechny faktury v rámci fakturačního modulu
3. **INVOICE_VIEW** - vidí pouze faktury, ke kterým má oprávnění

---

## 🔍 Aktuální stav (Analýza)

### ✅ Co již FUNGUJE:

1. **UniversalSearch má faktury integrované:**
   - ✅ Kategorie `'invoices'` v `apiUniversalSearch.js`
   - ✅ `InvoiceDetailView` komponenta existuje v `EntityDetailViews.js`
   - ✅ Faktury se zobrazují v `SearchResultsDropdown.js`
   - ✅ Ikona a styling pro faktury (🎨 `faFileInvoice`, barva `#ec4899`)

2. **Detail faktury obsahuje:**
   - Variabilní symbol (fa_cislo_vema)
   - Číslo faktury dodavatele
   - Číslo objednávky
   - Typ faktury (badge)
   - Stav faktury (badge)
   - Dodavatel (název, IČO)
   - Částky (s DPH, bez DPH)
   - Datumy (vystavení, splatnost, doručení)
   - Přílohy faktury (načítají se z API)

3. **Slide-in panel:**
   - ✅ Faktury se otevírají v postranním panelu stejně jako objednávky
   - ✅ `SlideInDetailPanel` podporuje InvoiceDetailView

---

## ⚠️ Co je potřeba OVĚŘIT/IMPLEMENTOVAT:

### 1. Backend API oprávnění

**Endpoint:** `POST /api.eeo/search/universal`

**Současný stav:**
```javascript
// apiUniversalSearch.js - řádek ~88
search_all: params.search_all || false  // Ignorovat permissions, vrátit všechny výsledky
```

**Otázky k ověření:**
- ❓ Má backend implementované filtrování faktur podle oprávnění?
- ❓ Parametr `search_all` funguje pro faktury stejně jako pro objednávky?
- ❓ Backend kontroluje práva `INVOICE_VIEW`, `INVOICE_MANAGER`?

**Akce:**
```bash
# 1. Zkontrolovat backend endpoint
grep -r "search/universal" /var/www/erdms-dev/apps/eeo-v2/server/
grep -r "INVOICE_VIEW" /var/www/erdms-dev/apps/eeo-v2/server/
grep -r "INVOICE_MANAGER" /var/www/erdms-dev/apps/eeo-v2/server/

# 2. Otestovat API volání s různými uživateli
# - Uživatel s rolí ADMIN
# - Uživatel s právem INVOICE_MANAGER
# - Uživatel s právem INVOICE_VIEW
# - Uživatel BEZ práv na faktury
```

---

### 2. Frontend oprávnění

**Soubor:** `apps/eeo-v2/client/src/components/UniversalSearch/UniversalSearchInput.js`

**Současný stav:**
```javascript
// Řádek ~185 (po cleanupu)
const canViewAllOrders = hasPermission(['ADMIN', 'PREHLED_VSECHY_OBJEDNAVKY']);
search(newQuery, { search_all: canViewAllOrders });
```

**Problém:** 
- ✅ `canViewAllOrders` funguje pro objednávky
- ❌ **Není kontrola pro faktury** (`INVOICE_MANAGER`, `INVOICE_VIEW`)

**Požadované chování:**

| Role/Právo | Vidí faktury v UniversalSearch? | Parametr `search_all` |
|-----------|--------------------------------|---------------------|
| **ADMIN** | ✅ Všechny | `true` |
| **INVOICE_MANAGER** | ✅ Všechny faktury | `true` (nebo backend speciální filtr?) |
| **INVOICE_VIEW** | ⚠️ Pouze své/přiřazené | `false` |
| **Žádné právo** | ❌ Žádné faktury | - |

---

## 📝 Implementační plán

### Krok 1: Přidat práva pro faktury do UniversalSearch

**Soubor:** `apps/eeo-v2/client/src/components/UniversalSearch/UniversalSearchInput.js`

**Změny:**
```javascript
// Řádek ~145 (před debouncedSearch)
const canViewAllOrders = hasPermission(['ADMIN', 'PREHLED_VSECHY_OBJEDNAVKY']);

// 🆕 Přidat kontrolu práv pro faktury
const canViewAllInvoices = hasPermission(['ADMIN', 'INVOICE_MANAGER']);

// Použít kombinované oprávnění
const searchAllPermission = canViewAllOrders || canViewAllInvoices;

// Změnit volání search
search(newQuery, { search_all: searchAllPermission });
```

**Výhody:**
- ✅ Zachováme současné chování pro objednávky
- ✅ Přidáme podporu pro INVOICE_MANAGER
- ✅ ADMIN vidí všechny faktury i objednávky
- ✅ Uživatel s INVOICE_VIEW uvidí pouze své faktury (backend filtr)

---

### Krok 2: Ověřit backend filtrování

**Backend soubor:** Pravděpodobně `apps/eeo-v2/server/src/controllers/searchController.js`

**Co ověřit:**
1. ✅ Endpoint `POST /search/universal` existuje
2. ✅ Filtruje faktury podle `username` pokud `search_all = false`
3. ✅ Kontroluje práva `INVOICE_VIEW`, `INVOICE_MANAGER`
4. ✅ JOIN na tabulku `faktury25` + `objednavky_2025` (pro vazby)

**Očekávaný SQL dotaz (pro inspiraci):**
```sql
-- Pro search_all = false (běžný uživatel s INVOICE_VIEW)
SELECT f.* 
FROM faktury25 f
LEFT JOIN objednavky_2025 o ON f.objednavka_id = o.id
WHERE 
  (f.fa_cislo_vema LIKE '%{query}%' OR f.fa_cislo_dodavatele LIKE '%{query}%')
  AND (
    -- Faktury na objednávkách, kde je uživatel účastníkem
    o.objednatel_id = {user_id} OR 
    o.garant_uzivatel_id = {user_id} OR
    o.prikazce_id = {user_id} OR
    o.schvalovatel_id = {user_id} OR
    -- NEBO faktury vytvořené tímto uživatelem
    f.created_by = {username}
  )
  
-- Pro search_all = true (ADMIN nebo INVOICE_MANAGER)
SELECT f.* 
FROM faktury25 f
WHERE 
  f.fa_cislo_vema LIKE '%{query}%' OR 
  f.fa_cislo_dodavatele LIKE '%{query}%'
```

---

### Krok 3: Otestovat oprávnění

**Test scénáře:**

1. **ADMIN uživatel:**
   ```
   ✅ Vyhledá "FA2024001" → Vidí fakturu
   ✅ Vyhledá libovolnou fakturu → Vidí všechny výsledky
   ```

2. **Uživatel s INVOICE_MANAGER:**
   ```
   ✅ Vyhledá "FA2024001" → Vidí fakturu
   ✅ Vyhledá faktury jiných uživatelů → Vidí všechny faktury
   ```

3. **Uživatel s INVOICE_VIEW:**
   ```
   ✅ Vyhledá svou fakturu "FA2024001" → Vidí
   ❌ Vyhledá cizí fakturu "FA2024999" → NEVIDÍ (nebo pouze pokud je na objednávce, kde je účastníkem)
   ```

4. **Uživatel BEZ práv:**
   ```
   ❌ Kategorie "Faktury" se vůbec nezobrazí v UniversalSearch
   ```

---

### Krok 4: Skrýt kategorii "Faktury" pro uživatele bez práv

**Soubor:** `apps/eeo-v2/client/src/hooks/useUniversalSearch.js` nebo `apiUniversalSearch.js`

**Implementace:**
```javascript
// Před odesláním requestu na backend
const categories = [];

// Objednávky
if (hasPermission(['ADMIN', 'PREHLED_VSECHY_OBJEDNAVKY', 'OBJEDNAVKY_VIEW'])) {
  categories.push('orders_2025', 'orders_legacy');
}

// Faktury - POUZE pokud má uživatel alespoň INVOICE_VIEW
if (hasPermission(['ADMIN', 'INVOICE_MANAGER', 'INVOICE_VIEW'])) {
  categories.push('invoices');
}

// Smlouvy
if (hasPermission(['ADMIN', 'SMLOUVY_VIEW'])) {
  categories.push('contracts');
}

// Dodavatelé - všichni (public data)
categories.push('suppliers', 'suppliers_from_orders');

// Uživatelé - pouze ADMIN
if (hasPermission(['ADMIN'])) {
  categories.push('users');
}

// Odeslat na backend
const requestBody = {
  username,
  token,
  query: params.query.trim(),
  categories: categories,  // ✅ Dynamicky podle práv
  ...
};
```

**Výhody:**
- ✅ Backend nedostane request na faktury, pokud uživatel nemá práva
- ✅ Menší zátěž DB
- ✅ Jasná UX - uživatel nevidí kategorii, ke které nemá přístup

---

## 🔧 Implementační checklist

### Frontend

- [ ] 1. Přidat `canViewAllInvoices` kontrolu do `UniversalSearchInput.js`
- [ ] 2. Upravit `search_all` parametr na kombinaci práv objednávek + faktur
- [ ] 3. Dynamicky filtrovat `categories` podle oprávnění v `apiUniversalSearch.js`
- [ ] 4. Otestovat zobrazování kategorie "Faktury" pro různé role

### Backend (pokud potřeba)

- [ ] 5. Ověřit, že endpoint `/search/universal` filtruje faktury podle `username`
- [ ] 6. Implementovat filtr pro `INVOICE_VIEW` (pouze své/přiřazené faktury)
- [ ] 7. Implementovat filtr pro `INVOICE_MANAGER` (všechny faktury)
- [ ] 8. Otestovat SQL dotazy s různými uživateli

### Testing

- [ ] 9. Test: ADMIN vidí všechny faktury
- [ ] 10. Test: INVOICE_MANAGER vidí všechny faktury
- [ ] 11. Test: INVOICE_VIEW vidí pouze své faktury
- [ ] 12. Test: Uživatel bez práv nevidí kategorii "Faktury"
- [ ] 13. Test: Slide-in panel pro fakturu funguje správně
- [ ] 14. Test: Načítání příloh faktury v detailu

---

## 📌 Poznámky

### Současná práva v systému (ověřit v DB):

```sql
-- Zkontrolovat existující práva
SELECT * FROM prava WHERE kod_prava LIKE '%INVOICE%';

-- Očekávané výsledky:
-- INVOICE_VIEW    - Zobrazení faktur
-- INVOICE_MANAGER - Správa všech faktur
-- INVOICE_CREATE  - Vytváření faktur
-- INVOICE_EDIT    - Úprava faktur
-- INVOICE_DELETE  - Mazání faktur
```

### Rolí pro testování:

```sql
-- Kontrola rolí
SELECT r.nazev_role, p.kod_prava, p.nazev_prava
FROM role r
LEFT JOIN role_prava rp ON r.id = rp.role_id
LEFT JOIN prava p ON rp.pravo_id = p.id
WHERE p.kod_prava LIKE '%INVOICE%'
ORDER BY r.nazev_role;
```

---

## 🚀 Další kroky

1. **Okamžitě:** Commituji cleanup debug logů (✅ HOTOVO - 12 commitů)
2. **Dnes:** Implementovat kroky 1-4 z checklistu (frontend)
3. **Zítra:** Ověřit backend + otestovat všechny scénáře
4. **Testování:** Provést kompletní test s různými uživateli

---

## 📊 Očekávaný výsledek

Po implementaci:
- ✅ ADMIN vidí všechny faktury v UniversalSearch
- ✅ INVOICE_MANAGER vidí všechny faktury
- ✅ INVOICE_VIEW vidí pouze své/přiřazené faktury
- ✅ Uživatel bez práv nevidí kategorii "Faktury"
- ✅ Slide-in panel funguje pro všechny oprávněné uživatele
- ✅ Přílohy faktur se načítají správně

---

**Status:** 📝 Plán připraven, čeká na implementaci  
**Priorita:** 🔥 Vysoká (bezpečnostní oprávnění)
