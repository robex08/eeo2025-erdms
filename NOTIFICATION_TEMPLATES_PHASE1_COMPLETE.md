# ✅ Notification Templates - Phase 1 COMPLETE

## Datum dokončení: 15. prosince 2025

## Co bylo vytvořeno

### 1. HTML Šablony (3 ks)
✅ `/var/www/erdms-dev/templates/order_status_schvalena.html` (14 066 bytes)
- Varianta RECIPIENT: Zelený gradient (#059669), email pro tvůrce objednávky
- Varianta SUBMITTER: Modrý gradient (#3b82f6), email pro schvalovatele

✅ `/var/www/erdms-dev/templates/order_status_zamitnuta.html` (13 981 bytes)
- Varianta RECIPIENT: Červený gradient (#dc2626), email pro tvůrce objednávky
- Varianta SUBMITTER: Oranžový gradient (#f97316), email pro zamítajícího

✅ `/var/www/erdms-dev/templates/order_status_ceka_se.html` (14 107 bytes)
- Varianta RECIPIENT: Oranžový gradient (#f97316), email pro tvůrce objednávky
- Varianta SUBMITTER: Modrý gradient (#3b82f6), email pro vracejícího

### 2. Databázové aktualizace
✅ Šablony úspěšně nahrány do tabulky `25_notification_templates`:
- ID 3: `order_status_schvalena` - Aktualizováno 2025-12-15 23:11:32
- ID 4: `order_status_zamitnuta` - Aktualizováno 2025-12-15 23:11:32
- ID 5: `order_status_ceka_se` - Aktualizováno 2025-12-15 23:11:32

Všechny 3 šablony:
- ✅ Obsahují kompletní HTML s oběma variantami (RECIPIENT + SUBMITTER)
- ✅ Mají správně nastavené `email_subject` s emoji a placeholdery
- ✅ Mají `app_title` a `app_message` pro in-app notifikace
- ✅ Jsou aktivní (`active = 1`)
- ✅ Mají správnou prioritu (`priority_default`)

### 3. SQL Skripty
✅ `/var/www/erdms-dev/generate-notification-sql-phase1.php`
- PHP generátor SQL skriptů
- Automaticky escapuje HTML pro MySQL
- Generuje UPDATE statements včetně verifikačních dotazů

✅ `/var/www/erdms-dev/UPDATE_NOTIFICATION_TEMPLATES_PHASE1.sql` (684 řádků)
- Vygenerovaný SQL skript
- Úspěšně proveden na databázi
- Obsahuje verifikační dotazy pro kontrolu

### 4. Test & Preview Skripty
✅ `/var/www/erdms-dev/preview-notification-templates-phase1.php`
- Webový náhled všech šablon
- Zobrazuje obě varianty (RECIPIENT + SUBMITTER) vedle sebe
- Obsahuje testovací data pro všechny placeholdery
- Použití: Otevřít v prohlížeči pro vizuální kontrolu

### 5. Dokumentace
✅ `/var/www/erdms-dev/NOTIFICATION_TEMPLATES_EXPANSION_PLAN.md`
- Kompletní plán rozšíření notifikací
- Popis všech 8 prioritních šablon (Fáze 1-4)
- Barevné schéma, struktura variant, timeline implementace

✅ `/var/www/erdms-dev/NOTIFICATION_TEMPLATES_PLACEHOLDERS.md`
- Úplná reference všech placeholderů
- Tabulky s typy, popisy a příklady
- Best practices pro implementaci
- Příklady použití a maintenance checklist

## Struktura šablon

Všechny nové šablony používají **2-stavovou strukturu**:

### Varianta RECIPIENT (Příjemce akce)
- **Účel**: Email pro osobu, která je ovlivněna akcí (např. tvůrce objednávky, která byla schválena)
- **Barva**: Závisí na typu akce (zelená = úspěch, červená = chyba, oranžová = varování)
- **Obsah**: Informace o tom, co se stalo s jejich objednávkou

### Varianta SUBMITTER (Autor akce)
- **Účel**: Email pro osobu, která provedla akci (např. schvalovatel, který schválil)
- **Barva**: Většinou modrá (informační) nebo alternativní barva
- **Obsah**: Potvrzení provedené akce

**⚠️ Žádná URGENT varianta** - na rozdíl od existující šablony `order_status_ke_schvaleni`, nové šablony nemají urgentní variantu (3. stav).

## Placeholdery použité v Fázi 1

### Společné pro všechny 3 šablony:
- `{order_number}` - Číslo objednávky (OBJ-2025-00123)
- `{order_id}` - ID objednávky pro URL
- `{predmet}` - Předmět objednávky
- `{strediska}` - Seznam středisek
- `{amount}` - Celková cena s DPH
- `{creator_name}` - Jméno tvůrce
- `{approver_name}` - Jméno schvalovatele/zamítajícího

### Specifické podle typu:

**Schválena:**
- `{financovani}` - Zdroj financování
- `{financovani_poznamka}` - Poznámka k financování
- `{approval_date}` - Datum schválení

**Zamítnuta:**
- `{rejection_date}` - Datum zamítnutí
- `{rejection_comment}` - **Důvod zamítnutí** (kritický!)

**Vrácena:**
- `{revision_date}` - Datum vrácení
- `{revision_comment}` - **Co je třeba doplnit** (kritický!)

## Barevné schéma

| Šablona | RECIPIENT gradient | SUBMITTER gradient | Icon |
|---------|-------------------|-------------------|------|
| Schválena | `#059669 → #047857` (zelená) | `#3b82f6 → #2563eb` (modrá) | ✅ |
| Zamítnuta | `#dc2626 → #b91c1c` (červená) | `#f97316 → #ea580c` (oranžová) | ❌ |
| Vrácena | `#f97316 → #fb923c` (oranžová) | `#3b82f6 → #2563eb` (modrá) | ⏸️ |

## Jak používat šablony

### 1. Preview v prohlížeči
```bash
# Otevřít náhled
firefox http://localhost/preview-notification-templates-phase1.php
```

### 2. Backend integrace
V PHP kódu pro odeslání notifikace:

```php
// 1. Načtení šablony z DB
$template = getNotificationTemplate('order_status_schvalena');

// 2. Výběr správné varianty
$html = getEmailTemplateByRecipient($template['email_body'], 'RECIPIENT');

// 3. Nahrazení placeholderů
$data = [
    'order_number' => $order['cislo_objednavky'],
    'creator_name' => $creator['full_name'],
    'approver_name' => $approver['full_name'],
    // ... další data
];
$final_html = replacePlaceholders($html, $data);

// 4. Odeslání emailu
sendEmail($recipient_email, $template['email_subject'], $final_html);
```

## Testování

### Manuální test v DEBUG sekci
1. Přejít do sekce **DEBUG → Mail test**
2. Vybrat šablonu (Schválena / Zamítnuta / Vrácena)
3. Vybrat variantu (RECIPIENT / SUBMITTER)
4. Kliknout "Odeslat testovací email"
5. Ověřit v emailu:
   - ✅ Správné barvy gradientu
   - ✅ Všechny placeholdery nahrazeny
   - ✅ Responsive design (mobil + desktop)
   - ✅ CTA tlačítko funguje

### Email klienti k testování
- Gmail (web + app)
- Outlook (desktop + web)
- Apple Mail
- Thunderbird

## Co dál - Další fáze

### ✅ Fáze 1: HOTOVO (3 šablony)
- order_status_schvalena
- order_status_zamitnuta
- order_status_ceka_se

### 🔜 Fáze 2: Komunikace s dodavatelem (2 šablony)
- order_status_odeslana (Odeslána dodavateli)
- order_status_potvrzena (Potvrzena dodavatelem)

### 🔜 Fáze 3: Fakturace (1 šablona)
- order_status_faktura_schvalena (Faktura schválena k úhradě)

### 🔜 Fáze 4: Věcná správnost (2 šablony)
- order_status_kontrola_potvrzena (Věcná správnost OK)
- order_status_kontrola_zamitnuta (Věcná správnost zamítnuta)

**Celkem plánováno: 8 šablon**
**Dokončeno: 3 šablony (37,5%)**

## Soubory k review

Pro kontrolu kvality implementace doporučuji zkontrolovat:

1. **HTML šablony** - `/var/www/erdms-dev/templates/*.html`
   - Responsive design
   - Barvy gradientů
   - Placeholdery správně umístěny

2. **Preview skript** - Otevřít v prohlížeči a zkontrolovat vizuál

3. **Databázový obsah** - Přímo v DB ověřit, že šablony jsou správně uložené

4. **SQL skripty** - `/var/www/erdms-dev/UPDATE_NOTIFICATION_TEMPLATES_PHASE1.sql`

## Poznámky

### ⚠️ NEDOTKNUTO: Template `order_status_ke_schvaleni`
Podle požadavku uživatele byla existující šablona KE SCHVALENI ponechána beze změny.
Tato šablona má 3 varianty (APPROVER_NORMAL, APPROVER_URGENT, SUBMITTER) a zůstává v původním stavu.

### ✅ Nová struktura: 2 varianty místo 3
Všechny nové šablony mají pouze 2 varianty:
- RECIPIENT (příjemce/tvůrce)
- SUBMITTER (autor akce)

Žádná URGENT varianta není u nových šablon.

### 📊 Statistiky
- **Čas implementace**: ~45 minut
- **Řádků kódu celkem**: ~2500 (HTML + PHP + SQL + dokumentace)
- **Velikost HTML šablon**: ~14 KB každá
- **Placeholders celkem**: 15 unikátních
- **Email klienti testovány**: Připraveno k testování

## Next Steps

1. **Otestovat preview** - Otevřít `preview-notification-templates-phase1.php` v prohlížeči
2. **Integrovat do backend** - Upravit `notificationHelpers.php` pro použití nových šablon
3. **Testovací email** - Odeslat z DEBUG sekce a ověřit rendering
4. **Pokračovat na Fázi 2** - Vytvořit šablony pro komunikaci s dodavatelem

---

**Status: ✅ PHASE 1 COMPLETE AND DEPLOYED**
**Database: ✅ Updated successfully**
**Ready for: Testing & Phase 2 implementation**
