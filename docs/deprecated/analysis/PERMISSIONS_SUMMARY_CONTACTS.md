# Souhrn práv pro Kontakty/Dodavatele/Zaměstnance

## 🔴 PROBLÉM: Záměna pojmů

Udělali jsme chybu v pojmenování práv:
- **PHONEBOOK** jsme použili pro DODAVATELE v OrderForm25
- **CONTACT** jsme měli použít pro DODAVATELE
- **PHONEBOOK** měl být jen pro ZAMĚSTNANCE

---

## ✅ Současný stav v databázi (DEV - eeo2025-dev)

### CONTACT_* - PRO DODAVATELE (již existují!)
- `CONTACT_READ` (ID 18) - Zobrazit kontakty dodavatelů
- `CONTACT_EDIT` (ID 19) - Editovat kontakty dodavatelů
- `CONTACT_MANAGE` (ID 17) - Spravovat kontakty dodavatelů

### PHONEBOOK_* - PRO ZAMĚSTNANCE (již existují!)
- `PHONEBOOK_VIEW` (ID 90) - Přístup k telefonnímu a emailovému seznamu
- `PHONEBOOK_CREATE` (ID 142) - Vytváření nových kontaktů v adresáři
- `PHONEBOOK_EDIT` (ID 143) - Editace existujících kontaktů v adresáři
- `PHONEBOOK_DELETE` (ID 144) - Mazání kontaktů z adresáře

### SUPPLIER_* - PRO DODAVATELE (číselník)
- `SUPPLIER_READ` (ID 91) - Zobrazení dodavatelů
- `SUPPLIER_EDIT` (ID 92) - Editace dodavatelů
- `SUPPLIER_MANAGE` (ID 14) - Spravovat číselník dodavatelů

**ZJIŠTĚNÍ:** Všechna potřebná práva UŽ EXISTUJÍ! Nemusíme vytvářet nová, jen správně použít stávající.

---

## Kde se používají práva v kódu

### 1. **OrderForm25.js** - ❌ ŠPATNĚ POUŽÍVÁ PHONEBOOK
**Co to dělá:** Přidání dodavatele do adresáře z formuláře objednávky

**Současný stav (ŠPATNĚ):**
- Řádek 14795-14799: `load_all`, `canManageGlobal` - používá PHONEBOOK_CREATE/EDIT
- Řádek 20799-20803: Ikona "Přidat do adresáře" - používá PHONEBOOK_CREATE/EDIT
- Řádek 25613-25627: ARES scope selector (Osobní/Úsek/Globální) - používá PHONEBOOK_CREATE/EDIT
- Řádek 26824-26826: Dialog userPermissions - používá PHONEBOOK_CREATE/EDIT

**Mělo by být:** Použít **CONTACT_CREATE/EDIT** nebo **SUPPLIER_EDIT**

---

### 2. **AddressBookPage.js** - ❌ ŠPATNĚ POUŽÍVÁ PHONEBOOK
**Co to dělá:** Stránka s adresářem dodavatelů a zaměstnanců (2 záložky)

**Současný stav (ŠPATNĚ):**
- Řádek 252-255: Permission helper pro 'PHONEBOOK'
- Používá PHONEBOOK práva pro OBĚ záložky (dodavatele i zaměstnance)

**Mělo by být:**
- Záložka "Adresář dodavatelů" → **CONTACT_** práva
- Záložka "Adresář zaměstnanců" → **PHONEBOOK_** práva

---

### 3. **App.js** - ❌ ŠPATNĚ POUŽÍVÁ PHONEBOOK
**Routing pro AddressBookPage**

**Současný stav (ŠPATNĚ):**
- Řádek 603-604: Route `/address-book` - používá PHONEBOOK_*

**Mělo by být:** Použít CONTACT_* NEBO PHONEBOOK_* (obojí, protože stránka má 2 záložky)

---

### 4. **Layout.js** - ❌ ŠPATNĚ POUŽÍVÁ PHONEBOOK
**Menu "Adresář" v Administration sekci**

**Současný stav (ŠPATNĚ):**
- Používá PHONEBOOK_VIEW/CREATE/EDIT/DELETE

**Mělo by být:** CONTACT_* a PHONEBOOK_* (obojí, protože vede na stránku s oběma záložkami)

---

### 5. **ContactsPage.js** - ✅ SPRÁVNĚ
- Řádek 555: Používá `CONTACT_MANAGE` - toto je správně!

---

### 6. **ProfilePage.js** - ✅ MÍX (ale možná správně)
- Řádek 2880, 3376: Používá `SUPPLIER_READ`, `SUPPLIER_EDIT`, `CONTACT_MANAGE`
- Řádek 3384-3386: Kontrola `CONTACT_MANAGE` nebo `SUPPLIER_EDIT`

**Tohle vypadá správně** - používá starší práva pro dodavatele

---

### 7. **availableSections.js** - ⚠️ MÍX
- Řádek 20: `CONTACT_MANAGE`
- Řádek 25: `PHONEBOOK_VIEW`

---

## ✅ Správné rozdělení, jak by mělo být:

### Pro DODAVATELE (suppliers/contacts):
```
CONTACT_VIEW    - zobrazení dodavatelů
CONTACT_CREATE  - vytvoření dodavatele
CONTACT_EDIT    - úprava dodavatele  
CONTACT_DELETE  - smazání dodavatele
```

**Používá:**
- OrderForm25 (přidání dodavatele do adresáře)
- AddressBookPage záložka "Adresář dodavatelů"
- ContactManagement komponenta

### Pro ZAMĚSTNANCE (employees):
```
PHONEBOOK_VIEW   (existuje ID 90)
PHONEBOOK_CREATE (existuje ID 142/138)
PHONEBOOK_EDIT   (existuje ID 143/139)
PHONEBOOK_DELETE (existuje ID 144/140)
```

**Používá:**
- AddressBookPage záložka "Adresář zaměstnanců"
- EmployeeManagement komponenta
- ContactsPage (telefonní seznam)

---

## 🔧 CO MUSÍME UDĚLAT:

**Všechna potřebná práva již existují, jen potřebujeme opravit kód!**

1. ~~Vytvořit práva CONTACT_CREATE/EDIT/DELETE~~ → **UŽ EXISTUJÍ!**
   - Použijeme: `CONTACT_READ`, `CONTACT_EDIT`, `CONTACT_MANAGE`

2. **Opravit OrderForm25.js:**
   - Změnit všechny `PHONEBOOK_CREATE/EDIT` na `CONTACT_EDIT` nebo `CONTACT_MANAGE`
   - Dodavatelé = CONTACT práva, ne PHONEBOOK!

3. **Opravit AddressBookPage.js:**
   - Rozdělit logiku na 2 permission helpery:
     - `contactPermissions` pro záložku dodavatelů → použít `CONTACT_*`
     - `phonebookPermissions` pro záložku zaměstnanců → použít `PHONEBOOK_*`

4. **Opravit App.js routing:**
   - Route `/address-book` musí kontrolovat OBĚ sady práv (CONTACT_* OR PHONEBOOK_*)

5. **Opravit Layout.js menu:**
   - Menu "Adresář" musí kontrolovat OBĚ sady práv

6. **Commit změn s poznámkou o opravě záměny**

---

## ❌ Databázové migrace NEJSOU potřebné

Všechna práva už v databázi existují. Nepotřebujeme vytvářet nová, jen upravit kód aby používal správné existující práva.

---

## Otázky k zodpovězení:

1. ❓ Existují už práva `CONTACT_VIEW`, `CONTACT_MANAGE`, `CONTACT_EDIT`, `CONTACT_READ`?
2. ❓ Existují práva `SUPPLIER_READ`, `SUPPLIER_EDIT`?
3. ❓ Máme vytvořit nová práva nebo použít stávající?
4. ❓ Zachovat kompatibilitu se starými právy?
