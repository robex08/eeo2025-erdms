# CHANGELOG: LP Čerpání na Fakturách - Kompletní Implementace

## 📋 Přehled

**Datum:** 2025-12-29  
**Autor:** Copilot + User  
**Git Commits:** 
- `f7cf798` - Fáze 1+2 (DB + Backend)
- `cdec5cc` - Fáze 3+4 (Frontend + Integrace)

**Problém:** LP (Limitované přísliby) měly pouze plánované čerpání na položkách objednávky, ale nesledovaly skutečné čerpání na fakturách.

**Řešení:** Nová tabulka `25a_faktury_lp_cerpani` + backend API + frontend editor + UI integrace.

---

## 🎯 Co bylo implementováno

### **Fáze 1: Databáze**

**Tabulka:** `25a_faktury_lp_cerpani`
```sql
CREATE TABLE IF NOT EXISTS `25a_faktury_lp_cerpani` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `faktura_id` INT NOT NULL COMMENT 'FK na 25a_objednavky_faktury.id',
  `lp_cislo` VARCHAR(50) NOT NULL COMMENT 'LP kód z objednávky (např. "6")',
  `lp_id` INT UNSIGNED NULL COMMENT 'FK na 25_limitovane_prisliby.id',
  `castka` DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Čerpání z LP na této faktuře',
  `poznamka` TEXT NULL COMMENT 'Volitelná poznámka k čerpání',
  `vytvoren_id` INT UNSIGNED NULL,
  `datum_vytvoreni` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `upraven_id` INT UNSIGNED NULL,
  `datum_upravy` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_faktura` (`faktura_id`),
  KEY `idx_lp_cislo` (`lp_cislo`),
  KEY `idx_lp_id` (`lp_id`),
  CONSTRAINT `fk_lp_cerpani_faktura` 
    FOREIGN KEY (`faktura_id`) REFERENCES `25a_objednavky_faktury` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lp_cerpani_lp` 
    FOREIGN KEY (`lp_id`) REFERENCES `25_limitovane_prisliby` (`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
```

**Poznámky k designu:**
- FK na `25_uzivatele` odstraněny - users tabulka je MyISAM (nepodporuje FK)
- `faktura_id` je INT (ne UNSIGNED) kvůli kompatibilitě s `25a_objednavky_faktury.id`
- `lp_id` je INT UNSIGNED kvůli `25_limitovane_prisliby.id`
- CASCADE DELETE - smazání faktury → smazání LP čerpání
- SET NULL - smazání LP → zachovat historii s NULL lp_id

**Stored Procedure:** `sp_prepocet_lp_cerpani_faktury`
```sql
CREATE PROCEDURE sp_prepocet_lp_cerpani_faktury(IN p_lp_cislo VARCHAR(50))
BEGIN
  UPDATE 25_limitovane_prisliby_cerpani lpc
  INNER JOIN 25_limitovane_prisliby lp ON lpc.lp_id = lp.id
  SET lpc.skutecne_cerpano = (
    SELECT IFNULL(SUM(flc.castka), 0)
    FROM 25a_faktury_lp_cerpani flc
    INNER JOIN 25a_objednavky_faktury fa ON flc.faktura_id = fa.id
    WHERE flc.lp_cislo = p_lp_cislo
      AND fa.stav != 'STORNO'  -- Nepočítat stornované faktury
  )
  WHERE lp.lp_cislo = p_lp_cislo;
END
```

**Testování:**
```sql
-- Vložení testovacího záznamu
INSERT INTO 25a_faktury_lp_cerpani (faktura_id, lp_cislo, lp_id, castka, poznamka, vytvoren_id)
VALUES (182, '6', 6, 15000.00, 'Testovací čerpání LP-6', 3);

-- Kontrola
SELECT * FROM 25a_faktury_lp_cerpani WHERE faktura_id = 182;

-- Spuštění přepočtu
CALL sp_prepocet_lp_cerpani_faktury('6');

-- Kontrola výsledku
SELECT lp.lp_cislo, lpc.skutecne_cerpano, lpc.cerpano_pokladna
FROM 25_limitovane_prisliby_cerpani lpc
INNER JOIN 25_limitovane_prisliby lp ON lpc.lp_id = lp.id
WHERE lp.lp_cislo = '6';
```

**Výsledek:** skutecne_cerpano = 15000 ✅

---

### **Fáze 2: Backend API**

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/fakturyLpCerpaniHandlers.php`

**Funkce:**
1. `handle_save_faktura_lp_cerpani()` - Uložení LP čerpání
2. `handle_get_faktura_lp_cerpani()` - Načtení LP čerpání

**Validace v `handle_save_faktura_lp_cerpani`:**
- ✅ Kontrola, že `faktura_id` existuje v `25a_objednavky_faktury`
- ✅ Kontrola, že součet LP čerpání ≤ `fa_castka`
- ✅ Kontrola, že není prázdné pole (pokud objednávka má LP)
- ✅ Kontrola, že žádná částka není ≤ 0
- ✅ DELETE+INSERT pattern (atomické nahrazení)
- ✅ Volání stored procedure `sp_prepocet_lp_cerpani_faktury` po uložení

**Endpointy v `api.php`:**
```php
// POST /faktury/lp-cerpani/save
if ($endpoint === 'faktury/lp-cerpani/save' && $method === 'POST') {
    require_once __DIR__ . '/v2025.03_25/lib/fakturyLpCerpaniHandlers.php';
    handle_save_faktura_lp_cerpani($pdo, $auth_user, $input, $logger, $method);
}

// POST /faktury/lp-cerpani/get
if ($endpoint === 'faktury/lp-cerpani/get' && $method === 'POST') {
    require_once __DIR__ . '/v2025.03_25/lib/fakturyLpCerpaniHandlers.php';
    handle_get_faktura_lp_cerpani($pdo, $auth_user, $input, $logger, $method);
}
```

**Testování:**
```bash
php -l apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/fakturyLpCerpaniHandlers.php
# No syntax errors detected
```

---

### **Fáze 3: Frontend Komponenta**

**Soubor:** `apps/eeo-v2/client/src/components/invoices/LPCerpaniEditor.js`

**Vlastnosti:**
- 608 řádků kódu
- React hooks: useState, useEffect, useCallback, useMemo
- Styled-components pro styling
- FontAwesome ikony (faPlusCircle, faTrash)

**Funkce:**
1. **Auto-fill pro jediný LP kód:**
   ```javascript
   useEffect(() => {
     if (orderData?.financovani) {
       const fin = typeof orderData.financovani === 'string' 
         ? JSON.parse(orderData.financovani) : orderData.financovani;
       
       if (fin.typ === 'LP' && fin.lp_kody?.length === 1) {
         const singleCode = fin.lp_kody[0];
         const faCastka = parseFloat(faktura.fa_castka) || 0;
         
         if (lpCerpani.length === 0 && faCastka > 0) {
           onChange([{ lp_cislo: singleCode, castka: faCastka, poznamka: '' }]);
         }
       }
     }
   }, [orderData, faktura.fa_castka, lpCerpani.length]);
   ```

2. **Validace:**
   - Suma > fa_castka → ČERVENÁ CHYBA
   - Suma < fa_castka → MODRÁ INFO (NE chyba!)
   - Duplicitní LP kódy → ŽLUTÉ VAROVÁNÍ
   - Nulové částky → ČERVENÁ CHYBA

3. **UI:**
   - Add/Remove řádky
   - Select LP z dostupných kódů objednávky
   - Input částka (currency formátování)
   - Textarea poznámka (volitelná)
   - Souhrn: Přiřazeno X Kč z Y Kč

**API Service:** `apps/eeo-v2/client/src/services/apiFakturyLPCerpani.js`
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
});

export const saveFakturaLPCerpani = async (fakturaId, lpCerpani) => {
  const token = localStorage.getItem('auth_token');
  const username = localStorage.getItem('username');
  
  const response = await apiClient.post('/faktury/lp-cerpani/save', {
    faktura_id: fakturaId,
    lp_cerpani: lpCerpani
  }, {
    headers: { 'X-Auth-Token': token, 'X-Username': username }
  });
  
  return response.data;
};

export const getFakturaLPCerpani = async (fakturaId) => {
  const token = localStorage.getItem('auth_token');
  const username = localStorage.getItem('username');
  
  const response = await apiClient.post('/faktury/lp-cerpani/get', {
    faktura_id: fakturaId
  }, {
    headers: { 'X-Auth-Token': token, 'X-Username': username }
  });
  
  return response.data;
};
```

---

### **Fáze 4: UI Integrace**

**Soubor:** `apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`

**Změny:**

1. **Import (řádek 73):**
   ```javascript
   import { LPCerpaniEditor } from '../components/invoices';
   import { saveFakturaLPCerpani, getFakturaLPCerpani } from '../services/apiFakturyLPCerpani';
   ```

2. **State (řádek 1616):**
   ```javascript
   const [lpCerpani, setLpCerpani] = useState([]);
   const [lpCerpaniLoaded, setLpCerpaniLoaded] = useState(false);
   ```

3. **UI render (řádek 5310):** Před checkboxem "Potvrzuji věcnou správnost"
   ```javascript
   {orderData && orderData.financovani && (() => {
     try {
       const fin = typeof orderData.financovani === 'string' 
         ? JSON.parse(orderData.financovani) : orderData.financovani;
       return fin.typ === 'LP';
     } catch (e) { return false; }
   })() && (
     <LPCerpaniEditor
       faktura={formData}
       orderData={orderData}
       lpCerpani={lpCerpani}
       onChange={(newLpCerpani) => setLpCerpani(newLpCerpani)}
       disabled={isOrderCompleted || loading}
     />
   )}
   ```

4. **Načtení při editaci (řádek 1983):**
   ```javascript
   // 🆕 LP ČERPÁNÍ: Načíst čerpání LP pokud má objednávku
   if (invoiceData.objednavka_id) {
     try {
       console.log('💰 Načítám LP čerpání pro fakturu:', editIdToLoad);
       const lpResponse = await getFakturaLPCerpani(editIdToLoad);
       if (lpResponse && lpResponse.lp_cerpani) {
         setLpCerpani(lpResponse.lp_cerpani);
         setLpCerpaniLoaded(true);
         console.log('✅ LP čerpání načteno:', lpResponse.lp_cerpani);
       }
     } catch (lpError) {
       console.error('❌ Chyba při načítání LP čerpání:', lpError);
     }
   }
   ```

5. **Validace v handleUpdateMaterialCorrectness (řádek 3158):**
   ```javascript
   // 🔥 Validace LP čerpání pro LP financování
   if (orderData && orderData.financovani) {
     try {
       const fin = typeof orderData.financovani === 'string' 
         ? JSON.parse(orderData.financovani) 
         : orderData.financovani;
       
       if (fin.typ === 'LP') {
         if (!lpCerpani || lpCerpani.length === 0 || lpCerpani.every(lp => !lp.lp_cislo || lp.castka <= 0)) {
           showToast && showToast('⚠️ Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód!', 'error');
           setLoading(false);
           return;
         }

         const totalLP = lpCerpani.reduce((sum, lp) => sum + (parseFloat(lp.castka) || 0), 0);
         const faCastka = parseFloat(formData.fa_castka) || 0;
         if (totalLP > faCastka) {
           showToast && showToast(`❌ Součet LP čerpání překračuje částku faktury`, 'error');
           setLoading(false);
           return;
         }
       }
     } catch (e) {
       console.error('Chyba při validaci LP:', e);
     }
   }
   ```

6. **Uložení LP při věcné správnosti (řádek 3233):**
   ```javascript
   // 🆕 LP ČERPÁNÍ: Uložit čerpání LP po úspěšné aktualizaci věcné správnosti
   if (lpCerpani && lpCerpani.length > 0) {
     try {
       console.log('💰 Ukládám LP čerpání:', lpCerpani);
       await saveFakturaLPCerpani(editingInvoiceId, lpCerpani);
       console.log('✅ LP čerpání úspěšně uloženo');
     } catch (lpError) {
       console.error('❌ Chyba při ukládání LP čerpání:', lpError);
       showToast && showToast('Věcná správnost uložena, ale čerpání LP se nepodařilo uložit: ' + lpError.message, 'warning');
     }
   }
   ```

7. **Uložení LP při CREATE faktury (řádek 3478):**
   ```javascript
   // 🆕 LP ČERPÁNÍ: Uložit čerpání LP pro novou fakturu
   const newInvoiceId = result?.data?.invoice_id || result?.data?.id || result?.invoice_id || result?.id;
   if (newInvoiceId && lpCerpani && lpCerpani.length > 0) {
     try {
       console.log('💰 Ukládám LP čerpání při CREATE faktury:', lpCerpani);
       await saveFakturaLPCerpani(newInvoiceId, lpCerpani);
       console.log('✅ LP čerpání úspěšně uloženo');
     } catch (lpError) {
       console.error('❌ Chyba při ukládání LP čerpání:', lpError);
       showToast && showToast('Faktura vytvořena, ale čerpání LP se nepodařilo uložit: ' + lpError.message, 'warning');
     }
   }
   ```

8. **Uložení LP při UPDATE faktury (řádek 3429):**
   ```javascript
   // 🆕 LP ČERPÁNÍ: Uložit čerpání LP při UPDATE faktury
   if (lpCerpani && lpCerpani.length > 0) {
     try {
       console.log('💰 Ukládám LP čerpání při UPDATE faktury:', lpCerpani);
       await saveFakturaLPCerpani(editingInvoiceId, lpCerpani);
       console.log('✅ LP čerpání úspěšně uloženo');
     } catch (lpError) {
       console.error('❌ Chyba při ukládání LP čerpání:', lpError);
       showToast && showToast('Faktura uložena, ale čerpání LP se nepodařilo uložit: ' + lpError.message, 'warning');
     }
   }
   ```

---

## 🧪 Testovací Scénáře

### **1. Nová faktura s LP financováním**

**Kroky:**
1. Vytvoř objednávku s financováním `{"typ":"LP","lp_kody":["6"]}`
2. Přidej fakturu s `fa_castka = 50000`
3. Otevři formulář faktury
4. **Očekáváno:** LP editor se zobrazí, auto-fill LP-6 s částkou 50000
5. Ulož fakturu
6. **Kontrola DB:**
   ```sql
   SELECT * FROM 25a_faktury_lp_cerpani WHERE faktura_id = [new_id];
   -- Očekáváno: 1 řádek, lp_cislo='6', castka=50000
   
   SELECT skutecne_cerpano FROM 25_limitovane_prisliby_cerpani 
   WHERE lp_id = (SELECT id FROM 25_limitovane_prisliby WHERE lp_cislo='6');
   -- Očekáváno: skutecne_cerpano += 50000
   ```

### **2. Více LP kódů - ruční distribuce**

**Kroky:**
1. Vytvoř objednávku s `{"typ":"LP","lp_kody":["6","7"]}`
2. Přidej fakturu s `fa_castka = 75000`
3. **Očekáváno:** LP editor se zobrazí, PRÁZDNÝ (ne auto-fill pro více kódů)
4. Přidej řádek: LP-6, částka 50000
5. Přidej řádek: LP-7, částka 25000
6. **Kontrola validace:** Suma = 75000 = fa_castka → Žádná chyba
7. Ulož fakturu
8. **Kontrola DB:**
   ```sql
   SELECT lp_cislo, castka FROM 25a_faktury_lp_cerpani WHERE faktura_id = [id];
   -- Očekáváno: 2 řádky (LP-6: 50k, LP-7: 25k)
   ```

### **3. Validace: Překročení částky**

**Kroky:**
1. Vytvoř fakturu s `fa_castka = 50000`, LP-6
2. Zadej LP čerpání: LP-6, částka 60000
3. **Očekáváno:** ČERVENÁ CHYBA "Součet překračuje částku faktury"
4. Zkus uložit → **Blokováno**

### **4. Info zpráva: Neúplná distribuce**

**Kroky:**
1. Vytvoř fakturu s `fa_castka = 50000`, LP-6
2. Zadej LP čerpání: LP-6, částka 30000
3. **Očekáváno:** MODRÁ INFO "Přiřazeno 30000 z 50000 Kč"
4. Ulož → **Povoleno** (uživatel má svobodu)

### **5. Mandatory check: Prázdné LP pro LP financování**

**Kroky:**
1. Vytvoř fakturu s LP financováním, prázdné LP čerpání
2. Zkus potvrdit věcnou správnost
3. **Očekáváno:** CHYBA "Musíte přiřadit alespoň jeden LP kód!"
4. **Blokováno**

### **6. Editace faktury - načtení LP**

**Kroky:**
1. Otevři existující fakturu s LP čerpáním
2. **Očekáváno:** LP editor zobrazuje načtená data
3. Uprav částky
4. Ulož
5. **Kontrola DB:** Změny se projevily (DELETE+INSERT)

### **7. STORNO faktury - přepočet**

**Kroky:**
1. Vytvoř fakturu s LP-6, částka 50000
2. **Kontrola:** `skutecne_cerpano` += 50000
3. STORNO faktury (stav = 'STORNO')
4. **Spuštění:** `CALL sp_prepocet_lp_cerpani_faktury('6')`
5. **Kontrola:** `skutecne_cerpano` -= 50000 (STORNO se nepočítá)

---

## 📊 Vliv na Systém

### **Nové soubory:**
1. `_docs/PLAN_LP_CERPANI_NA_FAKTURACH.md` (1179 řádků)
2. `_docs/database-migrations/2025-12-29_create_faktury_lp_cerpani.sql`
3. `_docs/database-migrations/2025-12-29_create_sp_prepocet_lp_cerpani_faktury.sql`
4. `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/fakturyLpCerpaniHandlers.php`
5. `apps/eeo-v2/client/src/components/invoices/LPCerpaniEditor.js`
6. `apps/eeo-v2/client/src/services/apiFakturyLPCerpani.js`

### **Upravené soubory:**
1. `apps/eeo-v2/api-legacy/api.eeo/api.php` (3 změny: konstanta, require, endpoints)
2. `apps/eeo-v2/client/src/components/invoices/index.js` (1 export)
3. `apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js` (8 změn: import, state, UI, load, validate, save×3)

### **Databázové změny:**
- +1 tabulka (`25a_faktury_lp_cerpani`)
- +1 stored procedure (`sp_prepocet_lp_cerpani_faktury`)
- +3 indexy (faktura_id, lp_cislo, lp_id)
- +2 FK (faktury → objednavky_faktury, lp_id → limitovane_prisliby)

---

## 🔧 Maintenance

### **Stored Procedure volání:**
```sql
-- Přepočet po STORNO/obnovení faktury
CALL sp_prepocet_lp_cerpani_faktury('[lp_cislo]');

-- Kontrola konzistence
SELECT 
  lp.lp_cislo,
  lpc.skutecne_cerpano AS 'DB hodnota',
  (SELECT SUM(flc.castka) 
   FROM 25a_faktury_lp_cerpani flc 
   INNER JOIN 25a_objednavky_faktury fa ON flc.faktura_id = fa.id
   WHERE flc.lp_cislo = lp.lp_cislo AND fa.stav != 'STORNO') AS 'Skutečný součet'
FROM 25_limitovane_prisliby lp
INNER JOIN 25_limitovane_prisliby_cerpani lpc ON lpc.lp_id = lp.id
HAVING `DB hodnota` != `Skutečný součet`;
```

### **Záloha před změnou:**
```bash
mysqldump -h 10.3.172.11 -u erdms_app_user -p eeo2025-dev \
  25a_faktury_lp_cerpani \
  25_limitovane_prisliby_cerpani \
  > lp_cerpani_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🚀 Další Kroky

### **Fáze 5: Zobrazení v seznamu faktur (TODO)**

**Cíl:** Přidat sloupec s LP čerpáním do `Invoices25List.js`

**Návrh UI:**
```javascript
// Sloupec v tabulce
{
  label: 'LP Čerpání',
  key: 'lp_cerpani',
  render: (invoice) => {
    if (!invoice.lp_cerpani || invoice.lp_cerpani.length === 0) return '-';
    
    const items = invoice.lp_cerpani.map(lp => 
      `LP-${lp.lp_cislo}: ${formatCurrency(lp.castka)}`
    );
    
    const total = invoice.lp_cerpani.reduce((s, lp) => s + lp.castka, 0);
    const isIncomplete = total < invoice.fa_castka;
    
    return (
      <LPCerpaniCell incomplete={isIncomplete}>
        {items.join(', ')}
        {isIncomplete && <IncompleteIcon title="Neúplná distribuce" />}
      </LPCerpaniCell>
    );
  }
}
```

**Backend změna:** Rozšířit `getInvoicesList` o JOIN na `25a_faktury_lp_cerpani`:
```sql
SELECT 
  fa.*,
  GROUP_CONCAT(
    CONCAT(flc.lp_cislo, ':', flc.castka) 
    SEPARATOR ';'
  ) AS lp_cerpani_raw
FROM 25a_objednavky_faktury fa
LEFT JOIN 25a_faktury_lp_cerpani flc ON fa.id = flc.faktura_id
GROUP BY fa.id
```

**Očekávaný čas:** 2-3 hodiny

---

## ✅ Checklist Implementace

- [x] **Fáze 1: Databáze**
  - [x] Tabulka `25a_faktury_lp_cerpani` vytvořena
  - [x] FK constraints nastaveny
  - [x] Indexy vytvořeny
  - [x] Stored procedure `sp_prepocet_lp_cerpani_faktury`
  - [x] Testovací data vložena a ověřena

- [x] **Fáze 2: Backend**
  - [x] `fakturyLpCerpaniHandlers.php` vytvořen
  - [x] Validace implementována
  - [x] DELETE+INSERT pattern
  - [x] Volání stored procedure
  - [x] Endpointy registrovány v `api.php`
  - [x] PHP syntax check passed

- [x] **Fáze 3: Frontend**
  - [x] `LPCerpaniEditor.js` komponenta (608 řádků)
  - [x] Auto-fill pro jediný LP kód
  - [x] Validace: suma ≤ fa_castka
  - [x] Info zpráva: suma < fa_castka (NE chyba)
  - [x] Mandatory check pro LP financování
  - [x] `apiFakturyLPCerpani.js` service

- [x] **Fáze 4: UI Integrace**
  - [x] Import a state v `InvoiceEvidencePage`
  - [x] UI render před checkboxem
  - [x] Načtení LP při editaci
  - [x] Validace v `handleUpdateMaterialCorrectness`
  - [x] Uložení při věcné správnosti
  - [x] Uložení při CREATE faktury
  - [x] Uložení při UPDATE faktury
  - [x] Error handling (warning toast)

- [ ] **Fáze 5: Zobrazení v seznamu (TODO)**
  - [ ] Backend: JOIN v `getInvoicesList`
  - [ ] Frontend: Sloupec v `Invoices25List`
  - [ ] Indikátor neúplné distribuce
  - [ ] Quick edit button

---

## 🎓 Lessons Learned

1. **FK Constraints:** MyISAM tabulky nepodporují FK → odstranit FK na users
2. **INT vs UNSIGNED:** Musí odpovídat cílovým sloupcům → `faktura_id` INT, `lp_id` UNSIGNED
3. **DELETE+INSERT Pattern:** Atomické nahrazení bez manuálního UPDATE logic
4. **Svoboda vs Validace:** User má svobodu v distribuci → info zpráva, NE error
5. **Error Handling:** LP čerpání je bonus data → catch s warning, neblokovat úspěch faktury
6. **Auto-fill UX:** Pouze pro 1 LP kód → jasný use-case, ne konfúze
7. **State Management:** Batch setState s `unstable_batchedUpdates` → méně re-renderů

---

## 📚 Reference

- **Plan:** `_docs/PLAN_LP_CERPANI_NA_FAKTURACH.md`
- **DB Migrations:** `_docs/database-migrations/2025-12-29_create_*.sql`
- **Git Commits:** `f7cf798`, `cdec5cc`
- **Database:** `eeo2025-dev` (MariaDB 5.5.43)
- **API Base:** `/api/faktury/lp-cerpani/`

---

**Implementace kompletní! 🎉**
