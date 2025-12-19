# Notification Templates - Placeholders Reference

## Overview

Tato dokumentace obsahuje úplný seznam všech placeholderů (proměnných) použitých v notifikačních šablonách systému EEO.

## Formát placeholderů

Placeholdery v šablonách jsou označeny složenými závorkami:
```
{placeholder_name}
```

Před odesláním emailu nebo zobrazením in-app notifikace jsou tyto placeholdery nahrazeny skutečnými hodnotami z databáze.

---

## Fáze 1 - Základní schvalovací workflow

### Šablona: `order_status_schvalena` (Objednávka schválena)

#### Varianty
- **RECIPIENT**: Email pro tvůrce objednávky
- **SUBMITTER**: Email pro schvalovatele

#### Placeholdery

| Placeholder | Typ | Popis | Příklad hodnoty |
|-------------|-----|-------|-----------------|
| `{order_number}` | string | Číslo objednávky | `OBJ-2025-00123` |
| `{order_id}` | integer | ID objednávky v databázi | `456` |
| `{predmet}` | string | Předmět objednávky | `Kancelářský materiál - tonery` |
| `{strediska}` | string | Seznam středisek (comma-separated) | `ZZS MSK - Ostrava, ZZS MSK - Opava` |
| `{financovani}` | string | Zdroj financování | `Rozpočet provozní - kapitola 5` |
| `{financovani_poznamka}` | string | Poznámka ke financování | `Standardní provozní náklady` |
| `{amount}` | string | Celková cena s DPH (formatted) | `15 840 Kč` |
| `{creator_name}` | string | Jméno tvůrce objednávky | `Jan Novák` |
| `{approver_name}` | string | Jméno schvalovatele | `Ing. Marie Svobodová` |
| `{approval_date}` | datetime | Datum a čas schválení | `15. 12. 2025 14:15` |

---

### Šablona: `order_status_zamitnuta` (Objednávka zamítnuta)

#### Varianty
- **RECIPIENT**: Email pro tvůrce objednávky
- **SUBMITTER**: Email pro zamítajícího uživatele

#### Placeholdery

| Placeholder | Typ | Popis | Příklad hodnoty |
|-------------|-----|-------|-----------------|
| `{order_number}` | string | Číslo objednávky | `OBJ-2025-00123` |
| `{order_id}` | integer | ID objednávky v databázi | `456` |
| `{predmet}` | string | Předmět objednávky | `Kancelářský materiál - tonery` |
| `{strediska}` | string | Seznam středisek | `ZZS MSK - Ostrava` |
| `{amount}` | string | Celková cena s DPH | `15 840 Kč` |
| `{creator_name}` | string | Jméno tvůrce objednávky | `Jan Novák` |
| `{approver_name}` | string | Jméno uživatele, který zamítl | `Ing. Marie Svobodová` |
| `{rejection_date}` | datetime | Datum a čas zamítnutí | `15. 12. 2025 14:15` |
| `{rejection_comment}` | text | **Důvod zamítnutí** (důležité!) | `Neúplná specifikace zboží` |

**⚠️ Důležité**: `{rejection_comment}` je klíčový placeholder - musí obsahovat jasný a srozumitelný důvod zamítnutí pro tvůrce objednávky.

---

### Šablona: `order_status_ceka_se` (Objednávka vrácena k doplnění)

#### Varianty
- **RECIPIENT**: Email pro tvůrce objednávky
- **SUBMITTER**: Email pro uživatele, který vrátil

#### Placeholdery

| Placeholder | Typ | Popis | Příklad hodnoty |
|-------------|-----|-------|-----------------|
| `{order_number}` | string | Číslo objednávky | `OBJ-2025-00123` |
| `{order_id}` | integer | ID objednávky v databázi | `456` |
| `{predmet}` | string | Předmět objednávky | `Kancelářský materiál - tonery` |
| `{strediska}` | string | Seznam středisek | `ZZS MSK - Ostrava` |
| `{amount}` | string | Celková cena s DPH | `15 840 Kč` |
| `{creator_name}` | string | Jméno tvůrce objednávky | `Jan Novák` |
| `{approver_name}` | string | Jméno uživatele, který vrátil | `Ing. Marie Svobodová` |
| `{revision_date}` | datetime | Datum a čas vrácení | `15. 12. 2025 14:15` |
| `{revision_comment}` | text | **Co je třeba doplnit** (kritické!) | `Prosím doplňte katalogová čísla` |

**⚠️ Důležité**: `{revision_comment}` musí jasně specifikovat, co má tvůrce doplnit nebo upravit v objednávce.

---

## Budoucí šablony (Fáze 2-4)

### Fáze 2 - Komunikace s dodavatelem

#### `order_status_odeslana` (Odeslána dodavateli)
- `{supplier_name}` - Název dodavatele
- `{supplier_email}` - Email dodavatele
- `{sender_name}` - Jméno odesílatele
- `{send_date}` - Datum odeslání

#### `order_status_potvrzena` (Potvrzena dodavatelem)
- `{delivery_date}` - Potvrzený termín dodání
- `{confirmation_date}` - Datum potvrzení
- `{recorder_name}` - Kdo zaznamenal potvrzení

### Fáze 3 - Fakturace

#### `order_status_faktura_schvalena` (Faktura schválena)
- `{invoice_number}` - Číslo faktury
- `{invoice_id}` - ID faktury v DB
- `{amount_without_dph}` - Částka bez DPH

### Fáze 4 - Věcná správnost

#### `order_status_kontrola_potvrzena` / `order_status_kontrola_zamitnuta`
- `{inspector_name}` - Jméno kontrolora
- `{inspection_date}` - Datum kontroly
- `{inspection_note}` - Poznámka ke kontrole
- `{rejection_reason}` - Důvod zamítnutí (jen pro zamitnuta)

---

## Technická implementace

### Backend - PHP

Placeholder replacement se provádí v souboru:
```
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php
```

Funkce pro nahrazení:
```php
function replacePlaceholders($template_html, $order_data, $user_data) {
    $placeholders = [
        '{order_number}' => $order_data['cislo_objednavky'],
        '{order_id}' => $order_data['id'],
        '{predmet}' => $order_data['predmet'],
        // ... další mappings
    ];
    
    return str_replace(array_keys($placeholders), array_values($placeholders), $template_html);
}
```

### Recipient Selection

Šablony obsahují více variant pro různé příjemce. Backend musí vybrat správnou variantu:

```php
function getEmailTemplateByRecipient($template_html, $recipient_type) {
    // Extrakce správné varianty podle <!-- RECIPIENT: TYPE --> markeru
    // Typy: RECIPIENT (příjemce akce), SUBMITTER (autor akce)
}
```

### Database Storage

Šablony jsou uloženy v tabulce `25_notification_templates`:
- `type` (varchar): Unikátní identifikátor šablony (např. `order_status_schvalena`)
- `email_body` (text): Kompletní HTML obsahující všechny varianty
- `email_subject` (varchar): Subject line s placeholdery
- `app_title` (varchar): Titulek pro in-app notifikace
- `app_message` (mediumtext): Text pro in-app notifikace

---

## Best Practices

### 1. Fallback hodnoty
Vždy poskytněte fallback, pokud placeholder hodnota chybí:
```php
$predmet = $order_data['predmet'] ?? '(Předmět není uveden)';
```

### 2. Escapování HTML
Při vkládání do HTML šablon vždy escapujte:
```php
$predmet_safe = htmlspecialchars($order_data['predmet'], ENT_QUOTES, 'UTF-8');
```

### 3. Formátování dat
- **Datum**: `d. m. Y H:i` formát (15. 12. 2025 14:15)
- **Částky**: Vždy s měnou, tisíce oddělené mezerou (15 840 Kč)
- **Jména**: Plné jméno včetně titulů (Ing. Marie Svobodová)

### 4. Multi-line text
Placeholdery jako `{rejection_comment}` mohou obsahovat více řádků.
V HTML použijte `white-space: pre-wrap;` pro zachování zalomení.

### 5. Testování
Před nasazením vždy otestujte s:
- Prázdnými hodnotami
- Velmi dlouhými texty
- Speciálními znaky (čárky, uvozovky, HTML entity)
- Různými email klienty (Gmail, Outlook, Apple Mail)

---

## Příklady použití

### Příklad 1: Schválení objednávky

**Input data:**
```php
$data = [
    'order_number' => 'OBJ-2025-00123',
    'order_id' => 456,
    'creator_name' => 'Jan Novák',
    'approver_name' => 'Ing. Marie Svobodová',
    'approval_date' => '15. 12. 2025 14:15',
    'predmet' => 'Nákup kancelářského materiálu',
    'amount' => '15 840 Kč'
];
```

**Subject po nahrazení:**
```
✅ Objednávka OBJ-2025-00123 byla schválena
```

**HTML excerpt po nahrazení:**
```html
<p>Dobrý den <strong>Jan Novák</strong>,</p>
<p>vaše objednávka byla <strong>úspěšně schválena</strong> 
   uživatelem <strong>Ing. Marie Svobodová</strong>.</p>
```

### Příklad 2: Zamítnutí s víceřádkovým komentářem

**Input data:**
```php
$data = [
    'rejection_comment' => "Objednávka neobsahuje kompletní specifikaci.\n\nProsím doplňte:\n1. Katalogová čísla\n2. Počty kusů"
];
```

**HTML s pre-wrap:**
```html
<p style="white-space: pre-wrap;">{rejection_comment}</p>
```

**Výsledek:**
```
Objednávka neobsahuje kompletní specifikaci.

Prosím doplňte:
1. Katalogová čísla
2. Počty kusů
```

---

## Maintenance & Updates

### Přidání nového placeholderu

1. **Aktualizovat HTML šablonu** - přidat `{new_placeholder}` na správné místo
2. **Aktualizovat mapping v PHP** - přidat do `replacePlaceholders()` funkce
3. **Aktualizovat tuto dokumentaci** - přidat do tabulky placeholderů
4. **Otestovat** - použít test skript s novým placeholder

### Kontrolní checklist před deploy

- [ ] Všechny placeholdery mají mapping v PHP
- [ ] Fallback hodnoty jsou definované
- [ ] HTML escapování je aplikované
- [ ] Testováno se všemi variantami (RECIPIENT, SUBMITTER)
- [ ] Testováno v email klientech (Gmail, Outlook)
- [ ] Dokumentace aktualizována
- [ ] SQL update skripty připraveny
- [ ] Backup databáze proveden

---

## Contact & Support

Pro otázky ohledně notifikačních šablon kontaktujte:
- **Dev team**: Robex
- **Documentation**: /var/www/erdms-dev/NOTIFICATION_TEMPLATES_EXPANSION_PLAN.md
- **Test scripts**: /var/www/erdms-dev/preview-notification-templates-phase1.php
