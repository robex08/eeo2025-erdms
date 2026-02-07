# Uvítací Email Šablona - Dokumentace

**Datum:** 28. prosince 2025  
**Šablona:** Uvítací email pro nové uživatele EEO systému  
**Kompatibilita:** Outlook, Gmail, Apple Mail, Webové klienty

## 📧 Účel šablony

Šablona pro uvítání nových uživatelů do EEO systému s přihlašovacími údaji a instrukcemi.

## 🎨 Design Features

### Hlavní prvky:
- ✅ **Table-based layout** - 100% kompatibilita s Outlookem
- ✅ **Inline CSS** - Všechny styly přímo v elementech
- ✅ **Responsive** - Optimalizováno pro různé šířky obrazovky
- ✅ **Gradient headers** - Moderní design s fallback barvami
- ✅ **Barevné sekce** - Vizuální oddělení důležitých informací

### Barevná paleta:
- **Header:** `#3b82f6` → `#2563eb` (modrý gradient)
- **CTA tlačítko:** `#10b981` → `#059669` (zelený gradient)
- **Credentials box:** `#eff6ff` pozadí, `#3b82f6` border
- **Help box:** `#fef3c7` pozadí, `#f59e0b` border
- **Contacts:** `#f9fafb` pozadí, `#059669` akcenty

## 📝 Placeholders

```
{docasne_heslo}  - Dočasné heslo pro první přihlášení
{app_url}        - URL adresa aplikace (např. https://eeo.zachranka.cz)
```

## 📋 Sekce emailu

### 1. Header (Modrý gradient)
- Titulek "Vítejte v EEO systému"
- Podtitulek "Správa a workflow objednávek"

### 2. Úvodní text
- Pozdrav "Dobrý den"
- Informace o založení přístupu

### 3. Přihlašovací údaje (Modrý box)
- 📝 Nadpis sekce
- 🔑 Heslo (monospace font, červený text)
- ℹ️ Poznámka o dočasném heslu

### 4. CTA Tlačítko (Zelené)
- "🔵 Odkaz na aplikaci"
- Link na {app_url}

### 5. Jak začít (Šedý box)
- ✅ 4 kroky numbered list:
  1. Otevři aplikaci
  2. Přihlašte se
  3. Nastavte nové heslo
  4. Přečti nápovědu

### 6. Help Section (Žlutý box)
- Upozornění na nápovědu a kontakty

### 7. Kontakty a podpora (Zelený box)
- 💚 IT hotline – nonstop
  - Telefon: 731 137 100
  - Email: helpdesk@zachranka.cz
- Robert Holovský
  - Telefon: 731 137 077
  - Email: robert.holovsky@zachranka.cz

### 8. Footer
- Automatický email notice
- Copyright ZZS Středočeského kraje

## 🔧 Technické detaily

### Outlook kompatibilita:
- ✅ Table-based layout (ne flex/grid)
- ✅ Inline CSS (ne external stylesheets)
- ✅ Role="presentation" na všech tabulkách
- ✅ cellspacing="0" cellpadding="0" border="0"
- ✅ Width definované v pixelech
- ✅ Fallback fonty: Arial, Helvetica, sans-serif

### Gmail optimalizace:
- ✅ Max width 600px
- ✅ Padding pro mobile view
- ✅ Viewport meta tag

### Apple Mail:
- ✅ Correct DTD: HTML5
- ✅ Meta tags pro iOS

## 🧪 Testování

### Jak otestovat:
1. Otevřít debug panel: `/debug`
2. Přejít na tab "HTML Šablony"
3. Zadat testovací email
4. Kliknout "Náhled" - zobrazí šablonu v prohlížeči
5. Kliknout "Odeslat" - pošle na email

### Doporučené testy:
- [ ] Outlook 2016/2019/365 (Windows)
- [ ] Outlook.com (webový)
- [ ] Gmail (webový + mobile)
- [ ] Apple Mail (macOS + iOS)
- [ ] Thunderbird

## 📊 Použití v produkci

### Backend integrace:

```php
// Načtení šablony
$template_html = '...'; // HTML šablona

// Nahrazení placeholderů
$email_body = str_replace('{docasne_heslo}', $temporary_password, $template_html);
$email_body = str_replace('{app_url}', 'https://eeo.zachranka.cz', $email_body);

// Odeslání
eeo_mail_send($user_email, 'Váš přístup do EEO systému', $email_body, [
    'html' => true,
    'from_email' => 'webmaster@zachranka.cz',
    'from_name' => 'EEO Systém'
]);
```

## 🎯 Best Practices použité

1. **Semantické nadpisy** - H1 pro hlavní titulek
2. **Responsive padding** - 40px desktop, auto-adjust mobile
3. **Vysoký kontrast** - AA compliant barvy
4. **Klikatelné odkazy** - Telefony i emaily
5. **Emoji ikony** - Lepší čitelnost než obrazky
6. **Monospace pro heslo** - Jasné rozlišení znaků
7. **Gradient fallback** - Solid barva pro starší klienty

## 🚀 Další vylepšení (budoucnost)

- [ ] Dark mode varianta
- [ ] Personalizace (jméno uživatele)
- [ ] QR kód pro rychlý přístup
- [ ] Inline obrázky místo emoji
- [ ] Multi-language podpora

## 📝 Poznámky

- Šablona nepoužívá externí CSS soubory
- Všechny obrázky jsou nahrazeny emoji (lepší deliverability)
- Gradients s fallback pro starší email klienty
- Max šířka 600px - standard pro email marketing
