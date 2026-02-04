# 🔍 ANALÝZA: Možné příčiny samovolného mazání příloh faktur

**Datum analýzy:** 4. února 2026  
**Modul:** OrderForm25 + Backend Invoice Handlers  
**Problém:** Přílohy faktur se někdy mažou "samovolně" při ukládání objednávky nebo potvrzování věcné správnosti

---

## 📋 SHRNUTÍ

Po analýze kódu **NEBYLY NALEZENY ŽÁDNÉ MÍSTA**, kde by docházelo k automatickému mazání příloh při běžných operacích (ukládání objednávky, potvrzování věcné správnosti). Přílohy se mažou **pouze při explicitním volání DELETE endpointů** nebo při hard delete faktury.

---

## ✅ CO FUNGUJE SPRÁVNĚ

### 1. **OrderForm25.js - Save Objednávky**
   - **Kód:** [OrderForm25.js](apps/eeo-v2/client/src/forms/OrderForm25.js#L10900-L11750)
   - **Popis:** Při ukládání objednávky (INSERT nebo UPDATE) se přílohy faktur **NETYKAJÍ**.
   - **Důvod:** 
     - Přílohy se spravují **separátně** přes Invoice Attachments API
     - Frontend neposílá informace o přílohách při save objednávky
     - Backend NEMAZAV přílohy při UPDATE faktury

### 2. **orderV2Endpoints.php - UPDATE faktury**
   - **Kód:** [orderV2Endpoints.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php#L1527-L1650)
   - **Popis:** Při UPDATE existující faktury se přílohy **NEMAZAV**.
   - **Logika:**
     ```php
     // Pouze zadané hodnoty budou aktualizovány
     if (isset($faktura['fa_castka'])) { ... }
     if (isset($faktura['fa_cislo_vema'])) { ... }
     if (isset($faktura['vecna_spravnost_potvrzeno'])) { ... }
     // Přílohy NEJSOU součástí tohoto UPDATE!
     ```

### 3. **orderV2Endpoints.php - INSERT nové faktury**
   - **Kód:** [orderV2Endpoints.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php#L1434-L1525)
   - **Popis:** Při CREATE nové faktury se přílohy **NEVYTVÁŘEJÍ** automaticky.
   - **Důvod:** Přílohy se nahrávají separátně přes Invoice Attachments API.

### 4. **invoiceHandlers.php - UPDATE faktury (DEPRECATED)**
   - **Kód:** [invoiceHandlers.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php#L430-L730)
   - **Popis:** Legacy handler pro UPDATE faktur - **NEMAZAV přílohy**.
   - **Status:** ⚠️ DEPRECATED, ale stále aktivní pro starší kód.

---

## 🚨 KDY SE PŘÍLOHY MAŽOU (INTENTIONAL DELETE)

### 1. **Explicitní DELETE přes API**
   - **Frontend:** `deleteInvoiceAttachment25()` v [api25invoices.js](apps/eeo-v2/client/src/services/api25invoices.js#L682-L715)
   - **Backend:** `handle_order_v2_delete_invoice_attachment()` v orderV2InvoiceAttachmentHandlers.php
   - **Trigger:** Uživatel klikne na koš u přílohy faktury
   - **Stav:** ✅ CORRECT - toto je očekávané chování

### 2. **Hard Delete faktury**
   - **Frontend:** `deleteInvoiceV2(invoiceId, token, username, hardDelete=true)`
   - **Backend:** `handle_invoices25_delete()` v [invoiceHandlers.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php#L730-L825)
   - **Logika:**
     ```php
     if ($hard_delete === 1) {
         // 1. Načti přílohy
         $prilohy = $db->query("SELECT systemova_cesta FROM faktury_prilohy WHERE faktura_id = ?");
         // 2. Smaž přílohy z databáze
         $db->query("DELETE FROM faktury_prilohy WHERE faktura_id = ?");
         // 3. Smaž soubory z disku
         foreach ($prilohy as $priloha) { unlink($priloha['systemova_cesta']); }
         // 4. Smaž fakturu
         $db->query("DELETE FROM faktury WHERE id = ?");
     }
     ```
   - **Trigger:** Uživatel explicitně smaže celou fakturu (hard delete)
   - **Stav:** ✅ CORRECT - toto je očekávané chování

### 3. **Soft Delete faktury**
   - **Backend:** `handle_invoices25_delete()` s `hard_delete=0`
   - **Logika:**
     ```php
     // Soft delete - přílohy ZŮSTÁVAJÍ v DB i na disku!
     UPDATE faktury SET aktivni = 0 WHERE id = ?;
     UPDATE faktury_prilohy SET dt_aktualizace = NOW() WHERE faktura_id = ?;
     ```
   - **Stav:** ✅ CORRECT - přílohy se NEMAŽOU

---

## ❓ MOŽNÉ PŘÍČINY PROBLÉMU (HYPOTÉZY)

### Hypotéza 1: **Race Condition při paralelním ukládání**
   - **Scénář:** 
     - Uživatel rychle klikne na "Uložit" vícekrát
     - Dva requesty běží paralelně
     - Jeden z requestů vrátí "prázdné" přílohy protože druhý ještě není dokončen
   - **Pravděpodobnost:** 🟡 STŘEDNÍ
   - **Jak testovat:**
     - Zkontrolovat MySQL logs pro duplicitní UPDATE requesty
     - Přidat timestamp logging do backend handlers
   - **Doporučení:**
     ```javascript
     // Frontend: Disable save button po kliknutí
     const [isSaving, setIsSaving] = useState(false);
     
     const handleSave = async () => {
       if (isSaving) return; // Prevent double-click
       setIsSaving(true);
       try {
         await updateOrderV2(...);
       } finally {
         setIsSaving(false);
       }
     };
     ```

### Hypotéza 2: **Frontend State Management Issue**
   - **Scénář:**
     - Frontend má zastaralý state příloh v paměti
     - Při ukládání pošle "prázdné" faktury (bez příloh)
     - Backend to interpretuje jako "žádné změny příloh"
   - **Pravděpodobnost:** 🟢 NÍZKÁ
   - **Důvod:** Přílohy se spravují separátně přes Invoice Attachments API
   - **Kontrola:** 
     ```javascript
     // V OrderForm25.js se přílohy načítají při mount:
     const faktury = await Promise.all(
       dbOrder.faktury.map(async faktura => {
         const prilohy = await listInvoiceAttachments(...);
         return { ...faktura, prilohy };
       })
     );
     ```

### Hypotéza 3: **Chyba při načítání příloh po save**
   - **Scénář:**
     - Save objednávky proběhne úspěšně
     - Při načítání objednávky zpět (refresh) selže načtení příloh
     - Frontend zobrazí fakturu bez příloh (ale přílohy jsou stále v DB)
   - **Pravděpodobnost:** 🟡 STŘEDNÍ
   - **Jak zjistit:**
     ```javascript
     // Přidat console.log do OrderForm25.js po save:
     console.log('📋 Faktury po uložení:', result.faktury);
     console.log('📎 Přílohy faktur:', result.faktury[0]?.prilohy);
     
     // Zkontrolovat, jestli backend vrací přílohy správně:
     // orderV2Endpoints.php - funkce enrichOrderWithInvoices()
     ```

### Hypotéza 4: **Problém s InvoiceAttachmentsCompact komponentou**
   - **Scénář:**
     - Komponenta `InvoiceAttachmentsCompact` při re-renderu "ztratí" přílohy
     - State se resetuje na prázdné pole
   - **Pravděpodobnost:** 🟢 NÍZKÁ
   - **Kontrola:**
     ```javascript
     // V InvoiceAttachmentsCompact.jsx zkontrolovat:
     useEffect(() => {
       console.log('📎 Attachments changed:', attachments);
     }, [attachments]);
     ```

### Hypotéza 5: **MySQL Transaction Rollback**
   - **Scénář:**
     - Při ukládání objednávky nastane chyba v transakci
     - MySQL provede ROLLBACK
     - Přílohy nahrané před chybou se smažou (cascading delete?)
   - **Pravděpodobnost:** 🔴 VELMI NÍZKÁ
   - **Důvod:** 
     - V DB není nastavený CASCADE DELETE na faktury_prilohy
     - Přílohy se nahrávají v separátní transakci

---

## 🔧 DOPORUČENÉ KROKY PRO DEBUGGING

### 1. **Přidat Extended Logging**
   ```php
   // V orderV2Endpoints.php - před UPDATE faktury:
   error_log("🔍 [DEBUG] Updating invoice #{$faktura_id}");
   error_log("🔍 [DEBUG] Invoice data: " . json_encode($faktura));
   
   // Po UPDATE:
   $attachments_count = $db->query("SELECT COUNT(*) FROM faktury_prilohy WHERE faktura_id = $faktura_id")->fetchColumn();
   error_log("🔍 [DEBUG] Attachments after update: $attachments_count");
   ```

### 2. **Přidat Frontend Debugging**
   ```javascript
   // V OrderForm25.js - handleSaveOrder funkce:
   console.group('💾 SAVE ORDER DEBUG');
   console.log('📋 Faktury před save:', formData.faktury);
   console.log('📎 Přílohy před save:', formData.faktury[0]?.prilohy);
   
   const result = await updateOrderV2(...);
   
   console.log('📋 Faktury po save:', result.faktury);
   console.log('📎 Přílohy po save:', result.faktury[0]?.prilohy);
   console.groupEnd();
   ```

### 3. **Zkontrolovat MySQL Logs**
   ```bash
   # Zapnout MySQL query logging:
   sudo mysql -e "SET GLOBAL general_log = 'ON';"
   sudo mysql -e "SET GLOBAL log_output = 'FILE';"
   
   # Sledovat logy:
   sudo tail -f /var/log/mysql/query.log | grep "faktury_prilohy"
   ```

### 4. **Testovací Scénář**
   ```
   1. Vytvořit novou objednávku s fakturou
   2. Nahrát přílohu faktury (PDF)
   3. Zkontrolovat, že příloha je v DB:
      SELECT * FROM 25a_objednavky_faktury_prilohy WHERE faktura_id = XXX;
   4. Zaškrtnout "Potvrzení věcné správnosti"
   5. Uložit objednávku
   6. Znovu zkontrolovat DB - jsou přílohy stále tam?
   7. Zkontrolovat PHP error log:
      tail -f /var/log/php8.1-fpm.log
   ```

### 5. **Sledovat Network Tab v DevTools**
   ```
   1. Otevřít Chrome DevTools > Network
   2. Filtrovat: "order-v2"
   3. Při ukládání objednávky sledovat:
      - Request Payload (co FE posílá)
      - Response (co BE vrací)
   4. Zkontrolovat, jestli response obsahuje faktury s přílohami
   ```

---

## 📊 PRAVDĚPODOBNOST PŘÍČIN

| Příčina | Pravděpodobnost | Dopad | Priorita |
|---------|----------------|-------|----------|
| Race Condition | 🟡 STŘEDNÍ | VYSOKÝ | 🔴 P1 |
| Chyba při načítání po save | 🟡 STŘEDNÍ | STŘEDNÍ | 🟡 P2 |
| Frontend State Issue | 🟢 NÍZKÁ | VYSOKÝ | 🟡 P2 |
| Component Re-render | 🟢 NÍZKÁ | STŘEDNÍ | 🟢 P3 |
| DB Transaction Rollback | 🔴 VELMI NÍZKÁ | VYSOKÝ | 🟢 P3 |

---

## ✅ ZÁVĚR

**Kód NEOBSAHUJE logiku pro automatické mazání příloh** při běžných operacích. Přílohy se mažou **pouze při explicitním volání DELETE** nebo **hard delete faktury**.

**Doporučení:**
1. ✅ Implementovat **extended logging** (viz sekce Debugging)
2. ✅ Testovat **race conditions** (double-click na Save)
3. ✅ Zkontrolovat **MySQL query logs** pro neočekávané DELETE
4. ✅ Sledovat **Network tab** při ukládání objednávky
5. ✅ Přidat **console.log** do kritických míst ve frontendu

**Podezřelá místa:**
- ❌ **NEJSOU** - kód je konzistentní a bezpečný

**Další kroky:**
1. Reprodukovat problém v DEV prostředí
2. Zachytit MySQL queries během reprodukce
3. Zkontrolovat PHP error log
4. Analyzovat Network traffic v DevTools

---

## 📞 KONTAKT PRO DALŠÍ DEBUGGING

Pokud problém přetrvává, kontaktujte:
- **Backend:** Zkontrolovat MySQL general_log
- **Frontend:** Přidat console.log do OrderForm25.js
- **DevOps:** Zkontrolovat filesystem permissions na `/var/www/erdms-dev/data/`

**Doporučené nástroje:**
- Chrome DevTools > Network tab
- MySQL Workbench (sledovat live queries)
- VS Code debugger (breakpoints v OrderForm25.js)
- PHP Xdebug (breakpoints v orderV2Endpoints.php)
