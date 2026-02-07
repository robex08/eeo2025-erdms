# Logika přiřazení pokladny: Hlavní vs Zástupce

**Datum:** 4. ledna 2026  
**Verze:** 1.96b

---

## 🎯 Základní koncept

Každý uživatel může být přiřazen k **více pokladnám**, ale **pouze jedna** může být **hlavní**.

### Terminologie:
- **Hlavní pokladna** (`je_hlavni = 1`) - Primární pokladna uživatele
- **Zástupce** (`je_hlavni = 0`) - Sekundární pokladny, kde uživatel zastupuje nebo pomáhá

---

## 📊 Aktuální stav v DEV DB

```
Jaroslava Zahrádková Vavrochová:
  - 13 pokladen celkem
  - 1 hlavní: Pokladna #1 (Ředitelství)
  - 12 zástupce: Pokladny #2, #3, #4, #6, #7, #8, #9, #10, #13, #17, #32, #999

Markéta Kvasničková:
  - 1 pokladna
  - 1 hlavní: Pokladna #8 (Nymburk)

Robert ADMIN:
  - 1 pokladna
  - 0 hlavní: Pokladna #999 (pouze zástupce)
```

---

## ⚙️ Backend logika (PHP)

### Vytvoření přiřazení (`CashboxAssignmentModel::createAssignment`)

**Soubor:** `v2025.03_25/models/CashboxAssignmentModel.php` (řádky 295-385)

```php
public function createAssignment($data, $createdBy) {
    // KROK 1: Pokud se vytváří hlavní pokladna, deaktivovat ostatní hlavní
    if (isset($data['je_hlavni']) && $data['je_hlavni'] == 1) {
        $this->unsetMainAssignment($data['uzivatel_id']);
    }
    
    // KROK 2: Vytvořit přiřazení
    $sqlCreateAssignment = "
        INSERT INTO 25a_pokladny_uzivatele (
            pokladna_id,
            uzivatel_id,
            je_hlavni,  // ← KLÍČOVÉ POLE
            platne_od,
            platne_do,
            poznamka,
            vytvoreno,
            vytvoril
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
    ";
    
    $stmtAssignment->execute(array(
        $pokladnaId,
        $data['uzivatel_id'],
        isset($data['je_hlavni']) ? $data['je_hlavni'] : 0,  // ⚠️ DEFAULT: 0 (zástupce)
        $data['platne_od'],
        isset($data['platne_do']) ? $data['platne_do'] : null,
        isset($data['poznamka']) ? $data['poznamka'] : null,
        $createdBy
    ));
}
```

### Metoda `unsetMainAssignment`

```php
private function unsetMainAssignment($userId) {
    $sql = "UPDATE " . TBL_POKLADNY_UZIVATELE . " 
            SET je_hlavni = 0 
            WHERE uzivatel_id = ? AND je_hlavni = 1";
    $stmt = $this->db->prepare($sql);
    $stmt->execute(array($userId));
}
```

**Logika:**
1. ✅ Uživatel **může mít max 1 hlavní pokladnu**
2. ✅ Při nastavení nové hlavní se **automaticky zruší** předchozí hlavní
3. ⚠️ Pokud `je_hlavni` **není v requestu**, nastaví se `0` (zástupce)

---

## 🎨 Frontend (kam přidat checkbox)

### Kde se vytváří přiřazení?

**Soubor:** `apps/eeo-v2/client/src/pages/CashboxManagementPage.js`

Hledej komponentu nebo formulář pro vytvoření nového přiřazení. Pravděpodobně existuje modal/dialog s těmito poli:
- **Uživatel** (select)
- **Číslo pokladny** (input)
- **Platné od** (date)
- **Platné do** (date) - optional
- **Poznámka** (textarea) - optional

### Co přidat:

```jsx
<FormGroup>
  <Label>
    <Checkbox
      checked={isMainAssignment}
      onChange={(e) => setIsMainAssignment(e.target.checked)}
    />
    Nastavit jako hlavní pokladnu
  </Label>
  <HelpText>
    Každý uživatel může mít pouze jednu hlavní pokladnu. 
    {currentMainCashbox && (
      <Warning>
        Aktuální hlavní: Pokladna #{currentMainCashbox.cislo_pokladny}
      </Warning>
    )}
  </HelpText>
</FormGroup>
```

### API Request:

```javascript
const assignmentData = {
  uzivatel_id: selectedUserId,
  cislo_pokladny: cashboxNumber,
  platne_od: validFrom,
  platne_do: validTo,
  je_hlavni: isMainAssignment ? 1 : 0,  // ← PŘIDAT!
  poznamka: note
};

await cashbookAPI.createAssignment(assignmentData);
```

---

## 🔍 Proč superadmin nevidí některé pokladny?

### Problém:

V `apps/eeo-v2/client/src/pages/CashBookPage.js` (řádek ~1847):

```javascript
const transformedData = allResult.data.assignments.map(item => ({
  ...item,
  uzivatel_id: parseInt(item.uzivatel_id, 10),  // ❌ parseInt(null) = NaN
}));
```

Když pokladna **nemá přiřazené uživatele**, API vrací:
```json
{
  "id": 15,
  "cislo_pokladny": 100,
  "uzivatel_id": null,  // ← PROBLÉM
  ...
}
```

Pak:
```javascript
parseInt(null, 10)  // → NaN
```

A assignment s `NaN` se nezobrazí v selectoru.

### Řešení: ✅ OPRAVENO

```javascript
const transformedData = allResult.data.assignments.map(item => ({
  ...item,
  uzivatel_id: item.uzivatel_id ? parseInt(item.uzivatel_id, 10) : null,
}));
```

---

## 📝 Doporučení pro UI

### 1. **Přidání checkboxu "Hlavní pokladna"**

V dialogu pro přiřazení uživatele:

```
┌─────────────────────────────────────────────┐
│  Přiřadit uživatele k pokladně              │
├─────────────────────────────────────────────┤
│                                             │
│  Uživatel:       [Tomáš Čech      ▼]       │
│  Číslo pokladny: [17                    ]   │
│  Platné od:      [05.01.2026        ]       │
│  Platné do:      [                  ]       │
│                                             │
│  ☐ Nastavit jako hlavní pokladnu            │
│     Uživatel může mít pouze jednu           │
│     hlavní pokladnu.                        │
│                                             │
│  Poznámka:       [                      ]   │
│                  [                      ]   │
│                                             │
│           [Zrušit]      [Přiřadit]          │
└─────────────────────────────────────────────┘
```

### 2. **Zobrazení v seznamu přiřazení**

```
┌──────────────────────────────────────────────────────────┐
│  PŘIŘAZENÍ UŽIVATELE (2)                                 │
├─────┬────────────────────────┬──────────────┬───────────┤
│  #  │ Celé jméno             │ Od           │ Status    │
├─────┼────────────────────────┼──────────────┼───────────┤
│  1  │ Tomáš Čech  🔵HLAVNÍ   │ 2026-01-01   │ Aktivní   │
│ 17  │ Jaroslava Z. 🔸ZÁSTUP. │ 2026-01-05   │ Aktivní   │
└─────┴────────────────────────┴──────────────┴───────────┘
```

Ikony:
- 🔵 **HLAVNÍ** - `je_hlavni = 1`
- 🔸 **ZÁSTUPCE** - `je_hlavni = 0`

### 3. **Automatická detekce při přepnutí**

Pokud uživatel zaškrtne "Hlavní pokladna" a **už má jinou hlavní**:

```
⚠️ Upozornění
Uživatel Tomáš Čech má již hlavní pokladnu #9 (Kutná Hora).
Nastavením této pokladny jako hlavní se předchozí hlavní pokladna
automaticky změní na zástupce.

[ Rozumím, pokračovat ]  [ Zrušit ]
```

---

## 🛠️ SQL Query pro kontrolu

```sql
-- Najít uživatele s více hlavními pokladnami (chyba v datech)
SELECT 
    u.id,
    CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel,
    COUNT(*) AS pocet_hlavnich,
    GROUP_CONCAT(p.cislo_pokladny ORDER BY p.cislo_pokladny) AS hlavni_pokladny
FROM 25a_pokladny_uzivatele pu
INNER JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
WHERE pu.je_hlavni = 1
  AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
GROUP BY u.id, u.jmeno, u.prijmeni
HAVING COUNT(*) > 1;
```

Výsledek by měl být **prázdný**! Pokud ne, data jsou nekonzistentní.

---

## ✅ Shrnutí

| Aspekt | Hodnota |
|--------|---------|
| **Max hlavních pokladen na uživatele** | 1 |
| **Max zástupců na uživatele** | Neomezeno |
| **Default při vytvoření** | `je_hlavni = 0` (zástupce) |
| **Automatické přepnutí** | Ano - při nastavení nové hlavní se zruší předchozí |
| **Frontend kontrola** | ❌ CHYBÍ - nutno přidat checkbox |
| **Backend validace** | ✅ Funguje správně |
| **Superadmin visibility** | ✅ OPRAVENO (null handling) |

---

## 🎯 TODO

- [ ] Přidat checkbox "Hlavní pokladna" do formuláře přiřazení
- [ ] Zobrazit ikonu 🔵/🔸 v seznamu přiřazení
- [ ] Přidat warning při přepnutí hlavní pokladny
- [ ] Zkontrolovat, jestli existuje komponenta `CashboxManagementPage`
- [ ] Otestovat změnu hlavní pokladny v UI
