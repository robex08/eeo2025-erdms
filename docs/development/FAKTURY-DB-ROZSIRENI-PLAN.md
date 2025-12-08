# Plán rozšíření tabulky `25a_objednavky_faktury`

**Datum:** 8. prosince 2025  
**Databáze:** erdms2025  
**Tabulka:** `25a_objednavky_faktury`

---

## 📋 Současný stav tabulky

Aktuální struktura obsahuje:
- ✅ `fa_zaplacena` (TINYINT) - boolean 0/1 ANO/NE
- ✅ Věcná správnost sloupce (potvrdil, datum, poznámka)
- ✅ Základní invoice fields (číslo, částka, data)
- ✅ Timezone handling přes `TimezoneHelper::getCzechDateTime()`

---

## 🎯 Požadované změny

### 1. **Datum zaplacení faktury**
```sql
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `fa_datum_zaplaceni` DATETIME DEFAULT NULL COMMENT 'Datum a čas zaplacení faktury (systémově)'
AFTER `fa_zaplacena`;

-- Index pro rychlé dotazy
CREATE INDEX `idx_fa_datum_zaplaceni` ON `25a_objednavky_faktury` (`fa_datum_zaplaceni`);
```

**Poznámky:**
- ✅ **DATETIME** typ (ne DATE) - ukládá přesný čas
- ✅ **Systémové ukládání** - automaticky při změně `fa_zaplacena` z 0→1
- ⚠️ **Timezone handling** - použít `TimezoneHelper::getCzechDateTime()` v PHP API
- 📝 Existující funkce: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php`

---

### 2. **ID zaměstnance - komu byla FA určena/předána**
```sql
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `fa_predana_zam_id` INT(11) DEFAULT NULL COMMENT 'ID zaměstnance (25_uzivatele), komu byla FA předána'
AFTER `rozsirujici_data`;

-- Foreign key constraint
ALTER TABLE `25a_objednavky_faktury`
ADD CONSTRAINT `fk_faktury_predana_zam`
  FOREIGN KEY (`fa_predana_zam_id`)
  REFERENCES `25_uzivatele` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Index
CREATE INDEX `idx_fa_predana_zam_id` ON `25a_objednavky_faktury` (`fa_predana_zam_id`);
```

**Poznámky:**
- ✅ Referuje na `25_uzivatele.id`
- ✅ ON DELETE SET NULL - pokud se zaměstnanec smaže, zachová se faktura
- 📝 Manuálně zadáváno uživatelem (select z aktivních zaměstnanců)

---

### 3. **Datum předání FA zaměstnanci**
```sql
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `fa_datum_predani_zam` DATE DEFAULT NULL COMMENT 'Datum předání FA zaměstnanci (ručně zadávané)'
AFTER `fa_predana_zam_id`;

-- Index
CREATE INDEX `idx_fa_datum_predani_zam` ON `25a_objednavky_faktury` (`fa_datum_predani_zam`);
```

**Poznámky:**
- ✅ **DATE** typ (ne DATETIME) - zajímá nás jen datum, ne přesný čas
- ✅ **Ručně zadáváno** - user vybere z date pickeru
- 📝 Volitelné pole - může být NULL

---

### 4. **Datum vrácení FA od zaměstnance**
```sql
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `fa_datum_vraceni_zam` DATE DEFAULT NULL COMMENT 'Datum vrácení FA od zaměstnance (ručně zadávané)'
AFTER `fa_datum_predani_zam`;

-- Index
CREATE INDEX `idx_fa_datum_vraceni_zam` ON `25a_objednavky_faktury` (`fa_datum_vraceni_zam`);
```

**Poznámky:**
- ✅ **DATE** typ (ne DATETIME)
- ✅ **Ručně zadáváno**
- ✅ **Business logika:** `fa_datum_vraceni_zam` >= `fa_datum_predani_zam` (kontrola ve FE/BE)

---

## 📝 Kompletní ALTER TABLE skript

```sql
-- =====================================================
-- Rozšíření tabulky 25a_objednavky_faktury
-- Datum: 8. prosince 2025
-- Autor: robex08
-- =====================================================

USE erdms2025;

-- Přidat nové sloupce
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `fa_datum_zaplaceni` DATETIME DEFAULT NULL COMMENT 'Datum a čas zaplacení faktury (systémově)' AFTER `fa_zaplacena`,
ADD COLUMN `fa_predana_zam_id` INT(11) DEFAULT NULL COMMENT 'ID zaměstnance (25_uzivatele), komu byla FA předána' AFTER `rozsirujici_data`,
ADD COLUMN `fa_datum_predani_zam` DATE DEFAULT NULL COMMENT 'Datum předání FA zaměstnanci (ručně zadávané)' AFTER `fa_predana_zam_id`,
ADD COLUMN `fa_datum_vraceni_zam` DATE DEFAULT NULL COMMENT 'Datum vrácení FA od zaměstnance (ručně zadávané)' AFTER `fa_datum_predani_zam`;

-- Vytvořit indexy pro rychlé dotazy
CREATE INDEX `idx_fa_datum_zaplaceni` ON `25a_objednavky_faktury` (`fa_datum_zaplaceni`);
CREATE INDEX `idx_fa_predana_zam_id` ON `25a_objednavky_faktury` (`fa_predana_zam_id`);
CREATE INDEX `idx_fa_datum_predani_zam` ON `25a_objednavky_faktury` (`fa_datum_predani_zam`);
CREATE INDEX `idx_fa_datum_vraceni_zam` ON `25a_objednavky_faktury` (`fa_datum_vraceni_zam`);

-- Přidat foreign key constraint
ALTER TABLE `25a_objednavky_faktury`
ADD CONSTRAINT `fk_faktury_predana_zam`
  FOREIGN KEY (`fa_predana_zam_id`)
  REFERENCES `25_uzivatele` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Ověření změn
SHOW CREATE TABLE `25a_objednavky_faktury`;
```

---

## 🔧 Změny v PHP API

### 1. **Automatické nastavení `fa_datum_zaplaceni`**

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php`

**Funkce:** `handle_order_v2_update_invoice()`

```php
// Pokud se mění fa_zaplacena z 0 na 1, automaticky nastavit datum zaplacení
if (isset($input['fa_zaplacena']) && (int)$input['fa_zaplacena'] === 1) {
    // Zkontrolovat, jestli předtím nebyla zaplacená
    $check_sql = "SELECT fa_zaplacena, fa_datum_zaplaceni FROM 25a_objednavky_faktury WHERE id = ? AND aktivni = 1";
    $check_stmt = $db->prepare($check_sql);
    $check_stmt->execute(array($invoice_id));
    $current_invoice = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($current_invoice && (int)$current_invoice['fa_zaplacena'] === 0 && empty($current_invoice['fa_datum_zaplaceni'])) {
        // Automaticky nastavit datum zaplacení
        $updateFields[] = 'fa_datum_zaplaceni = ?';
        $updateValues[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    }
}

// Pokud se fa_zaplacena mění zpět na 0, vynulovat datum zaplacení
if (isset($input['fa_zaplacena']) && (int)$input['fa_zaplacena'] === 0) {
    $updateFields[] = 'fa_datum_zaplaceni = ?';
    $updateValues[] = null;
}
```

### 2. **Rozšíření allowed fields**

```php
$allowedFields = array(
    'fa_cislo_vema', 'fa_datum_vystaveni', 'fa_datum_splatnosti', 'fa_datum_doruceni',
    'fa_castka', 'fa_dorucena', 'fa_zaplacena', 'fa_typ',
    'fa_strediska_kod', 'fa_poznamka', 'rozsirujici_data',
    'potvrdil_vecnou_spravnost_id', 'dt_potvrzeni_vecne_spravnosti',
    'vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka', 'vecna_spravnost_potvrzeno',
    // ✅ NOVÉ FIELDY
    'fa_datum_zaplaceni',         // DATETIME (může být i manuálně nastaveno)
    'fa_predana_zam_id',          // INT(11) - ID zaměstnance
    'fa_datum_predani_zam',       // DATE
    'fa_datum_vraceni_zam'        // DATE
);
```

### 3. **Validace datumů předání/vrácení**

```php
// Validace: datum vrácení musí být >= datum předání
if (isset($input['fa_datum_predani_zam']) && isset($input['fa_datum_vraceni_zam'])) {
    $predani = strtotime($input['fa_datum_predani_zam']);
    $vraceni = strtotime($input['fa_datum_vraceni_zam']);
    
    if ($vraceni < $predani) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Datum vrácení nemůže být dřívější než datum předání'
        ));
        return;
    }
}
```

---

## 🎨 Změny ve Frontend (React)

### 1. **Rozšíření FormData struktury**

**Soubor:** `InvoiceEvidencePage.js` nebo nový `InvoiceForm.js`

```javascript
const [invoiceData, setInvoiceData] = useState({
  // ... existující fieldy ...
  fa_zaplacena: 0,
  fa_datum_zaplaceni: null,        // DATETIME (read-only, systémové)
  fa_predana_zam_id: null,         // INT - ID zaměstnance
  fa_datum_predani_zam: null,      // DATE
  fa_datum_vraceni_zam: null       // DATE
});
```

### 2. **UI komponenty**

```javascript
// Select box pro výběr zaměstnance
<FormControl fullWidth>
  <InputLabel>FA předána zaměstnanci</InputLabel>
  <Select
    value={invoiceData.fa_predana_zam_id || ''}
    onChange={(e) => handleFieldChange('fa_predana_zam_id', e.target.value)}
  >
    <MenuItem value="">-- Nevybráno --</MenuItem>
    {aktivniZamestnanci.map(zam => (
      <MenuItem key={zam.id} value={zam.id}>
        {zam.jmeno} {zam.prijmeni}
      </MenuItem>
    ))}
  </Select>
</FormControl>

// Datum předání
<TextField
  type="date"
  label="Datum předání FA"
  value={invoiceData.fa_datum_predani_zam || ''}
  onChange={(e) => handleFieldChange('fa_datum_predani_zam', e.target.value)}
  InputLabelProps={{ shrink: true }}
/>

// Datum vrácení
<TextField
  type="date"
  label="Datum vrácení FA"
  value={invoiceData.fa_datum_vraceni_zam || ''}
  onChange={(e) => handleFieldChange('fa_datum_vraceni_zam', e.target.value)}
  inputProps={{
    min: invoiceData.fa_datum_predani_zam || undefined
  }}
  InputLabelProps={{ shrink: true }}
/>

// Datum zaplacení (read-only, zobrazuje se automaticky)
{invoiceData.fa_zaplacena === 1 && invoiceData.fa_datum_zaplaceni && (
  <TextField
    type="datetime-local"
    label="Datum zaplacení"
    value={invoiceData.fa_datum_zaplaceni?.substring(0, 16) || ''}
    InputProps={{ readOnly: true }}
    disabled
    InputLabelProps={{ shrink: true }}
  />
)}
```

### 3. **Automatické nastavení data zaplacení**

```javascript
const handleZaplacenaChange = async (newValue) => {
  const updatedData = {
    ...invoiceData,
    fa_zaplacena: newValue ? 1 : 0
  };
  
  // Pokud se označuje jako zaplacená, automaticky nastavit datum
  if (newValue && !invoiceData.fa_datum_zaplaceni) {
    const getMySQLDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    updatedData.fa_datum_zaplaceni = getMySQLDateTime();
  }
  
  // Pokud se odznačuje jako nezaplacená, vynulovat datum
  if (!newValue) {
    updatedData.fa_datum_zaplaceni = null;
  }
  
  setInvoiceData(updatedData);
  await saveInvoice(updatedData);
};
```

---

## 📊 Přehled položek FA - vliv na workflow

> **TODO:** Jaké pole faktury bude mít vliv na:
> 1. **Znovuotevření objednávky** (pokud je uzavřená)
> 2. **Znovu schválení věcné správnosti**

### Možné triggery (ke konzultaci):

| Pole faktury | Vliv na Obj | Vliv na Věcnou správnost | Poznámka |
|-------------|-------------|--------------------------|----------|
| `fa_zaplacena` změna 1→0 | ❓ Znovu otevřít? | ❌ Ne | Pokud se odznačí zaplacení |
| `fa_castka` změna | ❓ | ✅ Ano | Změna částky = nové schválení |
| `fa_strediska_kod` změna | ❌ Ne | ✅ Ano | Změna střediska |
| `fa_datum_splatnosti` změna | ❌ Ne | ❌ Ne | Organizační změna |
| `fa_cislo_vema` změna | ❓ | ✅ Ano | Změna čísla FA |
| `fa_predana_zam_id` změna | ❌ Ne | ❌ Ne | Evidence předání |
| `fa_datum_predani_zam` změna | ❌ Ne | ❌ Ne | Evidence předání |
| `fa_datum_vraceni_zam` změna | ❌ Ne | ❌ Ne | Evidence vrácení |

**🔴 POTŘEBA KONZULTACE:**
- Které změny vyžadují znovu schválení věcné správnosti?
- Které změny by měly znovu otevřít objednávku?
- Jsou nějaká pole chráněná (nelze editovat po schválení)?

---

## ✅ Checklist implementace

### Databáze
- [ ] Spustit ALTER TABLE skript na DB `erdms2025`
- [ ] Ověřit indexy: `SHOW INDEX FROM 25a_objednavky_faktury`
- [ ] Ověřit foreign key: `SHOW CREATE TABLE 25a_objednavky_faktury`
- [ ] Backup DB před změnami

### PHP API
- [ ] Rozšířit `handle_order_v2_update_invoice()` - nové fieldy
- [ ] Přidat automatické nastavení `fa_datum_zaplaceni` při změně na zaplaceno
- [ ] Přidat validaci datumů (vrácení >= předání)
- [ ] Aktualizovat `handle_order_v2_create_invoice()` - přidat nové fieldy do INSERT
- [ ] Otestovat timezone handling pro `fa_datum_zaplaceni`

### Frontend (React)
- [ ] Přidat nové fieldy do `invoiceData` state
- [ ] Vytvořit UI komponenty (select zaměstnance, date pickers)
- [ ] Implementovat automatické nastavení `fa_datum_zaplaceni`
- [ ] Přidat validaci (vrácení >= předání)
- [ ] Načíst seznam aktivních zaměstnanců (API endpoint)
- [ ] Zobrazit datum zaplacení (read-only) u zaplacených FA

### Dokumentace
- [ ] Aktualizovat DB schema diagram
- [ ] Dokumentovat business logiku workflow změn
- [ ] Vytvořit user manuál pro evidenci předání FA

---

## 🚀 Další kroky

1. **Potvrď změny** - projdi plán a potvrď, že odpovídá požadavkům
2. **Specifikuj workflow** - urči, které změny FA vyžadují znovu schválení
3. **Implementuj DB změny** - spusť ALTER TABLE skript
4. **Implementuj PHP API** - rozšířit handlery
5. **Implementuj Frontend** - přidat UI komponenty
6. **Testování** - otestovat všechny scénáře

---

## 📞 Otázky k diskusi

1. **Datum zaplacení:**
   - ✅ Automatické při změně `fa_zaplacena` 0→1?
   - ✅ Povolit manuální editaci data zaplacení?
   - ✅ Co když se FA odznačí jako nezaplacená (vynulovat datum)?

2. **Předání FA zaměstnanci:**
   - ✅ Jaký je use case? (FA se předává zaměstnanci k podpisu/ověření?)
   - ✅ Může být FA předána více zaměstnancům postupně? (nebo jen jeden záznam?)

3. **Workflow triggery:**
   - ❓ **Které pole FA vyžaduje znovu schválení věcné správnosti?**
   - ❓ **Které pole FA vyžaduje znovu otevření objednávky?**
   - ❓ **Jsou nějaká pole chráněná po schválení?**

4. **Oprávnění:**
   - ❓ Kdo může editovat pole FA? (stejná role jako věcná správnost?)
   - ❓ Kdo může označit FA jako zaplacenou?

---

**Připraveno k diskusi a finalizaci! 🎯**
