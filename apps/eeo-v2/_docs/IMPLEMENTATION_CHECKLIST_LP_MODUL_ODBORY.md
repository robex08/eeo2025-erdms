# 📋 IMPLEMENTAČNÍ CHECKLIST - Dokončení LP Modul + Odbory

**Datum:** 26. května 2026  
**Status:** Backend ✅ HOTOV | Frontend ⏳ ČÁSTEČNĚ DOKONČEN  
**GIT Commits:**
- `b6c23121` - Backend COMPLETE (DB + API)
- `85145833` - Frontend Part 1 (UniversalSearch context)

---

## ✅ CO JE HOTOVÉ

### Backend (100%)
- ✅ SQL migrace (sloupec `modul`, tabulka `25a_odbory_lp_prirazeni`)
- ✅ `odboryLpHandlers.php` (save/get/delete)
- ✅ `lpHandlers.php` - context filtering
- ✅ `limitovanePrislibyCerpaniHandlers_v2_pdo.php` - odbory čerpání
- ✅ API routing (`odbory-lp/save`, `odbory-lp/get`, `odbory-lp/delete`)

### Frontend (60%)
- ✅ `apiUniversalSearch.js` - context parametr
- ✅ `useUniversalSearch.js` - context support
- ✅ `UniversalSearchInput.js` - context prop

---

## ⏳ CO ZBÝVÁ DODĚLAT

### 1. InvoiceEvidencePage - LP Integration (2-3h)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`

#### 1.1 Přidat LP API service
```javascript
// Přidat import
import { fetchLPList } from '../services/apiLP';  // VYTVOŘIT TENTO SOUBOR!

// Nebo přidat přímo do InvoiceEvidencePage:
const fetchLPs = async (context = 'invoices') => {
  const response = await fetch(process.env.REACT_APP_API2_BASE_URL + 'lp/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username,
      token: token,
      context: context  // 'invoices' pro faktury
    })
  });
  
  const data = await response.json();
  if (data.status === 'success') {
    return data.data;  // Pole LP objektů
  }
  throw new Error(data.message);
};
```

#### 1.2 Upravit `searchEntities()` funkci
```javascript
const searchEntities = useCallback(async (search) => {
  if (!search || search.length < 3) {
    setSuggestions([]);
    return;
  }

  setIsSearching(true);
  try {
    const searchParams = {
      query: search,
      categories: ['orders_2025', 'contracts'],  // Objednávky + Smlouvy
      limit: 15,
      archivovano: 0,
      search_all: canViewAllOrders
    };
    
    const response = await universalSearch(searchParams);
    const orders = response?.categories?.orders_2025?.results || [];
    const contracts = response?.categories?.contracts?.results || [];
    
    // ✅ NOVĚ: Načíst LP s context="invoices"
    const lps = await fetchLPs('invoices');
    
    // Filtrovat LP podle search query
    const filteredLPs = lps.filter(lp => 
      lp.cislo_lp?.toLowerCase().includes(search.toLowerCase()) ||
      lp.nazev_uctu?.toLowerCase().includes(search.toLowerCase())
    );
    
    // Kombinovat výsledky s označením typu
    const combinedResults = [
      ...sentOrders.map(order => ({ ...order, _type: 'order' })),
      ...activeContracts.map(contract => ({ ...contract, _type: 'smlouva' })),
      ...filteredLPs.map(lp => ({ ...lp, _type: 'lp' }))  // ✅ NOVĚ
    ];

    setSuggestions(combinedResults);
    setShowSuggestions(true);
  } catch (err) {
    console.error('Chyba při vyhledávání:', err);
    setSuggestions([]);
  } finally {
    setIsSearching(false);
  }
}, [canViewAllOrders, username, token]);
```

#### 1.3 Upravit label search inputu
```javascript
// Najít řádek s labelem "Vyberte objednávku nebo smlouvu" a změnit na:
<label>Vyberte objednávku nebo smlouvu nebo LP</label>
```

#### 1.4 Přidat rendering LP v suggestions dropdown
```javascript
// V části kde se renderují suggestions, přidat:
{suggestion._type === 'lp' && (
  <>
    <div className="suggestion-badge lp-badge">LP</div>
    <div className="suggestion-title">{suggestion.cislo_lp}</div>
    <div className="suggestion-subtitle">
      {suggestion.nazev_uctu}
      {suggestion.modul && (
        <span className="lp-modul-badge">{suggestion.modul}</span>
      )}
    </div>
  </>
)}
```

#### 1.5 Handling LP selection
```javascript
const handleSuggestionClick = async (suggestion) => {
  if (suggestion._type === 'lp') {
    // ✅ LP vybraný - clear objednávka/smlouva
    setSelectedOrder(null);
    setSelectedContract(null);
    setObjednavkaId(null);
    setSmlouvaId(null);
    
    // ✅ Nastavit LP
    setSelectedLP(suggestion);  // Přidat state: const [selectedLP, setSelectedLP] = useState(null);
    setLpId(suggestion.id);
    
    // ✅ Zavřít suggestions
    setShowSuggestions(false);
    setSearchTerm('');
  } else if (suggestion._type === 'order') {
    // ... existing order handling
  } else if (suggestion._type === 'smlouva') {
    // ... existing contract handling
  }
};
```

#### 1.6 Uložení faktury s LP přes odbory API
```javascript
// V handleSave() funkci, pokud je selectedLP:
if (selectedLP && !objednavkaId && !smlouvaId) {
  // ✅ Standalone faktura s odborovým LP
  // Po úspěšném vytvoření faktury (response.data.invoice_id):
  
  try {
    const odboryResponse = await fetch(
      process.env.REACT_APP_API2_BASE_URL + 'odbory-lp/save',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          token: token,
          faktura_id: response.data.invoice_id,
          lp_id: selectedLP.id,
          poznamka: `Odborové LP přiřazení pro fakturu ${fakturaData.cislo_faktury}`
        })
      }
    );
    
    const odboryData = await odboryResponse.json();
    if (odboryData.status !== 'success') {
      console.error('Chyba při ukládání odbory LP:', odboryData.message);
      // OPTIONAL: Zobrazit warning, ale faktura už je vytvořená
    }
  } catch (err) {
    console.error('Chyba při ukládání odbory LP:', err);
  }
}
```

#### 1.7 Zobrazení LP badge u faktury
```javascript
// Přidat do detail view faktury:
{selectedLP && (
  <div className="lp-assignment-badge">
    <span className="badge badge-info">
      LP: {selectedLP.cislo_lp} - {selectedLP.nazev_uctu}
    </span>
    <button 
      className="btn btn-sm btn-danger" 
      onClick={handleRemoveLP}
      title="Odebrat LP přiřazení"
    >
      ×
    </button>
  </div>
)}

// Handler pro odebrání:
const handleRemoveLP = async () => {
  if (!window.confirm('Opravdu odebrat LP přiřazení?')) return;
  
  try {
    const response = await fetch(
      process.env.REACT_APP_API2_BASE_URL + 'odbory-lp/delete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          token: token,
          faktura_id: currentInvoiceId
        })
      }
    );
    
    const data = await response.json();
    if (data.status === 'success') {
      setSelectedLP(null);
      setLpId(null);
      // Zobrazit úspěšnou hlášku
    }
  } catch (err) {
    console.error('Chyba při mazání LP:', err);
  }
};
```

---

### 2. CashBookPage - LP Integration (1-2h)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/CashBookPage.js`

#### Stejná logika jako InvoiceEvidencePage, ale:
- Context = `'cashbook'` místo `'invoices'`
- `pokladni_polozka_id` místo `faktura_id` v API calls
- Label: "Vyberte LP pro pokladní položku"

---

### 3. LP Badge Component (1h)

**Nový soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/components/LPBadge.js`

```javascript
/**
 * LP Badge Component
 * Zobrazuje badge s LP modulem (o=objednávky, f=faktury, p=pokladna)
 */
import React from 'react';
import styled from '@emotion/styled';

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-left: 8px;
  
  ${props => {
    const colors = {
      o: { bg: '#dbeafe', color: '#1e40af' },  // Blue - objednávky
      f: { bg: '#fce7f3', color: '#be185d' },  // Pink - faktury
      p: { bg: '#fef3c7', color: '#92400e' },  // Yellow - pokladna
      op: { bg: '#e0e7ff', color: '#3730a3' }, // Indigo - kombinace
      fp: { bg: '#f3e8ff', color: '#6b21a8' }, // Purple - kombinace
      fop: { bg: '#f1f5f9', color: '#475569' } // Gray - všechny
    };
    
    const config = colors[props.modul] || colors.fop;
    return `
      background: ${config.bg};
      color: ${config.color};
    `;
  }}
`;

const LPBadge = ({ modul }) => {
  if (!modul) return null;
  
  const labels = {
    o: 'Objednávky',
    f: 'Faktury',
    p: 'Pokladna',
    op: 'Obj + Pokl',
    fp: 'Fakt + Pokl',
    fop: 'Všechny'
  };
  
  return (
    <Badge modul={modul} title={labels[modul] || modul}>
      {modul.toUpperCase()}
    </Badge>
  );
};

export default LPBadge;
```

**Usage:**
```javascript
import LPBadge from '../components/LPBadge';

// V seznamu LP:
<div>
  {lp.cislo_lp}
  <LPBadge modul={lp.modul} />
</div>
```

---

### 4. apiLP Service (30 min)

**Nový soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/services/apiLP.js`

```javascript
/**
 * LP API Service
 */
import { loadAuthData, getStoredUsername } from '../utils/authStorage';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

/**
 * Načíst seznam LP s context filtering
 * @param {string} context - 'orders', 'invoices', 'cashbook', null
 */
export const fetchLPList = async (context = null) => {
  const token = await loadAuthData.token();
  const user = await loadAuthData.user();
  const username = user?.username || getStoredUsername();
  
  const response = await fetch(`${API_BASE_URL}lp/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, token, context })
  });
  
  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Chyba při načítání LP');
  }
  
  return data.data;
};

/**
 * Uložit odborové LP přiřazení
 */
export const saveOdboryLP = async (params) => {
  const { faktura_id, pokladni_polozka_id, lp_id, poznamka } = params;
  const token = await loadAuthData.token();
  const user = await loadAuthData.user();
  const username = user?.username || getStoredUsername();
  
  const response = await fetch(`${API_BASE_URL}odbory-lp/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      token,
      faktura_id,
      pokladni_polozka_id,
      lp_id,
      poznamka
    })
  });
  
  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Chyba při ukládání LP přiřazení');
  }
  
  return data.data;
};

/**
 * Načíst odborové LP přiřazení
 */
export const getOdboryLP = async (params) => {
  const { faktura_id, pokladni_polozka_id } = params;
  const token = await loadAuthData.token();
  const user = await loadAuthData.user();
  const username = user?.username || getStoredUsername();
  
  const response = await fetch(`${API_BASE_URL}odbory-lp/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      token,
      faktura_id,
      pokladni_polozka_id
    })
  });
  
  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Chyba při načítání LP přiřazení');
  }
  
  return data.data;
};

/**
 * Smazat odborové LP přiřazení
 */
export const deleteOdboryLP = async (params) => {
  const { faktura_id, pokladni_polozka_id } = params;
  const token = await loadAuthData.token();
  const user = await loadAuthData.user();
  const username = user?.username || getStoredUsername();
  
  const response = await fetch(`${API_BASE_URL}odbory-lp/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      token,
      faktura_id,
      pokladni_polozka_id
    })
  });
  
  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Chyba při mazání LP přiřazení');
  }
  
  return data;
};

export default {
  fetchLPList,
  saveOdboryLP,
  getOdboryLP,
  deleteOdboryLP
};
```

---

### 5. OrderForm25 - Context Prop (10 min)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/pages/OrderForm25.js`

Najít UniversalSearch komponentu a přidat context:
```javascript
// PŘED:
<UniversalSearch />

// PO:
<UniversalSearch context="orders" />
```

---

### 6. LimitovanePrislibyManager - Modul Column (30 min)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/components/LimitovanePrislibyManager.js`

#### 6.1 Přidat sloupec do tabulky
```javascript
// V headers array:
{ key: 'modul', label: 'Modul', sortable: true, width: '100px' }

// V render části:
<td>
  <LPBadge modul={lp.modul} />
</td>
```

#### 6.2 Přidat modul do formuláře (CREATE/EDIT)
```javascript
<div className="form-group">
  <label>Viditelnost v modulech</label>
  <select 
    name="modul" 
    value={formData.modul || 'op'}
    onChange={handleInputChange}
    className="form-control"
  >
    <option value="op">Objednávky + Pokladna (výchozí)</option>
    <option value="o">Pouze objednávky</option>
    <option value="f">Pouze faktury</option>
    <option value="p">Pouze pokladna</option>
    <option value="fp">Faktury + Pokladna</option>
    <option value="fop">Všechny moduly</option>
  </select>
  <small className="form-text text-muted">
    Určuje, ve kterých modulech se LP zobrazí při výběru
  </small>
</div>
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### Test 1: Modul Filtering
1. V LimitovanePrislibyManager vytvořit LP s modulem='f' (faktury)
2. V OrderForm25 otevřít LP výběr → LP by se NEMĚL zobrazit
3. V InvoiceEvidencePage otevřít LP výběr → LP by se MĚL zobrazit

### Test 2: Odbory LP - Standalone Faktura
1. V InvoiceEvidencePage vytvořit fakturu BEZ objednávky/smlouvy
2. Vybrat LP z navrhovače
3. Uložit fakturu → mělo by vytvořit záznam v `25a_odbory_lp_prirazeni`
4. Zkontrolovat v DB: `SELECT * FROM 25a_odbory_lp_prirazeni;`
5. Otevřít detail faktury → měl by zobrazit LP badge

### Test 3: Čerpání LP z Odbory
1. Vytvořit fakturu s odborovým LP (Test 2)
2. Potvrdit věcnou správnost faktury
3. Spustit přepočet čerpání: `/api.eeo/lp/recalculate`
4. Zkontrolovat v `25_limitovane_prisliby_cerpani`:
   - `skutecne_cerpano` by mělo obsahovat částku faktury
5. V LimitovanePrislibyManager ověřit, že čerpání se zobrazuje správně

### Test 4: Rollback
```sql
-- Rollback databáze:
DROP TABLE IF EXISTS 25a_odbory_lp_prirazeni;
DROP INDEX idx_modul ON 25_limitovane_prisliby;
ALTER TABLE 25_limitovane_prisliby DROP COLUMN modul;
```

```bash
# Rollback git:
git reset --hard backup-before-lp-modul-20260526
```

---

## 📊 ODHAD ČASU

| Úkol | Čas | Priorita |
|------|-----|----------|
| InvoiceEvidencePage LP integration | 2-3h | 🔴 HIGH |
| apiLP Service | 30min | 🔴 HIGH |
| LPBadge Component | 1h | 🟡 MEDIUM |
| CashBookPage LP integration | 1-2h | 🟡 MEDIUM |
| OrderForm25 context prop | 10min | 🟢 LOW |
| LimitovanePrislibyManager modul column | 30min | 🟢 LOW |
| **CELKEM** | **5-7 hodin** | |

---

## 🚀 DEPLOYMENT CHECKLIST

### DEV Deployment
- [ ] Dokončit frontend implementaci
- [ ] Testovat všechny scénáře (viz výše)
- [ ] Commit + push do `feature/v3-development`
- [ ] Restart Apache: `systemctl reload apache2`
- [ ] Clear React cache: `rm -rf client/node_modules/.cache`
- [ ] Build DEV: `cd client && npm run build:dev`

### PROD Deployment (⚠️ VYŽADUJE POTVRZENÍ)
- [ ] UAT testování v DEV (1 den)
- [ ] Schválení od týmu
- [ ] Backup produkční DB
- [ ] Spustit SQL migrace na PROD DB (`eeo2025`)
- [ ] Build PROD: `npm run build:prod`
- [ ] rsync do `/var/www/erdms-platform/`
- [ ] Restart Apache na PROD
- [ ] Smoke test
- [ ] Monitor error logs

---

## 📝 NOTES

- ✅ Backend je 100% hotový a otestovaný
- ✅ UniversalSearch context infrastructure je připravená
- ⏳ Zbývá hlavně frontend UI integrace
- 🔒 Rollback je snadný díky non-invasive approach
- 📊 DEFAULT 'op' zajišťuje 100% zpětnou kompatibilitu

---

**Autor:** AI Assistant + robex08  
**Datum:** 26. května 2026  
**Verze:** 1.0
