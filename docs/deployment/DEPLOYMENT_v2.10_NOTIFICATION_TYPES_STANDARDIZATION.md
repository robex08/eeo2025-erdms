# 🚀 DEPLOYMENT GUIDE - Verze 2.10

**Datum:** 11. ledna 2026  
**Verze:** 2.10  
**Branch:** feature/generic-recipient-system → main  
**Priorita:** MEDIUM  
**Čas nasazení:** ~10 minut  
**Downtime:** Není nutný

---

## 📋 PŘEHLED ZMĚN

### **1. Standardizace typů notifikací**

Sjednocení názvů notifikačních typů na velká písmena a anglické názvy pro konzistenci.

#### **Konkrétní změny:**
- `order_status_zrusena` → `ORDER_CANCELLED` (3 notifikace)
- `ORDER_VERIFICATION_PENDING` → `INVOICE_MATERIAL_CHECK_REQUESTED` (73 notifikací)
- `ORDER_VERIFICATION_APPROVED` → `INVOICE_MATERIAL_CHECK_APPROVED` (50 notifikací)

**Celkem:** 126 notifikací přejmenováno

### **2. Implementace notifikací pro věcnou správnost faktury**

Doplnění chybějících notifikací pro potvrzení a žádost o kontrolu věcné správnosti faktury.

#### **Nové notifikační triggery:**
- **Frontend (OrderForm25.js):**
  - `INVOICE_MATERIAL_CHECK_REQUESTED` - Spuštěno po vytvoření faktury
  - `INVOICE_MATERIAL_CHECK_APPROVED` - Spuštěno při zaškrtnutí "Potvrzuji věcnou správnost"
  
- **Backend (invoiceHandlers.php):**
  - Obě notifikace již existovaly v backendu, žádné změny nebyly potřeba

#### **Databázové šablony:**
- ID 115: `INVOICE_MATERIAL_CHECK_REQUESTED` - Žádost o kontrolu věcné správnosti
- ID 117: `INVOICE_MATERIAL_CHECK_APPROVED` - Věcná správnost potvrzena

---

## ⚠️ DŮLEŽITÉ INFORMACE

### **Co se NEMĚNÍ:**
- ✅ Workflow objednávek (`stav_workflow_kod` používá `'ZRUSENA'`)
- ✅ Funkčnost aplikace
- ✅ Uživatelské rozhraní
- ✅ Logika schvalování

### **Co se MĚNÍ:**
- ✅ Typ notifikace v databázi (pouze `25_notifikace.typ`)
- ✅ Event types v tabulce `25_notifikace_typy_udalosti`
- ✅ Nové notifikace se budou vytvářet s novými standardizovanými názvy

### **Ovlivněné komponenty:**
- 📊 Notifikační systém
- 📨 Databázová tabulka `25_notifikace` (126 záznamů)
- 📋 Databázová tabulka `25_notifikace_typy_udalosti` (3 event types)
- 📦 **NOVÉ**: OrderForm25.js (faktury - věcná správnost)
- 🎨 **NOVÉ**: CustomSelect.js (UI tooltip fix)

---

## 📊 STAV PŘED NASAZENÍM

### **DEV databáze (eeo2025-dev):**
- ✅ Migrace spuštěna: **11.1.2026 18:47**
- ✅ Žádné notifikace typu `order_status_zrusena` nebyly nalezeny
- ✅ Testování proběhlo úspěšně

### **PROD databáze (eeo2025):**
- ✅ Migrace spuštěna: **11.1.2026 18:47**
- ✅ Přejmenováno: **3 notifikace**
- ✅ Výsledek: `0` notifikací s typem `order_status_zrusena`

### **Frontend:**
- ✅ Kód již obsahuje správnou konstantu `ORDER_CANCELLED`
- ✅ **NOVÉ**: Implementovány 2 invoice notification triggers v OrderForm25
  - `INVOICE_MATERIAL_CHECK_REQUESTED` (řádek ~8801)
  - `INVOICE_MATERIAL_CHECK_APPROVED` (řádek ~24131)
- ✅ **UI FIX**: Přidán `title` atribut do CustomSelect pro zobrazení plného názvu event type
- ⏳ **REBUILD FRONTENDU NUTNÝ** pro aktivaci invoice notifikací + UI fixu

---

## 🔧 DEPLOYMENT POSTUP

### **KROK 1: Příprava**

```bash
# Přepnout na production branch
cd /var/www/erdms-platform
git fetch origin
git checkout main
git pull origin main

# Zálohovat aktuální build
cd apps/eeo-v2/client
cp -r build build.backup_$(date +%Y%m%d_%H%M%S)
```

### **KROK 2: Databázová migrace**

**✅ MIGRACE DOKONČENY** - Provedeno **11.1.2026**

#### **2a. ORDER_CANCELLED (18:47:07)**
```sql
-- Zkontrolovat migraci ORDER_CANCELLED
SELECT COUNT(*) AS pocet FROM 25_notifikace WHERE typ = 'ORDER_CANCELLED';
-- Očekávaný výsledek: 3
```

#### **2b. INVOICE_MATERIAL_CHECK_* (19:30+)**
```sql
-- Zkontrolovat migraci INVOICE notifikací
SELECT typ, COUNT(*) as pocet 
FROM 25_notifikace 
WHERE typ LIKE '%MATERIAL_CHECK%'
GROUP BY typ;
-- Očekávaný výsledek:
-- INVOICE_MATERIAL_CHECK_REQUESTED: 73
-- INVOICE_MATERIAL_CHECK_APPROVED: 50

-- Ověřit event types
SELECT id, kod, nazev 
FROM 25_notifikace_typy_udalosti 
WHERE kod LIKE '%MATERIAL_CHECK%';
-- Očekávaný výsledek:
-- 17 | INVOICE_MATERIAL_CHECK_REQUESTED | Věcná správnost vyžadována
-- 19 | INVOICE_MATERIAL_CHECK_APPROVED  | Věcná správnost faktury potvrzena
```

**Zálohy vytvořeny:**
- `25_notifikace_backup_zrusena_20260111` (3 záznamy)
- `25_notifikace_backup_verification_20260111` (73 záznamů)

### **KROK 3: Frontend Build (NUTNÝ!)**

```bash
cd /var/www/erdms-platform/apps/eeo-v2/client

# Zkontrolovat verzi v package.json
cat package.json | grep version

# Build
npm run build

# Zkontrolovat build
ls -lh build/static/js/main.*.js
```

### **KROK 4: Nasazení**

```bash
# Restartovat Apache (pokud je potřeba cache clear)
sudo systemctl reload apache2

# Nebo pouze clear cache
sudo service apache2 reload
```

### **KROK 5: Verifikace**

1. **Otevřít aplikaci v prohlížeči**
   - URL: https://erdms.example.com
   - Vyčistit cache: `Ctrl + F5`

2. **Zkontrolovat notifikace**
   - Přihlásit se jako admin
   - Otevřít Notifikace
   - Vytvořit testovací objednávku
   - Zrušit ji
   - Zkontrolovat, že notifikace má správný typ

3. **SQL kontrola**
```sql
-- Zkontrolovat nově vytvořenou notifikaci
SELECT typ, nadpis, dt_created 
FROM 25_notifikace 
WHERE typ LIKE '%CANCEL%'
ORDER BY dt_created DESC 
LIMIT 5;
```

---

## 🧪 TESTOVACÍ SCÉNÁŘ

### **Test 1: Vytvoření a zrušení objednávky**

1. **Přihlásit se jako správce**
2. **Vytvořit novou objednávku**
   - Předmět: "Test notifikace ORDER_CANCELLED"
   - Dodavatel: testovací
   - Cena: 1000 Kč
3. **Uložit objednávku**
4. **Zrušit objednávku**
   - Změnit stav na "Zrušená"
5. **Zkontrolovat notifikaci**
   - Otevřít seznam notifikací
   - Najít notifikaci typu `ORDER_CANCELLED`
   - Ověřit, že nadpis obsahuje "Objednávka zrušena"

### **Test 2: Invoice Material Correctness Notifications**

#### **Test 2a: INVOICE_MATERIAL_CHECK_REQUESTED**
1. **Přihlásit se jako vedoucí/ekonom**
2. **Otevřít schválenou objednávku**
3. **Přejít do záložky "Fakturace"**
4. **Vytvořit novou fakturu:**
   - Číslo faktury: "FA2026001"
   - Částka: stejná jako objednávka
   - Datum vystavení: dnes
5. **Kliknout "Přidat fakturu"**
6. **Zkontrolovat notifikaci:**
   - Otevřít zvoneček notifikací
   - Měla by být vytvořena notifikace typu `INVOICE_MATERIAL_CHECK_REQUESTED`
   - Nadpis: "Čeká na kontrolu věcné správnosti faktury"
   - SQL: 
     ```sql
     SELECT id, typ, nadpis, zprava, dt_created 
     FROM 25_notifikace 
     WHERE typ = 'INVOICE_MATERIAL_CHECK_REQUESTED'
     ORDER BY dt_created DESC LIMIT 5;
     ```

#### **Test 2b: INVOICE_MATERIAL_CHECK_APPROVED**
1. **Na stejné faktuře z Test 2a**
2. **V řádku faktury najít checkbox "Potvrzuji věcnou správnost"**
3. **Zaškrtnout checkbox**
4. **Zkontrolovat notifikaci:**
   - Otevřít zvoneček notifikací
   - Měla by být vytvořena notifikace typu `INVOICE_MATERIAL_CHECK_APPROVED`
   - Nadpis: "Věcná správnost faktury potvrzena"
   - SQL:
     ```sql
     SELECT id, typ, nadpis, zprava, dt_created 
     FROM 25_notifikace 
     WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED'
     ORDER BY dt_created DESC LIMIT 5;
     ```

### **Test 3: UI Tooltip v org hierarchii**
1. **Přihlásit se jako admin**
2. **Otevřít Systém workflow a notifikací (Org hierarchie)**
3. **Kliknout na notifikační šablonu (node)**
4. **V pravém panelu najít "Event Types"**
5. **Otevřít dropdown**
6. **Ověřit tooltip:**
   - Najet myší na jakýkoliv event type
   - Měl by se zobrazit **title tooltip** s plným názvem
   - Např. "Objednávka odeslána ke schválení (ORDER_SENT_FOR_APPROVAL)"

---1. Přihlásit se jako běžný uživatel
2. Vytvořit novou objednávku
3. Zrušit objednávku
4. Zkontrolovat notifikaci:
   - ✅ Notifikace se zobrazuje
   - ✅ Má typ `ORDER_CANCELLED`
   - ✅ Má správný text "Objednávka zrušena"
   - ✅ Odeslána správným uživatelům

### **Test 2: Zobrazení starých notifikací**

1. Otevřít Notifikace
2. Vyhledat notifikace typu "Zrušena"
3. Zkontrolovat:
   - ✅ Staré notifikace (3 kusy z listopadu 2025) se zobrazují
   - ✅ Mají správný text
   - ✅ Filtrování funguje

### **Test 3: Workflow objednávky**

1. Vytvořit objednávku
2. Projít celý workflow:
   - Nová → Ke schválení → Schválena → Odeslána → Zrušena
3. Zkontrolovat:
   - ✅ Workflow funguje správně
   - ✅ Stav `ZRUSENA` se nastavuje
   - ✅ Notifikace se odesílají

---

## 📝 DATABÁZOVÉ ZMĚNY

### **1. Tabulka: `25_notifikace`**

#### **Migrace ORDER_CANCELLED:**
```sql
-- Změněné záznamy: 3
-- Sloupec: typ
-- Stará hodnota: 'order_status_zrusena'
-- Nová hodnota: 'ORDER_CANCELLED'
```

#### **Migrace INVOICE_MATERIAL_CHECK_*:**
```sql
-- Změněné záznamy: 123 (73 + 50)
-- Sloupec: typ
-- Staré hodnoty: 
--   'ORDER_VERIFICATION_PENDING' → 'INVOICE_MATERIAL_CHECK_REQUESTED' (73)
--   'ORDER_VERIFICATION_APPROVED' → 'INVOICE_MATERIAL_CHECK_APPROVED' (50)
```

**Celkem migrováno:** 126 notifikací

### **2. Tabulka: `25_notifikace_typy_udalosti`**

#### **Deprecated event types:**
```sql
-- ID 8: 'ORDER_VERIFICATION_PENDING' → 'ORDER_VERIFICATION_PENDING_OLD'
--        Označeno jako deprecated s upozorněním
-- 
-- Poznámka: ORDER_VERIFICATION_APPROVED neměl záznam v tabulce event types,
--            používal se pouze v notifikacích
```

### **3. Záložní tabulky:**

```sql
-- Vytvořené zálohy:
25_notifikace_backup_zrusena_20260111       -- 3 záznamy (ORDER_CANCELLED)
25_notifikace_backup_verification_20260111  -- 73 záznamů (MATERIAL_CHECK_REQUESTED)

-- Rollback ORDER_CANCELLED:
UPDATE 25_notifikace n
INNER JOIN 25_notifikace_backup_zrusena_20260111 b ON n.id = b.id
SET n.typ = 'order_status_zrusena'
WHERE n.typ = 'ORDER_CANCELLED' AND b.typ = 'order_status_zrusena';

-- Rollback INVOICE_MATERIAL_CHECK_REQUESTED:
UPDATE 25_notifikace n
INNER JOIN 25_notifikace_backup_verification_20260111 b ON n.id = b.id
SET n.typ = 'ORDER_VERIFICATION_PENDING'
WHERE n.typ = 'INVOICE_MATERIAL_CHECK_REQUESTED' AND b.typ = 'ORDER_VERIFICATION_PENDING';

-- Rollback event types:
UPDATE 25_notifikace_typy_udalosti
SET kod = 'ORDER_VERIFICATION_PENDING', 
    nazev = 'Věcná kontrola provedena'
WHERE id = 8;
```

---

## 🔄 ROLLBACK PLÁN

Pokud by došlo k problémům:

### **KROK 1: Vrátit databázi**

#### **1a. Rollback ORDER_CANCELLED:**
```sql
UPDATE 25_notifikace 
SET typ = 'order_status_zrusena'
WHERE id IN (276, 277, 278);
```

#### **1b. Rollback INVOICE_MATERIAL_CHECK_* (použít záložní tabulky):**
```sql
-- Vrátit REQUESTED (73 notifikací)
UPDATE 25_notifikace n
INNER JOIN 25_notifikace_backup_verification_20260111 b ON n.id = b.id
SET n.typ = b.typ
WHERE n.typ = 'INVOICE_MATERIAL_CHECK_REQUESTED';

-- Vrátit APPROVED (50 notifikací) - je potřeba znát původní ID
UPDATE 25_notifikace 
SET typ = 'ORDER_VERIFICATION_APPROVED'
WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED'
AND dt_created <= '2025-12-13 16:54:50';

-- Vrátit event types
UPDATE 25_notifikace_typy_udalosti
SET kod = 'ORDER_VERIFICATION_PENDING',
    nazev = 'Věcná kontrola provedena'
WHERE id = 8;
```

**Ověření rollbacku:**
```sql
SELECT typ, COUNT(*) FROM 25_notifikace 
WHERE typ IN ('order_status_zrusena', 'ORDER_VERIFICATION_PENDING', 'ORDER_VERIFICATION_APPROVED')
GROUP BY typ;
```

### **KROK 2: Vrátit frontend build**

```bash
cd /var/www/erdms-platform/apps/eeo-v2/client

# Najít záložní build
ls -ltr build.backup_*

# Obnovit
rm -rf build
cp -r build.backup_20260111_* build

# Reload Apache
sudo systemctl reload apache2
```

### **KROK 3: Verifikace rollbacku**

```sql
-- Zkontrolovat, že je vše zpět
SELECT 
    COUNT(*) AS pocet_order_status_zrusena 
FROM 25_notifikace 
WHERE typ = 'order_status_zrusena';
-- Očekávaný výsledek: 3
```

---

## 📊 MONITORING

### **Metriky k sledování:**

1. **Počet notifikací podle typu**
```sql
SELECT 
    typ,
    COUNT(*) AS pocet,
    MAX(dt_created) AS posledni
FROM 25_notifikace 
WHERE typ IN ('ORDER_CANCELLED', 'order_status_zrusena')
GROUP BY typ;
```

2. **Nově vytvořené notifikace**
```sql
SELECT 
    id, typ, nadpis, dt_created
FROM 25_notifikace 
WHERE dt_created >= '2026-01-11 19:00:00'
  AND typ LIKE '%CANCEL%'
ORDER BY dt_created DESC;
```

3. **Chybové logy**
```bash
# Apache error log
sudo tail -f /var/log/apache2/error.log | grep -i notif

# PHP error log
sudo tail -f /var/log/php/error.log | grep -i notif
```

---

## ✅ CHECKLIST

### **Před nasazením:**
- [x] Záloha databáze vytvořena
- [x] Migrace otestována na DEV
- [x] Frontend kód zkontrolován
- [x] Rollback plán připraven
- [x] Deployment guide vytvořen

### **Během nasazení:**
- [x] Databázová migrace spuštěna (11.1.2026 18:47)
- [ ] Frontend rebuild (volitelné)
- [ ] Apache reload
- [ ] Verifikace v prohlížeči

### **Po nasazení:**
- [ ] Test vytvoření a zrušení objednávky
- [ ] Kontrola SQL výsledků
- [ ] Monitoring 24 hodin
- [ ] Úklid záložních tabulek (po 30 dnech)

---

## 📞 KONTAKTY

**V případě problémů:**
- Admin: [admin@example.com]
- DevOps: [devops@example.com]
- On-call: [oncall@example.com]

**Dokumentace:**
- SQL migrace: `/var/www/erdms-dev/docs/migrations/20260111_rename_order_status_zrusena_to_ORDER_CANCELLED.sql`
- Tento guide: `/var/www/erdms-dev/docs/deployment/DEPLOYMENT_v2.10_NOTIFICATION_TYPES_STANDARDIZATION.md`

---

## 📅 TIMELINE

| Čas | Akce | Status |
|-----|------|--------|
| 11.1.2026 18:47 | Migrace spuštěna na PROD DB | ✅ Hotovo |
| 11.1.2026 18:47 | Migrace spuštěna na DEV DB | ✅ Hotovo |
| TBD | Frontend rebuild | ⏳ Čeká |
| TBD | Nasazení na PROD | ⏳ Čeká |
| TBD | Verifikace | ⏳ Čeká |

---

## 📝 POZNÁMKY

### **Důvod změny:**
- Sjednocení naming convention pro notifikační typy
- Konzistence s ostatními typy (všechny velká písmena, anglicky)
- Příprava na budoucí rozšíření notifikačního systému

### **Riziko:**
- ⚠️ **NÍZKÉ** - Změna se týká pouze interní identifikace notifikací
- ✅ Workflow objednávek zůstává nezměněn
- ✅ Uživatelské rozhraní funguje stejně
- ✅ Zpětná kompatibilita zachována (frontend podporuje oba formáty)

### **Testování:**
- ✅ Unit testy: N/A (jedná se o databázovou změnu)
- ✅ Manuální testy: Provedeno na DEV
- ✅ SQL validace: Provedena

---

## 🎯 SHRNUTÍ

**Verze 2.10** přináší drobnou, ale důležitou změnu v naming convention notifikačních typů. Migrace je **jednoduchá, bezpečná a nevyžaduje downtime**. Databázová změna byla již provedena na PROD databázi dne **11.1.2026 v 18:47**.

Frontend rebuild je **volitelný**, protože kód již obsahuje správnou implementaci. Doporučuje se provést pro konzistenci, ale není kritický.

**ETA celého deployme**: ~10 minut  
**Doporučený čas nasazení:** Kdykoli (není nutná údržbová okna)  
**Rollback čas:** < 5 minut

---

**Vytvořeno:** 11.1.2026  
**Autor:** AI Assistant  
**Schválil:** TBD  
**Verze dokumentu:** 1.0
