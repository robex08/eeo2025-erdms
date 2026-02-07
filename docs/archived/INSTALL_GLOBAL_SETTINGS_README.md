# 🔧 Instalace globálních nastavení - INSTRUKCE

## ⚠️ DŮLEŽITÉ
Databáze je na **REMOTE** serveru! Nelze ji spustit lokálně.

## 📋 Informace o databázi
- **Server**: `10.3.172.11`
- **Databáze**: `eeo2025`
- **Uživatel**: `erdms_user`
- **Heslo**: `AhchohTahnoh7eim`

## 🚀 Postup instalace

### Varianta 1: Přes příkazovou řádku (SSH)
```bash
# Připojte se k remote serveru a spusťte:
mysql -h 10.3.172.11 -u erdms_user -p eeo2025 < /var/www/erdms-dev/INSTALL_GLOBAL_SETTINGS.sql
```

### Varianta 2: Přes MySQL Workbench / phpMyAdmin
1. Připojte se k databázi `eeo2025` na serveru `10.3.172.11`
2. Otevřete soubor `/var/www/erdms-dev/INSTALL_GLOBAL_SETTINGS.sql`
3. Spusťte celý SQL skript

### Varianta 3: Přímý příkaz
```bash
mysql -h 10.3.172.11 -u erdms_user -pAhchohTahnoh7eim eeo2025 < /var/www/erdms-dev/INSTALL_GLOBAL_SETTINGS.sql
```

## ✅ Ověření instalace
Po spuštění SQL skriptu byste měli vidět:
- Tabulka `25a_nastaveni_globalni` byla vytvořena
- 8 výchozích nastavení bylo vloženo
- Trigger pro automatickou aktualizaci byl vytvořen

## 🔍 Kontrola
```sql
-- Zkontrolujte, zda tabulka existuje:
SHOW TABLES LIKE '25a_nastaveni_globalni';

-- Zobrazte všechna nastavení:
SELECT * FROM 25a_nastaveni_globalni ORDER BY kategorie, klic;
```

## 📊 Očekávaná data
Po instalaci by tabulka měla obsahovat:

| klic | hodnota | typ | kategorie |
|------|---------|-----|-----------|
| notifications_enabled | 1 | boolean | notifications |
| notifications_bell_enabled | 1 | boolean | notifications |
| notifications_email_enabled | 1 | boolean | notifications |
| hierarchy_enabled | 0 | boolean | hierarchy |
| hierarchy_profile_id | NULL | integer | hierarchy |
| hierarchy_logic | OR | string | hierarchy |
| maintenance_mode | 0 | boolean | maintenance |
| maintenance_message | Systém je momentálně v údržbě... | string | maintenance |

## 🐛 Řešení problémů

### Chyba: "Table already exists"
To je OK! Skript používá `CREATE TABLE IF NOT EXISTS`, takže nepřepíše existující tabulku.

### Chyba: "Access denied"
Zkontrolujte přihlašovací údaje:
- Uživatel: `erdms_user`
- Heslo: `AhchohTahnoh7eim`
- Databáze: `eeo2025`

### Chyba: "Can't connect to MySQL server"
Ujistěte se, že:
1. Máte přístup k serveru `10.3.172.11`
2. Port 3306 není blokován firewallem
3. MySQL server běží

## 📞 Další pomoc
Pokud máte problémy, zkontrolujte:
- PHP error log: `/tmp/php_errors.log`
- MySQL error log na serveru
- Připojení pomocí: `mysql -h 10.3.172.11 -u erdms_user -p`
