# 📄 WORKFLOW FAKTURACE - Návrh implementace

> **Datum:** 26. října 2025  
> **Autor:** Návrh workflow pro práci s fakturami k objednávkám  
> **Stav:** Návrh k diskusi

---

## 📊 AKTUÁLNÍ STAV

### ✅ Co již MÁME připraveno

#### 1. **Databázová tabulka** `25a_objednavky_faktury`
```sql
- id (int) - PRIMARY KEY
- objednavka_id (int) - Reference na 25a_objednavky
- fa_dorucena (tinyint) - Zda byla faktura doručena (0=NE, 1=ANO)
- fa_castka (decimal) - Částka faktury - POVINNÉ
- fa_cislo_vema (varchar) - Číslo Fa/VPD z VEMA - POVINNÉ
- fa_stredisko (varchar) - Středisko pro fakturu - editovatelné
- fa_poznamka (text) - Poznámka/vzkaz k faktuře - nepovinné
- rozsirujici_data (text) - JSON struktura pro budoucí rozšíření
- vytvoril_uzivatel_id (int) - Kdo fakturu přidal
- dt_vytvoreni (datetime) - Kdy byla faktura přidána
- dt_aktualizace (datetime) - Poslední aktualizace
- aktivni (tinyint) - Aktivní záznam (pro soft delete)
```

**Klíče:**
- `PRIMARY` na `id`
- `idx_objednavka` na `objednavka_id`
- `idx_vytvoril` na `vytvoril_uzivatel_id`
- `idx_cislo_vema` na `fa_cislo_vema`
- `idx_aktivni` na `aktivni`

#### 2. **Backend připravuje SQL**
Backend tým připravuje SQL endpointy pro práci s fakturami.

#### 3. **Frontend připraven**
V `OrderForm25.js` je připravena sekce "7) Fakturace" (aktuálně skryta pomocí `{false && ...}`), viz řádky 16534-16643.

---

## 🎯 NÁVRH WORKFLOW

### FÁZE 1: Kdy se fakturace zobrazuje?

#### Varianta A: **Po potvrzení dodavatele (POTVRZENA)**
```
Stav objednávky: POTVRZENA nebo DOKONCENA
→ Sekce "7) Fakturace" se zobrazí
→ Uživatel může přidávat/editovat faktury
```

**Výhody:**
- Logický flow - dodavatel potvrdil → čekáme na fakturu
- Odpovídá obrázku - bod 7) Fakturace přichází po 8) Potvrzení

**Nevýhody:**
- Někdy přijde faktura dříve než potvrzení objednávky

#### Varianta B: **Po odeslání objednávky (CEKA_POTVRZENI a výše)**
```
Stav objednávky: CEKA_POTVRZENI, POTVRZENA, ROZPRACOVANA, DOKONCENA
→ Sekce "7) Fakturace" se zobrazí
→ Uživatel může přidávat faktury kdykoli po odeslání
```

**Výhody:**
- Flexibilnější - faktura může přijít kdykoliv
- Pokrývá všechny reálné scénáře

**Nevýhody:**
- Méně přísná validace workflow

---

### FÁZE 2: Struktura dat faktury

#### Frontend formData struktura:
```javascript
formData.faktury = [
  {
    id: null,                    // ID z DB (null pro novou fakturu)
    fa_dorucena: false,          // Boolean - Fa doručena na ZZS SK
    fa_castka: '',               // String → Decimal - POVINNÉ
    fa_cislo_vema: '',           // String - Číslo Fa/VPD z VEMA - POVINNÉ
    fa_stredisko: '',            // String - Středisko (editovatelné)
    fa_poznamka: '',             // String - Poznámka/vzkaz
    _isNew: true,                // Frontend flag pro novou fakturu
    _isEditing: false            // Frontend flag pro editační mód
  }
]
```

#### Backend API payload:
```json
{
  "objednavka_id": 123,
  "fa_dorucena": 0,
  "fa_castka": 15000.50,
  "fa_cislo_vema": "2025/0123",
  "fa_stredisko": "Technický úsek",
  "fa_poznamka": "Faktura za hardware",
  "vytvoril_uzivatel_id": 5
}
```

---

### FÁZE 3: UI komponenty a chování

#### **Sekce "7) Fakturace"** - Seznam faktur + formulář

```
┌─────────────────────────────────────────────────────┐
│ 7) Fakturace                                        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ 📋 Seznam faktur (0)                            ││
│ │                                                 ││
│ │ [➕ Přidat fakturu]                             ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Po kliknutí na "Přidat fakturu":                   │
│ ┌─────────────────────────────────────────────────┐│
│ │ ✏️ Nová faktura                                 ││
│ │                                                 ││
│ │ ☑️ Fa doručena na ZZS SK                        ││
│ │                                                 ││
│ │ Číslo Fa/VPD z VEMA: [__________] *            ││
│ │ Částka: [__________] Kč *                      ││
│ │ Středisko: [__________]                        ││
│ │                                                 ││
│ │ Poznámka/vzkaz:                                ││
│ │ [________________________________]             ││
│ │                                                 ││
│ │ [💾 Uložit fakturu] [❌ Zrušit]                ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

#### Seznam faktur - Pokud již existují:
```
┌─────────────────────────────────────────────────────┐
│ 📋 Seznam faktur (2)                                │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ ✅ Fa: 2025/0100 | 12 500 Kč | Doručena         ││
│ │    Středisko: Technický úsek                    ││
│ │    Přidáno: 15.10.2025 (Jan Novák)             ││
│ │    [✏️ Upravit] [🗑️ Smazat]                      ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ ❌ Fa: 2025/0101 | 8 750 Kč | Nedoručena        ││
│ │    Poznámka: Čekáme na potvrzení                ││
│ │    Přidáno: 20.10.2025 (Marie Svobodová)       ││
│ │    [✏️ Upravit] [🗑️ Smazat]                      ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ [➕ Přidat další fakturu]                           │
└─────────────────────────────────────────────────────┘
```

---

### FÁZE 4: Validace

#### Povinná pole:
- ✅ `fa_cislo_vema` - Číslo Fa/VPD z VEMA (povinné)
- ✅ `fa_castka` - Částka faktury (povinné, > 0)

#### Nepovinná pole:
- `fa_dorucena` - Checkbox (výchozí: false/0)
- `fa_stredisko` - Text (editovatelné volné pole)
- `fa_poznamka` - Textarea (poznámka/vzkaz)

#### Validační pravidla:
```javascript
validateFaktura(faktura) {
  const errors = {};
  
  if (!faktura.fa_cislo_vema?.trim()) {
    errors.fa_cislo_vema = 'Číslo Fa/VPD je povinné';
  }
  
  if (!faktura.fa_castka || parseFloat(faktura.fa_castka) <= 0) {
    errors.fa_castka = 'Částka je povinná a musí být větší než 0';
  }
  
  return errors;
}
```

---

### FÁZE 5: Backend API endpointy

#### 1. **Seznam faktur k objednávce**
```javascript
GET /api.eeo/faktury/list
POST /api.eeo/faktury/list

Request:
{
  "token": "...",
  "username": "...",
  "objednavka_id": 123
}

Response:
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "objednavka_id": 123,
      "fa_dorucena": 1,
      "fa_castka": 12500.00,
      "fa_cislo_vema": "2025/0100",
      "fa_stredisko": "Technický úsek",
      "fa_poznamka": "",
      "vytvoril_uzivatel_id": 5,
      "vytvoril_jmeno": "Jan Novák",
      "dt_vytvoreni": "2025-10-15 14:30:00",
      "dt_aktualizace": null,
      "aktivni": 1
    }
  ]
}
```

#### 2. **Přidat fakturu**
```javascript
POST /api.eeo/faktury/create

Request:
{
  "token": "...",
  "username": "...",
  "objednavka_id": 123,
  "fa_dorucena": 0,
  "fa_castka": 8750.50,
  "fa_cislo_vema": "2025/0101",
  "fa_stredisko": "Ekonomický úsek",
  "fa_poznamka": "Faktura za služby"
}

Response:
{
  "status": "ok",
  "message": "Faktura byla úspěšně přidána",
  "data": {
    "id": 2,
    "objednavka_id": 123,
    "fa_dorucena": 0,
    "fa_castka": 8750.50,
    "fa_cislo_vema": "2025/0101",
    "fa_stredisko": "Ekonomický úsek",
    "fa_poznamka": "Faktura za služby",
    "vytvoril_uzivatel_id": 5,
    "dt_vytvoreni": "2025-10-26 10:15:00",
    "aktivni": 1
  }
}
```

#### 3. **Upravit fakturu**
```javascript
POST /api.eeo/faktury/update

Request:
{
  "token": "...",
  "username": "...",
  "id": 2,
  "fa_dorucena": 1,
  "fa_castka": 8750.50,
  "fa_cislo_vema": "2025/0101",
  "fa_stredisko": "Ekonomický úsek",
  "fa_poznamka": "Faktura doručena a zkontrolována"
}

Response:
{
  "status": "ok",
  "message": "Faktura byla úspěšně aktualizována",
  "data": {
    "id": 2,
    "objednavka_id": 123,
    "fa_dorucena": 1,
    "fa_castka": 8750.50,
    "fa_cislo_vema": "2025/0101",
    "fa_stredisko": "Ekonomický úsek",
    "fa_poznamka": "Faktura doručena a zkontrolována",
    "dt_aktualizace": "2025-10-26 11:30:00",
    "aktivni": 1
  }
}
```

#### 4. **Smazat fakturu (soft delete)**
```javascript
POST /api.eeo/faktury/delete

Request:
{
  "token": "...",
  "username": "...",
  "id": 2
}

Response:
{
  "status": "ok",
  "message": "Faktura byla úspěšně smazána"
}
```

---

### FÁZE 6: Frontend implementace

#### Soubory k úpravě:

1. **`src/services/api25orders.js`** - Přidat funkce pro faktury
```javascript
// Seznam faktur
export async function getFaktury25({ token, username, objednavkaId }) { ... }

// Přidat fakturu
export async function createFaktura25({ token, username, fakturaData }) { ... }

// Upravit fakturu
export async function updateFaktura25({ token, username, fakturaId, fakturaData }) { ... }

// Smazat fakturu
export async function deleteFaktura25({ token, username, fakturaId }) { ... }
```

2. **`src/forms/OrderForm25.js`** - Upravit sekci fakturace
```javascript
// 1. Přidat state pro faktury
const [faktury, setFaktury] = useState([]);
const [noveFaktura, setNoveFaktura] = useState(null);
const [editaceFaktury, setEditaceFaktury] = useState(null);

// 2. Načíst faktury při načítání objednávky
useEffect(() => {
  if (orderId && isEditMode) {
    loadFaktury();
  }
}, [orderId, isEditMode]);

// 3. Funkce pro práci s fakturami
const loadFaktury = async () => { ... };
const handleAddFaktura = () => { ... };
const handleSaveFaktura = async (fakturaData) => { ... };
const handleEditFaktura = (faktura) => { ... };
const handleDeleteFaktura = async (fakturaId) => { ... };

// 4. Upravit podmínku zobrazení sekce (řádek 16536)
// Změnit z: {false && ...
// Na: {shouldShowFakturace() && ...

const shouldShowFakturace = () => {
  // Varianta A: Po potvrzení dodavatele
  return ['POTVRZENA', 'DOKONCENA'].includes(formData.stav_schvaleni_kod);
  
  // NEBO Varianta B: Po odeslání objednávky
  // return ['CEKA_POTVRZENI', 'POTVRZENA', 'ROZPRACOVANA', 'DOKONCENA']
  //   .includes(formData.stav_schvaleni_kod);
};
```

3. **`src/constants/workflow25.js`** - Případně přidat kontroly pro faktury

---

## 🔄 POSTUPNÉ KROKY IMPLEMENTACE

### Krok 1: Backend (připravuje BE tým)
- [ ] Vytvořit endpoint `POST /faktury/list`
- [ ] Vytvořit endpoint `POST /faktury/create`
- [ ] Vytvořit endpoint `POST /faktury/update`
- [ ] Vytvořit endpoint `POST /faktury/delete`
- [ ] Otestovat všechny endpointy

### Krok 2: Frontend API service
- [ ] Přidat funkce do `src/services/api25orders.js`
- [ ] Otestovat komunikaci s backendem

### Krok 3: Frontend UI komponenty
- [ ] Vytvořit komponentu `FakturaForm` (formulář pro fakturu)
- [ ] Vytvořit komponentu `FakturaCard` (karta s fakturou)
- [ ] Vytvořit komponentu `FakturyList` (seznam faktur)

### Krok 4: Integrace do OrderForm25
- [ ] Přidat state a funkce pro faktury
- [ ] Upravit podmínku zobrazení sekce
- [ ] Integrovat komponenty do sekce
- [ ] Přidat validaci

### Krok 5: Testování
- [ ] Otestovat přidání faktury
- [ ] Otestovat úpravu faktury
- [ ] Otestovat smazání faktury
- [ ] Otestovat validaci
- [ ] Otestovat workflow (kdy se sekce zobrazuje)

---

## 🎨 VIZUÁLNÍ NÁVRH

Podle obrázku:

```
7) Fakturace
├─ Doručená Fa: ANO/NE - zaškrtávátko
├─ Částka: povinné
├─ Číslo Fa/VPD z VEMA: volné pole povinné
├─ Středisko: to co je ve fázi 0 - editovatelné
└─ Poznámka/vzkaz: volné pole nepovinné

Validace: porovnání s částkou ve fázi 0
  - pokud bude vyšší, napíše upozornění
```

### Upozornění při odchylce částky:
```javascript
if (faktura.fa_castka > formData.max_cena_s_dph) {
  showWarning(`
    ⚠️ Částka faktury (${faktura.fa_castka} Kč) 
    je vyšší než maximální cena objednávky (${formData.max_cena_s_dph} Kč).
    Prosím zkontrolujte správnost údajů.
  `);
}
```

---

## ❓ OTÁZKY K ROZHODNUTÍ

### 1. **Kdy zobrazit sekci fakturace?**
- [ ] A) Po potvrzení dodavatele (POTVRZENA, DOKONCENA)
- [ ] B) Po odeslání objednávky (CEKA_POTVRZENI a výše)
- [ ] C) Jinak: ___________________

### 2. **Může být více faktur k jedné objednávce?**
- [ ] Ano - seznam faktur (doporučeno podle DB struktury)
- [ ] Ne - pouze jedna faktura

### 3. **Kdo může přidávat faktury?**
- [ ] Pouze autor objednávky
- [ ] Autor + garant
- [ ] Autor + garant + admin
- [ ] Kdokoliv s přístupem k objednávce

### 4. **Lze editovat/smazat fakturu po vytvoření?**
- [ ] Ano, kdykoliv
- [ ] Pouze autor faktury
- [ ] Pouze pokud není "doručena"
- [ ] Nelze - jen soft delete

### 5. **Validace částky faktury vs. max_cena_s_dph?**
- [ ] Upozornění (warning) - lze uložit i vyšší částku
- [ ] Chyba (error) - nelze uložit vyšší částku
- [ ] Žádná validace

### 6. **Notifikace při přidání faktury?**
- [ ] Ano - notifikovat garanta + autora
- [ ] Ano - notifikovat pouze garanta
- [ ] Ne - bez notifikací

---

## 📝 POZNÁMKY

- Tabulka `25a_objednavky_faktury` podporuje více faktur k jedné objednávce
- Pole `rozsirujici_data` umožňuje budoucí rozšíření funkcionality
- Soft delete pomocí `aktivni` pole zachovává historii
- Index na `fa_cislo_vema` umožňuje rychlé vyhledávání podle čísla faktury

---

## 🚀 DOPORUČENÝ POSTUP

1. **ROZHODNOUT** workflow otázky (sekce výše)
2. **DOKONČIT** backend API endpointy (BE tým)
3. **VYTVOŘIT** frontend API service funkce
4. **IMPLEMENTOVAT** UI komponenty pro faktury
5. **INTEGROVAT** do OrderForm25.js
6. **OTESTOVAT** celý workflow

---

**Připraveno k diskusi a dalšímu postupu! 🎯**
