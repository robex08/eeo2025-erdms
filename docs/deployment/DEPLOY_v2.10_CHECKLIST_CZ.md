# 📋 DEPLOY VERZE 2.10 - Checklist a Poznámky

**Datum přípravy:** 12. ledna 2026  
**Verze:** 2.10.0  
**Status:** 🟡 Připraveno k nasazení (čeká na frontend rebuild)  
**Branch:** `feature/generic-recipient-system` → `main`

---

## ✅ CO JE HOTOVO

### 1. Databázové migrace ✅ DOKONČENO
- **Datum:** 11. ledna 2026, 18:47
- **PROD DB:** ✅ 126 notifikací migrováno
  - `order_status_zrusena` → `ORDER_CANCELLED` (3 notifikace)
  - `ORDER_VERIFICATION_PENDING` → `INVOICE_MATERIAL_CHECK_REQUESTED` (73 notifikací)
  - `ORDER_VERIFICATION_APPROVED` → `INVOICE_MATERIAL_CHECK_APPROVED` (50 notifikací)
- **DEV DB:** ✅ Kompletně otestováno

### 2. HTML Email šablony ✅ NAHRÁNY DO DB
- **Datum:** 11. ledna 2026, 20:35
- **Šablona 1:** INVOICE_MATERIAL_CHECK_REQUESTED (ID 115) - 14,134 znaků
- **Šablona 2:** INVOICE_MATERIAL_CHECK_APPROVED (ID 117) - 15,191 znaků
- **Features:**
  - ✅ MS Outlook 365 kompatibilní
  - ✅ Responzivní design (mobile-first)
  - ✅ Profesionální barevné themes (modrá/zelená)
  - ✅ CTA buttony s přímými odkazy

### 3. Git záloha ✅ VYTVOŘENA
- **Tag:** `v2.10-backup-20260111_2042`
- **Pushnutý:** ✅ Ano

### 4. Frontend kód ✅ PŘIPRAVEN
**Aktualizované soubory (8 celkem):**
- ✅ OrderForm25.js - 2 nové invoice notification triggers
- ✅ CustomSelect.js - UI tooltip fix pro event types
- ✅ InvoiceEvidencePage.js - anti-spam logic + "Předáno komu" field
- ✅ OrganizationHierarchy.js - field validation fix
- ✅ CustomSortableDialog.js - better UX
- ✅ UpdatedInvoiceRecord.js - workflow správnost
- ✅ invoiceService.js - validations
- ✅ notificationService.js - typ oprava

---

## 🔴 CO ZBÝVÁ UDĚLAT

### KROK 1: Aktualizovat verzi v package.json ⏳
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
nano package.json
# Změnit: "version": "2.08" → "version": "2.10.0"
```

### KROK 2: Frontend Rebuild ⏳ NUTNÝ!
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client

# Build s novou verzí
npm run build

# Ověřit verzi v buildu
grep -o 'REACT_APP_VERSION:"[^"]*"' build/static/js/main.*.js | head -1
# Očekávaný výsledek: REACT_APP_VERSION:"2.10.0"
```

### KROK 3: Zálohy před nasazením ⏳
```bash
# 1. FULL DB dump (PROD)
mysqldump -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  eeo2025 > /backup/eeo2025_full_dump_$(date +%Y%m%d_%H%M%S).sql

# 2. Komprese dumpu
gzip /backup/eeo2025_full_dump_*.sql

# 3. Backend backup (bez data adresáře)
rsync -av --exclude='data/' \
  /var/www/erdms-platform/ \
  /backup/erdms-platform_backup_$(date +%Y%m%d_%H%M%S)/

# 4. Ověřit velikost backupů
du -sh /backup/*$(date +%Y%m%d)* | tail -3
```

### KROK 4: Nasazení ⏳
```bash
# Reload Apache (clear cache)
sudo systemctl reload apache2

# Nebo restart pro jistotu
sudo systemctl restart apache2
```

### KROK 5: Refresh organizační hierarchie ⏳ KRITICKÉ!
**⚠️ NUTNÉ PRO AKTIVACI NOVÝCH TEMPLATES!**

1. Přihlásit se jako **admin**
2. Otevřít **Systém workflow a notifikací** (Organizační hierarchie)
3. Vybrat profil **PRIKAZCI** (dropdown vpravo nahoře)
4. Kliknout **🔄 Načíst profil**
5. Počkat na načtení
6. **Zkontrolovat nové šablony:**
   - ID 115: "Věcná správnost faktury vyžadována"
   - ID 117: "Věcná správnost faktury potvrzena"
7. **Ověřit event types v dropdownu:**
   - `INVOICE_MATERIAL_CHECK_REQUESTED`
   - `INVOICE_MATERIAL_CHECK_APPROVED`

**Pokud se šablony nezobrazí:**
```bash
# Vyčistit session cache v DB
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025-dev -e "
DELETE FROM 25_sessions WHERE dt_created < NOW() - INTERVAL 1 HOUR;
"

# Restart Apache znovu
sudo systemctl restart apache2
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE (po nasazení)

### Test 1: Zrušení objednávky (ORDER_CANCELLED)
1. Vytvořit testovací objednávku
2. Zrušit ji (změnit stav na "Zrušená")
3. **Zkontrolovat notifikaci:**
   ```sql
   SELECT id, typ, nadpis, zprava, dt_created 
   FROM 25_notifikace 
   WHERE typ = 'ORDER_CANCELLED'
   ORDER BY dt_created DESC LIMIT 1;
   ```
4. **Ověřit:** Notifikace má správný typ a text

### Test 2: Věcná správnost faktury - Žádost
1. Otevřít schválenou objednávku
2. Přejít do záložky **Fakturace**
3. Vytvořit novou fakturu (číslo, částka, datum)
4. Kliknout **Přidat fakturu**
5. **Zkontrolovat notifikaci:**
   ```sql
   SELECT id, typ, nadpis, zprava, dt_created 
   FROM 25_notifikace 
   WHERE typ = 'INVOICE_MATERIAL_CHECK_REQUESTED'
   ORDER BY dt_created DESC LIMIT 1;
   ```
6. **Ověřit:** Email odeslán s HTML šablonou (modrý theme)

### Test 3: Věcná správnost faktury - Potvrzení
1. Na stejné faktuře najít checkbox **"Potvrzuji věcnou správnost"**
2. Zaškrtnout checkbox
3. **Zkontrolovat notifikaci:**
   ```sql
   SELECT id, typ, nadpis, zprava, dt_created 
   FROM 25_notifikace 
   WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED'
   ORDER BY dt_created DESC LIMIT 1;
   ```
4. **Ověřit:** Email odeslán s HTML šablonou (zelený theme)

### Test 4: UI Tooltips v org hierarchii
1. Otevřít **Organizační hierarchii** (admin)
2. Kliknout na libovolnou notifikační šablonu
3. V pravém panelu otevřít dropdown **Event Types**
4. **Najet myší** na event type
5. **Ověřit:** Zobrazuje se **title tooltip** s plným názvem

---

## 📊 CO SE ZMĚNILO V VERZI 2.10

### 1. Notifikační systém 📧
- ✅ **126 notifikací přejmenováno** na standardní naming (velká písmena, EN)
- ✅ **2 nové HTML email šablony** pro MS Outlook 365
- ✅ **Anti-spam logika** - notifikace jen při změně workflow stavu
- ✅ **Profesionální design** emailů s CTA buttony

### 2. Frontend bugfixy 🐛
- ✅ **Tooltips v org hierarchii** - zobrazení plných názvů event types
- ✅ **Field validation fix** - správná validace `fa_predana_zam_id`
- ✅ **Invoice anti-spam** - duplikátní notifikace eliminovány
- ✅ **Custom dialogs UX** - lepší uživatelské rozhraní

### 3. Databázové změny 💾
- ✅ **Event types standardizovány:**
  - ID 17: `INVOICE_MATERIAL_CHECK_REQUESTED`
  - ID 19: `INVOICE_MATERIAL_CHECK_APPROVED`
- ✅ **Deprecated typy označeny** s upozorněními
- ✅ **Zálohy vytvořeny** před migrací

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

### Co se NEMĚNÍ:
- ✅ Workflow objednávek (`stav_workflow_kod` používá `'ZRUSENA'`)
- ✅ Funkčnost aplikace
- ✅ Uživatelské rozhraní (kromě nových tooltipů)
- ✅ Logika schvalování

### Co se MĚNÍ:
- ⚡ **Typ notifikace** v DB (`25_notifikace.typ`)
- ⚡ **Event types** v tabulce `25_notifikace_typy_udalosti`
- ⚡ **Email šablony** - nové HTML verze místo plain textu
- ⚡ **UI tooltips** - lepší UX v org hierarchii

### Rizika:
- 🟢 **NÍZKÉ RIZIKO** - změny testovány na DEV
- 🟢 **Bez downtime** - migrace již provedena
- 🟢 **Rollback připraven** - jednoduché vrácení změn
- 🟢 **Zpětná kompatibilita** zachována

---

## 🔄 ROLLBACK PLÁN (pokud něco selže)

### 1. Rollback databáze
```sql
-- Vrátit ORDER_CANCELLED (3 notifikace)
UPDATE 25_notifikace 
SET typ = 'order_status_zrusena'
WHERE id IN (276, 277, 278);

-- Vrátit INVOICE_MATERIAL_CHECK_REQUESTED (73 notifikací)
UPDATE 25_notifikace n
INNER JOIN 25_notifikace_backup_verification_20260111 b ON n.id = b.id
SET n.typ = b.typ
WHERE n.typ = 'INVOICE_MATERIAL_CHECK_REQUESTED';

-- Vrátit INVOICE_MATERIAL_CHECK_APPROVED (50 notifikací)
UPDATE 25_notifikace 
SET typ = 'ORDER_VERIFICATION_APPROVED'
WHERE typ = 'INVOICE_MATERIAL_CHECK_APPROVED'
AND dt_created <= '2025-12-13 16:54:50';
```

### 2. Rollback frontend buildu
```bash
cd /var/www/erdms-platform/apps/eeo-v2/client
rm -rf build
cp -r build.backup_20260111_* build
sudo systemctl reload apache2
```

### 3. Ověření rollbacku
```sql
SELECT typ, COUNT(*) 
FROM 25_notifikace 
WHERE typ IN ('order_status_zrusena', 'ORDER_VERIFICATION_PENDING', 'ORDER_VERIFICATION_APPROVED')
GROUP BY typ;
```

**ETA rollbacku:** < 10 minut

---

## 📞 KONTAKTY A ODKAZY

### Dokumentace:
- **📖 Kompletní deployment guide:** [DEPLOYMENT_v2.10_NOTIFICATION_TYPES_STANDARDIZATION.md](./DEPLOYMENT_v2.10_NOTIFICATION_TYPES_STANDARDIZATION.md)
- **📝 Build instrukce:** [BUILD.md](../../BUILD.md)
- **🔄 Changelog:** [CHANGELOG_INVOICE_MATERIAL_CORRECTNESS_NOTIFICATIONS.md](../CHANGELOG_INVOICE_MATERIAL_CORRECTNESS_NOTIFICATIONS.md)

### SQL migrace:
- `/var/www/erdms-dev/docs/migrations/20260111_rename_order_status_zrusena_to_ORDER_CANCELLED.sql`
- `/var/www/erdms-dev/docs/migrations/20260111_invoice_material_correctness_notifications.sql`

### Zálohy:
- **DB zálohy:** `25_notifikace_backup_zrusena_20260111` (3)
- **DB zálohy:** `25_notifikace_backup_verification_20260111` (73)
- **Git tag:** `v2.10-backup-20260111_2042`

---

## ⏱️ ČASOVÝ ODHAD

| Krok | Čas | Status |
|------|-----|--------|
| Aktualizace package.json | 1 min | ⏳ Čeká |
| Frontend rebuild | 3-5 min | ⏳ Čeká |
| DB zálohy | 2-3 min | ⏳ Čeká |
| Nasazení + reload | 1 min | ⏳ Čeká |
| Refresh org hierarchie | 2 min | ⏳ Čeká |
| Testování | 5-10 min | ⏳ Čeká |
| **CELKEM** | **~15-20 min** | |

**Doporučený čas nasazení:** Kdykoli (není nutná údržbová okna)

---

## ✅ FINÁLNÍ CHECKLIST

### Před nasazením:
- [x] ✅ Databázová migrace provedena (11.1.2026 18:47)
- [x] ✅ HTML šablony nahrány do DB (11.1.2026 20:35)
- [x] ✅ Git záloha vytvořena (v2.10-backup-20260111_2042)
- [x] ✅ Frontend kód připraven (8 souborů aktualizováno)
- [x] ✅ Rollback plán připraven
- [ ] ⏳ package.json verze aktualizována na 2.10.0
- [ ] ⏳ FULL DB dump vytvořen
- [ ] ⏳ Backend/Frontend backup vytvořen

### Během nasazení:
- [ ] ⏳ Frontend rebuild spuštěn
- [ ] ⏳ Build verze ověřena (2.10.0)
- [ ] ⏳ Apache reload proveden
- [ ] ⏳ **Org hierarchie PRIKAZCI refreshnuta** (KRITICKÉ!)
- [ ] ⏳ Browser cache vyčištěn (Ctrl+F5)

### Po nasazení:
- [ ] ⏳ Test 1: ORDER_CANCELLED notifikace
- [ ] ⏳ Test 2: INVOICE_MATERIAL_CHECK_REQUESTED
- [ ] ⏳ Test 3: INVOICE_MATERIAL_CHECK_APPROVED
- [ ] ⏳ Test 4: UI Tooltips v org hierarchii
- [ ] ⏳ Monitoring 24 hodin
- [ ] ⏳ Úklid záložních tabulek (po 30 dnech)

---

## 🎯 SHRNUTÍ

**Verze 2.10** přináší významná vylepšení notifikačního systému:

- 📧 **126 notifikací migrováno** na standardní naming
- 💌 **2 profesionální HTML email šablony** pro MS Outlook 365
- 🐛 **4 frontend bugfixy** (validation, anti-spam, tooltips, UX)
- 🔧 **Standardizace event types** pro budoucí rozšíření
- ⚡ **Bez downtime** - migrace již provedena
- 🔄 **Rychlý rollback** - < 10 minut v případě problémů

**Zbývá pouze:**
1. Aktualizovat verzi v package.json
2. Rebuild frontend
3. Refreshnout org hierarchii
4. Otestovat

**ETA celého deploymentu:** ~15-20 minut  
**Status:** 🟢 Připraveno k nasazení  
**Riziko:** 🟢 Nízké

---

**Vytvořeno:** 12. ledna 2026  
**Poslední aktualizace:** 12. ledna 2026  
**Autor:** Development Team  
**Status:** ✅ Připraveno

---

## 📝 POZNÁMKY Z TÝMU

### Co jsme se naučili:
- ✅ Databázové migrace před frontend buildem = bezpečnější
- ✅ HTML email šablony nutné testovat v MS Outlook 365
- ✅ Org hierarchie refresh je kritický krok po deployment
- ✅ Git tagy zálohy jsou must-have před každým nasazením

### Pro příště:
- 🔄 Automatizovat refresh org hierarchie po deploymentu
- 📧 Přidat email notifikaci o úspěšném deploymentu
- 🤖 Vytvořit CI/CD pipeline pro automatické buildy
- 📊 Přidat monitoring metriky pro notifikační systém

---

**🚀 Hodně štěstí při nasazení!**
