# � IMPLEMENTAČNÍ PLÁN - Workflow rozšíření + Fakturace

> **Datum:** 26. října 2025  
> **Projekt:** r-app-zzs-eeo-25  
> **Typ:** Breaking Changes + Nová funkcionalita  
> **Status:** Breaking changes ✅ HOTOVO | Implementace workflow 🔄

---

## � POROVNÁNÍ: BE požadavky vs. Návrh Fakturace

### ✅ SHODA - Co se shoduje:

| Aspekt | BE Požadavky | Návrh Fakturace | Status |
|--------|--------------|-----------------|--------|
| **Pořadí workflow** | REGISTR → FAKTURA → VĚCNÁ SPRÁVNOST → DOKONČENÍ | Odpovídá! | ✅ SHODNÉ |
| **Pole fakturace** | `fakturant_id`, `dt_faktura_pridana` | Sekce "7) Fakturace" s tabulkou `25a_objednavky_faktury` | ✅ KOMPATIBILNÍ |
| **Věcná správnost** | `potvrdil_vecnou_spravnost_id`, `dt_potvrzeni_vecne_spravnosti` | Není v návrhu → přidáno | ✅ DOPLNĚNO |
| **Breaking change** | `potvrdil_id` → `dodavatel_potvrdil_id` | Není v návrhu → aplikováno | ✅ OPRAVENO |

---

## 🔄 FINÁLNÍ WORKFLOW POŘADÍ

```
1. VYTVOŘENÍ
   └─ uzivatel_id, dt_vytvoreni

2. SCHVÁLENÍ
   └─ schvalovatel_id, dt_schvaleni

3. ODESLÁNÍ
   └─ odesilatel_id, dt_odeslani

4. ZVEŘEJNĚNÍ
   ├─ dt_zverejneni (plánované)
   ├─ zverejnil_id (kdo skutečně zveřejnil) 🆕
   └─ dt_zverejneni_potvrzeni (kdy potvrzeno) 🆕

5. POTVRZENÍ DODAVATELEM
   ├─ dt_akceptace
   └─ dodavatel_potvrdil_id (PŘEJMENOVÁNO z potvrdil_id) 🔄

6. REGISTR SMLUV
   ├─ registr_cislo
   ├─ registr_castka
   └─ registr_poznamka

7. FAKTURACE 📄
   ├─ fakturant_id (základní tracking - kdo přidal první fakturu)
   ├─ dt_faktura_pridana (kdy přidána první)
   └─ 25a_objednavky_faktury (samostatná tabulka s detaily faktur)
      ├─ fa_dorucena (ANO/NE)
      ├─ fa_castka (POVINNÉ)
      ├─ fa_cislo_vema (POVINNÉ)
      ├─ fa_stredisko (volitelné)
      └─ fa_poznamka (volitelné)

8. VĚCNÁ SPRÁVNOST ✅ 🆕
   ├─ potvrdil_vecnou_spravnost_id (kdo potvrdil)
   └─ dt_potvrzeni_vecne_spravnosti (kdy potvrzeno)

9. DOKONČENÍ
   ├─ dokoncil_id
   ├─ dt_dokonceni
   └─ dokonceni_poznamka
```

---

## 🎯 IMPLEMENTAČNÍ PRIORITY

### 🔴 KRITICKÉ (Breaking Changes) - HOTOVO ✅
- [x] Přejmenovat `potvrdil_id` → `dodavatel_potvrdil_id`
- [x] Přidat pole `zverejnil_id`, `dt_zverejneni_potvrzeni`
- [x] Přidat pole `potvrdil_vecnou_spravnost_id`, `dt_potvrzeni_vecne_spravnosti`
- [x] Aktualizovat načítání z DB (řádek 6905-6920)

### 🟡 VYSOKÁ PRIORITA - Sekce workflow
1. **Sekce "6) Registr smluv"** - Existuje, ověřit správnost
2. **Sekce "7) Fakturace"** - Aktivovat a implementovat (viz dokumentace)
3. **Sekce "8) Věcná správnost"** - NOVÁ, vytvořit
4. **Sekce "9) Dokončení"** - Existuje, ověřit správnost

### 🟢 STŘEDNÍ PRIORITA - UI komponenty
1. Aktivovat sekci Fakturace (změnit `{false &&` na `{shouldShowFakturace() &&`)
2. Vytvořit komponenty fakturace (Form, Card, List)
3. Vytvořit sekci "8) Kontrola" (Věcná správnost)
4. Aktualizovat workflow timeline zobrazení

---

---

## 📋 DETAILNÍ PLÁN IMPLEMENTACE

### FÁZE 1: Breaking Changes ✅ HOTOVO

#### 1.1 Přejmenování pole `potvrdil_id` → `dodavatel_potvrdil_id`
```javascript
✅ Řádek 5752: Ukládání do DB
✅ Řádek 5769: Debug log
✅ Řádek 5857: API payload
✅ Řádek 6912: Načítání z DB (OPRAVENO)
```

#### 1.2 Přidání nových workflow polí
```javascript
✅ zverejnil_id - Kdo zveřejnil
✅ dt_zverejneni_potvrzeni - Kdy potvrzeno zveřejnění
✅ potvrdil_vecnou_spravnost_id - Kdo potvrdil věcnou správnost
✅ dt_potvrzeni_vecne_spravnosti - Kdy potvrzena
```

---

### FÁZE 2: Sekce "7) Fakturace" 📄

#### 2.1 Aktivovat sekci (OrderForm25.js, řádek ~16536)
```javascript
// ZMĚNIT Z:
{false && formData.dodavatel_zpusob_potvrzeni?.potvrzeni === 'ANO' && (

// NA:
{shouldShowFakturace() && (
```

#### 2.2 Přidat helper funkci
```javascript
const shouldShowFakturace = useCallback(() => {
  if (!isEditMode || !orderId) return false;
  
  const stav = formData.stav_schvaleni_kod;
  
  // Zobrazit po POTVRZENA (podle obrázku a BE požadavků)
  return ['POTVRZENA', 'ROZPRACOVANA', 'DOKONCENA'].includes(stav);
}, [isEditMode, orderId, formData.stav_schvaleni_kod]);
```

#### 2.3 Nahradit obsah sekce
```javascript
<SectionContent collapsed={sectionStates.fakturace}>
  <FakturyList 
    objednavkaId={orderId}
    maxCenaObjednavky={formData.max_cena_s_dph}
  />
</SectionContent>
```

#### 2.4 Vytvořit komponenty (podle `WORKFLOW-FAKTURACE-TECH-SPEC.md`)
```
src/components/
├── FakturaForm.js      - Formulář pro fakturu
├── FakturaCard.js      - Karta s fakturou  
└── FakturyList.js      - Seznam faktur
```

#### 2.5 Přidat API funkce (`src/services/api25orders.js`)
```javascript
export async function getFaktury25({ token, username, objednavkaId })
export async function createFaktura25({ token, username, fakturaData })
export async function updateFaktura25({ token, username, fakturaId, fakturaData })
export async function deleteFaktura25({ token, username, fakturaId })
```

#### 2.6 Vytvořit validační utils
```
src/utils/fakturaValidation.js
├── validateFaktura()
├── checkFakturaAmountDeviation()
└── formatCurrency()
```

---

### FÁZE 3: Sekce "8) Kontrola" (Věcná správnost) ✅ NOVÁ

#### 3.1 Přidat sekci do OrderForm25.js (po sekci Fakturace)
```javascript
{/* Sekce: Kontrola - Věcná správnost */}
{shouldShowVecnaSpravnost() && (
  <FormSection>
    <SectionHeader 
      sectionTheme={getSectionTheme('kontrola')} 
      isActive={isSectionActive('kontrola')}
    >
      <SectionTitle sectionTheme={getSectionTheme('kontrola')}>
        <SectionIcon sectionTheme={getSectionTheme('kontrola')}>
          <CheckCircle />
        </SectionIcon>
        8) Kontrola - Věcná správnost
      </SectionTitle>
      <CollapseIcon 
        collapsed={sectionStates.kontrola} 
        sectionTheme={getSectionTheme('kontrola')}
        onClick={() => toggleSection('kontrola')}
        style={{ cursor: 'pointer' }}
      >
        <FontAwesomeIcon icon={faChevronUp} />
      </CollapseIcon>
    </SectionHeader>
    
    <SectionContent collapsed={sectionStates.kontrola}>
      <InfoBox>
        <strong>ℹ️ Věcná správnost:</strong> Potvrzení, že dodané zboží/služba 
        odpovídá objednávce a je v pořádku.
      </InfoBox>
      
      <FormRow>
        <FormGroup data-custom-select>
          <Label>KDO POTVRDIL VĚCNOU SPRÁVNOST</Label>
          <StableCustomSelect
            value={formData.potvrdil_vecnou_spravnost_id || ''}
            onChange={(selectedValue) => handleInputChange('potvrdil_vecnou_spravnost_id', selectedValue)}
            options={allUsers}
            placeholder="Vyberte uživatele..."
            disabled={loadingUsers}
            field="potvrdil_vecnou_spravnost"
            loading={loadingUsers}
            icon={<User />}
            getOptionLabel={getOptionLabel}
            getOptionValue={(option) => option.id || option.user_id}
          />
        </FormGroup>
        
        <FormGroup>
          <Label>DATUM POTVRZENÍ</Label>
          <InputWithIcon hasIcon>
            <Calendar />
            <Input 
              type="date"
              name="dt_potvrzeni_vecne_spravnosti"
              value={formData.dt_potvrzeni_vecne_spravnosti || ''}
              onChange={(e) => handleInputChange('dt_potvrzeni_vecne_spravnosti', e.target.value)}
              hasIcon
            />
          </InputWithIcon>
        </FormGroup>
      </FormRow>
      
      {formData.potvrdil_vecnou_spravnost_id && formData.dt_potvrzeni_vecne_spravnosti && (
        <SuccessMessage>
          ✅ Věcná správnost byla potvrzena uživatelem{' '}
          {getUserName(formData.potvrdil_vecnou_spravnost_id)}{' '}
          dne {prettyDate(formData.dt_potvrzeni_vecne_spravnosti)}
        </SuccessMessage>
      )}
    </SectionContent>
  </FormSection>
)}
```

#### 3.2 Přidat helper funkci
```javascript
const shouldShowVecnaSpravnost = useCallback(() => {
  if (!isEditMode || !orderId) return false;
  
  const stav = formData.stav_schvaleni_kod;
  
  // Zobrazit po přidání faktury (nebo POTVRZENA+)
  // Podle workflow: REGISTR → FAKTURA → VĚCNÁ SPRÁVNOST
  const hasInvoice = formData.fakturant_id || formData.dt_faktura_pridana;
  
  return ['POTVRZENA', 'ROZPRACOVANA', 'DOKONCENA'].includes(stav) && hasInvoice;
}, [isEditMode, orderId, formData.stav_schvaleni_kod, formData.fakturant_id, formData.dt_faktura_pridana]);
```

#### 3.3 Přidat do sectionStates
```javascript
const [sectionStates, setSectionStates] = useState({
  objednatel: false,
  objednavka: false,
  dodavatel: false,
  polozky: false,
  prilohy: false,
  potvrzeni_objednavky: false,
  registr_smluv: false,
  prubeh_objednavky: false,
  dodaci_informace: false,
  fakturace: false,
  kontrola: false,        // 🆕 NOVÉ
  dokonceni: false,
  storno_detail: false
});
```

#### 3.4 Přidat do getSectionTheme
```javascript
const getSectionTheme = (sectionName) => {
  const themes = {
    'objednatel': 'section-blue',
    // ... ostatní sekce ...
    'fakturace': 'section-blue',
    'kontrola': 'section-green',  // 🆕 NOVÉ
    'dokonceni': 'section-gray',
    'storno_detail': 'section-red'
  };
  return themes[sectionName] || 'section-default';
};
```

---

### FÁZE 4: Aktualizovat initializaci formData

#### 4.1 Přidat defaultní hodnoty (řádek ~3500)
```javascript
const getInitialFormData = () => ({
  // ... existující pole ...
  
  // Workflow tracking pole - AKTUALIZOVANÉ
  odesilatel_id: null,
  dodavatel_potvrdil_id: null,      // 🔄 PŘEJMENOVÁNO
  zverejnil_id: null,                // 🆕
  dt_zverejneni_potvrzeni: '',       // 🆕
  potvrdil_vecnou_spravnost_id: null, // 🆕
  dt_potvrzeni_vecne_spravnosti: '', // 🆕
  fakturant_id: null,
  dt_faktura_pridana: '',
  dokoncil_id: null,
  dt_dokonceni: '',
  dokonceni_poznamka: ''
});
```

---

### FÁZE 5: Aktualizovat workflow timeline

#### 5.1 Rozšířit zobrazení workflow (pokud existuje timeline komponenta)
```javascript
const renderWorkflowTimeline = () => (
  <Timeline>
    {/* Vytvoření */}
    <TimelineItem>
      <User /> {getUserName(formData.uzivatel_id)} vytvořil{' '}
      <DateTime>{prettyDate(formData.dt_vytvoreni)}</DateTime>
    </TimelineItem>
    
    {/* Schválení */}
    {formData.schvalovatel_id && (
      <TimelineItem>
        <CheckCircle /> {getUserName(formData.schvalovatel_id)} schválil{' '}
        <DateTime>{prettyDate(formData.dt_schvaleni)}</DateTime>
      </TimelineItem>
    )}
    
    {/* Odeslání */}
    {formData.odesilatel_id && (
      <TimelineItem>
        <Send /> {getUserName(formData.odesilatel_id)} odeslal dodavateli{' '}
        <DateTime>{prettyDate(formData.dt_odeslani)}</DateTime>
      </TimelineItem>
    )}
    
    {/* Zveřejnění - ROZŠÍŘENO */}
    {formData.dt_zverejneni && (
      <TimelineItem>
        <Calendar /> Plánované zveřejnění{' '}
        <DateTime>{prettyDate(formData.dt_zverejneni)}</DateTime>
      </TimelineItem>
    )}
    {formData.zverejnil_id && formData.dt_zverejneni_potvrzeni && (
      <TimelineItem className="confirmed">
        <CheckCircle /> {getUserName(formData.zverejnil_id)} zveřejnil{' '}
        <DateTime>{prettyDate(formData.dt_zverejneni_potvrzeni)}</DateTime>
      </TimelineItem>
    )}
    
    {/* Potvrzení dodavatelem - PŘEJMENOVÁNO */}
    {formData.dodavatel_potvrdil_id && (
      <TimelineItem className="confirmed">
        <CheckCircle /> Dodavatel potvrdil ({getUserName(formData.dodavatel_potvrdil_id)}){' '}
        <DateTime>{prettyDate(formData.dt_akceptace)}</DateTime>
      </TimelineItem>
    )}
    
    {/* Registr smluv */}
    {formData.registr_cislo && (
      <TimelineItem>
        <FileText /> Zápis do registru smluv: {formData.registr_cislo}{' '}
        {formData.registr_castka && `(${formatCurrency(formData.registr_castka)})`}
      </TimelineItem>
    )}
    
    {/* Fakturace */}
    {formData.fakturant_id && (
      <TimelineItem>
        <Calculator /> {getUserName(formData.fakturant_id)} přidal fakturu{' '}
        <DateTime>{prettyDate(formData.dt_faktura_pridana)}</DateTime>
      </TimelineItem>
    )}
    
    {/* Věcná správnost - NOVÉ */}
    {formData.potvrdil_vecnou_spravnost_id && (
      <TimelineItem className="confirmed">
        <CheckCircle /> {getUserName(formData.potvrdil_vecnou_spravnost_id)} potvrdil věcnou správnost{' '}
        <DateTime>{prettyDate(formData.dt_potvrzeni_vecne_spravnosti)}</DateTime>
      </TimelineItem>
    )}
    
    {/* Dokončení */}
    {formData.dokoncil_id && (
      <TimelineItem className="completed">
        <Flag /> {getUserName(formData.dokoncil_id)} dokončil objednávku{' '}
        <DateTime>{prettyDate(formData.dt_dokonceni)}</DateTime>
        {formData.dokonceni_poznamka && (
          <Note>{formData.dokonceni_poznamka}</Note>
        )}
      </TimelineItem>
    )}
  </Timeline>
);
```

---

### FÁZE 6: Backend API Endpointy

#### 6.1 Faktury API (Backend tým)
```php
POST /api.eeo/faktury/list       // Seznam faktur k objednávce
POST /api.eeo/faktury/create     // Přidat fakturu
POST /api.eeo/faktury/update     // Upravit fakturu
POST /api.eeo/faktury/delete     // Smazat fakturu (soft delete)
```

#### 6.2 Aktualizace Orders API
```php
// Zajistit, že PUT/PATCH endpointy podporují nová pole:
- dodavatel_potvrdil_id (místo potvrdil_id)
- zverejnil_id
- dt_zverejneni_potvrzeni
- potvrdil_vecnou_spravnost_id
- dt_potvrzeni_vecne_spravnosti
```

---

## 📊 ČASOVÝ ODHAD IMPLEMENTACE

| Fáze | Úkol | Čas | Priorita |
|------|------|-----|----------|
| 1 | Breaking changes | ✅ HOTOVO | 🔴 KRITICKÉ |
| 2 | Sekce Fakturace | 8-10 hodin | 🟡 VYSOKÁ |
| 3 | Sekce Věcná správnost | 2-3 hodiny | 🟡 VYSOKÁ |
| 4 | Aktualizace formData | 1 hodina | � VYSOKÁ |
| 5 | Workflow timeline | 2 hodiny | 🟢 STŘEDNÍ |
| 6 | Backend API faktury | 4-6 hodin | 🟡 VYSOKÁ |
| **CELKEM** | | **17-22 hodin** | |

---

## ✅ CHECKLIST IMPLEMENTACE

### 🔴 KRITICKÉ (HOTOVO)
- [x] Přejmenovat `potvrdil_id` → `dodavatel_potvrdil_id`
- [x] Přidat nová workflow pole
- [x] Aktualizovat načítání z DB

### 🟡 VYSOKÁ PRIORITA
- [ ] Backend: Implementovat 4 faktury endpointy
- [ ] Frontend: Aktivovat sekci Fakturace
- [ ] Frontend: Vytvořit komponenty fakturace (Form, Card, List)
- [ ] Frontend: Přidat API funkce pro faktury
- [ ] Frontend: Vytvořit sekci "8) Kontrola"
- [ ] Frontend: Aktualizovat formData init

### 🟢 STŘEDNÍ PRIORITA
- [ ] Frontend: Aktualizovat workflow timeline
- [ ] Frontend: Přidat validační utils pro faktury
- [ ] Frontend: Otestovat celý workflow
- [ ] Documentation: Aktualizovat dokumentaci

---

## 🎯 POŘADÍ KROKŮ PRO IMPLEMENTACI

### 1️⃣ TERAZ (HOTOVO) ✅
- ✅ Opravit breaking changes
- ✅ Přidat nová pole do databázového načítání

### 2️⃣ BACKEND PARALELNĚ
```
Týden 1:
├─ Den 1-2: Implementovat faktury API (4 endpointy)
├─ Den 3: Testování v Postman
└─ Den 4: Deploy a informovat FE tým
```

### 3️⃣ FRONTEND POSTUPNĚ
```
Týden 1-2:
├─ Den 1: Vytvořit API service funkce (api25orders.js)
├─ Den 2: Vytvořit validační utils (fakturaValidation.js)
├─ Den 3-4: Komponenta FakturaForm.js
├─ Den 5: Komponenta FakturaCard.js
├─ Den 6: Komponenta FakturyList.js
├─ Den 7: Integrace do OrderForm25.js (aktivovat sekci)
├─ Den 8: Sekce "8) Kontrola" (Věcná správnost)
├─ Den 9: Aktualizovat workflow timeline
└─ Den 10: Testování
```

### 4️⃣ TESTOVÁNÍ
```
Týden 3:
├─ Unit testy (validace)
├─ Integration testy (API)
├─ E2E testy (workflow)
├─ Edge cases
└─ Performance
```

---

## 📚 REFERENCE DOKUMENTACE

### Vytvořené dokumenty:
1. `WORKFLOW-FAKTURACE-README.md` - Hlavní README
2. `WORKFLOW-FAKTURACE-INDEX.md` - Index dokumentů
3. `WORKFLOW-FAKTURACE-QUICK.md` - Rychlý přehled
4. `WORKFLOW-FAKTURACE-NAVRH.md` - Kompletní návrh
5. **`WORKFLOW-FAKTURACE-TECH-SPEC.md`** ⭐ - Kompletní kód pro implementaci
6. `WORKFLOW-FAKTURACE-DIAGRAMS.md` - Vizuální diagramy
7. `WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md` - Meeting checklist

### Tento dokument:
8. **`WORKFLOW-IMPLEMENTATION-PLAN.md`** - Implementační plán

---

## 🚨 DŮLEŽITÉ POZNÁMKY

### ⚠️ Breaking Changes
- **Aplikace nebude fungovat** dokud není `potvrdil_id` přejmenováno všude!
- Zkontrolovat všechny komponenty, které používají `potvrdil_id`
- Aktualizovat TypeScript typy, pokud existují

### 📐 Workflow pořadí (podle BE požadavků)
```
1. Vytvoření → 2. Schválení → 3. Odeslání → 4. Zveřejnění 
→ 5. Potvrzení dodavatelem → 6. REGISTR → 7. FAKTURA 
→ 8. VĚCNÁ SPRÁVNOST → 9. DOKONČENÍ
```

### 🔗 Vazby mezi sekcemi
- **Fakturace** se zobrazí po POTVRZENA
- **Věcná správnost** se zobrazí po přidání faktury
- **Dokončení** se zobrazí po věcné správnosti

---

**Implementační plán připraven! 🚀 Můžeme začít s implementací!** 
    objednavkaId={orderId}
    maxCenaObjednavky={formData.max_cena_s_dph}
  />
</SectionContent>
```

**Akce:**
- [ ] Import FakturyList
- [ ] Přidat shouldShowFakturace funkci
- [ ] Aktivovat sekci (odebrat `false &&`)
- [ ] Nahradit obsah sekce

#### 3.6 Testování (2-4 hodiny)
- [ ] Unit testy (validace)
- [ ] Integration testy (API)
- [ ] E2E test (celý workflow)
- [ ] Manuální testování:
  - [ ] Přidat fakturu
  - [ ] Upravit fakturu
  - [ ] Smazat fakturu
  - [ ] Warning při vysoké částce
  - [ ] Prázdný seznam
  - [ ] Více faktur
  - [ ] Chyby API

---

## ⏱️ ČASOVÝ HARMONOGRAM

### Sprint 1: Breaking Changes (1 den)
```
Den 1:
├─ Ráno (2h):   FÁZE 1 - Breaking changes (potvrdil_id)
└─ Odpoledne (2h): FÁZE 2 - Nová workflow pole
   
Total: 4-6 hodin
```

### Sprint 2: Fakturace Backend (1 den)
```
Den 2:
├─ Backend tým: API endpointy (4-6h)
└─ Frontend: Příprava (API service, utils) (2h)

Total: 6-8 hodin
```

### Sprint 3: Fakturace Frontend (2 dny)
```
Den 3:
├─ Komponenty (FakturaForm, Card) (4-5h)
└─ Komponenta (FakturyList) (3-4h)

Den 4:
├─ Integrace do OrderForm25 (1-2h)
└─ Testování (2-4h)

Total: 10-15 hodin
```

### **CELKEM: 20-29 hodin (3-4 dny práce)**

---

## 🎯 PRIORITIZACE

### 🔴 URGENTNÍ (Dnes/Zítra)
1. **FÁZE 1:** Breaking changes - přejmenování `potvrdil_id`
   - Bez tohoto aplikace NEBUDE FUNGOVAT!
   - Čas: 2-3 hodiny

### 🟡 VYSOKÁ (Tento týden)
2. **FÁZE 2:** Nová workflow pole
   - Rozšíření trackingu workflow
   - Čas: 2-3 hodiny

### 🟢 STŘEDNÍ (Příští týden)
3. **FÁZE 3:** Fakturace
   - Nová funkcionalita
   - Čas: 14-20 hodin

---

## 📋 ROZHODNUTÍ K MEETING

Před FÁZE 3 (Fakturace) je potřeba rozhodnout:

### ❓ OTÁZKY:
1. **Kdy zobrazit sekci fakturace?**
   - [ ] Varianta A: POTVRZENA + DOKONCENA (doporučeno)
   - [ ] Varianta B: CEKA_POTVRZENI + ...

2. **Více faktur k objednávce?**
   - [ ] ANO (doporučeno - DB podporuje)
   - [ ] NE

3. **Validace částky?**
   - [ ] WARNING (doporučeno)
   - [ ] ERROR

4. **Oprávnění?**
   - [ ] Autor + Garant + Admin (doporučeno)
   - [ ] Kdokoliv

**Reference:** `WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md`

---

## 🧪 TESTOVACÍ PLÁN

### Test Suite 1: Breaking Changes
```javascript
describe('Breaking Changes - potvrdil_id', () => {
  it('should save dodavatel_potvrdil_id correctly', () => {});
  it('should load dodavatel_potvrdil_id from DB', () => {});
  it('should display dodavatel_potvrdil_id in UI', () => {});
});
```

### Test Suite 2: Nová Workflow Pole
```javascript
describe('New Workflow Fields', () => {
  it('should save zverejnil_id', () => {});
  it('should save potvrdil_vecnou_spravnost_id', () => {});
  it('should display workflow timeline', () => {});
});
```

### Test Suite 3: Fakturace
```javascript
describe('Fakturace', () => {
  it('should show section when POTVRZENA', () => {});
  it('should add new faktura', () => {});
  it('should edit faktura', () => {});
  it('should delete faktura', () => {});
  it('should warn when amount > max_cena', () => {});
});
```

---

## 📚 DOKUMENTACE

### Vytvořené dokumenty:
- ✅ `WORKFLOW-FAKTURACE-INDEX.md` - Index
- ✅ `WORKFLOW-FAKTURACE-QUICK.md` - Rychlý přehled
- ✅ `WORKFLOW-FAKTURACE-NAVRH.md` - Návrh
- ✅ `WORKFLOW-FAKTURACE-TECH-SPEC.md` - Technická spec
- ✅ `WORKFLOW-FAKTURACE-DIAGRAMS.md` - Diagramy
- ✅ `WORKFLOW-FAKTURACE-MEETING-CHECKLIST.md` - Meeting
- ✅ `WORKFLOW-FAKTURACE-README.md` - README

### Tento dokument:
- 🆕 `WORKFLOW-IMPLEMENTATION-PLAN.md` - Implementační plán

---

## 🚀 AKCE - Co dělat TEĎ?

### 1. OKAMŽITĚ (dnes):
```bash
# 1. Commit současného stavu
git add .
git commit -m "Before breaking changes - potvrdil_id rename"

# 2. Vytvoř novou branch
git checkout -b feature/workflow-breaking-changes

# 3. Implementuj FÁZE 1
# - Přejmenuj potvrdil_id → dodavatel_potvrdil_id
# - Test
# - Commit
```

### 2. ZÍTRA:
```bash
# 1. Merge FÁZE 1 do master
git checkout master
git merge feature/workflow-breaking-changes

# 2. Implementuj FÁZE 2
git checkout -b feature/workflow-new-fields
# - Přidej nová pole
# - Test
# - Commit
```

### 3. PŘÍŠTÍ TÝDEN:
```bash
# 1. Meeting o fakturaci (použij checklist)
# 2. Backend API endpointy
# 3. Frontend implementace
git checkout -b feature/fakturace
```

---

## ✅ SUCCESS CRITERIA

Projekt bude hotový, když:

### FÁZE 1:
- ✅ `potvrdil_id` přejmenováno na `dodavatel_potvrdil_id` VŠUDE
- ✅ Aplikace funguje bez chyb
- ✅ Ukládání a načítání objednávek OK

### FÁZE 2:
- ✅ Nová pole uložena do DB
- ✅ Nová pole načítána z DB
- ✅ Workflow timeline zobrazuje nová pole

### FÁZE 3:
- ✅ Všechny 4 API endpointy fungují
- ✅ Lze přidat/upravit/smazat fakturu
- ✅ Validace funguje
- ✅ Warning při vysoké částce
- ✅ UI odpovídá návrhu

---

**Implementační plán připraven! Můžeme začít! 🚀**

**PRIORITA:** Začni FÁZE 1 OKAMŽITĚ - breaking changes!
