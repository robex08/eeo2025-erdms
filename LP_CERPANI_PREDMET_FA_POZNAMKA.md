# ✅ DOPLNĚNO: Předmět objednávky a FA poznámka v tabulce čerpání LP

**Datum:** 2026-05-13  
**Modul:** Limitované přísliby - Detail čerpání  
**Požadavek:** Přidat sloupce "Předmět obj." a "FA" (poznámka) do tabulky objednávek LP

---

## 📋 ZMĚNY

### 1. **Backend** - orderV3Handlers.php

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php`

#### Endpoint: `order-v3/lp-expand`

**Přidáno:**
- `f.fa_poznamka` do SQL dotazu pro faktury (~řádek 3963)
- `'fa_poznamka' => $fa['fa_poznamka']` do výstupu faktury (~řádek 3981)

**Změna SQL:**
```php
// ✅ PŘED - bez fa_poznamka
SELECT f.id, f.objednavka_id, f.fa_cislo_vema, f.fa_vema_kod, f.fa_castka, f.stav, 
       f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_zaplacena
FROM " . TBL_FAKTURY . " f

// ✅ PO - s fa_poznamka
SELECT f.id, f.objednavka_id, f.fa_cislo_vema, f.fa_vema_kod, f.fa_castka, f.stav, 
       f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_zaplacena, f.fa_poznamka
FROM " . TBL_FAKTURY . " f
```

**Poznámka:** `o.predmet` již byl v SQL dotazu načítán ✅

---

### 2. **Frontend** - LimitovanePrislibyManager.js

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/client/src/components/LimitovanePrislibyManager.js`

#### A) Header tabulky (~řádek 2629)

**Přidán sloupec:**
```jsx
<th style={{ ...thBase, textAlign: 'left' }} onClick={() => toggleSort('predmet')}>
  Předmět obj.{sortIcon('predmet')}
</th>
```

**Struktura sloupců:**
1. Č. obj.
2. **Předmět obj.** ← NOVÝ
3. Datum
4. Stav
5. Dodavatel
6. Plánováno (LP)
7. Faktury

---

#### B) Řádek objednávky (~řádek 2665)

**Přidán sloupec s předmětem:**
```jsx
<td style={{ 
  padding: '0.25rem 0.5rem', 
  color: '#374151', 
  maxWidth: '260px', 
  overflow: 'hidden', 
  textOverflow: 'ellipsis', 
  whiteSpace: 'nowrap' 
}} title={ord.predmet || ''}>
  {ord.predmet || '—'}
</td>
```

**Vlastnosti:**
- Maximální šířka 260px
- Elipsa při přetečení
- Tooltip s plným textem
- Placeholder "—" pokud prázdné

---

#### C) Řádek faktury (~řádek 2726)

**Přidán sloupec s FA poznámkou:**
```jsx
<td style={{ 
  padding: '0.2rem 0.5rem', 
  fontSize: '0.75rem', 
  color: '#78716c', 
  maxWidth: '260px', 
  overflow: 'hidden', 
  textOverflow: 'ellipsis', 
  whiteSpace: 'nowrap' 
}} title={fa.fa_poznamka || ''}>
  {fa.fa_poznamka || '—'}
</td>
```

**Vlastnosti:**
- Menší font (0.75rem) než objednávky
- Stejné formátování jako předmět
- Tooltip s plným textem
- Placeholder "—" pokud prázdné

**Struktura sloupců faktur:**
1. ↳ Č. FA
2. **FA poznámka** ← NOVÝ
3. Datum
4. Stav
5. (prázdný - dodavatel)
6. LP: částka (celkem: částka)

---

#### D) Sortování (~řádek 2605)

**Přidán case pro řazení:**
```javascript
case 'predmet': return m * (a.predmet || '').localeCompare(b.predmet || '', 'cs');
```

**Podporované řazení:**
- Č. obj. (`cislo`)
- **Předmět obj.** (`predmet`) ← NOVÝ
- Datum (`datum`)
- Stav (`stav`)
- Dodavatel (`dodavatel`)
- Plánováno (`cena`)
- Faktury (`faktury`)

---

#### E) Oprava colSpan (~řádek 2742)

**Původně:**
```jsx
<td colSpan={2} style={{ ... }}>  ❌ Nesprávně - vytvářelo navíc sloupce
```

**Opraveno:**
```jsx
<td style={{ ... }}>  ✅ Bez colSpan
```

**Přidán prázdný sloupec pro dodavatele:**
```jsx
<td style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: faHasLP ? '#78716c' : '#94a3b8' }}>
  {/* Prázdný sloupec - Dodavatel (stejný jako u objednávky) */}
</td>
```

---

#### F) Datum splatnosti (~řádek 2747)

**Přesunuto z samostatného sloupce do tooltipu:**
```jsx
title={
  faHasLP 
    ? `LP rozpis: ${formatAmount(fa.lp_castka)}\nCelková FA: ${formatAmount(fa.fa_castka)}${fa.fa_datum_splatnosti ? `\nSplatnost: ${czDate(fa.fa_datum_splatnosti)}` : ''}` 
    : `Celková FA: ${formatAmount(fa.fa_castka)}\nBez LP rozpisu na toto LP${fa.fa_datum_splatnosti ? `\nSplatnost: ${czDate(fa.fa_datum_splatnosti)}` : ''}`
}
```

**Důvod:** Struktura tabulky musí mít stejný počet sloupců jako header (7 sloupců)

---

## 🧪 TESTOVÁNÍ

**Postup:**
1. Otevřít modul `/cerpani`
2. Rozbalit detail LP (kliknout na řádek)
3. **Ověřit objednávky:**
   - ✅ Sloupec "Předmět obj." zobrazuje předmět objednávky
   - ✅ Tooltip zobrazuje plný text při překročení šířky
   - ✅ Řazení podle předmětu funguje (klik na header)
4. **Ověřit faktury:**
   - ✅ Sloupec "FA poznámka" (za Č. FA) zobrazuje poznámku faktury
   - ✅ Tooltip zobrazuje plný text
   - ✅ Datum splatnosti je v tooltipu sloupce s částkou

**Příklad:**
```
Č. obj.               Předmět obj.           Datum        Stav  ...
O-1222/7503092...     ACTIVA spol. s r.o.   25.4.2026    ✓     ...
  ↳ FA 12345678       (poznámka faktury)    1.4.2026     ✓     LP: 50,000 Kč
```

---

## 📝 POZNÁMKY

1. **Konzistence s modelem Smlouvy:**
   - Stejná struktura jako `SmlouvyTab.js` (~řádek 3098)
   - Stejné formátování sloupců
   - Stejné tooltip chování

2. **Responzivita:**
   - Sloupce mají fixní šířku 260px
   - Text se zkracuje elipsou
   - Tooltip zobrazuje plný text

3. **Zpětná kompatibilita:**
   - Backend API vrací nový field `fa_poznamka`
   - Starší frontend nebude mít chybu (ignoruje neznámý field)
   - `predmet` již byl v API obsažen

4. **Performance:**
   - Žádný dodatečný SQL JOIN (predmet už byl v dotazu)
   - fa_poznamka přidán do existujícího dotazu
   - Žádný dopad na rychlost

---

## 🔍 SOUVISEJÍCÍ SOUBORY

- `SmlouvyTab.js` - referenční implementace s předmětem a FA poznámkou
- `orderV3Handlers.php` - backend API pro expand objednávek LP
- `ANALYZA_CERPANI_SYSTEM.md` - kompletní dokumentace systému čerpání

---

**Autor:** GitHub Copilot  
**Status:** ✅ HOTOVO - bez chyb, připraveno k testování
