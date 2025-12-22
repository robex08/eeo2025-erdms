---
agent: agent
name: EMAIL-SABLONY
model: Claude Sonnet 4.5 (copilot)
description: Tvorba a úprava HTML email šablon pro EEO V2 s důrazem na Outlook 365 kompatibilitu
priority: high
version: 1.1
last_updated: 2025-12-22
---

**DŮLEŽITÉ: Komunikuj vždy v češtině.**

---

# EMAIL ŠABLONY - HTML pro EEO V2

## 🔴 KRITICKÉ - VŽDY POUŽÍVAT DEV DATABÁZI!

**Databáze:**
```
Server:   10.3.172.11
Database: eeo2025-dev     ← POUZE DEV VERZE!
Table:    25_notifikace_sablony
Sloupec:  email_body_html
```

**Přístup:**
```
User:     erdms_user
Password: AhchohTahnoh7eim
```

⚠️ **NIKDY NEUPRAVUJ PŘÍMO PRODUKČNÍ DB (eeo2025)!**

---

## Přehled
Kompletní návod pro tvorbu a úpravu HTML email šablon pro systém EEO V2 s důrazem na **kompatibilitu s MS Outlook 365**.

## ⚠️ Kritická pravidla pro Outlook 365

### 1. Struktura - VŽDY používat tabulky
```html
<!-- ✅ SPRÁVNĚ - tabulkový layout -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
    <tr>
        <td>Obsah</td>
    </tr>
</table>

<!-- ❌ ŠPATNĚ - div layout -->
<div style="width: 600px;">Obsah</div>
```

### 2. Hlavní wrapper - Pevná šířka 600px
```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" 
       style="width: 600px; max-width: 600px; border-collapse: collapse;">
```

### 3. Header struktura - Vnořené tabulky pro centrování
```html
<tr>
    <td align="center" style="background-color: #059669; padding: 0; border-bottom: 4px solid #047857;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 30px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                        <tr>
                            <td align="center" style="padding: 0;">
                                <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; line-height: 1.2;">
                                    Nadpis bez ikony (jen text)
                                </h1>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </td>
</tr>
```

### 4. CSS pravidla

#### ✅ POVOLENO
- `background-color` (solid barvy)
- `color`
- `font-family: Arial, sans-serif`
- `font-size`, `font-weight`
- `padding`, `margin`
- `border` (solid pouze)
- `width` (na table elementech)
- `text-align`, `align` (atribut)

#### ❌ ZAKÁZÁNO
```css
/* NIKDY nepoužívat! */
background: linear-gradient(...);  /* Outlook nepodporuje */
box-shadow: ...;                   /* Ignorováno */
display: flex;                     /* Nefunguje */
display: grid;                     /* Nefunguje */
position: absolute;                /* Rozbije layout */
transform: ...;                    /* Nepodporováno */
```

### 5. Tlačítka - MSO Conditionals + VML

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 30px 0;">
    <tr>
        <td align="center">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" 
                href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" 
                style="height:48px;v-text-anchor:middle;width:320px;" 
                arcsize="10%" 
                stroke="f" 
                fillcolor="#059669">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                    Zobrazit objednávku
                </center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" 
               target="_blank" 
               style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif; border: 2px solid #047857; text-align: center; mso-hide: all;">
                👁 Zobrazit objednávku
            </a>
            <!--<![endif]-->
        </td>
    </tr>
</table>
```

### 6. Barevné schéma

| Typ | Barva | Dark | Použití |
|-----|-------|------|---------|
| **Success** | `#059669` | `#047857` | Schváleno, Dokončeno, Potvrzeno |
| **Warning** | `#f59e0b` | `#d97706` | Čeká, Upozornění |
| **Danger** | `#dc2626` | `#b91c1c` | Zamítnuto, Urgent |
| **Info** | `#3b82f6` | `#2563eb` | Nová, Informace |
| **Normal** | `#f97316` | `#fb923c` | Ke schválení (normal) |

### 7. Ikony

#### Subject - Ikony POVOLENY
```
ℹ️  - Informace (info pro submitera)
❗ - Pokyn, akce potřebná (normal)
⚡ - Urgent, vysoká priorita
✅ - Úspěch, potvrzení
❌ - Zamítnutí, chyba
📋 - Registr, dokumenty
💰 - Faktura
```

#### H1 Nadpis - Ikony ZAKÁZÁNY (s výjimkou)
```html
<!-- ✅ SPRÁVNĚ - čistý text -->
<h1>Objednávka schválena</h1>

<!-- ❌ ŠPATNĚ - ikona v nadpisu -->
<h1>✅ Objednávka schválena</h1>

<!-- ✅ VÝJIMKA - pouze URGENT verze KE_SCHVALENI -->
<h1>⚡ URGENTNÍ - KE SCHVÁLENÍ ⚡</h1>
```

### 8. MSO Conditionals

```html
<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml" 
      xmlns:v="urn:schemas-microsoft-com:vml" 
      xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <style type="text/css">
        body, table, td, p, a {font-family: Arial, sans-serif !important;}
        table {border-collapse: collapse !important;}
    </style>
    <![endif]-->
</head>
```

### 9. Placeholdery

```javascript
const placeholders = {
    '{recipient_name}': 'Jméno příjemce',
    '{order_number}': 'Číslo objednávky',
    '{predmet}': 'Předmět objednávky',
    '{strediska}': 'Střediska',
    '{financovani}': 'Zdroj financování',
    '{financovani_poznamka}': 'Poznámka k financování',
    '{amount}': 'Cena s DPH',
    '{date}': 'Datum vytvoření',
    '{order_id}': 'ID objednávky (pro URL)',
    '{approver_name}': 'Jméno schvalovatele',
    '{invoice_number}': 'Číslo faktury',
};
```

### 10. Footer - Standardní

```html
<tr>
    <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: Arial, sans-serif;">
            &copy; 2025 EEO V2 | Elektronická Evidence Objednávek
        </p>
    </td>
</tr>
```

## 📋 Checklist před commitem

- [ ] Šířka `width="600"` na hlavní tabulce
- [ ] Vnořené tabulky v headeru pro centrování
- [ ] Žádné `linear-gradient`, `box-shadow`
- [ ] Všechny styly inline
- [ ] MSO conditionals pro tlačítka
- [ ] VML roundrect pro Outlook
- [ ] `role="presentation"` na všech layout tabulkách
- [ ] `border="0" cellpadding="0" cellspacing="0"`
- [ ] Ikony POUZE v subjectu, NE v h1 (kromě URGENT)
- [ ] Copyright: `© 2025 EEO V2 | Elektronická Evidence Objednávek`
- [ ] Font: `Arial, sans-serif`

## 🔧 Testování

### Místní test
```bash
php test_template.php
```

### Outlook kontrola
1. Otevřít v Outlook 365 (desktop + web)
2. Zkontrolovat:
   - Header správně vycentrován
   - Barvy odpovídají
   - Tlačítka fungují
   - Width 600px
   - Žádné bílé prázdné oblasti

## 📁 Struktura v DB

```sql
-- Tabulka: 25_notifikace_sablony
SELECT 
    typ,                  -- order_status_schvalena
    email_predmet,        -- ℹ️ Objednávka {order_number} schválena
    email_telo,           -- HTML šablona
    dt_updated            -- Poslední změna
FROM 25_notifikace_sablony;
```

## 🚀 Workflow pro nové šablony

1. **Použít base template** z `order_status_ke_schvaleni`
2. **Změnit barvy** podle typu
3. **Upravit texty** (nadpis, greeting, button, footer)
4. **Odstranit ikony z h1** (kromě URGENT varianty)
5. **Zachovat strukturu** (vnořené tabulky, MSO conditionals)
6. **Testovat v Outlooku**
7. **Uložit do DB**

## ⚠️ Nejčastější chyby

### ❌ Rozbije Outlook
```html
<!-- Špatně - div wrapper -->
<div style="width: 600px; background: linear-gradient(...);">

<!-- Špatně - text-align na td bez vnořené tabulky -->
<td style="text-align: center;">
    <h1>Nadpis</h1>
</td>

<!-- Špatně - ikona v nadpisu -->
<h1>✅ Nadpis s ikonou</h1>
```

### ✅ Funguje správně
```html
<!-- Správně - table wrapper -->
<table width="600" style="border-collapse: collapse;">

<!-- Správně - vnořené tabulky pro centrování -->
<td align="center" style="padding: 0;">
    <table width="100%">
        <tr>
            <td align="center">
                <h1>Nadpis bez ikony</h1>
            </td>
        </tr>
    </table>
</td>

<!-- Správně - ikona v subjectu -->
Subject: ℹ️ Nadpis s ikonou
```

## 📚 Zdroje

- [Outlook CSS Support](https://www.campaignmonitor.com/css/style-attribute/style-in-head/)
- [VML Reference](https://docs.microsoft.com/en-us/windows/win32/vml/web-workshop---specs---standards----introduction-to-vector-markup-language--vml-)
- [Email on Acid - Outlook Guide](https://www.emailonacid.com/blog/article/email-development/outlook-rendering-issues/)

---

**Vytvořeno:** 22.12.2025  
**Autor:** Robert Holovský  
**Systém:** EEO V2 - Elektronická Evidence Objednávek
