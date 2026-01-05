# Frontend Permissions Audit & Refactoring Plan

**Datum:** 2025-01-05  
**Cíl:** Sjednotit a zjednodušit systém oprávnění na FE

---

## 🔍 Současný stav FE

### Dodavatelé (Suppliers)
**Kde se používá:**
- **ProfilePage.js** (line 2880, 3376, 3384, 3386):
  ```javascript
  hasPermission('SUPPLIER_READ') || hasPermission('SUPPLIER_EDIT') || hasPermission('CONTACT_MANAGE')
  ```
  - Tab "Adresář dodavatelů" vidí uživatelé s: SUPPLIER_READ, SUPPLIER_EDIT nebo CONTACT_MANAGE

- **ContactsPage.js** (line 555):
  ```javascript
  const hasContactManage = hasPermission && hasPermission('CONTACT_MANAGE');
  ```
  - CONTACT_MANAGE má plný přístup k dodavatelům (vizte všechny, ne jen své)

**Problém:** Míchají se SUPPLIER_* a CONTACT_* práva pro stejnou věc (dodavatele)!

---

### Zaměstnanci (Phonebook)
**Kde se používá:**
- **OrderForm25.js** (lines 14799, 20803, 25613-27, 26824):
  ```javascript
  hasPermission('PHONEBOOK_CREATE') || hasPermission('PHONEBOOK_EDIT')
  ```
  - Používá se pro přidávání kontaktů z ARES do telefonního seznamu

- **App.js** (line 604, 606):
  ```javascript
  hasPermission('PHONEBOOK_VIEW') || hasPermission('PHONEBOOK_CREATE') || 
  hasPermission('PHONEBOOK_EDIT') || hasPermission('PHONEBOOK_DELETE')
  ```
  - Zobrazení menu item "Kontakty"
  - Route /contacts

- **availableSections.js** (line 25):
  ```javascript
  hasPermission('PHONEBOOK_VIEW')
  ```
  - Sekce "Kontakty" v menu

**Použití:** Konzistentní - PHONEBOOK_* práva pro zaměstnance ✅

---

### Menu (availableSections.js)

**Line 19-21: Adresář**
```javascript
// ADRESÁŘ - CONTACT_MANAGE
if (hasPermission && hasPermission('CONTACT_MANAGE')) {
  sections.push({ id: 'addressbook', label: 'Adresář', icon: Book });
}
```

**Line 24-26: Kontakty**
```javascript
// KONTAKTY - PHONEBOOK_VIEW nebo ADMIN
if (isAdmin || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) {
  sections.push({ id: 'contacts', label: 'Kontakty', icon: Users });
}
```

**Závěr:**
- **Adresář** (`/addressbook`) = dodavatelé → kontrola `CONTACT_MANAGE`
- **Kontakty** (`/contacts`) = telefonní seznam zaměstnanců → kontrola `PHONEBOOK_VIEW`

---

## 🎯 Navrhovaný systém

### 1. DODAVATELÉ (Suppliers)
**Stránka:** `/addressbook` (AddressBookPage.js)  
**Oprávnění:**
- `SUPPLIER_MANAGE` - správa všeho (create, edit, delete, view all)
- `SUPPLIER_CREATE` - vytváření nových dodavatelů
- `SUPPLIER_EDIT` - editace dodavatelů
- `SUPPLIER_VIEW` - čtení dodavatelů (místo SUPPLIER_READ)
- `SUPPLIER_DELETE` - mazání dodavatelů

**Hierarchie:**
```
SUPPLIER_MANAGE
├── SUPPLIER_CREATE
├── SUPPLIER_EDIT  
├── SUPPLIER_VIEW
└── SUPPLIER_DELETE
```

**Viditelnost:**
- `SUPPLIER_MANAGE` → vidí všechny dodavatele (globální + úsekové + osobní)
- `SUPPLIER_VIEW/EDIT/CREATE` → vidí jen vlastní úsek + globální + osobní
- Bez práv → vidí jen globální

---

### 2. ZAMĚSTNANCI (Phonebook)
**Stránka:** `/contacts` (ContactsPage.js)  
**Oprávnění:**
- `PHONEBOOK_MANAGE` - správa všeho
- `PHONEBOOK_CREATE` - vytváření kontaktů
- `PHONEBOOK_EDIT` - editace kontaktů
- `PHONEBOOK_VIEW` - čtení kontaktů
- `PHONEBOOK_DELETE` - mazání kontaktů

**Hierarchie:**
```
PHONEBOOK_MANAGE
├── PHONEBOOK_CREATE
├── PHONEBOOK_EDIT
├── PHONEBOOK_VIEW
└── PHONEBOOK_DELETE
```

---

### 3. ODSTRANIT: CONTACT_*
**Práva k odstranění z FE:**
- `CONTACT_MANAGE` → nahradit za `SUPPLIER_MANAGE`
- `CONTACT_READ` → nahradit za `SUPPLIER_VIEW`
- `CONTACT_EDIT` → už máme `SUPPLIER_EDIT`

**Důvod:** Zmatečné a duplicitní s SUPPLIER_*. Slučujeme do jednoho systému.

---

## 📝 Refactoring checklist

### Krok 1: Opravit ProfilePage.js
```javascript
// BEFORE (line 2880):
hasPermission('SUPPLIER_READ') || hasPermission('SUPPLIER_EDIT') || hasPermission('CONTACT_MANAGE')

// AFTER:
hasPermission('SUPPLIER_VIEW') || hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_MANAGE')
```

```javascript
// BEFORE (line 3384, 3386):
if (isAdmin || hasPermission('CONTACT_MANAGE')) {
  // full access
} else if (hasPermission('SUPPLIER_EDIT')) {
  // edit only
}

// AFTER:
if (isAdmin || hasPermission('SUPPLIER_MANAGE')) {
  // full access
} else if (hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_VIEW')) {
  // view/edit based on permission
}
```

---

### Krok 2: Opravit ContactsPage.js
```javascript
// BEFORE (line 555):
const hasContactManage = hasPermission && hasPermission('CONTACT_MANAGE');

// AFTER:
const hasSupplierManage = hasPermission && hasPermission('SUPPLIER_MANAGE');
```

---

### Krok 3: Opravit availableSections.js
```javascript
// BEFORE (line 19-21):
// ADRESÁŘ - CONTACT_MANAGE
if (hasPermission && hasPermission('CONTACT_MANAGE')) {
  sections.push({ id: 'addressbook', label: 'Adresář', icon: Book });
}

// AFTER:
// ADRESÁŘ - SUPPLIER_MANAGE nebo SUPPLIER_VIEW
if (hasPermission && (hasPermission('SUPPLIER_MANAGE') || hasPermission('SUPPLIER_VIEW') || 
    hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_CREATE'))) {
  sections.push({ id: 'addressbook', label: 'Adresář', icon: Book });
}
```

---

### Krok 4: Přidat SUPPLIER_VIEW do databáze
```sql
-- Možná už existuje jako SUPPLIER_READ (ID 91)
-- Pokud ano, přejmenovat:
UPDATE 25_prava 
SET kod_prava = 'SUPPLIER_VIEW', nazev = 'Prohlížení dodavatelů'
WHERE kod_prava = 'SUPPLIER_READ';

-- Nebo vytvořit nové:
INSERT INTO 25_prava (kod_prava, nazev, popis) VALUES
('SUPPLIER_VIEW', 'Prohlížení dodavatelů', 'Oprávnění k prohlížení dodavatelů'),
('SUPPLIER_DELETE', 'Mazání dodavatelů', 'Oprávnění k mazání dodavatelů');
```

---

### Krok 5: Přidat PHONEBOOK_MANAGE
```sql
INSERT INTO 25_prava (kod_prava, nazev, popis) VALUES
('PHONEBOOK_MANAGE', 'Správa telefonního seznamu', 'Plný přístup k telefonnímu seznamu zaměstnanců');
```

---

## 🔄 Migrace práv uživatelů

```sql
-- Uživatelé s CONTACT_MANAGE dostanou SUPPLIER_MANAGE
INSERT INTO 25_uzivatele_prava (id_uzivatel, id_pravo)
SELECT up.id_uzivatel, (SELECT id_pravo FROM 25_prava WHERE kod_prava = 'SUPPLIER_MANAGE')
FROM 25_uzivatele_prava up
JOIN 25_prava p ON up.id_pravo = p.id_pravo
WHERE p.kod_prava = 'CONTACT_MANAGE'
AND NOT EXISTS (
  SELECT 1 FROM 25_uzivatele_prava up2
  JOIN 25_prava p2 ON up2.id_pravo = p2.id_pravo
  WHERE up2.id_uzivatel = up.id_uzivatel AND p2.kod_prava = 'SUPPLIER_MANAGE'
);

-- Uživatelé s CONTACT_READ dostanou SUPPLIER_VIEW
INSERT INTO 25_uzivatele_prava (id_uzivatel, id_pravo)
SELECT up.id_uzivatel, (SELECT id_pravo FROM 25_prava WHERE kod_prava = 'SUPPLIER_VIEW')
FROM 25_uzivatele_prava up
JOIN 25_prava p ON up.id_pravo = p.id_pravo
WHERE p.kod_prava = 'CONTACT_READ'
AND NOT EXISTS (
  SELECT 1 FROM 25_uzivatele_prava up2
  JOIN 25_prava p2 ON up2.id_pravo = p2.id_pravo
  WHERE up2.id_uzivatel = up.id_uzivatel AND p2.kod_prava = 'SUPPLIER_VIEW'
);
```

---

## ✅ Výsledný systém

### Menu položky
1. **Adresář** (`/addressbook`) 
   - Zobrazení: `SUPPLIER_MANAGE | SUPPLIER_VIEW | SUPPLIER_EDIT | SUPPLIER_CREATE`
   - Obsah: Dodavatelé (firmy)

2. **Kontakty** (`/contacts`)
   - Zobrazení: `PHONEBOOK_VIEW | PHONEBOOK_MANAGE`
   - Obsah: Zaměstnanci (telefonní seznam)

### Práva hierarchie

**Dodavatelé:**
- SUPPLIER_MANAGE → vše
- SUPPLIER_CREATE → vytváření
- SUPPLIER_EDIT → editace
- SUPPLIER_VIEW → čtení
- SUPPLIER_DELETE → mazání

**Zaměstnanci:**
- PHONEBOOK_MANAGE → vše
- PHONEBOOK_CREATE → vytváření
- PHONEBOOK_EDIT → editace
- PHONEBOOK_VIEW → čtení
- PHONEBOOK_DELETE → mazání

**Odstraněno:**
- ~~CONTACT_MANAGE~~
- ~~CONTACT_READ~~
- ~~CONTACT_EDIT~~
