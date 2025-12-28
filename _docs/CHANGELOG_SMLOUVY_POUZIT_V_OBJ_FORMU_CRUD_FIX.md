# Changelog: Smlouvy - CRUD operace pro pole `pouzit_v_obj_formu`

**Datum:** 2025-01-08  
**Autor:** AI Assistant  
**Verze:** 1.0  
**Status:** ✅ Hotovo

---

## 🎯 Cíl změny

Zajistit, aby pole `pouzit_v_obj_formu` správně fungovalo ve všech CRUD operacích:
- **CREATE**: Uložení hodnoty při vytvoření smlouvy
- **READ**: Načtení hodnoty při zobrazení seznamu a detailu
- **UPDATE**: Úprava hodnoty při editaci smlouvy
- **DELETE**: Pole nemá vliv na mazání

---

## 📋 Provedené úpravy

### 1. Backend - PHP Handlers (`smlouvyHandlers.php`)

#### ✅ INSERT (Vytvoření smlouvy)
**Řádek:** ~535  
**Změna:** Pole `pouzit_v_obj_formu` bylo přidáno do INSERT statement  
**Výchozí hodnota:** 0 (pokud není zadáno)

```php
// Pouzit_v_obj_formu - defaultně 0 (pouze v modulu smluv a faktur)
$pouzit_v_obj_formu = isset($input['pouzit_v_obj_formu']) ? (int)$input['pouzit_v_obj_formu'] : 0;

INSERT INTO 25_smlouvy (
    ...
    aktivni, pouzit_v_obj_formu, stav, poznamka, ...
) VALUES (
    ...
    :aktivni, :pouzit_v_obj_formu, :stav, :poznamka, ...
)
```

#### ✅ UPDATE (Úprava smlouvy)
**Řádek:** 673  
**Změna:** Přidáno do `$allowed_fields`

```php
$allowed_fields = array(
    'cislo_smlouvy', 'usek_id', 'druh_smlouvy',
    'nazev_firmy', 'ico', 'dic', 'nazev_smlouvy', 'popis_smlouvy',
    'platnost_od', 'platnost_do',
    'hodnota_bez_dph', 'hodnota_s_dph', 'sazba_dph',
    'hodnota_plneni_bez_dph', 'hodnota_plneni_s_dph',
    'aktivni', 'pouzit_v_obj_formu', 'poznamka', 'cislo_dms', 'kategorie'
);
```

#### ✅ SELECT - List (Seznam smluv)
**Řádek:** ~282  
**Změna:** Pole je automaticky vráceno přes `SELECT s.*`  
**Type casting přidán:** Řádek ~307

```php
// Type casting
$row['id'] = (int)$row['id'];
$row['usek_id'] = (int)$row['usek_id'];
$row['aktivni'] = (int)$row['aktivni'];
$row['pouzit_v_obj_formu'] = isset($row['pouzit_v_obj_formu']) ? (int)$row['pouzit_v_obj_formu'] : 0;
// ... další pole
```

#### ✅ SELECT - Detail (Detail smlouvy)
**Řádek:** ~369  
**Změna:** Pole je automaticky vráceno přes `SELECT s.*`  
**Type casting přidán:** Řádek ~387

```php
// Type casting
$smlouva['id'] = (int)$smlouva['id'];
$smlouva['usek_id'] = (int)$smlouva['usek_id'];
$smlouva['aktivni'] = (int)$smlouva['aktivni'];
$smlouva['pouzit_v_obj_formu'] = isset($smlouva['pouzit_v_obj_formu']) ? (int)$smlouva['pouzit_v_obj_formu'] : 0;
// ... další pole
```

---

### 2. Frontend - React Components

#### ✅ `SmlouvyFormModal.js`

**Inicializace formData:**
```javascript
const [formData, setFormData] = useState({
    // ... ostatní pole
    pouzit_v_obj_formu: smlouva?.pouzit_v_obj_formu !== undefined ? smlouva.pouzit_v_obj_formu : 1,
});
```

**Checkbox ve formuláři:**
```javascript
<CheckboxWrapper>
    <Checkbox
        type="checkbox"
        checked={formData.pouzit_v_obj_formu === 1}
        onChange={(e) => handleChange('pouzit_v_obj_formu', e.target.checked ? 1 : 0)}
    />
    <span>📋 Použít v obj. formuláři</span>
</CheckboxWrapper>
```

**InfoText pod checkboxem:**
```javascript
{formData.pouzit_v_obj_formu === 1 ? (
    <InfoText>ℹ️ Smlouva se nabízí při vytváření objednávek</InfoText>
) : (
    <InfoText style={{color: '#E67E22'}}>⚠️ Pouze v modulu faktur</InfoText>
)}
```

#### ✅ `SmlouvyTab.js`

**Nový sloupec v tabulce:**
```javascript
{
    header: 'Použití',
    accessorKey: 'pouzit_v_obj_formu',
    size: 140,
    cell: ({ row }) => {
        const pouzit = row.original.pouzit_v_obj_formu === 1;
        return (
            <SmartTooltip
                trigger={
                    <Badge $variant={pouzit ? 'active' : 'warning'}>
                        {pouzit ? '📋 Obj. formulář' : '🔒 Faktury'}
                    </Badge>
                }
                title={pouzit ? 'Dostupná v obj. formuláři' : 'Pouze modul faktur'}
                description={pouzit 
                    ? 'Smlouva se nabízí při vytváření objednávek v modulu Objednávky.'
                    : 'Smlouva je použitelná pouze v modulu Faktur, není dostupná v objednávkovém formuláři.'
                }
            />
        );
    },
}
```

---

## 🔍 Testování

### Manuální testy:
1. ✅ **Vytvoření nové smlouvy** - Checkbox "Použít v obj. formuláři" zaškrtnutý → uloží se hodnota 1
2. ✅ **Editace smlouvy** - Checkbox se načte podle uložené hodnoty
3. ✅ **Změna checkboxu** - Při uložení se hodnota správně aktualizuje v DB
4. ✅ **Seznam smluv** - Sloupec "Použití" zobrazuje správný badge

### SQL test:
```sql
-- Ověření, že pole existuje a má správné hodnoty
SELECT 
    id,
    cislo_smlouvy,
    nazev_smlouvy,
    pouzit_v_obj_formu,
    CASE 
        WHEN pouzit_v_obj_formu = 1 THEN '📋 Obj. formulář'
        ELSE '🔒 Faktury'
    END AS pouziti_text
FROM 25_smlouvy
ORDER BY dt_vytvoreni DESC
LIMIT 10;
```

---

## 📊 Vliv na existující data

- **Stávající smlouvy:** Mají `pouzit_v_obj_formu = 0` (výchozí hodnota po přidání sloupce)
- **Nové smlouvy:** Výchozí hodnota je `1` (dostupné v obj. formuláři) při vytváření přes UI
- **Migrace:** Není nutná, výchozí hodnota 0 odpovídá původnímu chování

---

## 🔗 Související změny

- **Stored procedure:** `sp_prepocet_cerpani_smluv` - rozlišuje čerpání podle `pouzit_v_obj_formu`
- **DB sloupce:** `cerpano_pozadovano`, `cerpano_planovano`, `cerpano_skutecne` - tři typy čerpání
- **UI komponenty:** Checkbox v modalu, sloupec v tabulce
- **Dokumentace:** 
  - `_docs/SMLOUVY_TRI_TYPY_CERPANI.md`
  - `_docs/CHANGELOG_SP_PREPOCET_CERPANI_SMLUV.md`
  - `_docs/CHANGELOG_SMLOUVY_POUZITI_V_OBJ_FORMU_UI.md`

---

## ✅ Závěr

Všechny CRUD operace správně zpracovávají pole `pouzit_v_obj_formu`:
- **C** (Create): ✅ Uloží hodnotu z checkboxu (default 1 pro nové smlouvy)
- **R** (Read): ✅ Načte hodnotu ze seznamu i detailu, provede type casting na int
- **U** (Update): ✅ Pole je v `$allowed_fields`, lze měnit přes API
- **D** (Delete): ✅ Pole nemá vliv na mazání

Frontend i backend jsou kompletně propojeny a synchronizovány.

---

**Datum kompletace:** 2025-01-08  
**Verze:** 1.0  
**Status:** ✅ Připraveno k nasazení
