# 📧 Mail Test Panel - Nastavení a použití

## 📋 PŘEHLED

Mail Test Panel v DEBUG sekci umožňuje testování odesílání emailů přímo z frontendu.

---

## 🔧 JAK TO FUNGUJE

### 1. **Backend API Endpoint**

Existující endpoint: `POST /notify-email`

**Vyžaduje:**
- Autentizaci (token + username)
- Parametry: `to`, `subject`, `body`

**Volitelné:**
- `html` (boolean) - zda je zpráva HTML
- `from_email` - vlastní odesílatel (přepíše config)
- `from_name` - jméno odesílatele
- `cc` - kopie
- `bcc` - skrytá kopie
- `reply_to` - odpovědět na

**Implementace:**
```
📂 /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/
   ├── handlers.php          → handle_notify_email()
   ├── mail.php              → eeo_mail_send()
   └── mailconfig.php        → konfigurace SMTP
```

---

## ⚙️ KONFIGURACE

### Produkční nastavení emailů

Upravte soubor: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mailconfig.php`

**Doporučené nastavení pro zachranka.cz:**

```php
<?php
return array(
    'from_email' => 'webmaster@zachranka.cz',
    'from_name'  => 'eRDMS Systém',
    'reply_to'   => 'podpora@zachranka.cz',
    'debug'      => false  // true jen pro testování
);
```

**Nebo pomocí environment proměnných:**

```bash
export MAIL_FROM='webmaster@zachranka.cz'
export MAIL_FROM_NAME='eRDMS Systém'
export MAIL_REPLY_TO='podpora@zachranka.cz'
export MAIL_DEBUG='false'
```

---

## 🚀 POUŽITÍ MAIL TEST PANELU

### 1. Otevření panelu

1. Přihlaste se jako **SUPERADMIN**
2. Přejděte do **DEBUG Panel** (`/debug`)
3. Vyberte tab **Mail Test**

### 2. Předvyplněné hodnoty

Panel je předvyplněn testovacími hodnotami:
- **From:** webmaster@zachranka.cz
- **To:** robert.holovsky@zachranka.cz
- **Předmět:** test eRdms notifikace
- **Zpráva:** Pozdrav ze systému

### 3. Odeslání emailu

1. Zkontrolujte/upravte hodnoty
2. Klikněte na **"Odeslat email"**
3. Systém zobrazí:
   - ⏳ Loading stav při odesílání
   - ✅ Zelené potvrzení při úspěchu
   - ❌ Červené upozornění při chybě

### 4. Náhled emailu

Při vyplnění se automaticky zobrazí náhled:
- Formát emailu (From, To, Subject, Body)
- Jak bude email vypadat po odeslání

---

## 📊 API VOLÁNÍ (FRONTEND)

### Současná implementace v `MailTestPanel.js`:

```javascript
const handleSend = async () => {
  // Validace
  if (!formData.to || !formData.subject || !formData.body) {
    setStatus('error');
    setMessage('Prosím vyplňte všechna povinná pole');
    return;
  }

  setStatus('loading');

  try {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const response = await fetch('/api/notify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
        from_email: formData.from,
        html: false  // plain text
      })
    });

    const data = await response.json();

    if (response.ok && data.sent) {
      setStatus('success');
      setMessage(`Email úspěšně odeslán na ${formData.to}`);
    } else {
      throw new Error(data.err || 'Neznámá chyba');
    }

  } catch (error) {
    setStatus('error');
    setMessage(`Chyba při odesílání: ${error.message}`);
  }
};
```

---

## 🔍 TESTOVÁNÍ

### Test 1: Základní odeslání

1. Použijte výchozí hodnoty
2. Klikněte "Odeslat"
3. **Očekávaný výsledek:**
   - Email dorazí na robert.holovsky@zachranka.cz
   - Předmět: "test eRdms notifikace"
   - Text: "Pozdrav ze systému"

### Test 2: HTML email

Upravte frontend pro HTML:

```javascript
body: JSON.stringify({
  // ...
  body: '<h1>Test HTML</h1><p>Pozdrav ze systému</p>',
  html: true
})
```

### Test 3: CC/BCC

```javascript
body: JSON.stringify({
  // ...
  cc: ['kopie@zachranka.cz'],
  bcc: ['skryta@zachranka.cz']
})
```

---

## ❓ DOTAZY A ODPOVĚDI

### Q: Jaký SMTP server se používá?

**A:** Používá se **nativní PHP `mail()` funkce**, která využívá:
- **Linux:** Sendmail/Postfix (nastavený na serveru)
- **Windows:** SMTP server z `php.ini`

**Konfigurace na serveru (Linux):**
```bash
# Ověření sendmail
which sendmail
# /usr/sbin/sendmail

# Test odesílání
echo "Test email" | mail -s "Test Subject" test@example.com
```

### Q: Proč nepoužíváte PHPMailer se SMTP?

**A:** Projekt běží na **PHP 5.6** a používá jednoduchou implementaci přes `mail()`.

**Pokud chcete přejít na SMTP (doporučeno pro produkci):**

1. Nainstalujte PHPMailer 5.x (kompatibilní s PHP 5.6)
2. Upravte `mail.php` pro SMTP
3. Přidejte SMTP konfiguraci do `mailconfig.php`:

```php
return array(
    'smtp_enabled' => true,
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_username' => 'your-email@gmail.com',
    'smtp_password' => 'app-specific-password',
    'smtp_encryption' => 'tls',
    // ...
);
```

### Q: Jak nastavit vlastní SMTP server?

**A:** Vytvoření SMTP varianty mail funkce:

**Soubor: `/api.eeo/v2025.03_25/lib/mail-smtp.php`**

```php
<?php
require 'vendor/autoload.php'; // PHPMailer 5.x

use PHPMailer\PHPMailer\PHPMailer;

function eeo_mail_send_smtp($to, $subject, $body, $options = array()) {
    $cfg = require __DIR__ . '/mailconfig.php';
    
    $mail = new PHPMailer();
    $mail->isSMTP();
    $mail->Host = $cfg['smtp_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $cfg['smtp_username'];
    $mail->Password = $cfg['smtp_password'];
    $mail->SMTPSecure = $cfg['smtp_encryption'];
    $mail->Port = $cfg['smtp_port'];
    $mail->CharSet = 'UTF-8';
    
    $mail->setFrom($cfg['from_email'], $cfg['from_name']);
    $mail->addAddress($to);
    $mail->Subject = $subject;
    
    if (isset($options['html']) && $options['html']) {
        $mail->isHTML(true);
        $mail->Body = $body;
        $mail->AltBody = strip_tags($body);
    } else {
        $mail->Body = $body;
    }
    
    if ($mail->send()) {
        return array('ok' => true);
    } else {
        return array('ok' => false, 'error' => $mail->ErrorInfo);
    }
}
```

### Q: Jak ověřit, že email byl odeslán?

**A:** Backend vrací:

```json
{
  "sent": true
}
```

**Kontrola logů na serveru:**

```bash
# Mail log
tail -f /var/log/mail.log

# Apache error log
tail -f /var/log/apache2/error.log
```

### Q: Jsou emaily zabezpečené?

**A:** Ano:
- ✅ Vyžaduje autentizaci (token)
- ✅ Validace emailových adres
- ✅ Sanitizace vstupů (základní)
- ⚠️ **Pro produkci doporučujeme:** Rate limiting, SPF/DKIM/DMARC

### Q: Jaký formát emailu podporujete?

**A:** 
- ✅ Plain text (default)
- ✅ HTML (`html: true`)
- ✅ Přílohy (přes `attachments` array)
- ✅ CC/BCC
- ✅ Custom Reply-To

---

## 🛠️ IMPLEMENTACE DO FRONTENDU

### Nutné úpravy v `MailTestPanel.js`:

```javascript
const handleSend = async () => {
  // Validace
  if (!formData.to || !formData.subject || !formData.body) {
    setStatus('error');
    setMessage('Prosím vyplňte všechna povinná pole');
    return;
  }

  // Validace emailu
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.to)) {
    setStatus('error');
    setMessage('Neplatná emailová adresa');
    return;
  }

  setStatus('loading');
  setMessage('');

  try {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (!token || !username) {
      throw new Error('Nejste přihlášeni');
    }

    const response = await fetch('/api/notify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
        from_email: formData.from,
        html: false
      })
    });

    const data = await response.json();

    if (response.ok && data.sent) {
      setStatus('success');
      setMessage(`Email úspěšně odeslán na ${formData.to}`);
      
      // Reset po 3 sekundách
      setTimeout(() => {
        setFormData({
          to: 'robert.holovsky@zachranka.cz',
          subject: 'test eRdms notifikace',
          body: 'Pozdrav ze systému',
          from: 'webmaster@zachranka.cz'
        });
        setStatus(null);
        setMessage('');
      }, 3000);

    } else {
      throw new Error(data.err || data.message || 'Neznámá chyba');
    }

  } catch (error) {
    setStatus('error');
    setMessage(`Chyba při odesílání: ${error.message}`);
  }
};
```

---

## 📝 CHECKLIST IMPLEMENTACE

### Backend (již hotovo ✅)
- [x] API endpoint `/notify-email` existuje
- [x] Funkce `eeo_mail_send()` implementována
- [x] Konfigurace `mailconfig.php` připravena
- [x] Validace tokenů a autorizace

### Frontend (vyžaduje dokončení)
- [x] Komponenta `MailTestPanel.js` vytvořena
- [x] UI design a formulář hotový
- [ ] **API volání - POTŘEBUJE IMPLEMENTACI** ⚠️
- [ ] Error handling
- [ ] Loading states

### Konfigurace (vyžaduje nastavení)
- [ ] Nastavit produkční SMTP v `mailconfig.php`
- [ ] Otestovat odesílání na reálné adresy
- [ ] Ověřit, že maily nedorazí do SPAM
- [ ] Nastavit SPF/DKIM/DMARC záznamy (DNS)

---

## 🚦 DOPORUČENÍ PRO PRODUKCI

### 1. **Environment proměnné**
Nastavte v `/etc/apache2/envvars` nebo `.htaccess`:

```bash
SetEnv MAIL_FROM "webmaster@zachranka.cz"
SetEnv MAIL_FROM_NAME "eRDMS Systém"
SetEnv MAIL_REPLY_TO "podpora@zachranka.cz"
SetEnv MAIL_DEBUG "false"
```

### 2. **Rate Limiting**
Přidejte ochranu proti spamu:

```php
// V handlers.php před voláním eeo_mail_send()
$rate_limit = check_email_rate_limit($token_data['username']);
if (!$rate_limit['ok']) {
    api_error(429, 'Příliš mnoho emailů za krátkou dobu', 'RATE_LIMIT_EXCEEDED');
    return;
}
```

### 3. **Logging**
Přidejte logování odeslaných emailů:

```php
// Po úspěšném odeslání
log_email_sent(array(
    'user_id' => $token_data['user_id'],
    'to' => $to,
    'subject' => $subject,
    'timestamp' => date('Y-m-d H:i:s')
));
```

### 4. **Monitoring**
Sledujte:
- Počet odeslaných emailů
- Chybovost odesílání
- Bounce rate (odmítnuté emaily)

---

## 🎯 ZÁVĚR

Mail Test Panel je **připraven k použití** po implementaci API volání do frontendu.

**Co funguje:**
✅ Backend endpoint
✅ UI komponenta
✅ Validace formuláře
✅ Předvyplněné hodnoty

**Co je třeba doprogramovat:**
⚠️ Skutečné API volání v `handleSend()`
⚠️ Produkční konfigurace SMTP

**Časová náročnost dokončení:** ~30 minut

---

**Autor:** GitHub Copilot  
**Datum:** 6. prosince 2025  
**Verze:** 1.0
