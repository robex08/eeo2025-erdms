# 🔧 BACKEND CASHBOOK-CREATE FIX - 9. listopadu 2025

## 🐛 Problém

Endpoint `POST /api.eeo/cashbook-create` vrátil **500 Internal Server Error** s chybami:

### Chyba 1: Chybějící `uzivatel_id`
```
Validační chyby: uzivatel_id je povinné
```

### Chyba 2: NULL hodnota v `prirazeni_id`
```
SQLSTATE[23000]: Integrity constraint violation: 1048 
Column 'prirazeni_id' cannot be null
```

---

## 📊 Struktura tabulky `25a_pokladni_knihy`

```sql
CREATE TABLE `25a_pokladni_knihy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `prirazeni_id` INT(11) NOT NULL,              -- ✅ FK na 25a_pokladny_uzivatele
  `pokladna_id` INT(11) NOT NULL,                -- ✅ FK na 25a_pokladny
  `uzivatel_id` INT(10) NOT NULL,                -- ✅ FK na 25_uzivatele (POVINNÉ!)
  `rok` SMALLINT(4) NOT NULL,
  `mesic` TINYINT(2) NOT NULL,
  ...
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_knihy_prirazeni` FOREIGN KEY (`prirazeni_id`) 
    REFERENCES `25a_pokladny_uzivatele` (`id`),
  CONSTRAINT `fk_knihy_pokladna` FOREIGN KEY (`pokladna_id`) 
    REFERENCES `25a_pokladny` (`id`),
  CONSTRAINT `fk_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB;
```

**Klíčové sloupce:**
- `prirazeni_id` - NOT NULL (FK na přiřazení pokladny)
- `uzivatel_id` - NOT NULL (majitel knihy)
- `pokladna_id` - NOT NULL (FK na pokladnu)

---

## ❌ Co bylo špatně (PŘED opravou)

### Frontend request (ŠPATNĚ):
```javascript
// src/services/cashbookService.js - PŘED
const response = await axios.post(`${API_BASE}/cashbook-create`, {
  ...auth,  // pouze username + token
  prirazeni_pokladny_id: prirazeniPokladnyId,  // ❌ ŠPATNÝ název
  rok,
  mesic
  // ❌ CHYBÍ uzivatel_id!
});
```

**Problémy:**
1. ❌ `prirazeni_pokladny_id` - backend očekává `prirazeni_id`
2. ❌ Chybí `uzivatel_id` - sloupec je NOT NULL v DB

---

## ✅ Řešení (PO opravě)

### 1. Přidán parametr `uzivatel_id`

```javascript
// src/services/cashbookService.js - PO
createBook: async (prirazeniPokladnyId, rok, mesic, uzivatelId) => {
  try {
    const auth = await getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-create`, {
      ...auth,
      prirazeni_id: prirazeniPokladnyId,  // ✅ Správný název sloupce
      rok,
      mesic,
      uzivatel_id: uzivatelId             // ✅ Přidáno POVINNÉ pole
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'vytváření knihy');
  }
},
```

### 2. Volání z komponenty

```javascript
// src/pages/CashBookPage.js
const createResult = await cashbookAPI.createBook(
  mainAssignment.id,  // prirazeni_pokladny_id -> prirazeni_id
  currentYear,
  currentMonth,
  userDetail.id       // uzivatel_id (NOVĚ!)
);
```

---

## 🔍 Klíčové body

### Backend očekává tyto parametry:
```json
{
  "username": "user",
  "token": "xyz",
  "prirazeni_id": 12,      // ✅ Název sloupce v DB
  "rok": 2025,
  "mesic": 11,
  "uzivatel_id": 123       // ✅ POVINNÉ (NOT NULL v DB)
}
```

### Mapping Request vs Response:

| Request parameter | DB sloupec      | Response field (alias) |
|-------------------|-----------------|------------------------|
| `prirazeni_id`    | `prirazeni_id`  | `prirazeni_pokladny_id` |
| `uzivatel_id`     | `uzivatel_id`   | `uzivatel_id`          |
| `pokladna_id`     | `pokladna_id`   | `pokladna_id`          |

**⚠️ Důležité:** Backend vrací v response `prirazeni_pokladny_id` (alias), ale v requestu očekává `prirazeni_id` (skutečný název sloupce)!

---

## 📝 Souvislosti

### Proč jsou potřeba 3 ID?

Tabulka `25a_pokladni_knihy` má **denormalizovanou strukturu**:

1. **`prirazeni_id`** - FK na `25a_pokladny_uzivatele.id`
   - Uchovává info o přiřazení (platnost od/do, je_hlavni)
   
2. **`uzivatel_id`** - FK na `25_uzivatele.id`  
   - Majitel knihy (kopie z přiřazení)
   - Důvod: Rychlé filtrování bez JOIN
   
3. **`pokladna_id`** - FK na `25a_pokladny.id`
   - ID master pokladny (kopie z přiřazení)
   - Důvod: Rychlé získání čísla pokladny bez JOIN

**Denormalizace znamená:**
- Data se duplikují pro rychlejší dotazy
- Při INSERT knihy musíme poslat všechna 3 ID
- Backend by měl extrahovat `uzivatel_id` a `pokladna_id` z `prirazeni_id`, ale nevyžaduje to explicitně

---

## ✅ Výsledek

Po opravě endpoint `/cashbook-create` funguje správně:

**Request:**
```json
{
  "username": "admin",
  "token": "xyz",
  "prirazeni_id": 12,
  "rok": 2025,
  "mesic": 11,
  "uzivatel_id": 123
}
```

**Response (success):**
```json
{
  "status": "ok",
  "data": {
    "book": {
      "id": 45,
      "prirazeni_pokladny_id": 12,
      "uzivatel_id": 123,
      "rok": 2025,
      "mesic": 11,
      "stav_knihy": "aktivni",
      "prevod_z_predchoziho": "0.00",
      "pocatecni_stav": "0.00",
      ...
    }
  }
}
```

---

## 📋 Checklist změn

- [x] Přejmenován parametr `prirazeni_pokladny_id` → `prirazeni_id` v requestu
- [x] Přidán povinný parametr `uzivatel_id` do requestu
- [x] Aktualizován podpis funkce `createBook(prirazeniPokladnyId, rok, mesic, uzivatelId)`
- [x] Aktualizováno volání v `CashBookPage.js` s `userDetail.id`
- [x] Aktualizována dokumentace v JSDoc komentářích
- [x] **OPRAVA:** `syncLocalChangesToDB()` - přidán volitelný parametr `bookId` (9.11.2025)

---

## 🔧 DODATEČNÁ OPRAVA - Sync bez currentBookId

**Problém:** Po vytvoření nové knihy se zobrazila chyba:
```
⚠️ Nelze synchronizovat - chybí currentBookId
```

**Příčina:** 
- `setCurrentBookId(newBook.id)` je asynchronní React state update
- Když se volá `syncLocalChangesToDB(localEntries)`, `currentBookId` ještě není updatnuté
- Synchronizace proto selhává

**Řešení:**
Přidán volitelný parametr `bookId` do `syncLocalChangesToDB()`:

```javascript
// PŘED
const syncLocalChangesToDB = useCallback(async (entries) => {
  if (!currentBookId) {
    console.warn('⚠️ Nelze synchronizovat - chybí currentBookId');
    return;
  }
  // ... použití currentBookId
}, [currentBookId, ...]);

// PO
const syncLocalChangesToDB = useCallback(async (entries, bookId = null) => {
  const targetBookId = bookId || currentBookId;  // ✅ Použít explicitní ID nebo fallback na state
  
  if (!targetBookId) {
    console.warn('⚠️ Nelze synchronizovat - chybí currentBookId');
    return;
  }
  // ... použití targetBookId
}, [currentBookId, ...]);

// Volání s explicitním ID po vytvoření knihy:
syncLocalChangesToDB(localEntries, book.id);  // ✅ Předat book.id přímo
```

**Výhoda:**
- Synchronizace funguje i před updatem React state
- Není potřeba čekat na re-render
- Explicitní kontrola nad ID knihy

---

## 🔗 Související soubory

- `BACKEND-CASHBOOK-LIST-SQL-FIX.md` - Dokumentace SQL struktury
- `src/services/cashbookService.js` - Service vrstva (opraveno)
- `src/pages/CashBookPage.js` - Volání API (opraveno)
- `create_cashbook_tables.sql` - Definice tabulek
