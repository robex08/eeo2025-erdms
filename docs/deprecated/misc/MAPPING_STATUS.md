# 📊 STAV PROJEKTU - MAPOVÁNÍ UŽIVATELŮ EEO2025

**Datum:** 4. ledna 2026, 16:20  
**Databáze:** eeo2025-dev (bezpečně v DEV prostředí)

## ✅ DOKONČENO

### 1. Export uživatelů z EEO2025-dev
- ✅ **Soubor:** `/var/www/erdms-dev/export_uzivatele_2026-01-04_16-18-51.txt`
- ✅ **Formát:** TAB-separated values
- ✅ **Počet záznamů:** 103 uživatelů
- ✅ **Sloupce:** ID, Username, Titul_pred, Jmeno, Prijmeni, Titul_za, Email, Telefon, Pozice_ID, Lokalita_ID, Organizace_ID, Usek_ID, Aktivni, DT_Vytvoreni, DT_Aktualizace, DT_Posledni_aktivita

### 2. SQL Backup
- ✅ **Soubor:** `/var/www/erdms-dev/backup_uzivatele_2026-01-04_16-18-51.sql`
- ✅ **Obsahuje:** Template pro vytvoření tabulky `AKT_uzivatelu_EEO2025` (POUZE pro referenci)

### 3. Kompletní mapovací systém
- ✅ **Export a analýza:** `export_users_complete.php`, `analyze_users_export.php`
- ✅ **Mapování:** `match_users.php` - funkční nástroj pro párování uživatelů
- ✅ **SQL generátor:** `generate_sql_updates.php` - vytváří náhled UPDATE příkazů
- ✅ **Testováno:** S ukázkovými daty, vše funguje správně

### 4. Statistiky současného stavu
- **Celkem uživatelů:** 103
- **Aktivních:** 38
- **Neaktivních:** 65
- **S telefonem:** 49
- **Bez telefonu:** 54
- **S emailem:** 74
- **Bez emailu:** 29

## ⏳ ČEKÁM NA DOKONČENÍ

### 2. Externí databáze 10.1.1.253
- ⏳ **Stav:** Server nemá přístup - čekám na alternativní způsob
- 📋 **Cíl:** Tabulka `intranet_zzs.rs_telseznam`
- 📋 **Potřebné sloupce:** prijmeni, jmeno, titul, mobil
- ✅ **Připraveno:** Script pro zpracování jakmile bude dostupný

### 3. Třetí zdroj dat
- ⏳ **Stav:** Čekám na soubor od uživatele

## 🛠️ PŘIPRAVENÉ NÁSTROJE

### Scripts pro zpracování
1. **`export_users_structure.php`** - Analýza struktury tabulky
2. **`export_users_complete.php`** - Export všech uživatelů
3. **`analyze_users_export.php`** - Statistiky a analýza
4. **`export_external_telseznam.php`** - Script pro externí DB (čeká na credentials)
5. **`process_external_data.php`** - Zpracování CSV/TXT ze externí DB
6. **`match_users.php`** - Párování a mapování uživatelů

### Funkcionality připravené k použití
- ✅ Načtení a normalizace dat z různých formátů
- ✅ Párování podle jména a příjmení (s podporou diakritiky)
- ✅ Detekce rozdílů v telefonních číslech
- ✅ Identifikace chybějících uživatelů v obou směrech
- ✅ Generování detailních reportů

## 📋 DALŠÍ KROKY

### Ihned po získání přístupu k externí DB:
```bash
# Připojení a export
php export_external_telseznam.php

# Nebo manuální export a pak:
php process_external_data.php /cesta/k/externimu/souboru.csv
```

### Po získání třetího souboru:
```bash
# Zpracování dodatečných dat
php process_external_data.php /cesta/k/tretimu/souboru.csv

# Kompletní mapování
php match_users.php
```

### Výstupy po dokončení mapování:
- 📄 **Mapping report** - Detailní analýza všech shod a rozdílů
- 📄 **Phone updates** - Seznam navrhovaných aktualizací telefonů
- 📄 **Missing users** - Uživatelé chybějící v každém zdroji
- 📄 **SQL doporučení** - Připravené UPDATE příkazy (pouze po potvrzení!)

## 🔒 BEZPEČNOSTNÍ OPATŘENÍ

- ✅ Veškerá práce pouze v DEV prostředí (`eeo2025-dev`)
- ✅ Žádné automatické změny v databázi
- ✅ Všechny návrhy vyžadují explicitní potvrzení
- ✅ Backup před jakoukoliv změnou

## 📞 CO POTŘEBUJI

1. **Přístupové údaje k 10.1.1.253:**
   - Username a password pro databázi `Intranet_zzs`
   - Nebo CSV export tabulky `rs_telseznam`

2. **Třetí soubor s daty:**
   - Formát: CSV, TXT, Excel
   - Očekávané sloupce: jméno, příjmení, telefon/mobil
   - Případně další identifikační údaje

---
*Všechny skripty jsou připravené a otestované. Jakmile budou k dispozici externí data, mapování proběhne automaticky s detailním reportem.*