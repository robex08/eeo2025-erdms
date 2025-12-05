# 📊 Rozšíření seznamu objednávek - Enriched data

**Datum:** 2. listopadu 2025  
**Soubor:** `src/pages/Orders25List.js`  
**API:** Order V2 - `/order-v2/list-enriched`

---

## 🎯 PŘEHLED ZMĚN

Rozšířen rozbalovací detail objednávek (`renderExpandedContent`) o nové informace z **enriched** verze API:

### ✅ Co bylo přidáno:

#### 1️⃣ **💰 Rozšířené finanční údaje**
- ✅ **Cena z položek (s DPH)** - počítaná z `polozky_celkova_cena_s_dph`
- ✅ **Cena z položek (bez DPH)** - z `polozky_celkova_cena_bez_dph`
- ✅ **Celkem faktur** - součet všech faktur (`faktury_celkova_castka`)
- ✅ **Počet položek/faktur** - vizuální přehled (📦×3 / 🧾×2)

#### 2️⃣ **🧾 Faktury** (nová sekce)
```javascript
enriched.faktury[] {
  fa_cislo_vema,           // Číslo faktury
  fa_datum_vystaveni,      // Datum vystavení
  fa_datum_splatnosti,     // Datum splatnosti
  fa_castka,               // Částka
  fa_dorucena,             // Stav (0/1)
  fa_poznamka,             // Poznámka
  prilohy[]                // Přílohy faktury
}
```

**Zobrazení:**
- 📋 Karta pro každou fakturu
- ✅ Barevný badge stavu (Doručena ✓ / Čeká se ⏳)
- 📅 Datum vystavení a splatnosti
- 💰 Částka s formátováním
- 📎 Seznam příloh faktury (s možností stažení)

#### 3️⃣ **📄 Dodatečné dokumenty** (nová sekce)
```javascript
enriched.dodatecne_dokumenty[] {
  originalni_nazev_souboru, // Název souboru
  typ_dokumentu,            // Typ (DD, SMLOUVA, PROTOKOL, JINE)
  dt_vytvoreni,             // Datum nahrání
  velikost_souboru_b,       // Velikost v bajtech
  nahral_uzivatel,          // Kdo nahrál
  popis                     // Popis dokumentu
}
```

**Zobrazení:**
- 📋 Karta pro každý dokument
- 🏷️ Badge typu dokumentu
- 📊 Metadata (datum, velikost, uživatel)
- 💬 Popis dokumentu (pokud existuje)
- ⬇️ Tlačítko pro stažení

#### 4️⃣ **✅ Věcná kontrola** (nová sekce)
```javascript
enriched.vecna_kontrola {
  vecna_spravnost,          // Boolean - potvrzena/nepotvrzena
  kompletnost,              // Boolean - kompletní/nekompletní
  provedl_uzivatel,         // Kdo provedl kontrolu
  dt_kontroly,              // Kdy byla provedena
  poznamka                  // Poznámka ke kontrole
}
```

**Zobrazení:**
- ✅ Věcná správnost (✓ Potvrzena / ✗ Nepotvrzena)
- ✅ Kompletnost (✓ Kompletní / ✗ Nekompletní)
- 👤 Kdo provedl kontrolu
- 📅 Datum kontroly
- 💬 Poznámka

#### 5️⃣ **📋 Registr smluv** (nová sekce)
```javascript
enriched.registr_smluv {
  cislo_smlouvy,            // Číslo smlouvy v registru
  url_smlouvy,              // URL do veřejného registru
  dt_zverejneni,            // Datum zveřejnění
  stav_zverejneni           // ZVEREJNENO / CEKA_NA_ZVEREJNENI
}
```

**Zobrazení:**
- 🔢 Číslo smlouvy (monospace font)
- 🔗 Odkaz "Zobrazit v registru" (otevře v novém okně)
- 📅 Datum zveřejnění
- ✅ Stav zveřejnění (se ikonami a barvami)

#### 6️⃣ **🎯 Fáze dokončení** (nová sekce)
```javascript
enriched.faze_dokonceni {
  progress,                 // Procento dokončení (0-100)
  aktivni_faze,             // Název aktuální fáze
  dokonceno,                // Boolean - je dokončeno?
  faze[] {                  // Seznam všech fází
    nazev,                  // Název fáze
    hotova,                 // Je hotová?
    aktivni,                // Je aktuálně aktivní?
    dt_dokonceni            // Kdy byla dokončena
  }
}
```

**Zobrazení:**
- 📊 Progress bar s procentuálním zobrazením
- 📝 Název aktivní fáze
- ✅ Banner "Objednávka dokončena" (pokud je hotová)
- 📋 Seznam všech fází s ikonami:
  - ✅ Hotová fáze (zelená)
  - 🔄 Aktivní fáze (modrá, animovaná)
  - ⏳ Čekající fáze (šedá)

---

## 🎨 STYLY A KOMPONENTY

### Nové styled komponenty:

```javascript
ListItemCard         // Karta pro položku seznamu (faktura/dokument)
ListItemHeader       // Hlavička karty
ListItemTitle        // Titulek položky
ListItemBadge        // Badge se stavem ($success, $warning)
ListItemMeta         // Kontejner pro metadata
ListItemMetaItem     // Jednotlivá metadata položka

AttachmentsList      // Seznam příloh
AttachmentItem       // Jednotlivá příloha
AttachmentName       // Název přílohy
AttachmentSize       // Velikost přílohy

PhaseProgressBar     // Progress bar pro fáze
PhaseProgressFill    // Výplň progress baru
PhaseLabel           // Label pro fázi
```

### Barevné schéma:

- 🟢 **Zelená (#059669)** - úspěch, dokončeno, potvrzeno
- 🔵 **Modrá (#3b82f6)** - aktivní, odkazy, primární akce
- 🟡 **Žlutá (#ca8a04)** - varování, čeká se
- 🔴 **Červená (#dc2626)** - chyba, nepotvrzeno
- 🟣 **Fialová (#7c3aed)** - faktury, speciální info
- ⚫ **Šedá (#64748b)** - neutrální info, metadata

---

## 📡 API VOLÁNÍ

Sekce používá data z **enriched** endpointu:

```javascript
// V Orders25List.js
const fetchFunction = async () => {
  const filters = { /* ... */ };
  return await listOrdersV2(filters, token, username);
};

// V apiOrderV2.js
export async function listOrdersV2(filters, token, username, returnFullResponse, enriched = true) {
  const endpoint = enriched ? '/order-v2/list-enriched' : '/order-v2/list';
  // ...
}
```

**Backend endpoint:** `POST /order-v2/list-enriched`

---

## 🔄 KOMPATIBILITA

### ✅ Fallback strategie:

Všechny sekce obsahují fallback pro případ, že enriched data nejsou dostupná:

```javascript
// Příklad - faktury
const faktury = enriched.faktury || order.faktury || [];
const hasFaktury = Array.isArray(faktury) && faktury.length > 0;

if (!hasFaktury) return null; // Nezobrazí sekci pokud nejsou data
```

### ✅ Podmíněné zobrazení:

- Každá nová sekce se zobrazí **pouze pokud jsou k dispozici data**
- Žádná sekce není povinná
- Existující funkčnost zůstává nezměněna

---

## 📱 RESPONZIVITA

- Grid layout: `grid-template-columns: repeat(auto-fit, minmax(380px, 1fr))`
- Breakpointy:
  - Desktop (>1600px): 380px minimum šířka karty
  - Tablet (1200-1600px): 320px minimum šířka karty
  - Mobile (<1200px): 280px minimum šířka karty
- Faktury a dodatečné dokumenty: `gridColumn: 'span 2'` (přes 2 sloupce)

---

## 🎭 INTERAKTIVITA

### Klikatelné prvky:

1. **⬇️ Stažení příloh** - `handleDownloadAttachment(attachment)`
2. **🔗 Odkaz do registru smluv** - otevře v novém okně (`target="_blank"`)
3. **📊 Hover efekty** - karty se zvýrazní při najetí myší

### Animace:

- ✅ Progress bar: plynulý přechod šířky
- 🔄 Aktivní fáze: animace rotace ikony
- 🎨 Hover: translateX(2px) pro karty

---

## 🧪 TESTOVÁNÍ

### Co otestovat:

1. ✅ Zobrazení při existujících datech
2. ✅ Skrytí sekcí při chybějících datech
3. ✅ Stahování příloh faktur/dokumentů
4. ✅ Kliknutí na odkaz registru smluv
5. ✅ Responzivita na různých zařízeních
6. ✅ Barevné schéma podle stavu objednávky

---

## 📊 VÝKON

### Optimalizace:

- Podmíněné renderování (`if (!hasData) return null`)
- Memoizace výpočtů cen
- Lazy loading obrázků/ikon
- Omezení počtu zobrazených položek (s hláškou "... a dalších X")

---

## 🚀 FUTURE ENHANCEMENTS

### Možná rozšíření:

- [ ] Filtrování faktur podle stavu (Doručené/Čekající)
- [ ] Export seznamu příloh jako CSV
- [ ] Hromadné stažení všech příloh objednávky (ZIP)
- [ ] Timeline vizualizace fází dokončení
- [ ] Notifikace při změně stavu věcné kontroly
- [ ] Integrace s externím registrem smluv (API)

---

**Status:** ✅ **Implementováno a připraveno k testování**

**Autor:** GitHub Copilot  
**Revize:** 1.0  
**Datum:** 2. listopadu 2025
