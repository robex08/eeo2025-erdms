# ✅ Test: Převod mezi měsíci

## 🎯 Co testujeme
Že backend správně vrací `prevod_z_predchoziho` a frontend ho správně zobrazuje.

## 📋 Testovací scénář

### Příprava dat (příklad):
1. **Září 2025**: Koncový stav **5000 Kč**
2. **Říjen 2025**: Koncový stav **2500 Kč** 
3. **Listopad 2025**: Nová kniha (právě vytváříme)

### Očekávaný výsledek:
```
Listopad 2025:
- Počáteční stav: 7500 Kč (= 5000 + 2500)
- Převod z předchozího: 7500 Kč
```

---

## 🧪 Test 1: Kontrola Response z API

### Backend Response (z `/cashbook-get` nebo `/cashbook-list`):
```json
{
  "status": "ok",
  "data": {
    "book": {
      "id": 123,
      "rok": 2025,
      "mesic": 11,
      "prevod_z_predchoziho": "7500.00",  // ✅ SPRÁVNĚ
      "pocatecni_stav": "7500.00",         // ✅ SPRÁVNĚ
      "koncovy_stav": "8288.00"            // Závisí na entries
    },
    "entries": [...]
  }
}
```

### ✅ Kontrolní body:
- [ ] `prevod_z_predchoziho` je **7500** (ne 0)
- [ ] `pocatecni_stav` je **7500** (stejné jako převod)
- [ ] `koncovy_stav` se aktualizuje podle entries

---

## 🧪 Test 2: Kontrola ve Frontend State

### V browseru (DevTools Console):
```javascript
// Otevři React DevTools nebo vlož do konzole:
console.log('carryOverAmount:', window.__carryOverAmount); // Mělo by být 7500
console.log('initialBalance:', window.__initialBalance);   // Mělo by být 7500
console.log('totals:', window.__totals);                   // currentBalance závisí na entries
```

### ✅ Kontrolní body:
- [ ] `carryOverAmount` = **7500**
- [ ] Počáteční stav v hlavičce = **7500 Kč**
- [ ] Koncový zůstatek = 7500 + příjmy - výdaje

---

## 🧪 Test 3: Vizuální kontrola v UI

### Kde kontrolovat:
1. **Hlavička stránky**:
   ```
   📊 Souhrn pokladní knihy
   Počáteční stav: 7 500,00 Kč  ← ZKONTROLUJ
   ```

2. **Sumarizační panel**:
   ```
   Počáteční stav: 7 500,00 Kč  ← ZKONTROLUJ
   Celkové příjmy: X,XX Kč
   Celkové výdaje: X,XX Kč
   Koncový zůstatek: X,XX Kč
   ```

3. **Tabulka položek** - první řádek by měl mít zůstatek = 7500 + první příjem/výdaj

### ✅ Kontrolní body:
- [ ] Počáteční stav **není 0**, ale **7500**
- [ ] Zůstatky v tabulce navazují správně
- [ ] Koncový zůstatek odpovídá: 7500 + Σpříjmy - Σvýdaje

---

## 🧪 Test 4: Zpětný pohled (Říjen 2025)

### Kroky:
1. V selectoru změň měsíc na **Říjen 2025**
2. Kontroluj:
   - Počáteční stav = **5000 Kč** (ze Září, NE 7500)
   - Koncový stav = **2500 Kč** (podle položek v Říjnu)

### ✅ Kontrolní body:
- [ ] Říjen má převod **5000** (ze Září)
- [ ] Listopad má převod **7500** (5000 + 2500)
- [ ] Září má převod **0** (první měsíc)

---

## 🧪 Test 5: Vytvoření nové knihy pro Prosinec

### Kroky:
1. V selectoru zvol **Prosinec 2025** (ještě neexistuje)
2. Backend automaticky vytvoří knihu
3. Kontroluj response v Network tab (F12):

```json
{
  "status": "ok",
  "data": {
    "book": {
      "mesic": 12,
      "prevod_z_predchoziho": "8288.00",  // ← Koncový stav z Listopadu
      "pocatecni_stav": "8288.00"
    }
  }
}
```

### ✅ Kontrolní body:
- [ ] Nová kniha má převod = koncový stav z Listopadu
- [ ] Prosinec začína s **8288 Kč** (ne 0)

---

## 🐛 Možné problémy

### ❌ Problém: Počáteční stav je 0
**Příčina:** Backend vrací `prevod_z_predchoziho: 0`

**Řešení:**
1. Zkontroluj, že backend implementoval fix z `BACKEND-CASHBOOK-PREVOD-FIX.md`
2. Spusť SQL update pro opravu starých záznamů:
```sql
UPDATE 25a_pokladni_knihy kb
INNER JOIN 25a_pokladni_knihy prev
  ON prev.pokladna_id = kb.pokladna_id
  AND prev.uzivatel_id = kb.uzivatel_id
  AND prev.mesic = kb.mesic - 1
SET kb.prevod_z_predchoziho = prev.koncovy_stav
WHERE kb.prevod_z_predchoziho = 0;
```

### ❌ Problém: Převod je správný, ale nezobrazuje se
**Příčina:** Frontend cache nebo localStorage

**Řešení:**
1. Vyčisti localStorage: `localStorage.clear()`
2. Hard refresh: `Ctrl + Shift + R`
3. Zkontroluj, že `carryOverAmount` se správně nastaví v `ensureBookExists()`

### ❌ Problém: Při změně měsíce se stav neresetuje
**Příčina:** useEffect dependencies

**Řešení:**
- Zkontroluj dependencies v useEffect na řádku ~1180
- Mělo by obsahovat: `[STORAGE_KEY, currentMonth, currentYear, ...]`

---

## 📊 Výsledek testu

| Test | Status | Poznámka |
|------|--------|----------|
| 1. Response z API | ⏳ | Čeká na test |
| 2. Frontend State | ⏳ | Čeká na test |
| 3. UI Vizualizace | ⏳ | Čeká na test |
| 4. Zpětný pohled | ⏳ | Čeká na test |
| 5. Nová kniha | ⏳ | Čeká na test |

---

## ✅ Checklist pro finální schválení

- [ ] Backend vrací správný `prevod_z_predchoziho`
- [ ] Frontend správně zobrazuje počáteční stav
- [ ] Zůstatky v tabulce navazují správně
- [ ] Zpětný pohled funguje (starší měsíce mají správný převod)
- [ ] Nové knihy se vytváří s převodem z předchozího měsíce
- [ ] SQL update proběhl pro starší záznamy
- [ ] Dokumentace aktualizována

---

## 🎯 Další kroky

1. ✅ **Backend implementoval fix** - zkontrolováno
2. ⏳ **Otestovat v produkci** - čeká na test
3. ⏳ **SQL update pro staré záznamy** - čeká na spuštění
4. ⏳ **User acceptance testing** - uživatelé ověří správnost

---

**Poznámka:** Po úspěšném testu označ dokument `BACKEND-CASHBOOK-PREVOD-FIX.md` jako ✅ VYŘEŠENO.
