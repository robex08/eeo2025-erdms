# 🔄 ZMĚNA ARCHITEKTURY: Vazba Smlouvy ↔ Objednávky

**Datum:** 2025-11-XX  
**Důvod změny:** Využití existující infrastruktury dynamického financování v OrderForm

---

## ⚠️ CO SE ZMĚNILO

### ❌ PŮVODNÍ DESIGN (NESPRÁVNÝ)

```
┌─────────────────┐          ┌─────────────────────────┐          ┌────────────────────┐
│  25_smlouvy     │          │ 25_smlouvy_objednavky   │          │  25a_objednavky    │
│                 │          │                         │          │                    │
│  id (PK)        │◄─────────┤  smlouva_id (FK)        │──────────►│  id (PK)           │
│  cislo_smlouvy  │          │  objednavka_id (FK)     │          │  ev_cislo          │
│  ...            │          │  castka_s_dph           │          │  ...               │
└─────────────────┘          │  dt_prirazeni           │          └────────────────────┘
                             └─────────────────────────┘
                             
                             Vazba M:N přes junction table
```

**Problémy:**
- ❌ Nepotřebná vazební tabulka
- ❌ Samostatný endpoint pro přiřazování objednávek
- ❌ Komplikovanější triggers na 2 tabulkách
- ❌ Duplicitní UI pro přiřazování

---

### ✅ NOVÝ DESIGN (SPRÁVNÝ)

```
┌─────────────────┐                                  ┌────────────────────┐
│  25_smlouvy     │                                  │  25a_objednavky    │
│                 │                                  │                    │
│  cislo_smlouvy  │◄─────────────────────────────────┤  cislo_smlouvy     │
│  (UNIQUE)       │    Vazba přes pole              │  (nový/existující) │
│  ...            │    v objednávce                  │  ...               │
└─────────────────┘                                  └────────────────────┘

                             Vazba 1:N přes přímé pole
```

**Výhody:**
- ✅ Jednodušší struktura (bez junction table)
- ✅ Využití existujícího UI v OrderForm (dynamické financování)
- ✅ Triggery pouze na 1 tabulce (objednávky)
- ✅ Přiřazení smlouvy během vytváření/editace objednávky
- ✅ Konzistentní s ostatními zdroji financování

---

## 📋 JAK TO FUNGUJE

### 1. **V OrderForm (frontend)**

Když uživatel vytváří/edituje objednávku:

```javascript
// Formulář obsahuje dynamické pole:
<Select label="Zdroj financování">
  <option>Provozní rozpočet</option>
  <option>Investiční rozpočet</option>
  <option>Smlouva</option>  ← Při výběru se zobrazí další pole
  <option>Dotace</option>
</Select>

// Pokud vybere "Smlouva":
{zdrojFinancovani === 'Smlouva' && (
  <Select 
    label="Číslo smlouvy" 
    value={cisloSmlouvy}
    onChange={(e) => setCisloSmlouvy(e.target.value)}
  >
    {smlouvyList.map(s => (
      <option key={s.cislo_smlouvy} value={s.cislo_smlouvy}>
        {s.cislo_smlouvy} - {s.nazev_dodavatele} ({formatCurrency(s.zbyva)} zbývá)
      </option>
    ))}
  </Select>
)}
```

### 2. **V databázi (backend)**

Při uložení objednávky:

```sql
-- Uložení objednávky s číslem smlouvy
INSERT INTO 25a_objednavky (
  ev_cislo, 
  predmet, 
  max_cena_s_dph,
  cislo_smlouvy,  ← Klíčové pole!
  ...
) VALUES (
  '2025/001',
  'Konzultační služby',
  50000.00,
  'S-147/750309/26/23',  ← Vazba na smlouvu
  ...
);

-- Trigger automaticky přepočítá čerpání:
UPDATE 25_smlouvy
SET 
  cerpano_celkem = (
    SELECT SUM(max_cena_s_dph) 
    FROM 25a_objednavky 
    WHERE cislo_smlouvy = 'S-147/750309/26/23'
  ),
  ...
WHERE cislo_smlouvy = 'S-147/750309/26/23';
```

### 3. **Automatický přepočet čerpání**

```sql
-- Trigger na INSERT objednávky
CREATE TRIGGER trg_objednavka_smlouva_insert
AFTER INSERT ON 25a_objednavky
FOR EACH ROW
BEGIN
  IF NEW.cislo_smlouvy IS NOT NULL THEN
    -- Přepočítat čerpání smlouvy
    UPDATE 25_smlouvy s
    SET 
      s.cerpano_celkem = (
        SELECT SUM(max_cena_s_dph) 
        FROM 25a_objednavky 
        WHERE cislo_smlouvy = NEW.cislo_smlouvy
      ),
      s.zbyva = s.hodnota_s_dph - s.cerpano_celkem,
      s.procento_cerpani = (s.cerpano_celkem / s.hodnota_s_dph) * 100
    WHERE s.cislo_smlouvy = NEW.cislo_smlouvy;
  END IF;
END;

-- Analogicky pro UPDATE a DELETE
```

---

## 🔧 CO SE MUSÍ ZMĚNIT

### Backend

#### ✅ **SQL Schema (DONE)**
- ❌ Odstranit `CREATE TABLE 25_smlouvy_objednavky`
- ✅ Přidat `ALTER TABLE 25a_objednavky ADD COLUMN cislo_smlouvy`
- ✅ Změnit triggery z `25_smlouvy_objednavky` na `25a_objednavky`
- ✅ Upravit stored procedure pro přepočet

#### ✅ **API Endpoints (DONE)**
- ✅ Upravit `/list` - JOIN na objednávky místo junction table
- ✅ Upravit `/detail` - agregace z objednávek
- ❌ **ZRUŠIT** `/prirad-objednavku` endpoint (deprecated!)
- ✅ Upravit `/prepocet-cerpani` - agregace z objednávek

### Frontend

#### 🔄 **OrderForm (TODO)**
```javascript
// src/components/orders/OrderForm25.js

// 1. Přidat state pro smlouvy
const [smlouvyList, setSmlouvyList] = useState([]);
const [selectedSmlouva, setSelectedSmlouva] = useState(null);

// 2. Načíst seznam aktivních smluv při mount
useEffect(() => {
  if (zdrojFinancovani === 'Smlouva') {
    fetchAktivniSmlouvy();
  }
}, [zdrojFinancovani]);

// 3. Zobrazit SELECT při výběru zdroje "Smlouva"
{zdrojFinancovani === 'Smlouva' && (
  <FormControl fullWidth margin="normal">
    <InputLabel>Číslo smlouvy</InputLabel>
    <Select
      value={formData.cislo_smlouvy || ''}
      onChange={(e) => {
        const smlouva = smlouvyList.find(s => s.cislo_smlouvy === e.target.value);
        setSelectedSmlouva(smlouva);
        setFormData({
          ...formData,
          cislo_smlouvy: e.target.value
        });
      }}
    >
      {smlouvyList.map(smlouva => (
        <MenuItem key={smlouva.cislo_smlouvy} value={smlouva.cislo_smlouvy}>
          {smlouva.cislo_smlouvy} - {smlouva.nazev_dodavatele}
          <small style={{marginLeft: 10, color: 'gray'}}>
            (Zbývá: {formatCurrency(smlouva.zbyva)})
          </small>
        </MenuItem>
      ))}
    </Select>
    
    {/* Validace limitu */}
    {selectedSmlouva && formData.max_cena_s_dph > selectedSmlouva.zbyva && (
      <FormHelperText error>
        ⚠️ Objednávka překračuje zbývající částku smlouvy!
      </FormHelperText>
    )}
  </FormControl>
)}
```

#### ✅ **DictionariesNew.js (DONE)**
- ✅ Žádná změna! Seznam smluv a import funguje stejně
- ✅ Detail smlouvy bude zobrazovat objednávky přes API

---

## 📊 POROVNÁNÍ

| Aspekt | Původní design | Nový design |
|--------|----------------|-------------|
| **Počet tabulek** | 3 (smlouvy, objednávky, vazba) | 2 (smlouvy, objednávky) |
| **Triggery** | 3 na vazební tabulce | 3 na tabulce objednávek |
| **Endpointy** | 8 | 7 (jeden deprecated) |
| **UI pro přiřazení** | Nový formulář v číselníkách | Existující OrderForm |
| **SQL JOINs** | Přes vazební tabulku | Přímý JOIN na pole |
| **Složitost** | Vyšší | Nižší |
| **Konzistence** | Odlišné od ostatních zdrojů | Stejné jako dotace, rozpočty |

---

## ✅ CHECKLIST IMPLEMENTACE

### Backend (TODO)
- [ ] Spustit upravený SQL skript `SMLOUVY-DB-SCHEMA-MYSQL55.sql`
- [ ] Zkontrolovat, zda pole `cislo_smlouvy` v `25a_objednavky` již existuje
- [ ] Otestovat triggery (INSERT/UPDATE/DELETE objednávky se smlouvou)
- [ ] Implementovat 7 API endpointů (skip `/prirad-objednavku`)
- [ ] Otestovat agregaci čerpání přes `SELECT SUM() FROM 25a_objednavky WHERE cislo_smlouvy = ?`

### Frontend (TODO)
- [ ] Upravit `OrderForm25.js` - přidat SELECT pro smlouvy při zdroji "Smlouva"
- [ ] Načítat seznam aktivních smluv z API `/ciselniky/smlouvy/list`
- [ ] Validovat limity (objednávka nesmí překročit zbývající částku smlouvy)
- [ ] Implementovat SmlouvyTab v `DictionariesNew.js`
- [ ] Testovat workflow: vytvoření smlouvy → vytvoření objednávky → kontrola čerpání

---

## 🎯 VÝSLEDEK

✅ **Jednodušší architektura**  
✅ **Využití existujícího UI**  
✅ **Méně kódu k údržbě**  
✅ **Konzistentní UX s ostatními zdroji financování**  
✅ **Rychlejší implementace** (odhadovaný čas snížen o 1-2 dny)

---

## 📞 KONTAKT

Pokud máte dotazy k této změně:
- **Frontend:** Kontaktujte frontend tým  
- **Backend:** Zkontrolujte `SMLOUVY-BACKEND-API-SPECIFICATION.md`  
- **SQL:** Viz `SMLOUVY-DB-SCHEMA-MYSQL55.sql`

---

_Dokumentováno: 2025-11-XX_  
_Autor: GitHub Copilot + RH_
