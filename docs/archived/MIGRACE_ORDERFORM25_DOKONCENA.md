# ✅ MIGRACE OrderForm25.js NA NOVÝ NOTIFIKAČNÍ SYSTÉM - DOKONČENO

**Datum:** 18. prosince 2025 01:45  
**Status:** ✅ HOTOVO - PŘIPRAVENO K TESTOVÁNÍ

---

## 📋 CO BYLO PROVEDENO

### 1. ✅ OrderForm25.js - Přepsáno na nový systém

**Změněný import:**
```javascript
// PŘED:
import notificationServiceDual from '../services/notificationService';

// PO:
import { triggerNotification } from '../services/notificationsApi';
```

**Změněná volání (2 místa):**

#### Místo 1: Nová objednávka (řádek ~10238)
```javascript
// PŘED:
await notificationServiceDual.sendOrderApprovalNotifications({
  token,
  username,
  orderData: { ... }
});

// PO:
await triggerNotification(
  'ORDER_SENT_FOR_APPROVAL',
  orderId,
  currentUser?.id || formData.objednatel_id,
  {
    order_number: orderNumber,
    order_subject: formData.predmet || '',
    commander_id: formData.prikazce_id,
    garant_id: formData.garant_uzivatel_id,
    creator_id: formData.objednatel_id,
    supplier_name: formData.dodavatel_nazev || 'Neuvedeno',
    financovani_json: JSON.stringify(orderData.financovani || {}),
    strediska_names: strediskaNazvy,
    max_price_with_dph: formData.max_cena_s_dph || 0,
    is_urgent: formData.mimoradna_udalost || false
  }
);
```

#### Místo 2: Editace objednávky (řádek ~10698)
```javascript
// Stejná změna jako výše, jen s formData.id místo orderId
```

---

### 2. ✅ notificationService.js - Přidán deprecation warning

**Funkce `sendOrderApprovalNotifications()` nyní loguje:**
```
════════════════════════════════════════════════════════════════
⚠️ DEPRECATED: sendOrderApprovalNotifications()
   This function bypasses organizational hierarchy
   Use: triggerNotification() from notificationsApi.js
   Event: ORDER_SENT_FOR_APPROVAL
════════════════════════════════════════════════════════════════
```

**Účel:** Pokud někdo jiný někde tuto funkci volá, okamžitě uvidí deprecation.

---

## 🎯 JAK TO TEĎ FUNGUJE

### Starý systém (PŘED):
1. OrderForm25.js volá `sendOrderApprovalNotifications()`
2. Ta volá `/notifications/send-dual` endpoint
3. Backend handler `handle_notifications_send_dual()` v **handlers.php**
4. Ten bere `$template['odeslat_email_default']` z DB
5. **❌ IGNORUJE org. hierarchii sendEmail:false**

### Nový systém (TEĎKA):
1. OrderForm25.js volá `triggerNotification()`
2. Ta volá `/notifications/trigger` endpoint
3. Backend handler `handle_notifications_trigger()` v **api.php** → `notificationRouter()` v **notificationHandlers.php**
4. Ten volá `findNotificationRecipients()` → čte org. hierarchii
5. Pro každého příjemce načte edge config: `edge.data.sendEmail`
6. **✅ RESPEKTUJE všechny 3 úrovně:**
   - Global Settings (25a_nastaveni_globalni)
   - User Preferences (25_notifikace_uzivatele_nastaveni)
   - Org Hierarchy Edge Config (25_hierarchie_profily.structure_json.edges[].data.sendEmail)

---

## 🧪 JAK OTESTOVAT

### Test 1: Ověřit že sendEmail:false funguje

**Setup:**
1. V org. hierarchii profil ID=12 "PRIKAZCI" má `sendEmail: false, sendInApp: true`
2. Global settings má `notifications_email_enabled: 1`
3. User preferences prázdné (defaulty = 1)

**Postup:**
1. Vytvořit novou objednávku
2. Odeslat ke schválení příkazci (user ID=100)
3. **Očekávané chování:**
   - ✅ Zvoneček (in-app notifikace) se objeví
   - ✅ Email se NEODEŠLE (protože edge.data.sendEmail = false)

**Ověření:**
```sql
-- Zkontrolovat notifikace v DB
SELECT * FROM 25_notifikace 
WHERE uzivatel_id = 100 
ORDER BY vytvoreno DESC LIMIT 1;

-- Měla by mít:
-- email_odeslany = 0
-- inapp_odeslana = 1
```

---

### Test 2: Ověřit že sendEmail:true funguje

**Setup:**
1. Změnit v org. hierarchii na `sendEmail: true, sendInApp: true`

**Postup:**
1. Vytvořit další objednávku
2. Odeslat ke schválení
3. **Očekávané chování:**
   - ✅ Zvoneček i email se odešlou

---

### Test 3: Ověřit že workflow není rozbitý

**Postup:**
1. Vytvořit objednávku
2. Odeslat ke schválení
3. Příkazce schválí
4. Objednatel dostane notifikaci o schválení
5. Celý workflow projde bez errorů

**Důležité:**
- Workflow NESMÍ házet chyby
- Debug logy musí ukazovat "trigger-sent-new" / "trigger-sent"
- Pokud nastane chyba, musí být jen warning (non-blocking)

---

## 🚨 CO SE MŮŽE POKAZIT

### Problém 1: Event type neexistuje v DB

**Symptom:**
- Backend log: "Žádní příjemci nenalezeni pro event ORDER_SENT_FOR_APPROVAL"

**Řešení:**
```sql
-- Zkontrolovat zda event type existuje
SELECT * FROM 25_event_typy WHERE kod = 'ORDER_SENT_FOR_APPROVAL';

-- Pokud neexistuje, vytvořit:
INSERT INTO 25_event_typy (kod, nazev, popis, aktivni)
VALUES ('ORDER_SENT_FOR_APPROVAL', 'Objednávka odeslána ke schválení', 'Odesláno příkazci', 1);
```

---

### Problém 2: Org. hierarchie nemá pravidlo

**Symptom:**
- Backend log: "Žádní příjemci nenalezeni"

**Řešení:**
```sql
-- Zkontrolovat zda hierarchie má edge s tímto event typem
SELECT * FROM 25_hierarchie_profily WHERE id = 12;

-- V structure_json.edges musí být edge s:
-- source: nějaká role
-- target: nějaká role
-- data.eventTypes obsahuje 'ORDER_SENT_FOR_APPROVAL'
```

---

### Problém 3: Template nemá email_telo

**Symptom:**
- Backend log: "Template {id} has NO email_telo, disabling email"

**Řešení:**
```sql
-- Najít template
SELECT id, nazev, email_telo FROM 25_notifikace_sablony 
WHERE event_type_id = (SELECT id FROM 25_event_typy WHERE kod = 'ORDER_SENT_FOR_APPROVAL');

-- Pokud email_telo je NULL, přidat:
UPDATE 25_notifikace_sablony 
SET email_telo = '<html><body>...nějaký HTML...</body></html>'
WHERE id = ...;
```

---

## 📊 CHECKLIST PŘED NASAZENÍM

- [ ] **Test 1 prošel** - sendEmail:false neodesílá email
- [ ] **Test 2 prošel** - sendEmail:true odesílá email i zvoneček
- [ ] **Test 3 prošel** - Celý workflow funguje bez errorů
- [ ] **Backend logy OK** - Žádné kritické chyby
- [ ] **Frontend logy OK** - Debug logy ukazují "trigger-sent"
- [ ] **DB kontrola OK** - Notifikace mají správné flagy (email_odeslany, inapp_odeslana)
- [ ] **User testing OK** - Reálný user zkusil vytvořit objednávku a workflow funguje

---

## 🎉 VÝHODY NOVÉHO SYSTÉMU

### ✅ Před migrací (starý systém):
- ❌ Ignoroval org. hierarchii
- ❌ Bral `email_vychozi` z DB šablony
- ❌ Ignoroval `sendEmail: false` v edge config
- ❌ Posílal prázdné emaily
- ❌ Nekonzistentní s ostatními notifikacemi

### ✅ Po migraci (nový systém):
- ✅ Respektuje org. hierarchii
- ✅ Respektuje edge config `sendEmail`/`sendInApp`
- ✅ Respektuje user preferences
- ✅ Respektuje global settings
- ✅ Validuje email_telo před odesláním
- ✅ Konzistentní s ostatními notifikacemi
- ✅ Centrální správa přes org. hierarchii

---

## 📌 NEXT STEPS

### Krok 1: OTESTOVAT (KRITICKÉ)
```bash
cd /var/www/erdms-dev
./dev-start.sh
# Otevřít frontend, zkusit vytvořit objednávku a odeslat ke schválení
```

### Krok 2: Sledovat logy
```bash
# Backend logy:
tail -f /var/log/apache2/error.log | grep -i notification

# Frontend logy:
# Otevřít Browser DevTools → Console
# Hledat: "trigger-sent" nebo "trigger-error"
```

### Krok 3: Pokud testy projdou → Odstranit starý handler
```
Po úspěšném testování:
1. Odstranit handle_notifications_send_dual() z handlers.php
2. Odstranit case 'notifications/send-dual' z api.php
3. Odstranit sendOrderApprovalNotifications() z notificationService.js
4. Commit + push
```

---

## 🔥 KRITICKÁ POZNÁMKA

**Workflow NESMÍ být rozbitý!**

Pokud se něco pokazí:
1. Zkontrolovat backend logy
2. Zkontrolovat frontend console
3. Zkontrolovat DB (event typy, hierarchie, templates)
4. Pokud nic nepomůže, vrátit změny:

```bash
cd /var/www/erdms-dev
git diff apps/eeo-v2/client/src/forms/OrderForm25.js
# Pokud je třeba vrátit:
git checkout apps/eeo-v2/client/src/forms/OrderForm25.js
```

---

**Status:** ✅ MIGRACE DOKONČENA - PŘIPRAVENO K TESTOVÁNÍ  
**Risk Level:** 🟡 STŘEDNÍ (kritický workflow, ale má fallback na try-catch)  
**Rollback:** ✅ Možný pomocí git checkout

**READY FOR TESTING!** 🚀
