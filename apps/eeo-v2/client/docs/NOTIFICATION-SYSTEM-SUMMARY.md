# 📋 SOUHRN: Notifikační Systém - Kompletní Zadání pro BE

**Datum:** 29.10.2025  
**Status:** ✅ PŘIPRAVENO K PŘEDÁNÍ BACKENDU

---

## 🎯 CO BYLO PŘIPRAVENO

### 1. **SQL Migrace** (`NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql`)
- ✅ Nová struktura tabulky `25_notification_templates`
- ✅ **21 notifikačních templates** pro všechny fáze (1-8)
- ✅ **Triggery pro MySQL 5.5.43** (dt_created, dt_updated)
- ✅ Kompatibilita s **PHP 5.6 + MySQL 5.5.43**
- ✅ Charset: `utf8` (místo utf8mb4)
- ✅ Rozšířené placeholdery (50+):
  - Základní info (číslo, předmět, částky)
  - Osoby (tvůrce, garant, příkazce, dodavatel)
  - Akce (kdo, kdy, co udělal)
  - Položky (počet, celková cena, souhrn)
  - **NOVÉ:** Registr smluv (dt_zverejneni, registr_iddt)
  - **NOVÉ:** Fakturace (invoice_number, invoice_amount, invoice_date, splatnost)
  - **NOVÉ:** Věcná kontrola (asset_location, kontroloval_name, poznámka)

### 2. **Backend API Dokumentace** (`BACKEND-NOTIFICATION-API-REQUIREMENTS.md`)
- ✅ Rozšíření existujících endpointů:
  - `POST /notifications/create` - automatické naplnění placeholderů z order_id
  - `POST /notifications/list` - přidány order_id, order_number
- ✅ Nové endpointy:
  - `POST /notifications/preview` - preview před odesláním
  - `GET /notifications/templates` - seznam templates
  - `POST /notifications/send-bulk` - hromadné odesílání
- ✅ **PHP 5.6 helper funkce** (12 funkcí):
  - `getActionLabel()` - název akce podle typu
  - `getActionIcon()` - ikona podle typu
  - `formatNumber()` - formátování čísel
  - `replacePlaceholders()` - nahrazení placeholderů
  - `getOrderPlaceholderData()` - kompletní data z objednávky
  - atd.
- ✅ Email systém (PHPMailer konfigurace)
- ✅ Bezpečnost (XSS prevence, validace, rate limiting)
- ✅ Logging (tabulka `25_notification_logs`)

### 3. **Mapa Workflow** (`NOTIFICATION-WORKFLOW-PHASES-MAP.md`)
- ✅ Detailní popis všech **8 fází** workflow
- ✅ **21 typů notifikací** s přesnou specifikací:
  - Kdy se odesílají
  - Komu se odesílají (příjemci)
  - Priorita (low, normal, high, urgent)
  - Email ANO/NE
  - Trigger (co spustí notifikaci)
  - Jaká data obsahují
- ✅ Tabulka souhrnu všech notifikací
- ✅ Automatické připomínky (deadline notifications)
- ✅ Implementační priorita (MUST HAVE, SHOULD HAVE, NICE TO HAVE)

### 4. **Implementation Checklist** (`BACKEND-NOTIFICATION-IMPLEMENTATION-CHECKLIST.md`)
- ✅ 8 fází implementace s checklisty
- ✅ Krok za krokem instrukce
- ✅ Testovací scénáře (unit, integrace, performance)
- ✅ Deployment checklist
- ✅ Časový odhad: **14-21 hodin**
- ✅ Kritické poznámky k PHP 5.6 a MySQL 5.5.43

---

## 📊 PŘEHLED VŠECH FÁZÍ A NOTIFIKACÍ

### FÁZE 1: NOVÁ / ROZPRACOVANÁ
1. `order_status_nova` - Nová objednávka
2. `order_status_rozpracovana` - Rozpracována (koncept)

### FÁZE 2: SCHVALOVACÍ PROCES
3. `order_status_ke_schvaleni` - Ke schválení ⚡ **HIGH priority**
4. `order_status_schvalena` - Schválena
5. `order_status_zamitnuta` - Zamítnuta ⚡ **HIGH priority**
6. `order_status_ceka_se` - Vrácena k doplnění

### FÁZE 3: ODESLÁNA DODAVATELI
7. `order_status_odeslana` - Odeslána dodavateli
8. `order_status_ceka_potvrzeni` - Čeká na potvrzení (připomínka)

### FÁZE 4: POTVRZENA
9. `order_status_potvrzena` - Potvrzena dodavatelem

### FÁZE 5: REGISTR SMLUV ⭐ **NOVÉ**
10. `order_status_registr_ceka` - Čeká na zveřejnění v registru
11. `order_status_registr_zverejnena` - Zveřejněna v registru

### FÁZE 6: FAKTURACE ⭐ **NOVÉ**
12. `order_status_faktura_ceka` - Čeká na fakturu (připomínka)
13. `order_status_faktura_pridana` - Faktura přidána
14. `order_status_faktura_schvalena` - Faktura schválena
15. `order_status_faktura_uhrazena` - Faktura uhrazena

### FÁZE 7: VĚCNÁ SPRÁVNOST ⭐ **NOVÉ**
16. `order_status_kontrola_ceka` - Čeká na kontrolu ⚡ **HIGH priority**
17. `order_status_kontrola_potvrzena` - Věcná správnost OK
18. `order_status_kontrola_zamitnuta` - Reklamace ⚡ **HIGH priority**

### FÁZE 8: DOKONČENA
19. `order_status_dokoncena` - Objednávka dokončena

### SPECIÁLNÍ STAVY
20. `order_status_zrusena` - Zrušena ⚡ **HIGH priority**
21. `order_status_smazana` - Smazána ⚡ **HIGH priority**

---

## 💡 KLÍČOVÉ VLASTNOSTI ŘEŠENÍ

### ✅ Automatizace
- Backend **automaticky naplní všechny placeholdery** z `order_id`
- Stačí zavolat: `createNotification(array('to_user_id' => 1, 'type' => 'order_status_schvalena', 'order_id' => 123))`
- Backend se postará o:
  - Načtení templatu z DB
  - Načtení dat objednávky (včetně položek, faktur, dodavatele)
  - Nahrazení všech placeholderů
  - Vytvoření notifikace
  - Odeslání emailu (pokud má)

### ✅ Flexibilita
- Každý template má svoje placeholdery
- `additional_data` pro speciální případy (rejection_reason, invoice data)
- Možnost override templatu (změnit text pro konkrétní notifikaci)

### ✅ Bezpečnost
- XSS prevence (`htmlspecialchars()`)
- SQL injection prevence (prepared statements)
- Rate limiting (max 100/min)
- Logging všech notifikací

### ✅ PHP 5.6 & MySQL 5.5.43 Compatible
- **BEZ moderní syntaxe** (bez ??, [], type hints)
- Používá **array()** místo []
- Používá **ternární operátor** místo ??
- Používá **triggery** místo DEFAULT CURRENT_TIMESTAMP
- Používá **utf8** místo utf8mb4

---

## 📁 SOUBORY K PŘEDÁNÍ BACKENDU

1. **`NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql`**
   - SQL migrace - SPUSTIT JAKO PRVNÍ

2. **`BACKEND-NOTIFICATION-API-REQUIREMENTS.md`**
   - Kompletní API dokumentace
   - Helper funkce (copy-paste ready)
   - Email konfigurace
   - Příklady použití

3. **`NOTIFICATION-WORKFLOW-PHASES-MAP.md`**
   - Mapa všech 8 fází
   - Kdy odeslat kterou notifikaci
   - Komu odeslat
   - Jaká data obsahovat

4. **`BACKEND-NOTIFICATION-IMPLEMENTATION-CHECKLIST.md`**
   - Krok za krokem checklist
   - 8 fází implementace
   - Testovací scénáře
   - Deployment postup
   - Časový odhad: 14-21h

---

## 🚀 CO BACKEND MUSÍ UDĚLAT

### MINIMÁLNÍ IMPLEMENTACE (8-10 hodin):
1. ✅ Spustit SQL migraci
2. ✅ Implementovat helper funkce (12 funkcí)
3. ✅ Rozšířit `/notifications/create` o automatické naplnění placeholderů
4. ✅ Implementovat email odesílání
5. ✅ Otestovat s 1-2 typy notifikací

### PLNÁ IMPLEMENTACE (14-21 hodin):
- Vše výše +
- ✅ Implementovat `/notifications/preview`
- ✅ Implementovat `/notifications/templates`
- ✅ Implementovat `/notifications/send-bulk`
- ✅ Rozšířit `/notifications/list`
- ✅ Logging do `25_notification_logs`
- ✅ Bezpečnost (XSS, SQL injection, rate limiting)
- ✅ Otestovat všech 21 typů notifikací
- ✅ Performance testy

---

## ⚠️ KRITICKÉ UPOZORNĚNÍ PRO BE

### PHP 5.6 - NEPOUŽÍVAT:
```php
// ❌ ŠPATNĚ (PHP 7+)
function foo(int $x): string { return $x ?? 'default'; }
$arr = ['key' => 'value'];

// ✅ SPRÁVNĚ (PHP 5.6)
function foo($x) { 
  return isset($x) ? $x : 'default'; 
}
$arr = array('key' => 'value');
```

### MySQL 5.5.43 - NEPOUŽÍVAT:
```sql
-- ❌ ŠPATNĚ (MySQL 5.6+)
CREATE TABLE ... (
  dt_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  dt_updated DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
);

-- ✅ SPRÁVNĚ (MySQL 5.5.43) - POUŽÍT TRIGGERY
CREATE TRIGGER before_insert ... SET NEW.dt_created = NOW();
CREATE TRIGGER before_update ... SET NEW.dt_updated = NOW();
```

---

## 📞 DALŠÍ KROKY

1. **Předat tyto 4 soubory backend vývojáři**
2. **Domluvit meeting pro vysvětlení** (30-60 min)
3. **Časový odhad:** 14-21 hodin čisté práce
4. **Deadline:** [DOPLNIT]
5. **Testing:** Po dokončení společný test na DEV prostředí
6. **Deployment:** Po úspěšném testu nasadit na PROD

---

## ✅ STATUS

- ✅ SQL migrace připravena
- ✅ API dokumentace kompletní
- ✅ Helper funkce napsané (PHP 5.6 compatible)
- ✅ Všechny 21 templates vytvořeny
- ✅ Workflow mapa zdokumentována
- ✅ Implementation checklist hotový
- ✅ Příklady použití připraveny
- ⏳ **ČEKÁ NA BACKEND IMPLEMENTACI**

---

**Připravil:** Frontend Team  
**Datum:** 29.10.2025  
**Verze:** 1.0  
**Status:** ✅ READY FOR BACKEND
