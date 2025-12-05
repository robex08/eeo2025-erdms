# Notification Templates - Placeholders (Zástupné znaky)

**Datum:** 2025-01-15  
**Zdroj:** DB tabulka `25_notification_templates`

---

## 📋 Přehled

Tato dokumentace popisuje **placeholdery (zástupné znaky)**, které se používají v notification templatech uložených v databázi. Backend musí tyto placeholdery nahradit skutečnými hodnotami při vytváření notifikace.

---

## 🗂️ Typy notifikací z DB

### 1. `order_approved` - Objednávka schválena

**DB záznam:**
```
id: 1
type: order_approved
name: Objednávka schválena
email_subject: Objednávka #{order_number} byla schválena
email_body: Vaše objednávka č. {order_number} s předmětem "{order_subject}" byla schválena...
app_title: Objednávka schválena
app_message: Objednávka č. {order_number} byla schválena
send_email_default: 1 (ANO)
priority_default: normal
active: 1
```

**Placeholdery:**
- `{order_number}` - Evidenční číslo objednávky (např. "2025-001")
- `{order_subject}` - Předmět objednávky
- `{order_id}` - DB ID objednávky (pro link)
- `{approver_name}` - Jméno schvalovatele (kdo schválil)
- `{approval_date}` - Datum schválení

**Příklad po nahrazení:**
```
app_title: "Objednávka schválena"
app_message: "Objednávka č. 2025-001 byla schválena"
```

**Komu poslat:**
- GARANT (garant_uzivatel_id)
- VLASTNÍK objednávky (objednatel_id / uzivatel_id)

---

### 2. `order_rejected` - Objednávka zamítnuta

**DB záznam:**
```
id: 2
type: order_rejected
name: Objednávka zamítnuta
email_subject: Objednávka #{order_number} byla zamítnuta
email_body: Vaše objednávka č. {order_number} s předmětem "{order_subject}" byla zamítnuta...
app_title: Objednávka zamítnuta
app_message: Objednávka č. {order_number} byla zamítnuta
send_email_default: 1 (ANO)
priority_default: high
active: 1
```

**Placeholdery:**
- `{order_number}` - Evidenční číslo objednávky
- `{order_subject}` - Předmět objednávky
- `{order_id}` - DB ID objednávky
- `{rejector_name}` - Jméno schvalovatele (kdo zamítl)
- `{rejection_reason}` - Důvod zamítnutí (komentář)
- `{rejection_date}` - Datum zamítnutí

**Příklad po nahrazení:**
```
app_title: "Objednávka zamítnuta"
app_message: "Objednávka č. 2025-001 byla zamítnuta - Důvod: Nedostatečné zdůvodnění"
```

**Komu poslat:**
- VLASTNÍK objednávky (objednatel_id)

---

### 3. `order_created` - Nová objednávka k schválení

**DB záznam:**
```
id: 3
type: order_created
name: Nová objednávka k schválení
email_subject: Nová objednávka #{order_number} čeká na schválení
email_body: Byla vytvořena nová objednávka č. {order_number} s předmětem "{order_subject}"...
app_title: Nová objednávka k schválení
app_message: Objednávka č. {order_number} čeká na schválení
send_email_default: 1 (ANO)
priority_default: normal
active: 1
```

**Placeholdery:**
- `{order_number}` - Evidenční číslo objednávky
- `{order_subject}` - Předmět objednávky
- `{order_id}` - DB ID objednávky
- `{creator_name}` - Jméno objednavatele (kdo vytvořil)
- `{creation_date}` - Datum vytvoření
- `{max_price}` - Maximální cena s DPH

**Příklad po nahrazení:**
```
app_title: "Nová objednávka k schválení"
app_message: "Objednávka č. 2025-001 čeká na schválení"
```

**Komu poslat:**
- GARANT (garant_uzivatel_id)
- PŘÍKAZCE operace (prikazce_id)

---

### 4. `system_maintenance` - Systémová údržba

**DB záznam:**
```
id: 4
type: system_maintenance
name: Systémová údržba
email_subject: Plánovaná údržba systému
email_body: Systém bude v údržbě od {maintenance_start} do {maintenance_end}...
app_title: Plánovaná údržba
app_message: Systém bude dočasně nedostupný kvůli údržbě
send_email_default: 0 (NE)
priority_default: normal
active: 1
```

**Placeholdery:**
- `{maintenance_start}` - Začátek údržby (datetime)
- `{maintenance_end}` - Konec údržby (datetime)
- `{maintenance_reason}` - Důvod údržby (optional)

**Příklad po nahrazení:**
```
app_title: "Plánovaná údržba"
app_message: "Systém bude dočasně nedostupný kvůli údržbě"
```

**Komu poslat:**
- VŠICHNI přihlášení uživatelé (broadcast)

---

### 5. `user_mention` - Zmínka v komentáři

**DB záznam:**
```
id: 5
type: user_mention
name: Zmínka v komentáři
email_subject: Byli jste zmíněni v komentáři
email_body: Uživatel {mention_author} vás zmínil v komentáři k objednávce...
app_title: Zmínka v komentáři
app_message: Byli jste zmíněni v komentáři
send_email_default: 0 (NE)
priority_default: low
active: 1
```

**Placeholdery:**
- `{mention_author}` - Jméno uživatele, který zmínil
- `{order_number}` - Číslo objednávky (kde byla zmínka)
- `{order_id}` - DB ID objednávky
- `{comment_text}` - Text komentáře (zkrácený)

**Příklad po nahrazení:**
```
app_title: "Zmínka v komentáři"
app_message: "Jan Novák vás zmínil v komentáři k objednávce 2025-001"
```

**Komu poslat:**
- Uživatel zmíněný pomocí @mention

---

### 6. `deadline_reminder` - Upozornění na termín

**DB záznam:**
```
id: 6
type: deadline_reminder
name: Upozornění na termín
email_subject: Blíží se termín objednávky #{order_number}
email_body: Objednávka č. {order_number} má termín dodání {deadline_date}...
app_title: Upozornění na termín
app_message: Blíží se termín dodání objednávky
send_email_default: 1 (ANO)
priority_default: high
active: 1
```

**Placeholdery:**
- `{order_number}` - Evidenční číslo objednávky
- `{order_id}` - DB ID objednávky
- `{deadline_date}` - Termín dodání
- `{days_remaining}` - Počet zbývajících dní

**Příklad po nahrazení:**
```
app_title: "Upozornění na termín"
app_message: "Blíží se termín dodání objednávky 2025-001 (zbývá 3 dny)"
```

**Komu poslat:**
- GARANT (garant_uzivatel_id)
- VLASTNÍK objednávky (objednatel_id)

---

## 🔧 Implementace na Backend

### Krok 1: Načíst template z DB

```php
$template = db_query("
  SELECT * FROM 25_notification_templates 
  WHERE type = ? AND active = 1
", [$notificationType]);
```

### Krok 2: Připravit placeholders array

```php
$placeholders = [
  '{order_number}' => $order['cislo_objednavky'],
  '{order_subject}' => $order['predmet'],
  '{order_id}' => $order['id'],
  '{approver_name}' => $approver['displayName'],
  '{approval_date}' => date('d.m.Y H:i', strtotime($order['dt_schvaleni']))
];
```

### Krok 3: Nahradit placeholders

```php
$title = str_replace(
  array_keys($placeholders), 
  array_values($placeholders), 
  $template['app_title']
);

$message = str_replace(
  array_keys($placeholders), 
  array_values($placeholders), 
  $template['app_message']
);
```

### Krok 4: Uložit notifikaci do DB

```php
db_insert('25_notifications', [
  'user_id' => $recipientUserId,
  'type' => $template['type'],
  'priority' => $template['priority_default'],
  'category' => 'orders', // nebo podle typu
  'title' => $title,
  'message' => $message,
  'data_json' => json_encode([
    'order_id' => $order['id'],
    'order_number' => $order['cislo_objednavky']
  ]),
  'is_read' => 0,
  'is_dismissed' => 0,
  'created_at' => date('Y-m-d H:i:s')
]);
```

### Krok 5: Poslat email (pokud send_email_default = 1)

```php
if ($template['send_email_default'] == 1) {
  $emailSubject = str_replace(
    array_keys($placeholders), 
    array_values($placeholders), 
    $template['email_subject']
  );
  
  $emailBody = str_replace(
    array_keys($placeholders), 
    array_values($placeholders), 
    $template['email_body']
  );
  
  sendEmail($recipientEmail, $emailSubject, $emailBody);
}
```

---

## 📊 Kompletní seznam placeholders

| Placeholder | Typ | Popis | Příklad hodnoty |
|-------------|-----|-------|-----------------|
| `{order_number}` | string | Evidenční číslo objednávky | "2025-001" |
| `{order_subject}` | string | Předmět objednávky | "Nákup kancelářských potřeb" |
| `{order_id}` | int | DB ID objednávky | 5678 |
| `{creator_name}` | string | Jméno objednavatele | "Jan Novák" |
| `{approver_name}` | string | Jméno schvalovatele | "Pavel Svoboda" |
| `{rejector_name}` | string | Jméno toho, kdo zamítl | "Pavel Svoboda" |
| `{creation_date}` | datetime | Datum vytvoření | "15.01.2025 10:30" |
| `{approval_date}` | datetime | Datum schválení | "15.01.2025 14:30" |
| `{rejection_date}` | datetime | Datum zamítnutí | "15.01.2025 14:30" |
| `{rejection_reason}` | string | Důvod zamítnutí | "Nedostatečné zdůvodnění" |
| `{max_price}` | decimal | Max. cena s DPH | "15 000 Kč" |
| `{maintenance_start}` | datetime | Začátek údržby | "20.01.2025 22:00" |
| `{maintenance_end}` | datetime | Konec údržby | "21.01.2025 02:00" |
| `{maintenance_reason}` | string | Důvod údržby | "Aktualizace databáze" |
| `{mention_author}` | string | Autor zmínky | "Jan Novák" |
| `{comment_text}` | string | Text komentáře | "Prosím schválit..." |
| `{deadline_date}` | date | Termín dodání | "31.01.2025" |
| `{days_remaining}` | int | Zbývající dny | 3 |

---

## 🎨 Priorita a barvy (Frontend)

Frontend automaticky přiřazuje barvy podle priority:

| Priority | Border Color | Badge Color | Použití |
|----------|--------------|-------------|---------|
| `urgent` | Red (#dc2626) | Red | Kritické (zamítnutí) |
| `high` | Orange (#ea580c) | Orange | Důležité (termíny) |
| `normal` | Gray (#6b7280) | Gray | Běžné (nová, schválená) |
| `low` | Light gray (#d1d5db) | Light gray | Informativní (zmínky) |

---

## 🔗 data_json struktura

Pro notifikace typu **orders** musí `data_json` obsahovat:

```json
{
  "order_id": 5678,
  "order_number": "2025-001",
  "order_subject": "Nákup kancelářských potřeb",
  "max_price": 15000,
  "creator_name": "Jan Novák",
  "approver_name": "Pavel Svoboda"
}
```

Frontend používá `order_id` pro navigaci na detail objednávky:
```javascript
navigate(`/order-form-25?id=${data.order_id}&mode=view`)
```

---

## ✅ Checklist pro Backend implementaci

- [ ] Načíst template z DB podle `type`
- [ ] Připravit array s placeholders z dat objednávky
- [ ] Nahradit placeholders v `app_title` a `app_message`
- [ ] Určit příjemce (GARANT, PŘÍKAZCE, OBJEDNATEL)
- [ ] Uložit notifikaci do DB tabulky `25_notifications`
- [ ] Vyplnit `data_json` s order_id a dalšími daty
- [ ] Pokud `send_email_default = 1`, poslat email
- [ ] Nahradit placeholders i v `email_subject` a `email_body`
- [ ] Otestovat všechny typy notifikací

---

## 📧 Kontakt

**Frontend:** Implementováno v `src/services/notificationsApi.js` a `src/components/NotificationBell.js`  
**Backend:** Čeká na implementaci podle této dokumentace  
**Datum:** 2025-01-15
