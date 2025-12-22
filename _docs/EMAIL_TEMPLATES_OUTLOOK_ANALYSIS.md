# Analýza HTML Šablon - Problémy s MS Outlook 365

## 📋 Executive Summary

**Datum analýzy:** 21. prosince 2025  
**Analyzované šablony:** Email notifikace z tabulky `25_notifikace_sablony`  
**Problém:** HTML šablony se rozbíjejí v MS 365 Outlook, ale fungují v jiných klientech (Gmail, Apple Mail, atd.)

## 🔍 Identifikované problémy

### 1. ❌ KRITICKÉ: CSS Gradient v inline stylech
**Lokace:** Header a CTA tlačítka v KAŽDÉ šabloně

```html
<!-- PROBLÉM -->
<td style="background: linear-gradient(135deg, #059669, #047857); padding: 30px;">

<a href="..." style="background: linear-gradient(135deg, #059669, #047857); ...">
```

**Důvod:** Outlook (MS Word engine) **NEPODPORUJE** CSS gradienty. Ignoruje je úplně nebo vykreslí špatně.

**Dopad:** 
- Headers jsou neviditelné nebo bílé
- Tlačítka CTA jsou neviditelná
- Šablona vypadá rozbitě

---

### 2. ❌ KRITICKÉ: Box-shadow
**Lokace:** Hlavní container a tlačítka

```html
<!-- PROBLÉM -->
<table style="box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); ...">
<a style="box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3); ...">
```

**Důvod:** Outlook **NEPODPORUJE** `box-shadow`.

**Dopad:**
- Chybí stíny (estetický problém, ne kritický)

---

### 3. ❌ VYSOKÁ PRIORITA: Border-radius na table elementech
**Lokace:** Hlavní container tabulky

```html
<!-- PROBLÉM -->
<table style="border-radius: 8px; overflow: hidden;">
```

**Důvod:** Outlook má **OMEZENOU** podporu `border-radius` na `<table>`. Funguje lépe na `<td>`.

**Dopad:**
- Šablona má ostré rohy místo zaoblených
- `overflow: hidden` nefunguje v Outlooku

---

### 4. ⚠️ STŘEDNÍ PRIORITA: Použití <div> elementů
**Lokace:** Info boxy a karty s detaily

```html
<!-- PROBLÉM -->
<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px;">
```

**Důvod:** Outlook preferuje **TABULKY** pro layout, ne `<div>`. Divy mohou způsobit problémy s renderingem.

**Dopad:**
- Nekonzistentní layout
- Možné problémy s paddingem/marginem

---

### 5. ⚠️ STŘEDNÍ PRIORITA: Meta viewport
**Lokace:** <head> všech šablon

```html
<!-- PROBLÉM -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**Důvod:** Outlook **IGNORUJE** viewport meta tag. Nemá smysl ho tam mít.

**Dopad:**
- Žádný (ale zaneřáďuje kód)

---

### 6. ⚠️ NÍZKÁ PRIORITA: Moderní font-family stack
**Lokace:** Body a všechny elementy

```html
<!-- MOŽNÝ PROBLÉM -->
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Důvod:** Outlook preferuje **webové bezpečné fonty**. Toto většinou funguje, ale je zbytečně komplexní.

**Dopad:**
- Minimální (Arial/sans-serif funguje jako fallback)

---

### 7. ⚠️ NÍZKÁ PRIORITA: Emotikony v textu
**Lokace:** Nadpisy a CTA tlačítka

```html
<!-- MOŽNÝ PROBLÉM -->
✅ Objednávka schválena
👁️ Zobrazit schválenou objednávku
```

**Důvod:** Starší verze Outlooku mohou emotikony špatně zobrazit (záleží na kódování).

**Dopad:**
- Emotikony se zobrazí jako "□" nebo jiné symboly
- Moderní Outlook (Office 365) to většinou zvládne

---

## 🔧 NÁVRH ŘEŠENÍ

### Řešení 1: Odstranění gradientů → Použití solidních barev

**PŘED:**
```html
<td style="background: linear-gradient(135deg, #059669, #047857); padding: 30px;">
```

**PO:**
```html
<td style="background-color: #059669; padding: 30px;">
```

**Alternativa - MSO podmínky (pokud chceme gradienty zachovat pro jiné klienty):**
```html
<td style="background: linear-gradient(135deg, #059669, #047857); padding: 30px;">
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:100px;">
        <v:fill type="gradient" color="#059669" color2="#047857" angle="135" />
        <v:textbox inset="30px,30px,30px,30px">
    <![endif]-->
    
    <!-- Obsah -->
    
    <!--[if mso]>
        </v:textbox>
    </v:rect>
    <![endif]-->
</td>
```

**Doporučení:** Použít **solidní barvy** - jednodušší a spolehlivější.

---

### Řešení 2: Odstranění box-shadow

**PŘED:**
```html
<table style="box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px;">
```

**PO:**
```html
<table style="border-radius: 8px; border: 1px solid #e5e7eb;">
```

**Doporučení:** Nahradit `box-shadow` tenkým `border` pro vizuální oddělení.

---

### Řešení 3: Border-radius na <td> místo <table>

**PŘED:**
```html
<table style="border-radius: 8px; overflow: hidden;">
    <tr>
        <td style="background: #059669;">Header</td>
    </tr>
</table>
```

**PO:**
```html
<table style="border: 0; border-collapse: collapse;">
    <tr>
        <td style="background-color: #059669; border-radius: 8px 8px 0 0;">Header</td>
    </tr>
</table>
```

---

### Řešení 4: Převést <div> na <table>

**PŘED:**
```html
<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px;">
    <h2>Detaily objednávky</h2>
    <p>Obsah...</p>
</div>
```

**PO:**
```html
<table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">
    <tr>
        <td style="padding: 20px;">
            <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">Detaily objednávky</h2>
            <p style="margin: 0; color: #374151; font-size: 14px;">Obsah...</p>
        </td>
    </tr>
</table>
```

---

### Řešení 5: Odstranit zbytečné meta tagy

**PŘED:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Objednávka schválena</title>
</head>
```

**PO:**
```html
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Objednávka schválena</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
```

---

## 📝 KOMPLETNÍ OUTLOOK-COMPATIBLE ŠABLONA

```html
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Objednávka schválena</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <!-- Outer wrapper -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main container -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #059669; padding: 30px; text-align: center; border-bottom: 4px solid #047857;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                                &#10004; Objednávka schválena
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Dobrý den <strong>{recipient_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                                vaše objednávka byla <strong>úspěšně schválena</strong> uživatelem <strong>{trigger_user_name}</strong>.
                            </p>
                            
                            <!-- Order Details Card -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f0fdf4; border: 1px solid #bbf7d0; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">
                                            Detaily schválené objednávky
                                        </h2>
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Číslo objednávky:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{order_number}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Předmět:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{predmet}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Cena s DPH:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 16px; font-weight: 700;">{amount}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Schválil:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{trigger_user_name}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-weight: 600; color: #4b5563; font-size: 14px;">Datum:</td>
                                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">{approval_date}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="13%" fillcolor="#059669">
                                            <w:anchorlock/>
                                            <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">Zobrazit objednávku</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        
                                        <!--[if !mso]><!-->
                                        <a href="https://erdms.zachranka.cz/eeo-v2/order-form-25?edit={order_id}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: 600; border: 1px solid #047857;">Zobrazit objednávku</a>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                Tento e-mail byl automaticky vygenerován systémem EEO.<br>
                                Nyní můžete pokračovat v dalších krocích objednávkového procesu.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                &copy; 2025 EEO | Systém řízení objednávek
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 🎯 AKČNÍ PLÁN

### Fáze 1: Okamžité kritické opravy (priorita VYSOKÁ)
1. **Odstranit všechny CSS gradienty** → Nahradit solidními barvami
2. **Odstranit box-shadow** → Nahradit borders
3. **Převést DIV layouty na TABLE** → Pro lepší kompatibilitu

### Fáze 2: Optimalizace (priorita STŘEDNÍ)
4. **Upravit border-radius použití** → Aplikovat na TD místo TABLE
5. **Odstranit meta viewport** → Nemá efekt v email klientech
6. **Přidat MSO podmínky** → Pro Outlook-specific styling

### Fáze 3: Testování (priorita VYSOKÁ)
7. **Otestovat v Litmus/Email on Acid** → Ověřit rendering v různých verzích Outlooku
8. **Manuální test** → Poslat testovací email do MS 365 Outlook
9. **Zpětná vazba od uživatelů** → Sbírat reporty o problémech

---

## 🛠️ SQL SCRIPT PRO AKTUALIZACI ŠABLON

```sql
-- POZNÁMKA: Toto je UKÁZKA, je potřeba vytvořit kompletní Outlook-compatible šablony pro všechny typy

-- Před aktualizací vytvořit zálohu
CREATE TABLE 25_notifikace_sablony_backup_20251221 AS SELECT * FROM 25_notifikace_sablony;

-- Aktualizace šablony order_status_schvalena
UPDATE 25_notifikace_sablony 
SET email_telo = '[VLOžIT OUTLOOK-COMPATIBLE HTML]',
    dt_updated = NOW()
WHERE typ = 'order_status_schvalena';

-- Stejně postupovat pro všechny ostatní šablony
```

---

## 📊 SEZNAM ŠABLON K OPRAVĚ

Z databáze `25_notifikace_sablony`:

1. ✅ `order_status_nova` - Nová objednávka vytvořena
2. ✅ `order_status_ke_schvaleni` - Objednávka odeslána ke schválení
3. ✅ `order_status_schvalena` - Objednávka schválena
4. ✅ `order_status_zamitnuta` - Objednávka zamítnuta
5. ✅ `order_status_ceka_se` - Objednávka vrácena k doplnění
6. ✅ `order_status_odeslana` - Objednávka odeslána dodavateli
7. ✅ `order_status_potvrzena` - Objednávka potvrzena dodavatelem
8. ✅ `order_status_kontrola_potvrzena` - Kontrola kvality potvrzena
9. ✅ `order_status_kontrola_zamitnuta` - Kontrola kvality zamítnuta
10. ✅ `order_status_faktura_schvalena` - Faktura schválena

**VŠECHNY šablony obsahují stejné problémy a potřebují stejné opravy!**

---

## 🔗 ODKAZY A ZDROJE

### Outlook Email Rendering
- [Email on Acid - Outlook CSS Support](https://www.emailonacid.com/blog/article/email-development/outlook-rendering-issues)
- [Campaign Monitor - CSS Support](https://www.campaignmonitor.com/css/style-element/style-in-head/)
- [Litmus - Email Client CSS Support](https://www.litmus.com/resources/email-client-css-support)

### Best Practices
- **VŽDY používat tabulky** pro layout v emailech
- **Inline styly** jsou povinné
- **Solidní barvy** místo gradientů
- **Outlook podmínky** `<!--[if mso]>` pro specifické styly
- **Webově bezpečné fonty** (Arial, Verdana, Georgia, Times New Roman)

---

## ✅ ZÁVĚR

**Hlavní příčina problémů:**
- Použití moderního CSS (gradienty, box-shadow, flexbox-like struktury)
- Outlook používá MS Word rendering engine, který má omezenou CSS podporu

**Řešení:**
- Přepsat všechny šablony do "table-based layout"
- Odstranit nekompatibilní CSS vlastnosti
- Použít pouze Outlook-friendly CSS
- Přidat MSO podmínky pro lepší rendering

**Časová náročnost:**
- Oprava 1 šablony: ~30-45 minut
- Celkem 10 šablon: ~6-8 hodin práce
- Testování: +2-3 hodiny

**Doporučení:**
1. Začít s nejpoužívanějšími šablonami (`order_status_schvalena`, `order_status_ke_schvaleni`)
2. Vytvořit master template a z něj derivovat ostatní
3. Provést důkladné testování před nasazením do produkce
