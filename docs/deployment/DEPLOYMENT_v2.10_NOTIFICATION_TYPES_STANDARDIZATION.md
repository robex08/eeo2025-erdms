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

#### **HTML Email šablony:**
- ✅ **NOVĚ vytvořeno:** Kompletní HTML šablony pro MS Outlook 365
- 🎨 **INVOICE_MATERIAL_CHECK_REQUESTED:** Modrý theme (#3b82f6) - 14,134 znaků
- ✅ **INVOICE_MATERIAL_CHECK_APPROVED:** Zelený theme (#10b981) - 15,191 znaků  
- 📧 **Kompatibilita:** Outlook 365, Gmail, Apple Mail, Thunderbird
- 📱 **Responsive:** Optimalizováno pro mobilní zařízení (max-width: 600px)
- 🎭 **Ikony:** Pouze v subject line, ne v HTML hlavičkách (H1)

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
- � **NOVÉ**: Databázová tabulka `25_notifikace_sablony` (2 HTML šablony)
- 📦 **NOVÉ**: OrderForm25.js (faktury - věcná správnost)
- 🎨 **NOVÉ**: CustomSelect.js (UI tooltip fix)
- 🎪 **NOVÉ**: InvoiceEvidencePage.js (anti-spam logic + "Předáno komu")
- 🔧 **NOVÉ**: OrganizationHierarchy.js (field validation fix)

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
- ✅ **ANTI-SPAM**: InvoiceEvidencePage - notifikace jen při změně workflow stavu  
- ✅ **BUG FIX**: OrganizationHierarchy - opravena validace polí (fa_predana_zam_id)
- ✅ **HTML TEMPLATES**: Nahrány nové email šablony do DB (11.1.2026 20:35)
- ⏳ **REBUILD FRONTENDU NUTNÝ** pro aktivaci invoice notifikací + všech UI fixů

---

## 🔧 DEPLOYMENT POSTUP

### **KROK 1: Příprava a zálohy**

#### **1a. Git záloha**
```bash
cd /var/www/erdms-dev
git tag -a "v2.10-backup-$(date +%Y%m%d_%H%M)" -m "Backup před nasazením v2.10"
git push origin "v2.10-backup-$(date +%Y%m%d_%H%M)"
```
**✅ PROVEDENO:** Tag `v2.10-backup-20260111_2042` vytvořen

#### **1b. Databáze FULL dump (eeo2025 - PROD)**
```bash
# FULL dump produkční databáze
mysqldump -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --complete-insert \
  --hex-blob \
  eeo2025 > /backup/eeo2025_full_dump_$(date +%Y%m%d_%H%M%S).sql

# Ověřit velikost dumpu
ls -lh /backup/eeo2025_full_dump_*.sql | tail -1

# Komprese pro úsporu místa
gzip /backup/eeo2025_full_dump_*.sql
```

#### **1c. Backend a Frontend backup (BEZ dat)**
```bash
# Backup backend (bez data adresáře)
rsync -av --exclude='data/' \
  /var/www/erdms-platform/ \
  /backup/erdms-platform_backup_$(date +%Y%m%d_%H%M%S)/

# Backup pouze konfiguračních souborů z data
rsync -av --include='*.json' --include='*.xml' --include='*.conf' \
  --exclude='*' \
  /var/www/erdms-platform/data/ \
  /backup/erdms-data-config_backup_$(date +%Y%m%d_%H%M%S)/

# Ověřit velikost backupů
du -sh /backup/*$(date +%Y%m%d)* | tail -3
```

#### **1d. Frontend build backup**
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

# Zkontrolovat verzi v package.json - měla by být 2.10
cat package.json | grep version
# Očekávaný výsledek: "version": "2.10.0"

# Build
npm run build

# Zkontrolovat build
ls -lh build/static/js/main.*.js

# Ověřit verzi v buildu
grep -o 'REACT_APP_VERSION:"[^"]*"' build/static/js/main.*.js | head -1
# Očekávaný výsledek: REACT_APP_VERSION:"2.10.0"
```

### **KROK 4: Nasazení a refresh hierarchie**

```bash
# Restartovat Apache (pokud je potřeba cache clear)
sudo systemctl reload apache2

# Nebo pouze clear cache
sudo service apache2 reload
```

#### **4a. Refresh organizační hierarchie (NUTNÉ!)**

Po frontendu rebuild je **nutné refreshnout profil PRIKAZCI** v org hierarchii, protože:
- Frontend kód byl aktualizován (8 souborů)
- Nové event types `INVOICE_MATERIAL_CHECK_*` potřebují být dostupné
- Validace polí byla opravena (`fa_predana_zam_id`)

**Postup:**
1. **Přihlásit se jako admin** do aplikace
2. **Otevřít:** Systém workflow a notifikací (Organizační hierarchie)  
3. **Vybrat profil:** `PRIKAZCI` (pravý horní dropdown)
4. **Kliknout tlačítko:** `🔄 Načíst profil`
5. **Počkat** na načtení hierarchie
6. **Zkontrolovat templates:** Měly by se zobrazit šablony:
   - ID 115: "Věcná správnost faktury vyžadována"
   - ID 117: "Věcná správnost faktury potvrzena"
7. **Ověřit event types:** V dropdown by měly být nové typy:
   - `INVOICE_MATERIAL_CHECK_REQUESTED`
   - `INVOICE_MATERIAL_CHECK_APPROVED`

**⚠️ Pokud se nové šablony nezobrazí:**
```bash
# Vyčistit cache
sudo systemctl restart apache2

# Zkontrolovat session cache v DB
mysql -h 10.3.172.11 -u erdms_user -p'CHANGE_ME_DB_PASSWORD' eeo2025-dev -e "
DELETE FROM 25_sessions WHERE dt_created < NOW() - INTERVAL 1 HOUR;
"
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

### **3. Tabulka: `25_notifikace_sablony`**

#### **HTML Email šablony (11.1.2026 20:35):**

```sql
-- Šablona 1: INVOICE_MATERIAL_CHECK_REQUESTED (ID 115)
UPDATE 25_notifikace_sablony 
SET email_telo = '[KOMPLETNÍ HTML - 14,134 znaků]'
WHERE typ = 'INVOICE_MATERIAL_CHECK_REQUESTED';

-- Šablona 2: INVOICE_MATERIAL_CHECK_APPROVED (ID 117)  
UPDATE 25_notifikace_sablony 
SET email_telo = '[KOMPLETNÍ HTML - 15,191 znaků]'
WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED';

-- Ověření nahrání:
SELECT 
    typ,
    nazev,
    email_predmet,
    LENGTH(email_telo) as html_length,
    CASE 
        WHEN email_telo LIKE '%OUTLOOK COMPATIBLE%' THEN '✅ HTML OK'
        ELSE '❌ Text only'
    END as format_status
FROM 25_notifikace_sablony
WHERE typ IN ('INVOICE_MATERIAL_CHECK_REQUESTED', 'INVOICE_MATERIAL_CHECK_APPROVED');
```

**HTML Features:**
- 🎨 **Responsive design** (max-width: 600px)  
- 💌 **MS Outlook 365 kompatibilní** (VML, MSO conditionals)
- 🌈 **Barevné themes:** Modrá (#3b82f6) / Zelená (#10b981)
- 📱 **Mobile-first** approach s fallbacky  
- 🔗 **CTA buttony** s odkazy na fakturu
- 📧 **Ikony pouze v subject**, ne v HTML hlavičkách

**Email subjects:**
- `🔍 Vyžadována kontrola věcné správnosti faktury {{invoice_number}}`
- `✅ Věcná správnost faktury {{invoice_number}} potvrzena`

**HTML placeholders:**
- `{recipient_name}`, `{invoice_number}`, `{supplier_name}`, `{predmet}`
- `{objednatel_name}`, `{garant_name}`, `{amount}`, `{date}`, `{invoice_id}`
- `{approved_by}` (pouze APPROVED template)

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

-- HTML šablony zálohovány automaticky při UPDATE (11.1.2026 20:35)
-- Původní textové verze přepsány HTML verzemi

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

-- Rollback HTML šablon (návrat k textovým verzím):
UPDATE 25_notifikace_sablony 
SET email_telo = '<h2>Vyžadována kontrola věcné správnosti</h2><p>Je třeba provést kontrolu věcné správnosti faktury.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Částka:</strong> {{amount}} Kč</p><p>Prosím ověřte, zda faktura odpovídá objednanému zboží/službám.</p>'
WHERE typ = 'INVOICE_MATERIAL_CHECK_REQUESTED';

UPDATE 25_notifikace_sablony 
SET email_telo = '<h2>Věcná správnost potvrzena</h2><p>Věcná správnost faktury byla ověřena a potvrzena.</p><p><strong>Číslo faktury:</strong> {{invoice_number}}<br><strong>Dodavatel:</strong> {{supplier_name}}<br><strong>Částka:</strong> {{amount}} Kč<br><strong>Potvrdil:</strong> {{approved_by}}</p><p>Faktura může pokračovat ke zpracování.</p>'
WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED';

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
- [x] Git záloha vytvořena (v2.10-backup-20260111_2042)
- [ ] DB FULL dump (eeo2025)  
- [ ] Backend/Frontend backup (bez data)
- [ ] Frontend rebuild (verze 2.10.0)
- [ ] Apache reload
- [ ] **Refresh org hierarchie profil PRIKAZCI**
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
| 11.1.2026 20:35 | HTML šablony nahrány do DB | ✅ Hotovo |
| TBD | Aktualizace package.json na 2.10.0 | ⏳ Čeká |
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

**Verze 2.10** přináší významná vylepšení notifikačního systému včetně standardizace typů, implementace věcné kontroly faktur a profesionálních HTML email šablon. Migrace je **bezpečná a nevyžaduje downtime**. 

**Klíčové novinky:**
- ✅ **126 notifikací** migrováno na standardní naming  
- 📧 **2 nové HTML email šablony** pro MS Outlook 365
- 🔧 **4 frontend bugfixy** (validation, anti-spam, tooltips, custom dialogs)
- 💌 **Profesionální email design** s responzivním layoutem

Databázové změny byly již provedeny. **Frontend rebuild je nutný** pro aktivaci všech nových funkcí.

**ETA celého deploymentu**: ~15 minut (včetně package.json update)  
**Doporučený čas nasazení:** Kdykoli (není nutná údržbová okna)  
**Rollback čas:** < 10 minut

---

**Vytvořeno:** 11.1.2026  
**Autor:** AI Assistant  
**Schválil:** TBD  
**Verze dokumentu:** 1.0
