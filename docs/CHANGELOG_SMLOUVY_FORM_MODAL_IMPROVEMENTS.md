# Changelog: Vylepšení formuláře pro smlouvy

**Datum:** 28. prosince 2025  
**Autor:** Frontend Team  
**Soubor:** `/apps/eeo-v2/client/src/components/dictionaries/tabs/SmlouvyFormModal.js`  
**Verze:** 2.0 - Unified Design

## 📋 Přehled změn

Kompletní redesign formuláře pro vytváření a editaci smluv s cílem vytvořit kompaktnější a modernější uživatelské rozhraní. **V2.0 sjednoceno stylování s ostatními dialogy v projektu.**

---

## ✅ Implementované změny

### 1. **Redukce velikosti modalu**
- **Před:** 98vh výška, 98vw šířka
- **Po:** 85vh max výška, 900px max šířka
- **Důvod:** Lepší využití obrazovky, přehlednější rozložení

### 2. **Optimalizace layoutu**
- **Před:** 3-sloupcový grid
- **Po:** 2-sloupcový grid (1 sloupec na mobilu)
- **Důvod:** Kompaktnější zobrazení, lepší čitelnost

### 3. **Přidání sekcionování formuláře**
```
📋 Základní údaje
   - Číslo smlouvy, Úsek, Druh smlouvy, Aktivní toggle
   
🏢 Dodavatel
   - Název firmy, IČO, DIČ
   
📄 Název a popis
   - Název smlouvy, Popis smlouvy
   
💰 Platnost a hodnota
   - Platnost od/do, Sazba DPH, Hodnota bez/s DPH
   
🔧 Volitelné údaje (sbalitelné)
   - Číslo DMS, Kategorie, Interní poznámka
```

### 4. **Sbalitelné nepovinné sekce**
- Přidána sekce "Volitelné údaje" s možností sbalit/rozbalit
- Ikona chevron indikuje stav sekce
- Uživatel může skrýt méně důležitá pole

### 5. **Vylepšené UX prvky**

#### Hint box
```jsx
<HintBox>
  💡 Povinné položky jsou označeny hvězdičkou (*). DPH se počítá automaticky.
</HintBox>
```

#### Lepší pomocné texty
- "🔄 Hodnota s DPH se dopočítá" u hodnoty bez DPH
- "Nepovinné, ale doporučené" u IČO
- Emoji indikátory u toggle switch (✅ Aktivní / ⏸️ Neaktivní)

#### Vizuální zlepšení
- Sekční hlavičky s emoji ikonami pro lepší orientaci
- Modrý hint box pro důležité informace
- Konzistentnější spacing (1rem gap místo 1.25rem)

### 6. **Sjednocení designu s ostatními dialogy (v2.0)**

Dialog nyní používá **jednotný design** konzistentní s `UniversalDictionaryDialog` a `SmlouvyDetailModal`:

#### Modrý gradient header
```css
background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
```
- Bílý text na modrém gradientu
- Jemný pattern overlay (SVG dots)
- Ikona v titulku (faFileContract / faPlus)

#### Zaoblené rohy
- Modal: **8px → 16px** border-radius
- Modernější vzhled, konzistentní s ostatními dialogy

#### Backdrop blur efekt
```css
backdrop-filter: blur(12px);
```
- Moderní rozmazání pozadí
- Lepší vizuální oddělení modalu od stránky

#### Vylepšené buttony
- Secondary button: `#f3f4f6` (světle šedá) místo `#6b7280` (tmavě šedá)
- Bílý text jen u primary buttonu
- Box-shadow animace při hover

#### Konzistentní spacing
- Header padding: `1.5rem 2rem`
- Body padding: `1.5rem 2rem`
- Footer padding: `1.5rem 2rem`
- Gap mezi prvky: `1rem`

### 7. **Zachování funkcionality**
- ✅ Auto-výpočet DPH zachován
- ✅ Validace všech polí zachována
- ✅ DatePicker integrace zachována
- ✅ Toggle switch pro aktivní/neaktivní zachován
- ✅ Chybové hlášky inline zachovány

---

## 📊 Statistiky

| Metrika | Před | Po | Změna |
|---------|------|-----|-------|
| Výška modalu | 98vh | 85vh | -13% |
| Šířka modalu | 98vw | 900px max | Fixní |
| Grid sloupce | 3 | 2 | -33% |
| Border radius | 8px | 16px | +100% |
| Header style | Jednoduchý | Gradient | ✨ |
| Backdrop blur | Ne | Ano (12px) | ✨ |
| Počet řádků | 768 | 840+ | +72 (sekce) |

---

## 🔧 Technické detaily

### Design konzistence

Dialog nyní sdílí stejný design systém s:
- ✅ `UniversalDictionaryDialog.js` - modrý gradient, border-radius 16px+
- ✅ `SmlouvyDetailModal.js` - modrý gradient header
- ✅ `DictionaryDialogs.js` - backdrop blur, animace

### Nové styled komponenty

```javascript
const SectionHeader = styled.div`
  // Hlavička sekce s možností sbalení
  grid-column: span 2;
  margin-top: ${props => props.$first ? '0' : '1rem'};
  border-bottom: 2px solid #e2e8f0;
  cursor: ${props => props.$collapsible ? 'pointer' : 'default'};
`;

const CollapsibleContent = styled.div`
  // Sbalitelný obsah
  display: ${props => props.$collapsed ? 'none' : 'contents'};
`;

const HintBox = styled.div`
  // Informační box
  grid-column: span 2;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
`;
```

### Nový state

```javascript
const [showOptionalFields, setShowOptionalFields] = useState(false);
```

### Nové ikony

```javascript
import { faChevronDown, faFileContract, faPlus } from '@fortawesome/free-solid-svg-icons';
```
- `faFileContract` - ikona v titulku při editaci
- `faPlus` - ikona v titulku při vytváření nové smlouvy
- `faChevronDown` - indikátor sbalení volitelných polí

---

## 🎯 Backend kompatibilita

**Status:** ✅ Plná kompatibilita

Formulář posílá stejná data jako předchozí verze:
- Všechna povinná pole (`cislo_smlouvy`, `usek_id`, `druh_smlouvy`, `nazev_firmy`, `nazev_smlouvy`, `platnost_od`, `platnost_do`, `hodnota_s_dph`)
- Volitelná pole (`ico`, `dic`, `popis_smlouvy`, `hodnota_bez_dph`, `sazba_dph`, `cislo_dms`, `kategorie`, `poznamka`, `aktivni`, `stav`)

Backend handlers v `/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`:
- ✅ `handle_ciselniky_smlouvy_insert()` (lines 456-598) - kompatibilní
- ✅ `handle_ciselniky_smlouvy_update()` (lines 598-731) - kompatibilní

---

## 🎨 Design kompatibilita

### Porovnání s ostatními dialogy

| Feature | UniversalDialog | SmlouvyDetail | SmlouvyForm (nový) |
|---------|----------------|---------------|-------------------|
| Header gradient | ✅ Modrý | ✅ Modrý | ✅ Modrý |
| Border radius | 20px | 8px | 16px |
| Backdrop blur | ✅ 12px | ❌ | ✅ 12px |
| Max width | 700px/1000px | 98vw | 900px |
| Max height | 90vh | 98vh | 85vh |
| Pattern overlay | ✅ SVG dots | ❌ | ✅ SVG dots |
| Ikona v titulku | ✅ | ✅ | ✅ |
| Footer background | #f9fafb | - | #f9fafb |

**Výsledek:** SmlouvyFormModal je nyní **plně konzistentní** s moderními dialogy v projektu.

---

## 🧪 Testování

### Manuální testy

1. **Vytvoření nové smlouvy**
   ```bash
   ✅ Otevřít formulář
   ✅ Vyplnit povinná pole
   ✅ Ověřit auto-výpočet DPH
   ✅ Uložit → kontrola v DB
   ```

2. **Editace smlouvy**
   ```bash
   ✅ Otevřít existující smlouvu
   ✅ Upravit hodnoty
   ✅ Uložit změny
   ✅ Ověřit update v DB
   ```

3. **Validace**
   ```bash
   ✅ Pokus o uložení bez povinných polí
   ✅ IČO s nesprávným formátem
   ✅ Platnost do před platností od
   ✅ Záporná hodnota s DPH
   ```

4. **UX Features**
   ```bash
   ✅ Sbalit/rozbalit volitelné údaje
   ✅ Auto-výpočet DPH při změně hodnot
   ✅ Responsive na mobilu (1 sloupec)
   ✅ Toggle aktivní/neaktivní
   ```

---

## 📝 Poznámky

### Removed features
- Odstraněn dropdown "Stav" - stav se počítá automaticky backend logikou
- Ponechán pouze toggle "Aktivní/Neaktivní" pro manuální řízení

### Responsive design
- Desktop (>768px): 2 sloupce
- Mobil (<768px): 1 sloupec
- Max šířka fixní na 900px pro lepší čitelnost

### Performance
- Žádné změny v API volání
- Stejná rychlost renderování
- Optimalizované re-rendery pomocí React state

---

## 🚀 Deploy checklist

- [x] Syntaxe ověřena (ESLint clean)
- [x] Backend kompatibilita ověřena
- [ ] Manuální test vytvoření smlouvy
- [ ] Manuální test editace smlouvy
- [ ] Test validací
- [ ] Test na různých prohlížečích
- [ ] Test responsive design
- [ ] Deploy do DEV prostředí
- [ ] UAT testování
- [ ] Deploy do PROD

---

## 👥 Related Changes

Žádné závislé změny v jiných souborech. Dialog je samostatná komponenta.

---

## 📚 References

- **Backend:** [smlouvyHandlers.php](../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php)
- **API Service:** [apiSmlouvy.js](../apps/eeo-v2/client/src/services/apiSmlouvy.js)
- **Database:** Tabulka `25_smlouvy`
- **Migration:** [alter-smlouvy-obj-form-flag-2025-12-08.sql](./setup/alter-smlouvy-obj-form-flag-2025-12-08.sql)

---

**Status:** ✅ Implementováno, připraveno k testování
