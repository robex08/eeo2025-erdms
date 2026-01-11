# Post-Login Notifikace - Základní vstupní informace EEO 2025/2026

**Datum vytvoření:** 3. ledna 2026  
**Status:** ✅ Připraveno k nasazení  
**Verze:** 1.0.0

## 📋 Přehled

Nová moderní post-login notifikace pro všechny uživatele při prvním přihlášení do EEO systému v roce 2026.

### ✨ Klíčové vlastnosti

- **Moderní design** s barevně odlišenými sekcemi
- **Responzivní layout** - funguje na všech zařízeních
- **Inline CSS** - žádné externí závislosti
- **Přehledná struktura** - logické rozdělení informací
- **Profesionální vzhled** - gradient pozadí, zaoblené rohy, stíny

---

## 🎨 Design prvky

### Použité barvy a styly

| Sekce | Barva/Gradient | Význam |
|-------|---------------|---------|
| **⚠️ Upozornění** | Červená (#dc2626) | Kritické varování o ROK 2025 objednávkách |
| **💰 Pokladníci** | Modrá (#2563eb) | Informace o inventarizaci |
| **📌 Nezapomeňte** | Šedá (#6b7280) | Seznam důležitých bodů |
| **💡 Info** | Žlutá (#f59e0b) | Tip pro uživatele s nízkým oprávněním |
| **💬 Teams podpora** | Zelená (#16a34a) | Pozitivní informace o podpoře |
| **❓ Nápověda** | Žlutá (#fbbf24) | Odkaz na dokumentaci |
| **📞 Kontakt** | Bílá + šedý border | Kontaktní informace |

### Responzivní vlastnosti

- **Flex layout** pro adaptabilní rozložení
- **Inline-flex** pro ikony a badges
- **Vhodný line-height (1.65)** pro snadné čtení
- **Optimální padding a spacing** (gap: 12-28px)

---

## 📁 Soubory

### 1. HTML Náhled
```
/var/www/erdms-dev/podklady/notification_eeo2025_zakladni_informace.html
```
- Kompletní HTML s CSS pro náhled v prohlížeči
- Obsahuje celý obsah notifikace

### 2. SQL Skript pro nasazení
```
/var/www/erdms-dev/notification_eeo2025_zakladni_informace.sql
```
- Vytvoří notifikaci s ID 953
- Aktualizuje globální nastavení
- Nastaví nový GUID → resetuje "Příště nezobrazovat"
- Nastaví platnost do 31.1.2026

---

## 🚀 Nasazení do produkce

### Krok 1: Otestování v DEV prostředí

```bash
# Na DEV databázi
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025-dev < /var/www/erdms-dev/notification_eeo2025_zakladni_informace.sql
```

### Krok 2: Náhled v aplikaci

1. Přihlaste se do DEV prostředí
2. Modal by se měl zobrazit automaticky po přihlášení
3. Zkontrolujte:
   - ✅ Správné zobrazení HTML obsahu
   - ✅ Responzivní design na různých zařízeních
   - ✅ Funkčnost tlačítek "OK" a "Příště nezobrazovat"
   - ✅ Odkazy na email a telefon

### Krok 3: Nasazení do PROD

```bash
# Na PROD databázi
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < /var/www/erdms-dev/notification_eeo2025_zakladni_informace.sql
```

### Krok 4: Ověření

```sql
-- Zkontrolovat nastavení
USE eeo2025;

SELECT 
    klic,
    hodnota,
    popis
FROM 04_global_settings
WHERE klic LIKE 'post_login_modal%'
ORDER BY klic;

-- Zkontrolovat notifikaci
SELECT 
    id,
    type,
    title,
    LEFT(message, 100) as message_preview,
    active,
    dt_created
FROM 25_notifikace
WHERE id = 953;
```

---

## ⚙️ Konfigurace

### Aktuální nastavení po nasazení

| Parametr | Hodnota | Význam |
|----------|---------|--------|
| `post_login_modal_enabled` | `1` | Modal je zapnutý |
| `post_login_modal_message_id` | `953` | ID notifikace v tabulce |
| `post_login_modal_guid` | `modal_eeo2025_info_v1` | Nový GUID (resetuje localStorage) |
| `post_login_modal_title` | `Základní vstupní informace` | Nadpis modalu |
| `post_login_modal_valid_from` | `NULL` | Platí okamžitě |
| `post_login_modal_valid_to` | `2026-01-31` | Platí do konce ledna |

### Změna platnosti

```sql
-- Prodloužit platnost do února
UPDATE 04_global_settings
SET hodnota = '2026-02-28'
WHERE klic = 'post_login_modal_valid_to';

-- Neomezená platnost
UPDATE 04_global_settings
SET hodnota = NULL
WHERE klic = 'post_login_modal_valid_to';
```

### Vypnutí modalu

```sql
UPDATE 04_global_settings
SET hodnota = '0'
WHERE klic = 'post_login_modal_enabled';
```

### Reset "Příště nezobrazovat" pro všechny uživatele

```sql
-- Změnit GUID → všichni uživatelé uvidí modal znovu
UPDATE 04_global_settings
SET hodnota = 'modal_eeo2025_info_v2'  -- nová verze
WHERE klic = 'post_login_modal_guid';
```

---

## 📝 Obsah notifikace

### Sekce a informace

1. **⚠️ Upozornění: Práce s objednávkami roku 2025**
   - Kritické varování
   - NEZADÁVAT objednávky roku 2025 do nového EEO 2026
   - Kontakt: faktury@zachranaci.cz

2. **💰 Pokladníci**
   - Informace o inventarizaci
   - Minusový konečný stav
   - Odkaz na podrobný postup

3. **📌 Nezapomeňte - 3 body:**
   - Objednávky s čerpáním z LP/IS
   - Nové objednávky z rámcových smluv
   - Požadavky na externí kurzy

4. **💡 Informace pro uživatele s nízkým oprávněním**
   - Prázdný přehled do vytvoření první objednávky

5. **💬 Online Teams podpora**
   - První měsíc pravidelná dostupnost
   - Školení a hromadné dotazy

6. **❓ Nápověda**
   - Odkaz na dokumentaci (ikona ?)

7. **📞 Kontakt**
   - Email: helpdesk@zachranaci.cz
   - Telefon: 731 137 030

---

## 🔍 Technické detaily

### HTML Structure

```
<div class="eeo-notification">  <!-- Root container -->
  ├── Nadpis (h1)
  ├── Sekce 1: Upozornění (červená)
  ├── Sekce 2: Pokladníci (modrá)
  ├── Sekce 3: Nezapomeňte (šedá)
  ├── Sekce 4: Info (žlutá dashed)
  ├── Sekce 5: Teams (zelená)
  ├── Sekce 6: Nápověda (žlutá gradient)
  └── Sekce 7: Kontakt (bílá)
</div>
```

### Inline CSS Features

- **Gradient backgrounds** - lineární přechody barev
- **Box shadows** - jemné stíny pro hloubku
- **Border radius** - zaoblené rohy (8-12px)
- **Flexbox layout** - responzivní rozložení
- **Emoji ikony** - vizuální identifikace sekcí
- **Hover states** - na odkazech
- **Responsive spacing** - gap, padding, margin

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, 
             Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
```
- Systémové fonty pro nejlepší zobrazení na všech zařízeních

---

## 🎯 User Experience

### Zobrazení modalu

1. ✅ Uživatel se přihlásí do EEO systému
2. ✅ Modal se zobrazí automaticky (pokud splňuje podmínky)
3. ✅ Uživatel přečte informace
4. ✅ Klikne "OK" nebo "Příště nezobrazovat"

### Podmínky zobrazení

- ✅ `post_login_modal_enabled` = 1
- ✅ Aktuální datum je mezi `valid_from` a `valid_to`
- ✅ Uživatel nemá v localStorage `dismissed_post_login_modal_{username}_{guid}`
- ✅ Notifikace s ID 953 existuje a je aktivní

### Chování tlačítek

- **"OK"** - Zavře modal, příště se znovu zobrazí
- **"Příště nezobrazovat"** - Uloží do localStorage, modal se už nezobrazí (pro daný GUID)

---

## 🐛 Troubleshooting

### Modal se nezobrazuje

```sql
-- 1. Zkontrolovat, zda je zapnutý
SELECT hodnota FROM 04_global_settings WHERE klic = 'post_login_modal_enabled';
-- Mělo by vrátit: 1

-- 2. Zkontrolovat platnost
SELECT hodnota FROM 04_global_settings WHERE klic = 'post_login_modal_valid_to';
-- Mělo by být NULL nebo budoucí datum

-- 3. Zkontrolovat existenci notifikace
SELECT id, title, active FROM 25_notifikace WHERE id = 953;
-- Mělo by vrátit záznam s active = 1
```

### Modal se zobrazuje pořád dokola

- Zkontrolujte localStorage v prohlížeči (F12 → Application → Local Storage)
- Klíč: `dismissed_post_login_modal_{username}_{guid}`
- Pokud klíč neexistuje, modal se bude zobrazovat

### Špatný obsah modalu

```sql
-- Aktualizovat obsah notifikace
UPDATE 25_notifikace
SET message = '<div>...nový obsah...</div>',
    dt_updated = NOW()
WHERE id = 953;
```

---

## 📊 Monitoring

### Počet zobrazení

Post-login modal systém neukládá statistiky zobrazení do databáze (je per-user v localStorage).

Pro monitoring můžete:
1. Přidat Google Analytics event tracking
2. Přidat backend logging při načtení konfigurace
3. Použít browser console tracking (dev režim)

---

## 📚 Související dokumentace

- [CHANGELOG_POST_LOGIN_MODAL_SYSTEM.md](_docs/CHANGELOG_POST_LOGIN_MODAL_SYSTEM.md)
- [PostLoginModal.js](apps/eeo-v2/client/src/components/PostLoginModal.js)
- [postLoginModalService.js](apps/eeo-v2/client/src/services/postLoginModalService.js)
- [App.js](apps/eeo-v2/client/src/App.js) - integrace event listeneru

---

## ✅ Checklist nasazení

- [ ] SQL skript otestován na DEV databázi
- [ ] HTML náhled zkontrolován v prohlížeči
- [ ] Modal se zobrazuje po přihlášení (DEV)
- [ ] Design je responzivní (desktop, tablet, mobile)
- [ ] Všechny odkazy fungují (email, telefon)
- [ ] Tlačítka "OK" a "Příště nezobrazovat" fungují správně
- [ ] SQL skript nasazen na PROD databázi
- [ ] Modal se zobrazuje po přihlášení (PROD)
- [ ] Platnost nastavena správně (do 31.1.2026)
- [ ] GUID změněn → resetuje localStorage pro všechny uživatele

---

## 🎉 Výsledek

Po nasazení:
- ✅ **Všichni uživatelé** uvidí novou notifikaci při příštím přihlášení
- ✅ **Moderní design** s barevně odlišenými sekcemi
- ✅ **Přehledné informace** podle struktury z obrázku
- ✅ **Profesionální vzhled** odpovídající EEO v2 systému
- ✅ **Responzivní** na všech zařízeních
- ✅ **Časově omezený** - automaticky zmizí po 31.1.2026

---

**Připravil:** GitHub Copilot  
**Datum:** 3. ledna 2026  
**Verze systému:** EEO v2 (1.95b+)
