# Database Backup Checklist

**Datum:** 5. prosince 2025  
**Status:** ⚠️ PENDING - Vyžaduje správné DB credentials

---

## 🔒 Database Backup před migrací

### Krok 1: Ověření přihlašovacích údajů

**Současný problém:**
```
ERROR 1045 (28000): Access denied for user 'erdms_user'@'10.3.174.11' (using password: YES)
```

**Akce potřebná:**
1. Získat správné DB credentials pro `eeo_db` databázi
2. Testovat připojení: `mysql -h 10.3.172.11 -u [USER] -p`
3. Ověřit práva: `SHOW GRANTS FOR 'user'@'host';`

### Krok 2: Backup příkazy

Po získání správných credentials:

```bash
# === 1. EEO Database Backup ===
mysqldump -h 10.3.172.11 -u [DB_USER] -p[DB_PASS] eeo_db \
    > /tmp/eeo_db_backup_$(date +%Y-%m-%d).sql

# === 2. ERDMS Database Backup ===
mysqldump -h 10.3.172.11 -u [DB_USER] -p[DB_PASS] erdms \
    > /tmp/erdms_backup_$(date +%Y-%m-%d).sql

# === 3. Komprese ===
gzip /tmp/eeo_db_backup_*.sql
gzip /tmp/erdms_backup_*.sql

# === 4. Přesun do backup adresáře ===
sudo mkdir -p /var/backups/erdms/
sudo mv /tmp/*_backup_*.sql.gz /var/backups/erdms/

# === 5. Ověření backupu ===
ls -lh /var/backups/erdms/
zcat /var/backups/erdms/eeo_db_backup_*.sql.gz | head -50
```

### Krok 3: Očekávané velikosti

**eeo_db databáze:**
- Tabulky: 25+ (25_uzivatele, 25_objednavky, 25_faktury, ...)
- Očekávaná velikost: 50-500 MB (komprimovaná: 10-100 MB)
- Záznamy: Tisíce až desítky tisíc

**erdms databáze:**
- Tabulky: erdms_users, erdms_sessions, erdms_applications
- Očekávaná velikost: 1-10 MB (komprimovaná: < 1 MB)
- Záznamy: Stovky až tisíce

### Krok 4: Test restore

Po vytvoření backupu otestovat restore na test databázi:

```bash
# Vytvoření test databáze
mysql -h 10.3.172.11 -u [DB_USER] -p -e "CREATE DATABASE eeo_db_test;"

# Restore
zcat /var/backups/erdms/eeo_db_backup_2025-12-05.sql.gz | \
    mysql -h 10.3.172.11 -u [DB_USER] -p eeo_db_test

# Ověření
mysql -h 10.3.172.11 -u [DB_USER] -p eeo_db_test -e "SHOW TABLES;"
mysql -h 10.3.172.11 -u [DB_USER] -p eeo_db_test -e "SELECT COUNT(*) FROM 25_uzivatele;"

# Cleanup test DB
mysql -h 10.3.172.11 -u [DB_USER] -p -e "DROP DATABASE eeo_db_test;"
```

---

## ✅ Git Záloha - DOKONČENO

### Vytvořené zálohy

**Branch:**
```
backup/php-api-2025-12-05
```

**Tag:**
```
v1.0.0-php-final
```

**Commit:**
```
08971ad - Pre-migration snapshot: Complete PHP API + Entra integration docs
```

**GitHub URL:**
- Commit: https://github.com/robex08/eeo2025-erdms/commit/08971ad
- Tag: https://github.com/robex08/eeo2025-erdms/releases/tag/v1.0.0-php-final
- Backup branch: https://github.com/robex08/eeo2025-erdms/tree/backup/php-api-2025-12-05

### Obsah commit:

- ✅ 13 souborů změněno
- ✅ 3568 řádků přidáno
- ✅ Dokumentace:
  - `ENTRA-DB-SYNC-STRATEGY.md` - Database sync strategy
  - `ENTRA-PHP-TOKEN-BRIDGE.md` - Token bridge guide
  - `PHP-TO-NODEJS-MIGRATION-PLAN.md` - Complete migration plan (~180 endpoints)
- ✅ Auth API updates (Entra integration)
- ✅ Dashboard updates (modern UI, pagination)
- ✅ Build scripts (production automation)

### Rollback postup

V případě potřeby vrátit se na tento stav:

```bash
# Přepnout na backup branch
git checkout backup/php-api-2025-12-05

# Nebo použít tag
git checkout v1.0.0-php-final

# Nebo reset main branch
git reset --hard v1.0.0-php-final
```

---

## 📋 Checklist pro zahájení migrace

- [x] **Git backup vytvořen**
  - [x] Commit 08971ad
  - [x] Branch backup/php-api-2025-12-05
  - [x] Tag v1.0.0-php-final
  - [x] Pushed na GitHub

- [ ] **Database backup vytvořen**
  - [ ] Získat správné DB credentials
  - [ ] Backup eeo_db databáze
  - [ ] Backup erdms databáze
  - [ ] Test restore
  - [ ] Uložení do /var/backups/erdms/

- [ ] **Dokumentace připravena**
  - [x] PHP-TO-NODEJS-MIGRATION-PLAN.md
  - [x] ENTRA-PHP-TOKEN-BRIDGE.md
  - [x] ENTRA-DB-SYNC-STRATEGY.md
  - [ ] README pro migration project

- [ ] **Testovací prostředí připraveno**
  - [ ] Node.js v20+ nainstalován
  - [ ] npm/yarn konfigurace
  - [ ] Test databáze setup
  - [ ] Local development environment

- [ ] **Monitoring setup**
  - [ ] Logging konfigurace
  - [ ] Error tracking (Sentry?)
  - [ ] Performance monitoring
  - [ ] Alerting setup

---

## 🚀 Next Steps

1. **Získat DB credentials** - Kontaktovat DB admina
2. **Vytvořit DB backup** - Spustit příkazy výše
3. **Přečíst migration plan** - Review PHP-TO-NODEJS-MIGRATION-PLAN.md
4. **Odsouhlasit priority** - Které endpointy migrovat první
5. **Zahájit Phase 0** - Infrastructure setup

---

**Status:** 🟡 **IN PROGRESS - DB Backup Pending**  
**Blokující:** Správné DB credentials pro backup

**Autor:** GitHub Copilot  
**Datum:** 5. prosince 2025
