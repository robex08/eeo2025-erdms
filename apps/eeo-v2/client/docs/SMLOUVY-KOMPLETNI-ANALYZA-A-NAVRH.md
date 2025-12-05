# 📋 SMLOUVY - KOMPLEXNÍ ANALÝZA A IMPLEMENTAČNÍ PLÁN

**Datum:** 23. listopadu 2025  
**Verze:** 1.0  
**MySQL:** 5.5.43  
**Scope:** Modul smluv v číselníkách + hlídání čerpání v OrderForm

---

## 🎯 ZADÁNÍ

### Požadavky
1. **Nový modul "Smlouvy" v číselníkách** s podporou:
   - Hromadný import z tabulky (Excel/CSV)
   - Ruční přidání/editace smlouvy
   - Správa a přehled smluv
   
2. **Dokončit sekci Limitované přísliby** v číselníkách:
   - Správa a editace LP
   - Kompletní CRUD operace
   
3. **Hlídání čerpání** (budoucnost - má čas):
   - V OrderForm hlídat čerpání ze smluv
   - V OrderForm hlídat čerpání z Limitovaných příslibů

### Struktura dat ze screenshotu
| Sloupec | Typ | Popis |
|---------|-----|-------|
| ČÍSLO SML | Text | Unikátní číslo smlouvy (např. S-147/750309/26/23) |
| ÚSEK | Text | Zkratka úseku (např. ÚEko, ÚPT) |
| DRUH | Text | Typ smlouvy (SLUŽBY, KUPNÍ, RÁMCOVÁ) |
| NÁZEV FIRMY | Text | Název dodavatele/firmy |
| IČO | Text | IČO dodavatele |
| NÁZEV SML | Text | Název smlouvy |
| POPIS SML | Text | Popis smlouvy |
| DATUM OD | Date | Datum platnosti od |
| DATUM DO | Date | Datum platnosti do |
| HODNOTA | Number | Hodnota bez DPH |
| HODNOTA S DPH | Number | Hodnota s DPH |
| ČERPÁNÍ | Number | Aktuální čerpání (částka) |

---

## 🗄️ DATABÁZOVÁ STRUKTURA

### ⚠️ DŮLEŽITÉ: Vazba smlouvy ↔ objednávky

**Vazba je řešena přes existující pole v objednávce:**

V tabulce `25a_objednavky` již existuje pole **dynamického financování**:
- Uživatel v objednávce vybere zdroj = **"Smlouva"**
- Zobrazí se pole pro **číslo smlouvy** (text input nebo select)
- Do pole `cislo_smlouvy` (nebo podobného) se uloží číslo smlouvy
- Podle tohoto pole se objednávka přiřadí ke smlouvě
- Čerpání se počítá agregací objednávek s daným `cislo_smlouvy`

**Výhody tohoto řešení:**
- ✅ Žádná nová vazební tabulka
- ✅ Využití existující struktury dynamického financování
- ✅ Jednodušší implementace
- ✅ Přímá vazba 1:N (1 smlouva → N objednávek)
- ✅ Agregace přes SQL JOIN místo složitých vazeb

---

### 1. Hlavní tabulka smluv

```sql
-- MySQL 5.5.43 kompatibilní
CREATE TABLE `25_smlouvy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cislo_smlouvy` VARCHAR(100) NOT NULL COMMENT 'Evidenční číslo smlouvy (např. S-147/750309/26/23)',
  `usek_id` INT(11) NOT NULL COMMENT 'ID úseku z tabulky 25_useky',
  `usek_zkr` VARCHAR(50) DEFAULT NULL COMMENT 'Zkratka úseku (pro rychlost)',
  `druh_smlouvy` VARCHAR(100) NOT NULL COMMENT 'Typ smlouvy: SLUŽBY, KUPNÍ, RÁMCOVÁ, atd.',
  
  -- Dodavatel
  `nazev_firmy` VARCHAR(255) NOT NULL COMMENT 'Název dodavatele/firmy',
  `ico` VARCHAR(20) DEFAULT NULL COMMENT 'IČO dodavatele',
  
  -- Popis smlouvy
  `nazev_smlouvy` VARCHAR(500) NOT NULL COMMENT 'Název/předmět smlouvy',
  `popis_smlouvy` TEXT DEFAULT NULL COMMENT 'Detailní popis smlouvy',
  
  -- Platnost
  `platnost_od` DATE NOT NULL COMMENT 'Datum platnosti od',
  `platnost_do` DATE NOT NULL COMMENT 'Datum platnosti do',
  
  -- Finanční údaje
  `hodnota_bez_dph` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Hodnota smlouvy bez DPH',
  `hodnota_s_dph` DECIMAL(15,2) NOT NULL COMMENT 'Hodnota smlouvy s DPH (hlavní částka)',
  
  -- Čerpání (agregované hodnoty)
  `cerpano_celkem` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Celkové čerpání ze smlouvy',
  `zbyva` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývající částka (hodnota_s_dph - cerpano_celkem)',
  `procento_cerpani` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento čerpání (%)',
  
  -- Stav smlouvy
  `aktivni` TINYINT(1) DEFAULT 1 COMMENT '1 = aktivní, 0 = neaktivní/archivováno',
  `stav` ENUM('AKTIVNI', 'UKONCENA', 'PRERUSENA', 'PRIPRAVOVANA') DEFAULT 'AKTIVNI' COMMENT 'Stav smlouvy',
  
  -- Metadata
  `dt_vytvoreni` DATETIME DEFAULT NULL COMMENT 'Datum vytvoření záznamu',
  `dt_aktualizace` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Datum poslední aktualizace',
  `vytvoril_user_id` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil záznam',
  `posledni_prepocet` DATETIME DEFAULT NULL COMMENT 'Časová značka posledního přepočtu čerpání',
  
  -- Dodatečné informace
  `poznamka` TEXT DEFAULT NULL COMMENT 'Interní poznámka',
  `cislo_dms` VARCHAR(100) DEFAULT NULL COMMENT 'Číslo v DMS/archivním systému',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_smlouvy` (`cislo_smlouvy`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_ico` (`ico`),
  KEY `idx_druh` (`druh_smlouvy`),
  KEY `idx_platnost` (`platnost_od`, `platnost_do`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_stav` (`stav`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Evidence smluv - správa a sledování čerpání';
```

### 2. Tabulka pro import historii

```sql
CREATE TABLE `25_smlouvy_import_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `dt_importu` DATETIME NOT NULL COMMENT 'Datum a čas importu',
  `user_id` INT(11) NOT NULL COMMENT 'Uživatel, který provedl import',
  `nazev_souboru` VARCHAR(255) DEFAULT NULL COMMENT 'Název importovaného souboru',
  `pocet_radku` INT(11) DEFAULT 0 COMMENT 'Počet záznamů v importu',
  `pocet_uspesnych` INT(11) DEFAULT 0 COMMENT 'Počet úspěšně importovaných',
  `pocet_chyb` INT(11) DEFAULT 0 COMMENT 'Počet chyb při importu',
  `chybove_zaznamy` TEXT DEFAULT NULL COMMENT 'JSON se seznamem chyb',
  `status` ENUM('SUCCESS', 'PARTIAL', 'FAILED') DEFAULT 'SUCCESS' COMMENT 'Stav importu',
  
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_datum` (`dt_importu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Historie importů smluv';
```

### 3. Rozšíření tabulky objednávek (VOLITELNÉ)

**POZNÁMKA:** Tato změna je volitelná - záleží na současné struktuře pole dynamického financování.

```sql
-- Pokud pole pro číslo smlouvy v objednávce ještě neexistuje:
ALTER TABLE `25a_objednavky` 
  ADD COLUMN `cislo_smlouvy` VARCHAR(100) DEFAULT NULL COMMENT 'Číslo smlouvy (vazba na 25_smlouvy.cislo_smlouvy)',
  ADD INDEX `idx_cislo_smlouvy` (`cislo_smlouvy`);

-- Případně foreign key constraint (doporučeno):
ALTER TABLE `25a_objednavky`
  ADD CONSTRAINT `fk_objednavky_smlouva`
    FOREIGN KEY (`cislo_smlouvy`) 
    REFERENCES `25_smlouvy` (`cislo_smlouvy`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
```

**Pokud pole již existuje v rámci dynamického financování, není třeba nic měnit!**

---

## 🔌 API ENDPOINTY

### Base URL
```
POST https://eeo.zachranka.cz/api.eeo/ciselniky/smlouvy/{action}
```

### 1. Seznam smluv
**Endpoint:** `POST ciselniky/smlouvy/list`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "show_inactive": false,
  "usek_id": null,
  "druh_smlouvy": null,
  "stav": null,
  "search": null
}
```

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "cislo_smlouvy": "S-147/750309/26/23",
      "usek_id": 10,
      "usek_zkr": "ÚEko",
      "druh_smlouvy": "SLUŽBY",
      "nazev_firmy": "Alter Audit, s.r.o.",
      "ico": "29268931",
      "nazev_smlouvy": "Smlouva o poskytování poradenských služeb",
      "popis_smlouvy": "Smlouva o poskytování poradenských a konzultačních služeb",
      "platnost_od": "2023-06-05",
      "platnost_do": "2025-12-31",
      "hodnota_bez_dph": 500000.00,
      "hodnota_s_dph": 605000.00,
      "cerpano_celkem": 150000.00,
      "zbyva": 455000.00,
      "procento_cerpani": 24.79,
      "aktivni": 1,
      "stav": "AKTIVNI",
      "dt_vytvoreni": "2025-11-23T10:00:00",
      "dt_aktualizace": "2025-11-23T10:00:00",
      "posledni_prepocet": "2025-11-23T09:30:00"
    }
  ]
}
```

### 2. Detail smlouvy
**Endpoint:** `POST ciselniky/smlouvy/detail`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "id": 1
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "smlouva": {
      "id": 1,
      "cislo_smlouvy": "S-147/750309/26/23",
      // ... všechna pole jako v list
    },
    "objednavky": [
      {
        "id": 123,
        "ev_cislo": "2025/001",
        "predmet": "Konzultace ekonomika",
        "max_cena_s_dph": 50000.00,
        "stav_objednavky": "SCHVALENA",
        "dt_vytvoreni": "2025-11-01T10:00:00"
      }
    ],
    "statistiky": {
      "pocet_objednavek": 3,
      "celkem_cerpano": 150000.00,
      "prumerna_objednavka": 50000.00
    }
  }
}
```

### 3. Vytvoření smlouvy
**Endpoint:** `POST ciselniky/smlouvy/insert`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "cislo_smlouvy": "S-124/750309/2025",
  "usek_id": 10,
  "druh_smlouvy": "RÁMCOVÁ",
  "nazev_firmy": "Firma s.r.o.",
  "ico": "12345678",
  "nazev_smlouvy": "Název smlouvy",
  "popis_smlouvy": "Popis...",
  "platnost_od": "2025-01-01",
  "platnost_do": "2025-12-31",
  "hodnota_bez_dph": 1000000.00,
  "hodnota_s_dph": 1210000.00,
  "aktivni": 1,
  "stav": "PRIPRAVOVANA"
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "id": 15,
    "message": "Smlouva byla úspěšně vytvořena"
  }
}
```

### 4. Aktualizace smlouvy
**Endpoint:** `POST ciselniky/smlouvy/update`

**Request:** Stejné pole jako insert + `id`

**Response:**
```json
{
  "status": "ok",
  "data": {
    "message": "Smlouva byla úspěšně aktualizována"
  }
}
```

### 5. Smazání smlouvy
**Endpoint:** `POST ciselniky/smlouvy/delete`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "id": 15
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "message": "Smlouva byla úspěšně smazána"
  }
}
```

### 6. Hromadný import
**Endpoint:** `POST ciselniky/smlouvy/bulk-import`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "data": [
    {
      "cislo_smlouvy": "S-147/750309/26/23",
      "usek_zkr": "ÚEko",
      "druh_smlouvy": "SLUŽBY",
      "nazev_firmy": "Alter Audit, s.r.o.",
      "ico": "29268931",
      "nazev_smlouvy": "Smlouva o poskytování poradenských služeb",
      "popis_smlouvy": "...",
      "platnost_od": "2023-06-05",
      "platnost_do": "2025-12-31",
      "hodnota_bez_dph": 500000.00,
      "hodnota_s_dph": 605000.00
    }
    // ... další záznamy
  ],
  "overwrite_existing": false
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "celkem_radku": 150,
    "uspesne_importovano": 148,
    "preskoceno_duplicit": 2,
    "chyby": [],
    "import_log_id": 5
  }
}
```

### 7. Přepočet čerpání (z objednávek)
**Endpoint:** `POST ciselniky/smlouvy/prepocet-cerpani`

**Popis:** Přepočítá čerpání všech smluv na základě přiřazených objednávek (pole `cislo_smlouvy` v objednávkách).

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "cislo_smlouvy": null  // null = všechny smlouvy, nebo konkrétní číslo
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "prepocitano_smluv": 45,
    "cas_vypoctu_ms": 1250,
    "dt_prepoctu": "2025-11-23T10:30:00"
  }
}
```

---

## 🎨 FRONTEND KOMPONENTY

### Struktura souborů

```
src/
├── components/
│   └── dictionaries/
│       └── tabs/
│           ├── SmlouvyTab.js           # Hlavní tab pro smlouvy
│           ├── LimitovanePrislibyTab.js # LP tab (nový)
│           └── ...
├── services/
│   └── apiv2Dictionaries.js            # API funkce pro smlouvy a LP
└── pages/
    └── DictionariesNew.js               # Přidat tab "Smlouvy" a "LP"
```

### 1. SmlouvyTab.js - Struktura

```javascript
import React, { useState, useEffect } from 'react';
import { 
  getSmlouvyList, 
  createSmlouva, 
  updateSmlouva, 
  deleteSmlouva,
  bulkImportSmlouvy,
  prepocetCerpaniSmlouvy 
} from '../../../services/apiv2Dictionaries';

const SmlouvyTab = () => {
  const [smlouvy, setSmlouvy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSmlouva, setEditingSmlouva] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filtry
  const [filters, setFilters] = useState({
    usek_id: null,
    druh_smlouvy: null,
    stav: null,
    show_inactive: false,
    search: ''
  });
  
  // Načtení dat
  useEffect(() => {
    loadSmlouvy();
  }, [filters]);
  
  const loadSmlouvy = async () => {
    setLoading(true);
    try {
      const data = await getSmlouvyList({
        token,
        username,
        ...filters
      });
      setSmlouvy(data);
    } catch (error) {
      showToast('Chyba při načítání smluv', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // CRUD operace
  const handleCreate = async (formData) => { /* ... */ };
  const handleUpdate = async (id, formData) => { /* ... */ };
  const handleDelete = async (id) => { /* ... */ };
  
  // Import
  const handleBulkImport = async (file) => {
    // 1. Parse Excel/CSV
    // 2. Validace dat
    // 3. Volání API bulk-import
  };
  
  return (
    <div>
      {/* Toolbar */}
      <Toolbar>
        <SearchInput 
          value={filters.search} 
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        <FilterDropdown /> {/* Úsek, Druh, Stav */}
        <Button onClick={() => setShowModal(true)}>
          + Nová smlouva
        </Button>
        <Button onClick={() => setShowImportModal(true)}>
          📤 Import z Excelu
        </Button>
        <Button onClick={handlePrepocet}>
          🔄 Přepočítat čerpání
        </Button>
      </Toolbar>
      
      {/* Tabulka smluv */}
      <SmlouvyTable 
        data={smlouvy}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      {/* Modály */}
      {showModal && (
        <SmlouvaFormModal 
          smlouva={editingSmlouva}
          onSave={editingSmlouva ? handleUpdate : handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
      
      {showImportModal && (
        <SmlouvyImportModal 
          onImport={handleBulkImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};
```

### 2. SmlouvyTable.js - Tabulka

```javascript
const SmlouvyTable = ({ data, onEdit, onDelete }) => {
  const columns = [
    { key: 'cislo_smlouvy', label: 'Číslo smlouvy', width: '150px' },
    { key: 'usek_zkr', label: 'Úsek', width: '80px' },
    { key: 'druh_smlouvy', label: 'Druh', width: '120px' },
    { key: 'nazev_firmy', label: 'Firma', width: '200px' },
    { key: 'nazev_smlouvy', label: 'Název smlouvy', width: '250px' },
    { key: 'platnost_od', label: 'Platnost od', width: '100px' },
    { key: 'platnost_do', label: 'Platnost do', width: '100px' },
    { key: 'hodnota_s_dph', label: 'Hodnota s DPH', width: '120px', align: 'right' },
    { key: 'cerpano_celkem', label: 'Čerpáno', width: '120px', align: 'right' },
    { key: 'zbyva', label: 'Zbývá', width: '120px', align: 'right' },
    { key: 'procento_cerpani', label: '%', width: '60px', align: 'center' },
    { key: 'stav', label: 'Stav', width: '100px' },
  ];
  
  return (
    <Table>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{ width: col.width }}>
              {col.label}
            </th>
          ))}
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        {data.map(smlouva => (
          <tr key={smlouva.id}>
            <td>{smlouva.cislo_smlouvy}</td>
            <td>{smlouva.usek_zkr}</td>
            <td>{smlouva.druh_smlouvy}</td>
            <td>{smlouva.nazev_firmy}</td>
            <td>{smlouva.nazev_smlouvy}</td>
            <td>{formatDate(smlouva.platnost_od)}</td>
            <td>{formatDate(smlouva.platnost_do)}</td>
            <td className="text-right">{formatCurrency(smlouva.hodnota_s_dph)}</td>
            <td className="text-right">{formatCurrency(smlouva.cerpano_celkem)}</td>
            <td className="text-right">{formatCurrency(smlouva.zbyva)}</td>
            <td className="text-center">
              <ProgressBadge value={smlouva.procento_cerpani} />
            </td>
            <td>
              <StatusBadge status={smlouva.stav} />
            </td>
            <td>
              <ActionButtons 
                onEdit={() => onEdit(smlouva)}
                onDelete={() => onDelete(smlouva.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
```

### 3. SmlouvyImportModal.js - Import z Excelu

```javascript
import * as XLSX from 'xlsx';

const SmlouvyImportModal = ({ onImport, onClose }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [step, setStep] = useState(1); // 1=výběr, 2=náhled, 3=import
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Mapování sloupců
      const mapped = data.map(row => ({
        cislo_smlouvy: row['ČÍSLO SML'] || row['cislo_smlouvy'],
        usek_zkr: row['ÚSEK'] || row['usek'],
        druh_smlouvy: row['DRUH'] || row['druh'],
        nazev_firmy: row['NÁZEV FIRMY'] || row['nazev_firmy'],
        ico: row['IČO'] || row['ico'],
        nazev_smlouvy: row['NÁZEV SML'] || row['nazev_smlouvy'],
        popis_smlouvy: row['POPIS SML'] || row['popis'],
        platnost_od: parseExcelDate(row['DATUM OD']),
        platnost_do: parseExcelDate(row['DATUM DO']),
        hodnota_bez_dph: parseFloat(row['HODNOTA']),
        hodnota_s_dph: parseFloat(row['HODNOTA S DPH'])
      }));
      
      // Validace
      const errors = validateImportData(mapped);
      setValidationErrors(errors);
      setParsedData(mapped);
      setStep(2);
    };
    
    reader.readAsBinaryString(file);
  };
  
  const validateImportData = (data) => {
    const errors = [];
    data.forEach((row, index) => {
      if (!row.cislo_smlouvy) {
        errors.push({ row: index + 1, field: 'cislo_smlouvy', message: 'Chybí číslo smlouvy' });
      }
      if (!row.hodnota_s_dph || row.hodnota_s_dph <= 0) {
        errors.push({ row: index + 1, field: 'hodnota_s_dph', message: 'Neplatná hodnota' });
      }
      // ... další validace
    });
    return errors;
  };
  
  const handleImport = async () => {
    setStep(3);
    try {
      const result = await onImport(parsedData);
      showToast(`Import dokončen: ${result.uspesne_importovano}/${result.celkem_radku}`, { type: 'success' });
      onClose();
    } catch (error) {
      showToast('Chyba při importu', { type: 'error' });
    }
  };
  
  return (
    <Modal>
      {step === 1 && (
        <div>
          <h2>Import smluv z Excelu</h2>
          <FileUpload onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
          <TemplateDownload />
        </div>
      )}
      
      {step === 2 && (
        <div>
          <h2>Náhled importu</h2>
          {validationErrors.length > 0 && (
            <ErrorList errors={validationErrors} />
          )}
          <PreviewTable data={parsedData} />
          <Button onClick={handleImport} disabled={validationErrors.length > 0}>
            Importovat ({parsedData.length} záznamů)
          </Button>
        </div>
      )}
      
      {step === 3 && <LoadingSpinner text="Probíhá import..." />}
    </Modal>
  );
};
```

---

## 📊 LIMITOVANÉ PŘÍSLIBY - DOKONČENÍ SEKCE

### Co už existuje
- ✅ Tabulka `25_limitovane_prisliby`
- ✅ Tabulka `25_limitovane_prisliby_cerpani`
- ✅ API endpointy pro čtení (`/stav`, `/prepocet`)
- ✅ Komponenta `LimitovanePrislibyManager` v OrderForm

### Co chybí v číselníkách
- ❌ Tab "Limitované přísliby" v DictionariesNew
- ❌ CRUD operace (create, update, delete)
- ❌ UI pro správu LP kódů
- ❌ Správa navýšení limitů

### 1. API endpointy pro CRUD

```javascript
// src/services/apiv2Dictionaries.js

/**
 * Seznam LP
 */
export async function getLimitovanePrislibyList({ token, username, show_inactive = false }) {
  try {
    const response = await api.post('ciselniky/limitovane-prisliby/list', {
      username,
      token,
      show_inactive
    });
    
    const data = checkResponse(response, 'Načítání limitovaných příslibů');
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    handleApiError(error, 'Chyba při načítání LP');
    throw error;
  }
}

/**
 * Detail LP
 */
export async function getLimitovanyPrislibDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/limitovane-prisliby/detail', {
      username,
      token,
      id
    });
    
    const data = checkResponse(response, 'Načítání detailu LP');
    return data.data;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu LP');
    throw error;
  }
}

/**
 * Vytvoření LP
 */
export async function createLimitovanyPrislib({ token, username, ...lpData }) {
  try {
    const response = await api.post('ciselniky/limitovane-prisliby/insert', {
      username,
      token,
      ...lpData
    });
    
    const data = checkResponse(response, 'Vytváření LP');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření LP');
    throw error;
  }
}

/**
 * Aktualizace LP
 */
export async function updateLimitovanyPrislib({ token, username, id, ...lpData }) {
  try {
    const response = await api.post('ciselniky/limitovane-prisliby/update', {
      username,
      token,
      id,
      ...lpData
    });
    
    const data = checkResponse(response, 'Aktualizace LP');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci LP');
    throw error;
  }
}

/**
 * Smazání LP
 */
export async function deleteLimitovanyPrislib({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/limitovane-prisliby/delete', {
      username,
      token,
      id
    });
    
    const data = checkResponse(response, 'Mazání LP');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání LP');
    throw error;
  }
}
```

### 2. LimitovanePrislibyTab.js komponenta

Podobná struktura jako SmlouvyTab:
- Tabulka se seznamem LP
- Formulář pro přidání/editaci
- Zobrazení čerpání (rezervace, předpoklad, skutečnost)
- Možnost přepočtu čerpání
- Správa navýšení limitů

---

## 🚦 HLÍDÁNÍ ČERPÁNÍ V ORDERFORM (BUDOUCNOST)

### Koncept

Při vytváření/editaci objednávky kontrolovat:

1. **Smlouvy:**
   - Má objednávka vybranou smlouvu?
   - Je smlouva aktivní a v platnosti?
   - Stačí zbývající částka na smlouvě?
   - Varování při překročení

2. **Limitované přísliby:**
   - Je vybrán LP kód?
   - Stačí zbývající limit?
   - Který typ čerpání sledovat? (rezervace/předpoklad/skutečnost)
   - Varování při překročení

### Implementace v OrderForm

```javascript
// OrderForm25 - nový hook
const useCerpaniValidation = ({ smlouvaId, lpId, castka }) => {
  const [validation, setValidation] = useState({
    smlouva: { ok: true, message: null },
    lp: { ok: true, message: null }
  });
  
  useEffect(() => {
    validateCerpani();
  }, [smlouvaId, lpId, castka]);
  
  const validateCerpani = async () => {
    // Validace smlouvy
    if (smlouvaId) {
      const smlouva = await getSmlouvaDetail({ token, username, id: smlouvaId });
      if (smlouva.zbyva < castka) {
        setValidation(prev => ({
          ...prev,
          smlouva: {
            ok: false,
            message: `Překročení limitu smlouvy! Zbývá: ${smlouva.zbyva} Kč`
          }
        }));
      }
    }
    
    // Validace LP
    if (lpId) {
      const lp = await getLpStav({ token, username, lp_id: lpId });
      if (lp.zbyva_rezervace < castka) {
        setValidation(prev => ({
          ...prev,
          lp: {
            ok: false,
            message: `Překročení LP limitu! Zbývá: ${lp.zbyva_rezervace} Kč`
          }
        }));
      }
    }
  };
  
  return validation;
};

// Použití v OrderForm
const { validation } = useCerpaniValidation({
  smlouvaId: formData.smlouva_id,
  lpId: formData.lp_id,
  castka: formData.max_cena_s_dph
});

{validation.smlouva.ok === false && (
  <WarningBanner type="error">
    ⚠️ {validation.smlouva.message}
  </WarningBanner>
)}
```

---

## 📝 IMPLEMENTAČNÍ PLÁN

### FÁZE 1: Databáze a Backend API (PRIORITA)

**Časový odhad:** 3-4 dny

1. **Vytvoření tabulek (0.5 dne)**
   - `25_smlouvy`
   - `25_smlouvy_import_log`
   - `25_smlouvy_objednavky`
   - SQL skripty pro MySQL 5.5.43

2. **Backend API - Smlouvy (2 dny)**
   - `/ciselniky/smlouvy/list`
   - `/ciselniky/smlouvy/detail`
   - `/ciselniky/smlouvy/insert`
   - `/ciselniky/smlouvy/update`
   - `/ciselniky/smlouvy/delete`
   - `/ciselniky/smlouvy/bulk-import`
   - `/ciselniky/smlouvy/prepocet-cerpani`

3. **Backend API - LP CRUD (1 den)**
   - `/ciselniky/limitovane-prisliby/insert`
   - `/ciselniky/limitovane-prisliby/update`
   - `/ciselniky/limitovane-prisliby/delete`

4. **Testování API (0.5 dne)**
   - Unit testy
   - Integrační testy
   - Dokumentace

### FÁZE 2: Frontend - Číselníky (PRIORITA)

**Časový odhad:** 4-5 dní

1. **API služby (0.5 dne)**
   - Přidat funkce do `apiv2Dictionaries.js`
   - TypeScript typy (pokud používáte)

2. **SmlouvyTab komponenta (2 dny)**
   - Základní tabulka se seznamem
   - Formulář pro přidání/editaci
   - CRUD operace
   - Filtry a vyhledávání

3. **Import funkcionalita (1.5 dne)**
   - `SmlouvyImportModal` komponenta
   - Excel/CSV parser
   - Validace dat
   - Náhled před importem
   - Zpracování chyb

4. **LimitovanePrislibyTab (1 den)**
   - Tabulka se seznamem LP
   - Formulář pro CRUD
   - Zobrazení čerpání (3 typy)
   - Přepočet čerpání

5. **Integrace do DictionariesNew (0.5 dne)**
   - Přidat nové taby
   - Navigace
   - Ikony

### FÁZE 3: Hlídání čerpání v OrderForm (NÍZKÁ PRIORITA)

**Časový odhad:** 2-3 dny

1. **Validační hook (1 den)**
   - `useCerpaniValidation`
   - Kontrola smluv
   - Kontrola LP
   - Real-time validace

2. **UI komponenty (1 den)**
   - Warning bannery
   - Select pro výběr smlouvy
   - Zobrazení zbývající částky
   - Progress bary

3. **Integrace do workflow (0.5 dne)**
   - Vazba na formulář
   - Blokování/varování
   - Uživatelská práva

### FÁZE 4: Testování a optimalizace

**Časový odhad:** 2 dny

1. **Funkční testování**
2. **Performance optimalizace**
3. **Dokumentace pro uživatele**
4. **Školení administrátorů**

---

## 🔒 OPRÁVNĚNÍ

### Nová práva v systému

```sql
INSERT INTO 25_prava (kod_prava, popis, aktivni) VALUES
('CONTRACT_VIEW', 'Oprávnění k zobrazení seznamu a detailu smluv', 1),
('CONTRACT_CREATE', 'Oprávnění k vytváření nových smluv', 1),
('CONTRACT_EDIT', 'Oprávnění k úpravě existujících smluv', 1),
('CONTRACT_DELETE', 'Oprávnění ke smazání smluv (soft delete)', 1),
('CONTRACT_IMPORT', 'Oprávnění k hromadnému importu smluv z Excel/CSV', 1),
('LP_MANAGE', 'Správa limitovaných příslibů', 1);
```

### Kontrola v API

```php
// Příklad kontroly oprávnění v PHP
if (!check_permission($user_id, 'CONTRACT_IMPORT')) {
    return json_response(['err' => 'Nemáte oprávnění pro import smluv'], 403);
}
```

---

## 📊 EXCEL ŠABLONA PRO IMPORT

### Příklad struktury CSV/XLSX

```csv
ČÍSLO SML,ÚSEK,DRUH,NÁZEV FIRMY,IČO,NÁZEV SML,POPIS SML,DATUM OD,DATUM DO,HODNOTA,HODNOTA S DPH,ČERPÁNÍ
S-147/750309/26/23,ÚEko,SLUŽBY,Alter Audit s.r.o.,29268931,Smlouva o poskytování poradenských služeb,Poskytování poradenských služeb,05.06.2023,31.12.2025,500000,605000,0
S-124/750309/2025,ÚPT,KUPNÍ,Preucentrum N&N s.r.o.,25367463,Kupní smlouva,Kupní smlouva - Letní pneumatiky,30.04.2025,15.05.2025,1100000,1334872,0
```

---

## 🎯 CELKOVÝ ODHAD

| Fáze | Časový odhad | Priorita |
|------|--------------|----------|
| Backend (DB + API) | 3-4 dny | VYSOKÁ |
| Frontend (Číselníky) | 4-5 dní | VYSOKÁ |
| Hlídání v OrderForm | 2-3 dny | NÍZKÁ (má čas) |
| Testování | 2 dny | STŘEDNÍ |
| **CELKEM** | **11-14 dní** | |

---

## 📋 CHECKLIST PRO BACKEND TÝM

### Databáze
- [ ] Vytvořit tabulku `25_smlouvy`
- [ ] Vytvořit tabulku `25_smlouvy_import_log`
- [ ] Vytvořit tabulku `25_smlouvy_objednavky`
- [ ] Migrace pro produkční DB

### API Smlouvy
- [ ] `POST /ciselniky/smlouvy/list`
- [ ] `POST /ciselniky/smlouvy/detail`
- [ ] `POST /ciselniky/smlouvy/insert`
- [ ] `POST /ciselniky/smlouvy/update`
- [ ] `POST /ciselniky/smlouvy/delete`
- [ ] `POST /ciselniky/smlouvy/bulk-import`
- [ ] `POST /ciselniky/smlouvy/prepocet-cerpani`

### API LP CRUD
- [ ] `POST /ciselniky/limitovane-prisliby/insert`
- [ ] `POST /ciselniky/limitovane-prisliby/update`
- [ ] `POST /ciselniky/limitovane-prisliby/delete`

### Oprávnění
- [ ] Přidat nová práva do systému
- [ ] Implementovat kontroly oprávnění v API

### Dokumentace
- [ ] API dokumentace (response formáty)
- [ ] Error handling dokumentace
- [ ] SQL migrace skripty

---

## 📋 CHECKLIST PRO FRONTEND TÝM

### API služby
- [ ] Rozšířit `apiv2Dictionaries.js` o funkce pro smlouvy
- [ ] Rozšířit o CRUD pro LP

### Komponenty
- [ ] `SmlouvyTab.js`
- [ ] `SmlouvyTable.js`
- [ ] `SmlouvaFormModal.js`
- [ ] `SmlouvyImportModal.js`
- [ ] `LimitovanePrislibyTab.js`

### Integrace
- [ ] Přidat taby do `DictionariesNew.js`
- [ ] Ikony a navigace
- [ ] Oprávnění v UI

### Import
- [ ] Excel parser (XLSX.js)
- [ ] CSV parser
- [ ] Validace dat
- [ ] Error handling

### Budoucnost (má čas)
- [ ] `useCerpaniValidation` hook
- [ ] Warning bannery v OrderForm
- [ ] Select pro smlouvy
- [ ] Zobrazení čerpání

---

## 🔗 SOUVISEJÍCÍ DOKUMENTY

1. `API-LIMITOVANE-PRISLIBY-DOKUMENTACE-V3.md` - LP API specifikace
2. `BACKEND-LP-CERPANI-IMPLEMENTATION.md` - LP čerpání implementace
3. `USER_MANAGEMENT_API_DOCUMENTATION.md` - Oprávnění v systému
4. `apiv2Dictionaries.js` - Stávající API služby pro číselníky

---

**Verze:** 1.0  
**Autor:** AI Architect  
**Schválil:** [čeká na schválení]  
**Datum poslední aktualizace:** 23. listopadu 2025
