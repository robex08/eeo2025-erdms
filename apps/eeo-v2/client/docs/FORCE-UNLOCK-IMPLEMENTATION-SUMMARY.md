# Force Unlock Feature - Complete Implementation Summary

## ✅ Co bylo implementováno

### 1. API Layer (api25orders.js)

#### unlockOrder25() - Rozšířeno o force parametr
```javascript
export async function unlockOrder25({ token, username, orderId, force = false })
```

**Parametry:**
- `force` (boolean) - Pro SUPERADMIN/ADMINISTRATOR násilné odemčení

**Response:**
```javascript
{
  success: true,
  message: "Objednávka byla násilně odemčena",
  unlock_type: "forced" | "normal"
}
```

#### lockOrder25() - Rozšířeno o locked_by_name
```javascript
return {
  success: true,
  message: "Objednávka byla zamknuta",
  lock_info: {...},
  locked_by_name: "Jan Novák"  // Pro toast notifikaci
}
```

### 2. OrderForm25.js - Force Unlock Logic

**Změny v lock check (řádky ~3370-3450):**

1. **Detekce role**
   ```javascript
   const canForceUnlock = userDetail?.roles?.some(role => 
     role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
   );
   ```

2. **Force unlock dialog pro adminy**
   - Zobrazí info o zamčení včetně jména uživatele
   - Upozornění, že původní uživatel bude informován
   - Potvrzení násilného odemčení

3. **Process flow**
   ```javascript
   // 1. Force unlock
   await unlockOrder25({ token, username, orderId, force: true });
   
   // 2. Toast notifikace
   showToast(`Objednávka byla násilně odemčena uživateli ${lockedByUserName} a převzata`, 'success');
   
   // 3. Lock pro aktuálního uživatele
   await lockOrder25({ token, username, orderId });
   
   // 4. Toast potvrzení
   showToast(`Objednávka byla zamknuta pro editaci`, 'success');
   ```

4. **Běžní uživatelé**
   - Pouze informace o zamčení
   - Žádná možnost odemknout
   - Přesměrování na seznam

5. **Toast notifikace při normálním lock**
   ```javascript
   showToast(`Objednávka zamknuta pro editaci`, 'info');
   ```

### 3. Orders25List.js - Identická implementace

**Změny:**
- Import `unlockOrder25`
- Identická logika jako v OrderForm25.js
- Toast notifikace konzistentní s formulářem

### 4. Database - Notification Template

**Soubor:** `docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql`

**Typ notifikace:** `order_unlock_forced`

**Obsah:**
- **Email subject**: "Objednávka #{order_number} byla převzata jiným uživatelem"
- **App title**: "Objednávka převzata jiným uživatelem"
- **App message**: "Vaše objednávka č. {order_number} byla převzata uživatelem {unlocker_name}"
- **Priority**: `high` (důležité upozornění)
- **Send email default**: `1` (ano)

**Placeholders:**
- `{order_number}` - Číslo objednávky
- `{unlocker_name}` - Jméno admina, který převzal
- `{unlock_time}` - Čas převzetí

### 5. Backend Requirements

**Soubor:** `docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md`

**Obsahuje:**
- API endpoint specifikace
- Request/Response struktury
- Authorization check pseudokód
- Force unlock process flow
- Notification creation logic
- Real-time notification requirements
- Security considerations
- Testing checklist

## 🔔 Toast Notifikace - Implementováno

### 1. Lock Success (normální)
```
ℹ️ Objednávka zamknuta pro editaci
```
**Typ:** info

### 2. Force Unlock Success
```
✅ Objednávka byla násilně odemčena uživateli Jan Novák a převzata
```
**Typ:** success

### 3. Lock After Force Unlock
```
✅ Objednávka byla zamknuta pro editaci
```
**Typ:** success

### 4. Lock Denied (zamčená jiným)
```
⚠️ Objednávka je zamčena uživatelem Jan Novák
```
**Typ:** warning

### 5. Force Unlock Error
```
❌ Nepodařilo se násilně odemknout objednávku: {error message}
```
**Typ:** error

## 🎯 User Experience Flow

### Scénář 1: SUPERADMIN/ADMINISTRATOR narazí na zamčenou objednávku

1. **Klikne na "Editovat" v seznamu**
2. **Detekce zamčení** → Zobrazí se confirm dialog:
   ```
   ⚠️ ZAMČENÁ OBJEDNÁVKA ⚠️
   
   Objednávka je aktuálně editována uživatelem:
   Jan Novák
   
   Jako administrátor můžete objednávku násilně odemknout a převzít.
   
   ⚠️ Původní uživatel bude informován o převzetí objednávky.
   
   Chcete objednávku odemknout a převzít?
   ```
3. **Klikne "OK"**
   - Toast: "Objednávka byla násilně odemčena uživateli Jan Novák a převzata" (success)
   - Toast: "Objednávka byla zamknuta pro editaci" (success)
   - Formulář se načte pro editaci
4. **Jan Novák (původní uživatel) dostane:**
   - Notifikaci ve zvonečku: "Objednávka č. 2025/123 byla převzata uživatelem Admin XY"
   - Email: "Objednávka #2025/123 byla převzata jiným uživatelem"
   - (Pokud online) Real-time warning dialog

### Scénář 2: Běžný uživatel narazí na zamčenou objednávku

1. **Klikne na "Editovat"**
2. **Detekce zamčení** → Zobrazí se alert:
   ```
   Objednávka je aktuálně editována uživatelem:
   
   Jan Novák
   
   Nelze ji načíst pro editaci.
   ```
3. **Klikne "OK"**
   - Toast: "Objednávka je zamčena uživatelem Jan Novák" (warning)
   - Zůstane v seznamu objednávek

## 🔐 Security

### Authorization
- **Backend MUSÍ zkontrolovat** roli před force unlock
- **Frontend kontrola je jen UX** (disable UI), ne security

### Roles Allowed
- `SUPERADMIN`
- `ADMINISTRATOR`

### Not Allowed
- Běžný uživatel (žádné force unlock tlačítko)
- Pokus o force unlock → 403 Forbidden

## 📋 Backend TODO

1. **Implementovat force parametr** v `/api.eeo/orders25/unlock`
2. **Authorization check** - pouze SUPERADMIN/ADMINISTRATOR
3. **Notification creation** při force unlock:
   - Type: `order_unlock_forced`
   - Recipient: původní uživatel (locked_by_user_id)
   - Data: order_number, unlocker_name, unlock_time
4. **Real-time notification** pro online uživatele (WebSocket/SSE)
5. **Audit log** - zaznamenat force unlock event
6. **Response structure**:
   ```json
   {
     "status": "ok",
     "message": "Objednávka byla násilně odemčena",
     "unlock_type": "forced",
     "previous_user_id": 123,
     "previous_user_fullname": "Jan Novák"
   }
   ```
7. **Vložit notification_template** do DB (SQL připraven)

## 🧪 Testing Checklist

Frontend:
- [x] Force unlock dialog zobrazuje správné jméno uživatele
- [x] Toast notifikace zobrazují jména (ne ID)
- [x] Běžný uživatel nevidí force unlock možnost
- [x] SUPERADMIN vidí force unlock dialog
- [x] ADMINISTRATOR vidí force unlock dialog
- [x] Lock po force unlock funguje
- [x] Žádné compilation errors

Backend TODO:
- [ ] Force unlock vrací unlock_type: "forced"
- [ ] Authorization check funguje (403 pro běžné uživatele)
- [ ] Notifikace se vytvoří v DB
- [ ] Email se odešle původnímu uživateli
- [ ] Real-time notifikace funguje
- [ ] Audit log obsahuje force unlock event
- [ ] Previous user info v response

## 📁 Soubory změněny

1. **src/services/api25orders.js**
   - unlockOrder25() - přidán force parametr
   - lockOrder25() - přidán locked_by_name v response

2. **src/forms/OrderForm25.js**
   - Force unlock logika pro SUPERADMIN/ADMINISTRATOR
   - Toast notifikace se jmény uživatelů
   - Improved UX messaging

3. **src/pages/Orders25List.js**
   - Import unlockOrder25
   - Force unlock logika identická s OrderForm25.js
   - Toast notifikace

4. **docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql** (NOVÝ)
   - SQL pro vložení notification template

5. **docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md** (NOVÝ)
   - Kompletní BE specifikace
   - API dokumentace
   - Security guidelines
   - Testing checklist

## 🚀 Ready for Backend Integration

Frontend je **COMPLETE** a připraven pro backend.

Backend potřebuje implementovat:
1. Force unlock endpoint logic
2. Notification creation
3. Real-time notification dispatch
4. Audit logging
