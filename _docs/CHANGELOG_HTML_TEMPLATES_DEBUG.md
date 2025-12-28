# HTML Templates Debug Panel - Changelog

**Datum:** 28. prosince 2025  
**Autor:** GitHub Copilot  
**Branch:** feature/generic-recipient-system

## 📋 Přehled změn

Přidána nová sekce do debug panelu pro správu a testování HTML email šablon s možností odeslání na testovací emailovou adresu.

## ✨ Nové funkce

### 1. Nový tab "HTML Šablony" v debug panelu

**Umístění:** Debug Panel → HTML Šablony tab

**Funkce:**
- 📝 Seznam HTML email šablon
- 👁️ Náhled šablon přímo v prohlížeči
- 📧 Odeslání šablony na testovací email
- ✅ Zpětná vazba o úspěšném/neúspěšném odeslání

### 2. Backend endpoint pro odeslání emailů

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/debug-mail.php`

**Funkcionalita:**
- Příjem POST požadavku s HTML šablonou
- Validace email adresy
- Přidání debug hlavičky k emailu
- Odeslání přes SMTP pomocí `eeo_mail_send()`
- Bezpečnostní kontroly (pouze POST, CORS pro development)

## 🔧 Technické změny

### Frontend změny (`DebugPanel.js`)

```javascript
// Nový import
import { faCode } from '@fortawesome/free-solid-svg-icons';

// Nový tab
<Tab $active={activeTab === 'html-templates'}>
  <FontAwesomeIcon icon={faCode} />
  HTML Šablony
</Tab>

// Nový komponent HtmlTemplatesPanel
const HtmlTemplatesPanel = () => {
  // State pro šablony, email, odesílání
  // Funkce pro náhled a odeslání
  // UI s formulářem a seznamem šablon
}
```

### Backend endpoint (`debug-mail.php`)

```php
// Endpoint features
- POST only
- CORS enabled for development
- JSON input/output
- Email validation
- Integration with eeo_mail_send()
- Debug header addition
```

## 📁 Struktura šablony

```javascript
{
  id: 1,
  name: 'Název šablony',
  subject: 'Předmět emailu',
  html: '<div>HTML obsah</div>'
}
```

## 🎯 Použití

1. **Otevřít debug panel:** `/debug` (vyžaduje SUPERADMIN oprávnění)
2. **Přejít na tab:** "HTML Šablony"
3. **Zadat testovací email:** Do pole nahoře
4. **Náhled šablony:** Klik na "👁️ Náhled"
5. **Odeslat email:** Klik na "📧 Odeslat"

## 🔐 Bezpečnost

- ✅ Debug panel dostupný pouze pro SUPERADMIN
- ✅ Email validace na FE i BE
- ✅ POST only endpoint
- ✅ JSON input/output
- ⚠️ CORS povoleno pro development (upravit pro production!)

## 📧 Email konfigurace

Debug emaily používají:
- **From:** webmaster@zachranka.cz
- **From Name:** eRDMS Debug Panel
- **SMTP:** akp-it-smtp01.zzssk.zachranka.cz:25

Každý debug email obsahuje hlavičku:
```
🧪 DEBUG EMAIL
Šablona: [název]
Odesláno: [datum]
Z debug panelu eRDMS
```

## 🚀 Další kroky (připraveno)

Struktura je připravena pro:
1. ✏️ Editor šablon (WYSIWYG)
2. 📊 Placeholder preview
3. 💾 Uložení šablon do DB
4. 📋 Import/export šablon
5. 🎨 Výběr z předpřipravených šablon
6. 📝 Historie odeslaných emailů

## 🧪 Testování

### Test odeslání emailu:
1. Otevřít `/debug` → HTML Šablony
2. Zadat svůj email
3. Kliknout "Odeslat" u testovací šablony
4. Zkontrolovat doručení emailu

### Test náhledu:
1. Kliknout "Náhled" u šablony
2. Zkontrolovat vykreslení HTML
3. Zavřít náhled tlačítkem "✕ Zavřít"

## 📝 Poznámky

- Pro produkci upravit CORS nastavení v `debug-mail.php`
- Šablony jsou zatím uloženy pouze v komponentě (in-memory)
- Připraveno pro rozšíření o databázové uložení
- Debug panel je pouze pro vývoj a testování

## 🐛 Známé limitace

- Šablony se neukládají po refresh stránky
- Zatím pouze jedna demo šablona
- Bez editoru šablon (připraveno pro další krok)

## 📚 Související soubory

- `/apps/eeo-v2/client/src/pages/DebugPanel.js` - Frontend komponent
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/debug-mail.php` - Backend endpoint
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/mail.php` - Mail helper

## ✅ Status

- [x] Frontend komponent vytvořen
- [x] Backend endpoint vytvořen
- [x] Základní funkcionalita funguje
- [ ] Editor šablon (další krok)
- [ ] Databázové uložení (další krok)
- [ ] Historie odeslaných emailů (další krok)
