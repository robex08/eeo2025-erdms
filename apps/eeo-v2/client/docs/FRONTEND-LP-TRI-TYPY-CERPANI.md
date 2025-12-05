# Frontend: LP Tří typů čerpání - UI implementace

**Datum:** 21. listopadu 2025  
**Verze:** 1.0  
**Komponenta:** `src/components/LimitovanePrislibyManager.js`  
**Status:** ✅ Připraveno pro backend integraci

---

## 📋 Přehled změn

Komponenta `LimitovanePrislibyManager.js` byla rozšířena o **vizuální hierarchii tří typů čerpání LP**:

1. **Skutečně vyčerpáno** (skutecne_cerpano) - VELKÝ FONT, hlavní hodnota
2. **Rezervováno** (rezervovano) - malý font, vedlejší hodnota
3. **Předpokládané čerpání** (predpokladane_cerpani) - malý font, vedlejší hodnota

---

## 🎨 Vizuální hierarchie

### Princip zobrazení

```
┌─────────────────────────────────────┐
│ 561 553 Kč         ← VELKÝ FONT     │
│ → Rezervováno: 650 000 Kč  ← malý   │
│ → Předpoklad: 580 000 Kč   ← malý   │
└─────────────────────────────────────┘
```

### Styled Components

Byly přidány nové styled components pro vizuální hierarchii:

```javascript
// Kontejner pro tři typy
const ThreeTypeAmount = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

// Hlavní hodnota (skutečné) - VELKÝ FONT
const MainAmount = styled.div`
  font-size: 1.1rem;      // Větší font
  font-weight: 700;        // Tučné
  color: ${props => props.$color || '#1f2937'};
`;

// Vedlejší hodnoty - MALÝ FONT
const SubAmounts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.72rem;     // Menší font
  color: #6b7280;          // Šedá barva
  font-weight: 500;
`;

const SubAmount = styled.div`
  &::before {
    content: '→';         // Šipka před textem
    color: #9ca3af;
  }
`;
```

---

## 📊 Mock data struktura

Mock data byla rozšířena o **11 nových polí** pro tři typy čerpání:

```javascript
const mockData = [
  {
    id: 1,
    cislo_lp: 'LPIT1',
    vyse_financniho_kryti: 1500000,
    
    // ===== TŘI TYPY ČERPÁNÍ =====
    rezervovano: 650000,              // SUM(max_cena_s_dph)
    predpokladane_cerpani: 580000,    // SUM(cena_s_dph * mnozstvi)
    skutecne_cerpano: 561553.91,      // SUM(fakturovana_castka) + pokladna
    cerpano_pokladna: 28000,          // Samostatně pokladna
    
    // Zbývá - tři varianty:
    zbyva_rezervovano: 850000,
    zbyva_predpokladane: 920000,
    zbyva_skutecne: 938446.09,
    
    // Procenta - tři varianty:
    procento_rezervovano: 43.33,
    procento_predpokladane: 38.67,
    procento_skutecne: 37.44,
    
    // Zpětná kompatibilita (pro existující kód):
    aktualne_cerpano: 561553.91,      // = skutecne_cerpano
    zbyva: 938446.09,                  // = zbyva_skutecne
    procento_cerpani: 37.44,           // = procento_skutecne
    
    // ... ostatní pole
  }
];
```

### Význam jednotlivých typů

| Typ | Zdroj dat | Význam | Kdy se používá |
|-----|-----------|---------|----------------|
| **rezervovano** | `SUM(max_cena_s_dph)` z objednávek | Pesimistická rezervace | "Nejhorší případ" - všechny objednávky vyčerpány na maximum |
| **predpokladane_cerpani** | `SUM(cena_s_dph * mnozstvi)` z položek | Realistický odhad | "Očekávaná částka" - podle skutečných položek |
| **skutecne_cerpano** | `SUM(fakturovana_castka)` + pokladna | Finální pravda | "Skutečnost" - co bylo proplaceno faktury + pokladna |

---

## 📈 Statistické karty

Statistiky byly rozšířeny o tři typy čerpání s vizuální hierarchií:

### Před změnou:
```javascript
<StatValue>561 553 Kč</StatValue>
```

### Po změně:
```javascript
<StatValue style={{ marginBottom: '0.5rem' }}>
  561 553 Kč                    // ← VELKÝ FONT
</StatValue>
<div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
  → Rezervováno: 650 000 Kč    // ← malý font
  → Předpoklad: 580 000 Kč     // ← malý font
</div>
```

### Statistiky nyní zobrazují:

1. **Celkový limit** - beze změny
2. **Vyčerpáno** - skutečné (hlavní) + rezervováno/předpoklad (vedlejší)
3. **Zbývá** - skutečné (hlavní) + rezervováno/předpoklad (vedlejší)
4. **Průměrné čerpání** - skutečné % (hlavní) + rezervováno/předpoklad % (vedlejší)

---

## 🔢 Tabulka LP

Tabulka byla upravena pro zobrazení tří typů:

### Sloupce:

| Sloupec | Hlavní hodnota | Vedlejší hodnoty |
|---------|----------------|-------------------|
| **Vyčerpáno** | skutecne_cerpano (velký font) | rezervovano, predpokladane_cerpani (malý font) |
| **Zbývá** | zbyva_skutecne (velký font) | zbyva_rezervovano, zbyva_predpokladane (malý font) |
| **Čerpání** | Progress bar podle procento_skutecne | - |
| **Stav** | Badge podle procento_skutecne | - |

### Příklad renderování:

```javascript
<td>
  <ThreeTypeAmount>
    <MainAmount $color="#3b82f6">
      561 553 Kč               {/* skutecne_cerpano */}
    </MainAmount>
    <SubAmounts>
      <SubAmount>Rezervováno: 650 000 Kč</SubAmount>
      <SubAmount>Předpoklad: 580 000 Kč</SubAmount>
    </SubAmounts>
  </ThreeTypeAmount>
</td>
```

---

## 🔗 Backend integrace

### Požadovaná struktura API odpovědi

Backend musí vracet data v tomto formátu:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cislo_lp": "LPIT1",
      "kategorie": "LPIT",
      "nazev_uctu": "Spotřeba materiálu",
      "cislo_uctu": "501",
      "vyse_financniho_kryti": 1500000,
      
      // TŘI TYPY ČERPÁNÍ - POVINNÉ POLE:
      "rezervovano": 650000,
      "predpokladane_cerpani": 580000,
      "skutecne_cerpano": 561553.91,
      "cerpano_pokladna": 28000,
      
      // ZBÝVÁ - POVINNÉ POLE:
      "zbyva_rezervovano": 850000,
      "zbyva_predpokladane": 920000,
      "zbyva_skutecne": 938446.09,
      
      // PROCENTA - POVINNÉ POLE:
      "procento_rezervovano": 43.33,
      "procento_predpokladane": 38.67,
      "procento_skutecne": 37.44,
      
      // Zpětná kompatibilita (volitelné):
      "aktualne_cerpano": 561553.91,
      "zbyva": 938446.09,
      "procento_cerpani": 37.44,
      "je_prekroceno": false,
      
      // Metadata:
      "spravce": { "prijmeni": "Černohorský", "jmeno": "Jan" },
      "usek_nazev": "IT oddělení",
      "usek_id": 4,
      "user_id": 85
    }
  ]
}
```

### API endpoint:

```
GET /api/lp/stav.php?user_id={user_id}
```

**Pozor:** Backend musí vracet **všechna 11 nových polí** pro každý LP záznam!

---

## ✅ Zpětná kompatibilita

Komponenta zachovává **zpětnou kompatibilitu** se starým kódem:

```javascript
// Nový kód používá:
lp.skutecne_cerpano
lp.zbyva_skutecne
lp.procento_skutecne

// Ale stále zachovává:
lp.aktualne_cerpano  // = skutecne_cerpano
lp.zbyva             // = zbyva_skutecne
lp.procento_cerpani  // = procento_skutecne
```

Pokud backend vrátí pouze stará pole, komponenta bude i nadále fungovat (ale bez tří typů).

---

## 🧪 Testování

### Mock data pro vývoj

Mock data jsou nyní připravena s třemi typy. Pro testování:

1. Spusťte aplikaci s mock daty (backend API zakomentováno)
2. Zkontrolujte vizuální hierarchii:
   - Hlavní hodnoty jsou **tučné a větší**
   - Vedlejší hodnoty jsou **menší a šedé**
   - Šipky `→` před vedlejšími hodnotami
3. Ověřte statistiky - všechny tři typy viditelné
4. Ověřte tabulku - sloupce "Vyčerpáno" a "Zbývá" zobrazují tři hodnoty

### Testovací scénáře:

| Scénář | Očekávaný výsledek |
|--------|-------------------|
| **Normální stav** | Skutečné < Předpoklad < Rezervováno |
| **Překročení** | procento_skutecne >= 100 → červený badge "Překročeno" |
| **Varování** | procento_skutecne >= 80 → oranžový badge "Varování" |
| **OK** | procento_skutecne < 80 → zelený badge "OK" |

---

## 📝 Co zbývá udělat

### Frontend:
- ✅ Mock data s třemi typy - **HOTOVO**
- ✅ Vizuální hierarchie (velký/malý font) - **HOTOVO**
- ✅ Statistiky s třemi typy - **HOTOVO**
- ✅ Tabulka s třemi typy - **HOTOVO**
- ⏳ Připojení na skutečné API - **čeká na backend**
- ⏳ Testování s reálnými daty - **čeká na backend**

### Backend (úkol pro BE developera):
- ⏳ Spustit SQL ALTER příkazy (docs/SQL-ALTER-LP-TRI-TYPY.sql)
- ⏳ Implementovat funkci prepocetCerpaniPodleCislaLP() (docs/BACKEND-LP-CERPANI-IMPLEMENTATION.md)
- ⏳ Upravit API stav.php pro vracení tří typů
- ⏳ Upravit API prepocet.php pro přepočet tří typů
- ⏳ Testování výpočtů

---

## 🔍 Soubory změn

### Upravené soubory:

1. **src/components/LimitovanePrislibyManager.js**
   - Přidáno: 4 nové styled components (ThreeTypeAmount, MainAmount, SubAmounts, SubAmount)
   - Upraveno: Mock data (11 nových polí)
   - Upraveno: Statistiky (tři typy s vizuální hierarchií)
   - Upraveno: Tabulka (renderLPTable - tři typy ve sloupcích)
   - Upraveno: Table headers ("Vyčerpáno (skutečně)", "Zbývá (skutečně)")

### Nové dokumenty:

1. **docs/BACKEND-LP-CERPANI-IMPLEMENTATION.md** - Backend implementační návod
2. **docs/SQL-ALTER-LP-TRI-TYPY.sql** - SQL příkazy pro ALTER TABLE
3. **docs/FRONTEND-LP-TRI-TYPY-CERPANI.md** - Tento dokument

---

## 💡 Doporučení

### Pro uživatele:
- **Hlavní hodnota** (velký font) = "skutečnost" (co bylo proplaceno)
- **Vedlejší hodnoty** (malý font) = "odhady" (rezervace a předpoklad)

### Pro správce:
- Pokud `rezervovano >> skutecne_cerpano` → většina objednávek ještě nebyla vyfakturována
- Pokud `predpokladane_cerpani ≈ skutecne_cerpano` → fakturace odpovídá položkám
- Pokud `skutecne_cerpano >> predpokladane` → došlo k navýšení cen

### Pro kontrolu:
```
rezervovano >= predpokladane_cerpani >= skutecne_cerpano
```
Tato nerovnost by měla platit ve většině případů.

---

## 📞 Kontakt

**Frontend developer:** Připraveno ✅  
**Backend developer:** Čeká na implementaci ⏳  
**Dokumentace:** Kompletní ✅

---

**Status:** Komponenta je připravena pro integraci s backendem. Po implementaci backend API bude třeba pouze nahradit mock data skutečným API voláním.
