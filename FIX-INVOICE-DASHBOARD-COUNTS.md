# 🐛 FIX: Nesoulad v počtech faktur v dashboardu

**Datum:** 26. ledna 2026  
**Typ:** Bug Fix  
**Modul:** Faktury - Dashboard a filtrování

---

## 📋 POPIS PROBLÉMU

Dashboard faktur ukazoval **nesoulad mezi čísly na dlaždici a počtem faktur v seznamu**.

**Příklad:**
- Dlaždice "Po splatnosti" ukazovala **16 faktur**
- Ale v seznamu se zobrazovaly i faktury které byly "K zaplacení" nebo "Zaplaceno"

---

## 🔍 IDENTIFIKOVANÉ CHYBY

### 1. Frontend - Funkce `getInvoiceStatus()` ❌

**Soubor:** `apps/eeo-v2/client/src/pages/Invoices25List.js`

**Chyba:**
```javascript
// PŘED OPRAVOU - CHYBNÁ LOGIKA
if (invoice.fa_datum_splatnosti) {
  const splatnost = new Date(invoice.fa_datum_splatnosti);
  if (splatnost < now) {
    return 'overdue';  // ❌ Nekontroluuje stav ZAPLACENO/DOKONCENA!
  }
}
```

**Problém:**
- Frontend označoval fakturu jako "overdue" (po splatnosti) **i když už byla zaplacená** nebo měla stav `ZAPLACENO`/`DOKONCENA`
- Backend tyto faktury správně vyfiltroval z "po splatnosti"
- Výsledek: Frontend počítal více faktur jako "po splatnosti" než backend skutečně vracel

**Oprava:**
```javascript
// PO OPRAVĚ - SPRÁVNÁ LOGIKA
// Kontrola stavů ZAPLACENO/DOKONCENA je v bodu 1️⃣ (ty vrátí 'paid')
// Takže pokud se dostaneme sem, už víme že faktura NENÍ zaplacená
if (invoice.fa_datum_splatnosti) {
  const splatnost = new Date(invoice.fa_datum_splatnosti);
  if (splatnost < now) {
    return 'overdue';  // ✅ K_ZAPLACENI může být po splatnosti!
  }
}
```

---

### 2. Backend - Statistiky "Po splatnosti" ⚠️

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

**Chyba:**
```sql
-- PŘED OPRAVOU
COUNT(CASE WHEN 
  f.fa_zaplacena = 0 
  AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA') 
  AND f.fa_datum_splatnosti < CURDATE()  -- ❌ Nekontroluuje NULL!
THEN 1 END) as pocet_po_splatnosti
```

**Problém:**
- Pokud faktura měla `fa_datum_splatnosti = NULL`, mohla být nesprávně započítána
- SQL podmínka `< CURDATE()` vrací `NULL` pokud je `fa_datum_splatnosti` NULL

**Oprava:**
```sql
-- PO OPRAVĚ
COUNT(CASE WHEN 
  f.fa_zaplacena = 0 
  AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA') 
  AND f.fa_datum_splatnosti IS NOT NULL  -- ✅ Musí mít datum!
  AND f.fa_datum_splatnosti < CURDATE()
THEN 1 END) as pocet_po_splatnosti
```

---

### 3. Backend - Filtr "unpaid" (nezaplaceno) ⚠️

**Chyba:**
```sql
-- PŘED OPRAVOU
WHERE f.fa_zaplacena = 0 
  AND f.stav NOT IN ("ZAPLACENO", "DOKONCENA") 
  AND f.fa_datum_splatnosti >= CURDATE()  -- ❌ Vynechává faktury BEZ splatnosti!
```

**Problém:**
- Faktury **bez data splatnosti** (`NULL`) se nezobrazily v kategorii "Nezaplaceno"
- Přitom tyto faktury jsou nezaplacené a měly by být v seznamu

**Oprava:**
```sql
-- PO OPRAVĚ
WHERE f.fa_zaplacena = 0 
  AND f.stav NOT IN ("ZAPLACENO", "DOKONCENA") 
  AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL)  -- ✅ Zahrnuje i NULL!
```

---

### 4. Backend - Filtr "overdue" (po splatnosti) ⚠️

**Chyba:**
```sql
-- PŘED OPRAVOU
WHERE f.fa_zaplacena = 0 
  AND f.stav NOT IN ("ZAPLACENO", "DOKONCENA") 
  AND f.fa_datum_splatnosti < CURDATE()  -- ❌ Neošetřuje NULL!
```

**Oprava:**
```sql
-- PO OPRAVĚ
WHERE f.fa_zaplacena = 0 
  AND f.stav NOT IN ("ZAPLACENO", "DOKONCENA") 
  AND f.fa_datum_splatnosti IS NOT NULL  -- ✅ Musí mít datum!
  AND f.fa_datum_splatnosti < CURDATE()
```

---

### 5. Backend - Zpětná kompatibilita `filter_stav` ⚠️

Stejné opravy byly aplikovány i na sloupcový filtr `filter_stav` (slouží pro zpětnou kompatibilitu se starým kódem).

---

## ✅ PROVEDENÉ OPRAVY

| Soubor | Řádky | Změna |
|--------|-------|-------|
| `Invoices25List.js` | 2126-2150 | ✅ Opravena funkce `getInvoiceStatus()` - přidána kontrola stavů ZAPLACENO/DOKONCENA |
| `invoiceHandlers.php` | 1888-1889 | ✅ Opraveny statistiky "po splatnosti" - přidána kontrola `IS NOT NULL` |
| `invoiceHandlers.php` | 1783-1789 | ✅ Opraven filtr "unpaid" - přidána podmínka `OR IS NULL` |
| `invoiceHandlers.php` | 1786-1792 | ✅ Opraven filtr "overdue" - přidána kontrola `IS NOT NULL` |
| `invoiceHandlers.php` | 1662-1676 | ✅ Opravena zpětná kompatibilita `filter_stav` |

---

## 🧪 TESTOVÁNÍ

### Testovací scénáře:

1. **Dlaždice "Po splatnosti" (16)**
   - ✅ Zobrazí POUZE faktury které:
     - Nejsou zaplacené (`fa_zaplacena = 0`)
     - NEJSOU ve stavu `ZAPLACENO` nebo `DOKONCENA`
     - Mají datum splatnosti (`IS NOT NULL`)
     - Datum splatnosti je v minulosti (`< dnes`)

2. **Dlaždice "Nezaplaceno"**
   - ✅ Zobrazí POUZE faktury které:
     - Nejsou zaplacené (`fa_zaplacena = 0`)
     - NEJSOU ve stavu `ZAPLACENO` nebo `DOKONCENA`
     - NEMAJÍ datum splatnosti NEBO splatnost je v budoucnosti

3. **Dlaždice "Zaplaceno"**
   - ✅ Zobrazí POUZE faktury které:
     - Jsou zaplacené (`fa_zaplacena = 1`) NEBO
     - Mají stav `ZAPLACENO` nebo `DOKONCENA`

---

## 📊 OČEKÁVANÝ VÝSLEDEK

Po kliknutí na dlaždici "Po splatnosti (16)":
- ✅ Seznam bude obsahovat **přesně 16 faktur**
- ✅ Všechny faktury budou **skutečně po splatnosti**
- ✅ Žádná faktura nebude ve stavu `ZAPLACENO`, `DOKONCENA` nebo `K_ZAPLACENI`
- ✅ Všechny faktury budут mít datum splatnosti v minulosti

---

## 🔄 DEPLOY

**Backend:**
```bash
# Žádný restart potřeba - PHP načte změny automaticky
```

**Frontend:**
```bash
cd /var/www/erdms-dev/dashboard
npm run build
# nebo
./build-dashboard.sh
```

---

## 📝 POZNÁMKY

### Klíčové body logiky:

1. **Faktura je "ZAPLACENA"** pokud:
   - `fa_zaplacena = 1` NEBO
   - `stav IN ('ZAPLACENO', 'DOKONCENA')`

2. **Faktura je "PO SPLATNOSTI"** pokud:
   - `(fa_zaplacena = 0 OR fa_zaplacena IS NULL)` A
   - `stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO')` A
   - `fa_datum_splatnosti IS NOT NULL` A
   - `fa_datum_splatnosti < CURDATE()`
   - ⚠️ **Stav `K_ZAPLACENI` MŮŽE být po splatnosti!** (ještě není zaplaceno)
   - ⚠️ **Stav `STORNO` se NIKDY nepočítá jako "po splatnosti"** (faktura je zrušená)

3. **Faktura je "NEZAPLACENA"** pokud:
   - `(fa_zaplacena = 0 OR fa_zaplacena IS NULL)` A
   - `stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO')` A
   - (`fa_datum_splatnosti >= CURDATE()` NEBO `fa_datum_splatnosti IS NULL`)
   - ⚠️ **Stav `STORNO` se NIKDY nezobrazuje v "nezaplaceno"** (faktura je zrušená)

---

**Autor:** GitHub Copilot  
**Verze:** 2026.01.26
