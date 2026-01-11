# HTML Info Šablony pro INVOICE notifikace

**Datum kontroly:** 11. ledna 2026  
**Databáze:** eeo2025-dev  
**Tabulka:** `25_notifikace_sablony`

---

## ✅ Výsledek: Šablony EXISTUJÍ

HTML šablony pro notifikace o věcné správnosti faktur **již jsou v databázi** a jsou **plně funkční**.

---

## 📋 Detail šablon

### 1️⃣ INVOICE_MATERIAL_CHECK_REQUESTED (ID 115)

**Název:** Věcná správnost faktury vyžadována  
**Kdy se použije:** Když je faktura přiřazena k objednávce a vyžaduje kontrolu věcné správnosti

#### Email:
- **Předmět:** `🔍 Vyžadována kontrola věcné správnosti faktury {{invoice_number}}`
- **HTML tělo:**
  ```html
  <h2>Vyžadována kontrola věcné správnosti</h2>
  <p>Je třeba provést kontrolu věcné správnosti faktury.</p>
  <p>
    <strong>Číslo faktury:</strong> {{invoice_number}}<br>
    <strong>Dodavatel:</strong> {{supplier_name}}<br>
    <strong>Částka:</strong> {{amount}} Kč
  </p>
  <p>Prosím ověřte, zda faktura odpovídá objednanému zboží/službám.</p>
  ```

#### In-App (Push notifikace):
- **Nadpis:** `🔍 Kontrola faktury {{invoice_number}}`
- **Zpráva:** `Vyžadována kontrola věcné správnosti faktury č. {{invoice_number}} ({{amount}} Kč)`
- **Priorita:** `normal`

---

### 2️⃣ INVOICE_MATERIAL_CHECK_APPROVED (ID 117)

**Název:** Věcná správnost faktury potvrzena  
**Kdy se použije:** Když je věcná správnost faktury potvrzena uživatelem

#### Email:
- **Předmět:** `✅ Věcná správnost faktury {{invoice_number}} potvrzena`
- **HTML tělo:**
  ```html
  <h2>Věcná správnost potvrzena</h2>
  <p>Věcná správnost faktury byla ověřena a potvrzena.</p>
  <p>
    <strong>Číslo faktury:</strong> {{invoice_number}}<br>
    <strong>Dodavatel:</strong> {{supplier_name}}<br>
    <strong>Částka:</strong> {{amount}} Kč<br>
    <strong>Potvrdil:</strong> {{approved_by}}
  </p>
  <p>Faktura může pokračovat ke zpracování.</p>
  ```

#### In-App (Push notifikace):
- **Nadpis:** `✅ Faktura {{invoice_number}} ověřena`
- **Zpráva:** `Věcná správnost faktury č. {{invoice_number}} byla potvrzena`
- **Priorita:** `normal`

---

## 🔖 Placeholdery (proměnné v šablonách)

Šablony očekávají následující placeholdery, které se automaticky nahradí:

| Placeholder | Popis | Příklad |
|-------------|-------|---------|
| `{{invoice_number}}` | Číslo faktury | `FA-2026-001` |
| `{{supplier_name}}` | Název dodavatele | `ACME s.r.o.` |
| `{{amount}}` | Částka faktury | `12 500,50` |
| `{{approved_by}}` | Jméno potvrzujícího | `Jan Novák` |
| `{{order_id}}` | ID objednávky | `12345` |
| `{{order_number}}` | Číslo objednávky | `OBJ-2026-042` |

**Poznámka:** Placeholdery jsou case-sensitive! Používejte lowercase s podtržítky.

---

## 🔄 Jak se šablony používají

### Backend (PHP)

```php
// V notificationHandlers.php
function getNotificationTemplate($db, $typ) {
    $sql = "SELECT * FROM 25_notifikace_sablony WHERE LOWER(typ) = LOWER(:typ) AND aktivni = 1";
    $stmt = $db->prepare($sql);
    $stmt->execute(array(':typ' => $typ));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Použití
$template = getNotificationTemplate($db, 'INVOICE_MATERIAL_CHECK_REQUESTED');
$app_nadpis = $template['app_nadpis'];
$app_zprava = $template['app_zprava'];
$email_predmet = $template['email_predmet'];
$email_telo = $template['email_telo'];

// Nahrazení placeholderů
$app_zprava = replacePlaceholders($app_zprava, [
    'invoice_number' => 'FA-2026-001',
    'amount' => '12500.50',
    'supplier_name' => 'ACME s.r.o.'
]);
```

### Frontend (JavaScript)

```javascript
// V OrderForm25.js
await triggerNotification(
  'INVOICE_MATERIAL_CHECK_REQUESTED',
  faktura.id,
  user_id,
  {
    invoice_number: faktura.fa_cislo_vema,
    amount: faktura.fa_castka,
    supplier_name: faktura.dodavatel_nazev,
    order_id: formData.id,
    order_number: formData.cislo_objednavky
  }
);
```

**Backend automaticky:**
1. Načte šablonu z `25_notifikace_sablony`
2. Nahradí placeholdery hodnotami
3. Vytvoří notifikaci v `25_notifikace`
4. Rozešle podle kanálů (in-app, email, SMS)

---

## 🔧 Úprava šablon

### SQL UPDATE

```sql
-- Změna textu zprávy
UPDATE 25_notifikace_sablony 
SET app_zprava = 'Nový text s {{invoice_number}}'
WHERE typ = 'INVOICE_MATERIAL_CHECK_REQUESTED';

-- Změna email HTML těla
UPDATE 25_notifikace_sablony 
SET email_telo = '<h2>Nový nadpis</h2><p>Nový obsah {{invoice_number}}</p>'
WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED';

-- Změna priority
UPDATE 25_notifikace_sablony 
SET priorita_vychozi = 'high'
WHERE typ = 'INVOICE_MATERIAL_CHECK_REQUESTED';
```

### Přes Admin Panel

1. Otevřít Admin → Nastavení → Notifikační šablony
2. Najít šablonu podle typu (`INVOICE_MATERIAL_CHECK_*`)
3. Upravit text nebo HTML
4. Uložit změny

---

## 📊 Struktura tabulky 25_notifikace_sablony

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | INT(11) | Primární klíč |
| `typ` | VARCHAR(100) | Unikátní kód šablony (např. `INVOICE_MATERIAL_CHECK_REQUESTED`) |
| `nazev` | VARCHAR(255) | Popisný název šablony |
| `email_predmet` | VARCHAR(500) | Předmět emailu (s placeholdery) |
| `email_telo` | TEXT | HTML tělo emailu (s placeholdery) |
| `email_vychozi` | TINYINT(1) | Posílat email defaultně? (0/1) |
| `app_nadpis` | VARCHAR(255) | Nadpis in-app notifikace |
| `app_zprava` | MEDIUMTEXT | Text in-app notifikace |
| `priorita_vychozi` | ENUM | `low`, `normal`, `high`, `urgent` |
| `aktivni` | TINYINT(1) | Je šablona aktivní? (0/1) |
| `dt_created` | DATETIME | Datum vytvoření |
| `dt_updated` | DATETIME | Datum poslední úpravy |

---

## 🔗 Související soubory

- **Backend handler:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`
  - Funkce: `getNotificationTemplate()`, `replacePlaceholders()`
  
- **Frontend trigger:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`
  - Řádek ~8801: Trigger `INVOICE_MATERIAL_CHECK_REQUESTED`
  - Řádek ~24131: Trigger `INVOICE_MATERIAL_CHECK_APPROVED`

- **Databázové tabulky:**
  - `25_notifikace_sablony` - šablony
  - `25_notifikace_typy_udalosti` - definice událostí
  - `25_notifikace` - instance notifikací
  - `25_notifikace_precteni` - stav přečtení

---

## 🎨 Příklad finální notifikace

### In-App notifikace (REQUESTED)

```
┌─────────────────────────────────────────────────┐
│ 🔍 Kontrola faktury FA-2026-001                 │
│                                                  │
│ Vyžadována kontrola věcné správnosti faktury    │
│ č. FA-2026-001 (12 500,50 Kč)                   │
│                                                  │
│ 🕐 Před 5 minutami                               │
│ 👤 Jan Novák (účetní)                           │
└─────────────────────────────────────────────────┘
```

### Email (APPROVED)

```
Od: ERDMS Notifikace <no-reply@erdms.cz>
Komu: garant@example.com
Předmět: ✅ Věcná správnost faktury FA-2026-001 potvrzena

┌──────────────────────────────────────────────────┐
│                                                   │
│  ✅ Věcná správnost potvrzena                    │
│                                                   │
│  Věcná správnost faktury byla ověřena            │
│  a potvrzena.                                     │
│                                                   │
│  Číslo faktury: FA-2026-001                      │
│  Dodavatel: ACME s.r.o.                          │
│  Částka: 12 500,50 Kč                            │
│  Potvrdil: Jan Novák                             │
│                                                   │
│  Faktura může pokračovat ke zpracování.          │
│                                                   │
│  [Zobrazit fakturu] [Zobrazit objednávku]       │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## ✅ Závěr

HTML info šablony pro notifikace o věcné správnosti faktur **JSOU KOMPLETNÍ** a **PŘIPRAVENÉ K POUŽITÍ**.

**Žádná další akce není potřeba** - šablony jsou již v databázi a automaticky se používají při triggerování notifikací.

---

**Konec dokumentace**
