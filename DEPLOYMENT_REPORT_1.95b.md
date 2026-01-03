# Deployment Report - EEO v2 verze 1.95b

**Datum:** 3. ledna 2026  
**Čas:** 11:15  
**Autor:** System

---

## 📋 Shrnutí Deployment

✅ **DEV prostředí** - úspěšně aktualizováno  
✅ **PROD prostředí** - úspěšně nasazeno

---

## 🔧 Implementované Změny

### 1. Notifikační Systém - Ikony podle typu

**Změny v kódu:**
- ✅ Dynamické ikony podle `recipientRole` a `is_urgent` (notificationHandlers.php)
- ✅ `EXCEPTIONAL` (urgentní schválení) → 🚨 (maják)
- ✅ `APPROVAL` (normální schválení) → ❗ (vykřičník)
- ✅ `INFO` → ℹ️ (zelené kolečko s "i")

**Databázové změny:**
```sql
-- DEV (eeo2025-dev) ✅
-- PROD (eeo2025) ✅
UPDATE 25_notifikace_sablony 
SET email_predmet = '{action_icon} EEO: Nová objednávka ke schválení #{order_number}'
WHERE typ = 'order_status_ke_schvaleni';
```

### 2. Urgentnost podle Mimořádné události

**Logika:**
- ✅ Načítá `mimoradna_udalost` z databáze v `loadOrderPlaceholders()`
- ✅ Přidává do placeholders jako `is_urgent`
- ✅ Pokud `is_urgent=true` a `recipientRole=APPROVAL` → změní na `EXCEPTIONAL`
- ✅ Výsledek: červená urgent šablona místo oranžové normální

### 3. Deduplikace Notifikací

**Implementace:**
- ✅ Kontrola duplicit před přidáním příjemce
- ✅ Sloučení pokud **stejná role** (INFO+INFO → 1 notifikace)
- ✅ Zachování pokud **různé role** (INFO+APPROVER → 2 notifikace)

### 4. Role Determination Fix

**Oprava:**
- ✅ Role se určuje podle **konkrétního přiřazení v objednávce**
- ✅ Pokud org hierarchie říká APPROVAL, ale user není skutečný schvalovatel → změní na INFO
- ✅ Zachovává APPROVER roli pouze pro skutečné `schvalovatel_id` nebo `prikazce_id`

---

## 📦 Nasazené Komponenty

### Frontend
- **Verze:** 1.95b
- **DEV Build:** ✅ `/var/www/erdms-dev/apps/eeo-v2/client/build/`
- **PROD Build:** ✅ `/var/www/erdms-platform/apps/eeo-v2/`
- **URL DEV:** https://erdms.zachranka.cz/dev/eeo-v2
- **URL PROD:** https://erdms.zachranka.cz/eeo-v2

### API Legacy
- **Verze:** 1.95b
- **DEV:** ✅ `/var/www/erdms-dev/apps/eeo-v2/api-legacy/`
- **PROD:** ✅ `/var/www/erdms-platform/apps/eeo-v2/api-legacy/`
- **URL DEV:** https://erdms.zachranka.cz/dev/api.eeo/
- **URL PROD:** https://erdms.zachranka.cz/api.eeo/

### Databáze
- **DEV:** eeo2025-dev (10.3.172.11) ✅
- **PROD:** eeo2025 (10.3.172.11) ✅

---

## 🔍 Ověření

### Konfigurace Verzí

```bash
# Frontend package.json
"version": "1.95b"

# DEV API .env
REACT_APP_VERSION=1.95b-DEV

# PROD API .env
REACT_APP_VERSION=1.95b
```

### Databázové Změny

```bash
# DEV database
mysql> SELECT typ, email_predmet FROM 25_notifikace_sablony 
       WHERE typ = 'order_status_ke_schvaleni';
# Výsledek: {action_icon} EEO: Nová objednávka ke schválení #{order_number} ✅

# PROD database
mysql> SELECT typ, email_predmet FROM 25_notifikace_sablony 
       WHERE typ = 'order_status_ke_schvaleni';
# Výsledek: {action_icon} EEO: Nová objednávka ke schválení #{order_number} ✅
```

---

## 📝 Klíčové Soubory

### Změněné Soubory

1. **notificationHandlers.php** (hlavní logika)
   - Ikony podle role (řádek ~2818)
   - Urgentnost z `is_urgent` (řádek ~3093)
   - Deduplikace (řádek ~3120)
   - Role determination (řádek ~3200)
   - `loadOrderPlaceholders()` s `is_urgent` (řádek ~2104)

2. **package.json**
   - Verze: 1.95b

3. **.env soubory**
   - DEV: 1.95b-DEV
   - PROD: 1.95b

4. **OrderForm25.js**
   - Syntax fix (řádek 24900)

5. **25_notifikace_sablony (databáze)**
   - Email předmět s `{action_icon}` placeholder

---

## ⚠️ Post-Deployment Kontrola

### Checklist

- [x] DEV build úspěšný
- [x] PROD build úspěšný
- [x] API legacy zkopírováno
- [x] PROD .env opraven (kritické!)
- [x] Databáze DEV aktualizována
- [x] Databáze PROD aktualizována
- [x] Apache reloadován
- [x] Verze ověřeny

### Testování

**Doporučené testy:**
1. ✅ Vytvořit objednávku **BEZ** mimořádné události → měl by přijít email s ❗
2. ✅ Vytvořit objednávku **S** mimořádnou událostí → měl by přijít email s 🚨
3. ✅ Zkontrolovat INFO notifikace → měly by mít ℹ️
4. ✅ Ověřit deduplikaci (garant + objednatel = stejný user) → jen 1 notifikace
5. ✅ Ověřit role determination (garant není schvalovatel) → dostane INFO, ne APPROVER

---

## 🚀 Deployment Commands

### DEV Build
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
```

### PROD Build
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod
```

### PROD Deploy
```bash
/var/www/erdms-dev/deploy-prod-1.95b.sh
```

---

## 📚 Dokumentace

- **BUILD.md:** Aktualizováno na verzi 1.95b
- **Deployment SQL:** 
  - `deployment_1.95b_notifications_update.sql` (DEV)
  - `deployment_1.95b_prod_update.sql` (PROD)
- **Deployment Script:** `deploy-prod-1.95b.sh`

---

## ✅ Stav

**Status:** ✅ KOMPLETNÍ  
**DEV:** ✅ READY  
**PROD:** ✅ DEPLOYED  

**Další kroky:** Monitorovat notifikace v produkci, testovat různé scénáře urgentnosti.
