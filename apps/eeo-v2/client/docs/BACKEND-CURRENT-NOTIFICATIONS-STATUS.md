# 📮 Aktuální stav notifikací - Backend

**Datum:** 29. října 2025  
**Účel:** Dokumentace stávajícího notifikačního systému vs. připravený nový systém

---

## 🔄 Dva notifikační systémy

### 1️⃣ **PŮVODNÍ SYSTÉM** (Aktuálně v produkci)
Backend používá **jednoduchý notifikační systém** s tabulkou `25_notifications`

### 2️⃣ **NOVÝ SYSTÉM** (Připraven, čeká na implementaci)
Připravena **kompletní specifikace** s 42 templates a 50+ placeholdery

---

## 📊 Původní systém (co teď backend má)

### Struktura tabulky
```sql
CREATE TABLE `25_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### Typy notifikací (předpokládané)
```javascript
// Základní typy, které backend pravděpodobně podporuje:
const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_PENDING_APPROVAL: 'order_pending_approval',
  ORDER_APPROVED: 'order_approved',
  ORDER_REJECTED: 'order_rejected',
  ORDER_SENT_TO_SUPPLIER: 'order_sent_to_supplier',
  ORDER_CONFIRMED: 'order_confirmed_by_supplier',
  ORDER_COMPLETED: 'order_completed'
};
```

### Jak se notifikace vytvářejí (pravděpodobně)
```php
// Backend endpoint: /api25orders/create nebo /update
// PHP kód (pravděpodobná implementace):

function createNotification($user_id, $order_id, $message, $type) {
    $query = "INSERT INTO 25_notifications 
              (user_id, order_id, message, type, is_read, created_at) 
              VALUES (?, ?, ?, ?, 0, NOW())";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiss", $user_id, $order_id, $message, $type);
    return $stmt->execute();
}

// Příklad použití při schválení objednávky:
if ($stav_schvaleni === 'schvaleno') {
    $message = "Vaše objednávka {$cislo_objednavky} byla schválena";
    createNotification($objednatel_id, $order_id, $message, 'order_approved');
    
    // Email notifikace (volitelně)
    if ($send_email) {
        sendEmailNotification($objednatel_email, $message);
    }
}
```

---

## ❓ Co potřebujeme ověřit s backendem

### 1. Které notifikace backend aktuálně odesílá?
- [ ] **ORDER_CREATED** - Při vytvoření objednávky?
  - Komu: Objednatel?
  - Kdy: Při prvním INSERT?
  
- [ ] **ORDER_PENDING_APPROVAL** - Odeslání ke schválení?
  - Komu: Garant?
  - Kdy: Při změně `stav_schvaleni = 'ceka_na_schvaleni'`?
  
- [ ] **ORDER_APPROVED** - Schválení objednávky?
  - Komu: Objednatel?
  - Kdy: Při změně `stav_schvaleni = 'schvaleno'`?
  
- [ ] **ORDER_REJECTED** - Zamítnutí objednávky?
  - Komu: Objednatel?
  - Kdy: Při změně `stav_schvaleni = 'zamitnuto'`?
  
- [ ] **ORDER_SENT_TO_SUPPLIER** - Odeslání dodavateli?
  - Komu: Dodavatel (email)?
  - Kdy: Při nastavení `dt_odeslani_dodavateli`?
  
- [ ] **ORDER_CONFIRMED** - Potvrzení dodavatelem?
  - Komu: Objednatel, Garant?
  - Kdy: Při nastavení `dt_potvrzeni_dodavatelem`?
  
- [ ] **ORDER_COMPLETED** - Dokončení objednávky?
  - Komu: Objednatel, Garant, Příkazce?
  - Kdy: Při nastavení `dt_dokonceni`?

### 2. Email notifikace
- [ ] Je nakonfigurován email systém?
- [ ] Které notifikace také odesílají email?
- [ ] Jaký je formát emailu (plain text / HTML)?
- [ ] Je použit PHPMailer nebo jiná knihovna?

### 3. NOVÉ fáze (registr, fakturace, věcná správnost)
- [ ] Má backend notifikace pro registr smluv?
  - `REGISTROVANA` stav?
  - Kdy se odesílá?
  
- [ ] Má backend notifikace pro fakturaci?
  - Přidání faktury?
  - Schválení faktury?
  - Uhrazení faktury?
  
- [ ] Má backend notifikace pro věcnou správnost?
  - Potvrzení věcné správnosti?
  - Zamítnutí věcné správnosti?

---

## 🆕 Nový systém (co je připraveno)

### Dokumentace
Připravené soubory v `docs/`:

1. **NOTIFICATION-TEMPLATES-NEW-STRUCTURE.sql** (800 řádků)
   - 42 notification templates
   - MySQL 5.5.43 kompatibilní struktura
   - 50+ placeholderů

2. **BACKEND-NOTIFICATION-API-REQUIREMENTS.md** (450 řádků)
   - 5 API endpointů
   - 12 PHP 5.6 helper funkcí
   - Email konfigurace

3. **NOTIFICATION-WORKFLOW-PHASES-MAP.md** (600 řádků)
   - Všech 8 fází workflow
   - 21 order notifikací

4. **BACKEND-NOTIFICATION-IMPLEMENTATION-CHECKLIST.md** (550 řádků)
   - 170+ checklist položek
   - Odhad: 14-21 hodin

5. **NOTIFICATION-SYSTEM-SUMMARY.md** (350 řádků)
   - Executive summary
   - Handoff package

### 42 Templates v novém systému

#### Objednávky (21 templates)
```
1. order_created_draft - Nová rozpracovaná
2. order_pending_approval - Odeslána ke schválení
3. order_approved - Schválena
4. order_rejected - Zamítnuta
5. order_waiting - Čeká se (vrácena k přepracování)
6. order_sent_to_supplier - Odeslána dodavateli
7. order_confirmed_by_supplier - Potvrzena dodavatelem
8. order_registry_waiting - Čeká na registr (NOVÉ)
9. order_registry_published - Zveřejněna v registru (NOVÉ)
10. order_invoice_waiting - Čeká na fakturu (NOVÉ)
11. order_invoice_added - Faktura přidána (NOVÉ)
12. order_invoice_approved - Faktura schválena (NOVÉ)
13. order_invoice_paid - Faktura uhrazena (NOVÉ)
14. order_vecna_spravnost_waiting - Čeká na věcnou správnost (NOVÉ)
15. order_vecna_spravnost_confirmed - Věcná správnost potvrzena (NOVÉ)
16. order_vecna_spravnost_rejected - Věcná správnost zamítnuta (NOVÉ)
17. order_completed - Dokončena
18. order_cancelled - Zrušena
19. order_deleted - Smazána
20. order_updated - Aktualizována (změna údajů)
21. order_comment_added - Přidán komentář
```

#### TODO Alarmy (5 templates) - NOVÉ
```
22. alarm_todo_normal - Normální připomínka TODO
23. alarm_todo_high - Urgentní připomínka TODO
24. alarm_todo_expired - Prošlé TODO
25. todo_assigned - TODO přiřazeno
26. todo_completed - TODO dokončeno
```

#### Systémové (10 templates) - NOVÉ
```
27. system_maintenance_scheduled - Plánovaná údržba
28. system_maintenance_starting - Údržba začíná
29. system_maintenance_finished - Údržba dokončena
30. system_backup_completed - Záloha dokončena
31. system_update_available - Dostupná aktualizace
32. system_update_installed - Aktualizace nainstalována
33. system_security_alert - Bezpečnostní upozornění
34. system_user_login_alert - Neobvyklé přihlášení
35. system_session_expired - Relace vypršela
36. system_storage_warning - Málo místa na disku
```

#### Ostatní (3 templates) - NOVÉ
```
37. user_mention - Zmínka v komentáři
38. deadline_reminder - Připomínka deadline
39. order_unlock_forced - Nucené odemčení objednávky
```

#### Deprecated (3 templates)
```
40-42. Staré templates pro zpětnou kompatibilitu
```

---

## 🎯 Akce potřebné od backendu

### FÁZE A: Ověření stávajícího systému (1 hodina)
1. [ ] Sdílet PHP kód, který vytváří notifikace
2. [ ] Potvrdit, které typy notifikací se aktuálně odesílají
3. [ ] Potvrdit, zda existují email notifikace
4. [ ] Ukázat příklad notifikace v DB

### FÁZE B: Testování s původním systémem (2-3 hodiny)
1. [ ] Otestovat notifikace při vytvoření objednávky
2. [ ] Otestovat notifikace při schválení/zamítnutí
3. [ ] Otestovat notifikace při dokončení
4. [ ] Ověřit, že notifikace dorazí správným osobám

### FÁZE C: NOVÉ fáze - dočasné řešení (2 hodiny)
Pro NOVÉ fáze (registr, fakturace, věcná správnost) můžeme:
- **Varianta 1:** Použít stávající `order_updated` typ
- **Varianta 2:** Přidat 3 nové typy do původního systému:
  ```php
  'order_registry_published'
  'order_invoice_paid'
  'order_vecna_spravnost_confirmed'
  ```

### FÁZE D: Implementace nového systému (14-21 hodin)
Podle dokumentace v `docs/BACKEND-NOTIFICATION-IMPLEMENTATION-CHECKLIST.md`

---

## 🔍 Testovací dotazy pro backend

### 1. Zobrazit všechny notifikace pro testovací objednávku
```sql
SELECT 
  n.id,
  n.user_id,
  u.username,
  u.email,
  n.order_id,
  o.cislo_objednavky,
  n.message,
  n.type,
  n.is_read,
  n.created_at
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
LEFT JOIN 25_objednavky o ON n.order_id = o.id
WHERE n.order_id = [TEST_ORDER_ID]
ORDER BY n.created_at DESC;
```

### 2. Statistika notifikací podle typu
```sql
SELECT 
  type,
  COUNT(*) as pocet,
  COUNT(CASE WHEN is_read = 1 THEN 1 END) as precteno,
  COUNT(CASE WHEN is_read = 0 THEN 1 END) as neprecteno
FROM 25_notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY type
ORDER BY pocet DESC;
```

### 3. Notifikace bez přiřazeného uživatele (chyby)
```sql
SELECT 
  n.id,
  n.order_id,
  n.message,
  n.type,
  n.created_at
FROM 25_notifications n
WHERE n.user_id IS NULL 
   OR n.user_id NOT IN (SELECT id FROM 25_users)
ORDER BY n.created_at DESC
LIMIT 20;
```

---

## 📋 Checklist před testováním

### Backend připravit
- [ ] Backend běží na `http://localhost:5000`
- [ ] Databáze je dostupná
- [ ] Tabulka `25_notifications` existuje
- [ ] Email konfigurace (volitelné, pro test emailů)

### Testovací data
- [ ] Vytvořen testovací objednatel (user_id: 10)
- [ ] Vytvořen testovací garant (user_id: 5)
- [ ] Vytvořen testovací příkazce (user_id: 3)

### Frontend
- [ ] Frontend běží na `http://localhost:3000`
- [ ] Notification dropdown funguje
- [ ] Console.log pro debug notifikací

---

## 🐛 Známé problémy k ověření

### Problém 1: NOVÉ fáze nemají notifikace
```
❓ OTÁZKA: Má backend notifikace pro:
- Registr smluv (order_registry_published)?
- Fakturace (order_invoice_paid)?
- Věcná správnost (order_vecna_spravnost_confirmed)?

✅ ŘEŠENÍ DOČASNÉ: Použít order_updated nebo přidat 3 typy
🔜 ŘEŠENÍ TRVALÉ: Implementovat nový systém (42 templates)
```

### Problém 2: Notifikace možná nechodí všem příjemcům
```
❓ OTÁZKA: Při dokončení objednávky - komu chodí notifikace?
- Pouze objednateli?
- Objednateli + Garantovi?
- Objednateli + Garantovi + Příkazci?

✅ ŘEŠENÍ: Backend musí explicitně vytvořit notifikaci pro každého příjemce
```

### Problém 3: Email notifikace možná nefungují
```
❓ OTÁZKA: Jsou email notifikace nakonfigurovány?
- Je nastavený SMTP server?
- Funguje PHPMailer?
- Které notifikace také odesílají email?

⚠️ POZNÁMKA: Nový systém má kompletní email setup v dokumentaci
```

---

## 📞 Kontakt s backendem

### Co poslat backendovi
1. ✅ Tento dokument (BACKEND-CURRENT-NOTIFICATIONS-STATUS.md)
2. ✅ Testovací checklist (QUICK-ORDER-TEST-CHECKLIST.md)
3. ✅ Testovací data (test-data-order.json)

### Co žádat od backendu
1. **PHP kód** - Jak se aktuálně vytvářejí notifikace
2. **Potvrzení** - Které typy notifikací existují
3. **Email setup** - Je nakonfigurován? Funguje?
4. **NOVÉ fáze** - Mají notifikace? Pokud ne, jak řešit dočasně?

---

## 🎯 Priorita

### VYSOKÁ (testovat TEĎ s původním systémem)
1. ✅ Základní workflow notifikace (schválení, zamítnutí, dokončení)
2. ✅ Validace příjemců (správné user_id)
3. ✅ Čitelnost notifikací (message má smysl)

### STŘEDNÍ (dočasné řešení pro NOVÉ fáze)
1. 🔄 Registr smluv - notifikace při zveřejnění
2. 🔄 Fakturace - notifikace při uhrazení faktury
3. 🔄 Věcná správnost - notifikace při potvrzení

### NÍZKÁ (čeká na nový systém)
1. 🔜 TODO alarmy
2. 🔜 System notifications
3. 🔜 Advanced templates s placeholdery
4. 🔜 HTML emaily

---

## 📝 Poznámky k migraci

Když backend implementuje nový systém:

### Migrace dat (volitelné)
```sql
-- Převod starých notifikací do nového formátu (volitelné)
INSERT INTO 25_notification_queue 
  (user_id, order_id, template_name, data_json, priority, send_email)
SELECT 
  user_id,
  order_id,
  type as template_name,
  JSON_OBJECT('message', message) as data_json,
  'normal' as priority,
  0 as send_email
FROM 25_notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Zpětná kompatibilita
Nový systém podporuje **deprecated templates** pro zachování kompatibility se starým kódem.

---

## ✅ Status

**Aktuální stav:** ⚠️ ČEKÁ NA POTVRZENÍ OD BACKENDU

**Co máme:**
- ✅ Původní systém (pravděpodobně funguje základně)
- ✅ Nový systém (100% připraven k implementaci)
- ✅ Testovací plán
- ✅ Testovací data

**Co potřebujeme:**
- ❓ Potvrzení, které notifikace backend aktuálně odesílá
- ❓ PHP kód pro vytváření notifikací
- ❓ Řešení pro NOVÉ fáze (dočasné vs. hned nový systém)

---

**Vypracoval:** GitHub Copilot  
**Datum:** 29. října 2025  
**Verze:** 1.0
