# Oprava oprávnění pro sdílené pokladny (více hlavních správců)

**Datum:** 2026-01-04  
**Problém:** Když jsou u jedné pokladny dva hlavní správci a jeden vytvoří knihu, druhý hlavní správce nemůže tu knihu číst ani editovat.

## Příčina

Kniha má `uzivatel_id` (kdo ji vytvořil) a metody `canReadCashbook()`, `canEditCashbook()` kontrolovaly pouze:
- Globální práva (CASH_BOOK_READ_ALL, CASH_BOOK_EDIT_ALL)
- Právo _OWN + jestli `uzivatel_id` == aktuální uživatel

**Chyběla kontrola**: Jestli je uživatel přiřazený k pokladně té knihy (bez ohledu na to, kdo ji vytvořil).

## Řešení

### 1. Opravené metody v `CashbookPermissions.php`

#### `canReadCashbook($cashbookUserId, $pokladnaId = null)`
```php
// Pokud nemá globální práva ani není to jeho kniha,
// zkontrolovat přiřazení k pokladně
if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
    return true;
}
```

#### `canEditCashbook($cashbookUserId, $pokladnaId = null)`
```php
// Stejná logika jako u canReadCashbook
if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
    return true;
}
```

#### `canDeleteCashbook($cashbookUserId, $pokladnaId = null)`
```php
// Stejná logika
if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
    return true;
}
```

#### `canExportCashbook($cashbookUserId, $pokladnaId = null)`
```php
// Stejná logika
if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
    return true;
}
```

### 2. Aktualizace volání v `cashbookHandlers.php`

Všechna volání oprávnění nyní předávají `$book['pokladna_id']`:

**Před:**
```php
if (!$permissions->canReadCashbook($book['uzivatel_id'])) {
    return api_error(403, 'Nedostatečná oprávnění');
}
```

**Po:**
```php
if (!$permissions->canReadCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
    return api_error(403, 'Nedostatečná oprávnění');
}
```

### 3. Opravené handlery

- `handle_cashbook_get_post()` - čtení knihy
- `handle_cashbook_update_post()` - editace knihy
- `handle_entry_create_post()` - přidání položky
- `handle_entry_update_post()` - editace položky
- `handle_entry_restore_post()` - obnovení smazané položky
- `handle_audit_log_get()` - čtení audit logu

## Testovací scénář

1. **Setup:**
   - Pokladna ID=13 "Testovací"
   - Uživatel A (ID=102, Tereza) - hlavní správce
   - Uživatel B (ID=X) - hlavní správce

2. **Test 1:** Uživatel A vytvoří knihu
   - Kniha má `uzivatel_id = 102`
   - Uživatel B (druhý hlavní správce) může:
     - ✅ Číst knihu
     - ✅ Editovat knihu
     - ✅ Přidávat položky
     - ✅ Mazat položky

3. **Test 2:** Uživatel bez přiřazení
   - Uživatel C (není přiřazený k pokladně)
   - ❌ Nemůže číst ani editovat knihy z této pokladny

## Kontrola v databázi

```sql
-- Kontrola přiřazení k pokladně
SELECT 
    p.id,
    p.nazev,
    u.jmeno,
    u.prijmeni,
    pu.je_hlavni,
    pu.platne_od,
    pu.platne_do
FROM 25a_pokladny_uzivatele pu
JOIN 25a_pokladny p ON pu.pokladna_id = p.id
JOIN 25_uzivatele u ON pu.uzivatel_id = u.id
WHERE pu.pokladna_id = 13
  AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
ORDER BY pu.je_hlavni DESC;
```

## Klíčová metoda: `isOwnCashbox()`

```php
private function isOwnCashbox($pokladnaId) {
    // Kontroluje aktivní přiřazení (hlavní i zástupce)
    $stmt = $this->db->prepare("
        SELECT COUNT(*) as count
        FROM 25a_pokladny_uzivatele
        WHERE pokladna_id = ? 
          AND uzivatel_id = ? 
          AND (platne_do IS NULL OR platne_do >= CURDATE())
    ");
    $stmt->execute(array($pokladnaId, $this->user['id']));
    // ...
    return $result['count'] > 0;
}
```

## Závěr

Nyní když jsou u pokladny dva (nebo více) hlavní správci:
- ✅ Každý může vytvářet knihy
- ✅ Každý může číst/editovat knihy vytvořené druhým správcem
- ✅ Funguje pro hlavní i zástupce správce (je_hlavni=0)
- ✅ Kontrola platnosti přiřazení (platne_od, platne_do)

**Po deployi je nutné:**
1. Reload Apache: `systemctl reload apache2`
2. Uživatelé musí refreshnout browser (Ctrl+F5)
