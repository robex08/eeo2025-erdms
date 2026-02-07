# 🔍 AUDIT CASHBOOK SYSTÉMU - KONTROLA LOGIKY "JEDNA POKLADNA PRO VÍCE UŽIVATELŮ"

**Datum:** 25.1.2026 13:40  
**Cíl:** Ověřit že všechny funkce správně pracují s jednou společnou knihou pro pokladnu

---

## ✅ CO JE SPRÁVNĚ (HOTOVO):

### 1. **CashbookModel.php**
- ✅ `getBookByPeriod($pokladnaId, $year, $month)` - kontroluje pokladna_id ✅
- ✅ `cashbook-create` handler používá `getBookByPeriod()` ✅
- ✅ Databáze opravena - žádné duplicity ✅

---

## ⚠️ CO POTŘEBUJE OPRAVU:

### 2. **cashbookHandlers.php - handle_cashbook_list_post()**

**PROBLÉM:**
```php
// Řádky 70-84: Filtruje knihy podle uzivatel_id
if (!$permissions->canReadCashbook(null)) {
    if (!$permissions->canReadCashbook($userData['id'])) {
        return api_error(403, 'Nedostatečná oprávnění');
    }
    // ❌ ŠPATNĚ: Omezit na vlastní knihy
    $filters['uzivatel_id'] = $userData['id'];
} elseif (empty($filters['uzivatel_id'])) {
    // ❌ ŠPATNĚ: zobrazit vlastní
    $filters['uzivatel_id'] = $userData['id'];
}
```

**SPRÁVNÉ CHOVÁNÍ:**
- Uživatel by měl vidět knihy **všech pokladen, ke kterým má přístup**
- Filtr by měl být podle `pokladna_id` (z tabulky `25a_pokladny_uzivatele`)
- NE podle `uzivatel_id` v knize

---

### 3. **CashbookPermissions.php**

**PROBLÉM:**
Všechny metody mají parametr `$cashbookUserId`:
```php
canReadCashbook($cashbookUserId, $pokladnaId = null)
canEditCashbook($cashbookUserId, $pokladnaId = null) 
canDeleteCashbook($cashbookUserId, $pokladnaId = null)
```

**NOVÉ PRAVIDLO:**
- `uzivatel_id` v knize = pouze informativní (kdo je hlavní správce)
- Přístup se kontroluje podle **přiřazení k pokladně** (`25a_pokladny_uzivatele`)
- **Všichni** uživatelé přiřazení k pokladně mají stejná práva k jedné společné knize

---

### 4. **CashbookModel::getBooks() - filtr uzivatel_id**

**PROBLÉM:**
```php
// Řádek 65-68
if (!empty($filters['uzivatel_id'])) {
    $sql .= " AND kb.uzivatel_id = ?";
    $params[] = $filters['uzivatel_id'];
}
```

**SPRÁVNÉ CHOVÁNÍ:**
- Místo filtru `uzivatel_id` by měl být filtr podle **pokladen uživatele**
- JOIN s tabulkou `25a_pokladny_uzivatele`
- Zobrazit všechny knihy pokladen, ke kterým má uživatel přístup

---

## 📋 DOPORUČENÉ ZMĚNY:

### PRIORITA 1: Opravit logiku přístupu

1. **CashbookPermissions.php:**
   - Přejmenovat `canReadCashbook($cashbookUserId)` → `canReadCashbook($pokladnaId)`
   - Kontrolovat přiřazení v `25a_pokladny_uzivatele`
   - Ignorovat `uzivatel_id` z knihy

2. **cashbookHandlers.php:**
   - `handle_cashbook_list_post()`: Filtrovat podle pokladen uživatele
   - Načíst seznam `pokladna_id` z `25a_pokladny_uzivatele` 
   - Zobrazit knihy těchto pokladen

3. **CashbookModel::getBooks():**
   - Změnit filtr z `uzivatel_id` na `pokladna_id IN (...)`

---

## 🎯 ZÁVĚR:

**Databáze:** ✅ Opravena  
**Backend kód:** ⚠️ Částečně - potřebuje přepracování logiky přístupu  
**Frontend:** ❓ Není jasné zda správně pracuje s novou logikou

**Doporučení:** Pokračovat v refaktoringu backend kódu aby plně respektoval pravidlo "jedna kniha pro pokladnu".
