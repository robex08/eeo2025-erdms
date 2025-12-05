# 🔧 CASHBOOK: Force přepočet pořadí dokladů (ADMIN) - IMPLEMENTOVÁNO ✅

**Datum:** 9. listopadu 2025  
**Endpoint:** `/api.eeo/cashbook-force-renumber`  
**Oprávnění:** `CASH_BOOK_MANAGE` (pouze admin)  
**Status:** ✅ **BACKEND + FRONTEND IMPLEMENTOVÁNY** - Připraveno k testování

---

## 🎯 ÚČEL

**Admin funkce pro opravu chybného číslování dokladů** v pokladní knize.

**⚠️ DŮLEŽITÉ:** Přečíslování je pro **konkrétní pokladnu** (assignment_id), **NIKOLI pro uživatele**!
- Jedna pokladna = jedno přiřazení = vlastní číselná řada VPD/PPD
- SQL filtruje podle `k.prirazeni_id`, **NE** `k.uzivatel_id`

Použití:
- ✅ Oprava chyb při testování
- ✅ Oprava po změně `vpd_od_cislo` / `ppd_od_cislo`
- ✅ Oprava po manuálním zásahu do DB
- ⚠️ **NEBEZPEČNÁ OPERACE** - přepočítá všechny doklady včetně uzavřených a zamčených měsíců!

---

## 🚨 VAROVÁNÍ

**⚠️ KRITICKÁ OPERACE**

Tato funkce:
- 🔓 **Ignoruje stav měsíců** (aktivní, uzavřené, zamčené)
- 🔄 **Přečísluje všechny doklady** v daném roce pro danou pokladnu
- 📝 **Mění čísla dokladů** ve všech měsících
- ⚠️ **Nelze vrátit zpět** (pouze nový force přepočet)

**Důsledky:**
- Mění se `cislo_poradi_v_roce` a `cislo_dokladu` u všech položek
- Dokumenty typu PDF/tisk mohou mít **jiná čísla než DB**
- Narušuje se audit trail (historie změn čísel)

**Použití pouze v případě:**
- Testovací prostředí
- Evidentní chyba v číslování
- Po konzultaci s týmem

---

## 📋 API POŽADAVEK

### Endpoint: `/cashbook-force-renumber`

**Metoda:** POST

**Request Body:**
```json
{
  "username": "admin",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "assignment_id": 102,
  "year": 2025
}
```

**Parametry:**
- `username` (string) - Uživatelské jméno (pro autentizaci)
- `token` (string) - JWT token (pro autentizaci)
- `assignment_id` (int) - ID přiřazení pokladny z `25a_pokladny_uzivatele`
- `year` (int) - Rok pro přepočet (např. 2025)

---

## ✅ BACKEND IMPLEMENTACE

### PHP Funkce: `forceRenumberAllDocuments()`

```php
/**
 * FORCE PŘEPOČET všech dokladů v roce pro danou pokladnu
 * ⚠️ NEBEZPEČNÁ OPERACE - pouze pro admin!
 * 
 * @param int $assignmentId ID přiřazení pokladny
 * @param int $year Rok (např. 2025)
 * @return array Response s počtem přečíslovaných položek
 */
public function forceRenumberAllDocuments($assignmentId, $year) {
    try {
        $this->db->beginTransaction();
        
        // 1. Načíst přiřazení pokladny (potřebujeme vpd_od_cislo, ppd_od_cislo)
        $assignment = $this->db->fetchOne("
            SELECT 
                id,
                uzivatel_id,
                cislo_pokladny,
                ciselna_rada_vpd,
                ciselna_rada_ppd,
                vpd_od_cislo,
                ppd_od_cislo
            FROM 25a_pokladny_uzivatele
            WHERE id = ? AND aktivni = 1
        ", [$assignmentId]);
        
        if (!$assignment) {
            throw new Exception('Přiřazení pokladny nenalezeno');
        }
        
        $vpdStart = (int)$assignment['vpd_od_cislo'] ?: 1;
        $ppdStart = (int)$assignment['ppd_od_cislo'] ?: 1;
        
        // 2. Načíst globální nastavení prefix
        $usePrefix = $this->getSetting('cashbook_use_prefix') == '1';
        
        // 3. PŘEČÍSLOVAT VÝDAJE (VPD)
        // ⚠️ Předáváme assignmentId, NE userId!
        $vpdCount = $this->forceRenumberDocumentsByType(
            $assignmentId,
            $year,
            'vydaj',
            $vpdStart,
            $usePrefix ? $assignment['ciselna_rada_vpd'] : null,
            $usePrefix
        );
        
        // 4. PŘEČÍSLOVAT PŘÍJMY (PPD)
        // ⚠️ Předáváme assignmentId, NE userId!
        $ppdCount = $this->forceRenumberDocumentsByType(
            $assignmentId,
            $year,
            'prijem',
            $ppdStart,
            $usePrefix ? $assignment['ciselna_rada_ppd'] : null,
            $usePrefix
        );
        
        $this->db->commit();
        
        return [
            'status' => 'ok',
            'message' => 'Doklady byly úspěšně přečíslovány',
            'data' => [
                'year' => $year,
                'assignment_id' => $assignmentId,
                'vpd_renumbered' => $vpdCount,
                'ppd_renumbered' => $ppdCount,
                'total_renumbered' => $vpdCount + $ppdCount
            ]
        ];
        
    } catch (Exception $e) {
        $this->db->rollBack();
        error_log("Chyba při force přepočtu dokladů: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při přepočtu: ' . $e->getMessage()
        ];
    }
}

/**
 * Přečíslovat doklady podle typu (výdaj nebo příjem)
 * 
 * @param int $assignmentId ID přiřazení pokladny (25a_pokladny_uzivatele)
 * @param int $year Rok
 * @param string $docType 'vydaj' nebo 'prijem'
 * @param int $startNumber Počáteční číslo (vpd_od_cislo nebo ppd_od_cislo)
 * @param string|null $prefix Číselná řada (591, 491, ...) nebo null
 * @param bool $usePrefix Použít prefix v čísle dokladu?
 * @return int Počet přečíslovaných položek
 */
private function forceRenumberDocumentsByType($assignmentId, $year, $docType, $startNumber, $prefix, $usePrefix) {
    // 1. Načíst všechny položky daného typu v roce (seřazené chronologicky)
    // ⚠️ DŮLEŽITÉ: Filtrujeme podle prirazeni_id (pokladna), NE uzivatel_id!
    $entries = $this->db->fetchAll("
        SELECT 
            p.id,
            p.datum_zapisu,
            p.cislo_poradi_v_roce AS old_order,
            p.cislo_dokladu AS old_document_number,
            k.mesic
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
        WHERE k.prirazeni_id = ?
          AND k.rok = ?
          AND p.typ_dokladu = ?
          AND p.smazano = 0
        ORDER BY p.datum_zapisu ASC, p.id ASC
    ", [$assignmentId, $year, $docType]);
    
    if (empty($entries)) {
        return 0; // Žádné položky k přečíslování
    }
    
    // 2. Přečíslovat postupně od startNumber
    $currentNumber = $startNumber;
    $count = 0;
    
    foreach ($entries as $entry) {
        // Vytvořit nové číslo dokladu
        $letter = $docType === 'prijem' ? 'P' : 'V';
        
        if ($usePrefix && $prefix) {
            $newDocumentNumber = sprintf('%s%s-%03d', $letter, $prefix, $currentNumber);
            // Příklad: V591-050, P491-100
        } else {
            $newDocumentNumber = sprintf('%s%03d', $letter, $currentNumber);
            // Příklad: V050, P100
        }
        
        // Aktualizovat položku (pouze pokud se změnilo)
        if ($entry['old_order'] != $currentNumber || $entry['old_document_number'] != $newDocumentNumber) {
            $this->db->execute("
                UPDATE 25a_pokladni_polozky
                SET 
                    cislo_poradi_v_roce = ?,
                    cislo_dokladu = ?
                WHERE id = ?
            ", [$currentNumber, $newDocumentNumber, $entry['id']]);
            
            $count++;
            
            // Log změny
            error_log(sprintf(
                "Force renumber: Entry ID=%d, Old=%s (order=%d), New=%s (order=%d), Date=%s",
                $entry['id'],
                $entry['old_document_number'],
                $entry['old_order'],
                $newDocumentNumber,
                $currentNumber,
                $entry['datum_zapisu']
            ));
        }
        
        $currentNumber++;
    }
    
    return $count;
}
```

---

## 🔐 OPRÁVNĚNÍ

**Pouze admin s oprávněním `CASH_BOOK_MANAGE` může spustit force přepočet.**

```php
// V endpointu /cashbook-force-renumber
if (!hasPermission('CASH_BOOK_MANAGE')) {
    return [
        'status' => 'error',
        'message' => 'Nemáte oprávnění k této operaci. Pouze administrátor může spustit force přepočet.'
    ];
}
```

---

## 📊 PŘÍKLAD POUŽITÍ

### Scénář: Chybné číslování po testování

**Stav v DB:**
```
Pokladna: ID 102
vpd_od_cislo: 50
ppd_od_cislo: 1

Rok 2025:
Leden:   V591-001, V591-002  ❌ ŠPATNĚ (mělo být 050, 051)
Únor:    V591-003, V591-004  ❌ ŠPATNĚ
Březen:  V591-005             ❌ ŠPATNĚ
```

**Akce: Force přepočet**
```json
POST /api.eeo/cashbook-force-renumber
{
  "username": "admin",
  "token": "...",
  "assignment_id": 102,
  "year": 2025
}
```

**Výsledek:**
```
Leden:   V591-050, V591-051  ✅ SPRÁVNĚ
Únor:    V591-052, V591-053  ✅ SPRÁVNĚ
Březen:  V591-054             ✅ SPRÁVNĚ
```

**Response:**
```json
{
  "status": "ok",
  "message": "Doklady byly úspěšně přečíslovány",
  "data": {
    "year": 2025,
    "vpd_renumbered": 15,
    "ppd_renumbered": 8,
    "total_renumbered": 23
  }
}
```

**⚠️ Poznámka:** Response neobsahuje `user_id` (není potřeba, přečíslování je pro pokladnu).

---

## 🗄️ DATABÁZOVÁ STRUKTURA

### Klíčové vazby:

```
25a_pokladny_uzivatele (přiřazení)
├── id (assignment_id)
├── uzivatel_id (který uživatel má přístup)
├── cislo_pokladny
├── vpd_od_cislo (startovní číslo výdajů)
├── ppd_od_cislo (startovní číslo příjmů)
└── ciselna_rada_vpd, ciselna_rada_ppd

25a_pokladni_knihy (měsíční knihy)
├── id
├── prirazeni_id → 25a_pokladny_uzivatele.id ⚠️ TOTO SE POUŽÍVÁ!
├── uzivatel_id (duplicitní, pro rychlý přístup)
├── rok
└── mesic

25a_pokladni_polozky (položky)
├── id
├── pokladni_kniha_id → 25a_pokladni_knihy.id
├── cislo_poradi_v_roce (1, 2, 3, ...)
├── cislo_dokladu (V591-050, P491-001, ...)
└── typ_dokladu ('vydaj' nebo 'prijem')
```

### ⚠️ KRITICKÉ: Filtrování podle `prirazeni_id`

**SPRÁVNĚ:**
```sql
WHERE k.prirazeni_id = ?  -- ✅ Filtruje podle pokladny (assignment)
```

**ŠPATNĚ:**
```sql
WHERE k.uzivatel_id = ?  -- ❌ Filtruje podle uživatele (může mít více pokladen!)
```

**Důvod:**
- Jeden uživatel může mít **více přiřazení** (více pokladen)
- Každá pokladna má **vlastní číselnou řadu** (vpd_od_cislo, ppd_od_cislo)
- Přečíslování musí být **izolované pro každou pokladnu**

---

## 🎨 FRONTEND IMPLEMENTACE

### 1. Služba v `cashbookService.js`

```javascript
/**
 * 🔧 ADMIN: Force přepočet pořadí dokladů v roce
 * ⚠️ NEBEZPEČNÁ OPERACE - přepočítá všechny doklady včetně uzavřených/zamčených
 * 
 * @param {number} assignmentId - ID přiřazení pokladny
 * @param {number} year - Rok pro přepočet (např. 2025)
 * @returns {Promise<Object>} Response s počtem přečíslovaných položek
 */
forceRenumberDocuments: async (assignmentId, year) => {
  try {
    const auth = await getAuthData();
    const response = await axios.post(`${API_BASE}/cashbook-force-renumber`, {
      ...auth,
      assignment_id: assignmentId,
      year: year
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'force přepočtu dokladů');
  }
}
```

---

### 2. Dialog komponenta: `ForceRenumberDialog.js`

**✨ UX Enhancement:** Dialog zůstává otevřený po dokončení, tlačítko se změní na "Hotovo" (zelené)

```javascript
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faCalculator, 
  faTimes,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const ForceRenumberDialog = ({ isOpen, onClose, assignment, onConfirm }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // ✨ NOVÝ STATE
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });

  const handleConfirm = async () => {
    setIsProcessing(true);
    setIsCompleted(false);
    setError(null);
    setProgress({ current: 0, total: 0, phase: 'Inicializace...' });
    
    try {
      const result = await onConfirm(assignment.id, year);
      
      if (result && result.status === 'ok') {
        // ✅ ÚSPĚCH - dialog zůstane otevřený
        setProgress({ 
          current: 4, 
          total: 4, 
          phase: `Hotovo! Přečíslováno ${result.data.total_renumbered} položek` 
        });
        setIsCompleted(true);
        setIsProcessing(false);
      } else {
        setError(result?.message || 'Chyba při přepočtu');
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Reset state při zavírání
    setIsProcessing(false);
    setIsCompleted(false);
    setError(null);
    setProgress({ current: 0, total: 0, phase: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Overlay>
      <DialogBox>
        <DialogHeader>
          <WarningIconLarge>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </WarningIconLarge>
          <h2>⚠️ FORCE PŘEPOČET DOKLADŮ</h2>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </DialogHeader>

        <DialogContent>
          <WarningBox>
            <h3>🚨 KRITICKÁ OPERACE</h3>
            <p>
              Tato funkce <strong>přečísluje všechny doklady</strong> v daném roce 
              včetně <strong>uzavřených a zamčených měsíců</strong>!
            </p>
          </WarningBox>

          <InfoSection>
            <h4>Pokladna:</h4>
            <p>
              <strong>Číslo:</strong> {assignment.cislo_pokladny}<br />
              <strong>VPD řada:</strong> {assignment.ciselna_rada_vpd} (od {assignment.vpd_od_cislo})<br />
              <strong>PPD řada:</strong> {assignment.ciselna_rada_ppd} (od {assignment.ppd_od_cislo})
            </p>
          </InfoSection>

          <RisksList>
            <h4>⚠️ Důsledky:</h4>
            <ul>
              <li>🔄 Změní se <strong>všechna čísla dokladů</strong> v roce</li>
              <li>🔓 Ignoruje stav měsíců (aktivní, uzavřené, zamčené)</li>
              <li>📝 PDF dokumenty budou mít <strong>jiná čísla než DB</strong></li>
              <li>⏪ Operaci <strong>nelze vrátit zpět</strong></li>
            </ul>
          </RisksList>

          <YearInput>
            <label>Rok pro přepočet:</label>
            <input
              type="number"
              min="2020"
              max="2030"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              disabled={isProcessing}
            />
          </YearInput>
        </DialogContent>

        <DialogFooter>
          {!isCompleted && (
            <CancelButton onClick={handleClose} disabled={isProcessing}>
              Zrušit
            </CancelButton>
          )}
          
          {isCompleted ? (
            /* ✅ PO DOKONČENÍ - zelené tlačítko "Hotovo" */
            <ConfirmButton 
              onClick={handleClose}
              $variant="success"
            >
              <FontAwesomeIcon icon={faCalculator} />
              Hotovo
            </ConfirmButton>
          ) : (
            /* ⚙️ BĚHEM PŘEPOČTU - červené tlačítko */
            <ConfirmButton 
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Přepočítávám...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCalculator} />
                  Provést přepočet
                </>
              )}
            </ConfirmButton>
          )}
        </DialogFooter>
      </DialogBox>
    </Overlay>
  );
};

// Styled components
// ✨ Tlačítko podporuje $variant="success" pro zelenou barvu
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const DialogBox = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const DialogHeader = styled.div`
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 16px 16px 0 0;
  position: relative;
  
  h2 {
    margin: 0.5rem 0 0 0;
    font-size: 1.5rem;
  }
`;

const WarningIconLarge = styled.div`
  font-size: 3rem;
  color: #fbbf24;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.2rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const DialogContent = styled.div`
  padding: 2rem;
`;

const WarningBox = styled.div`
  background: #fef2f2;
  border: 2px solid #dc2626;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  
  h3 {
    color: #991b1b;
    margin: 0 0 0.5rem 0;
  }
  
  p {
    margin: 0;
    color: #7f1d1d;
  }
`;

const InfoSection = styled.div`
  background: #f3f4f6;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }
  
  p {
    margin: 0;
    line-height: 1.6;
  }
`;

const RisksList = styled.div`
  margin-bottom: 1.5rem;
  
  h4 {
    color: #dc2626;
    margin: 0 0 0.75rem 0;
  }
  
  ul {
    margin: 0;
    padding-left: 1.5rem;
    
    li {
      margin: 0.5rem 0;
      color: #374151;
    }
  }
`;

const YearInput = styled.div`
  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #374151;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    &:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }
  }
`;

const DialogFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 2px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => 
    props.$variant === 'success' 
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' /* ✅ Zelená */
      : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' /* 🔴 Červená */
  };
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: ${props => 
    props.$variant === 'success'
      ? '0 2px 8px rgba(16, 185, 129, 0.2)'
      : '0 2px 8px rgba(220, 38, 38, 0.2)'
  };
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props => 
      props.$variant === 'success'
        ? '0 4px 12px rgba(16, 185, 129, 0.3)'
        : '0 4px 12px rgba(220, 38, 38, 0.3)'
    };
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const ProgressBox = styled.div`
  /* ✅ Zelený progress box po dokončení */
  background: ${props => 
    props.$completed
      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
      : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
  };
  border: 2px solid ${props => props.$completed ? '#10b981' : '#3b82f6'};
  /* ... */
`;

export default ForceRenumberDialog;
```

**UX Flow:**
1. Uživatel klikne "Provést přepočet" ➡️ Tlačítko: "Přepočítávám..." (disabled)
2. Progress bar běží ➡️ Modrý progress box s spinner
3. Dokončeno ➡️ **Zelený progress box** s ✅ "Hotovo! Přečíslováno 23 položek"
4. Tlačítko se změní na **zelené "Hotovo"** ➡️ Kliknutím zavře dialog

---

### 3. Tlačítko v tabulce pokladen (`CashbookTab.js`)

Přidat sloupec "Akce" s tlačítkem "Force Přepočet":

```javascript
{
  accessorKey: 'actions',
  header: 'Akce',
  cell: ({ row }) => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {/* Existující tlačítka Edit, Delete */}
      
      {/* NOVÉ: Force Přepočet (pouze admin) */}
      {hasPermission('CASH_BOOK_MANAGE') && (
        <ActionButton
          onClick={() => handleForceRenumber(row.original)}
          title="Force přepočet pořadí dokladů (ADMIN)"
          $variant="danger"
        >
          <FontAwesomeIcon icon={faCalculator} />
        </ActionButton>
      )}
    </div>
  ),
}
```

---

## ✅ CHECKLIST IMPLEMENTACE

### Backend

- [ ] Vytvořit endpoint `/cashbook-force-renumber`
- [ ] Implementovat `forceRenumberAllDocuments($assignmentId, $year)`
- [ ] Implementovat `forceRenumberDocumentsByType(...)`
- [ ] Kontrola oprávnění `CASH_BOOK_MANAGE`
- [ ] Logging změn do error_log
- [ ] Testovat na testovacích datech

### Frontend

- [ ] Přidat `forceRenumberDocuments()` do `cashbookService.js`
- [ ] Vytvořit `ForceRenumberDialog.js` komponentu
- [ ] Přidat sloupec "Akce" v `CashbookTab.js`
- [ ] Přidat ikonu `faCalculator` z FontAwesome
- [ ] Testovat dialog a volání API
- [ ] Testovat že se zobrazí pouze admin s MANAGE oprávněním

---

## 🧪 TESTOVÁNÍ

### Test 1: Admin force přepočet

**Setup:**
- Admin s `CASH_BOOK_MANAGE`
- Pokladna ID 102: vpd_od_cislo=50, ppd_od_cislo=1
- Rok 2025: 5 výdajů (chybně číslované 001-005)

**Akce:**
1. Otevřít číselníky pokladen
2. Kliknout "Force Přepočet" u pokladny 102
3. Potvrdit dialog (rok 2025)

**Očekávaný výsledek:**
```json
{
  "status": "ok",
  "data": {
    "vpd_renumbered": 5,
    "ppd_renumbered": 0,
    "total_renumbered": 5
  }
}
```

**DB kontrola:**
```sql
SELECT cislo_dokladu, cislo_poradi_v_roce 
FROM 25a_pokladni_polozky p
JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
WHERE k.rok = 2025 AND p.typ_dokladu = 'vydaj'
ORDER BY p.datum_zapisu;

-- Expected:
-- V591-050, 50
-- V591-051, 51
-- V591-052, 52
-- V591-053, 53
-- V591-054, 54
```

---

### Test 2: Běžný uživatel nemá přístup

**Setup:**
- Uživatel s `CASH_BOOK_EDIT_OWN` (bez MANAGE)

**Očekávaný výsledek:**
- Tlačítko "Force Přepočet" se **nezobrazí** v tabulce

---

## � AUTOMATICKÝ PŘEPOČET PO UZAVŘENÍ MĚSÍCE

**⚠️ DŮLEŽITÉ:** Po uzavření měsíce uživatelem (`stav_knihy = 'uzavrena_uzivatelem'`) by měl backend **automaticky zkontrolovat a přepočítat** následující měsíce, pokud již mají nějaké položky.

### Scénář problému:

```
STAV PŘED UZAVŘENÍM:
- Říjen 2025: AKTIVNÍ (otevřený)
  * VPD: 050, 051, 052
- Listopad 2025: AKTIVNÍ (má už položky!)
  * VPD: 053, 054, 055 (backend přiřadil podle MAX v říjnu)

AKCE:
Uživatel přidá do října další položky → uzavře říjen
- Říjen 2025: UZAVŘEN
  * VPD: 050, 051, 052, 056, 057 (přibyly 056, 057)

PROBLÉM:
Listopad má VPD 053-055, ale říjen končí na 057!
→ Konflikt číslování! ❌

ŘEŠENÍ:
Backend po uzavření října MUSÍ přepočítat listopad:
- Nový listopad: VPD 058, 059, 060 ✅ SPRÁVNĚ
```

### Backend implementace:

**Funkce:** `recalculateDocumentNumbersAfterMonth($bookId)` v `CashbookRenumberService.php`

**Volání:** Po úspěšném uzavření měsíce v handleru `/cashbook-close`

```php
// Po uzavření knihy
$closeResult = $cashbookService->closeBook($bookId);

if ($closeResult['status'] === 'ok') {
    // PŘEPOČÍTAT následující měsíce
    $renumberService = new CashbookRenumberService($db);
    $recalcResult = $renumberService->recalculateDocumentNumbersAfterMonth($bookId);
    
    if ($recalcResult['affected_entries'] > 0) {
        error_log(sprintf(
            "Auto-recalculated after close: book_id=%d, months=%s, entries=%d",
            $bookId,
            implode(',', $recalcResult['recalculated_months']),
            $recalcResult['affected_entries']
        ));
    }
}
```

**Dokumentace:** `CASHBOOK-PPD-VPD-CONTINUITY-FIX.md` (detailní implementace)

---

## �📚 SOUVISEJÍCÍ DOKUMENTACE

- `CASHBOOK-PPD-VPD-CONTINUITY-FIX.md` - **Kontinuita číslování a AUTOMATICKÝ přepočet po uzavření**
- `BACKEND-CASHBOOK-REOPEN-PERMISSIONS.md` - Oprávnění pro otevření měsíce
- `CASHBOOK-API-DB-VALIDATION.md` - Validace konzistence dat

---

## ✅ CHECKLIST PRO KOMPLETNÍ IMPLEMENTACI

### 1. Force přepočet (ADMIN nástroj) ✅ **HOTOVO**

- [x] ✅ Backend: `forceRenumberAllDocuments()` implementováno
- [x] ✅ Handler: `handle_cashbook_force_renumber_post()` funguje
- [x] ✅ Routing: `/api.eeo/cashbook-force-renumber` aktivní
- [x] ✅ Frontend služba: `cashbookService.forceRenumberDocuments()`
- [x] ✅ Dialog: `ForceRenumberDialog.js` s progress vizualizací
- [x] ✅ Tlačítko v tabulce: `CashbookTab.js` (admin only, calculator icon)
- [x] ✅ Error handling: Console logging + error display
- [ ] ⏳ Browser testing: Čeká na test v prohlížeči

### 2. Automatický přepočet po uzavření ⏳ TODO

- [ ] Backend: `recalculateDocumentNumbersAfterMonth()` v `CashbookRenumberService.php`
- [ ] Integrace do `/cashbook-close` handleru
- [ ] Test: Uzavřít měsíc → ověřit přepočet následujících
- [ ] Logging: Zaznamenat přepočtené měsíce a položky

### 3. Správné počáteční číslo ⏳ TODO

- [ ] Backend: Upravit `getNextDocumentNumber()` - použít `COALESCE(MAX, startingNumber-1) + 1`
- [ ] Načítat `vpd_od_cislo` / `ppd_od_cislo` z `25a_pokladny_uzivatele`
- [ ] Test: První doklad v roce → ověřit že začíná od `*_od_cislo`

---

## 🔍 DEBUGGING - JAK ZKONTROLOVAT CHYBU

### 1. **Browser Console (F12)**

Otevři **Developer Tools** (F12) → záložka **Console**

**Hledej tyto logy:**
```javascript
// ✅ START operace
🔧 Force přepočet START: {assignmentId: 102, year: 2025}

// ✅ RESPONSE od backendu
🔧 Force přepočet RESPONSE: {status: "ok", data: {...}}

// ❌ CHYBA - pokud nastala
❌ Force přepočet ERROR: Backend endpoint /cashbook-force-renumber ještě není implementován
❌ Force přepočet EXCEPTION: Error: Request failed with status code 404
Error details: {message: "...", response: {...}, status: 404}
```

### 2. **Network Tab (Síťová aktivita)**

**Developer Tools** (F12) → záložka **Network** (Síť)

1. Zapni nahrávání (červené kolečko)
2. Klikni na "Force Přepočet"
3. Najdi request `cashbook-force-renumber`
4. Klikni na něj → záložka **Response**

**Možné chyby:**
- **404 Not Found** → Endpoint neexistuje (chyba v routingu)
- **403 Forbidden** → Nemáš oprávnění CASH_BOOK_MANAGE
- **500 Server Error** → Chyba v PHP kódu (viz Apache log)

### 3. **Backend PHP Log**

```bash
# Apache error log
tail -f /var/log/apache2/error.log

# Nebo
tail -f /var/log/httpd/error_log
```

**Hledej:**
```
[PHP Error] ... /api.eeo/cashbook-force-renumber ...
Chyba při force přepočtu dokladů: ...
```

### 4. **Test Response v dialogu**

Dialog zobrazuje chybu v červeném boxu:
```
❌ Backend endpoint /cashbook-force-renumber ještě není implementován (404)
```

---

## 📊 BACKEND RESPONSE FORMAT

**✅ Úspěch:**
```json
{
  "status": "ok",
  "message": "Doklady byly úspěšně přečíslovány",
  "data": {
    "year": 2025,
    "vpd_renumbered": 15,
    "ppd_renumbered": 8,
    "total_renumbered": 23
  }
}
```

**❌ Chyba - Endpoint neexistuje (404):**
```json
{
  "status": "error",
  "message": "Endpoint not found"
}
```

**❌ Chyba - Nedostatečná oprávnění (403):**
```json
{
  "status": "error",
  "message": "Nemáte oprávnění k této operaci. Pouze administrátor může spustit force přepočet."
}
```

**❌ Chyba - Backend exception (500):**
```json
{
  "status": "error",
  "message": "Chyba při přepočtu: Assignment not found"
}
```

---

**Status:** ✅ **FORCE RENUMBER IMPLEMENTOVÁN** | ⏳ **AUTO-PŘEPOČET ČEKÁ NA IMPLEMENTACI**
