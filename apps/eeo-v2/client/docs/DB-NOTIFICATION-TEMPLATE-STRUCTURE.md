# Notification Template Database Structure

## Podle obrázku z UI

### Struktura tabulky notification_template

| Pole | Typ | Nullable | Hodnota | Popis |
|------|-----|----------|---------|-------|
| **id** | int(11) unsigned | NO | AUTO_INCREMENT | Primární klíč |
| **type** | varchar(64) | NO | `order_unlock_forced` | **Unikátní kód typu** notifikace |
| **name** | varchar(128) | NO | `Objednávka násilně odemčena` | Popisný název |
| **email_subject** | varchar(255) | YES | `Objednávka #{order_number} byla převzata...` | Subject emailu |
| **email_body** | text | YES | `Vaše objednávka č. {order_number}...` | Tělo emailu |
| **app_title** | varchar(255) | YES | `Objednávka převzata jiným uživatelem` | Titulek v aplikaci |
| **app_message** | text | YES | `Vaše objednávka č. {order_number}...` | Zpráva v aplikaci |
| **send_email_default** | tinyint(1) | NO | `1` | Výchozí: poslat email |
| **priority_default** | enum | NO | `high` | Priorita: `normal`, `high` |
| **active** | tinyint(1) | NO | `1` | Aktivní/neaktivní |
| **dt_created** | datetime | NO | `2025-10-15 23:05:25` | Čas vytvoření |
| **dt_updated** | datetime | YES | NULL nebo NOW() | Čas poslední změny |

## Klíčové poznatky

### 1. Pole `type` je klíčové
- Používá se v kódu pro identifikaci typu notifikace
- Musí být **unikátní**
- Doporučený formát: `snake_case` např. `order_unlock_forced`
- **Neměnit po nasazení** - kód na něj referuje

### 2. Placeholders v textech
Všechny textové pole (email_subject, email_body, app_title, app_message) podporují placeholders:

**Příklad:**
```
Vaše objednávka č. {order_number} byla převzata uživatelem {unlocker_name}
```

**Backend je nahradí skutečnými hodnotami:**
```
Vaše objednávka č. 2025/123 byla převzata uživatelem Jan Novák
```

### 3. Enum hodnoty pro priority_default
- `normal` - běžná priorita
- `high` - vysoká priorita (pro důležité notifikace)

## SQL pro vložení nové šablony

```sql
INSERT INTO notification_template (
  type,
  name,
  email_subject,
  email_body,
  app_title,
  app_message,
  send_email_default,
  priority_default,
  active,
  dt_created,
  dt_updated
) VALUES (
  'order_unlock_forced',                                          -- Type (unikátní kód)
  'Objednávka násilně odemčena',                                 -- Name
  'Objednávka #{order_number} byla převzata jiným uživatelem',  -- Email subject
  'Vaše objednávka č. {order_number} byla násilně odemčena a převzata uživatelem {unlocker_name}.\n\nČas převzetí: {unlock_time}\nDůvod: Administrátor přebral editaci objednávky.\n\nPokud jste měli neuložené změny, doporučujeme je okamžitě uložit nebo konzultovat situaci s {unlocker_name}.', -- Email body
  'Objednávka převzata jiným uživatelem',                        -- App title
  'Vaše objednávka č. {order_number} byla převzata uživatelem {unlocker_name}', -- App message
  1,                                                              -- Send email: ano
  'high',                                                         -- Priority: high
  1,                                                              -- Active: ano
  NOW(),                                                          -- Created
  NOW()                                                           -- Updated
);
```

## Použití v kódu (Backend)

### Python příklad
```python
from notifications import create_notification

# Vytvoř notifikaci pomocí šablony
create_notification(
    recipient_user_id=123,
    template_type='order_unlock_forced',  # ← Toto musí odpovídat 'type' v DB
    placeholders={
        'order_number': '2025/123',
        'unlocker_name': 'Admin XY',
        'unlock_time': '2025-10-23 14:35:00'
    }
)
```

### JavaScript příklad (Frontend)
```javascript
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationsApi';

// Vytvoř notifikaci
await createNotification({
  recipientUserId: 123,
  type: NOTIFICATION_TYPES.ORDER_UNLOCK_FORCED,  // ← Konstanta z enum
  orderNumber: '2025/123',
  unlockerName: 'Admin XY',
  unlockTime: new Date().toISOString()
});
```

## Dostupné placeholders pro order_unlock_forced

| Placeholder | Typ | Popis | Příklad |
|-------------|-----|-------|---------|
| `{order_number}` | string | Číslo/evid. číslo objednávky | `2025/123` |
| `{unlocker_name}` | string | Jméno admina, který odemkl | `Jan Novák` |
| `{unlock_time}` | datetime | Čas násilného odemčení | `2025-10-23 14:35:00` |
| `{approver_name}` | string | Alias pro unlocker_name | `Jan Novák` |

## Poznámky pro backend vývojáře

1. **Type musí být unikátní** - kontroluj před INSERT
2. **Placeholders jsou case-sensitive** - `{Order_Number}` ≠ `{order_number}`
3. **Newline v textech** - použij `\n` pro nové řádky
4. **HTML není podporováno** - pouze plain text (nebo markdown podle implementace)
5. **Priority ovlivní zobrazení** - `high` = červený badge, `normal` = šedý badge
6. **active=0** → šablona nebude použita (pro vypnutí bez mazání)

## Testing

```sql
-- Ověř, že záznam existuje
SELECT * FROM notification_template WHERE type = 'order_unlock_forced';

-- Ověř, že je aktivní
SELECT * FROM notification_template WHERE type = 'order_unlock_forced' AND active = 1;

-- Počet šablon podle priority
SELECT priority_default, COUNT(*) 
FROM notification_template 
WHERE active = 1 
GROUP BY priority_default;
```
