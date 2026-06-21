# 🚀 DEPLOYMENT: Notifikace "Zastupování" do PRODUKCE

**Datum:** 2026-06-21  
**Účel:** Nasadit systémovou notifikaci o nové funkcionalitě Zastupování

---

## 📋 Co se nasadí

- **Notifikace:** Informace o nové funkcionalitě Zastupování
- **Typ:** `system_announcement` (post-login modal)
- **Databáze:** `eeo2025` (PRODUKCE)
- **Tabulka:** `25_notifikace`
- **Obsah:** 
  - Teams meeting 25.6.2025 v 10:00
  - Popis funkcionality
  - Návody a odkazy
  - Kontakty: helpdesk@zachranka.cz, 731 137 100

---

## ⚡ RYCHLÝ DEPLOYMENT

### Metoda 1: Automatický script (doporučeno)

```bash
# Spustit připravený script
/tmp/deploy_zastupovani_prod.sh
```

**Co script udělá:**
1. Načte HTML obsah z DEV DB (ID 2814)
2. Vloží jako nový záznam do `eeo2025.25_notifikace`
3. Nastaví jako aktivní post-login modal
4. Vypíše kontrolní informace (nové ID, délka HTML)

---

### Metoda 2: Manuální SQL

```bash
# 1. Export HTML z DEV
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' 'EEO-OSTRA-DEV' -N -e \
  "SELECT zprava FROM 25_notifikace WHERE id = 2814;" > /tmp/notif_html.txt

# 2. Připravit SQL INSERT
cat > /tmp/insert_prod.sql << 'ENDSQL'
INSERT INTO eeo2025.25_notifikace (
    nadpis,
    zprava,
    typ,
    kategorie,
    priorita,
    aktivni,
    dt_created
) VALUES (
    'ℹ️ Informace systému aplikace EEO - Nová funkcionalita Zastupování',
    '<VLOžIT HTML OBSAH Z /tmp/notif_html.txt>',
    'system_announcement',
    'system',
    'high',
    1,
    NOW()
);

SET @new_id = LAST_INSERT_ID();

UPDATE eeo2025.25a_nastaveni_globalni 
SET hodnota = @new_id, aktualizovano = NOW() 
WHERE klic = 'post_login_modal_message_id';

SELECT @new_id as 'Nové ID', hodnota FROM eeo2025.25a_nastaveni_globalni 
WHERE klic = 'post_login_modal_message_id';
ENDSQL

# 3. Spustit INSERT (POZOR: nahraď HTML obsah!)
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < /tmp/insert_prod.sql
```

---

## ✅ Kontrola po nasazení

```bash
# Zkontrolovat novou notifikaci
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e \
  "SELECT id, nadpis, typ, aktivni, LENGTH(zprava) as delka 
   FROM 25_notifikace 
   WHERE typ = 'system_announcement' 
   ORDER BY id DESC LIMIT 3;"

# Zkontrolovat aktivní modal
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e \
  "SELECT klic, hodnota FROM 25a_nastaveni_globalni 
   WHERE klic = 'post_login_modal_message_id';"
```

**Očekávaný výsledek:**
- Nová notifikace s `typ='system_announcement'`
- `aktivni=1`
- Délka HTML cca 6900-7000 znaků
- `post_login_modal_message_id` nastavené na nové ID

---

## 🔄 Rollback (vrátit starou notifikaci)

```bash
# Najít původní ID modalu
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e \
  "SELECT id, nadpis FROM 25_notifikace 
   WHERE typ = 'system_announcement' 
   ORDER BY id DESC LIMIT 5;"

# Vrátit na původní ID (např. 2413)
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e \
  "UPDATE 25a_nastaveni_globalni 
   SET hodnota = '2413', aktualizovano = NOW() 
   WHERE klic = 'post_login_modal_message_id';"
```

---

## 📝 Poznámky

- **ID v produkci:** Bude jiné než v DEV (auto-increment)
- **Tabulky:**
  - `25_notifikace` - samotná notifikace
  - `25a_nastaveni_globalni` - aktivní modal ID
- **Databáze:**
  - DEV: `EEO-OSTRA-DEV` (testovací ID 2814)
  - PROD: `eeo2025` (nové auto-increment ID)
- **Cache:** Notifikace se načítají z DB vždy (bez cache)
- **Změna:** Pro změnu textu stačí UPDATE `zprava` pole

---

## ⚠️ DŮLEŽITÉ

- Uživatelé uvidí modal při **příštím přihlášení**
- Pro zobrazení znovu: smazat cookie nebo localStorage v prohlížeči
- Modal se zobrazí **1x per session** (pokud ho uživatel zavře, neuvidí ho znovu)
