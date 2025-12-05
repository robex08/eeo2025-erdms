# Modal Portal Fix - Complete

## Přehled
Všechny modální dialogy v aplikaci byly převedeny na použití `ReactDOM.createPortal` pro správné centrování a zobrazení mimo DOM hierarchii kontejneru.

## Problém
Modální dialogy se nezobrazovaly uprostřed obrazovky, protože byly vykreslovány uvnitř kontejnerů s `position: relative`, což způsobovalo problémy s `position: fixed`.

## Řešení
Použití `ReactDOM.createPortal(modal, document.body)` zajišťuje, že se modály vykreslují přímo do `document.body`, čímž se vyhnou relativnímu pozicionování rodičovských elementů.

## Vzor implementace

```javascript
// 1. Import ReactDOM
import ReactDOM from 'react-dom';

// 2. Převod komponenty modalu
return ReactDOM.createPortal(
  <ModalOverlay>
    <ModalDialog>
      {/* obsah modalu */}
    </ModalDialog>
  </ModalOverlay>,
  document.body
);

// 3. Převod inline modalů v JSX
{showModal && ReactDOM.createPortal(
  <ModalOverlay>
    {/* obsah */}
  </ModalOverlay>,
  document.body
)}
```

## Opravené komponenty

### 1. Orders25List.js ✅
**Modály:**
- Edit Confirm Modal (úprava objednávky)
- Archived Warning Modal (varování archivace)
- Delete Confirm Modal (smazání objednávky)

**Stav:** Kompletně převedeno na Portal

---

### 2. UserManagementModal.js ✅
**Modály:**
- User Management Modal (vytvoření/úprava uživatele)

**Stav:** Kompletně převedeno na Portal

**Změny:**
- Přidán import: `import ReactDOM from 'react-dom'`
- Převeden return statement na Portal
- Přidán `document.body` parametr

---

### 3. ImportOldOrdersModal.js ✅
**Modály:**
- Import Old Orders Modal (import starých objednávek)

**Stav:** Kompletně převedeno na Portal

---

### 4. ContactEditDialog.js ✅
**Modály:**
- Contact Edit Dialog (úprava kontaktu)

**Stav:** Kompletně převedeno na Portal

**Změny:**
- Přidán import: `import ReactDOM from 'react-dom'`
- Převeden return statement
- Uzavřeno s `document.body` parametrem

---

### 5. ContactDeleteDialog.js ✅
**Modály:**
- Contact Delete Dialog (smazání kontaktu)

**Stav:** Kompletně převedeno na Portal

**Změny:**
- Přidán import: `import ReactDOM from 'react-dom'`
- Převeden return statement
- Uzavřeno s `document.body` parametrem

---

### 6. ResetPasswordModal.js ✅
**Modály:**
- Reset Password Modal (reset hesla)

**Stav:** Kompletně převedeno na Portal

**Změny:**
- Přidán import: `import ReactDOM from 'react-dom'`
- Převeden return statement s emotion css
- Uzavřeno s `document.body` parametrem

---

### 7. OrderForm25.js ✅
**Modály:**
- Delete Confirmation Modal (potvrzení smazání šablony)
- Preview Modal (náhled šablony)
- Cancel Confirm Modal (potvrzení zavření formuláře)
- Supplier Search Dialog (vyhledávání dodavatele)
- ARES Search Popup (vyhledávání v ARES)
- Template Save Modal (uložení šablony)

**Stav:** Všech 6 modalů převedeno na Portal

**Změny:**
- Přidán import: `import ReactDOM from 'react-dom'`
- Převedeny inline modály v JSX
- Vzor: `{condition && ReactDOM.createPortal(<Modal />, document.body)}`

---

## Výsledek
✅ **Celkem opraveno: 7 souborů, 13 modalů**

Všechny modální dialogy napříč aplikací nyní správně:
- Centrují se uprostřed obrazovky
- Fungují nezávisle na pozici rodičovského kontejneru
- Vykreslují se na nejvyšší úrovni DOM (document.body)
- Zachovávají funkčnost backdrop overlay

## Kontrola
- ✅ Žádné chyby kompilace
- ✅ Všechny modály používají Portal pattern
- ✅ Import ReactDOM přidán všude kde je potřeba
- ✅ Správné uzavření s `document.body` parametrem

## Použité oblasti
- 📦 **Orders (Objednávky)**: Orders25List.js, OrderForm25.js, ImportOldOrdersModal.js
- 👥 **Users (Uživatelé)**: UserManagementModal.js, ResetPasswordModal.js
- 📇 **Contacts (Kontakty)**: ContactEditDialog.js, ContactDeleteDialog.js

---
**Datum dokončení:** ${new Date().toLocaleDateString('cs-CZ')}
**Status:** ✅ HOTOVO
