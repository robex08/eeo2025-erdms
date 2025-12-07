# 📧 Mail Test Panel - Quick Reference

## 🎯 PŘEHLED

Nový tab **"Mail Test"** v DEBUG panelu pro testování emailového systému.

---

## ✅ CO JE HOTOVO

### Frontend
- ✅ Komponenta `MailTestPanel.js` vytvořena
- ✅ UI s formulářem (From, To, Subject, Body)
- ✅ Validace emailů a povinných polí
- ✅ API integrace s `/api/notify-email`
- ✅ Loading stavy a error handling
- ✅ Náhled emailu v reálném čase
- ✅ Předvyplněné testovací hodnoty
- ✅ Přidáno do DebugPanel.js jako nový tab

### Backend
- ✅ Endpoint `/api/notify-email` existuje
- ✅ Funkce `eeo_mail_send()` v `lib/mail.php`
- ✅ Konfigurace v `lib/mailconfig.php`
- ✅ Autentizace přes token

---

## 🚀 JAK POUŽÍT

1. **Otevřete DEBUG panel:**
   - Přihlaste se jako SUPERADMIN
   - Přejděte na `/debug`
   - Klikněte na tab **"Mail Test"**

2. **Odešlete testovací email:**
   - Formulář je předvyplněn testovacími hodnotami
   - Klikněte na "Odeslat email"
   - Zkontrolujte stav odesílání

3. **Ověřte doručení:**
   - Email by měl dorazit na `robert.holovsky@zachranka.cz`
   - Předmět: "test eRdms notifikace"

---

## ⚙️ KONFIGURACE

### Nastavení odesílatele

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mailconfig.php`

```php
<?php
return array(
    'from_email' => 'webmaster@zachranka.cz',
    'from_name'  => 'eRDMS Systém',
    'reply_to'   => 'podpora@zachranka.cz',
    'debug'      => false
);
```

**Nebo pomocí ENV:**

```bash
export MAIL_FROM='webmaster@zachranka.cz'
export MAIL_FROM_NAME='eRDMS Systém'
export MAIL_REPLY_TO='podpora@zachranka.cz'
```

---

## 📊 API ENDPOINT

**URL:** `POST /api/notify-email`

**Request:**
```json
{
  "token": "...",
  "username": "...",
  "to": "robert.holovsky@zachranka.cz",
  "subject": "test eRdms notifikace",
  "body": "Pozdrav ze systému",
  "from_email": "webmaster@zachranka.cz",
  "html": false
}
```

**Response (úspěch):**
```json
{
  "sent": true
}
```

**Response (chyba):**
```json
{
  "err": "Popis chyby"
}
```

---

## 🔍 TESTOVÁNÍ

### Test 1: Základní odeslání
- Použijte předvyplněné hodnoty
- Klikněte "Odeslat"
- Email by měl dorazit za pár sekund

### Test 2: Vlastní příjemce
- Změňte pole "To" na váš email
- Odešlete
- Ověřte doručení

### Test 3: HTML email
(Vyžaduje úpravu frontendu - změnit `html: false` na `html: true`)

---

## 📝 SOUBORY

### Vytvořené soubory:
```
apps/eeo-v2/client/
├── src/pages/
│   └── MailTestPanel.js          # Nová komponenta
└── docs/
    ├── MAIL-TEST-PANEL-SETUP.md  # Detailní dokumentace
    └── MAIL-TEST-PANEL-README.md # Tento soubor
```

### Upravené soubory:
```
apps/eeo-v2/client/src/pages/
└── DebugPanel.js                 # Přidán Mail Test tab
```

---

## ❓ NEJČASTĚJŠÍ DOTAZY

### Q: Email se neodeslal. Co dělat?

1. **Ověřte konfiguraci:**
   ```bash
   cat /apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mailconfig.php
   ```

2. **Zkontrolujte mail log:**
   ```bash
   tail -f /var/log/mail.log
   ```

3. **Ověřte sendmail:**
   ```bash
   which sendmail
   echo "Test" | mail -s "Test" test@example.com
   ```

### Q: Jak nastavit SMTP místo sendmail?

Viz dokumentace v `MAIL-TEST-PANEL-SETUP.md` sekce "Jak nastavit vlastní SMTP server"

### Q: Je to bezpečné?

Ano:
- ✅ Vyžaduje autentizaci (token)
- ✅ Validace vstupů
- ✅ Pouze pro SUPERADMIN

### Q: Jak to funguje s notifikacemi?

Mail Test Panel používá **stejný backend endpoint** jako notifikační systém (`/api/notify-email`). Je to testovací nástroj pro ověření emailového systému.

---

## 🎯 DALŠÍ KROKY

### Doporučené vylepšení:

1. **HTML editor** - možnost posílat HTML emaily s rich text editorem
2. **Přílohy** - podpora attachments
3. **Historie** - seznam odeslaných emailů
4. **Šablony** - uložené šablony pro časté zprávy
5. **CC/BCC** - podpora kopií

### Bezpečnostní vylepšení:

1. **Rate limiting** - omezení počtu emailů za minutu
2. **Logging** - audit log odeslaných emailů
3. **Whitelist** - povolené domény příjemců

---

## 📞 KONTAKT

**Vytvořeno:** 6. prosince 2025  
**Autor:** GitHub Copilot  
**Verze:** 1.0

**Dokumentace:** `docs/MAIL-TEST-PANEL-SETUP.md`

---

**✨ Mail Test Panel je připraven k použití!**
