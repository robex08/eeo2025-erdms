# Příklad DB záznamu pro uživatelská nastavení

## SQL CREATE TABLE

```sql
-- Pro MySQL 5.5.46 (limit: pouze 1 TIMESTAMP s CURRENT_TIMESTAMP)
-- KROK 1: Vytvoř tabulku bez Foreign Key
CREATE TABLE 25_uzivatel_nastaveni (
    id INT(10) AUTO_INCREMENT PRIMARY KEY,
    uzivatel_id INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
    nastaveni_data TEXT NOT NULL COMMENT 'JSON jako string',
    nastaveni_verze VARCHAR(10) DEFAULT '1.0' COMMENT 'Verze struktury nastavení',
    vytvoreno DATETIME NULL COMMENT 'Nastaveno při INSERT přes NOW()',
    upraveno TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Auto-update při změně',
    UNIQUE KEY unique_uzivatel (uzivatel_id),
    INDEX idx_uzivatel_id (uzivatel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Uživatelská nastavení aplikace - filtry, viditelnost dlaždic, export CSV';

-- KROK 2: Zkontroluj, jestli je tabulka 25_uzivatele InnoDB:
-- SHOW TABLE STATUS WHERE Name = '25_uzivatele';

-- KROK 3: Pokud je 25_uzivatele InnoDB, přidej Foreign Key:
-- ALTER TABLE 25_uzivatel_nastaveni 
--   ADD CONSTRAINT fk_uzivatel_nastaveni_uzivatel 
--   FOREIGN KEY (uzivatel_id) REFERENCES 25_uzivatele(id) ON DELETE CASCADE;
```

## Příklad záznamu pro uživatele ID 123

```sql
-- Při INSERT musíme explicitně nastavit vytvoreno pomocí NOW()
INSERT INTO 25_uzivatel_nastaveni (uzivatel_id, nastaveni_data, nastaveni_verze, vytvoreno)
VALUES (123, '{JSON níže}', '1.0', NOW());
```

## JSON struktura v poli `nastaveni_data`

```json
{
  "verze": "1.0",
  "chovani_aplikace": {
    "zapamatovat_filtry": true,
    "vychozi_sekce_po_prihlaseni": "orders",
    "vychozi_filtry_stavu_objednavek": []
  },
  "zobrazeni_dlazic": {
    "nova": true,
    "ke_schvaleni": true,
    "schvalena": true,
    "zamitnuta": true,
    "rozpracovana": true,
    "odeslana_dodavateli": true,
    "potvrzena_dodavatelem": true,
    "k_uverejneni_do_registru": true,
    "uverejnena": true,
    "ceka_na_potvrzeni": true,
    "ceka_se": true,
    "vecna_spravnost": true,
    "dokoncena": true,
    "zrusena": true,
    "smazana": true,
    "archivovano": true,
    "s_fakturou": true,
    "s_prilohami": true,
    "moje_objednavky": true
  },
  "export_csv": {
    "oddelovac": "semicolon",
    "vlastni_oddelovac": "",
    "oddelovac_seznamu": "pipe",
    "vlastni_oddelovac_seznamu": "",
    "sloupce": {
      "zakladni_identifikace": {
        "id": true,
        "cislo_objednavky": true
      },
      "predmet_a_popis": {
        "predmet": true,
        "poznamka": false
      },
      "stavy_a_workflow": {
        "stav_objednavky": true,
        "stav_workflow": false,
        "stav_komentar": false
      },
      "datumy": {
        "dt_objednavky": true,
        "dt_vytvoreni": true,
        "dt_schvaleni": false,
        "dt_odeslani": false,
        "dt_akceptace": false,
        "dt_zverejneni": false,
        "dt_predpokladany_termin_dodani": false,
        "dt_aktualizace": false
      },
      "financni_udaje": {
        "max_cena_s_dph": true,
        "celkova_cena_bez_dph": false,
        "celkova_cena_s_dph": true,
        "financovani_typ": false,
        "financovani_typ_nazev": false,
        "financovani_lp_kody": false,
        "financovani_lp_nazvy": false,
        "financovani_lp_cisla": false
      },
      "lide": {
        "objednatel": true,
        "objednatel_email": false,
        "objednatel_telefon": false,
        "garant": false,
        "garant_email": false,
        "garant_telefon": false,
        "prikazce": false,
        "schvalovatel": false,
        "vytvoril_uzivatel": false
      },
      "dodavatel": {
        "dodavatel_nazev": true,
        "dodavatel_ico": false,
        "dodavatel_dic": false,
        "dodavatel_adresa": false,
        "dodavatel_zastoupeny": false,
        "dodavatel_kontakt_jmeno": false,
        "dodavatel_kontakt_email": false,
        "dodavatel_kontakt_telefon": false
      },
      "strediska_a_struktura": {
        "strediska": true,
        "strediska_nazvy": false,
        "druh_objednavky_kod": false,
        "stav_workflow_kod": false
      },
      "polozky_objednavky": {
        "pocet_polozek": true,
        "polozky_celkova_cena_s_dph": true,
        "polozky_popis": false,
        "polozky_cena_bez_dph": false,
        "polozky_sazba_dph": false,
        "polozky_cena_s_dph": false,
        "polozky_usek_kod": false,
        "polozky_budova_kod": false,
        "polozky_mistnost_kod": false,
        "polozky_poznamka": false,
        "polozky_poznamka_umisteni": false
      },
      "prilohy": {
        "prilohy_count": false,
        "prilohy_guid": false,
        "prilohy_typ": false,
        "prilohy_nazvy": false,
        "prilohy_velikosti": false,
        "prilohy_nahrano_uzivatel": false,
        "prilohy_dt_vytvoreni": false
      },
      "faktury": {
        "faktury_count": false,
        "faktury_celkova_castka_s_dph": false,
        "faktury_cisla_vema": false,
        "faktury_castky": false,
        "faktury_datum_vystaveni": false,
        "faktury_datum_splatnosti": false,
        "faktury_datum_doruceni": false,
        "faktury_strediska": false,
        "faktury_poznamka": false,
        "faktury_pocet_priloh": false,
        "faktury_dorucena": false
      },
      "potvrzeni_a_odeslani": {
        "stav_odeslano": false,
        "potvrzeno_dodavatelem": false,
        "zpusob_potvrzeni": false,
        "zpusob_platby": false
      },
      "registr_smluv": {
        "zverejnit_registr_smluv": false,
        "registr_iddt": false
      },
      "ostatni": {
        "zaruka": false,
        "misto_dodani": false
      }
    }
  },
  "export_pokladna": {
    "format": "xlsx"
  }
}
```

## Příklady záznamů v DB

### Záznam 1 - Výchozí nastavení (všechno zapnuté)
```
id: 1
uzivatel_id: 123
nastaveni_data: {kompletní JSON výše}
nastaveni_verze: 1.0
vytvoreno: 2025-11-18 10:30:00
upraveno: 2025-11-18 10:30:00
```

### Záznam 2 - Minimalistické nastavení
```json
{
  "verze": "1.0",
  "chovani_aplikace": {
    "zapamatovat_filtry": false,
    "vychozi_sekce_po_prihlaseni": "dashboard",
    "vychozi_filtry_stavu_objednavek": ["schvalena", "rozpracovana"]
  },
  "zobrazeni_dlazic": {
    "nova": true,
    "ke_schvaleni": true,
    "schvalena": true,
    "zamitnuta": false,
    "rozpracovana": true,
    "odeslana_dodavateli": false,
    "potvrzena_dodavatelem": false,
    "k_uverejneni_do_registru": false,
    "uverejnena": false,
    "ceka_na_potvrzeni": false,
    "ceka_se": false,
    "vecna_spravnost": false,
    "dokoncena": false,
    "zrusena": false,
    "smazana": false,
    "archivovano": false,
    "s_fakturou": true,
    "s_prilohami": true,
    "moje_objednavky": true
  },
  "export_csv": {
    "oddelovac": "semicolon",
    "vlastni_oddelovac": "",
    "oddelovac_seznamu": "pipe",
    "vlastni_oddelovac_seznamu": "",
    "sloupce": {
      "zakladni_identifikace": {
        "id": true,
        "cislo_objednavky": true
      },
      "predmet_a_popis": {
        "predmet": true,
        "poznamka": true
      },
      "stavy_a_workflow": {
        "stav_objednavky": true,
        "stav_workflow": false,
        "stav_komentar": false
      },
      "datumy": {
        "dt_objednavky": true,
        "dt_vytvoreni": false,
        "dt_schvaleni": false,
        "dt_odeslani": false,
        "dt_akceptace": false,
        "dt_zverejneni": false,
        "dt_predpokladany_termin_dodani": false,
        "dt_aktualizace": false
      },
      "financni_udaje": {
        "max_cena_s_dph": true,
        "celkova_cena_bez_dph": false,
        "celkova_cena_s_dph": true,
        "financovani_typ": false,
        "financovani_typ_nazev": false,
        "financovani_lp_kody": false,
        "financovani_lp_nazvy": false,
        "financovani_lp_cisla": false
      },
      "lide": {
        "objednatel": true,
        "objednatel_email": false,
        "objednatel_telefon": false,
        "garant": false,
        "garant_email": false,
        "garant_telefon": false,
        "prikazce": false,
        "schvalovatel": false,
        "vytvoril_uzivatel": false
      },
      "dodavatel": {
        "dodavatel_nazev": true,
        "dodavatel_ico": false,
        "dodavatel_dic": false,
        "dodavatel_adresa": false,
        "dodavatel_zastoupeny": false,
        "dodavatel_kontakt_jmeno": false,
        "dodavatel_kontakt_email": false,
        "dodavatel_kontakt_telefon": false
      },
      "strediska_a_struktura": {
        "strediska": true,
        "strediska_nazvy": false,
        "druh_objednavky_kod": false,
        "stav_workflow_kod": false
      },
      "polozky_objednavky": {
        "pocet_polozek": true,
        "polozky_celkova_cena_s_dph": true,
        "polozky_popis": false,
        "polozky_cena_bez_dph": false,
        "polozky_sazba_dph": false,
        "polozky_cena_s_dph": false,
        "polozky_usek_kod": false,
        "polozky_budova_kod": false,
        "polozky_mistnost_kod": false,
        "polozky_poznamka": false,
        "polozky_poznamka_umisteni": false
      },
      "prilohy": {
        "prilohy_count": false,
        "prilohy_guid": false,
        "prilohy_typ": false,
        "prilohy_nazvy": false,
        "prilohy_velikosti": false,
        "prilohy_nahrano_uzivatel": false,
        "prilohy_dt_vytvoreni": false
      },
      "faktury": {
        "faktury_count": false,
        "faktury_celkova_castka_s_dph": false,
        "faktury_cisla_vema": false,
        "faktury_castky": false,
        "faktury_datum_vystaveni": false,
        "faktury_datum_splatnosti": false,
        "faktury_datum_doruceni": false,
        "faktury_strediska": false,
        "faktury_poznamka": false,
        "faktury_pocet_priloh": false,
        "faktury_dorucena": false
      },
      "potvrzeni_a_odeslani": {
        "stav_odeslano": false,
        "potvrzeno_dodavatelem": false,
        "zpusob_potvrzeni": false,
        "zpusob_platby": false
      },
      "registr_smluv": {
        "zverejnit_registr_smluv": false,
        "registr_iddt": false
      },
      "ostatni": {
        "zaruka": false,
        "misto_dodani": false
      }
    }
  },
  "export_pokladna": {
    "format": "xlsx"
  }
}
```

## Backend PHP - Příklad načtení a uložení

### Načtení nastavení
```php
<?php
function nactiUzivatelNastaveni($pdo, $uzivatel_id) {
    $stmt = $pdo->prepare("
        SELECT nastaveni_data, nastaveni_verze, upraveno 
        FROM 25_uzivatel_nastaveni 
        WHERE uzivatel_id = ?
    ");
    $stmt->execute([$uzivatel_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($row) {
        return [
            'nastaveni' => json_decode($row['nastaveni_data'], true),
            'verze' => $row['nastaveni_verze'],
            'upraveno' => $row['upraveno']
        ];
    }
    
    // Vrátit výchozí nastavení, pokud záznam neexistuje
    return [
        'nastaveni' => getVychoziNastaveni(),
        'verze' => '1.0',
        'upraveno' => null
    ];
}

function getVychoziNastaveni() {
    return [
        'verze' => '1.0',
        'chovani_aplikace' => [
            'zapamatovat_filtry' => true,
            'vychozi_sekce_po_prihlaseni' => 'orders',
            'vychozi_filtry_stavu_objednavek' => []
        ],
        'zobrazeni_dlazic' => [
            'nova' => true,
            'ke_schvaleni' => true,
            'schvalena' => true,
            // ... všechny ostatní
        ],
        'export_csv' => [
            'oddelovac' => 'semicolon',
            'vlastni_oddelovac' => '',
            'oddelovac_seznamu' => 'pipe',
            'vlastni_oddelovac_seznamu' => '',
            'sloupce' => [/* ... */]
        ],
        'export_pokladna' => [
            'format' => 'xlsx'
        ]
    ];
}
?>
```

### Uložení nastavení
```php
<?php
function ulozUzivatelNastaveni($pdo, $uzivatel_id, $nastaveni_data) {
    // Validace JSON
    $json = json_encode($nastaveni_data, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new Exception('Chyba při serializaci JSON: ' . json_last_error_msg());
    }
    
    // INSERT ... ON DUPLICATE KEY UPDATE
    // Pro MySQL 5.5.46: vytvoreno musí být explicitně nastaveno přes NOW()
    $stmt = $pdo->prepare("
        INSERT INTO 25_uzivatel_nastaveni 
            (uzivatel_id, nastaveni_data, nastaveni_verze, vytvoreno) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            nastaveni_data = VALUES(nastaveni_data),
            nastaveni_verze = VALUES(nastaveni_verze)
    ");
    
    $verze = $nastaveni_data['verze'] ?? '1.0';
    return $stmt->execute([$uzivatel_id, $json, $verze]);
}
?>
```

### API Endpoint
```php
<?php
// api-uzivatel-nastaveni.php

require_once 'db.php';
require_once 'auth.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$uzivatel_id = getCurrentUserId(); // Z session/token

try {
    if ($method === 'GET') {
        // Načíst nastavení
        $nastaveni = nactiUzivatelNastaveni($pdo, $uzivatel_id);
        echo json_encode([
            'success' => true,
            'data' => $nastaveni
        ], JSON_UNESCAPED_UNICODE);
        
    } elseif ($method === 'POST' || $method === 'PUT') {
        // Uložit nastavení
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['nastaveni'])) {
            throw new Exception('Neplatná data');
        }
        
        ulozUzivatelNastaveni($pdo, $uzivatel_id, $input['nastaveni']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Nastavení bylo úspěšně uloženo'
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
```

## Výhody tohoto řešení

✅ **Flexibilita** - Lze přidávat nové sekce bez změny DB struktury  
✅ **Verzování** - Sloupec `nastaveni_verze` umožňuje migraci dat  
✅ **Zpětná kompatibilita** - Frontend ignoruje neznámá pole, backend doplní chybějící  
✅ **Přehlednost** - Logické seskupení nastavení do sekcí  
✅ **Jednoduchost** - Pouze 1 SELECT/UPDATE pro všechna nastavení  
✅ **MySQL 5.5 kompatibilní** - Používá TEXT místo JSON typu

## Frontend React - Načtení z API

```javascript
// Načíst nastavení z backendu místo localStorage
const loadUserSettingsFromAPI = async () => {
  try {
    const response = await fetch('/api/api-uzivatel-nastaveni.php', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data?.nastaveni) {
      setUserSettings(prev => ({ 
        ...prev, 
        ...transformBackendToFrontend(result.data.nastaveni) 
      }));
    }
  } catch (error) {
    console.error('Chyba při načítání nastavení:', error);
  }
};

// Transformace z backend JSON struktury do frontend userSettings
const transformBackendToFrontend = (backendData) => {
  return {
    // Chování aplikace
    rememberFilters: backendData.chovani_aplikace?.zapamatovat_filtry ?? true,
    defaultMenuTab: backendData.chovani_aplikace?.vychozi_sekce_po_prihlaseni ?? 'orders',
    defaultOrderStatus: backendData.chovani_aplikace?.vychozi_filtry_stavu_objednavek ?? [],
    
    // Viditelnost dlaždic
    visibleTiles: backendData.zobrazeni_dlazic ?? {},
    
    // Export CSV
    exportCsvDelimiter: backendData.export_csv?.oddelovac ?? 'semicolon',
    exportCsvCustomDelimiter: backendData.export_csv?.vlastni_oddelovac ?? '',
    exportCsvListDelimiter: backendData.export_csv?.oddelovac_seznamu ?? 'pipe',
    exportCsvListCustomDelimiter: backendData.export_csv?.vlastni_oddelovac_seznamu ?? '',
    exportCsvColumns: flattenCsvColumns(backendData.export_csv?.sloupce ?? {}),
    
    // Export pokladna
    exportCashbookFormat: backendData.export_pokladna?.format ?? 'xlsx'
  };
};

// Převést vnořené sloupce na ploché
const flattenCsvColumns = (nestedColumns) => {
  const flat = {};
  Object.values(nestedColumns).forEach(section => {
    Object.assign(flat, section);
  });
  return flat;
};

// Transformace z frontend userSettings do backend JSON struktury
const transformFrontendToBackend = (userSettings) => {
  return {
    verze: '1.0',
    chovani_aplikace: {
      zapamatovat_filtry: userSettings.rememberFilters,
      vychozi_sekce_po_prihlaseni: userSettings.defaultMenuTab,
      vychozi_filtry_stavu_objednavek: userSettings.defaultOrderStatus
    },
    zobrazeni_dlazic: userSettings.visibleTiles,
    export_csv: {
      oddelovac: userSettings.exportCsvDelimiter,
      vlastni_oddelovac: userSettings.exportCsvCustomDelimiter,
      oddelovac_seznamu: userSettings.exportCsvListDelimiter,
      vlastni_oddelovac_seznamu: userSettings.exportCsvListCustomDelimiter,
      sloupce: groupCsvColumns(userSettings.exportCsvColumns)
    },
    export_pokladna: {
      format: userSettings.exportCashbookFormat
    }
  };
};

// Seskupit sloupce do kategorií
const groupCsvColumns = (flatColumns) => {
  return {
    zakladni_identifikace: {
      id: flatColumns.id,
      cislo_objednavky: flatColumns.cislo_objednavky
    },
    predmet_a_popis: {
      predmet: flatColumns.predmet,
      poznamka: flatColumns.poznamka
    },
    // ... další kategorie
  };
};

// Uložit nastavení na backend
const saveUserSettingsToAPI = async () => {
  try {
    const backendData = transformFrontendToBackend(userSettings);
    
    const response = await fetch('/api/api-uzivatel-nastaveni.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nastaveni: backendData })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('Nastavení bylo úspěšně uloženo', 'success');
    } else {
      throw new Error(result.error || 'Neznámá chyba');
    }
  } catch (error) {
    console.error('Chyba při ukládání nastavení:', error);
    showToast('Chyba při ukládání nastavení: ' + error.message, 'error');
  }
};
```

## Migrace ze současného localStorage do DB

```javascript
// Jednorázová migrace při přihlášení
const migrateLocalStorageToDB = async () => {
  try {
    const localSettings = localStorage.getItem('user_settings');
    if (!localSettings) return;
    
    const parsed = JSON.parse(localSettings);
    const backendData = transformFrontendToBackend(parsed);
    
    await fetch('/api/api-uzivatel-nastaveni.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nastaveni: backendData })
    });
    
    // Po úspěšné migraci smazat localStorage
    localStorage.removeItem('user_settings');
    console.log('Nastavení úspěšně migrováno z localStorage do DB');
    
  } catch (error) {
    console.error('Chyba při migraci nastavení:', error);
  }
};
```
