# CHANGELOG: Přidání checkboxu "Použití v objednávkách" do formuláře smluv

**Datum:** 28. prosince 2025  
**Komponenta:** SmlouvyFormModal + SmlouvyTab  
**Typ změny:** UI/UX Enhancement  

---

## 🎯 Přidaná funkčnost

Přidán checkbox do editačního formuláře smluv pro nastavení, zda se smlouva má nabízet v OrderForm nebo pouze v modulu faktur.

### Pole: `pouzit_v_obj_formu`

**Typ:** `TINYINT(1)`  
**Výchozí hodnota:** `1` (dostupná v OrderForm)

**Hodnoty:**
- `1` - Smlouva se nabízí v OrderForm25 při vytváření objednávek
- `0` - Smlouva se nenabízí v objednávkách, pouze v modulu faktur

---

## 📝 Změny v komponentách

### 1. SmlouvyFormModal.js

**Umístění:** `apps/eeo-v2/client/src/components/dictionaries/tabs/SmlouvyFormModal.js`

**A) Inicializace formData:**
```javascript
pouzit_v_obj_formu: smlouva?.pouzit_v_obj_formu !== undefined ? smlouva.pouzit_v_obj_formu : 1,
```

**B) UI Checkbox s informačním textem:**
```jsx
{/* Použít v obj. formuláři */}
<FormField>
  <Label>Použití v objednávkách</Label>
  <ToggleSwitch>
    <input
      type="checkbox"
      checked={formData.pouzit_v_obj_formu === 1}
      onChange={(e) => handleChange('pouzit_v_obj_formu', e.target.checked ? 1 : 0)}
    />
    <span className="slider" />
    <span className="label-text">
      {formData.pouzit_v_obj_formu === 1 
        ? '📋 Dostupná v OrderForm' 
        : '🔒 Pouze faktury'}
    </span>
  </ToggleSwitch>
  
  {/* Informační text */}
  {formData.pouzit_v_obj_formu === 1 ? (
    <InfoText style={{ marginTop: '0.5rem' }}>
      ℹ️ Smlouva se nabízí při vytváření objednávek v OrderForm25
    </InfoText>
  ) : (
    <InfoText style={{ marginTop: '0.5rem', color: '#f59e0b' }}>
      ⚠️ Smlouva se nenabízí v objednávkách, pouze v modulu faktur
    </InfoText>
  )}
</FormField>
```

### 2. SmlouvyTab.js

**Umístění:** `apps/eeo-v2/client/src/components/dictionaries/tabs/SmlouvyTab.js`

**Přidán sloupec "Použití" do tabulky:**
```javascript
columnHelper.accessor('pouzit_v_obj_formu', {
  header: 'Použití',
  cell: info => {
    const value = info.getValue();
    return (
      <SmartTooltip content={value === 1 ? 'Dostupná v OrderForm pro objednávky' : 'Pouze v modulu faktur'}>
        <span style={{ 
          fontSize: '0.875rem',
          display: 'inline-block',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: value === 1 ? '#dbeafe' : '#fef3c7',
          color: value === 1 ? '#1e40af' : '#92400e',
          fontWeight: '500'
        }}>
          {value === 1 ? '📋 OrderForm' : '🔒 Faktury'}
        </span>
      </SmartTooltip>
    );
  },
  enableSorting: true
})
```

---

## 🎨 UI/UX

### Formulář smlouvy

**Umístění checkboxu:** Hned pod checkboxem "Stav smlouvy" (aktivní/neaktivní)

**Stavy:**
1. **Zaškrtnuto (hodnota 1):**
   - Text: "📋 Dostupná v OrderForm"
   - Info: "ℹ️ Smlouva se nabízí při vytváření objednávek v OrderForm25"
   - Barva: modrá (primární)

2. **Nezaškrtnuto (hodnota 0):**
   - Text: "🔒 Pouze faktury"
   - Warning: "⚠️ Smlouva se nenabízí v objednávkách, pouze v modulu faktur"
   - Barva: oranžová (warning)

### Tabulka smluv

**Nový sloupec "Použití":**
- Umístěn před sloupcem "Stav"
- Badge s ikonami:
  - `📋 OrderForm` - modrý badge (dostupná v objednávkách)
  - `🔒 Faktury` - žlutý badge (pouze faktury)
- Tooltip s detailním popisem při najetí myší

---

## 📊 Business logika

### Použití v systému

**OrderForm25:**
```javascript
// Načte se pouze smlouvy s pouzit_v_obj_formu = 1
SELECT * FROM 25_smlouvy 
WHERE aktivni = 1 
  AND pouzit_v_obj_formu = 1
  AND platnost_od <= CURDATE()
  AND platnost_do >= CURDATE();
```

**Modul faktur:**
```javascript
// Načte se VŠECHNY smlouvy (0 i 1)
SELECT * FROM 25_smlouvy 
WHERE aktivni = 1;
```

### Přepočet čerpání

**Logika v stored procedure `sp_prepocet_cerpani_smluv`:**

```sql
IF v_pouzit_v_obj_formu = 1 THEN
  -- Čerpání z objednávek + faktur
  -- POŽADOVÁNO: max_cena_s_dph z objednávek
  -- PLÁNOVÁNO: suma položek objednávek
  -- SKUTEČNĚ: suma faktur
ELSE
  -- Čerpání pouze z faktur
  -- POŽADOVÁNO: 0
  -- PLÁNOVÁNO: 0
  -- SKUTEČNĚ: suma faktur
END IF;
```

---

## 🔄 Zpětná kompatibilita

**Výchozí hodnota:** `1` (dostupná v OrderForm)

Všechny existující smlouvy bez nastaveného `pouzit_v_obj_formu` budou automaticky považovány za dostupné v OrderForm, což zachovává stávající chování systému.

---

## 📚 Reference

**Související dokumentace:**
- [SMLOUVY_TRI_TYPY_CERPANI.md](_docs/SMLOUVY_TRI_TYPY_CERPANI.md) - logika čerpání podle typu smlouvy
- [CHANGELOG_SP_PREPOCET_CERPANI_SMLUV.md](_docs/CHANGELOG_SP_PREPOCET_CERPANI_SMLUV.md) - stored procedura přepočtu

**Databázová struktura:**
- Sloupec: `25_smlouvy.pouzit_v_obj_formu`
- Index: MUL (multi-value index)
- Typ: TINYINT(1)

---

**Autor:** GitHub Copilot  
**Testováno:** ❌ Čeká se na build a test v browseru  
**Status:** ✅ Implementováno
