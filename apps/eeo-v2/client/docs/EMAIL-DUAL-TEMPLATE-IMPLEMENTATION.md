# 📧 Dual-Template Email System - Implementační dokumentace

## 🎯 Přehled
Systém email notifikací nyní podporuje **dvě varianty HTML šablon v jednom záznamu DB**:
1. **APPROVER** (červená) - pro příkazce/schvalovatele
2. **SUBMITTER** (zelená) - pro autora/garanta objednávky

---

## 📊 Struktura databáze

### Tabulka: `25_notification_templates`
```sql
id: 2
type: 'order_status_ke_schvaleni'
name: 'Objednávka odeslána ke schválení'
email_subject: 'EEO: Nová objednávka ke schválení #{order_number}'
email_body: '<!-- RECIPIENT: APPROVER -->
            ... HTML pro příkazce ...
            <!-- RECIPIENT: SUBMITTER -->
            ... HTML pro autora ...'
```

**Délka `email_body`**: 13 502 znaků
- APPROVER část: 6 875 znaků
- SUBMITTER část: 6 567 znaků

**Delimiter**: `<!-- RECIPIENT: APPROVER -->` a `<!-- RECIPIENT: SUBMITTER -->`

---

## 🔧 Backend (PHP)

### Soubory
1. **`lib/email-template-helper.php`** - Helper funkce pro extrakci šablon
2. **`test-dual-template.php`** - Test skript (ověřeno ✅)

### Klíčové funkce

#### `get_email_template_by_recipient($email_body, $recipient_type)`
Extrahuje správnou HTML šablonu podle typu příjemce.

**Parametry**:
- `$email_body` (string) - Celý email_body z DB
- `$recipient_type` (string) - `'APPROVER'` nebo `'SUBMITTER'`

**Return**: (string) HTML šablona pro daného příjemce

**Použití**:
```php
$template = get_notification_template('order_status_ke_schvaleni');
$email_html = get_email_template_by_recipient($template['email_body'], 'APPROVER');
```

#### `detect_recipient_type($user_id, $order_data)`
Automaticky detekuje typ příjemce podle ID uživatele.

**Parametry**:
- `$user_id` (int) - ID uživatele
- `$order_data` (array) - Data objednávky s klíči:
  - `prikazce_id` - ID schvalovatele
  - `garant_id` - ID garanta
  - `vytvoril` - ID tvůrce

**Return**: (string) `'APPROVER'` nebo `'SUBMITTER'`

**Logika**:
```php
if ($user_id == $order_data['prikazce_id']) return 'APPROVER';
if ($user_id == $order_data['garant_id']) return 'SUBMITTER';
if ($user_id == $order_data['vytvoril']) return 'SUBMITTER';
return 'APPROVER'; // default
```

---

## 🎨 Frontend (React)

### Aktuální stav
- **Soubor**: `apps/eeo-v2/client/src/pages/MailTestPanelV2.js`
- **Grid layout**: 2 sloupce (APPROVER | SUBMITTER)
- **Preview**: Dva iframes vedle sebe s barevným rozlišením

### Konstanty v kódu
```javascript
const TEST_HTML_TEMPLATE_APPROVER = `...`; // Červená šablona
const TEST_HTML_TEMPLATE_SUBMITTER = `...`; // Zelená šablona
```

### Placeholders
```javascript
{order_id}          // ID objednávky (12345)
{order_number}      // Evidenční číslo (O-0001/75030926/2025/PTN)
{predmet}           // Předmět objednávky
{user_name}         // Jméno autora/garanta
{approver_name}     // Jméno příkazce
{dodavatel_nazev}   // Název dodavatele
{financovani}       // Zdroj financování (LPIT1 - Spotřeba materiálu)
{amount}            // Cena s DPH (150 000 Kč)
{date}              // Datum vytvoření (07.12.2025)
```

---

## 🚀 Implementace do workflow (TODO)

### 1. Úprava `OrderForm25.js` - Akce "Odeslat ke schválení"

**Lokace**: `apps/eeo-v2/client/src/forms/OrderForm25.js`

**Současný stav**:
```javascript
// Při kliknutí na "Odeslat ke schválení"
const handleOdeslatKeSchvaleni = async () => {
  // Uložení objednávky do DB
  // Změna stavu na "Ke schválení"
  // ??? Odeslání notifikace ???
};
```

**Potřebná úprava**:
```javascript
const handleOdeslatKeSchvaleni = async () => {
  try {
    // 1. Ulož objednávku
    const orderResponse = await saveOrder();
    const orderId = orderResponse.id;
    
    // 2. Načti data objednávky pro email
    const orderData = await fetchOrderDetail(orderId);
    
    // 3. Připrav data pro notifikace
    const notificationData = {
      order_id: orderId,
      order_number: orderData.ev_cislo,
      predmet: orderData.predmet,
      dodavatel_nazev: orderData.dodavatel?.nazev,
      financovani: orderData.financovani_display, // LPIT1 - Spotřeba materiálu
      amount: formatCurrency(orderData.max_price_with_dph),
      date: new Date().toLocaleDateString('cs-CZ'),
      
      // Jména z DB
      user_name: orderData.garant?.cele_jmeno,
      approver_name: orderData.prikazce?.cele_jmeno,
      
      // IDs pro routing emailů
      recipients: [
        {
          user_id: orderData.prikazce_id,
          type: 'APPROVER',
          email: orderData.prikazce?.email
        },
        {
          user_id: orderData.garant_id,
          type: 'SUBMITTER',
          email: orderData.garant?.email
        }
      ]
    };
    
    // 4. Zavolej API pro odeslání notifikací
    await sendDualNotification(notificationData);
    
    showToast('✅ Objednávka odeslána ke schválení. Notifikace odeslány.', { type: 'success' });
    
  } catch (error) {
    console.error('❌ Chyba při odesílání:', error);
    showToast('Chyba při odesílání notifikací', { type: 'error' });
  }
};
```

### 2. Nový API endpoint: `sendDualNotification()`

**Lokace**: `apps/eeo-v2/client/src/services/` (nový soubor nebo existující `api25.js`)

```javascript
/**
 * Odešle dual-template email notifikace
 * @param {Object} data - Notifikační data
 * @param {number} data.order_id - ID objednávky
 * @param {Array} data.recipients - Seznam příjemců [{user_id, type, email}]
 * @param {Object} data placeholders - Všechny {placeholder} hodnoty
 */
export const sendDualNotification = async (data) => {
  const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
  
  const response = await fetch(`${API_BASE_URL}notifications/send-dual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      token: getToken(),
      username: getUsername(),
      notification_type: 'order_status_ke_schvaleni',
      order_id: data.order_id,
      recipients: data.recipients,
      placeholders: {
        order_id: data.order_id,
        order_number: data.order_number,
        predmet: data.predmet,
        dodavatel_nazev: data.dodavatel_nazev,
        financovani: data.financovani,
        amount: data.amount,
        date: data.date,
        user_name: data.user_name,
        approver_name: data.approver_name
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Chyba při odesílání notifikací');
  }
  
  return await response.json();
};
```

### 3. Backend API handler (PHP)

**Lokace**: `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php`

**Nová funkce**:
```php
function handle_notifications_send_dual($data) {
    require_once __DIR__ . '/email-template-helper.php';
    require_once __DIR__ . '/notifications.php';
    
    // Validace
    if (empty($data['notification_type']) || empty($data['recipients'])) {
        return ['status' => 'error', 'message' => 'Chybí povinné parametry'];
    }
    
    // Načti šablonu z DB
    $template = get_notification_template($data['notification_type']);
    if (!$template) {
        return ['status' => 'error', 'message' => 'Šablona nenalezena'];
    }
    
    $results = [];
    
    // Projdi všechny příjemce
    foreach ($data['recipients'] as $recipient) {
        $user_id = $recipient['user_id'];
        $recipient_type = $recipient['type']; // 'APPROVER' nebo 'SUBMITTER'
        $email = $recipient['email'];
        
        // Extrahuj správnou HTML šablonu
        $email_body = get_email_template_by_recipient(
            $template['email_body'], 
            $recipient_type
        );
        
        // Nahraď placeholdery
        $email_subject = $template['email_subject'];
        foreach ($data['placeholders'] as $key => $value) {
            $placeholder = '{' . $key . '}';
            $email_subject = str_replace($placeholder, $value, $email_subject);
            $email_body = str_replace($placeholder, $value, $email_body);
        }
        
        // Odešli email
        $sent = eeo_mail_send($email, $email_subject, $email_body, true);
        
        $results[] = [
            'user_id' => $user_id,
            'type' => $recipient_type,
            'email' => $email,
            'sent' => $sent
        ];
        
        // Ulož in-app notifikaci (zvoneček)
        save_in_app_notification([
            'user_id' => $user_id,
            'title' => str_replace('{order_number}', $data['placeholders']['order_number'], $template['app_title']),
            'message' => str_replace_placeholders($template['app_message'], $data['placeholders']),
            'type' => $data['notification_type'],
            'order_id' => $data['order_id']
        ]);
    }
    
    return [
        'status' => 'ok',
        'sent' => count(array_filter($results, fn($r) => $r['sent'])),
        'total' => count($results),
        'results' => $results
    ];
}
```

**Přidání do routingu**:
```php
// V hlavním api.php nebo handlers.php
if ($action === 'notifications/send-dual') {
    $result = handle_notifications_send_dual($requestData);
    echo json_encode($result);
    exit;
}
```

---

## 📝 Testovací checklist

### Backend test ✅
- [x] `test-dual-template.php` prošel
- [x] Extrakce APPROVER šablony funguje
- [x] Extrakce SUBMITTER šablony funguje
- [x] Detekce recipient_type funguje
- [x] Placeholdery se nahrazují správně

### Frontend test (TODO)
- [ ] MailTestPanelV2 zobrazuje obě šablony vedle sebe
- [ ] Načítání šablony z DB funguje
- [ ] Preview červené (APPROVER) šablony funguje
- [ ] Preview zelené (SUBMITTER) šablony funguje
- [ ] Tlačítko "Načíst testovací HTML šablonu" funguje

### Integrace do workflow (TODO)
- [ ] Nový API endpoint `/notifications/send-dual` implementován
- [ ] Frontend služba `sendDualNotification()` vytvořena
- [ ] OrderForm25.js volá API při akci "Odeslat ke schválení"
- [ ] Oba emaily (APPROVER + SUBMITTER) se odesílají
- [ ] In-app notifikace (zvoneček) fungují
- [ ] Test na reálné objednávce

---

## 🎨 Design šablon

### 🔴 APPROVER (Příkazce)
- **Nadpis**: "Nová objednávka ke schválení"
- **Gradient**: Červený (#dc2626 → #b91c1c)
- **Oslovení**: "Dobrý den {approver_name}"
- **Text**: "...čeká na Vaše schválení nová objednávka od uživatele {user_name}"
- **Tlačítko**: "Schválit / Zamítnout objednávku"
- **Podpis**: "Děkuji, {user_name}"

### 🟢 SUBMITTER (Autor/Garant)
- **Nadpis**: "Objednávka odeslána ke schválení"
- **Gradient**: Zelený (#059669 → #047857)
- **Oslovení**: "Dobrý den {user_name}"
- **Text**: "Vaše objednávka byla úspěšně odeslána ke schválení uživateli {approver_name}"
- **Tlačítko**: "Zobrazit objednávku"
- **Poznámka**: "O dalším průběhu schvalování budete informováni"

---

## 🔗 Odkazy na objednávku
```
https://erdms.zachranka.cz/order-form-25?edit={order_id}
```

---

## 📦 Závislosti

### Backend (PHP)
- `lib/email-template-helper.php` ✅
- `lib/mail.php` - funkce `eeo_mail_send()` ✅
- `lib/notifications.php` - funkce pro in-app notifikace

### Frontend (React)
- `AuthContext` - token, username
- `styled-components` - CSS komponenty
- Font Awesome icons

---

## 🐛 Known Issues & Notes

1. **Zpětná kompatibilita**: Pokud šablona neobsahuje delimitery, vrátí se celá (starý formát)
2. **Fallback**: Pokud SUBMITTER část chybí, použije se APPROVER jako fallback
3. **app_title a app_message**: Zůstávají beze změny (pro zvoneček notifikace)
4. **URL link**: Vždy vede na `/order-form-25?edit={order_id}` bez ohledu na typ příjemce

---

## 📚 Další kroky

1. ✅ **Databáze** - Dual šablona v DB
2. ✅ **Backend helper** - PHP funkce pro extrakci
3. ✅ **Test skript** - Ověření funkčnosti
4. 🔄 **Frontend API** - Implementace `sendDualNotification()`
5. 🔄 **Integrace** - Napojení na OrderForm25 workflow
6. 🔄 **Test na produkci** - Reálná objednávka

---

**Datum vytvoření**: 7. prosince 2025  
**Verze**: 1.0  
**Status**: Backend ✅ | Frontend 🔄 | Integrace ⏳
