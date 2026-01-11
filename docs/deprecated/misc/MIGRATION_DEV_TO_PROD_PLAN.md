# PLÁN MIGRACE DEV → PRODUCTION
**Datum:** 4. ledna 2026  
**Databáze:** eeo2025-dev → eeo2025  
**Režim:** 1:1 přenos vybraných tabulek

---

## 📋 TABULKY K PŘENOSU

### 1️⃣ UŽIVATELÉ
```
25_uzivatele
```

### 2️⃣ POKLADNÍ KNIHA (7 tabulek)
```
25a_pokladni_audit
25a_pokladni_knihy
25a_pokladni_knihy_bck
25a_pokladni_polozky
25a_pokladni_polozky_detail
25a_pokladny
25a_pokladny_uzivatele
```

### 3️⃣ NOTIFIKACE (10 tabulek)
```
25_notifikace
25_notifikace_audit
25_notifikace_backup_20260103
25_notifikace_fronta
25_notifikace_precteni
25_notifikace_sablony
25_notifikace_sablony_backup_20251222
25_notifikace_typy_udalosti
25_notifikace_typy_udalosti_backup_20260103
25_notifikace_uzivatele_nastaveni
```

### 4️⃣ ORGANIZAČNÍ HIERARCHIE
```
25_hierarchie_profily
```

**CELKEM: 19 tabulek**

---

## ⚠️ BEZPEČNOSTNÍ OPATŘENÍ

### Před migrací:
1. ✅ **ÚPLNÁ ZÁLOHA PRODUCTION databáze**
2. ✅ Ověření, že DEV tabulky jsou kompletní a konzistentní
3. ✅ Kontrola foreign keys a vazeb
4. ✅ Vypnutí aplikace na PROD (maintenance mode)

### Pořadí operací:
1. Záloha PROD databáze (`mysqldump`)
2. Export tabulek z DEV
3. Dočasné vypnutí foreign key checks
4. Drop starých tabulek v PROD
5. Import nových tabulek do PROD
6. Zapnutí foreign key checks
7. Ověření integrity dat
8. Test aplikace

---

## 🔧 PŘÍKAZY

### KROK 1: Záloha PRODUCTION databáze
```bash
mysqldump -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' \
  --single-transaction \
  --routines \
  --triggers \
  eeo2025 > /var/www/erdms-dev/backup_PROD_pre-migration_$(date +%Y%m%d_%H%M%S).sql
```

### KROK 2: Export vybraných tabulek z DEV
```bash
mysqldump -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' \
  --single-transaction \
  --routines \
  --triggers \
  eeo2025-dev \
  25_uzivatele \
  25a_pokladni_audit \
  25a_pokladni_knihy \
  25a_pokladni_knihy_bck \
  25a_pokladni_polozky \
  25a_pokladni_polozky_detail \
  25a_pokladny \
  25a_pokladny_uzivatele \
  25_notifikace \
  25_notifikace_audit \
  25_notifikace_backup_20260103 \
  25_notifikace_fronta \
  25_notifikace_precteni \
  25_notifikace_sablony \
  25_notifikace_sablony_backup_20251222 \
  25_notifikace_typy_udalosti \
  25_notifikace_typy_udalosti_backup_20260103 \
  25_notifikace_uzivatele_nastaveni \
  25_hierarchie_profily \
  > /var/www/erdms-dev/migration_DEV_to_PROD_$(date +%Y%m%d_%H%M%S).sql
```

### KROK 3: Import do PRODUCTION
```bash
# PŘED IMPORTEM - ověř, že máš zálohu!
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < migration_DEV_to_PROD_XXXXXXXX_XXXXXX.sql
```

---

## ✅ VERIFIKACE PO MIGRACI

### Počet záznamů v klíčových tabulkách:
```sql
-- Uživatelé
SELECT COUNT(*) FROM 25_uzivatele;

-- Pokladny
SELECT COUNT(*) FROM 25a_pokladny;

-- Pokladní knihy
SELECT COUNT(*) FROM 25a_pokladni_knihy;

-- Notifikace
SELECT COUNT(*) FROM 25_notifikace;

-- Hierarchie
SELECT COUNT(*) FROM 25_hierarchie_profily;
```

### Kontrola integrity:
```sql
-- Foreign keys
SELECT TABLE_NAME, CONSTRAINT_NAME 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE CONSTRAINT_TYPE = 'FOREIGN KEY' 
  AND TABLE_SCHEMA = 'eeo2025'
  AND (TABLE_NAME LIKE '25_uzivatele' 
    OR TABLE_NAME LIKE '25a_pokl%' 
    OR TABLE_NAME LIKE '25_notifik%'
    OR TABLE_NAME LIKE '25_hierarchie%');
```

---

## 🚨 ROLLBACK PLÁN

Pokud migrace selže:
```bash
# Obnov zálohu PROD
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < backup_PROD_pre-migration_XXXXXXXX_XXXXXX.sql
```

---

## 📝 POZNÁMKY

- **Backup tabulky**: `25_notifikace_backup_20260103` a podobné se také přenesou (jsou součástí výběru)
- **Foreign keys**: Automaticky zachyceny v dumpu
- **Triggers**: Automaticky zachyceny v dumpu
- **Data**: Přenos 1:1 bez transformací

---

## ⏱️ ČASOVÝ ODHAD

- Záloha PROD: ~2-5 minut (závisí na velikosti)
- Export z DEV: ~1-3 minuty
- Import do PROD: ~2-5 minut
- Verifikace: ~5 minut

**CELKEM: ~15-20 minut**

---

## 🎯 READY TO EXECUTE?

**ČAS:** Doporučeno mimo provozní dobu (večer/víkend)  
**REŽIM:** Maintenance mode ON  
**BACKUP:** POVINNÝ před jakoukoliv změnou  

**POKRAČUJ pouze pokud:**
- [x] Máš plnou zálohu PROD
- [x] Víš, jak vrátit změny (rollback)
- [x] Aplikace je v maintenance režimu
- [x] Máš potvrzení od odpovědné osoby
