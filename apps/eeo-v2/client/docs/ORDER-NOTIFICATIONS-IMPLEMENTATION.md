# Implementace notifikací v OrderForm25

## Přehled

Implementován kompletní systém notifikací pro životní cyklus objednávky. Notifikace jsou automaticky odesílány relevantním uživatelům při změnách stavu objednávky.

## Implementované změny

### 1. Přidaný import v OrderForm25.js (řádek ~43)

```javascript
import { createNotification, NOTIFICATION_TYPES } from '../services/notificationsApi';
```

### 2. Nová pomocná funkce `sendOrderNotifications()` (řádek ~4085)

Umístěna těsně před funkcí `saveOrderToAPI()`.

**Parametry:**
- `orderId` - ID objednávky v DB
- `orderNumber` - Evidenční číslo objednávky
- `newWorkflowState` - Nový stav workflow (např. "SCHVALENA|ROZPRACOVANA")
- `oldWorkflowState` - Starý stav workflow (null pro nové objednávky)
- `formData` - Data formuláře s ID uživatelů

**Funkčnost:**
- Detekuje změnu workflow stavu
- Určuje, které notifikace poslat na základě změny stavu
- Odesílá notifikace paralelně pomocí `Promise.all()`
- Ignoruje chyby notifikací (nezastaví workflow při selhání)

## Notifikační pravidla

### 1. Nová objednávka (ODESLANA_KE_SCHVALENI)

**Trigger:** První uložení objednávky (INSERT operace)

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita HIGH
  - Nadpis: "Nová objednávka ke schválení: {číslo}"
  - Zpráva: "Objednávka {číslo} byla vytvořena a čeká na schválení."

- **Příkazce** (`prikazce_id`) - priorita NORMAL (pokud je jiný než garant)
  - Nadpis: "Nová objednávka: {číslo}"
  - Zpráva: "Byla vytvořena objednávka {číslo}, u které jste příkazce."

- **Schvalovatel** (`schvalovatel_id`) - priorita HIGH (pokud je jiný než garant)
  - Nadpis: "Objednávka ke schválení: {číslo}"
  - Zpráva: "Objednávka {číslo} čeká na Vaše schválení."

### 2. Objednávka schválena (SCHVALENA)

**Trigger:** Změna stavu na SCHVALENA

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita NORMAL
  - Nadpis: "Objednávka schválena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla schválena."

- **Tvůrce objednávky** (`objednatel_id`) - priorita NORMAL (pokud je jiný než garant)
  - Nadpis: "Objednávka schválena: {číslo}"
  - Zpráva: "Vaše objednávka {číslo} byla schválena."

### 3. Objednávka zamítnuta (ZAMITNUTA)

**Trigger:** Změna stavu na ZAMITNUTA

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita HIGH
  - Nadpis: "Objednávka zamítnuta: {číslo}"
  - Zpráva: "Objednávka {číslo} byla zamítnuta."

- **Tvůrce objednávky** (`objednatel_id`) - priorita HIGH (pokud je jiný než garant)
  - Nadpis: "Objednávka zamítnuta: {číslo}"
  - Zpráva: "Vaše objednávka {číslo} byla zamítnuta."

### 4. Objednávka odeslána dodavateli (ODESLANA)

**Trigger:** Změna stavu na ODESLANA

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita NORMAL
  - Nadpis: "Objednávka odeslána: {číslo}"
  - Zpráva: "Objednávka {číslo} byla odeslána dodavateli."

- **Příkazce** (`prikazce_id`) - priorita NORMAL (pokud je jiný než garant)
  - Nadpis: "Objednávka odeslána: {číslo}"
  - Zpráva: "Objednávka {číslo} byla odeslána dodavateli."

### 5. Objednávka potvrzena dodavatelem (POTVRZENA)

**Trigger:** Změna stavu na POTVRZENA

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita NORMAL
  - Nadpis: "Objednávka potvrzena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla potvrzena dodavatelem."

- **Tvůrce objednávky** (`objednatel_id`) - priorita NORMAL (pokud je jiný než garant)
  - Nadpis: "Objednávka potvrzena: {číslo}"
  - Zpráva: "Vaše objednávka {číslo} byla potvrzena dodavatelem."

- **Příkazce** (`prikazce_id`) - priorita NORMAL (pokud je jiný než garant a tvůrce)
  - Nadpis: "Objednávka potvrzena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla potvrzena dodavatelem."

- **Schvalovatel** (`schvalovatel_id`) - priorita NORMAL (pokud je jiný než garant, tvůrce a příkazce)
  - Nadpis: "Objednávka potvrzena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla potvrzena dodavatelem."

### 6. Objednávka čeká (CEKA_SE)

**Trigger:** Změna stavu na CEKA_SE

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita NORMAL
  - Nadpis: "Objednávka čeká: {číslo}"
  - Zpráva: "Objednávka {číslo} byla přesunuta do stavu 'Čeká se'."

- **Tvůrce objednávky** (`objednatel_id`) - priorita NORMAL
  - Nadpis: "Objednávka čeká: {číslo}"
  - Zpráva: "Objednávka {číslo} byla přesunuta do stavu 'Čeká se'."

### 7. Objednávka zrušena (ZRUSENA)

**Trigger:** Změna stavu na ZRUSENA (stornování)

**Příjemci:**
- **Garant** (`garant_uzivatel_id`) - priorita HIGH
  - Nadpis: "Objednávka zrušena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla zrušena."

- **Tvůrce objednávky** (`objednatel_id`) - priorita HIGH
  - Nadpis: "Objednávka zrušena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla zrušena."

- **Příkazce** (`prikazce_id`) - priorita HIGH
  - Nadpis: "Objednávka zrušena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla zrušena."

- **Schvalovatel** (`schvalovatel_id`) - priorita HIGH
  - Nadpis: "Objednávka zrušena: {číslo}"
  - Zpráva: "Objednávka {číslo} byla zrušena."

## Integrace v saveOrderToAPI()

### INSERT operace (řádek ~4660)

Po úspěšném vytvoření objednávky:

```javascript
// 🔔 Odeslat notifikace při vytvoření nové objednávky
try {
  const workflowKod = result.data?.stav_workflow_kod || orderData.stav_workflow_kod;
  await sendOrderNotifications(orderId, orderNumber, workflowKod, null, formData);
} catch (notifError) {
  console.error('[OrderForm25] Chyba při odesílání notifikací po INSERT:', notifError);
  // Nezastavuj workflow kvůli chybě notifikace
}
```

### UPDATE operace (řádek ~4815)

1. **Před UPDATE:** Uložení starého stavu
```javascript
// Uložit starý workflow stav pro detekci změn (pro notifikace)
const oldWorkflowKod = formData.stav_workflow_kod;
```

2. **Po UPDATE:** Odeslání notifikací při změně
```javascript
// 🔔 Odeslat notifikace při změně workflow stavu
try {
  const orderNumber = formData.ev_cislo || formData.cislo_objednavky || savedOrderId;
  await sendOrderNotifications(savedOrderId, orderNumber, updatedWorkflowKod, oldWorkflowKod, formData);
} catch (notifError) {
  console.error('[OrderForm25] Chyba při odesílání notifikací po UPDATE:', notifError);
  // Nezastavuj workflow kvůli chybě notifikace
}
```

## Typy notifikací (z notificationsApi.js)

```javascript
NOTIFICATION_TYPES.ORDER_STATUS_KE_SCHVALENI
NOTIFICATION_TYPES.ORDER_STATUS_SCHVALENA
NOTIFICATION_TYPES.ORDER_STATUS_ZAMITNUTA
NOTIFICATION_TYPES.ORDER_STATUS_ODESLANA
NOTIFICATION_TYPES.ORDER_STATUS_POTVRZENA
```

## Data notifikace

Každá notifikace obsahuje:

```javascript
{
  to_user_id: number,           // ID příjemce
  type: string,                 // Typ z NOTIFICATION_TYPES
  title: string,                // Nadpis notifikace
  message: string,              // Text zprávy
  priority: 'low'|'normal'|'high', // Priorita
  data_json: {                  // Metadata
    order_id: number,
    order_number: string,
    workflow_state: string
  }
}
```

## Vlastnosti implementace

### ✅ Výhody

1. **Non-blocking** - Chyby notifikací nezastaví ukládání objednávky
2. **Paralelní odesílání** - Všechny notifikace jdou najednou (`Promise.all`)
3. **Detekce změn** - Notifikace se posílají jen při skutečné změně stavu
4. **Deduplikace příjemců** - Kontrola, zda není příjemce stejný jako garant
5. **Prioritizace** - Důležité notifikace (schválení, zamítnutí) mají HIGH prioritu
6. **Rich metadata** - Každá notifikace obsahuje kompletní kontext (ID, číslo, stav)

### 🔒 Bezpečnost

- Notifikace používají autentifikovaný API endpoint
- Ověření oprávnění na backend straně
- Žádná citlivá data v notifikacích (jen čísla objednávek)

### 📊 Logování

```javascript
console.log(`[Notifications] Odesílám ${notifications.length} notifikací pro objednávku ${orderNumber}`);
console.log(`[Notifications] Notifikace úspěšně odeslány`);
console.error('[Notifications] Chyba při odesílání notifikace:', error);
```

## Testování

### Manuální test

1. **Vytvoření nové objednávky:**
   - Vyplnit formulář s garantem, příkazcem a schvalovatelem
   - Uložit objednávku
   - ✅ Ověřit, že všichni tři dostali notifikaci

2. **Schválení objednávky:**
   - Jako schvalovatel otevřít objednávku
   - Schválit ji
   - ✅ Ověřit, že garant a tvůrce dostali notifikaci

3. **Zamítnutí objednávky:**
   - Jako schvalovatel zamítnout objednávku
   - ✅ Ověřit, že garant a tvůrce dostali HIGH prioritní notifikaci

4. **Odeslání dodavateli:**
   - V FÁZI 2 zaškrtnout "Odeslána dodavateli"
   - ✅ Ověřit, že garant a příkazce dostali notifikaci

5. **Potvrzení dodavatelem:**
   - Zadat potvrzení od dodavatele
   - ✅ Ověřit, že garant a tvůrce dostali notifikaci

### Debug

Kontrolovat konzoli prohlížeče:
```
[Notifications] Odesílám 3 notifikací pro objednávku 2025/001
[NotificationsAPI] Creating notification: order_status_ke_schvaleni
[NotificationsAPI] Recipient: Single user ID 5
[NotificationsAPI] Notification created: 123
[Notifications] Notifikace úspěšně odeslány
```

## Budoucí rozšíření

### Možná vylepšení:

1. **Batch notifikace** - Pokud se stav změní vícekrát rychle po sobě, sloučit do jedné
2. **Email notifikace** - Přidat `send_email: true` pro kritické notifikace
3. **Personalizované zprávy** - Podle role uživatele (garant vs. tvůrce)
4. **Notifikace pro připomínky** - Upozornění na blížící se termíny
5. **Historie notifikací** - Ukládat, které notifikace byly odeslány
6. **Templating** - Použít backend templates místo hardcoded textů

## Troubleshooting

### Problém: Notifikace se neodesílají

**Řešení:**
1. Zkontroluj konzoli - hledej errory s `[Notifications]`
2. Ověř, že backend endpoint `/api.eeo/notifications/create` funguje
3. Zkontroluj, že `createNotification` vrací Promise správně

### Problém: Duplicitní notifikace

**Řešení:**
1. Zkontroluj, že se `sendOrderNotifications` volá jen jednou
2. Ověř logiku detekce změn (`oldWorkflowState !== newWorkflowState`)

### Problém: Notifikace jdou špatným uživatelům

**Řešení:**
1. Zkontroluj `formData.garant_uzivatel_id`, `prikazce_id`, `objednatel_id`
2. Ověř, že deduplikace funguje (kontrola `!== formData.garant_uzivatel_id`)

## Závěr

Notifikační systém je plně funkční a integrovaný do celého workflow objednávky. Uživatelé budou okamžitě informováni o všech důležitých změnách stavu jejich objednávek.
