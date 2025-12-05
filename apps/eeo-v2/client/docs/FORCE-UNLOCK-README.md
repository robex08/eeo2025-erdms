# ✅ FORCE UNLOCK - COMPLETE IMPLEMENTATION

## 🎯 Co bylo implementováno

### Frontend Changes (COMPLETE ✅)

**3 soubory upravené:**
1. `src/services/api25orders.js` - API funkce s force unlock
2. `src/forms/OrderForm25.js` - Force unlock logika + toast notifikace
3. `src/pages/Orders25List.js` - Identická implementace jako OrderForm25

**5 dokumentačních souborů vytvořených:**
1. `docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql` - SQL pro DB
2. `docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md` - BE specifikace
3. `docs/FORCE-UNLOCK-IMPLEMENTATION-SUMMARY.md` - Kompletní přehled
4. `docs/DB-NOTIFICATION-TEMPLATE-STRUCTURE.md` - DB struktura podle UI
5. `docs/FORCE-UNLOCK-FLOW-DIAGRAM.md` - Vizuální flow diagram

---

## 🚀 Klíčové funkce

### 1. Force Unlock pro SUPERADMIN/ADMINISTRATOR
✅ Když admin narazí na zamčenou objednávku, může ji násilně odemknout
✅ Confirm dialog s upozorněním na notifikaci původnímu uživateli
✅ Automatický lock po force unlock pro aktuálního uživatele
✅ Toast notifikace se skutečnými jmény (ne ID)

### 2. Ochrana pro běžné uživatele
✅ Běžný uživatel vidí pouze info dialog bez možnosti unlock
✅ Toast warning s jménem uživatele, který objednávku drží
✅ Zůstane v seznamu objednávek

### 3. Notifikace systém (Backend TODO)
📋 SQL template připraven: `order_unlock_forced`
📋 Placeholders: `{order_number}`, `{unlocker_name}`, `{unlock_time}`
📋 Priority: HIGH
📋 Email: ANO (důležité upozornění)

### 4. Real-time upozornění (Backend TODO)
📋 Pokud je původní uživatel online → Warning dialog
📋 Badge v zvonečku +1
📋 Email notifikace

---

## 📋 Toast Notifikace

| Akce | Typ | Text |
|------|-----|------|
| **Normální lock** | info | `Objednávka zamknuta pro editaci` |
| **Force unlock úspěch** | success | `Objednávka byla násilně odemčena uživateli {jméno} a převzata` |
| **Lock po force unlock** | success | `Objednávka byla zamknuta pro editaci` |
| **Zamčeno jiným** | warning | `Objednávka je zamčena uživatelem {jméno}` |
| **Chyba force unlock** | error | `Nepodařilo se násilně odemknout objednávku: {error}` |

---

## 🔐 Authorization

### Povolené role
- ✅ `SUPERADMIN`
- ✅ `ADMINISTRATOR`

### Check pattern
```javascript
const canForceUnlock = userDetail?.roles?.some(role => 
  role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
);
```

⚠️ **Backend MUSÍ validovat roli** - frontend check je jen UX!

---

## 📊 API Změny

### POST /api.eeo/orders25/unlock

**Request:**
```json
{
  "token": "...",
  "username": "admin",
  "id": 123,
  "force": true  // ← NOVÝ parametr
}
```

**Response (normal):**
```json
{
  "status": "ok",
  "message": "Objednávka byla odemčena"
}
```

**Response (forced):**
```json
{
  "status": "ok",
  "message": "Objednávka byla násilně odemčena",
  "unlock_type": "forced",
  "previous_user_id": 5,
  "previous_user_fullname": "Jan Novák"
}
```

---

## 🗃️ Database

### notification_template

**SQL připraven:** `docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql`

**Struktura:**
```sql
type = 'order_unlock_forced'  -- Unikátní kód typu
name = 'Objednávka násilně odemčena'
email_subject = 'Objednávka #{order_number} byla převzata...'
app_title = 'Objednávka převzata jiným uživatelem'
app_message = 'Vaše objednávka č. {order_number}...'
priority_default = 'high'
send_email_default = 1
active = 1
```

**Placeholders:**
- `{order_number}` - Číslo objednávky (např. "2025/123")
- `{unlocker_name}` - Jméno admina (např. "Jan Novák")
- `{unlock_time}` - Čas převzetí (datetime)

---

## 🧪 Testing

### Frontend (Manual Testing)

**Test 1: SUPERADMIN force unlock**
1. Přihlásit se jako SUPERADMIN
2. Jiný uživatel otevře objednávku
3. Pokus o editaci jako SUPERADMIN
4. ✅ Zobrazí se force unlock dialog
5. ✅ Po potvrzení: 2x toast success
6. ✅ Formulář se načte

**Test 2: Běžný uživatel**
1. Přihlásit se jako běžný uživatel
2. Jiný uživatel otevře objednávku
3. Pokus o editaci
4. ✅ Pouze info dialog
5. ✅ Toast warning
6. ✅ Zůstane v seznamu

**Test 3: Toast se jmény**
1. Všechny toast notifikace zobrazují jména uživatelů
2. ✅ Ne ID, ale "Jan Novák"
3. ✅ Fallback pro chybějící jméno: "uživatel #ID"

### Backend (TODO)

- [ ] Force unlock vrací `unlock_type: "forced"`
- [ ] Authorization check (403 pro běžné uživatele)
- [ ] Notifikace se vytvoří v DB
- [ ] Email se odešle
- [ ] Real-time notification funguje (pokud online)
- [ ] Audit log obsahuje záznam

---

## 📦 Soubory ke commitu

### Změněné (3)
```
src/services/api25orders.js
src/forms/OrderForm25.js
src/pages/Orders25List.js
```

### Nové (5)
```
docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql
docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md
docs/FORCE-UNLOCK-IMPLEMENTATION-SUMMARY.md
docs/DB-NOTIFICATION-TEMPLATE-STRUCTURE.md
docs/FORCE-UNLOCK-FLOW-DIAGRAM.md
```

---

## 🎬 User Flow Example

### Scénář: Admin převezme objednávku

**14:30:00** - Jan Novák otevře objednávku #2025/123 pro editaci
- DB: `locked=true, locked_by_user_id=5`

**14:35:00** - Admin XY klikne "Editovat" na stejnou objednávku
- Frontend zjistí: zamčeno jiným (ID 5 ≠ 10)
- Frontend zjistí: Admin XY je ADMINISTRATOR
- Zobrazí force unlock dialog:
  ```
  ⚠️ ZAMČENÁ OBJEDNÁVKA ⚠️
  
  Objednávka je aktuálně editována uživatelem:
  Jan Novák
  
  Jako administrátor můžete objednávku násilně odemknout.
  
  ⚠️ Původní uživatel bude informován o převzetí.
  
  Chcete objednávku odemknout a převzít?
  ```

**14:35:15** - Admin XY klikne "Ano"
1. POST `/unlock` s `force: true`
2. Backend: unlock + create notification
3. Toast: ✅ "Objednávka byla násilně odemčena uživateli Jan Novák a převzata"
4. POST `/lock` pro Admin XY
5. Toast: ✅ "Objednávka byla zamknuta pro editaci"
6. Formulář se načte

**14:35:18** - Jan Novák (pokud online)
- Warning dialog: "Objednávka č. 2025/123 byla převzata uživatelem Admin XY"
- Zvonek: Badge +1 (červený)
- Email: Odeslán na jan.novak@example.com

---

## ⚠️ Security Considerations

1. **Backend musí validovat roli** - frontend check není security
2. **Audit log** - zaznamenat každý force unlock
3. **Rate limiting** - zvážit pro force unlock operace
4. **Notification MUSÍ být poslána** - důležité pro původního uživatele

---

## 📞 Předání backend týmu

### Co potřebují implementovat:

1. **SQL spustit** - vložit notification_template do DB
2. **Force unlock endpoint** - podle `BACKEND-FORCE-UNLOCK-REQUIREMENTS.md`
3. **Authorization check** - pouze SUPERADMIN/ADMINISTRATOR
4. **Notification creation** - při každém force unlock
5. **Real-time dispatch** - pokud existuje infrastruktura (WebSocket/SSE)
6. **Audit logging** - zaznamenat force unlock events
7. **Testing** - podle checklist v dokumentaci

### Dokumenty pro BE:
- ✅ `docs/BACKEND-FORCE-UNLOCK-REQUIREMENTS.md` - Hlavní specifikace
- ✅ `docs/DB-NOTIFICATION-TEMPLATE-ORDER-UNLOCK-FORCED.sql` - SQL ready
- ✅ `docs/DB-NOTIFICATION-TEMPLATE-STRUCTURE.md` - Struktura tabulky
- ✅ `docs/FORCE-UNLOCK-FLOW-DIAGRAM.md` - Vizuální flow

---

## ✅ Status

**Frontend:** ✅ COMPLETE - Ready for commit  
**Backend:** 📋 TODO - Dokumentace připravena  
**Database:** 📋 TODO - SQL připraven  
**Testing:** 🔄 Po BE implementaci

---

## 🎯 Next Steps

1. **Git commit** frontend změn
2. **Předat dokumentaci** backend týmu
3. **Backend implementace** podle docs
4. **Integration testing** FE + BE
5. **User acceptance testing**

---

**Implementováno:** 23. října 2025  
**Status:** ✅ Frontend COMPLETE  
**Čeká na:** Backend implementaci
