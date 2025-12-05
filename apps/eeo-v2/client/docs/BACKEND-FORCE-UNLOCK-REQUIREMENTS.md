# Force Unlock Feature - Backend Requirements

## Overview
SUPERADMIN a ADMINISTRATOR mohou násilně odemknout objednávku, kterou edituje jiný uživatel, a převzít ji pro editaci.

## API Endpoint: POST /api.eeo/orders25/unlock

### Request Parameters
```json
{
  "token": "...",
  "username": "admin_username",
  "id": 11179,
  "force": true  // Nový parametr - pouze pro SUPERADMIN/ADMINISTRATOR
}
```

### Response - Normal Unlock
```json
{
  "status": "ok",
  "message": "Objednávka byla úspěšně odemčena"
}
```

### Response - Forced Unlock
```json
{
  "status": "ok",
  "message": "Objednávka byla násilně odemčena",
  "unlock_type": "forced",
  "previous_user_id": 123,  // ID uživatele, kterému byl zámek odebrán
  "previous_user_fullname": "Jan Novák"  // Jméno původního uživatele
}
```

## Backend Logic

### 1. Authorization Check
```python
# Ověř, že uživatel má právo na force unlock
allowed_roles = ['SUPERADMIN', 'ADMINISTRATOR']
user_roles = get_user_roles(username, token)

if force and not any(role in allowed_roles for role in user_roles):
    return {
        "err": "Nemáte oprávnění k násilnému odemčení objednávky",
        "status": "forbidden"
    }
```

### 2. Force Unlock Process
```python
if force:
    # 1. Načti aktuální lock info
    current_lock = get_order_lock_info(order_id)
    
    if not current_lock or not current_lock['locked']:
        # Není zamčená, normální odpověď
        return {"status": "ok", "message": "Objednávka nebyla zamčená"}
    
    # 2. Ulož info o původním uživateli pro notifikaci
    previous_user_id = current_lock['locked_by_user_id']
    previous_user_fullname = current_lock['locked_by_user_fullname']
    
    # 3. Odemkni objednávku
    unlock_order(order_id)
    
    # 4. Vytvoř notifikaci pro původního uživatele
    create_notification(
        recipient_user_id=previous_user_id,
        notification_type='order_unlock_forced',
        order_id=order_id,
        order_number=get_order_number(order_id),
        unlocker_name=get_user_fullname(username),
        unlock_time=datetime.now()
    )
    
    # 5. Pokud je původní uživatel online, pošli mu real-time notifikaci
    # (WebSocket/SSE/polling podle implementace)
    send_realtime_notification(
        user_id=previous_user_id,
        type='warning',
        title='Objednávka převzata',
        message=f'Vaše objednávka č. {order_number} byla převzata uživatelem {unlocker_fullname}'
    )
    
    # 6. Vrať success s unlock_type: forced
    return {
        "status": "ok",
        "message": "Objednávka byla násilně odemčena",
        "unlock_type": "forced",
        "previous_user_id": previous_user_id,
        "previous_user_fullname": previous_user_fullname
    }
```

### 3. Normal Unlock (force=false nebo chybí)
```python
# Standardní odemčení - pouze vlastní zámek
unlock_order(order_id, user_id=get_user_id(username))
return {
    "status": "ok",
    "message": "Objednávka byla odemčena"
}
```

## Database - notification_template

### INSERT Statement
Viz soubor: `DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql`

### Typ notifikace
- **type**: `order_unlock_forced`
- **priority**: `high` (důležité upozornění)
- **send_email_default**: `1` (ano, poslat i email)

### Placeholders
- `{order_number}` - Číslo/evid. číslo objednávky
- `{unlocker_name}` - Jméno uživatele, který odemkl
- `{unlock_time}` - Čas odemčení

## Frontend Flow

### OrderForm25.js + Orders25List.js
1. **Detekce zamčené objednávky**
   - Zkontroluj `dbOrder.lock_info.locked_by_user_id !== user_id`

2. **Rozhodnutí podle role**
   - SUPERADMIN/ADMINISTRATOR → nabídni force unlock dialog
   - Běžný uživatel → pouze informace + zablokuj

3. **Force unlock dialog**
   ```
   ⚠️ ZAMČENÁ OBJEDNÁVKA ⚠️
   
   Objednávka je aktuálně editována uživatelem:
   Jan Novák
   
   Jako administrátor můžete objednávku násilně odemknout a převzít.
   
   ⚠️ Původní uživatel bude informován o převzetí objednávky.
   
   Chcete objednávku odemknout a převzít?
   ```

4. **Po potvrzení**
   - POST /unlock s `force: true`
   - Toast: "Objednávka byla násilně odemčena uživateli {jméno} a převzata"
   - POST /lock pro aktuálního uživatele
   - Toast: "Objednávka byla zamknuta pro editaci"
   - Pokračuj v načtení formuláře

## Security Considerations

1. **Role Check**: Vždy zkontroluj na backendu, že uživatel má právo na force unlock
2. **Audit Log**: Zaznamenej každý force unlock do audit logu
3. **Notification**: Původní uživatel MUSÍ být informován o převzetí
4. **Rate Limiting**: Zvážit rate limiting pro force unlock operace

## Testing Checklist

- [ ] Force unlock funguje pro SUPERADMIN
- [ ] Force unlock funguje pro ADMINISTRATOR
- [ ] Force unlock nefunguje pro běžného uživatele (vrací 403)
- [ ] Notifikace se vytvoří v DB
- [ ] Notifikace se zobrazí ve zvonečku původnímu uživateli
- [ ] Email se odešle původnímu uživateli
- [ ] Real-time warning dialog se zobrazí online uživateli
- [ ] Toast notifikace zobrazují správná jména uživatelů
- [ ] Audit log obsahuje záznam o force unlock
