# ✅ CHANGELOG: Invoice Update Audit Trail Fix

**Datum:** 2025-12-22  
**Autor:** GitHub Copilot  
**Typ:** Backend API Fix + Database Migration

---

## 🎯 Problém

Při aktualizaci faktur se **neaktualizovaly** audit trail fieldy:
- ❌ `dt_aktualizace` - časová značka poslední změny
- ❌ `aktualizoval_uzivatel_id` - kdo fakturu naposledy upravil

**Důsledek:**
- Uživatelé nevidí, kdo a kdy fakturu naposledy upravil
- Chybí audit trail pro změny v UI (sloupec "Zaevidoval")
- Porušení best practices pro data tracking

---

## ✅ Řešení

### 1️⃣ **Backend API - PHP handlers**

#### Soubor: `orderV2InvoiceHandlers.php` (Doporučený V2 handler)

**Změna v `handle_order_v2_update_invoice()`:**

```php
// PŘED (řádek ~343):
if (empty($updateFields)) {
    http_response_code(400);
    echo json_encode(array('status' => 'error', 'message' => 'Nebyla poskytnutá žádná data k aktualizaci'));
    return;
}

$updateValues[] = $invoice_id;

// PO (řádek ~343):
if (empty($updateFields)) {
    http_response_code(400);
    echo json_encode(array('status' => 'error', 'message' => 'Nebyla poskytnutá žádná data k aktualizaci'));
    return;
}

// Vždy aktualizuj dt_aktualizace a aktualizoval_uzivatel_id
$updateFields[] = 'dt_aktualizace = NOW()';
$updateFields[] = 'aktualizoval_uzivatel_id = ?';
$updateValues[] = $token_data['id'];

$updateValues[] = $invoice_id;
```

**Benefit:**
- ✅ Automaticky nastavuje `dt_aktualizace = NOW()` při každém UPDATE
- ✅ Automaticky nastavuje `aktualizoval_uzivatel_id` z tokenu aktuálního uživatele
- ✅ Timezone handling už byl implementovaný: `TimezoneHelper::setMysqlTimezone($db)`

---

#### Soubor: `invoiceHandlers.php` (Legacy handler - deprecated)

**Změna v `handle_invoices25_update()`:**

```php
// PŘED (řádek ~458):
// Vždy aktualizuj dt_aktualizace
$fields[] = 'dt_aktualizace = NOW()';

if (empty($fields)) {
    ...
}

$values[] = $faktura_id;

// PO (řádek ~458):
// Vždy aktualizuj dt_aktualizace a aktualizoval_uzivatel_id
$fields[] = 'dt_aktualizace = NOW()';
$fields[] = 'aktualizoval_uzivatel_id = ?';
$values[] = $token_data['id'];

if (empty($fields)) {
    ...
}

$values[] = $faktura_id;
```

**Změna v `handle_invoices25_create()` a `handle_invoices25_update()`:**

```php
// Přidáno po get_db():
// Nastavit MySQL timezone pro konzistentní datetime handling
TimezoneHelper::setMysqlTimezone($db);
```

**Benefit:**
- ✅ I legacy handler nyní správně trackuje změny
- ✅ Konzistentní timezone handling napříč všemi API endpointy

---

### 2️⃣ **Database Migration**

#### Soubor: `migration_faktury_add_aktualizoval_uzivatel.sql`

```sql
-- Přidat sloupec aktualizoval_uzivatel_id
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `aktualizoval_uzivatel_id` INT(10) DEFAULT NULL 
COMMENT 'ID uživatele který fakturu naposledy upravil'
AFTER `vytvoril_uzivatel_id`;

-- Přidat index
CREATE INDEX `idx_aktualizoval_uzivatel` 
ON `25a_objednavky_faktury` (`aktualizoval_uzivatel_id`);

-- Přidat foreign key constraint
ALTER TABLE `25a_objednavky_faktury`
ADD CONSTRAINT `fk_faktury_aktualizoval_uzivatel`
  FOREIGN KEY (`aktualizoval_uzivatel_id`)
  REFERENCES `25_uzivatele` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
```

**Poznámky:**
- ✅ Sloupec je `DEFAULT NULL` - u starých záznamů bude NULL
- ✅ Foreign key s `ON DELETE SET NULL` - pokud se smaže uživatel, záznam zůstane
- ✅ Index pro rychlé dotazy JOIN s tabulkou uživatelů

---

## 🧪 Testování

### Test 1: Vytvoření faktury
```bash
POST /api.eeo/v2025.03_25/orders/v2/invoices/create
{
  "username": "test.user",
  "token": "...",
  "order_id": 123,
  "fa_cislo_vema": "2025001",
  "fa_castka": 15000,
  "fa_datum_vystaveni": "2025-12-22"
}
```

**Expected:**
- ✅ `vytvoril_uzivatel_id` = ID uživatele test.user
- ✅ `dt_vytvoreni` = aktuální čas v české timezone
- ✅ `aktualizoval_uzivatel_id` = NULL (při vytvoření)
- ✅ `dt_aktualizace` = NULL (při vytvoření)

### Test 2: Aktualizace faktury
```bash
POST /api.eeo/v2025.03_25/orders/v2/invoices/update
{
  "username": "admin.user",
  "token": "...",
  "invoice_id": 456,
  "fa_castka": 16000
}
```

**Expected:**
- ✅ `aktualizoval_uzivatel_id` = ID uživatele admin.user
- ✅ `dt_aktualizace` = aktuální čas v české timezone
- ✅ `vytvoril_uzivatel_id` = nezměněné (původní)
- ✅ `dt_vytvoreni` = nezměněné (původní)

### Test 3: UI zobrazení
```javascript
// V Invoices25List.js - sloupec "Zaevidoval"
<TableCell>
  {invoice.aktualizoval_uzivatel_id 
    ? `${invoice.aktualizoval_uzivatel_jmeno} ${invoice.aktualizoval_uzivatel_prijmeni}`
    : `${invoice.vytvoril_uzivatel_jmeno} ${invoice.vytvoril_uzivatel_prijmeni}`}
</TableCell>
```

**Expected:**
- ✅ Zobrazí uživatele, který fakturu naposledy upravil
- ✅ Fallback na vytvoril_uzivatel, pokud aktualizoval je NULL

---

## 📁 Změněné soubory

1. ✅ `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php`
   - Přidáno nastavení `dt_aktualizace` a `aktualizoval_uzivatel_id` v UPDATE

2. ✅ `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
   - Přidáno nastavení `aktualizoval_uzivatel_id` v UPDATE
   - Přidán `TimezoneHelper::setMysqlTimezone()` do CREATE a UPDATE

3. ✅ `/_docs/database-migrations/migration_faktury_add_aktualizoval_uzivatel.sql`
   - Nový migrační skript pro přidání sloupce do DB

---

## 🔍 Timezone Handling Verification

### ✅ TimezoneHelper.php je správně implementovaný

**Funkce:**

1. **`TimezoneHelper::setMysqlTimezone($db)`**
   - Nastaví MySQL session timezone na českou zónu (+01:00 nebo +02:00)
   - Zajistí konzistenci mezi PHP a MySQL časy
   - Volá se v handleru PŘED SQL operacemi

2. **`TimezoneHelper::getCzechDateTime($format)`**
   - Vrací aktuální čas v české časové zóně
   - Používá se pro fallback PHP timestamp

3. **`NOW()` v SQL**
   - Po nastavení timezone pomocí `setMysqlTimezone()` vrací čas v české zóně
   - Není potřeba manuálně konvertovat v PHP

**Použití v handlerech:**

```php
// V orderV2InvoiceHandlers.php (řádek 156, 233):
$db = get_db($config);
TimezoneHelper::setMysqlTimezone($db); // ✅ Nastavení timezone

// V SQL (řádek 346):
$updateFields[] = 'dt_aktualizace = NOW()'; // ✅ NOW() používá českou timezone
```

**Závěr:** 
- ✅ Timezone handling je **správně implementovaný**
- ✅ Všechny časové značky (dt_vytvoreni, dt_aktualizace) jsou v **české časové zóně**
- ✅ Konzistentní napříč všemi V2 API endpointy

---

## 📊 Impact Analysis

### Frontend (React)
- ❌ **Žádné změny nejsou potřeba** v `Invoices25List.js`
- ✅ Backend API response už obsahuje správná data
- ✅ UI sloupec "Zaevidoval" bude zobrazovat správné hodnoty

### Backend (PHP API)
- ✅ V2 handler `orderV2InvoiceHandlers.php` - **FIXED**
- ✅ Legacy handler `invoiceHandlers.php` - **FIXED**
- ✅ Timezone handling - **VERIFIED**

### Database
- ⚠️ **Vyžaduje migraci** - spustit SQL skript
- ✅ Nová struktura kompatibilní s existujícím kódem
- ✅ Starší záznamy (před migrací) budou mít `aktualizoval_uzivatel_id = NULL`

---

## 🚀 Deployment Checklist

- [x] 1. Upravit `orderV2InvoiceHandlers.php`
- [x] 2. Upravit `invoiceHandlers.php`
- [x] 3. Vytvořit migrační SQL skript
- [ ] 4. **Spustit migraci na DEV databázi**
- [ ] 5. Testovat vytvoření faktury (verify vytvoril_uzivatel_id, dt_vytvoreni)
- [ ] 6. Testovat aktualizaci faktury (verify aktualizoval_uzivatel_id, dt_aktualizace)
- [ ] 7. Zkontrolovat timezone (compare DB timestamp vs. FE zobrazení)
- [ ] 8. Code review PHP změn
- [ ] 9. Deploy na PRODUCTION
- [ ] 10. Spustit migraci na PROD databázi
- [ ] 11. Smoke test - vytvořit a upravit testovací fakturu

---

## 📝 Notes

- **MySQL timezone:** TimezoneHelper automaticky detekuje letní/zimní čas (+01:00 nebo +02:00)
- **Backward compatibility:** Starší faktury (před migrací) budou mít `aktualizoval_uzivatel_id = NULL`
- **Performance:** Přidán index na `aktualizoval_uzivatel_id` pro rychlé JOIN dotazy
- **Best practice:** Používáme V2 handler (`orderV2InvoiceHandlers.php`), legacy handler je deprecated

---

## 🔗 Related Files

- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php`
- `/_docs/database-migrations/migration_faktury_add_aktualizoval_uzivatel.sql`
- `/apps/eeo-v2/client/src/pages/Invoices25List.js`
