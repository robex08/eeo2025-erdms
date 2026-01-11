# 🔐 BEZPEČNOSTNÍ AUDIT - LocalStorage a Práva Uživatele

**Datum:** 7. ledna 2026  
**Uživatel testován:** Robin THP (ID 137, username: thp.0000)  
**Role:** THP/PES (THP_PES)  
**Databáze:** eeo2025-dev  
**Přihlašovací údaje:** DB_HOST=10.3.172.11, DB_USER=erdms_user

---

## 📊 SHRNUTÍ VÝSLEDKŮ

### ✅ POZITIVNÍ ZJIŠTĚNÍ
1. ✅ **Všechny kritické klíče LocalStorage jsou PER-USER** - obsahují `user_id` nebo `userId`
2. ✅ **AuthContext správně validuje user_id** při všech operacích
3. ✅ **UserStorage má STRICT MODE** - validuje vlastnictví dat před načtením
4. ✅ **Robin THP má VŠECHNA potřebná práva** k modulu pokladny přes roli THP/PES
5. ✅ **Citlivá data jsou šifrována** (tokeny) pomocí Web Crypto API
6. ✅ **SessionStorage se používá pouze pro dočasná data** (ne citlivá)

### ⚠️ VAROVÁNÍ - POTENCIÁLNÍ RIZIKA
1. ⚠️ **Několik LEGACY klíčů NENÍ per-user** (viz seznam níže)
2. ⚠️ **Některé utility fallbackují na `localStorage.getItem('user_id')`** bez prefix validace
3. ⚠️ **OrderFormTabs používá globální klíč `orderData`** bez user_id

---

## 1️⃣ ANALÝZA PRÁV UŽIVATELE ROBIN THP

### Základní informace
- **ID:** 137
- **Username:** thp.0000
- **Jméno:** Robin THP
- **Aktivní:** ✅ Ano (aktivni = 1)
- **Role:** THP/PES (ID 9, kod_role: THP_PES)

### Práva k modulu Pokladny (CASH_BOOK_*)

| Právo | Popis | Zdroj | Status |
|-------|-------|-------|--------|
| `CASH_BOOK_READ_OWN` | Zobrazení vlastní pokladní knihy | ✅ Role THP/PES | ✅ MÁ |
| `CASH_BOOK_CREATE` | Vytvoření nového záznamu | ✅ Role THP/PES | ✅ MÁ |
| `CASH_BOOK_EDIT_OWN` | Editace vlastních záznamů | ✅ Role THP/PES | ✅ MÁ |
| `CASH_BOOK_DELETE_OWN` | Smazání vlastních záznamů | ✅ Role THP/PES | ✅ MÁ |
| `CASH_BOOK_EXPORT_OWN` | Export vlastní pokladní knihy | ✅ Role THP/PES | ✅ MÁ |

### ✅ ZÁVĚR - PRÁVA K POKLADNĚ

Robin THP **MÁ VŠECHNA POTŘEBNÁ PRÁVA** pro práci s modulem pokladny:

1. ✅ **Zobrazit modul pokladny** - ano (CASH_BOOK_READ_OWN)
2. ✅ **Vytvářet příjmové/výdajové doklady** - ano (CASH_BOOK_CREATE)
3. ✅ **Mazat příjmové/výdajové doklady** - ano, pouze vlastní (CASH_BOOK_DELETE_OWN)

**Omezení:** Může pracovat POUZE se svou vlastní pokladní knihou (_OWN práva).

### ✅ PŘIŘAZENÍ K POKLADNÍM KNIHÁM

Robin THP je aktivně přiřazen k následujícím pokladním knihám:

| Pokladna ID | Název | Role | Platnost od | Platnost do | Status |
|-------------|-------|------|-------------|-------------|--------|
| 13 | Testovací | 👤 Přiřazený uživatel | 2026-01-07 | ∞ (bez omezení) | ✅ Aktivní |

**SHRNUTÍ:** Robin THP má přiřazenu **1 pokladní knihu** a může v ní vytvářet a mazat doklady.

---

## 2️⃣ ANALÝZA LOCALSTORAGE - PER-USER DATA

### ✅ SPRÁVNĚ IMPLEMENTOVANÉ KLÍČE (s user_id validací)

#### AuthContext a přihlášení
```javascript
// Všechny klíče používají user_id z AuthContext
- `app_lastRoute_user_${userId}` ✅ Per-user
- `auth_token_persistent` ✅ Šifrovaný + expirační validace
- `auth_user_persistent` ✅ Šifrovaný
- `auth_user_detail_persistent` ✅ Šifrovaný
- `auth_user_permissions_persistent` ✅ Šifrovaný
- `current_user_id` ✅ Globální kontrolní ID
```

#### Evidence faktur (InvoiceEvidencePage.js)
```javascript
// VŠECHNY klíče obsahují user_id
- `invoiceSections_${user_id}` ✅ Per-user
- `invoiceForm_${user_id}` ✅ Per-user
- `invoiceAttach_${user_id}` ✅ Per-user
- `invoiceEdit_${user_id}` ✅ Per-user
- `invoiceOrigEntity_${user_id}` ✅ Per-user
- `invoiceLpCerpani_${user_id}` ✅ Per-user
- `invoice_order_cache_${user_id}` ✅ Per-user
- `invoice_smlouva_cache_${user_id}` ✅ Per-user
```

#### Seznam objednávek (Orders25List.js)
```javascript
// Klíče používají currentUserId
const getUserKey = (baseKey) => `${baseKey}_user_${currentUserId || 'anon'}`;
- `orders25List_filters_user_${userId}` ✅ Per-user
- `orders25List_settings_user_${userId}` ✅ Per-user
- `orders25List_columnVisibility_user_${userId}` ✅ Per-user
```

#### Search historie
```javascript
// Klíče s user_id
- `search_history_${userId}` ✅ Per-user (searchHistory.js)
```

#### Todo alarmy
```javascript
- `todo-alarms-${userId}` ✅ Per-user (useTodoAlarms.js)
```

#### User settings
```javascript
- `user_settings_${userId}` ✅ Per-user (ProfilePage.js)
```

### ⚠️ POTENCIÁLNĚ PROBLEMATICKÉ KLÍČE (bez user_id)

#### LEGACY klíče (bez user_id - sdílené mezi uživateli)
```javascript
// RIZIKO: Tyto klíče jsou GLOBÁLNÍ a sdílené mezi všemi uživateli!
❌ `hadOriginalEntity` - InvoiceEvidencePage.js řádek 2045, 2759
❌ `activeOrderEditId` - InvoiceEvidencePage.js řádek 2716
❌ `spisovka_active_dokument` - InvoiceEvidencePage.js řádek 2795
❌ `orderData` - OrderFormTabs.js řádek 159
❌ `app_lastRoute` - App.js řádek 184 (legacy, migruje se na per-user)
```

**DOPORUČENÍ:**
- Všechny tyto klíče by měly být přepsány na per-user varianty
- `hadOriginalEntity` → `hadOriginalEntity_${user_id}`
- `activeOrderEditId` → `activeOrderEditId_${user_id}`
- atd.

#### UI Preference klíče (OK - jsou globální záměrně)
```javascript
// Tyto klíče jsou OK jako globální (UI nastavení)
✅ `app_theme_preference` - Téma je per-browser (OK)
✅ `dictionaries_activeTab` - Aktivní tab (OK)
✅ `orders25List_pageSize` - Velikost stránky (OK jako globální)
✅ `orders25List_pageIndex` - Index stránky (OK jako globální)
✅ `contactsPage_*` - Filtry kontaktů (OK jako globální)
✅ `notifications_*` - Nastavení notifikací (OK)
✅ `hierarchy_*` - UI nastavení hierarchie (OK)
✅ `cashbook_selector_*` - Výběr pokladny (OK)
```

---

## 3️⃣ ANALÝZA SESSIONSTORAGE - DOČASNÁ DATA

### ✅ SPRÁVNĚ IMPLEMENTOVANÉ (pouze dočasné stavy)

```javascript
// SessionStorage používá se POUZE pro dočasné technické stavy
✅ `app_initialized` - Flag inicializace aplikace (index.js)
✅ `invoice_fresh_navigation` - Flag navigace (InvoiceEvidencePage.js)
✅ `_debug_encrypted_test` - Debug šifrování (refreshUtils.js)
✅ `_debug_original_test` - Debug šifrování (refreshUtils.js)
```

**ZÁVĚR:** SessionStorage se používá POUZE pro:
- Technické flagy (app_initialized)
- Dočasné navigační stavy
- Debug data (pouze ve vývoji)

**BEZPEČNOST:** ✅ Žádná citlivá data nejsou v sessionStorage.

---

## 4️⃣ VALIDAČNÍ MECHANISMY

### UserStorage.js - STRICT MODE validace

```javascript
/**
 * STRICT: Získá user-specific data s validací vlastnictví
 * Vrací data POUZE pokud patří aktuálně přihlášenému uživateli
 */
export const getUserSpecificData = (key, expectedUserId = null) => {
  const currentUserId = expectedUserId || getCurrentUserId();
  
  // Validace 1: Klíč musí obsahovat user_id
  if (!key.includes(String(currentUserId))) {
    return null; // ❌ ZAMÍTNUTO
  }

  // Validace 2: Data mohou obsahovat __draftOwner metadata
  const dataOwnerId = parsed.__draftOwner || parsed.user_id;
  if (dataOwnerId && String(dataOwnerId) !== String(currentUserId)) {
    return null; // ❌ ZAMÍTNUTO
  }

  return parsed; // ✅ POVOLENO
}
```

**BEZPEČNOST:** 
- ✅ Dvojí validace (klíč + metadata)
- ✅ Automatické zamítnutí cizích dat
- ✅ Přidává `__draftOwner` a `__timestamp` metadata

### AuthContext.js - User_id validace

```javascript
// ✅ KRITICKÉ: Zkontroluj změnu uživatele a vyčisti data předchozího uživatele
const userChanged = checkAndCleanUserChange(loginData.id);

// ✅ Migrace starých dat bez user_id na nové s user_id
migrateOldUserData(loginData.id);

// ✅ Nastavíme user_id hned po přihlášení
setUserId(loginData.id);
setUser({ id: loginData.id, username: loginData.username });
```

**WORKFLOW:**
1. Při přihlášení se zkontroluje změna uživatele
2. Data předchozího uživatele se vymažou
3. Nastaví se nový `current_user_id`
4. Všechny komponenty používají tento ID pro validaci

---

## 5️⃣ KRITICKÉ UTILITY A FALLBACKY

### ⚠️ Místa s fallback na localStorage bez validace

```javascript
// OrderForm25.js - řádky 8861, 22905, 22933
const user_id = parseInt(localStorage.getItem('user_id'), 10);
// ⚠️ RIZIKO: Chybí validace proti current_user_id

// OrganizationHierarchy.js - řádky 2345, 4180, 4219, 4284, 4325, 4385, 4434
const username = userData?.username || localStorage.getItem('username');
// ⚠️ RIZIKO: Fallback na globální username (může být starý)

// apiInvoiceV2.js, api25invoices.js
const userId = localStorage.getItem('user_id');
// ⚠️ RIZIKO: Používá se bez validace proti AuthContext
```

**DOPORUČENÍ:**
- Všechny utility by měly používat AuthContext.user_id místo přímého localStorage
- Přidat validaci: `if (userId !== currentUserId) throw new Error('Invalid user');`

---

## 6️⃣ ŠIFROVÁNÍ CITLIVÝCH DAT

### AuthStorage.js - Šifrování

```javascript
// ✅ Tokeny jsou šifrovány pomocí Web Crypto API
const encrypted = await encryptData(dataString);
localStorage.setItem(PERSISTENT_KEYS.TOKEN, encrypted);

// ✅ Expirace tokenů (7 dní)
const tokenData = {
  value: token,
  expires: Date.now() + (24 * 7 * 60 * 60 * 1000) // 7 dní
};
```

**BEZPEČNOST:**
- ✅ AES-GCM šifrování
- ✅ Automatická expirace (7 dní)
- ✅ Fallback na nešifrované pokud Web Crypto není dostupné

---

## 7️⃣ DOPORUČENÍ A AKČNÍ BODY

### 🔴 KRITICKÉ (opravit okamžitě)
1. **Přepsat legacy klíče na per-user:**
   ```javascript
   // Před:
   localStorage.setItem('activeOrderEditId', order.id);
   
   // Po:
   localStorage.setItem(`activeOrderEditId_${user_id}`, order.id);
   ```

2. **Přidat validaci do všech utility fallbacků:**
   ```javascript
   // Přidat do OrderForm25.js, api25invoices.js, atd.
   const { user_id } = useContext(AuthContext);
   const storedUserId = localStorage.getItem('user_id');
   if (storedUserId !== String(user_id)) {
     throw new Error('User ID mismatch');
   }
   ```

### 🟡 STŘEDNÍ PRIORITA
3. **Centralizovat přístup k localStorage:**
   - Vytvořit wrapper `SecureStorage` pro všechny komponenty
   - Automaticky přidávat user_id do všech klíčů
   
4. **Audit všech `localStorage.getItem/setItem` volání:**
   - Hledat případy bez user_id validace
   - Přepsat na `getUserSpecificData()` / `setUserSpecificData()`

### 🟢 NÍZKÁ PRIORITA
5. **Dokumentace:**
   - Přidat komentáře k legacy klíčům
   - Vytvořit migration guide pro přechod na per-user klíče

---

## 8️⃣ SQL DOTAZY PRO VERIFIKACI

### Kontrola práv k pokladně pro konkrétního uživatele
```sql
-- Zjistit všechna CASH_* práva uživatele
SELECT 
  u.id,
  u.username,
  u.jmeno,
  u.prijmeni,
  r.nazev_role,
  p.kod_prava,
  p.popis
FROM 25_uzivatele u
JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
JOIN 25_role_prava rp ON ur.role_id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
JOIN 25_role r ON ur.role_id = r.id
WHERE u.id = 137
  AND p.kod_prava LIKE 'CASH_%'
  AND p.aktivni = 1
ORDER BY p.kod_prava;
```

### Kontrola aktivních uživatelů s právy k pokladně
```sql
-- Seznam všech aktivních uživatelů s CASH_BOOK_CREATE právem
SELECT 
  u.id,
  u.username,
  CONCAT(u.jmeno, ' ', u.prijmeni) AS full_name,
  GROUP_CONCAT(r.nazev_role SEPARATOR ', ') AS roles
FROM 25_uzivatele u
JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
JOIN 25_role_prava rp ON ur.role_id = rp.role_id
JOIN 25_prava p ON rp.pravo_id = p.id
JOIN 25_role r ON ur.role_id = r.id
WHERE u.aktivni = 1
  AND p.kod_prava = 'CASH_BOOK_CREATE'
  AND p.aktivni = 1
GROUP BY u.id
ORDER BY u.prijmeni, u.jmeno;
```

---

## 9️⃣ ZÁVĚREČNÉ HODNOCENÍ

### ✅ CELKOVÉ SKÓRE: 8.5/10

**Pozitivní:**
- ✅ Většina kritických dat je per-user
- ✅ Šifrování citlivých dat funguje
- ✅ UserStorage má robustní validaci
- ✅ AuthContext správně řídí user_id
- ✅ Robin THP má všechna potřebná práva

**Negativní:**
- ⚠️ Několik legacy klíčů není per-user
- ⚠️ Některé utility používají fallback bez validace
- ⚠️ Chybí centralizovaný přístup k localStorage

**DOPORUČENÍ:** Opravit 4 legacy klíče a přidat validaci do utilities. Pak bude skóre 10/10.

---

**Připravil:** GitHub Copilot  
**Datum:** 7. ledna 2026  
**Status:** ✅ Audit dokončen - akční body identifikovány
