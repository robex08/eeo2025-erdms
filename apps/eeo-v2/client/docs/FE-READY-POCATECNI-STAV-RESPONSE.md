# ✅ FE - POČÁTEČNÍ STAV DOKLADŮ IMPLEMENTOVÁN

**Datum:** 8. listopadu 2025  
**Commit BE:** 088cebd - Add vpd_od_cislo and ppd_od_cislo support  
**Commit FE:** 4f1a629 + 17bd468  
**Status:** ✅ **KOMPLETNĚ HOTOVO** - Připraveno k testování

---

## ✅ CO JE HOTOVÉ (FE)

### 1️⃣ **EditAssignmentDialog.js** (793 řádků)

**✅ Přidána pole:**
- `vpd_od_cislo` - Input pro počáteční číslo VPD
- `ppd_od_cislo` - Input pro počáteční číslo PPD

**✅ Implementace:**
```javascript
// Inicializace z props
useEffect(() => {
  if (isOpen && assignment) {
    setFormData({
      vpd_cislo: assignment.vpd_cislo || '',
      vpd_od_cislo: assignment.vpd_od_cislo || 1,  // ← Z BE nebo default 1
      ppd_cislo: assignment.ppd_cislo || '',
      ppd_od_cislo: assignment.ppd_od_cislo || 1,  // ← Z BE nebo default 1
      platne_od: assignment.platne_od || '',
      platne_do: assignment.platne_do || ''
    });
  }
}, [isOpen, assignment]);

// Validace
const vpdOdCislo = parseInt(formData.vpd_od_cislo);
if (!formData.vpd_od_cislo || isNaN(vpdOdCislo) || vpdOdCislo < 1) {
  newErrors.vpd_od_cislo = 'VPD od čísla musí být >= 1';
}

const ppdOdCislo = parseInt(formData.ppd_od_cislo);
if (!formData.ppd_od_cislo || isNaN(ppdOdCislo) || ppdOdCislo < 1) {
  newErrors.ppd_od_cislo = 'PPD od čísla musí být >= 1';
}

// Odeslání do BE
await cashbookAPI.updateAssignment(
  assignment.id,
  formData.vpd_cislo,
  parseInt(formData.vpd_od_cislo),  // ← Převod na INT
  formData.ppd_cislo,
  parseInt(formData.ppd_od_cislo),  // ← Převod na INT
  formData.platne_od || null,
  formData.platne_do || null
);
```

**✅ UI:**
```
[VPD číslo: 599    ] [VPD od čísla: 1      ]
                     (Počáteční číslo pro výdaje)

[PPD číslo: 499    ] [PPD od čísla: 1      ]
                     (Počáteční číslo pro příjmy)

[Platné od: 2025-11-08] [Platné do:           ]
(Nepovinné - ponechte prázdné pro neomezenou platnost)
```

---

### 2️⃣ **AddAssignmentDialog.js** (915 řádků)

**✅ Přidána pole:**
- `vpd_od_cislo` - Input s výchozí hodnotou `1`
- `ppd_od_cislo` - Input s výchozí hodnotou `1`

**✅ Implementace:**
```javascript
// State s výchozími hodnotami
const [formData, setFormData] = useState({
  uzivatel_id: '',
  cislo_pokladny: '',
  vpd_cislo: '',
  vpd_od_cislo: 1,        // ← DEFAULT 1
  ppd_cislo: '',
  ppd_od_cislo: 1,        // ← DEFAULT 1
  platne_od: '',
  platne_do: ''
});

// Reset při otevření
useEffect(() => {
  if (isOpen) {
    setFormData({
      uzivatel_id: '',
      cislo_pokladny: '',
      vpd_cislo: '',
      vpd_od_cislo: 1,      // ← Vždy reset na 1
      ppd_cislo: '',
      ppd_od_cislo: 1,      // ← Vždy reset na 1
      platne_od: '',
      platne_do: ''
    });
  }
}, [isOpen]);

// Validace
const vpdOdCislo = parseInt(formData.vpd_od_cislo);
if (!formData.vpd_od_cislo || isNaN(vpdOdCislo) || vpdOdCislo < 1) {
  newErrors.vpd_od_cislo = 'VPD od čísla musí být >= 1';
}

const ppdOdCislo = parseInt(formData.ppd_od_cislo);
if (!formData.ppd_od_cislo || isNaN(ppdOdCislo) || ppdOdCislo < 1) {
  newErrors.ppd_od_cislo = 'PPD od čísla musí být >= 1';
}

// Odeslání do BE
const assignmentData = {
  uzivatel_id: parseInt(formData.uzivatel_id),
  cislo_pokladny: formData.cislo_pokladny,
  vpd_cislo: formData.vpd_cislo,
  vpd_od_cislo: parseInt(formData.vpd_od_cislo),  // ← INT
  ppd_cislo: formData.ppd_cislo,
  ppd_od_cislo: parseInt(formData.ppd_od_cislo),  // ← INT
  platne_od: formData.platne_od || null,
  platne_do: formData.platne_do || null
};

await cashbookAPI.createAssignment(assignmentData);
```

**✅ UI:**
```
[Uživatel: Vyberte uživatele...        ]

[Číslo pokladny: 100                   ]

[VPD číslo: 599    ] [VPD od čísla: 1      ]
                     (Počáteční číslo pro výdaje)

[PPD číslo: 499    ] [PPD od čísla: 1      ]
                     (Počáteční číslo pro příjmy)

[Platné od:         ] [Platné do:           ]
(Nepovinné - ponechte prázdné pro neomezenou platnost)
```

---

### 3️⃣ **cashbookService.js** (522 řádků)

**✅ Aktualizovaná metoda `updateAssignment()`:**

```javascript
/**
 * 1️⃣4️⃣ Úprava přiřazení pokladny
 * @param {number} assignmentId - ID přiřazení
 * @param {string} vpdCislo - VPD číslo (např. "599")
 * @param {number} vpdOdCislo - Počáteční číslo VPD dokladu (např. 1, 50, 100)
 * @param {string} ppdCislo - PPD číslo (např. "499")
 * @param {number} ppdOdCislo - Počáteční číslo PPD dokladu (např. 1, 25, 100)
 * @param {string|null} platneOd - Datum platnosti od (YYYY-MM-DD)
 * @param {string|null} platneDo - Datum platnosti do (YYYY-MM-DD)
 * @returns {Promise<Object>} Response s aktualizovaným přiřazením
 */
updateAssignment: async (
  assignmentId, 
  vpdCislo, 
  vpdOdCislo,      // ← NOVÝ PARAMETR
  ppdCislo, 
  ppdOdCislo,      // ← NOVÝ PARAMETR
  platneOd = null, 
  platneDo = null
) => {
  const payload = {
    ...auth,
    assignment_id: assignmentId,
    vpd_cislo: vpdCislo,
    vpd_od_cislo: vpdOdCislo,    // ← DO BE
    ppd_cislo: ppdCislo,
    ppd_od_cislo: ppdOdCislo     // ← DO BE
  };
  
  if (platneOd) payload.platne_od = platneOd;
  if (platneDo) payload.platne_do = platneDo;
  
  const response = await axios.post(`${API_BASE}/cashbox-assignment-update`, payload);
  return response.data;
}
```

**✅ Metoda `createAssignment()`:**
- Už existovala, stačí poslat `vpd_od_cislo` a `ppd_od_cislo` v `assignmentData`
- BE automaticky použije tyto hodnoty nebo default `1`

---

### 4️⃣ **CashbookTab.js** - Tabulka přiřazení

**✅ Přidány sloupce:**
```javascript
{
  accessorKey: 'vpd_od_cislo',
  header: 'VPD od',
  cell: ({ row }) => (
    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
      od {row.original.vpd_od_cislo || 1}
    </div>
  ),
},
{
  accessorKey: 'ppd_od_cislo',
  header: 'PPD od',
  cell: ({ row }) => (
    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
      od {row.original.ppd_od_cislo || 1}
    </div>
  ),
}
```

**✅ Layout tabulky:**
```
ID | Uživatel | Pokladna | VPD | VPD od | PPD | PPD od | Status | Akce
---+----------+----------+-----+--------+-----+--------+--------+------
1  | Jan N.   | 100      | V599| od 1   | P499| od 1   | ✓      | ✏️ 🗑️
2  | Petr K.  | 101      | V591| od 50  | P491| od 25  | ✓      | ✏️ 🗑️
3  | Marie S. | 102      | V592| od 100 | P492| od 1   | ✓      | ✏️ 🗑️
```

**✅ Gradient fix:**
- Změněno `<Thead>` na `<TheadTr>` s gradientem na `<tr>`
- Header již nebělá při hover! ✅

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### ✅ Scénář 1: Vytvoření nového přiřazení s výchozími hodnotami

**Kroky:**
1. Kliknout na "Nové přiřazení"
2. Vybrat uživatele
3. Zadat číslo pokladny: `100`
4. Zadat VPD: `599`, VPD od: `1` (výchozí)
5. Zadat PPD: `499`, PPD od: `1` (výchozí)
6. Kliknout "Uložit"

**Očekávaný výsledek:**
- BE vrátí: `{ vpd_od_cislo: 1, ppd_od_cislo: 1 }`
- Tabulka zobrazí: `V599 | od 1 | P499 | od 1`
- ✅ Doklady začínají: `V599-001`, `P499-001`

---

### ✅ Scénář 2: Vytvoření přiřazení s vlastním počátečním stavem

**Kroky:**
1. Kliknout na "Nové přiřazení"
2. Vybrat uživatele
3. Zadat číslo pokladny: `101`
4. Zadat VPD: `591`, **VPD od: `50`** (migrovaná data)
5. Zadat PPD: `491`, **PPD od: `25`** (migrovaná data)
6. Kliknout "Uložit"

**Očekávaný výsledek:**
- BE vrátí: `{ vpd_od_cislo: 50, ppd_od_cislo: 25 }`
- Tabulka zobrazí: `V591 | od 50 | P491 | od 25`
- ✅ Doklady začínají: `V591-050`, `P491-025`

---

### ✅ Scénář 3: Editace existujícího přiřazení

**Kroky:**
1. Kliknout na "✏️" u přiřazení (např. VPD od: 1)
2. Dialog se otevře s načtenými hodnotami
3. Změnit **VPD od: `100`**
4. Kliknout "Uložit"

**Očekávaný výsledek:**
- BE vrátí: `{ vpd_od_cislo: 100 }`
- Tabulka se aktualizuje: `V599 | od 100`
- ✅ Nové doklady začínají: `V599-100`, `V599-101`

---

### ✅ Scénář 4: Validace - číslo < 1

**Kroky:**
1. Otevřít "Nové přiřazení"
2. Zadat VPD od: `0` nebo `-5`
3. Kliknout "Uložit"

**Očekávaný výsledek:**
- ❌ Chyba: "VPD od čísla musí být >= 1"
- ✅ Formulář nebude odeslán

---

### ✅ Scénář 5: Validace - prázdné pole

**Kroky:**
1. Otevřít "Nové přiřazení"
2. Smazat hodnotu z "VPD od čísla" (prázdné pole)
3. Kliknout "Uložit"

**Očekávaný výsledek:**
- ❌ Chyba: "VPD od čísla musí být >= 1"
- ✅ Formulář nebude odeslán

---

### ✅ Scénář 6: Zobrazení v tabulce po načtení z BE

**Kroky:**
1. Otevřít stránku s přiřazeními
2. BE vrací data: 
   ```json
   {
     "id": 1,
     "vpd_cislo": "599",
     "vpd_od_cislo": 1,
     "ppd_cislo": "499",
     "ppd_od_cislo": 1
   }
   ```

**Očekávaný výsledek:**
- Tabulka zobrazí: `V599 | od 1 | P499 | od 1` ✅
- Barva: šedá (#64748b) ✅
- Font: menší (0.875rem) ✅

---

## 📦 PAYLOAD PŘÍKLADY

### ✅ POST `/cashbox-assignment-create`

```json
{
  "auth": { "token": "...", "username": "admin" },
  "uzivatel_id": 123,
  "cislo_pokladny": 100,
  "vpd_cislo": "599",
  "vpd_od_cislo": 1,        // ← Z FE (default 1)
  "ppd_cislo": "499",
  "ppd_od_cislo": 1,        // ← Z FE (default 1)
  "platne_od": "2025-11-08",
  "platne_do": null
}
```

### ✅ POST `/cashbox-assignment-update`

```json
{
  "auth": { "token": "...", "username": "admin" },
  "assignment_id": 123,
  "vpd_cislo": "599",
  "vpd_od_cislo": 50,       // ← Z FE (upraveno na 50)
  "ppd_cislo": "499",
  "ppd_od_cislo": 25,       // ← Z FE (upraveno na 25)
  "platne_od": "2025-11-08",
  "platne_do": null
}
```

### ✅ Response z `/cashbox-assignments-list`

```json
{
  "status": "ok",
  "data": {
    "assignments": [
      {
        "id": "1",
        "uzivatel_id": "1",
        "uzivatel_jmeno": "Jan",
        "uzivatel_prijmeni": "Novák",
        "cislo_pokladny": "100",
        "ciselna_rada_vpd": "599",
        "vpd_od_cislo": 1,           // ← FE očekává INT nebo string
        "ciselna_rada_ppd": "499",
        "ppd_od_cislo": 1,           // ← FE očekává INT nebo string
        "je_hlavni": "1",
        "platne_od": "2025-11-08",
        "platne_do": null,
        "aktivni": true
      }
    ]
  }
}
```

---

## ✅ CHECKLIST - CO JE HOTOVÉ

- [x] **EditAssignmentDialog.js** - přidána 2 pole (vpd_od_cislo, ppd_od_cislo)
- [x] **AddAssignmentDialog.js** - přidána 2 pole s výchozí hodnotou 1
- [x] **cashbookService.js** - updateAssignment() přijímá nové parametry
- [x] **CashbookTab.js** - tabulka zobrazuje sloupce "VPD od" a "PPD od"
- [x] **Validace** - kontrola >= 1 pro oba inputy
- [x] **UI** - kompaktní layout (platnosti na 1 řádku)
- [x] **Gradient fix** - thead nebělá při hover
- [x] **Dokumentace** - CASHBOOK-BE-MISSING-POCATECNI-STAV-FIELDS.md
- [x] **SQL skript** - add_pocatecni_stav_fields.sql

---

## 🎯 VÝSLEDEK

✅ **FE je 100% připravený!**

**Co funguje:**
1. Vytvoření nového přiřazení s `vpd_od_cislo` a `ppd_od_cislo`
2. Editace existujícího přiřazení (změna počátečních stavů)
3. Zobrazení v tabulce (sloupce "VPD od" a "PPD od")
4. Validace (musí být >= 1)
5. Payload do BE obsahuje správné INT hodnoty

**Příklad číslování:**
- Uživatel A: VPD od 1 → `V599-001`, `V599-002`, `V599-003`, ...
- Uživatel B: VPD od 50 → `V591-050`, `V591-051`, `V591-052`, ...
- Uživatel C: PPD od 100 → `P492-100`, `P492-101`, `P492-102`, ...

---

## 📞 KONTAKT

Pokud máte otázky nebo narazíte na problém, napište do Slacku nebo GitHub issue.

**Status:** ✅ FE kompletní, připraveno k testování s BE!  
**Commit FE:** 4f1a629 (dialogy) + 17bd468 (tabulka)  
**Commit BE:** 088cebd
