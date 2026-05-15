# TODO: BE implementace uživatelských notifikačních preferencí

> **Vytvořeno:** 2026-03-23  
> **Stav:** FE hotové (vizuální náhled), BE zatím neimplementováno  
> **Soubor FE:** `client/src/pages/ProfilePage.js` — sekce 2 (Notifikace)  
> **Princip:** Uživatelské preference mohou pouze OMEZIT notifikace, nikdy PŘIDAT nové beyond org hierarchie.

---

## 📋 Co je hotové (FE)

- [x] Granulární UI matice: per event type × kanál (email / in-app)
- [x] 3 kategorie: Objednávky (11 typů), Faktury (6 typů), Pokladna (2 typů)
- [x] Toggle all per kategorie + indeterminate stav
- [x] Hlavní přepínače email/in-app deaktivují podřízené checkboxy
- [x] Data se ukládají do `25_uzivatel_nastaveni.nastaveni_data` JSON → klíč `notifikace.workflow_detaily`
- [x] Deep merge s defaults (nové event types = automaticky zapnuté)
- [x] Info banner "zatím pouze vizuální náhled"

---

## 🔴 Co zbývá implementovat (BE)

### 1. Čtení preferencí v `notificationRouter()`

**Soubor:** `api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`  
**Funkce:** `notificationRouter()` (cca řádek 2811)

**Úkol:**  
Po určení příjemců (z org hierarchie) a před odesláním notifikace:
1. Načíst `nastaveni_data` z `25_uzivatel_nastaveni` pro každého příjemce
2. Zkontrolovat `notifikace.workflow_detaily.{EVENT_TYPE}.{email|inapp}`
3. Pokud je `false` → odfiltrovat příjemce z daného kanálu
4. Pokud klíč neexistuje nebo je `true` → ponechat (backward compatible)

```php
// Pseudokód:
function shouldSendNotification($userId, $eventType, $channel) {
    $settings = nactiUzivatelNastaveni($userId, $db);
    if (!$settings) return true; // Žádné nastavení = vše povoleno
    
    $notif = $settings['notifikace'] ?? [];
    
    // Hlavní přepínač kanálu
    if ($channel === 'email' && ($notif['email_povoleny'] ?? true) === false) return false;
    if ($channel === 'inapp' && ($notif['inapp_povoleny'] ?? true) === false) return false;
    
    // Granulární per event type
    $detail = $notif['workflow_detaily'][$eventType] ?? null;
    if ($detail === null) return true; // Neexistuje = povoleno
    
    return ($detail[$channel] ?? true) !== false;
}
```

### 2. Opravit BUG v `handle_notifications_user_preferences_update()`

**Soubor:** `notificationHandlers.php` cca řádek 4288  
**BUG:** Funkce PŘEPISUJE celý `nastaveni_data` JSON pouze notifikačními preferencemi!  
**Fix:** Musí MERGOVAT do existujícího JSON, ne přepsat.

```php
// Aktuální (ŠPATNĚ):
$stmt->execute([$jsonData, $userId]); // přepíše celý nastaveni_data

// Oprava (SPRÁVNĚ):
$existing = nactiUzivatelNastaveni($userId, $db);
$existing['notifikace'] = $newNotifPrefs;
$merged = json_encode($existing);
$stmt->execute([$merged, $userId]);
```

### 3. Cache / Performance

Při velkém počtu příjemců (např. objednávka se schvaluje a jde notifikace 10+ lidem):
- Batch načtení nastavení jedním SQL dotazem (`WHERE uzivatel_id IN (...)`)
- Nevolat `nactiUzivatelNastaveni()` per příjemce

### 4. Odstranit info banner z FE

Po nasazení BE implementace odebrat z `ProfilePage.js` žlutý banner "Tato sekce je zatím pouze vizuální náhled".

---

## 📊 Struktura dat v JSON (reference)

```json
{
  "notifikace": {
    "povoleny": true,
    "email_povoleny": true,
    "inapp_povoleny": true,
    "kategorie": {
      "objednavky": true,
      "faktury": true,
      "smlouvy": true,
      "pokladna": true
    },
    "workflow_detaily": {
      "ORDER_PENDING_APPROVAL": { "email": true, "inapp": true },
      "ORDER_APPROVED": { "email": true, "inapp": false },
      "ORDER_CANCELLED": { "email": true, "inapp": true },
      "INVOICE_MATERIAL_CHECK_REQUESTED": { "email": false, "inapp": true },
      "CASHBOOK_MONTH_CLOSED": { "email": true, "inapp": true }
    }
  }
}
```

**Pravidla:**
- Chybějící klíč = `true` (backward compatible)
- `false` = uživatel si explicitně vypnul
- Hlavní `email_povoleny`/`inapp_povoleny` = master kill switch

---

## 📍 Auditované event types (2026-03-23)

### Objednávky (triggeruje OrderForm25.js → FE fetch)
| Event Type | Popis |
|---|---|
| `ORDER_PENDING_APPROVAL` | Ke schválení |
| `ORDER_APPROVED` | Schválena |
| `ORDER_REJECTED` | Zamítnuta |
| `ORDER_AWAITING_CHANGES` | Vrácena k doplnění |
| `ORDER_SENT_TO_SUPPLIER` | Odeslána dodavateli |
| `ORDER_CONFIRMED_BY_SUPPLIER` | Potvrzena dodavatelem |
| `ORDER_REGISTRY_PENDING` | K uveřejnění v registru |
| `ORDER_REGISTRY_PUBLISHED` | Uveřejněna v registru |
| `ORDER_COMPLETED` | Dokončena |
| `ORDER_CANCELLED` | Zrušena |
| `ORDER_COMMENT_ADDED` | Nový komentář |

### Faktury (triggeruje invoiceHandlers.php → BE)
| Event Type | Popis |
|---|---|
| `INVOICE_UPDATED` | Upravena |
| `INVOICE_SUBMITTED` | Předána ke kontrole |
| `INVOICE_RETURNED` | Vrácena |
| `INVOICE_REGISTRY_PUBLISHED` | Uveřejněna v registru |
| `INVOICE_MATERIAL_CHECK_REQUESTED` | Kontrola věcné správnosti |
| `INVOICE_MATERIAL_CHECK_APPROVED` | Věcná správnost OK |

### Pokladna (triggeruje CashbookService.php → BE)
| Event Type | Popis |
|---|---|
| `CASHBOOK_MONTH_CLOSED` | Měsíc uzavřen |
| `CASHBOOK_MONTH_LOCKED` | Měsíc zamknut |

### Neimplementované (budoucí — vyžadují cron/scheduler)
| Event Type | Popis | Prerekvizita |
|---|---|---|
| `INVOICE_DUE_SOON` | Blížící se splatnost | Cron job |
| `INVOICE_OVERDUE` | Po splatnosti | Cron job |
| `CONTRACT_EXPIRING` | Smlouva před vypršením | Cron job |
| `CASHBOOK_LOW_BALANCE` | Nízký zůstatek | Cron job + definice limitu |

---

## 🔍 Jak se na toto odkazovat v budoucnu

V chatu s Copilotem řekni:

> *"Chci implementovat BE notifikační preference — podívej se na `TODO_NOTIFIKACE_BE_IMPLEMENTACE.md` v rootu eeo-v2/ a pokračuj podle plánu."*

Nebo konkrétněji:

> *"Implementuj bod 1 z `TODO_NOTIFIKACE_BE_IMPLEMENTACE.md` — čtení preferencí v notificationRouter."*

> *"Oprav bug z bodu 2 v TODO_NOTIFIKACE_BE_IMPLEMENTACE.md — handle_notifications_user_preferences_update přepisuje celý JSON."*
