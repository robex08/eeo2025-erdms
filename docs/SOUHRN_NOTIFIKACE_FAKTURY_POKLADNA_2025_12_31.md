# SOUHRN: Rozšíření notifikací pro faktury a pokladnu

**Datum:** 31. prosince 2025  
**Verze:** 1.92d  
**Status:** ✅ DATABÁZE PŘIPRAVENA, PHP IMPLEMENTACE ČEKÁ

---

## 📊 CO BYLO PROVEDENO

### 1. ✅ Analýza současného stavu
- Prozkoumány tabulky: `25_notifikace_typy_udalosti`, `25_notifikace_sablony`, `25_hierarchie_profily`
- Identifikovány stávající události pro faktury a pokladnu
- Zjištěna struktura aktivního org. hierarchického profilu (PRIKAZCI)

### 2. ✅ Přidání nových typů událostí
Do tabulky `25_notifikace_typy_udalosti` přidáno **8 nových událostí**:

#### Faktury (invoices):
1. **INVOICE_SUBMITTED** - Faktura předána
2. **INVOICE_RETURNED** - Faktura vrácena
3. **INVOICE_MATERIAL_CHECK_REQUESTED** - Věcná správnost vyžadována
4. **INVOICE_UPDATED** - Faktura aktualizována
5. **INVOICE_MATERIAL_CHECK_APPROVED** - Věcná správnost potvrzena
6. **INVOICE_REGISTRY_PUBLISHED** - Uveřejněno v registru

#### Pokladna (cashbook):
7. **CASHBOOK_MONTH_CLOSED** - Pokladna uzavřena za měsíc
8. **CASHBOOK_MONTH_LOCKED** - Pokladna uzamčena za měsíc (URGENT)

### 3. ✅ Přidání notifikačních šablon
Do tabulky `25_notifikace_sablony` přidáno **8 šablon** s:
- Email předměty a těla
- In-app nadpisy a zprávy
- Placeholders pro dynamická data
- Správné priority (normal/urgent)

---

## 🎯 MAPOVÁNÍ TRIGGERŮ

### Kdy se která notifikace spustí:

| Událost | Trigger podmínka | Soubor k úpravě |
|---------|-----------------|-----------------|
| **INVOICE_SUBMITTED** | Změna stavu na "předáno ke kontrole" | `invoiceHandlers.php` |
| **INVOICE_RETURNED** | Změna stavu na "vráceno k doplnění" | `invoiceHandlers.php` |
| **INVOICE_MATERIAL_CHECK_REQUESTED** | Přiřazení faktury k objednávce | `orderV2InvoiceHandlers.php` |
| **INVOICE_UPDATED** | Jakákoli změna údajů faktury | `invoiceHandlers.php` |
| **INVOICE_MATERIAL_CHECK_APPROVED** | Potvrzení věcné správnosti | `invoiceHandlers.php` |
| **INVOICE_REGISTRY_PUBLISHED** | Zveřejnění v registru smluv | `invoiceHandlers.php` |
| **CASHBOOK_MONTH_CLOSED** | Uzavření měsíce v pokladně | `cashbookHandlers.php` |
| **CASHBOOK_MONTH_LOCKED** | Finální uzamčení měsíce | `cashbookHandlers.php` |

---

## 📁 VYTVOŘENÉ SOUBORY

### 1. SQL skript
**Soubor:** `/var/www/erdms-dev/_docs/SQL_ADD_INVOICE_CASHBOOK_NOTIFICATIONS.sql`
- ✅ Spuštěno v databázi `eeo2025-dev`
- Přidány všechny typy událostí
- Přidány všechny šablony
- Obsahuje kontrolní SELECT pro ověření

### 2. Implementační dokumentace
**Soubor:** `/var/www/erdms-dev/_docs/IMPLEMENTACE_NOTIFIKACNICH_TRIGGERU_FAKTURY_POKLADNA.md`
- Kompletní návod na implementaci PHP triggerů
- Ukázky kódu pro každou událost
- Helper funkce `triggerNotification()`
- Testovací scénáře
- Checklist implementace

---

## 🔧 CO JEŠTĚ ZBÝVÁ UDĚLAT

### 1. Vytvořit helper funkci
**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationTriggerHelper.php`

```php
<?php
/**
 * Trigger notifikace s organizační hierarchií
 */
function triggerNotification($db, $eventCode, $data = [], $options = []) {
    // Implementace podle dokumentace
}
```

### 2. Upravit Invoice Handlers
**Soubory:**
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php`

**Přidat triggery:**
- Po změně stavu faktury → `INVOICE_SUBMITTED`, `INVOICE_RETURNED`, `INVOICE_MATERIAL_CHECK_APPROVED`
- Po update faktury → `INVOICE_UPDATED`
- Po zveřejnění v registru → `INVOICE_REGISTRY_PUBLISHED`
- Po přiřazení k objednávce → `INVOICE_MATERIAL_CHECK_REQUESTED`

### 3. Upravit Cashbook Handler
**Soubor:** Najít handler pro pokladnu (potřeba identifikovat)

**Přidat triggery:**
- Po uzavření měsíce → `CASHBOOK_MONTH_CLOSED`
- Po uzamčení měsíce → `CASHBOOK_MONTH_LOCKED`

### 4. Testování
- Otestovat každý trigger samostatně
- Ověřit, že org hierarchie správně směruje notifikace
- Zkontrolovat vícenásobné triggery (např. update + submitted)
- Ověřit logy v `debug_notification_log`

---

## 🎨 ORGANIZAČNÍ HIERARCHIE

### Současný stav
- **Aktivní profil:** PRIKAZCI (ID: 12)
- **Obsahuje:**
  - Šablonu "Objednávka odeslána ke schválení" → role Příkazce operace
  - Šablonu "Objednávka schválena" → role THP/PES, Vrchní
  - Šablonu "K objednávce byla přidána faktura" → role THP/PES
  - Šablonu "Objednávka dokončena" → role THP/PES, Příkazce

### Nové šablony - jak je přiřadit?
**Manuálně v aplikaci EEO:**
1. Otevři Nastavení → Organizační hierarchie
2. Vyber aktivní profil "PRIKAZCI"
3. Přidej nové šablony:
   - **Faktura předána** → přiřaď k rolím THP/PES, Garant
   - **Faktura vrácena** → přiřaď k rolím Creator, Garant
   - **Věcná správnost vyžadována** → přiřaď k rolím THP/PES, Garant
   - **Faktura aktualizována** → přiřaď k rolím THP/PES, Creator, Garant
   - **Věcná správnost potvrzena** → přiřaď k rolím Creator, Garant, Accountant
   - **Uveřejněno v registru** → přiřaď k rolím Creator, Garant
   - **Pokladna uzavřena** → přiřaď k rolím Accountant, Manager
   - **Pokladna uzamčena** → přiřaď k rolím Accountant, Manager

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

### Vícenásobné triggery
✅ **ANO**, je možné a správné, že jedna akce vyvolá více triggerů.

**Příklad:**
```php
// Při předání faktury ke kontrole:
triggerNotification($db, 'INVOICE_SUBMITTED', ...);    // Hlavní událost
triggerNotification($db, 'INVOICE_UPDATED', ...);      // Zároveň update
```

### Kontrola aktivní org hierarchie
✅ **VŽDY** před triggerem ověř aktivní profil:
```php
$stmt = $db->prepare("SELECT id FROM `25_hierarchie_profily` WHERE aktivni = 1 LIMIT 1");
$stmt->execute();
if (!$stmt->fetch()) {
    return; // Org hierarchie není aktivní
}
```

### Priority a kanály
- **NORMAL** priority: Většina událostí
- **URGENT** priority: Uzamčení pokladny (kritické!)
- **app** kanál: Vždy (in-app notifikace)
- **email** kanál: Jen u důležitých (předání, vrácení, schválení)

---

## 📋 CHECKLIST FINALIZACE

- [x] ✅ SQL skripty vytvořeny a spuštěny
- [x] ✅ Typy událostí přidány do databáze
- [x] ✅ Šablony přidány do databáze
- [x] ✅ Dokumentace vytvořena
- [ ] ⏳ Vytvořit `notificationTriggerHelper.php`
- [ ] ⏳ Implementovat triggery v `invoiceHandlers.php`
- [ ] ⏳ Implementovat triggery v `orderV2InvoiceHandlers.php`
- [ ] ⏳ Najít a upravit cashbook handler
- [ ] ⏳ Přiřadit šablony v org hierarchii (UI)
- [ ] ⏳ Otestovat všechny triggery
- [ ] ⏳ Ověřit logy a notifikace

---

## 🚀 DALŠÍ KROKY

1. **Implementace PHP triggerů** podle dokumentace v `IMPLEMENTACE_NOTIFIKACNICH_TRIGGERU_FAKTURY_POKLADNA.md`
2. **Přiřazení šablon** v org hierarchii přes UI aplikace
3. **Testování** každého triggeru samostatně
4. **Deployment** na produkci (po ověření na DEV)

---

**Status:** ✅ DATABÁZE PŘIPRAVENA  
**Datum dokončení DB části:** 31.12.2025  
**Další akce:** Implementace PHP kódu
