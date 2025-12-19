# 📧 PODROBNÁ ANALÝZA: Prázdné Emaily v Notifikačním Systému

**Datum:** 18. prosince 2025  
**Analytik:** GitHub Copilot  
**Problém:** Uživatel dostává prázdné emaily (bez obsahu) z notifikačního systému

---

## 🎯 EXECUTIVE SUMMARY

**Status:** 🔴 **KRITICKÝ PROBLÉM IDENTIFIKOVÁN**

**Root Cause:** 
Systém **NOVÝ Generic Recipient System** (org. hierarchie) nekorektně zpracovává email šablony, což vede k posílání prázdných emailů.

**Hlavní problémy:**
1. ✅ **Ochrana přidána**: Prázdné emaily se už neposílají (díky patch z dnešního dne)
2. ❌ **Root cause**: `extractVariantFromEmailBody()` může vracet prázdný string
3. ❌ **Missing validation**: `templateId` v template node může být NULL nebo neexistující
4. ⚠️ **Edge configuration**: Některé edges mají `sendEmail: true` i když by neměly

---

## 🔍 1. ANALÝZA KÓDU

### A. Současný Flow Odesílání Emailů

```
1. Událost (např. ORDER_SENT_FOR_APPROVAL)
   ↓
2. notificationRouter() - načte placeholders z DB
   ↓  
3. findNotificationRecipients() - najde příjemce podle hierarchie
   ↓
4. PRO KAŽDÉHO PŘÍJEMCE:
   a) Načti template z DB (SELECT * FROM 25_notification_templates WHERE id = :template_id)
   b) Vyber variantu (normalVariant / urgentVariant / infoVariant)
   c) extractVariantFromEmailBody() - extrahuj HTML pro variantu
   d) replacePlaceholders() - nahraď {placeholders}
   e) sendNotificationEmail() - pošli email
```

### B. Klíčové Funkce

#### **extractVariantFromEmailBody()** (řádek 2469)

```php
function extractVariantFromEmailBody($emailBody, $variant) {
    if (!$emailBody) return '';  // ⚠️ Pokud je emailBody prázdné, vrátí ''
    
    $marker = "<!-- RECIPIENT: $variant -->";
    
    if (!strpos($emailBody, $marker)) {
        // ⚠️ Pokud varianta neexistuje, vrátí CELÉ body (fallback)
        return $emailBody;
    }
    
    // Najít začátek varianty
    $start = strpos($emailBody, $marker);
    $start = $start + strlen($marker);
    
    // Najít konec varianty (další marker nebo konec)
    $end = strpos($emailBody, '<!-- RECIPIENT:', $start);
    if ($end === false) {
        $end = strlen($emailBody);
    }
    
    return trim(substr($emailBody, $start, $end - $start));
}
```

**🐛 BUG #1:** Pokud `$emailBody` je prázdný string, vrátí `''`  
**🐛 BUG #2:** Pokud marker neexistuje, vrátí celý emailBody (může být problém s whitespace)  
**🐛 BUG #3:** `strpos()` vrací `0` pokud marker je na začátku → `!strpos()` je TRUE → vrátí celý body!

**⚠️ KRITICKÁ CHYBA:**
```php
if (!strpos($emailBody, $marker)) {
    return $emailBody;
}
```
Tohle je **CHYBNĚ**! `strpos()` vrací `0` pokud je marker na pozici 0, a `!0` je `TRUE`.
Správně by mělo být:
```php
if (strpos($emailBody, $marker) === false) {
    return $emailBody;
}
```

#### **sendNotificationEmail()** (řádek 2772) - **✅ OPRAVENO DNES**

```php
function sendNotificationEmail($db, $userId, $subject, $htmlBody) {
    try {
        // ❌ OCHRANA: Neposlat prázdné emaily
        if (empty($subject) || empty($htmlBody)) {
            error_log("[sendNotificationEmail] ❌ BLOCKED: Empty subject or body for user $userId");
            return array('ok' => false, 'error' => 'Empty subject or body - email not sent');
        }
        
        // ... zbytek kódu
```

**✅ HOTOVO:** Přidána ochrana proti prázdným emailům.

#### **notificationRouter()** (řádek 2040+)

```php
// 5. Nahradit placeholdery v šabloně
$processedTitle = replacePlaceholders($template['app_nadpis'], $placeholderData);
$processedMessage = replacePlaceholders($template['app_zprava'], $placeholderData);
$processedEmailBody = extractVariantFromEmailBody($template['email_telo'], $variant);
$processedEmailBody = replacePlaceholders($processedEmailBody, $placeholderData);
```

**⚠️ PROBLÉM:** Pokud `extractVariantFromEmailBody()` vrátí prázdný string, `replacePlaceholders()` ho nezmění.

---

## 🔧 2. IDENTIFIKOVANÉ PROBLÉMY

### Problém #1: `extractVariantFromEmailBody()` - Chybná Logika

**Lokace:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php:2469`

**Co je špatně:**
```php
if (!strpos($emailBody, $marker)) {
    return $emailBody;
}
```

**Proč je to špatně:**
- `strpos()` vrací `0` pokud je marker na pozici 0
- `!0` je `TRUE`, takže podmínka projde i když marker **EXISTUJE**
- Výsledek: Vrátí celý `emailBody` místo extrahování varianty

**Fix:**
```php
if (strpos($emailBody, $marker) === false) {
    return $emailBody;
}
```

### Problém #2: Chybějící Validace `templateId`

**Lokace:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php:2372`

**Co je špatně:**
```php
$recipients[] = array(
    'uzivatel_id' => $userId,
    'recipientRole' => $recipientRole,
    'sendEmail' => $sendEmailFinal,
    'sendInApp' => $sendInAppFinal,
    'templateId' => $node['data']['templateId'],  // ⚠️ Může být NULL!
    'templateVariant' => $variant
);
```

**Proč je to špatně:**
- Pokud `$node['data']['templateId']` je `NULL` nebo neexistuje, query v kroku 3 vrátí prázdný řádek
- Výsledek: `$template` je `false`, ale kód pokračuje a pošle prázdný email

**Fix:**
```php
$templateId = isset($node['data']['templateId']) ? $node['data']['templateId'] : null;

if (!$templateId) {
    error_log("         ❌ Template node has no templateId!");
    continue; // Přeskoč tento edge
}

$recipients[] = array(
    'uzivatel_id' => $userId,
    'recipientRole' => $recipientRole,
    'sendEmail' => $sendEmailFinal,
    'sendInApp' => $sendInAppFinal,
    'templateId' => $templateId,
    'templateVariant' => $variant
);
```

### Problém #3: `sendEmail: true` v Edge Configuration

**Lokace:** Databáze `25_hierarchie_profily.structure_json`

**Co je špatně:**
- Některé edges mají `data.sendEmail: true` i když uživatel nastavil "pouze in-app"
- Systém pak posílá emaily, i když by neměl

**Jak zkontrolovat:**
```sql
SELECT 
    hp.id,
    hp.nazev,
    edge_data.send_email,
    edge_data.recipient_role
FROM 25_hierarchie_profily hp,
JSON_TABLE(
    hp.structure_json,
    '$.edges[*]' COLUMNS(
        send_email BOOLEAN PATH '$.data.sendEmail'
    )
) AS edge_data
WHERE hp.aktivni = 1
  AND edge_data.send_email = 1;
```

**Fix:**
Buď:
1. **Frontend**: Ujistit se, že checkbox "Poslat email" je defaultně `false`
2. **Backend**: Přidat validaci, že `sendEmail` může být `true` pouze pokud template má `email_telo`
3. **Database**: Manuálně vypnout `sendEmail` u všech edges (viz SQL skript níže)

---

## 📋 3. DOPORUČENÉ ŘEŠENÍ

### Priorita 1: OKAMŽITĚ (Hotfixes)

#### ✅ **Fix 1: Opravit `extractVariantFromEmailBody()`**

```php
function extractVariantFromEmailBody($emailBody, $variant) {
    if (empty($emailBody)) {
        error_log("[extractVariantFromEmailBody] Empty emailBody provided");
        return '';
    }
    
    $marker = "<!-- RECIPIENT: $variant -->";
    
    // ✅ OPRAVENO: Správná kontrola
    if (strpos($emailBody, $marker) === false) {
        // Varianta nenalezena, vrátit celé body (fallback)
        error_log("[extractVariantFromEmailBody] Marker '$marker' not found, returning full body");
        return $emailBody;
    }
    
    // Najít začátek varianty
    $start = strpos($emailBody, $marker);
    $start = $start + strlen($marker);
    
    // Najít konec varianty (další marker nebo konec)
    $end = strpos($emailBody, '<!-- RECIPIENT:', $start);
    if ($end === false) {
        $end = strlen($emailBody);
    }
    
    $extracted = trim(substr($emailBody, $start, $end - $start));
    
    if (empty($extracted)) {
        error_log("[extractVariantFromEmailBody] WARNING: Extracted variant '$variant' is empty!");
    }
    
    return $extracted;
}
```

#### ✅ **Fix 2: Validace `templateId` v `findNotificationRecipients()`**

```php
// Řádek ~2372
$templateId = isset($node['data']['templateId']) ? $node['data']['templateId'] : null;

if (!$templateId) {
    error_log("         ❌ Template node '{$node['data']['name']}' has no templateId! Skipping edge.");
    continue;
}

// ... další kód

$recipients[] = array(
    'uzivatel_id' => $userId,
    'recipientRole' => $recipientRole,
    'sendEmail' => $sendEmailFinal,
    'sendInApp' => $sendInAppFinal,
    'templateId' => $templateId,
    'templateVariant' => $variant
);
```

#### ✅ **Fix 3: Validace template existence v `notificationRouter()`**

```php
// Řádek ~2110
$stmt = $db->prepare("
    SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " 
    WHERE id = :template_id AND aktivni = 1
");
$stmt->execute([':template_id' => $recipient['templateId']]);
$template = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$template) {
    error_log("   ❌ Template {$recipient['templateId']} not found or inactive");
    $result['errors'][] = "Template {$recipient['templateId']} not found";
    continue;
}

// ✅ NOVÉ: Zkontroluj, že template má email_telo pokud má poslat email
if ($recipient['sendEmail'] && empty($template['email_telo'])) {
    error_log("   ⚠️ Template {$recipient['templateId']} has no email_telo, disabling email");
    $recipient['sendEmail'] = false;
}
```

### Priorita 2: BRZY (Preventivní opatření)

#### **Frontend Validace (OrganizationHierarchy.js)**

Přidat validaci před uložením hierarchie:

```javascript
// Při ukládání profilu
const validateProfile = (structure) => {
  const errors = [];
  
  // Kontrola template nodes
  structure.nodes.forEach(node => {
    if (node.typ === 'template') {
      if (!node.data.templateId) {
        errors.push(`Template node "${node.data.name}" nemá přiřazené templateId`);
      }
      if (!node.data.eventTypes || node.data.eventTypes.length === 0) {
        errors.push(`Template node "${node.data.name}" nemá přiřazené event types`);
      }
    }
  });
  
  // Kontrola edges
  structure.edges.forEach(edge => {
    const sourceNode = structure.nodes.find(n => n.id === edge.source);
    if (sourceNode && sourceNode.typ === 'template') {
      if (edge.data.sendEmail) {
        const template = allNotificationTemplates.find(t => t.id === sourceNode.data.templateId);
        if (!template || !template.email_body) {
          errors.push(`Edge "${edge.id}" má zapnutý email, ale šablona nemá email_body`);
        }
      }
    }
  });
  
  return errors;
};

// Před saveProfileToDatabase()
const validationErrors = validateProfile(structure);
if (validationErrors.length > 0) {
  alert('Nelze uložit profil:\n' + validationErrors.join('\n'));
  return;
}
```

### Priorita 3: NICE-TO-HAVE (Dlouhodobé)

#### **Email Preview v Editor UI**

Přidat možnost náhledu emailu přímo v editoru:

```javascript
// V edge configuration panelu
<button onClick={() => previewEmail(selectedNode, selectedEdge)}>
  📧 Náhled emailu
</button>

const previewEmail = async (templateNode, edge) => {
  const template = allNotificationTemplates.find(t => t.id === templateNode.data.templateId);
  const variant = edge.data.recipientRole === 'EXCEPTIONAL' ? 'urgentVariant' : 'normalVariant';
  
  // Simuluj placeholder replacement
  const mockData = {
    order_number: 'O-1234/2025',
    creator_name: 'Jan Novák',
    // ...
  };
  
  // Zavolej backend API pro preview
  const result = await fetch('/api/notifications/preview-email', {
    method: 'POST',
    body: JSON.stringify({
      templateId: templateNode.data.templateId,
      variant: variant,
      placeholders: mockData
    })
  });
  
  // Zobraz HTML v modalu
  setEmailPreviewHTML(result.html);
};
```

---

## 🧪 4. TESTOVACÍ KROKY

### Krok 1: Spusť SQL diagnostiku

```bash
mysql -u erdms_user -p eeo2025 < ANALYSIS_EMPTY_EMAILS_DEBUG.sql > /tmp/email_debug_report.txt
```

Zkontroluj výstup:
- Query #3: Mají všechny template nodes `template_id`?
- Query #5: Které edges mají `send_email = 1`?
- Query #6: Mají šablony všechny HTML varianty?

### Krok 2: Zkontroluj error log

```bash
tail -100 /var/log/php/error.log | grep -E "extractVariant|sendNotificationEmail|BLOCKED"
```

Hledej:
- `❌ BLOCKED: Empty subject or body` - kolikrát se to stalo?
- `extractVariantFromEmailBody` - jsou tam WARNINGy?
- `Template X not found` - chybějící šablony?

### Krok 3: Testovací objednávka

1. Vytvoř testovací objednávku
2. Odešli ke schválení
3. Sleduj log:
   ```bash
   tail -f /var/log/php/error.log | grep -A5 -B5 "NotificationRouter"
   ```
4. Zkontroluj:
   - Načetly se placeholders z DB?
   - Našel se správný template?
   - Extrahovala se varianta?
   - Nahradily se placeholders?
   - Poslal se email? (mělo by být **❌ BLOCKED** pokud je prázdný)

### Krok 4: Kontrola v DB

```sql
-- Poslední notifikace
SELECT * FROM 25_notifikace 
WHERE dt_created > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY dt_created DESC LIMIT 5;

-- Zkontroluj:
-- - nadpis (měl by být vyplněný)
-- - zprava (měla by být vyplněná)
-- - data_json (měl by obsahovat placeholders)
```

---

## 📊 5. OČEKÁVANÉ VÝSLEDKY PO OPRAVĚ

### ✅ Po implementaci Fix #1, #2, #3:

1. **Žádné prázdné emaily** - ochrana `empty()` v `sendNotificationEmail()` zablokuje
2. **Error log upozornění** - každý problém bude zalogován
3. **Template validace** - pokud template nemá email_telo, email se nepošle
4. **Správná extrakce variant** - `strpos() === false` bude fungovat správně

### 📈 Metriky:

```sql
-- Kolik emailů bylo zablokováno?
SELECT COUNT(*) FROM audit_log 
WHERE message LIKE '%BLOCKED: Empty subject or body%'
  AND dt_created > DATE_SUB(NOW(), INTERVAL 1 DAY);

-- Kolik notifikací bylo odesláno?
SELECT COUNT(*) FROM 25_notifikace 
WHERE dt_created > DATE_SUB(NOW(), INTERVAL 1 DAY)
  AND odeslat_email = 1;
```

---

## 🎯 6. AKČNÍ PLÁN

| # | Úkol | Priorita | Čas | Zodpovědnost |
|---|------|----------|-----|--------------|
| 1 | Opravit `extractVariantFromEmailBody()` | 🔴 Kritická | 10 min | Backend Dev |
| 2 | Přidat validaci `templateId` | 🔴 Kritická | 15 min | Backend Dev |
| 3 | Přidat validaci `email_telo` | 🔴 Kritická | 10 min | Backend Dev |
| 4 | Spustit SQL diagnostiku | 🟡 Vysoká | 5 min | DevOps |
| 5 | Testovat s reálnou objednávkou | 🟡 Vysoká | 20 min | QA |
| 6 | Frontend validace | 🟢 Střední | 1 h | Frontend Dev |
| 7 | Email preview UI | ⚪ Nízká | 2-3 h | Frontend Dev |

**Celkový čas na kritické opravy:** ~35 minut  
**Testování:** ~30 minut  
**Total:** ~1 hodina

---

## 📞 ZÁVĚR

**Problém je identifikován a má řešení.**

Hlavní příčinou prázdných emailů je:
1. ✅ **Dočasně vyřešeno**: Ochrana proti prázdným emailům (přidáno dnes)
2. ❌ **Root cause**: Chybná logika v `extractVariantFromEmailBody()` (chybí `=== false`)
3. ❌ **Chybějící validace**: Template nodes mohou mít `NULL` templateId

**Doporučení:**
Implementovat **Fix #1, #2, #3** (celkem ~35 minut práce), spustit testy a sledovat logy.

Po opravách systém bude:
- ✅ Blokovat prázdné emaily
- ✅ Logovat všechny problémy
- ✅ Validovat template existence
- ✅ Správně extrahovat HTML varianty

---

**Připraveno k diskuzi: 18.12.2025 00:50**  
**GitHub Copilot & robex08**
