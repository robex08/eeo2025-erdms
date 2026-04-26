# 🔍 AUDIT TŘÍDĚNÍ V SEKCI STATS AND REPORTS
**Datum:** 26. dubna 2026  
**Kontext:** Kontrola po implementaci backend sorting pro tabulky s paging z API

---

## 📊 PŘEHLED TABULEK

### ✅ BACKEND SORTING (Paging z API) - SPRÁVNĚ IMPLEMENTOVÁNO

#### 1. **Sekce: Přílohy → "Objednávky bez příloh"**
- **State:** `ordersWithoutAttachments`
- **API Endpoint:** `POST /api.eeo/order-v2/attachments/orders-without`
- **Parametry:** `sort_by`, `sort_dir`, `page`, `per_page`
- **Status:** ✅ Backend sorting funguje
- **Backend handler:** `orderV2AttachmentHandlers.php::handle_order_v2_orders_without_attachments`
- **Tříditelné sloupce:**
  - `cislo_objednavky` → `o.cislo_objednavky`
  - `nazev` → `o.predmet`
  - `stav` → `o.stav_objednavky`
  - `dodavatel` → `o.dodavatel_nazev`
  - `objednatel` → `u.prijmeni`
  - `castka` → `o.max_cena_s_dph`

#### 2. **Sekce: Přílohy → "Faktury bez příloh"**
- **State:** `invoicesWithoutAttachments`
- **API Endpoint:** `POST /api.eeo/order-v2/invoices/invoices-without-attachments`
- **Parametry:** `sort_by`, `sort_dir`, `page`, `per_page`
- **Status:** ✅ Backend sorting funguje
- **Backend handler:** `orderV2InvoiceAttachmentHandlers.php::handle_order_v2_invoices_without_attachments`
- **Tříditelné sloupce:**
  - `cislo_faktury` → `f.cislo_faktury`
  - `stav` → `f.stav`
  - `datum_splatnosti` → `f.fa_datum_splatnosti`
  - `cislo_objednavky` → `o.cislo_objednavky`
  - `dodavatel` → `f.dodavatel_nazev`
  - `castka` → `f.fa_celkova_castka_s_dph`

#### 3. **Sekce: Přílohy → Přílohy objednávek podle typu (accordion)**
- **State:** `attachmentsByType.orders`
- **API Endpoint:** `POST /api.eeo/order-v2/attachments/by-type/:type`
- **Status:** ⚠️ BEZ SORTING - pouze paging
- **Poznámka:** Accordion rozbalení, třídění není implementováno (není třeba)

#### 4. **Sekce: Přílohy → Přílohy faktur podle typu (accordion)**
- **State:** `attachmentsByType.invoices`
- **API Endpoint:** `POST /api.eeo/order-v2/invoices/attachments/by-type/:type`
- **Status:** ⚠️ BEZ SORTING - pouze paging
- **Poznámka:** Accordion rozbalení, třídění není implementováno (není třeba)

---

### ✅ LOKÁLNÍ SORTING (getPagedItems) - DATA JIŽ NAČTENÁ NA FE

#### 5. **Sekce: Vzdělávání → Lékařské vzdělávání**
- **State:** `pagedVzdelLekarsky`
- **Zdroj dat:** `vzdelSections.lekarsky` (načteno z Order V3 API s filtrem)
- **Status:** ✅ Lokální sorting funguje
- **Speciální:** Má prioritní sorting (`getVzdelOrderPriority`)

#### 6. **Sekce: Vzdělávání → Nelékařské vzdělávání**
- **State:** `pagedVzdelNelekarsky`
- **Zdroj dat:** `vzdelSections.nelekarsky`
- **Status:** ✅ Lokální sorting funguje

#### 7. **Sekce: Kontrola → Objednávky nad limit**
- **State:** `pagedOrdersOverLimit`
- **Zdroj dat:** `controlSections.ordersOverLimit`
- **Status:** ✅ Lokální sorting funguje

#### 8. **Sekce: Kontrola → Objednávky s FA před schválením**
- **State:** `pagedOrdersAfterInvoice`
- **Zdroj dat:** `controlSections.ordersAfterInvoice`
- **Status:** ✅ Lokální sorting funguje

#### 9. **Sekce: Kontrola → Obj & FA bez příloh**
- **State:** `pagedOrdersInvoicesWithoutAttachments`
- **Zdroj dat:** `controlSections.ordersInvoicesWithoutAttachments`
- **Status:** ✅ Lokální sorting funguje

#### 10. **Sekce: Kontrola → Faktury bez příloh** (LOKÁLNÍ VERZE!)
- **State:** `pagedInvoicesWithoutAttachments`
- **Zdroj dat:** `controlSections.invoicesWithoutAttachments`
- **Status:** ✅ Lokální sorting funguje
- **⚠️ POZOR:** Jiná tabulka než v sekci Přílohy! Má stejný název, ale jinou implementaci.

#### 11. **Sekce: Kontrola → Faktury po splatnosti**
- **State:** `pagedOverdueInvoices`
- **Zdroj dat:** `controlSections.overdueInvoices`
- **Status:** ✅ Lokální sorting funguje

#### 12. **Sekce: Kontrola → Storno objednávky**
- **State:** `pagedCancelledOrders`
- **Zdroj dat:** `controlSections.cancelledOrders`
- **Status:** ✅ Lokální sorting funguje

#### 13. **Sekce: Kontrola → Objednávky bez faktury 2+ měsíce**
- **State:** `pagedOrdersWithoutInvoice`
- **Zdroj dat:** `ordersWithoutInvoice` (filtrováno z `filteredOrders`)
- **Status:** ✅ Lokální sorting funguje

#### 14. **Sekce: Kontrola → Objednávky s fakturou, ale ne dokončené**
- **State:** `pagedOrdersWithInvoiceNotDone`
- **Status:** ✅ Lokální sorting funguje

#### 15. **Sekce: Kontrola → Objednávky s chybějícím LP čerpáním**
- **State:** `pagedOrdersWithMissingLpCerpani`
- **Status:** ✅ Lokální sorting funguje

#### 16. **Sekce: Přílohy → Seznam všech příloh**
- **State:** `pagedAllAttachments` / `pagedInvoiceAttachmentsList`
- **Zdroj dat:** `allAttachmentsCombined` (kombinace obj + FA + RP příloh)
- **Status:** ✅ Lokální sorting funguje

#### 17. **Sekce: Přehledy → Pivot tabulka**
- **State:** `pagedPivotRows`
- **Status:** ✅ Lokální sorting funguje

---

## 🐛 NALEZENÉ PROBLÉMY

### ❌ KRITICKÝ BUG: Nekonečný loop v useEffect

**Problém:**
```javascript
// ❌ ŠPATNĚ - Vytváří nekonečný loop
useEffect(() => {
  if (ordersWithoutAttachments && activeTab === 'attachments') {
    handleLoadOrdersWithoutAttachments(1);
  }
}, [tableSorts['ordersWithoutAttachments']]);  // ← Každý render = nový objekt!
```

**Důsledek:**
- Endpoint se volá neustále dokola (7x za 7 sekund dle logu)
- Zbytečné zatížení serveru
- Třídění nefunguje, protože se stále resetuje na stránku 1

**Řešení:**
```javascript
// ✅ SPRÁVNĚ - JSON.stringify prevence loop
useEffect(() => {
  if (ordersWithoutAttachments && activeTab === 'attachments') {
    handleLoadOrdersWithoutAttachments(1);
  }
}, [JSON.stringify(tableSorts['ordersWithoutAttachments']), activeTab]);
```

---

## ✅ KONTROLNÍ SEZNAM

### Backend sorting (API tabulky)
- [x] `ordersWithoutAttachments` - sort_by a sort_dir parametry v API
- [x] `invoicesWithoutAttachments` - sort_by a sort_dir parametry v API
- [x] SQL queries používají dynamický ORDER BY
- [x] SQL injection ochrana (mapování sloupců)
- [x] Frontend posílá správné parametry do API
- [x] useEffect nemá nekonečný loop (OPRAVENO)

### Lokální sorting (FE tabulky)
- [x] `sortTableData` funkce používá české locale (cs-CZ)
- [x] Three-state sorting (ASC → DESC → none)
- [x] Všechny tabulky používají `getPagedItems` konzistentně
- [x] Sort accessor functions jsou správně definovány

---

## 🚀 DOPORUČENÍ

### Pro budoucí vývoj:
1. **Backend sorting POUZE pro tabulky s backend paging**
   - Poznáš podle: `data.pagination.total_pages`
   - Příklad: `ordersWithoutAttachments`, `invoicesWithoutAttachments`

2. **Lokální sorting pro data načtená celá**
   - Poznáš podle: `getPagedItems(sortTableData(...))`
   - Většina tabulek v sekcích Vzdělávání, Kontrola

3. **Prevence useEffect loop:**
   - NIKDY nedávat `tableSorts[key]` přímo do dependencies
   - Vždy použít `JSON.stringify(tableSorts[key])`

4. **Pojmenování:**
   - Backend verze: `ordersWithoutAttachments` (state)
   - Lokální verze: `pagedInvoicesWithoutAttachments` (computed)

---

## 📝 TESTOVÁNÍ

### Backend sorting test:
```bash
# 1. Otevři sekci Přílohy
# 2. Klikni na sloupec STAV v "Objednávky bez příloh"
# 3. Zkontroluj v Network: POST s params: {sort_by: 'stav', sort_dir: 'ASC'}
# 4. Data by měla být setříděná abecedně
# 5. Další klik → sort_dir: 'DESC' (sestupně)
# 6. Další klik → parametry sort_by a sort_dir zmizí (reset)
```

### Lokální sorting test:
```bash
# 1. Otevři sekci Kontrola
# 2. Klikni na sloupec v jakékoliv tabulce
# 3. Data se setřídí BEZ volání API (žádný request v Network)
# 4. Stránkování funguje na už načtených datech
```

---

## 🔧 COMMIT

```bash
git add -A
git commit -m "fix(sorting): Oprava nekonečného loop v useEffect pro backend sorting

- JSON.stringify v dependencies pro prevenci loop
- Audit všech tabulek v Stats & Reports
- Dokumentace: které tabulky mají backend vs. lokální sorting
"
```
