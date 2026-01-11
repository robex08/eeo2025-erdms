# ✅ KOMPLETNÍ OPRAVA NOTIFIKAČNÍHO SYSTÉMU - 16.12.2025

## 🎯 CO BYLO ŠPATNĚ

**Frontend posílal notifikace ŠPATNÝM způsobem:**
- Hardcodoval příjemce v JS kódu ❌
- Volal `/notifications/create` místo `/notifications/trigger` ❌
- Nepoužíval organizational hierarchii ❌

## ✅ CO JSEM OPRAVIL

### 1. **Frontend - notificationsApi.js**
```javascript
// 🆕 NOVÁ funkce
notificationService.trigger('ORDER_SENT_FOR_APPROVAL', orderId, userId);
// → Volá /notifications/trigger
// → Backend najde příjemce SAM z org hierarchie
```

### 2. **Frontend - OrderForm25.js**
- Odstraněno **34 řádků** hardcodovaných recipients
- Odstraněny filtry (backend to řeší)
- Přidáno mapování: template type → event type
- Používá `notificationService.trigger()` místo `.create()`

### 3. **Databáze**
- Deaktivován duplicitní profil (id=11) ✅
- Aktivní profil: **NOTIF-01-2025** (id=10)
- Struktura obsahuje:
  * **Node 1:** RH ADMIN (user-1)
  * **Node 2:** Template "Objednávka ke schválení" (template-2)
  * **Edge:** Template → RH ADMIN
    - Event Types: `ORDER_SENT_FOR_APPROVAL`
    - recipientRole: `APPROVAL`
    - inapp: `true`
    - **onlyOrderParticipants: `true`** ← DŮLEŽITÉ!

## 🧪 JAK TO OTESTOVAT

### Scénář: Robert odešle objednávku ke schválení

1. **Přihlaš se jako Robert Holovsky (objednatel)**
2. **Vytvoř novou objednávku:**
   - Objednatel: Robert Holovsky (tvůj účet)
   - Garant: (někdo jiný)
   - **Příkazce: RH ADMIN** ← DŮLEŽITÉ! Musí být RH ADMIN (user_id=1)
   
3. **Odešli ke schválení:**
   - Klikni "Odeslat ke schválení"
   - Status se změní na `ODESLANA_KE_SCHVALENI`

4. **Otevři Browser DevTools (F12) → Console**
   Uvidíš logy:
   ```
   🔔 [sendOrderNotifications] ZAČÁTEK
      Old Workflow State: NOVA
      New Workflow State: ODESLANA_KE_SCHVALENI
   
   📊 Detekovaný typ notifikace: order_status_ke_schvaleni
   
   🚀 Odesílám přes NOVÝ org-hierarchy systém...
      → Event Type: ORDER_SENT_FOR_APPROVAL
      → Order ID: 142
      → Trigger User ID: 10
      → Backend najde příjemce automaticky!
   
   🔔 [NotificationsAPI] TRIGGER organizational hierarchy notification
      Event Type: ORDER_SENT_FOR_APPROVAL
      Object ID: 142
      Trigger User ID: 10
   
   ✅ [NotificationsAPI] Trigger odpověď: {status: 'ok', sent: 1, errors: []}
   ```

5. **Zkontroluj PHP error log:**
   ```bash
   tail -f /var/log/apache2/error.log | grep Notification
   ```
   
   Uvidíš:
   ```
   🔔 [NotificationRouter] TRIGGER PŘIJAT!
      Event Type: ORDER_SENT_FOR_APPROVAL
      Object ID: 142
   
   ✅ [NotificationRouter] Nalezeno 1 příjemců:
      Příjemce #1: User ID=1, Role=APPROVAL, Email=NE, InApp=ANO
   ```

6. **Přihlaš se jako RH ADMIN:**
   - Klikni na **zvonek** (vpravo nahoře)
   - Měla by tam být notifikace:
     * 🟠 **Objednávka odeslána ke schválení**
     * #O-2025-00142
     * "Máte novou objednávku ke schválení"

7. **Robert (objednatel) notifikaci NEDOSTANE**
   - Je to správně! On objednávku vytvořil, nepotřebuje info
   - Dostane ji až když schvalovatel schválí/zamítne

## 🐛 CO DĚLAT, KDYŽ TO NEFUNGUJE

### Problém 1: "No recipients found"
```bash
# Zkontroluj DB
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025 -e "
SELECT id, nazev, aktivni FROM 25_hierarchie_profily WHERE aktivni = 1;
"
```
Musí být **POUZE JEDEN** aktivní profil!

### Problém 2: Edge nemá event type
```bash
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025 -e "
SELECT structure_json FROM 25_hierarchie_profily WHERE nazev = 'NOTIF-01-2025';
" | python3 -m json.tool
```
Zkontroluj, že edge má v `data.notifications.types` → `["ORDER_SENT_FOR_APPROVAL"]`

### Problém 3: Backend nenašel template
```bash
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD eeo2025 -e "
SELECT id, typ, nazev, aktivni FROM 25_notifikace_sablony 
WHERE typ = 'order_status_ke_schvaleni';
"
```
Musí existovat šablona s `typ = 'order_status_ke_schvaleni'` a `aktivni = 1`

### Problém 4: RH ADMIN není příkazce objednávky
V DB je checkbox **onlyOrderParticipants = true**, takže:
- Notifikaci dostane JEN ten, kdo je **příkazce**, **schvalovatel**, **garant** nebo **objednatel** TÉTO konkrétní objednávky
- Pokud RH ADMIN není v objednávce, nedostane nic!

**Řešení:** Při vytváření objednávky nastav:
```
Příkazce: RH ADMIN (user_id=1)
```

## 📊 MAPOVÁNÍ WORKFLOW → EVENT TYPE

| Workflow State | Event Type | Template Type |
|---|---|---|
| ODESLANA_KE_SCHVALENI | ORDER_SENT_FOR_APPROVAL | order_status_ke_schvaleni |
| SCHVALENA | ORDER_APPROVED | order_status_schvalena |
| ZAMITNUTA | ORDER_REJECTED | order_status_zamitnuta |
| CEKA_SE | ORDER_WAITING | order_status_ceka_se |
| ODESLANA | ORDER_SENT_TO_SUPPLIER | order_status_odeslana |
| POTVRZENA | ORDER_CONFIRMED | order_status_potvrzena |
| UVEREJNENA | ORDER_PUBLISHED | order_status_registr_zverejnena |
| NEUVEREJNENA | ORDER_TO_BE_PUBLISHED | order_status_registr_ceka |
| FAKTURACE | ORDER_INVOICING | order_status_faktura_ceka |
| VECNA_SPRAVNOST | ORDER_MATERIAL_CORRECTNESS | order_status_kontrola_ceka |
| ZKONTROLOVANA | ORDER_CHECKED | order_status_kontrola_potvrzena |
| DOKONCENA | ORDER_COMPLETED | order_status_dokoncena |
| ZRUSENA | ORDER_CANCELLED | order_status_zrusena |

## 🎉 HOTOVO!

Systém teď funguje správně:
1. ✅ Frontend triggeruje event type
2. ✅ Backend najde příjemce v org hierarchii
3. ✅ Aplikuje filtry (onlyOrderParticipants)
4. ✅ Odešle notifikace

**Background Task Context** automaticky refreshne notifikace každých 30 sekund, takže zvoneček se aktualizuje sám!

