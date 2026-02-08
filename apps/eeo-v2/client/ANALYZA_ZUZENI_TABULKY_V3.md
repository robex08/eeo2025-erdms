# 📊 Analýza zúžení tabulky Order V3

**Datum:** 8.2.2026  
**Cíl:** Zúžit tabulku při zachování všech sloupců a čitelnosti dat

---

## 🔍 Současný stav - Šířky sloupců

| Sloupec | Šířka (px) | Obsah | Kritičnost |
|---------|------------|-------|------------|
| **Expander** | 50 | Ikona +/- | Min |
| **Approve** | 45 | Ikona schválení | Min |
| **Datum** | 120 | Datum + čas (3 řádky) | Střední |
| **Ev. číslo** | 180 | Číslo + předmět (2 řádky) | Kritická |
| **Financování** | 130 | Typ + číslo smlouvy | Střední |
| **Objednatel/Garant** | 160 | 2 jména (2 řádky) | Střední |
| **Příkazce/Schvalovatel** | 160 | 2 jména (2 řádky) | Střední |
| **Dodavatel** | 300 | Název + adresa + IČO + kontakt | Velmi kritická |
| **Stav** | 150 | Badge s ikonou | Střední |
| **Stav registru** | 150 | Badge s ikonou | Střední |
| **Max. cena DPH** | 130 | Číslo (monospace) | Střední |
| **Cena s DPH** | 130 | Číslo (monospace) | Střední |
| **Cena FA DPH** | 130 | Číslo (monospace) | Střední |
| **Akce** | ~80 | 3-4 ikony | Min |

**Celková šířka: ~1,915px**

---

## 💡 Návrhy optimalizace

### ✅ Tier 1: Bezpečné zúžení (bez ztráty funkcí)

#### 1. **Datum** → 100px (-20px)
- **Současný stav:** 120px, 3 řádky (datum aktualizace, datum vytvoření, čas)
- **Optimalizace:**
  - Font-size: 0.7rem → 0.65rem
  - Padding: 0.75rem → 0.5rem
  - Stále zobrazuje všechny 3 řádky
- **Ušetřeno: 20px**

```javascript
cell: ({ row }) => {
  const order = row.original;
  return (
    <div style={{ textAlign: 'center', lineHeight: '1.2', padding: '0.5rem' }}>
      <div style={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
        {formatDateOnly(order.dt_objednavky)}
      </div>
      <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>
        {formatDateOnly(order.dt_vytvoreni)}
      </div>
      <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>
        {new Date(order.dt_vytvoreni).toLocaleTimeString('cs-CZ', { 
          hour: '2-digit', minute: '2-digit' 
        })}
      </div>
    </div>
  );
},
size: 100
```

#### 2. **Evidenční číslo** → 160px (-20px)
- **Současný stav:** 180px (číslo + předmět na 2 řádky)
- **Optimalizace:**
  - Max-width předmětu: 300px → 250px
  - Font-size předmětu: 1em → 0.9em
  - Stále zobrazuje číslo + náhled předmětu
- **Ušetřeno: 20px**

```javascript
size: 160
```

#### 3. **Financování** → 110px (-20px)
- **Současný stav:** 130px (typ + číslo smlouvy)
- **Optimalizace:**
  - Font-size: 0.9rem → 0.8rem
  - Zkrácené názvy už máme (SF, dotace, EU, atd.)
- **Ušetřeno: 20px**

```javascript
size: 110
```

#### 4. **Objednatel/Garant** → 140px (-20px)
- **Současný stav:** 160px (2 jména)
- **Optimalizace:**
  - Font-size: 0.85em → 0.8em
  - Line-height: 1.3 → 1.2
- **Ušetřeno: 20px**

```javascript
size: 140
```

#### 5. **Příkazce/Schvalovatel** → 140px (-20px)
- **Optimalizace:** Stejná jako Objednatel/Garant
- **Ušetřeno: 20px**

```javascript
size: 140
```

#### 6. **Stav** → 130px (-20px)
- **Současný stav:** 150px (badge)
- **Optimalizace:**
  - Font-size: 0.85rem → 0.75rem
  - Padding: 0.4rem → 0.3rem
- **Ušetřeno: 20px**

```javascript
size: 130
```

#### 7. **Stav registru** → 130px (-20px)
- **Optimalizace:** Stejná jako Stav
- **Ušetřeno: 20px**

```javascript
size: 130
```

#### 8. **Cenové sloupce** → 120px × 3 (-30px)
- **Současný stav:** 130px každý
- **Optimalizace:**
  - Font-size: 0.9rem → 0.85rem
  - Menší padding
  - Monospace zůstává
- **Ušetřeno: 30px (3× 10px)**

```javascript
size: 120
```

**Celkem Tier 1: -170px (9% úspora)**  
**Nová šířka: 1,745px**

---

### ⚠️ Tier 2: Agresivnější zúžení (s kompromisy)

#### 9. **Dodavatel** → 250px (-50px)
- **Současný stav:** 300px (název, adresa, IČO, kontakt)
- **Kompromis:**
  - Zkrátit adresu na 1 řádek s ellipsis
  - Kontakt zobrazit jen pokud není adresa
  - IČO zůstává
  - Font-size: 0.8em → 0.75em
- **Ušetřeno: 50px**

```javascript
{order.dodavatel_adresa && (
  <div style={{ 
    fontSize: '0.75em', 
    color: '#4b5563',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '220px'
  }}>
    {order.dodavatel_adresa}
  </div>
)}
```

#### 10. **Ev. číslo** → 140px (-20px navíc)
- **Kompromis:**
  - Předmět jen 1 řádek místo 2
  - WebkitLineClamp: 2 → 1
- **Ušetřeno: dalších 20px**

**Celkem Tier 2: -70px (dalších 4%)**  
**Nová šířka: 1,675px**

---

### 🔴 Tier 3: Radikální zúžení (nedoporučeno)

#### Možnosti (neimplementovat bez konzultace):
- **Spojit sloupce:** Objednatel+Garant → 1 řádek oddělený "/" (-40px)
- **Schovať datum vytvoření:** Jen poslední úprava (-15px)
- **Dodavatel bez kontaktu:** Jen název + IČO (-50px)
- **Cenové sloupce:** → 100px (-30px)

**Potenciální úspora: -135px**  
**Nová šířka: 1,540px**  
**⚠️ Značné riziko ztráty čitelnosti!**

---

## 📋 Doporučený postup implementace

### Fáze 1: Bezpečná optimalizace (Tier 1)
```javascript
const OPTIMIZED_COLUMN_SIZES = {
  expander: 50,           // beze změny
  approve: 45,            // beze změny
  dt_objednavky: 100,     // -20px ✅
  cislo_objednavky: 160,  // -20px ✅
  financovani: 110,       // -20px ✅
  objednatel_garant: 140, // -20px ✅
  prikazce_schvalovatel: 140, // -20px ✅
  dodavatel_nazev: 300,   // beze změny
  stav_objednavky: 130,   // -20px ✅
  stav_registru: 130,     // -20px ✅
  max_cena_s_dph: 120,    // -10px ✅
  cena_s_dph: 120,        // -10px ✅
  faktury_celkova_castka_s_dph: 120, // -10px ✅
  actions: 80             // beze změny
};
```

**Úspora: 170px (9%)**  
**Riziko: Minimální**

### Fáze 2: Testování s uživateli
- Implementovat Tier 1
- Shromáždit feedback
- Pokud potřeba více → zvážit Tier 2

---

## 🎨 Dodatečné optimalizace (globální)

### 1. **Padding v buňkách**
```javascript
const TableCell = styled.td`
  padding: 0.5rem 0.4rem; /* původně 0.75rem */
`;
```
**Ušetřeno: ~40-60px na šířce při 14 sloupcích**

### 2. **Font optimalizace**
```javascript
const TableContainer = styled.div`
  font-size: 0.85rem; /* původně 0.875rem */
  
  @media (min-width: 1920px) {
    font-size: 0.9rem; /* původně 0.95rem */
  }
`;
```

### 3. **Resize borders**
```css
.resize-handle {
  width: 3px; /* původně 5px */
}
```

---

## 📊 Shrnutí úspor

| Tier | Úspora | Nová šířka | Riziko | Doporučení |
|------|--------|------------|--------|------------|
| **Tier 1** | -170px (9%) | 1,745px | Minimální | ✅ Implementovat |
| **Tier 2** | -240px (13%) | 1,675px | Střední | ⚠️ Testovat |
| **Tier 3** | -375px (20%) | 1,540px | Vysoké | ❌ Nedoporučeno |

---

## 🚀 Implementační checklist

- [ ] Změnit `size` property u všech sloupců (Tier 1)
- [ ] Upravit font-sizes v cell rendererech
- [ ] Upravit padding v buňkách
- [ ] Otestovat na 1920px monitoru
- [ ] Otestovat na 2560px monitoru
- [ ] Zkontrolovat readabilitu jmen (Objednatel/Garant)
- [ ] Zkontrolovat číselné sloupce (zarovnání)
- [ ] Zkontrolovat badges (Stav)
- [ ] Otestovat s filtry
- [ ] Otestovat s rozbalenými řádky

---

## 💡 Alternativní řešení

### 1. **Vypnutelné sloupce** (už máš implementováno)
- Uživatel si může skrýt nepotřebné sloupce
- Šířka se dynamicky přizpůsobí

### 2. **Responzivní módy**
```javascript
// Compact mode toggle
const [compactMode, setCompactMode] = useState(false);

const columnSizes = compactMode ? COMPACT_SIZES : DEFAULT_SIZES;
```

### 3. **Zoom tabulky**
```javascript
const [zoomLevel, setZoomLevel] = useState(100);

<TableContainer style={{ fontSize: `${zoomLevel}%` }}>
```

---

## ✅ Finální doporučení

**Implementovat Tier 1 (170px úspora) s globálními optimalizacemi:**

1. ✅ Snížit `size` u 9 sloupců (viz tabulka výše)
2. ✅ Změnit padding: `0.75rem` → `0.5rem`
3. ✅ Zmenšit fonty v badges: `0.85rem` → `0.75rem`
4. ✅ Zachovat všechna data a čitelnost

**Výsledek:**
- **Úspora: ~200-220px celkem**
- **Nová šířka: ~1,700px (11% zúžení)**
- **Riziko: Minimální**
- **Čitelnost: Zachována**

---

**Chceš, abych Tier 1 optimalizaci implementoval?** 🚀
