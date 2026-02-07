# 🆕 POČÁTEČNÍ STAV POKLADNY PRO NOVÝ ROK

**Datum:** 2. ledna 2026  
**Autor:** Backend & Frontend Team  
**Verze:** 1.0

---

## 📋 PŘEHLED ZMĚNY

Přidána možnost nastavit **počáteční stav pokladny pro nový rok**, který má přednost před automatickým převzetím koncového stavu z prosince předchozího roku.

---

## 🎯 BUSINESS LOGIKA

### ✅ Princip fungování:

1. **Pokud je `pocatecni_stav_rok` nastaven** (včetně hodnoty 0):
   - Použije se tato hodnota jako počáteční stav ledna
   - **NEČERPÁ SE** koncový stav z prosince předchozího roku

2. **Pokud je `pocatecni_stav_rok` NULL** (prázdné pole):
   - Standardní logika - převezme se koncový stav prosince předchozího roku
   - Funguje jako dříve (zpětná kompatibilita)

### 📅 DŮLEŽITÉ:

- ⚠️ **Týká se POUZE přechodu roku** (prosinec → leden)
- ✅ **NETÝKÁ SE měsíčních přechodů** (leden → únor, únor → březen...)
- ✅ Hodnota **0** je platná (pokladna začíná na nule)
- ✅ Hodnota **NULL** = automatický převod z prosince

---

## 🗄️ DATABÁZOVÉ ZMĚNY

### Nový sloupec v tabulce `25a_pokladny`:

```sql
ALTER TABLE 25a_pokladny 
ADD COLUMN pocatecni_stav_rok DECIMAL(10,2) DEFAULT NULL 
COMMENT 'Počáteční stav pokladny pro nový rok (pokud NULL, použije se převod z prosince)' 
AFTER aktivni;
```

**Vlastnosti:**
- Typ: `DECIMAL(10,2)` (max. 99 999 999,99 Kč)
- Default: `NULL` (automatický převod)
- Nullable: ANO
- Pozice: Za sloupcem `aktivni`

---

## 🔧 BACKEND ZMĚNY

### 1. Model: `CashboxModel.php`

#### Metoda `createCashbox()`:
```php
INSERT INTO 25a_pokladny (
    cislo_pokladny,
    nazev,
    kod_pracoviste,
    nazev_pracoviste,
    pocatecni_stav_rok,  // ← NOVÉ POLE
    ciselna_rada_vpd,
    // ...
)
```

**Logika:**
- Přijímá `$data['pocatecni_stav_rok']`
- Pokud je prázdný string nebo NULL → uloží NULL
- Pokud je číslo (včetně 0) → uloží hodnotu

#### Metoda `updateCashbox()`:
```php
UPDATE 25a_pokladny
SET
    nazev = ?,
    kod_pracoviste = ?,
    pocatecni_stav_rok = ?,  // ← NOVÉ POLE
    ciselna_rada_vpd = ?,
    // ...
WHERE id = ?
```

---

## 🎨 FRONTEND ZMĚNY

### 1. Komponenta: `CreateCashboxDialog.js`

**FormData rozšířeno:**
```javascript
const [formData, setFormData] = useState({
  cislo_pokladny: '',
  nazev: '',
  kod_pracoviste: '',
  nazev_pracoviste: '',
  pocatecni_stav_rok: '',  // ← NOVÉ POLE
  ciselna_rada_vpd: '',
  vpd_od_cislo: '1',
  ciselna_rada_ppd: '',
  ppd_od_cislo: '1',
  poznamka: ''
});
```

**UI pole:**
```jsx
<SectionTitle>
  <DollarSign size={16} />
  Počáteční stav roku
</SectionTitle>

<FormGroup>
  <Label>
    <DollarSign />
    Počáteční stav pokladny pro nový rok (volitelné)
  </Label>
  <Input
    type="number"
    step="0.01"
    value={formData.pocatecni_stav_rok}
    onChange={(e) => handleChange('pocatecni_stav_rok', e.target.value)}
    placeholder="Ponechte prázdné pro převod z prosince"
  />
  <HelpText>
    ⓘ Pokud zadáte hodnotu (včetně 0), použije se jako počáteční stav ledna.
    Pokud ponecháno prázdné, převezme se koncový stav z prosince předchozího roku.
  </HelpText>
</FormGroup>
```

**Umístění:**
- 📍 **NAD** VPD/PPD prefixy (podle požadavku)
- Vlastní sekce "Počáteční stav roku"

### 2. Komponenta: `EditCashboxDialog.js`

**Identické změny:**
- Pole `pocatecni_stav_rok` v `formData`
- UI pole na stejném místě (nad VPD/PPD)
- Načítání hodnoty z `cashbox.pocatecni_stav_rok`

**Payload při ukládání:**
```javascript
pocatecni_stav_rok: formData.pocatecni_stav_rok !== '' 
  ? parseFloat(formData.pocatecni_stav_rok) 
  : null
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### Test 1: Nová pokladna s počátečním stavem
1. Vytvořit novou pokladnu
2. Nastavit `pocatecni_stav_rok` = 5000
3. Vytvořit knihu pro leden 2026
4. ✅ Očekávaný výsledek: Počáteční stav = 5000 Kč

### Test 2: Nová pokladna bez počátečního stavu
1. Vytvořit novou pokladnu
2. Ponechat `pocatecni_stav_rok` prázdné (NULL)
3. Vytvořit knihu pro leden 2026
4. ✅ Očekávaný výsledek: Počáteční stav = koncový stav prosince 2025

### Test 3: Úprava existující pokladny
1. Upravit existující pokladnu
2. Nastavit `pocatecni_stav_rok` = 0
3. Vytvořit knihu pro leden 2026
4. ✅ Očekávaný výsledek: Počáteční stav = 0 Kč (i když prosinec měl 10 000 Kč)

### Test 4: Měsíční přechod (leden → únor)
1. Pokladna s `pocatecni_stav_rok` = 5000
2. Vytvořit knihu pro únor 2026
3. ✅ Očekávaný výsledek: Počáteční stav = koncový stav ledna (NE 5000!)
4. ✅ `pocatecni_stav_rok` ovlivňuje POUZE leden

---

## 📊 PŘÍKLADY POUŽITÍ

### Scénář A: Standard (převod z prosince)
```
Pokladna č. 100
pocatecni_stav_rok: NULL

Prosinec 2025: Koncový stav = 12 345,50 Kč
→ Leden 2026: Počáteční stav = 12 345,50 Kč ✅
```

### Scénář B: Nulování pokladny
```
Pokladna č. 101
pocatecni_stav_rok: 0

Prosinec 2025: Koncový stav = 50 000 Kč
→ Leden 2026: Počáteční stav = 0 Kč ✅
```

### Scénář C: Fixní počáteční stav
```
Pokladna č. 102
pocatecni_stav_rok: 10000

Prosinec 2025: Koncový stav = 8 500 Kč
→ Leden 2026: Počáteční stav = 10 000 Kč ✅
```

---

## ⚠️ DŮLEŽITÁ UPOZORNĚNÍ

1. **Jednou ročně:** Hodnota `pocatecni_stav_rok` se používá POUZE při vytváření knihy pro leden
2. **Nezasahuje měsíce:** Únor-prosinec stále čerpají z předchozího měsíce
3. **Zpětná kompatibilita:** Existující pokladny (pocatecni_stav_rok = NULL) fungují jako dříve
4. **Nula je platná:** Hodnota 0 znamená "začít na nule", ne "převzít z prosince"

---

## 🔗 SOUVISEJÍCÍ SOUBORY

### Frontend:
- `/apps/eeo-v2/client/src/components/cashbook/CreateCashboxDialog.js`
- `/apps/eeo-v2/client/src/components/cashbook/EditCashboxDialog.js`

### Backend:
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/CashboxModel.php`

### Databáze:
- Migrace: `ALTER TABLE 25a_pokladny ADD COLUMN pocatecni_stav_rok...`

---

## ✅ HOTOVO

Funkce je **plně implementována** a připravena k použití. 🎉
