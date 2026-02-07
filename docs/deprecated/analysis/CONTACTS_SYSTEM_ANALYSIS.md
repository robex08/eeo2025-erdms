# 📇 Analýza systému kontaktů - CONTACT vs SUPPLIER vs PHONEBOOK

**Datum:** 5. ledna 2026  
**Účel:** Vyjasnit rozdíly mezi třemi typy kontaktů a jejich právy

---

## 🎯 TŘI TYPY KONTAKTŮ

### 1️⃣ **PHONEBOOK** = Telefonní seznam zaměstnanců
**Databázová práva:**
- `PHONEBOOK_VIEW` (ID 90) - "Přístup k telefonnímu a emailovému seznamu"
- `PHONEBOOK_CREATE` (ID 142) - "Vytváření nových kontaktů v adresáři"
- `PHONEBOOK_EDIT` (ID 143) - "Editace existujících kontaktů v adresáři"
- `PHONEBOOK_DELETE` (ID 144) - "Mazání kontaktů z adresáře"

**Účel:** 
- Interní adresář zaměstnanců
- Telefonní čísla, emaily, pozice, oddělení
- Zobrazuje se v AddressBookPage → záložka "Zaměstnanci"

**Použití ve frontendových komponentách:**
- `AddressBookPage.js` - záložka "Zaměstnanci" 
- Universal Search - prohledává zaměstnance
- OrderForm25 - výběr garantů, schvalovatelů (to jsou zaměstnanci)

---

### 2️⃣ **CONTACT** = Kontaktní osoby u dodavatelů
**Databázová práva:**
- `CONTACT_READ` (ID 18) - "Zobrazit kontakty dodavatelů"
- `CONTACT_EDIT` (ID 19) - "Editovat kontakty dodavatelů"
- `CONTACT_MANAGE` (ID 17) - "Spravovat kontakty dodavatelů"

**Účel:**
- Konkrétní kontaktní osoby u dodavatelských firem
- Např: "Jana Nováková, obchodní zástupce, ABC s.r.o., jana@abc.cz, +420..."
- To je **ČLOVĚK** u dodavatelské firmy

**Databázová tabulka:** `25_kontakty_dodavatelu` (předpoklad)
```sql
- id
- dodavatel_id (FK na 25_dodavatele)
- kontakt_jmeno
- kontakt_prijmeni
- kontakt_email
- kontakt_telefon
- kontakt_pozice
```

**Použití ve frontendových komponentách:**
- `ContactsPage.js` - správa kontaktních osob
- `AddressBookPage.js` - záložka "Dodavatelé" → zobrazí firmy + jejich kontaktní osoby
- Universal Search - prohledává kontaktní osoby dodavatelů

---

### 3️⃣ **SUPPLIER** = Číselník dodavatelských firem
**Databázová práva:**
- `SUPPLIER_READ` (ID 91) - "Zobrazení dodavatelů"
- `SUPPLIER_EDIT` (ID 92) - "Editace dodavatelů"
- `SUPPLIER_MANAGE` (ID 14) - "Spravovat číselník dodavatelů"

**Účel:**
- Samotné **FIRMY** dodavatelů (právnické osoby)
- Např: "ABC s.r.o., IČO: 12345678, DIČ: CZ12345678, Hlavní 123, Praha"
- To je **FIRMA** jako taková

**Databázová tabulka:** `25_dodavatele`
```sql
- id
- nazev (název firmy)
- ico
- dic
- adresa
- ulice
- mesto
- psc
- zastoupeny (jednající osoba)
- aktivni
- user_id (0 = globální, ID = osobní kontakt)
- usek_zkr (prázdné = všichni, "IT" = jen IT oddělení)
```

**Použití ve frontendových komponentách:**
- `DictionariesNew.js` - číselník dodavatelů (tab DodavateleTab - **ZATÍM NEEXISTUJE**)
- `OrderForm25.js` - výběr dodavatele pro objednávku
- `Users.js` - tab "Dodavatelé" v detailu uživatele
- Universal Search - prohledává dodavatele

---

## 🔄 JAK TO SPOLU SOUVISÍ

```
┌─────────────────────────┐
│  SUPPLIER (Firma)       │  ← Práva: SUPPLIER_READ, SUPPLIER_EDIT, SUPPLIER_MANAGE
│  ABC s.r.o.             │
│  IČO: 12345678          │
│  DIČ: CZ12345678        │
│  Hlavní 123, Praha      │
└────────────┬────────────┘
             │
             │ má více kontaktních osob (1:N)
             │
             ↓
  ┌──────────────────────────┐
  │  CONTACT (Osoba)         │  ← Práva: CONTACT_READ, CONTACT_EDIT, CONTACT_MANAGE
  │  Jana Nováková           │
  │  Obchodní zástupce       │
  │  jana@abc.cz             │
  │  +420 777 888 999        │
  └──────────────────────────┘
  
  ┌──────────────────────────┐
  │  CONTACT (Osoba)         │
  │  Petr Svoboda            │
  │  Technický ředitel       │
  │  petr@abc.cz             │
  │  +420 777 888 998        │
  └──────────────────────────┘
```

**Samostatně:**
```
┌─────────────────────────┐
│  PHONEBOOK (Zaměstnanec)│  ← Práva: PHONEBOOK_VIEW, PHONEBOOK_CREATE, PHONEBOOK_EDIT, PHONEBOOK_DELETE
│  Martin Dvořák          │
│  IT oddělení            │
│  martin.dvorak@firma.cz │
│  +420 123 456 789       │
│  Pozice: Vývojář        │
└─────────────────────────┘
```

---

## 🐛 SOUČASNÉ PROBLÉMY (co jsme objevili)

### ❌ OrderForm25.js - Špatná práva pro přidání do adresáře
**Řádky:** 14799, 20803, 25613-25627, 26824-26826

**Problém:**
```js
// ❌ ŠPATNĚ - používá PHONEBOOK pro dodavatele
const canManageGlobal = hasAdminRole() || 
  (hasPermission('PHONEBOOK_CREATE') || hasPermission('PHONEBOOK_EDIT'));
```

**Mělo by být:**
```js
// ✅ SPRÁVNĚ - pro dodavatele použít CONTACT
const canManageGlobal = hasAdminRole() || 
  (hasPermission('CONTACT_EDIT') || hasPermission('CONTACT_MANAGE'));
```

---

### ❌ AddressBookPage.js - Jeden helper pro dva typy
**Řádek:** 252-255

**Problém:**
```js
// ❌ ŠPATNĚ - oba taby používají PHONEBOOK práva
const permissions = createDictionaryPermissionHelper('PHONEBOOK', hasPermission, hasAdminRole);
```

**Mělo by být:**
```js
// ✅ SPRÁVNĚ - každý tab své práva
const supplierPermissions = createDictionaryPermissionHelper('CONTACT', hasPermission, hasAdminRole);
const employeePermissions = createDictionaryPermissionHelper('PHONEBOOK', hasPermission, hasAdminRole);

// A pak předat správný helper do příslušného tabu:
{activeTab === 'suppliers' && <SuppliersTab permissions={supplierPermissions} />}
{activeTab === 'employees' && <EmployeesTab permissions={employeePermissions} />}
```

---

### ❌ App.js - Route jen s PHONEBOOK právy
**Řádek:** 603-604

**Problém:**
```js
// ❌ ŠPATNĚ - zobrazí se jen pokud má PHONEBOOK práva
{(hasAdminRole() || hasPermission('PHONEBOOK_VIEW') || hasPermission('PHONEBOOK_CREATE') || 
  hasPermission('PHONEBOOK_EDIT') || hasPermission('PHONEBOOK_DELETE')) && (
  <Route path="/address-book" element={<AddressBookPage />} />
)}
```

**Mělo by být:**
```js
// ✅ SPRÁVNĚ - zobrazí se pokud má práva na dodavatele NEBO zaměstnance
{(hasAdminRole() || 
  hasPermission('CONTACT_READ') || hasPermission('CONTACT_EDIT') || hasPermission('CONTACT_MANAGE') ||
  hasPermission('PHONEBOOK_VIEW') || hasPermission('PHONEBOOK_CREATE') || 
  hasPermission('PHONEBOOK_EDIT') || hasPermission('PHONEBOOK_DELETE')) && (
  <Route path="/address-book" element={<AddressBookPage />} />
)}
```

---

### ❌ Layout.js - Menu jen s PHONEBOOK
**Podobný problém jako v App.js** - menu "Adresář" se zobrazí jen s PHONEBOOK právy, mělo by se zobrazit i s CONTACT právy.

---

## 📊 BACKEND API - KONTROLA

### Endpointy pro SUPPLIER (firmy)
```
POST /api.eeo/dodavatele/list          - Seznam dodavatelů
POST /api.eeo/dodavatele/detail        - Detail dodavatele
POST /api.eeo/dodavatele/search        - Vyhledávání dodavatelů
POST /api.eeo/dodavatele/search-ico    - Hledání podle IČO
POST /api.eeo/dodavatele/create        - Vytvoření dodavatele
POST /api.eeo/dodavatele/update        - Update dodavatele
POST /api.eeo/dodavatele/delete        - Smazání dodavatele
POST /api.eeo/dodavatele/contacts      - Kontakty dodavatele (vrací CONTACTs)
```

### Endpointy pro CONTACT (osoby u dodavatelů)
```
❓ NEZNÁMO - backend endpointy pro CONTACT_* práva nejsou zdokumentované
❓ Možná používají stejné endpointy jako dodavatele?
❓ Nebo nemají separátní API a jsou součástí dodavatelů?
```

### Endpointy pro PHONEBOOK (zaměstnanci)
```
❓ NEZNÁMO - backend endpointy pro PHONEBOOK_* práva nejsou zdokumentované
❓ Možná používají uživatelské endpointy?
```

---

## 🔍 CO JE POTŘEBA OVĚŘIT V BACKENDU

### 1. Zkontrolovat PHP API soubory
- [ ] Najít soubor pro dodavatele (supplier/dodavatele)
- [ ] Najít soubor pro kontakty (contacts)
- [ ] Najít soubor pro phonebook (zaměstnanci)
- [ ] Zkontrolovat, jaká práva se kontrolují v PHP kódu

### 2. Zkontrolovat databázové tabulky
- [ ] `25_dodavatele` - tabulka firem
- [ ] `25_kontakty_dodavatelu` - tabulka kontaktních osob (?)
- [ ] `25_uzivatele` - zaměstnanci (pro PHONEBOOK)

### 3. Zkontrolovat permissions check v PHP
```php
// Hledáme v PHP souborech:
hasPermission('CONTACT_READ')
hasPermission('CONTACT_EDIT')
hasPermission('CONTACT_MANAGE')

hasPermission('SUPPLIER_READ')
hasPermission('SUPPLIER_EDIT')
hasPermission('SUPPLIER_MANAGE')

hasPermission('PHONEBOOK_VIEW')
hasPermission('PHONEBOOK_CREATE')
hasPermission('PHONEBOOK_EDIT')
hasPermission('PHONEBOOK_DELETE')
```

---

## ✅ NÁVRH ŘEŠENÍ

### Fáze 1: Oprava OrderForm25
- Změnit všechny `PHONEBOOK_CREATE/EDIT` na `CONTACT_EDIT` nebo `CONTACT_MANAGE`
- Týká se přidávání dodavatele do adresáře z formuláře objednávky

### Fáze 2: Oprava AddressBookPage
- Vytvořit dva separátní permission helpery
- Jeden pro dodavatele (CONTACT_*)
- Jeden pro zaměstnance (PHONEBOOK_*)
- Správně je předat do příslušných komponent

### Fáze 3: Oprava App.js a Layout.js
- Upravit podmínky pro zobrazení route a menu
- Kontrolovat obě skupiny práv (CONTACT + PHONEBOOK)
- Zobrazit pokud má uživatel ALESPOŇ JEDNO z těchto práv

### Fáze 4: Backend verifikace
- Ověřit že PHP API správně kontroluje práva
- Ověřit že databázová struktura podporuje všechny 3 typy
- Případně opravit backend permissions checks

---

## 📝 POZNÁMKY K UNISEARCH

Universal Search by měl prohledávat:
1. **PHONEBOOK** - zaměstnanci (pokud má `PHONEBOOK_VIEW`)
2. **CONTACT** - kontaktní osoby dodavatelů (pokud má `CONTACT_READ`)  
3. **SUPPLIER** - firmy dodavatelů (pokud má `SUPPLIER_READ`)

Každý typ s oddělenými právy = uživatel vidí v search jen to, na co má právo.

---

## 🎯 ZÁVĚR

Máme **3 RŮZNÉ TYPY KONTAKTŮ**, každý s vlastními právy:
- **PHONEBOOK** = zaměstnanci firmy
- **CONTACT** = kontaktní osoby u dodavatelů (lidé)
- **SUPPLIER** = dodavatelské firmy (právnické osoby)

**Současný stav:** Kód nesprávně míchá PHONEBOOK práva pro dodavatele.  
**Cíl:** Oddělit použití práv podle typu kontaktu.

---

**Status:** 🔍 Čeká na backend verifikaci
