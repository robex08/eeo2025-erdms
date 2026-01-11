# 🎯 Akční plán - Oprava HTML šablon pro Outlook kompatibilitu

**Datum:** 21. prosince 2025  
**Status:** 📊 Analýza dokončena  
**Priorita:** 🔴 VYSOKÁ

---

## 📊 AKTUÁLNÍ STAV

### Celkové statistiky:
- **Celkem šablon:** 48
- **Outlook kompatibilita:** 72.92% ✅
- **Šablony s kritickými problémy:** 13 ❌
- **Šablony vyžadující MSO podmínky:** 48 ⚠️

### ❌ Šablony s KRITICKÝMI problémy (CSS gradient + box-shadow):

1. `order_status_ceka_se` - Objednávka vrácena k doplnění
2. `order_status_dokoncena` - Objednávka dokončena
3. `order_status_faktura_pridana` - Faktura přidána k objednávce
4. `order_status_faktura_schvalena` - Faktura schválena
5. `order_status_ke_schvaleni` - Objednávka odeslána ke schválení
6. `order_status_kontrola_potvrzena` - Kontrola kvality potvrzena
7. `order_status_kontrola_zamitnuta` - Kontrola kvality zamítnuta
8. `order_status_nova` - Nová objednávka vytvořena
9. `order_status_odeslana` - Objednávka odeslána dodavateli
10. `order_status_potvrzena` - Objednávka potvrzena dodavatelem
11. `order_status_registr_ceka` - Objednávka čeká na zveřejnění
12. `order_status_schvalena` - Objednávka schválena
13. `order_status_zamitnuta` - Objednávka zamítnuta

---

## 🔧 PLÁN OPRAVY

### Fáze 1: RYCHLÁ OPRAVA (1-2 hodiny) 🚀
**Cíl:** Odstranit kritické problémy, které rozbíjejí šablony v Outlooku

#### Akce:
```sql
-- Spustit SQL skript pro automatickou opravu:
SOURCE /var/www/erdms-dev/_docs/scripts-sql/fix_email_templates_outlook_compatibility.sql;
```

**Co se opraví:**
- ✅ Nahrazení CSS gradientů solidními barvami
- ✅ Odstranění box-shadow (nahrazení borders)
- ✅ Základní Outlook kompatibilita

**Očekávaný výsledek:**
- Outlook kompatibilita: **~95%**
- Všechny šablony budou čitelné v Outlooku

---

### Fáze 2: KOMPLETNÍ PŘEPIS (6-8 hodin) 🎨
**Cíl:** Profesionální Outlook-optimalizované šablony

#### Priorita šablon k přepisu:
1. **VYSOKÁ priorita** (nejpoužívanější):
   - `order_status_ke_schvaleni` - Schvalovací workflow
   - `order_status_schvalena` - Schválení
   - `order_status_zamitnuta` - Zamítnutí
   - `order_status_nova` - Nová objednávka

2. **STŘEDNÍ priorita**:
   - `order_status_odeslana` - Dodavatelská komunikace
   - `order_status_potvrzena` - Potvrzení
   - `order_status_faktura_schvalena` - Fakturace

3. **NÍZKÁ priorita**:
   - Ostatní méně používané šablony

#### Technické požadavky pro přepis:
- ✅ Table-based layout (žádné DIV pro layout)
- ✅ Inline styly (žádné CSS v <head>)
- ✅ MSO podmínky pro Outlook-specific kód
- ✅ VML fallback pro tlačítka
- ✅ Web-safe fonty (Arial, sans-serif)
- ✅ HTML entity místo UTF-8 emotikonů
- ✅ Border místo box-shadow
- ✅ Solidní barvy místo gradientů

---

### Fáze 3: TESTOVÁNÍ (2-3 hodiny) 🧪

#### Test prostředí:
1. **Outlook Desktop** (MS Office 365)
2. **Outlook Web App** (OWA)
3. **Gmail** (web + mobile)
4. **Apple Mail** (Mac + iOS)
5. **Thunderbird**

#### Automatické testování:
```bash
# Spustit testovací skript:
bash /var/www/erdms-dev/_docs/scripts-shell/test_email_templates.sh
```

#### Manuální testování:
1. Poslat testovací email na Outlook 365 účet
2. Zkontrolovat zobrazení na desktop i mobile
3. Ověřit funkčnost CTA tlačítek
4. Zkontrolovat správné zobrazení českých znaků

---

## 📝 CHECKLIST PRO KAŽDOU ŠABLONU

### Před úpravou:
- [ ] Vytvořit zálohu šablony
- [ ] Identifikovat všechny placeholdery
- [ ] Poznamenat varianty (RECIPIENT, SUBMITTER, atd.)

### Při úpravě:
- [ ] Odstranit CSS gradienty → solidní barvy
- [ ] Odstranit box-shadow → borders
- [ ] Převést DIV layouty na TABLE
- [ ] Přidat MSO podmínky
- [ ] Přidat VML fallback pro tlačítka
- [ ] Změnit font-family na Arial, sans-serif
- [ ] Nahradit emotikony HTML entities (&#10004; místo ✅)
- [ ] Přidat xmlns:v a xmlns:o do <html> tagu

### Po úpravě:
- [ ] Validovat HTML
- [ ] Zkontrolovat všechny placeholdery
- [ ] Otestovat v Outlooku
- [ ] Otestovat v jiných klientech (Gmail, Apple Mail)
- [ ] Aktualizovat dt_updated timestamp

---

## 🛠️ NÁSTROJE A SKRIPTY

### 1. Analýza aktuálního stavu:
```bash
bash /var/www/erdms-dev/_docs/scripts-shell/test_email_templates.sh
```

### 2. Automatická rychlá oprava:
```bash
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025 < \
  /var/www/erdms-dev/_docs/scripts-sql/fix_email_templates_outlook_compatibility.sql
```

### 3. Export šablony z DB pro manuální úpravu:
```sql
SELECT email_telo FROM 25_notifikace_sablony 
WHERE typ = 'order_status_schvalena' 
INTO OUTFILE '/tmp/template_schvalena.html';
```

### 4. Import opravené šablony zpět do DB:
```sql
UPDATE 25_notifikace_sablony 
SET email_telo = LOAD_FILE('/tmp/template_schvalena_fixed.html'),
    dt_updated = NOW()
WHERE typ = 'order_status_schvalena';
```

---

## 📈 ČASOVÝ HARMONOGRAM

### Týden 1 (21.12. - 27.12.2025):
- **Den 1:** Fáze 1 - Rychlá oprava všech 13 kritických šablon
- **Den 2-3:** Fáze 2 - Přepis 4 vysokoprioritních šablon
- **Den 4:** Testování a úpravy

### Týden 2 (28.12. - 03.01.2026):
- **Den 1-3:** Přepis středneprioritních šablon
- **Den 4-5:** Finální testování a optimalizace

---

## 🎓 OUTLOOK BEST PRACTICES

### Co POUŽÍVAT:
- ✅ `<table>` pro layout
- ✅ Inline styly
- ✅ `border-collapse: collapse`
- ✅ `cellpadding="0" cellspacing="0"`
- ✅ Solidní barvy (`background-color: #059669`)
- ✅ Web-safe fonty (Arial, Verdana, Georgia)
- ✅ Padding (ne margin)
- ✅ HTML entities pro symboly (`&#10004;` místo ✅)
- ✅ MSO podmínky `<!--[if mso]>`
- ✅ VML pro kulaté tlačítka

### Co NEPOUŽÍVAT:
- ❌ CSS gradienty
- ❌ Box-shadow
- ❌ Flexbox, Grid
- ❌ Position (absolute, fixed)
- ❌ Float
- ❌ `<div>` pro layout
- ❌ CSS v `<style>` tagu
- ❌ Media queries (mají omezenou podporu)
- ❌ Web fonty (@font-face)
- ❌ SVG (nepodporováno)

---

## 📚 DOKUMENTACE A ODKAZY

### Vytvořené dokumenty:
1. [EMAIL_TEMPLATES_OUTLOOK_ANALYSIS.md](../EMAIL_TEMPLATES_OUTLOOK_ANALYSIS.md) - Detailní analýza
2. [FIXED_order_status_schvalena_outlook_compatible.html](../../templates/FIXED_order_status_schvalena_outlook_compatible.html) - Ukázková opravená šablona
3. [fix_email_templates_outlook_compatibility.sql](./fix_email_templates_outlook_compatibility.sql) - SQL skript
4. [test_email_templates.sh](../scripts-shell/test_email_templates.sh) - Testovací skript

### Externí zdroje:
- [Email on Acid - Outlook CSS Support](https://www.emailonacid.com/blog/article/email-development/outlook-rendering-issues)
- [Campaign Monitor - CSS Support Guide](https://www.campaignmonitor.com/css/)
- [Litmus - Email Client Support](https://www.litmus.com/help/email-clients/rendering-engines/)

---

## ✅ KRITÉRIA ÚSPĚCHU

### Minimální požadavky:
- [ ] Všechny šablony se správně zobrazují v MS Outlook 365
- [ ] Žádné "rozbitý" layout (neviditelné texty, překryvy)
- [ ] CTA tlačítka jsou funkční a viditelná
- [ ] České znaky se zobrazují korektně

### Optimální stav:
- [ ] 100% Outlook kompatibilita
- [ ] Jednotný design napříč všemi klienty
- [ ] MSO podmínky pro pokročilé funkce
- [ ] Profesionální vzhled srovnatelný s originálem

---

## 🔍 MONITORING A ÚDRŽBA

### Po nasazení sledovat:
- User reporty o problémech se zobrazením emailů
- Email delivery rates
- Click-through rates na CTA tlačítka
- Bounce rates

### Pravidelná údržba:
- Quarterly review šablon
- Testování při každé nové verzi Outlooku
- Update best practices

---

**Připravil:** GitHub Copilot AI  
**Datum:** 21. prosince 2025  
**Verze:** 1.0  
**Status:** ✅ Připraveno k realizaci
