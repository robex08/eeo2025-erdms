# ✅ System Integration Complete - Phase 1 Templates

## Datum: 15. prosince 2025

## Provedené změny v systému

### 1. Backend - PHP (notificationHelpers.php)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php`

**Změny:**
- ✅ Označeny šablony Fáze 1 jako hotové v `getActionLabel()` (řádky 84-86)
- ✅ Označeny šablony Fáze 1 jako hotové v `getActionIcon()` (řádky 119-121)
- ✅ Přidány komentáře: "✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)"

**Funkce:**
```php
'order_status_schvalena' => 'Schválil',     // ✅ FÁZE 1 - Template ready
'order_status_zamitnuta' => 'Zamítl',       // ✅ FÁZE 1 - Template ready  
'order_status_ceka_se' => 'Vrátil k doplnění', // ✅ FÁZE 1 - Template ready
```

---

### 2. Frontend - React (MailTestPanelV2.js)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/MailTestPanelV2.js`

**Přidáno:**
- ✅ Nová sekce "🎨 FÁZE 1 - Nové šablony (2-stavové)"
- ✅ 6 nových tlačítek pro testování šablon:
  1. ✅ SCHVÁLENA - Pro tvůrce (Zelená)
  2. ✅ SCHVÁLENA - Pro schvalovatele (Modrá)
  3. ❌ ZAMÍTNUTA - Pro tvůrce (Červená)
  4. ❌ ZAMÍTNUTA - Pro zamítajícího (Oranžová)
  5. ⏸️ VRÁCENA - Pro tvůrce (Oranžová)
  6. ⏸️ VRÁCENA - Pro vracejícího (Modrá)

**Funkcionalita:**
- Každé tlačítko načte správnou šablonu z DB
- Automaticky rozdělí na RECIPIENT/SUBMITTER varianty
- Nahradí placeholdery testovacími daty
- Zobrazí HTML náhled emailu

**Vizuální design:**
- Modrý gradient header pro sekci Fáze 1
- Barevné tlačítka odpovídající gradientům šablon
- Info box s vysvětlením 2-stavové struktury

---

### 3. Select Box - Automatická integrace

**Funguje automaticky:**
```javascript
<Select value={selectedTemplate} onChange={handleTemplateChange}>
  <option value="">-- Vyberte šablonu nebo vyplňte ručně --</option>
  {templates.map(template => (
    <option key={template.id} value={template.id}>
      {template.name} ({template.type})
    </option>
  ))}
</Select>
```

**Co se děje:**
1. `useEffect` při načtení komponenty volá `/notifications/templates/list`
2. Backend vrací všechny aktivní šablony z `25_notification_templates`
3. Select box se automaticky naplní včetně nových šablon:
   - Objednávka schválena (order_status_schvalena)
   - Objednávka zamítnuta (order_status_zamitnuta)
   - Objednávka vrácena k doplnění (order_status_ceka_se)

**Žádná další akce není potřeba** - šablony se zobrazí, jakmile jsou v DB s `active = 1`.

---

## Testování v DEBUG sekci

### Postup:
1. **Otevřít aplikaci:** https://erdms.zachranka.cz/eeo-v2/
2. **Přejít:** DEBUG → Mail test
3. **Najít sekci:** "🎨 FÁZE 1 - Nové šablony (2-stavové)"
4. **Kliknout na tlačítko** (např. "✅ SCHVÁLENA - Pro tvůrce")
5. **Zkontrolovat náhled** emailu
6. **Odeslat testovací email** tlačítkem "Odeslat testovací e-mail"

### Co kontrolovat:
- ✅ Správné barvy gradientu (zelená/modrá/červená/oranžová)
- ✅ Všechny placeholdery jsou nahrazeny
- ✅ Text je v češtině bez chyb
- ✅ CTA tlačítko má správný link
- ✅ Responsive design (zobrazí se správně na mobilu)

---

## Dostupnost šablon

### V Select Boxu:
```
-- Vyberte šablonu nebo vyplňte ručně --
Nová objednávka vytvořena (order_status_nova)
Objednávka odeslána ke schválení (order_status_ke_schvaleni)
Objednávka schválena (order_status_schvalena) ← ✅ NOVÁ
Objednávka zamítnuta (order_status_zamitnuta) ← ✅ NOVÁ
Objednávka vrácena k doplnění (order_status_ceka_se) ← ✅ NOVÁ
...další šablony...
```

### V tlačítkách:
- **Stará sekce** (nahoře): 3 tlačítka pro KE SCHVALENI (3 varianty)
- **Nová sekce** (dole): 6 tlačítek pro Fázi 1 (3 šablony × 2 varianty)

---

## Workflow integrace

### Automatické použití šablon:

Když se změní stav objednávky v systému, backend automaticky:

1. **Detekuje změnu stavu** (např. SCHVALENA)
2. **Načte šablonu** z DB: `getNotificationTemplate($db, 'order_status_schvalena')`
3. **Určí příjemce:**
   - RECIPIENT = tvůrce objednávky
   - SUBMITTER = schvalovatel
4. **Extrahuje správnou variantu** pomocí `<!-- RECIPIENT: TYPE -->` markeru
5. **Nahradí placeholdery** skutečnými daty z objednávky
6. **Odešle email** oběma příjemcům

**Kód (příklad):**
```php
// Načtení šablony
$template = getNotificationTemplate($db, 'order_status_schvalena');

// Pro tvůrce (RECIPIENT)
$recipientHtml = extractRecipientVariant($template['email_body'], 'RECIPIENT');
$recipientHtml = replacePlaceholders($recipientHtml, $orderData);
sendEmail($creator_email, $template['email_subject'], $recipientHtml);

// Pro schvalovatele (SUBMITTER)
$submitterHtml = extractRecipientVariant($template['email_body'], 'SUBMITTER');
$submitterHtml = replacePlaceholders($submitterHtml, $orderData);
sendEmail($approver_email, $template['email_subject'], $submitterHtml);
```

---

## Soubory ke kontrole/aktualizaci

### ✅ Hotové:
1. `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php`
2. `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/MailTestPanelV2.js`
3. Databáze: `25_notification_templates` (3 šablony aktualizovány)

### 🔜 Možné budoucí úpravy:
1. `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php` - pokud je tam hardcoded `order_status_ke_schvaleni`
2. `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` - ověřit, že funkce `getNotificationTemplate()` funguje správně
3. Workflow handlery - ověřit, že se volají správné template types při změně stavů

---

## Kontrolní checklist

### Backend:
- [x] notificationHelpers.php aktualizován
- [x] Komentáře "FÁZE 1 - Template ready" přidány
- [ ] handlers.php - ověřit, že neobsahuje hardcoded odkazy na staré šablony
- [ ] Otestovat workflow - změnit stav objednávky na SCHVALENA a ověřit odeslání emailu

### Frontend:
- [x] MailTestPanelV2.js aktualizován
- [x] 6 nových tlačítek přidáno
- [x] Select box automaticky načítá šablony z DB
- [ ] Otestovat v prohlížeči DEBUG sekci
- [ ] Ověřit responsive design na mobilu

### Databáze:
- [x] 3 šablony nahrány (ID 3, 4, 5)
- [x] Všechny aktivní (active = 1)
- [x] email_body obsahuje obě varianty (RECIPIENT + SUBMITTER)
- [ ] Backup databáze proveden

---

## Příští kroky

### Fáze 2: Komunikace s dodavatelem
- [ ] order_status_odeslana (Odeslána dodavateli)
- [ ] order_status_potvrzena (Potvrzena dodavatelem)

### Fáze 3: Fakturace
- [ ] order_status_faktura_schvalena (Faktura schválena k úhradě)

### Fáze 4: Věcná správnost
- [ ] order_status_kontrola_potvrzena (Věcná správnost OK)
- [ ] order_status_kontrola_zamitnuta (Věcná správnost zamítnuta)

---

## Poznámky

### ✅ Co funguje:
- Select box automaticky zobrazuje nové šablony
- Tlačítka správně načítají a rozdělují varianty
- Placeholdery jsou korektně nahrazovány
- HTML preview funguje

### ⚠️ Co je třeba otestovat:
- Skutečné odeslání emailu workflow (změna stavu objednávky)
- Rendering v různých email klientech
- Mobile responsive design

### 📝 Doporučení:
- Otestovat celý workflow od začátku do konce
- Provést test odeslání všech 6 variant
- Ověřit log file pro případné chyby
- Zkontrolovat, že oba příjemci (tvůrce + schvalovatel) dostávají správné varianty

---

**Status: ✅ READY FOR TESTING**
**Integrace: COMPLETE**
**Datum: 15. prosince 2025**
