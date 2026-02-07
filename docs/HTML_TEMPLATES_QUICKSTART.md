# HTML Email Templates - Quick Start

## 🎯 Co to je?

Nová sekce v debug panelu pro vytváření, testování a odesílání HTML email šablon.

## 🚀 Jak na to?

### 1. Otevřít debug panel
```
http://localhost:5173/debug
```
*(Vyžaduje SUPERADMIN oprávnění)*

### 2. Přejít na tab "HTML Šablony"
Najdete ikonu `</>` s nápisem "HTML Šablony"

### 3. Testovat šablonu
1. Zadejte svůj email do pole nahoře
2. Klikněte na "👁️ Náhled" pro zobrazení šablony
3. Klikněte na "📧 Odeslat" pro odeslání na email

## 📧 Backend API

Endpoint: `/api.eeo/v2025.03_25/debug-mail.php`

**Request:**
```json
{
  "to": "test@example.com",
  "subject": "Test email",
  "html": "<div>HTML content</div>",
  "template_name": "Template Name"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Email byl úspěšně odeslán",
  "data": {
    "to": "test@example.com",
    "subject": "Test email",
    "template": "Template Name",
    "sent_at": "2025-12-28 10:30:00"
  }
}
```

## 🔧 Co bude v dalším kroku?

Budeme společně vytvářet **konkrétní HTML šablony** podle vašich potřeb:
- Šablony pro objednávky
- Šablony pro faktury
- Šablony pro notifikace
- Vlastní šablony podle potřeby

## 💡 Připraveno pro rozšíření

- ✏️ WYSIWYG editor
- 💾 Uložení do databáze
- 📊 Dynamické placeholders
- 🎨 Knihovna předpřipravených šablon
- 📝 Historie odeslaných emailů

## 📝 Poznámky

- Zatím pouze demo šablona pro otestování funkcionality
- Šablony se neukládají (in-memory)
- Debug hlavička se automaticky přidává k každému emailu

## ❓ Dotazy?

Ptejte se! Nyní jsme připraveni vytvářet **konkrétní šablony** podle vašich požadavků.
