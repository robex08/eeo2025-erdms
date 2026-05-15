# AUTO PŘEPOČET ČERPÁNÍ SMLUV - IMPLEMENTACE
**Datum:** 14.03.2026  
**Problém:** Čerpání smluv se nepřepočítávalo automaticky po změnách faktur

---

## 🐛 NALEZENÉ PROBLÉMY

### 1. Overflow v stored procedure `sp_prepocet_cerpani_smluv`
**Problém:**  
- Sloupce `procento_pozadovano`, `procento_planovano`, `procento_skutecne` jsou typu `DECIMAL(7,2)` (max 99999.99)
- Pokud smlouva má velmi malou hodnotu (např. 1 Kč) a velké čerpání (např. 240,000 Kč), procento přesáhne maximum
- Příklad: `(240000 / 1) * 100 = 24,000,000 %` → **OVERFLOW ERROR**

**Chybová hláška:**
```
SQLSTATE[22003]: Numeric value out of range: 1264 Out of range value for column 'procento_pozadovano' at row 1
```

**Oprava:**  
Přidán `LEAST(99999.99, ...)` do výpočtu procenta:
```sql
procento_pozadovano = CASE
  WHEN v_hodnota <= 0 THEN 0
  ELSE LEAST(99999.99, ROUND((v_cerpano_pozadovano / v_hodnota) * 100, 2))
END
```

**Soubor:** `/apps/eeo-v2/client/docs/database-scripts/FIX_sp_prepocet_cerpani_smluv_OVERFLOW.sql`  
**Nasazeno:** ✅ Do databáze `EEO-OSTRA-DEV`  
**Výsledek:** Přepočteno 755 aktivních smluv

---

### 2. Chybějící automatický přepočet po změnách faktur
**Problém:**  
Ani nové Order V2 invoice handlers **NEVOLALY** automatický přepočet čerpání smlouvy po:
- Vytvoření faktury
- Aktualizaci faktury (změna částky, smlouvy)
- Smazání faktury

**Důsledek:**  
Uživatelé museli ručně klikat "Přepočítat čerpání" v číselníku smluv.

---

## ✅ IMPLEMENTOVANÉ ŘEŠENÍ

### 1. Nová helper funkce: `autoRecalculateContractSpendingForInvoice()`

**Umístění:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php` (řádky 121-200)

**Funkce:**
- Automaticky najde všechny smlouvy související s fakturou
- Podporuje 2 typy vazeb:
  1. **Přímá vazba:** `faktura.smlouva_id` → `smlouva.id`
  2. **Vazba přes objednávku:** `faktura.objednavka_id` → `objednavka.financovani.cislo_smlouvy`
- Pro každou nalezenou smlouvu zavolá `prepocetCerpaniSmlouvyAuto(cislo_smlouvy)`
- **Neblokující:** Pokud přepočet selže, nezastaví operaci s fakturou (pouze loguje chybu)

**Parametry:**
- `$invoice_id` - ID faktury
- `$invoice_data` - Volitelně data faktury (jinak se načtou z DB)

---

### 2. Integrace do všech invoice endpointů

#### ✅ Vytvoření faktury
**Endpoint:** `order-v2/{order_id}/invoices/create`  
**Funkce:** `handle_order_v2_create_invoice()`  
**Řádek:** ~617  
**Kdy:** Po úspěšném INSERT faktury, před response

#### ✅ Vytvoření faktury s přílohou
**Endpoint:** `order-v2/{order_id}/invoices/create-with-attachment`  
**Funkce:** `handle_order_v2_create_invoice_with_attachment()`  
**Řádek:** ~369  
**Kdy:** Po úspěšném INSERT faktury, před response

#### ✅ Aktualizace faktury
**Endpoint:** `order-v2/invoices/{invoice_id}/update`  
**Funkce:** `handle_order_v2_update_invoice()`  
**Řádek:** ~1195  
**Kdy:** Po UPDATE, pokud se změnilo:
- `fa_castka` (částka)
- `smlouva_id` (vazba na smlouvu)
- `objednavka_id` (vazba na objednávku)

#### ✅ Smazání faktury
**Endpoint:** `order-v2/invoices/{invoice_id}/delete`  
**Funkce:** `handle_order_v2_delete_invoice()`  
**Řádek:** ~1427  
**Kdy:** Po soft/hard delete faktury, před commit  
**Poznámka:** Používá data faktury načtená PŘED smazáním

---

## 📋 ZMĚNĚNÉ SOUBORY

### 1. Database Schema
```
/apps/eeo-v2/client/docs/database-scripts/FIX_sp_prepocet_cerpani_smluv_OVERFLOW.sql
```
**Změna:** Opravená stored procedure s ochranou před overflow

### 2. Order V2 Invoice Handlers
```
/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php
```
**Změny:**
- ➕ Přidán `require_once` pro `smlouvyHandlers.php` (řádek 30)
- ➕ Nová funkce `autoRecalculateContractSpendingForInvoice()` (řádky 121-200)
- ✏️ `handle_order_v2_create_invoice()` - přidán auto přepočet
- ✏️ `handle_order_v2_create_invoice_with_attachment()` - přidán auto přepočet
- ✏️ `handle_order_v2_update_invoice()` - přidán auto přepočet s podmínkou
- ✏️ `handle_order_v2_delete_invoice()` - přidán SELECT smlouva_id + auto přepočet

---

## 🧪 TESTOVÁNÍ

### Tested Scenarios:
✅ Vytvoření faktury pro objednávku se smlouvou → Čerpání smlouvy se aktualizuje  
✅ Vytvoření faktury s přímou vazbou na smlouvu → Čerpání smlouvy se aktualizuje  
✅ Aktualizace částky faktury → Čerpání smlouvy se přepočítá  
✅ Smazání faktury (soft delete) → Čerpání smlouvy se přepočítá  
✅ Smazání faktury (hard delete) → Čerpání smlouvy se přepočítá  

### Database Status:
- ✅ 755 aktivních smluv přepočteno
- ✅ Problémová smlouva `S-347/75030926/2025` opravena (procento omezeno na 99999.99%)
- ✅ Stored procedure nasazena do `EEO-OSTRA-DEV`

---

## 🔍 DEBUG & MONITORING

### Error Log Messages:
```php
// Při automatickém přepočtu se do logu zapisuje:
error_log("🔍 AUTO PREPOCET: Faktura #{$invoice_id} má přímou vazbu na smlouvu {$cislo_smlouvy}");
error_log("🔍 AUTO PREPOCET: Faktura #{$invoice_id} má vazbu přes objednávku #{$objednavka_id} na smlouvu {$cislo_smlouvy}");
error_log("✅ AUTO PREPOCET: Přepočteno čerpání smlouvy {$cislo_smlouvy} po změně faktury #{$invoice_id}");
error_log("ℹ️ AUTO PREPOCET: Faktura #{$invoice_id} nemá vazbu na žádnou smlouvu - přepočet se neprovádí");
error_log("❌ AUTO PREPOCET ERROR pro fakturu #{$invoice_id}: {$error_message}");
```

### Kontrola logu:
```bash
tail -f /var/www/erdms-dev/logs/php-error.log | grep "AUTO PREPOCET"
```

---

## 📝 NOTES PRO VÝVOJÁŘE

### Důležité konstanty:
```php
define('TBL_FAKTURY', '25a_objednavky_faktury');
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_SMLOUVY', '25_smlouvy');
```

### Kde je funkce prepocetCerpaniSmlouvyAuto():
```
/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php
řádky 1413-1430
```

### Vazby faktur na smlouvy:
1. **Přímá vazba:** `25a_objednavky_faktury.smlouva_id` → `25_smlouvy.id`
2. **Nepřímá vazba:** 
   - `25a_objednavky_faktury.objednavka_id` → `25a_objednavky.id`
   - `25a_objednavky.financovani` (JSON) obsahuje `cislo_smlouvy`
   - Používá `LIKE '%"cislo_smlouvy":"S-XXX"%'` v SQL

---

## ⚠️ ZNÁMÉ LIMITY

1. **MySQL 5.5:** Nemá JSON funkce → používá `LIKE` pattern matching pro parsování JSON
2. **Decimal overflow protection:** Maximální procento je 99999.99% (smlouvy s hodnotou < 0.01 Kč mohou přetéct)
3. **Non-blocking:** Chyba při přepočtu nezastaví vytvoření/úpravu faktury

---

## 🚀 DEPLOYMENT

### Production Checklist:
- [ ] Nasadit opravenou stored procedure do PRODUKČNÍ databáze `eeo2025`
- [ ] Spustit přepočet všech smluv: `CALL sp_prepocet_cerpani_smluv(NULL, NULL);`
- [ ] Nasadit `orderV2InvoiceHandlers.php` do `/var/www/erdms-platform/`
- [ ] Restart Apache: `systemctl reload apache2`
- [ ] Sledovat error log po nasazení

### Rollback:
V případě problémů lze obnovit původní stored procedure z backup (před změnou).

---

## 📊 VÝSLEDKY

✅ **Opraveno:** Overflow při výpočtu procent  
✅ **Implementováno:** Automatický přepočet po všech změnách faktur  
✅ **Testováno:** Všechny invoice endpointy Order V2  
✅ **Kompatibilita:** PHP 5.6, MySQL 5.5  

**Autor:** GitHub Copilot  
**Schváleno:** Pending review
