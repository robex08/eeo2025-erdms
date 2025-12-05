# 📋 PROMPT PRO FRONTEND VÝVOJÁŘE - Import Starých Objednávek

**Datum:** 17. října 2025  
**Backend API:** Připraveno a otestováno  
**Endpoint:** `POST /orders25/import-oldies`

---

## 🎯 CO POTŘEBUJEŠ IMPLEMENTOVAT

Frontend má umožnit uživateli vybrat staré objednávky ze seznamu a naimportovat je do nového systému `orders25`.

---

## 📡 API ENDPOINT

### **URL:**
```
POST http://your-domain/api.eeo/orders25/import-oldies
```

### **Content-Type:**
```
Content-Type: application/json
```

---

## 📥 REQUEST - PARAMETRY

### **JSON Structure:**
```json
{
  "old_order_ids": [1, 25, 33, 34],
  "uzivatel_id": 5,
  "tabulka_obj": "DEMO_objednavky_2025",
  "tabulka_opriloh": "DEMO_pripojene_odokumenty",
  "database": "optional_db_name"
}
```

### **Parametry - Detail:**

| Parametr | Typ | Povinný | Popis | Příklad |
|----------|-----|---------|-------|---------|
| `old_order_ids` | `array<number>` | ✅ **ANO** | Pole ID starých objednávek k importu | `[1, 25, 33]` |
| `uzivatel_id` | `number` | ✅ **ANO** | ID přihlášeného uživatele (z nového systému) | `5` |
| `tabulka_obj` | `string` | ✅ **ANO** | Název tabulky se starými objednávkami | `"DEMO_objednavky_2025"` |
| `tabulka_opriloh` | `string` | ✅ **ANO** | Název tabulky se starými přílohami | `"DEMO_pripojene_odokumenty"` |
| `database` | `string` | ❌ NE | Název databáze (volitelné, použije se default) | `"stara_db"` |

### **Validace na FE:**
```javascript
// Před odesláním zkontroluj:
if (!old_order_ids || !Array.isArray(old_order_ids) || old_order_ids.length === 0) {
  alert('Musíte vybrat alespoň jednu objednávku');
  return;
}

if (!uzivatel_id || uzivatel_id <= 0) {
  alert('Chybí ID uživatele');
  return;
}

if (!tabulka_obj || !tabulka_opriloh) {
  alert('Chybí název tabulek');
  return;
}
```

---

## 📤 RESPONSE - STRUKTURA

### **Úspěšná odpověď:**
```json
{
  "success": true,
  "imported_count": 3,
  "failed_count": 1,
  "results": [
    {
      "old_id": 1,
      "new_id": 156,
      "cislo_objednavky": "O-2024/001",
      "polozky_count": 1,
      "prilohy_count": 2,
      "status": "OK",
      "error": null
    },
    {
      "old_id": 25,
      "new_id": null,
      "cislo_objednavky": "O-2024/025",
      "polozky_count": 0,
      "prilohy_count": 0,
      "status": "ERROR",
      "error": "Objednávka s číslem O-2024/025 již existuje"
    },
    {
      "old_id": 33,
      "new_id": 157,
      "cislo_objednavky": "O-2024/033",
      "polozky_count": 1,
      "prilohy_count": 0,
      "status": "OK",
      "error": null
    },
    {
      "old_id": 34,
      "new_id": 158,
      "cislo_objednavky": "O-2024/034",
      "polozky_count": 1,
      "prilohy_count": 5,
      "status": "OK",
      "error": null
    }
  ]
}
```

### **Response Fields:**

| Pole | Typ | Popis |
|------|-----|-------|
| `success` | `boolean` | `true` = alespoň jedna objednávka úspěšná, `false` = celková chyba |
| `imported_count` | `number` | Počet úspěšně importovaných objednávek |
| `failed_count` | `number` | Počet selhání |
| `results` | `array` | Detail pro každou objednávku |

**Položka v `results[]`:**
- `old_id` (`number`) - ID ze staré databáze
- `new_id` (`number | null`) - ID nově vytvořené objednávky (null při chybě)
- `cislo_objednavky` (`string`) - Evidenční číslo objednávky
- `polozky_count` (`number`) - Počet importovaných položek
- `prilohy_count` (`number`) - Počet importovaných příloh
- `status` (`"OK" | "ERROR"`) - Stav importu
- `error` (`string | null`) - Popis chyby (null při úspěchu)

### **Chybová odpověď (validace):**
```json
{
  "success": false,
  "error": "Parametr old_order_ids musí být pole"
}
```

```json
{
  "success": false,
  "error": "Uživatel s ID 999 neexistuje"
}
```

---

## 💻 IMPLEMENTACE - PŘÍKLADY KÓDU

### **1. React/TypeScript - Kompletní příklad:**

```typescript
// types.ts
interface ImportRequest {
  old_order_ids: number[];
  uzivatel_id: number;
  tabulka_obj: string;
  tabulka_opriloh: string;
  database?: string;
}

interface ImportResultItem {
  old_id: number;
  new_id: number | null;
  cislo_objednavky: string;
  polozky_count: number;
  prilohy_count: number;
  status: 'OK' | 'ERROR';
  error: string | null;
}

interface ImportResponse {
  success: boolean;
  imported_count?: number;
  failed_count?: number;
  results?: ImportResultItem[];
  error?: string;
}

// ImportService.ts
export const importOldOrders = async (
  orderIds: number[],
  userId: number,
  tableName: string = 'DEMO_objednavky_2025',
  attachmentsTable: string = 'DEMO_pripojene_odokumenty'
): Promise<ImportResponse> => {
  
  const payload: ImportRequest = {
    old_order_ids: orderIds,
    uzivatel_id: userId,
    tabulka_obj: tableName,
    tabulka_opriloh: attachmentsTable
  };

  try {
    const response = await fetch('/api.eeo/orders25/import-oldies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ImportResponse = await response.json();
    return result;

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};

// ImportComponent.tsx
import React, { useState } from 'react';
import { importOldOrders } from './ImportService';

export const ImportOldOrdersComponent: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      alert('Vyberte alespoň jednu objednávku');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const userId = 5; // Získej z AuthContext nebo stavu aplikace
      const response = await importOldOrders(selectedIds, userId);
      
      setResult(response);
      
      if (response.success) {
        alert(`Úspěšně importováno: ${response.imported_count} objednávek`);
      } else {
        alert(`Chyba: ${response.error}`);
      }

    } catch (error) {
      alert('Chyba při komunikaci se serverem');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Import starých objednávek</h2>
      
      {/* Výběr objednávek - tvoje implementace */}
      <div>
        {/* Checkbox seznam starých objednávek */}
      </div>

      <button onClick={handleImport} disabled={loading || selectedIds.length === 0}>
        {loading ? 'Importuji...' : `Importovat (${selectedIds.length})`}
      </button>

      {/* Zobrazení výsledků */}
      {result && result.results && (
        <div style={{ marginTop: '20px' }}>
          <h3>Výsledky importu:</h3>
          <p>✅ Úspěšných: {result.imported_count}</p>
          <p>❌ Selhalo: {result.failed_count}</p>

          <table>
            <thead>
              <tr>
                <th>Staré ID</th>
                <th>Nové ID</th>
                <th>Číslo obj.</th>
                <th>Položky</th>
                <th>Přílohy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((item) => (
                <tr key={item.old_id} style={{ 
                  backgroundColor: item.status === 'OK' ? '#d4edda' : '#f8d7da' 
                }}>
                  <td>{item.old_id}</td>
                  <td>{item.new_id || '-'}</td>
                  <td>{item.cislo_objednavky}</td>
                  <td>{item.polozky_count}</td>
                  <td>{item.prilohy_count}</td>
                  <td>
                    {item.status === 'OK' ? '✅' : '❌'}
                    {item.error && <div style={{ fontSize: '0.8em', color: 'red' }}>
                      {item.error}
                    </div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

---

### **2. Vanilla JavaScript - Jednoduchý příklad:**

```javascript
// importOldOrders.js

async function importOldOrders(orderIds, userId) {
  const payload = {
    old_order_ids: orderIds,
    uzivatel_id: userId,
    tabulka_obj: 'DEMO_objednavky_2025',
    tabulka_opriloh: 'DEMO_pripojene_odokumenty'
  };

  try {
    const response = await fetch('/api.eeo/orders25/import-oldies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Importováno:', result.imported_count);
      console.log('❌ Selhalo:', result.failed_count);
      
      // Projdi výsledky
      result.results.forEach(item => {
        if (item.status === 'OK') {
          console.log(`✅ ${item.cislo_objednavky} → Nové ID: ${item.new_id}`);
        } else {
          console.error(`❌ ${item.cislo_objednavky}: ${item.error}`);
        }
      });
      
      return result;
    } else {
      console.error('Chyba:', result.error);
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Import selhal:', error);
    throw error;
  }
}

// Použití:
const selectedIds = [1, 25, 33];
const currentUserId = 5;

importOldOrders(selectedIds, currentUserId)
  .then(result => {
    alert(`Import dokončen! Úspěšných: ${result.imported_count}`);
  })
  .catch(error => {
    alert('Chyba při importu: ' + error.message);
  });
```

---

### **3. jQuery - Pro starší projekty:**

```javascript
function importOldOrders(orderIds, userId) {
  const payload = {
    old_order_ids: orderIds,
    uzivatel_id: userId,
    tabulka_obj: 'DEMO_objednavky_2025',
    tabulka_opriloh: 'DEMO_pripojene_odokumenty'
  };

  $.ajax({
    url: '/api.eeo/orders25/import-oldies',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload),
    success: function(result) {
      if (result.success) {
        console.log('Importováno:', result.imported_count);
        alert('Import úspěšný! Importováno: ' + result.imported_count);
        
        // Zobraz výsledky
        displayResults(result.results);
      } else {
        alert('Chyba: ' + result.error);
      }
    },
    error: function(xhr, status, error) {
      console.error('Chyba:', error);
      alert('Chyba při komunikaci se serverem');
    }
  });
}

function displayResults(results) {
  let html = '<table><tr><th>ID</th><th>Číslo</th><th>Status</th></tr>';
  
  results.forEach(item => {
    const statusIcon = item.status === 'OK' ? '✅' : '❌';
    const errorText = item.error ? `<br><small>${item.error}</small>` : '';
    
    html += `<tr>
      <td>${item.old_id}</td>
      <td>${item.cislo_objednavky}</td>
      <td>${statusIcon} ${item.status} ${errorText}</td>
    </tr>`;
  });
  
  html += '</table>';
  $('#results').html(html);
}

// Použití:
$('#importBtn').click(function() {
  const selectedIds = [1, 25, 33]; // Získej z checkboxů
  const userId = 5; // Z session/context
  
  importOldOrders(selectedIds, userId);
});
```

---

## 🎨 UI/UX DOPORUČENÍ

### **1. Výběr objednávek:**
```
┌─────────────────────────────────────────┐
│ □ O-2024/001 - Notebook (25 000 Kč)    │
│ ☑ O-2024/002 - Kancelářské potřeby     │
│ ☑ O-2024/003 - Software licence         │
│ □ O-2024/004 - Nábytek (120 000 Kč)    │
└─────────────────────────────────────────┘
        [Vybrat vše] [Zrušit výběr]
           [Importovat (2)]
```

### **2. Průběh importu:**
```
Importuji objednávky...
████████░░░░░░░░ 50% (2/4)

✅ O-2024/001 importována
✅ O-2024/002 importována
⏳ O-2024/003 probíhá...
```

### **3. Výsledky:**
```
╔═══════════════════════════════════════╗
║  IMPORT DOKONČEN                       ║
╠═══════════════════════════════════════╣
║  ✅ Úspěšných:  3                      ║
║  ❌ Selhalo:    1                      ║
╚═══════════════════════════════════════╝

Detail:
✅ O-2024/001 → Nová ID: 156 (2 přílohy)
❌ O-2024/002 - Již existuje
✅ O-2024/003 → Nová ID: 157 (0 příloh)
✅ O-2024/004 → Nová ID: 158 (5 příloh)
```

---

## ⚠️ DŮLEŽITÉ POZNÁMKY PRO FE VÝVOJÁŘE

### **1. Validace před odesláním:**
```javascript
// MUSÍŠ zkontrolovat:
- old_order_ids je neprázdné pole čísel
- uzivatel_id je kladné číslo
- tabulka_obj a tabulka_opriloh jsou vyplněné
```

### **2. Error Handling:**
```javascript
// Možné chyby:
- Network error (fetch failed)
- HTTP 500 (server error)
- success: false (validační chyba)
- částečné selhání (některé OK, některé ERROR)
```

### **3. Loading States:**
```javascript
// Zobraz loading indikátor
- Disable tlačítko import
- Zobraz progress bar nebo spinner
- Po dokončení: enable tlačítko, skryj loading
```

### **4. Duplikáty:**
```javascript
// Backend kontroluje duplicity podle cislo_objednavky
// Pokud objednávka už existuje:
{
  "status": "ERROR",
  "error": "Objednávka s číslem O-2024/XXX již existuje"
}
```

### **5. Refresh po importu:**
```javascript
// Po úspěšném importu:
if (result.success && result.imported_count > 0) {
  // Refresh seznamu objednávek
  // Nebo redirect na seznam nových objednávek
  window.location.href = '/orders25/list';
}
```

---

## 🧪 TESTOVÁNÍ

### **Test 1 - Úspěšný import:**
```json
{
  "old_order_ids": [1, 2, 3],
  "uzivatel_id": 1,
  "tabulka_obj": "DEMO_objednavky_2025",
  "tabulka_opriloh": "DEMO_pripojene_odokumenty"
}
```
**Očekávaný výsledek:** `imported_count: 3, failed_count: 0`

### **Test 2 - Duplicita:**
```json
{
  "old_order_ids": [1, 1, 1],  // Stejné ID 3x
  "uzivatel_id": 1,
  "tabulka_obj": "DEMO_objednavky_2025",
  "tabulka_opriloh": "DEMO_pripojene_odokumenty"
}
```
**Očekávaný výsledek:** `imported_count: 1, failed_count: 2` (2x duplikát)

### **Test 3 - Neexistující ID:**
```json
{
  "old_order_ids": [99999],  // ID které neexistuje
  "uzivatel_id": 1,
  "tabulka_obj": "DEMO_objednavky_2025",
  "tabulka_opriloh": "DEMO_pripojene_odokumenty"
}
```
**Očekávaný výsledek:** `failed_count: 1, error: "Objednávka s ID 99999 nebyla nalezena"`

### **Test 4 - Validační chyba:**
```json
{
  "old_order_ids": [],  // Prázdné pole
  "uzivatel_id": 1,
  "tabulka_obj": "DEMO_objednavky_2025",
  "tabulka_opriloh": "DEMO_pripojene_odokumenty"
}
```
**Očekávaný výsledek:** `success: false, error: "Parametr old_order_ids musí být pole"`

---

## 📞 KONTAKT / PODPORA

Pokud narazíš na problém:

1. **Zkontroluj network tab** v DevTools
2. **Zkontroluj response JSON** - obsahuje detailní chyby
3. **Zkontroluj parametry** - všechny povinné vyplněné?
4. **Zkontroluj konzoli** - chyby v JS?

---

## 🎯 CHECKLIST PRO FE VÝVOJÁŘE

- [ ] Vytvořit UI pro výběr starých objednávek
- [ ] Implementovat API call na `/orders25/import-oldies`
- [ ] Validovat vstupní data před odesláním
- [ ] Zobrazit loading indikátor během importu
- [ ] Zpracovat response a zobrazit výsledky
- [ ] Error handling (network, validace, částečné selhání)
- [ ] Refresh seznamu objednávek po úspěšném importu
- [ ] Otestovat všechny edge cases (duplikáty, chyby, prázdný seznam)

---

**🚀 Vše, co potřebuješ pro implementaci, je v tomto dokumentu!**

**Verze:** 1.0  
**Datum:** 17. října 2025  
**Backend:** Připraveno a otestováno ✅
