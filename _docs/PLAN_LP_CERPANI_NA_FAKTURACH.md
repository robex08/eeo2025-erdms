# PLÁN: Přiřazení skutečného čerpání LP na položky faktur

**Datum vytvoření:** 29. prosince 2025  
**Autor:** AI Architect (na základě požadavku)  
**Verze:** 1.0  
**Status:** 📋 NÁVRH K DISKUSI

---

## 🎯 CÍLE A MOTIVACE

### Problém
U objednávek financovaných z **LP (limitovaných příslibů)** máme:
- ✅ **PLÁNOVANÉ ČERPÁNÍ** na úrovni **položek objednávky** (pole `lp_id` v tabulce `25a_objednavky_polozky`)
- ✅ **Systém pro přepočet čerpání LP** (tabulka `25_limitovane_prisliby_cerpani`, stored procedures)
- ❌ **CHYBÍ: Možnost přiřadit SKUTEČNÉ ČERPÁNÍ na úrovni faktur**

### Co potřebujeme
Když přijde faktura k objednávce financované z LP, uživatel musí mít možnost:
1. **Rozdělit částku faktury** mezi jednotlivé LP kódy
2. **Uvést skutečnou výši čerpání** z každého LP kódu
3. Toto provést **při kontrole věcné správnosti faktury**
4. Data využít v **systému přepočtu čerpání LP**

---

## 📊 ANALÝZA SOUČASNÉHO STAVU

### 1. Databázová struktura

#### Tabulka: `25a_objednavky` (hlavní objednávka)
```sql
financovani TEXT  -- JSON: {"typ":"LP","lp_kody":["6","7"]}
```

**Příklad dat:**
```json
{
  "typ": "LP",
  "lp_kody": ["6", "7"]   // Může být více LP kódů!
}
```

#### Tabulka: `25a_objednavky_polozky` (položky objednávky)
```sql
lp_id INT(11)  -- FK → 25_limitovane_prisliby.id
cena_s_dph DECIMAL(15,2)
```

- ✅ Každá položka má přiřazený konkrétní LP kód
- ✅ Toto je **PLÁNOVANÉ ČERPÁNÍ**

#### Tabulka: `25a_objednavky_faktury` (faktury)
```sql
id INT(10) AUTO_INCREMENT PRIMARY KEY
objednavka_id INT(10)  -- FK → 25a_objednavky
fa_castka DECIMAL(15,2)  -- Celková částka faktury
stav ENUM(...)
vecna_spravnost_potvrzeno TINYINT(1)
dt_potvrzeni_vecne_spravnosti DATETIME
potvrdil_vecnou_spravnost_id INT(11)
```

- ❌ **Neexistuje** způsob jak rozdělit `fa_castka` mezi LP kódy
- ❌ **Není** vazba na konkrétní LP

#### Tabulka: `25_limitovane_prisliby_cerpani` (agregace čerpání)
```sql
cislo_lp VARCHAR(50)
skutecne_cerpano DECIMAL(15,2)  -- Mělo by zahrnovat faktury!
cerpano_pokladna DECIMAL(15,2)
```

- ✅ Připraveno na **skutečné čerpání**
- ❌ Ale **zatím se nepočítá z faktur**

---

### 2. Stávající flow

```
┌─────────────────────────────────────────────────────────────┐
│ OBJEDNÁVKA (schváleno)                                      │
│ financovani: {"typ":"LP","lp_kody":["6","7"]}              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─► Položka 1: lp_id=6, cena=50 000 Kč  ← PLÁNOVANÉ ČERPÁNÍ
                       └─► Položka 2: lp_id=7, cena=30 000 Kč
                       
┌─────────────────────────────────────────────────────────────┐
│ FAKTURA přijde                                              │
│ fa_castka: 75 000 Kč                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       └─► ❌ PROBLÉM: Nemáme jak rozdělit
                           75 000 Kč mezi LP-6 a LP-7!
```

---

### 3. Vzor: Pokladna - Rozložení čerpání

V pokladně (`CashBookPage.js`) již máme podobný mechanismus:
- Uživatel zadá položku v pokladně
- Může přiřadit **stredisko** a **LP kód**
- Při uložení se data zapíší do tabulky `25a_pokladna_zaznamy`

**Relevantní struktura:**
```sql
-- Tabulka: 25a_pokladna_zaznamy
castka DECIMAL(15,2)
limitovany_prislib VARCHAR(50)  -- Číslo LP
strediska_kod TEXT  -- JSON array středisek
```

---

## 🔄 SROVNÁNÍ: LP vs SMLOUVY

### Čerpání u SMLUV (již implementováno)

**Tabulka:** `25a_objednavky_faktury`
```sql
smlouva_id INT(10) UNSIGNED NULL  -- Přímá vazba na smlouvu
objednavka_id INT(10) NULL         -- Nebo vazba přes objednávku
```

**Charakteristika:**
- ✅ **Jedna faktura = celá částka** jde na jednu smlouvu
- ✅ Není třeba dělení částky faktury
- ✅ V tabulce `25_smlouvy` se počítá: `cerpano_skutecne = SUM(fa_castka)`
- ✅ Stored procedure: `sp_prepocet_cerpani_smluv`

### Čerpání u LP (náš návrh)

**Charakteristika:**
- ✅ **Jedna faktura = dělení mezi více LP kódů**
- ✅ Musíme evidovat, kolik z faktury jde na LP-6, kolik na LP-7 atd.
- ✅ V tabulce `25_limitovane_prisliby_cerpani`: `skutecne_cerpano = SUM(castka z faktur)`
- ⚠️ **POUZE pro objednávky s LP financováním** (NE pro smlouvy!)

### ⚠️ KLÍČOVÝ ROZDÍL

| Vlastnost | SMLOUVY | LP |
|-----------|---------|-----|
| **Dělení faktury** | ❌ NE | ✅ ANO |
| **Vazba v DB** | `faktury.smlouva_id` | `faktury_lp_cerpani.lp_cislo` |
| **Více faktur na obj.** | ✅ Součet všech | ✅ Součet všech (každá může dělit LP jinak) |
| **Přepočet** | `sp_prepocet_cerpani_smluv` | `prepocetCerpaniPodleCislaLP` |

### 🔍 Není kolize!

Naše řešení pro LP **nekoliduje** se smlouvami, protože:
1. LP používá **novou tabulku** `25a_faktury_lp_cerpani`
2. Smlouvy používají **přímý sloupec** `25a_objednavky_faktury.smlouva_id`
3. Různé stored procedures pro přepočet
4. **DŮLEŽITÉ PRAVIDLO:** LP čerpání se týká **POUZE faktur na objednávky**
   - Faktura s `objednavka_id` + objednávka má `financovani.typ="LP"` → LP čerpání
   - Faktura s `smlouva_id` (bez objednávky) → NEMÁ LP čerpání
   - LP se nikdy neslučuje s jinými typy financování!

---

## 🏗️ NÁVRH ŘEŠENÍ

### Varianta A: **Nová tabulka** (DOPORUČENO ✅)

#### Důvody pro novou tabulku:
1. **Čistá separace** - faktury mají vlastní čerpání nezávislé na položkách
2. **Flexibilita** - jedna faktura může čerpat z více LP než původní plán
3. **Audit trail** - přesná evidence kdo, kdy, jakou částku přiřadil
4. **Snadné queries** - přímé JOINy bez parsování JSON
5. **Přepočet LP** - jednoduchá integrace do stored procedures

#### Nová tabulka: `25a_faktury_lp_cerpani`

```sql
CREATE TABLE `25a_faktury_lp_cerpani` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `faktura_id` INT(10) NOT NULL COMMENT 'FK → 25a_objednavky_faktury',
  `lp_cislo` VARCHAR(50) NOT NULL COMMENT 'Číslo LP (např. "6", "7")',
  `lp_id` INT(11) NULL COMMENT 'FK → 25_limitovane_prisliby (pro referenci)',
  `castka` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Částka čerpaná z tohoto LP',
  
  -- Audit trail
  `vytvoril_uzivatel_id` INT(10) UNSIGNED NOT NULL,
  `dt_vytvoreni` DATETIME NOT NULL,
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL,
  `dt_aktualizace` DATETIME NULL,
  
  PRIMARY KEY (`id`),
  KEY `idx_faktura_id` (`faktura_id`),
  KEY `idx_lp_cislo` (`lp_cislo`),
  KEY `idx_lp_id` (`lp_id`),
  
  CONSTRAINT `fk_faktury_lp_faktura` 
    FOREIGN KEY (`faktura_id`) 
    REFERENCES `25a_objednavky_faktury` (`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_faktury_lp_prislib` 
    FOREIGN KEY (`lp_id`) 
    REFERENCES `25_limitovane_prisliby` (`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Příklad dat:**
```
faktura_id | lp_cislo | castka     | dt_vytvoreni        | vytvoril_uzivatel_id
-----------|----------|------------|---------------------|---------------------
7          | 2        | 39480.00   | 2025-12-29 10:30:00 | 123
8          | 6        | 20000.00   | 2025-12-29 11:15:00 | 124
8          | 2        | 19480.00   | 2025-12-29 11:15:00 | 124
```

#### Validace a integrita
```sql
-- Constraint: Součet čerpání musí být ≤ fa_castka
-- (kontrola v aplikační logice)

-- Trigger pro audit aktualizace (volitelně)
DELIMITER $$
CREATE TRIGGER `trg_faktury_lp_before_update`
BEFORE UPDATE ON `25a_faktury_lp_cerpani`
FOR EACH ROW
BEGIN
  SET NEW.aktualizoval_uzivatel_id = @current_user_id;
  SET NEW.dt_aktualizace = NOW();
END$$
DELIMITER ;
```

---

### Varianta B: JSON sloupec ve faktuře (NEDOPORUČENO ❌)

#### Možná implementace:
```sql
ALTER TABLE `25a_objednavky_faktury` 
ADD COLUMN `lp_rozdeleni` TEXT NULL 
COMMENT 'JSON: Rozložení čerpání LP';
```

**Příklad JSON:**
```json
{
  "lp_cerpani": [
    {"lp_cislo": "6", "lp_id": 6, "castka": 50000.00},
    {"lp_cislo": "7", "lp_id": 7, "castka": 25000.00}
  ],
  "dt_vytvoreni": "2025-12-29T10:30:00",
  "vytvoril_uzivatel_id": 123
}
```

#### Důvody PROTI:
1. ❌ **Složitější queries** - nutnost parsovat JSON v SQL
2. ❌ **Horší performance** - nelze indexovat
3. ❌ **Problematická validace** - suma v JSON vs fa_castka
4. ❌ **Obtížná integrace** - stored procedures by musely parsovat JSON
5. ❌ **Audit trail** - změny JSON se těžko sledují
6. ❌ **MySQL 5.5 limity** - omezené JSON funkce

---

## 🎨 FRONTEND UX/UI NÁVRH

### Umístění: Kontrola věcné správnosti faktury

#### Místo 1: InvoiceEvidencePage.js (PRIMÁRNÍ ✅)
- Při vytváření/editaci faktury
- Sekce "Rozložení LP čerpání"
- Viditelná pouze když: `financovani.typ === "LP"`

#### Místo 2: Invoices25List.js (SEKUNDÁRNÍ)
- Detail faktury v modalu
- Tlačítko "Upravit LP čerpání"
- Pro rychlé opravy

---

### UI Komponenta: LP Čerpání Editor

**Inspirace:** Podobné jako položky v pokladně nebo rozložení středisek.

```jsx
// Pseudo-kód komponenty
<LPCerpaniEditor>
  <Header>
    <Icon>💰</Icon>
    <Title>Rozložení čerpání LP</Title>
    <HelpText>
      Rozdělte částku faktury mezi LP kódy z financování objednávky
    </HelpText>
  </Header>
  
  {/* Info o faktuře */}
  <InfoPanel>
    <Row>
      <Label>Celková částka faktury:</Label>
      <Value>{formatCurrency(faktura.fa_castka)}</Value>
    </Row>
    <Row>
      <Label>Dostupné LP kódy z objednávky:</Label>
      <Tags>{financovani.lp_kody.map(kod => <Tag>{kod}</Tag>)}</Tags>
    </Row>
    {financovani.lp_kody.length === 1 && (
      <Alert type="info">
        ℹ️ Objednávka má pouze jeden LP kód ({financovani.lp_kody[0]}). 
        Částka faktury bude automaticky přiřazena na tento kód.
      </Alert>
    )}
  </InfoPanel>
  
  {/* Řádky pro rozložení */}
  <CerpaniRows>
    {lpCerpani.map((row, index) => (
      <Row key={index}>
        <Select
          label="LP kód"
          value={row.lp_cislo}
          options={financovani.lp_kody}
          onChange={(val) => updateRow(index, 'lp_cislo', val)}
        />
        
        <CurrencyInput
          label="Částka"
          value={row.castka}
          onChange={(val) => updateRow(index, 'castka', val)}
          max={zbyvajiciCastka}
        />
        
        <Button 
          onClick={() => removeRow(index)}
          disabled={lpCerpani.length === 1}
        >
          <Icon>🗑️</Icon>
        </Button>
      </Row>
    ))}
    
    <Button onClick={addRow}>
      <Icon>➕</Icon> Přidat další LP
    </Button>
  </CerpaniRows>
  
  {/* Validace a informace */}
  <ValidationPanel>
    <Row>
      <Label>Celková částka faktury:</Label>
      <Value>{formatCurrency(faktura.fa_castka)}</Value>
    </Row>
    <Row>
      <Label>Přiřazeno na LP:</Label>
      <Value highlight={totalAssigned > faktura.fa_castka}>
        {formatCurrency(totalAssigned)}
      </Value>
    </Row>
    
    {/* ℹ️ Jen informace, bez varování */}
    {totalAssigned < faktura.fa_castka && totalAssigned > 0 && (
      <InfoMessage>
        ℹ️ Přiřadili jste {formatCurrency(totalAssigned)} z {formatCurrency(faktura.fa_castka)}. 
        Rozdělení částky je na vaší odpovědnosti.
      </InfoMessage>
    )}
    
    {/* ⚠️ Pouze kritické chyby (překročení) */}
    {errors.filter(e => e.level === 'error').map(error => (
      <ErrorMessage key={error.code}>
        {error.message}
      </ErrorMessage>
    ))}
  </ValidationPanel>
  
  {/* Potvrzení */}
  <Checkbox
    label="Potvrzuji správnost rozložení LP čerpání"
    checked={potvrzeno}
    onChange={setPotvrzeno}
    required
  />
</LPCerpaniEditor>
```

---

### Validační pravidla

```javascript
const validateLPCerpani = (lpCerpani, faktura, financovani) => {
  const errors = [];
  
  // 1. Součet musí být ≤ fa_castka
  const total = lpCerpani.reduce((sum, row) => sum + parseFloat(row.castka || 0), 0);
  if (total > faktura.fa_castka) {
    errors.push({
      code: 'SUM_EXCEEDS',
      message: `Součet přiřazených částek (${total} Kč) překračuje částku faktury (${faktura.fa_castka} Kč)`
    });
  }
  
  // 2. ⚠️ DŮLEŽITÉ: Součet NEMUSÍ být = fa_castka!
  //    Důvod: 
  //    - Na objednávku může přijít VÍCE faktur (jedna teď, další za měsíc)
  //    - Faktura může být v danou chvíli jediná, ale další teprve přijde
  //    - Je to na ODPOVĚDNOSTI ZAMĚSTNANCE, jak rozdělí čerpání
  //
  // Proto jen INFORMATIVNÍ zpráva bez jakéhokoliv tlaku nebo varování:
  if (total < faktura.fa_castka && total > 0) {
    errors.push({
      code: 'SUM_INFO',
      level: 'info',
      message: `Přiřadili jste ${total.toLocaleString('cs-CZ')} Kč z ${faktura.fa_castka.toLocaleString('cs-CZ')} Kč faktury.`
    });
  }
  
  // 2b. ⚠️ POVINNOST: Pokud je objednávka financována z LP, MUSÍ být vyplněno!
  if (total === 0 && financovani?.typ === 'LP') {
    errors.push({
      code: 'SUM_ZERO',
      level: 'error',  // CHYBA, ne warning!
      message: `Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód a částku.`
    });
  }
  
  // 2c. Kontrola: Pouze objednávky s LP, NE smlouvy!
  if (financovani?.typ !== 'LP') {
    errors.push({
      code: 'NOT_LP_FINANCING',
      level: 'error',
      message: `LP čerpání lze použít pouze u objednávek financovaných z LP.`
    });
  }
  
  // 3. Všechny LP kódy musí existovat ve financování
  const allowedLP = financovani.lp_kody || [];
  lpCerpani.forEach((row, index) => {
    if (!allowedLP.includes(row.lp_cislo)) {
      errors.push({
        code: 'INVALID_LP',
        message: `Řádek ${index + 1}: LP kód "${row.lp_cislo}" není v seznamu LP pro tuto objednávku`
      });
    }
  });
  
  // 4. Duplicitní LP kódy
  const lpCounts = {};
  lpCerpani.forEach(row => {
    lpCounts[row.lp_cislo] = (lpCounts[row.lp_cislo] || 0) + 1;
  });
  Object.entries(lpCounts).forEach(([lp, count]) => {
    if (count > 1) {
      errors.push({
        code: 'DUPLICATE_LP',
        level: 'warning',
        message: `LP kód "${lp}" je použit ${count}x. Můžete sloučit do jednoho řádku.`
      });
    }
  });
  
  // 5. Prázdné řádky
  lpCerpani.forEach((row, index) => {
    if (!row.lp_cislo || !row.castka || row.castka <= 0) {
      errors.push({
        code: 'EMPTY_ROW',
        message: `Řádek ${index + 1}: Vyplňte LP kód a částku`
      });
    }
  });
  
  return errors;
};
```

---

### Integrace do workflow

```javascript
// V InvoiceEvidencePage.js

const [lpCerpani, setLpCerpani] = useState([]);
const [lpCerpaniPotvrzeno, setLpCerpaniPotvrzeno] = useState(false);

// Načíst existující LP čerpání při otevření faktury
useEffect(() => {
  if (fakturaId && financovani?.typ === 'LP') {
    loadLPCerpani(fakturaId).then(existingData => {
      // Automatické předvyplnění pro JEDEN LP kód
      if (!existingData || existingData.length === 0) {
        if (financovani.lp_kody?.length === 1) {
          // Jeden LP → automaticky přiřadit celou částku
          setLpCerpani([{
            lp_cislo: financovani.lp_kody[0],
            lp_id: null, // doplní se z API
            castka: formData.fa_castka
          }]);
          setLpCerpaniPotvrzeno(false); // User musí potvrdit
        }
      }
    });
  }
}, [fakturaId, financovani, formData.fa_castka]);

// Uložit LP čerpání spolu s fakturou
const handleSaveInvoice = async () => {
  // ⚠️ POVINNOST: Pokud je LP financování, MUSÍ být vyplněno!
  if (financovani?.typ === 'LP' && lpCerpani.length === 0) {
    showToast('error', 'Objednávka je financována z LP. Musíte přiřadit LP čerpání!');
    return;
  }
  
  // Validace
  const errors = validateLPCerpani(lpCerpani, formData, financovani);
  if (errors.filter(e => e.level !== 'warning' && e.level !== 'info').length > 0) {
    showToast('error', 'Opravte chyby v rozložení LP čerpání');
    return;
  }
  
  // Uložit fakturu
  const savedInvoice = await updateInvoiceV2({ ...formData });
  
  // Uložit LP čerpání
  if (financovani?.typ === 'LP' && lpCerpani.length > 0) {
    await saveLPCerpaniForInvoice(savedInvoice.id, lpCerpani);
    
    // Spustit přepočet LP čerpání
    await triggerLPRecalculation(financovani.lp_kody);
  }
  
  showToast('success', 'Faktura a LP čerpání uloženo');
};
```

---

## 🔧 BACKEND API

### 1. Nové endpointy

#### `POST /api/faktury/lp-cerpani/save`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "faktura_id": 7,
  "lp_cerpani": [
    {
      "lp_cislo": "6",
      "lp_id": 6,
      "castka": 50000.00
    },
    {
      "lp_cislo": "7",
      "lp_id": 7,
      "castka": 25000.00
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "LP čerpání uloženo",
  "data": {
    "faktura_id": 7,
    "pocet_zaznamu": 2,
    "celkem_prirazeno": 75000.00
  }
}
```

**PHP Implementace:**
```php
<?php
function handle_faktury_lp_cerpani_save($input, $config) {
    // 1. Validace
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }
    
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $faktura_id = (int)($input['faktura_id'] ?? 0);
    $lp_cerpani = $input['lp_cerpani'] ?? [];
    
    if (!$token || !$username || !$faktura_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí povinné parametry']);
        return;
    }
    
    // 2. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }
    
    $user_id = $token_data['user_id'];
    
    try {
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        
        // 3. Načíst fakturu pro validaci
        $stmt = $db->prepare("
            SELECT f.*, o.financovani 
            FROM " . TBL_FAKTURY . " f
            JOIN " . TBL_OBJEDNAVKY . " o ON f.objednavka_id = o.id
            WHERE f.id = ?
        ");
        $stmt->execute([$faktura_id]);
        $faktura = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$faktura) {
            throw new Exception('Faktura nenalezena');
        }
        
        // 4. Kontrola: Faktura MUSÍ mít objednavka_id
        if (!$faktura['objednavka_id']) {
            throw new Exception('LP čerpání lze použít pouze u faktur na objednávky');
        }
        
        // 5. Parsovat financování objednávky
        $financovani = json_decode($faktura['financovani'], true);
        if (!$financovani || $financovani['typ'] !== 'LP') {
            throw new Exception('Objednávka není financována z LP');
        }
        
        // 6. Kontrola: LP se neslučuje s jinými typy financování
        // (toto by mělo být ošetřeno již při vytváření objednávky)
        
        // 7. Validace součtu
        // ⚠️ DŮLEŽITÉ: Součet NEMUSÍ být = fa_castka
        //    Důvod:
        //    - Faktura může být první z více (další přijde za měsíc)
        //    - User má PLNOU SVOBODU v rozdělení
        //    - Je to na ODPOVĚDNOSTI zaměstnance
        $suma = array_reduce($lp_cerpani, function($carry, $item) {
            return $carry + (float)$item['castka'];
        }, 0);
        
        // JEDINÁ kontrola: součet NESMÍ překročit fa_castka
        if ($suma > $faktura['fa_castka']) {
            throw new Exception('Součet LP čerpání (' . number_format($suma, 2) . ' Kč) překračuje částku faktury (' . number_format($faktura['fa_castka'], 2) . ' Kč)');
        }
        
        // Pokud je součet menší, je to OK!
        // Žádné varování, žádný log, jen pokračujeme dál
        
        // 8. Začít transakci
        $db->beginTransaction();
        
        // 9. Smazat existující záznamy
        $stmt = $db->prepare("DELETE FROM 25a_faktury_lp_cerpani WHERE faktura_id = ?");
        $stmt->execute([$faktura_id]);
        
        // 10. Vložit nové záznamy
        $stmt = $db->prepare("
            INSERT INTO 25a_faktury_lp_cerpani 
            (faktura_id, lp_cislo, lp_id, castka, vytvoril_uzivatel_id, dt_vytvoreni)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        $pocet_zaznamu = 0;
        foreach ($lp_cerpani as $item) {
            $stmt->execute([
                $faktura_id,
                $item['lp_cislo'],
                $item['lp_id'] ?? null,
                $item['castka'],
                $user_id
            ]);
            $pocet_zaznamu++;
        }
        
        $db->commit();
        
        // 11. Spustit přepočet LP (asynchronně nebo synchronně)
        require_once __DIR__ . '/limitovanePrislibyCerpaniHandlers.php';
        foreach ($lp_cerpani as $item) {
            prepocetCerpaniPodleCislaLP($db, $item['lp_cislo']);
        }
        
        // 12. Úspěch
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'LP čerpání uloženo',
            'data' => [
                'faktura_id' => $faktura_id,
                'pocet_zaznamu' => $pocet_zaznamu,
                'celkem_prirazeno' => $suma
            ]
        ]);
        
    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při ukládání: ' . $e->getMessage()
        ]);
    }
}
```

---

#### `POST /api/faktury/lp-cerpani/get`

**Request:**
```json
{
  "username": "admin",
  "token": "xyz...",
  "faktura_id": 7
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "faktura_id": 7,
    "fa_castka": 75000.00,
    "lp_cerpani": [
      {
        "id": 123,
        "lp_cislo": "6",
        "lp_id": 6,
        "lp_nazev": "LPIT - Informační technologie",
        "castka": 50000.00,
        "vytvoril_jmeno": "Jan Novák",
        "dt_vytvoreni": "2025-12-29T10:30:00"
      },
      {
        "id": 124,
        "lp_cislo": "7",
        "lp_id": 7,
        "lp_nazev": "LPMED - Zdravotnická technika",
        "castka": 25000.00,
        "vytvoril_jmeno": "Jan Novák",
        "dt_vytvoreni": "2025-12-29T10:30:00"
      }
    ],
    "suma_celkem": 75000.00,
    "zbytecek": 0.00
  }
}
```
prepocetCerpaniPodleCislaLP() v limitovanePrislibyCerpaniHandlers.php
-- Přidat dotaz na faktury s LP čerpáním

-- NOVÝ SELECT pro skutečné čerpání z faktur:
-- ⚠️ POZNÁMKA: Součet může být MENŠÍ než fa_castka (částečné přiřazení)
SELECT 
    lpc.lp_cislo,
    SUM(lpc.castka) as cerpano_z_faktur
FROM 25a_faktury_lp_cerpani lpc
JOIN 25a_objednavky_faktury f ON lpc.faktura_id = f.id
WHERE f.stav != 'STORNO'  -- ⚠️ POČÍTAT VŠECHNY faktury kromě stornovaných!
    AND f.aktivni = 1
    AND lpc.lp_cislo = @lp_cislo
GROUP BY lpc.lp_cislo;

-- DŮLEŽITÉ: Počítáme všechny stavy kromě STORNO
-- Včetně: ZAEVIDOVANA, VECNA_SPRAVNOST, V_RESENI, K_ZAPLACENI, ZAPLACENO
-- Protože LP čerpání se eviduje již při věcné správnosti

-- UPDATE: Přičíst k sloupci skutecne_cerpano
UPDATE 25_limitovane_prisliby_cerpani
SET skutecne_cerpano = @cerpano_z_faktur  -- Celkový součet
WHERE cislo_lp = @lp_cislo;

-- DODATEČNÁ KONTROLA (volitelné):
-- Zkontrolovat, že součet LP čerpání ≤ součet fa_castka
SELECT 
    f.id as faktura_id,
    f.fa_castka,
    COALESCE(SUM(lpc.castka), 0) as prirazeno,
    (f.fa_castka - COALESCE(SUM(lpc.castka), 0)) as neprirazeno
FROM 25a_objednavky_faktury f
LEFT JOIN 25a_faktury_lp_cerpani lpc ON f.id = lpc.faktura_id
WHERE f.aktivni = 1
GROUP BY f.id, f.fa_castka
HAVING neprirazeno < 0;  -- Chyba: přiřazeno více než fa_castka!
```

### 3. Trigger pro kontrolu integrity (volitelné)

```sql
-- Zabránit vložení LP čerpání, které by překročilo fa_castka
DELIMITER $$
CREATE TRIGGER `trg_faktury_lp_check_suma`
BEFORE INSERT ON `25a_faktury_lp_cerpani`
FOR EACH ROW
BEGIN
    DECLARE current_suma DECIMAL(15,2);
    DECLARE fa_castka DECIMAL(15,2);
    
    -- Získat fa_castka faktury
    SELECT f.fa_castka INTO fa_castka
    FROM 25a_objednavky_faktury f
    WHERE f.id = NEW.faktura_id;
    
    -- Spočítat aktuální součet LP pro tuto fakturu
    SELECT COALESCE(SUM(castka), 0) INTO current_suma
    FROM 25a_faktury_lp_cerpani
    WHERE faktura_id = NEW.faktura_id;
    
    -- Kontrola: nový součet by neměl překročit fa_castka
    IF (current_suma + NEW.castka) > fa_castka THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Součet LP čerpání by překročil částku faktury';
    END IF;
END$$

DELIMITER _cislo
GROUP BY lpc.lp_cislo;

-- UPDATE: Přičíst k sloupci skutecne_cerpano
UPDATE 25_limitovane_prisliby_cerpani
SET skutecne_cerpano = skutecne_cerpano + @cerpano_z_faktur
WHERE cislo_lp = @lp_cislo;
```

---

## 📈 WORKFLOW A POUŽITÍ

### 1. Vytvoření objednávky s LP

```
User vyplní OrderForm25:
├─ Financování: LP
├─ Vybere LP kódy: [6, 7]
├─ Přidá položky:
│  ├─ Položka 1: lp_id=6, cena=50 000 Kč  ← PLÁNOVANÉ
│  └─ Položka 2: lp_id=7, cena=30 000 Kč  ← PLÁNOVANÉ
└─ Odešle objednávku
```

### 2. Přijetí faktury (SCÉNÁŘ A: Jeden LP kód - automatické předvyplnění)

```
User v InvoiceEvidencePage:
├─ Vybere objednávku (načte se financování)
│  └─ Financování: {"typ":"LP","lp_kody":["6"]}
├─ Vyplní údaje faktury:
│  ├─ fa_castka: 50 000 Kč (např. první faktura, další může přijít za měsíc)
│  └─ ...
├─ Otevře sekci "Rozložení LP čerpání"
├─ 🤖 AUTOMATICKÉ PŘEDVYPLNĚNÍ:
│  └─ LP-6: 50 000 Kč (celá částka jako výchozí)
├─ ℹ️ Info: "Objednávka má pouze jeden LP kód, částka byla automaticky přiřazena"
├─ 💡 User má SVOBODU upravit:
│  ├─ Může snížit na 30 000 Kč (čeká další fakturu za měsíc)
│  ├─ Může ponechat 50 000 Kč (celá faktura)
│  └─ Je to na jeho ODPOVĚDNOSTI
├─ Zaškrtne "Potvrzuji správnost"
└─ Uloží fakturu + LP čerpání
```

### 2a. Přijetí faktury (SCÉNÁŘ B: Více LP kódů - manuální rozdělení)

```
User v InvoiceEvidencePage:
├─ Vybere objednávku (načte se financování)
│  └─ Financování: {"typ":"LP","lp_kody":["6","7"]}
├─ Vyplní údaje faktury:
│  ├─ fa_castka: 75 000 Kč (může být první z více faktur)
│  └─ ...
├─ Otevře sekci "Rozložení LP čerpání"
├─ Automaticky se nabídnou LP kódy: [6, 7]
├─ 💡 User má SVOBODU v rozdělení:
│  ├─ Varianta A: LP-6: 50 000 Kč + LP-7: 25 000 Kč (= 75k celá faktura)
│  ├─ Varianta B: LP-6: 40 000 Kč + LP-7: 20 000 Kč (= 60k, zbylých 15k později)
│  ├─ Varianta C: LP-6: 30 000 Kč pouze (čeká další faktury na LP-7)
│  └─ Je to na jeho ODPOVĚDNOSTI!
├─ ℹ️ Systém jen informuje o přiřazené částce
├─ Zaškrtne "Potvrzuji správnost"
└─ Uloží fakturu + LP čerpání
```

### 2c. Přijetí faktury (SCÉNÁŘ C: Více faktur v čase - realistický případ)

```
⏰ REÁLNÁ SITUACE: Faktury přicházejí postupně v čase

Objednávka:
├─ max_cena_s_dph: 100 000 Kč
├─ Financování: LP, kódy [6, 7]
└─ Položky:
   ├─ Položka 1: LP-6, 60 000 Kč (plán)
   └─ Položka 2: LP-7, 40 000 Kč (plán)

FAKTURA 1 (prosinec 2025):
├─ fa_castka: 30 000 Kč
├─ User přiřadí:
│  └─ LP-6: 30 000 Kč
├─ ℹ️ Systém: "Přiřadili jste 30.000 Kč z 30.000 Kč"
└─ User ví, že přijde další faktura v lednu

FAKTURA 2 (leden 2026 - za měsíc!):
├─ fa_castka: 50 000 Kč
├─ User má SVOBODU:
│  ├─ Varianta A: LP-6: 30k + LP-7: 20k (= 50k)
│  ├─ Varianta B: LP-6: 50k pouze (= 50k)
│  └─ Varianta C: LP-6: 20k + LP-7: 20k (= 40k, zbylých 10k na další faktuře)
├─ Rozhodne se pro: LP-6: 30k + LP-7: 20k
└─ ℹ️ Systém: "Přiřadili jste 50.000 Kč z 50.000 Kč"

FAKTURA 3 (únor 2026):
├─ fa_castka: 20 000 Kč
├─ User přiřadí: LP-7: 20 000 Kč
└─ Dokončení čerpání LP-7

VÝSLEDEK v 25_limitovane_prisliby_cerpani:
├─ LP-6: skutecne_cerpano = 60 000 Kč ✅
└─ LP-7: skutecne_cerpano = 40 000 Kč ✅
```

### 2d. Přijetí faktury (SCÉNÁŘ D: Částečné přiřazení - plná svoboda)

```
💡 SVOBODA: User má plnou kontrolu nad rozdělením!

FAKTURA:
├─ fa_castka: 50 000 Kč
├─ User přiřadí podle své úvahy:
│  └─ LP-6: 20 000 Kč
├─ Součet: 20 000 Kč < fa_castka (40%)
├─ ℹ️ Systém jen informuje:
│  "Přiřadili jste 20.000 Kč z 50.000 Kč faktury."
├─ ŽÁDNÉ varování, ŽÁDNÝ tlak na dokončení!
└─ Uložení je povoleno ✅

DŮVODY PRO ČÁSTEČNÉ PŘIŘAZENÍ:
├─ Čeká další fakturu za měsíc → rozdělí později
├─ Není si jistý rozdělením → konzultuje s vedoucím
├─ Zbylých 30k může patřit na jinou objednávku
├─ Může upravit kdykoliv editací faktury
└─ Je to na jeho ODPOVĚDNOSTI!

⚠️ JEDINÉ OMEZENÍ:
└─ Součet NESMÍ překročit fa_castka (20k ≤ 50k ✅)
```

### 3. Kontrola věcné správnosti (POVINNÁ ČÁST)

```
User při kontrole VS faktury na objednávce s LP:
├─ ⚠️ Sekce "Rozložení LP čerpání" je POVINNÁ!
├─ Může upravit částky (pokud nebylo předvyplněno správně)
├─ Systém kontroluje:
│  ├─ Je vyplněno alespoň jedno LP? ✅ POVINNÉ
│  ├─ Součet ≤ fa_castka? ✅ POVINNÉ
│  ├─ Součet = fa_castka? ℹ️ Doporučeno, ale ne povinné
│  └─ LP kódy jsou z financování objednávky? ✅ POVINNÉ
├─ Nemůže potvrdit VS dokud není LP čerpání vyplněno!
├─ Potvrdí věcnou správnost
└─ LP čerpání se zapíše do 25_limitovane_prisliby_cerpani
```

### 3b. ⚠️ Co když user nepřiřadí nic?

```
SCÉNÁŘ: Faktura s LP financováním, ale user nevyplní rozložení

Objednávka:
└─ Financování: {"typ":"LP","lp_kody":["6"]}

Faktura:
├─ fa_castka: 50 000 Kč
└─ lpCerpani: [] (prázdné)

CHOVÁNÍ SYSTÉMU:
├─ Zobrazí ERROR:
│  "⚠️ Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód!"
├─ Povolí uložení/potvrzení VS? ❌ NE!
│  (LP čerpání je POVINNÉ pro faktury na objednávky s LP)
├─ User MUSÍ vyplnit rozložení před pokračováním
└─ Výjimka: Stornované faktury (ty LP nečerpají)
```

### 4. Automatický přepočet

```
Backend po uložení:
├─ Spustí prepocetCerpaniPodleCislaLP('6')
├─ Spustí prepocetCerpaniPodleCislaLP('7')
└─ Aktualizuje tabulku 25_limitovane_prisliby_cerpani:
   ├─ skutecne_cerpano += 50 000  (LP-6)
   └─ skutecne_cerpano += 25 000  (LP-7)
```

---

## 🚀 IMPLEMENTAČNÍ PLÁN

### FÁZE 1: Databáze (1-2 hod)
- [ ] Vytvořit tabulku `25a_faktury_lp_cerpani`
- [ ] Přidat indexy a foreign keys
- [ ] Vytvořit testovací data

### FÁZE 2: Backend API (3-4 hod)
- [ ] Endpoint `POST /faktury/lp-cerpani/save`
- [ ] Endpoint `POST /faktury/lp-cerpani/get`
- [ ] Upravit stored procedure pro přepočet LP
- [ ] Otestovat API

### FÁZE 3: Frontend komponenta (4-5 hod)
- [ ] Vytvořit `LPCerpaniEditor` komponentu
- [ ] Validační logika
- [ ] Integrace do `InvoiceEvidencePage`
- [ ] State management (load/save)

### FÁZE 4: Integrace a testování (2-3 hod)
- [ ] Propojení s workflow věcné správnosti
- [ ] E2E testování
- [ ] Kontrola přepočtu LP v profilu uživatele
- [ ] Dokumentace pro uživatele

### FÁZE 5: UI v Invoices25List (2 hod)
- [ ] Zobrazení LP čerpání v seznamu faktur
- [ ] Možnost rychlé úpravy
- [ ] Indikátor kompletnosti (zbývá přiřadit)

---

## ✅ VÝHODY NAVRŽENÉHO ŘEŠENÍ

1. **✅ Čistá separace** - LP čerpání na fakturách je nezávislé na položkách
2. **✅ Flexibilita** - uživatel může rozdělit jinak než původní plán
3. **✅ Audit trail** - víme kdo, kdy, co změnil
4. **✅ Jednoduchá integrace** - přímé JOINy, žádné JSON parsování
5. **✅ Performance** - indexované sloupce, rychlé queries
6. **✅ Validace** - kontrola součtů na úrovni API i UI
7. **✅ Zpětná kompatibilita** - neovlivní existující data
8. **✅ Rozšiřitelnost** - lze přidat další atributy (poznámky, ...)

---

## 🎯 ALTERNATIVNÍ/BUDOUCÍ ROZŠÍŘENÍ

### 1. Automatické předvyplnění
```javascript
// Při vytvoření faktury automaticky nabídnout rozložení
// podle plánovaného čerpání z položek
const autoFillLPCerpani = (objednavka, faktura) => {
  const polozky = objednavka.polozky || [];
  const lpGroups = {};
  
  // Seskupit položky podle LP
  polozky.forEach(p => {
    if (p.lp_id) {
      lpGroups[p.lp_id] = (lpGroups[p.lp_id] || 0) + p.cena_s_dph;
    }
  });
  
  // Proporcionálně rozdělit částku faktury
  const polozkyCelkem = Object.values(lpGroups).reduce((a, b) => a + b, 0);
  const lpCerpani = Object.entries(lpGroups).map(([lp_id, castka]) => ({
    lp_id: lp_id,
    castka: (castka / polozkyCelkem) * faktura.fa_castka
  }));
  
  re� KLÍČOVÉ DESIGNOVÉ ROZHODNUTÍ (na základě diskuse)

### ✅ 1. Nová tabulka vs JSON
**ROZHODNUTO:** Nová tabulka `25a_faktury_lp_cerpani`
- Čisté oddělení od smluv
- Snadné JOINy a indexy
- Připraveno na stored procedures

### ✅ 2. Validace součtu
**ROZHODNUTO:** Součet MŮŽE být menší než fa_castka
- **Důvod:** Více faktur na jednu objednávku
- **Validace:** Součet ≤ fa_castka (ne =)
- **UI:** Informativní zpráva, ne error

### ⚠️ 3. Nekoliduje se smlouvami?
**OVĚŘENO:** ✅ Nekoliduje
- Smlouvy: `faktury.smlouva_id` (přímá vazba)
- LP: nová tabulka `faktury_lp_cerpani` (dělení částky)
- Různé stored procedures
- Mohou koexistovat na stejné faktuře

### ✅ 4. Oprávnění
**ROZHODNUTO:** Běžný uživatel při věcné správnosti
- Objednatel, garant, kdokoli má s objednávkou co dočinění
- Editace při kontrole věcné správnosti faktury
- Role: ORDER_VIEW + právo na danou objednávku

### ✅ 5. Povinnost LP čerpání
**ROZHODNUTO:** POVINNÉ při VS pro objednávky s LP
- ⚠️ Pokud `financovani.typ === "LP"` → LP čerpání je POVINNÉ
- Nelze potvrdit věcnou správnost bez vyplnění
- Musí být přiřazen alespoň jeden LP kód
- Výjimka: Stornované faktury

### ✅ 6. Automatické předvyplnění
**ROZHODNUTO:** Implementovat pro JEDEN LP kód
- Pokud objednávka má pouze jeden LP kód → automaticky předvyplnit celou fa_castka
- User může částku upravit (pokud čeká další faktury)
- Pro více LP kódů → user musí ručně rozdělit

### ✅ 7. Započítávání faktur
**ROZHODNUTO:** Všechny faktury kromě STORNO
- Stav != 'STORNO'
- Včetně stavů: ZAEVIDOVANA, VECNA_SPRAVNOST, V_RESENI, K_ZAPLACENI, ZAPLACENO
- Důvod: LP čerpání se eviduje již při věcné správnosti

### ✅ 8. Svoboda v rozdělení částky
**ROZHODNUTO:** Uživatel má PLNOU SVOBODU
- ❌ NEOMEZOVAT součet LP čerpání = fa_castka
- ✅ Uživatel může přiřadit i jen část faktury
- ✅ Faktura může být v danou chvíli jediná, další přijde za měsíc
- ✅ Je to na ODPOVĚDNOSTI zaměstnance
- ⚠️ JEDINÉ omezení: součet ≤ fa_castka (nesmí překročit)
- ℹ️ Systém jen INFORMUJE o přiřazené částce, bez varování
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `cerpani_id` INT(10) UNSIGNED NOT NULL,
  `action` ENUM('INSERT', 'UPDATE', 'DELETE'),
  `old_castka` DECIMAL(15,2),
  `new_castka` DECIMAL(15,2),
  `uzivatel_id` INT(10) UNSIGNED NOT NULL,
  `dt_zmeny` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
);
```

### 3. Reporty a analýzy
- Porovnání plánovaného vs skutečného čerpání LP
- Grafy odchylek
- Varování při překročení limitu LP

---

## 📞 OTÁZKY K DISKUSI

1. **Je nová tabulka OK?** Nebo preferujete JSON sloupec?
2. **Validace součtu:** Musí být přesně rovno `fa_castka`, nebo může být menší?
3. **Oprávnění:** Kdo smí upravovat LP čerpání? (stejná pravidla jako faktura?)
4. **Workflow:** Má být LP čerpání povinné před potvrzením VS?
5. **Automatické předvyplnění:** Implementovat hned nebo později?

---

## 📚 ZÁVĚR

Navržené řešení:
- ✅ **Elegantní** - čistá DB struktura
- ✅ **Flexibilní** - uživatel má plnou kontrolu
- ✅ **Integrované** - zapadá do stávajícího workflow
- ✅ **Testovatelné** - jednoduché unit a E2E testy
- ✅ **Škálovatelné** - připraveno na budoucí rozšíření

Odhadovaná **celková pracnost: 12-15 hodin** (včetně testování).

---

**Připraveno k diskusi a schválení. 🚀**
