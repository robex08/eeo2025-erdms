# 📋 EEO Mobilní API - Seznam a Detail Objednávek

> **📱 Pro mobilní vývojáře (iOS/Android)** - Kompletní dokumentace pro implementaci seznamu a detailu objednávek

---

## 🚨 **KRITICKÉ UPOZORNĚNÍ - PREVENCE CRASHŮ!**

⚠️ **API vrací speciální formáty dat, které MUSÍTE bezpečně parsovat:**

1. **`druh_objednavky_kod`** - JSON string → parsuj s `try/catch`
2. **`fa_lp_kody`** - Speciální formát `LP-XXX|Název;;LP-YYY|Název2` → safe split
3. **`fa_strediska_kod`** - JSON array jako string → parsuj s `try/catch`
4. **Všechna pole** mohou být `null`, `undefined` nebo neočekávaného typu!

👉 **VŽDY používej funkce z sekce [🛡️ OCHRANA PROTI CRASHŮM](#-ochrana-proti-crashům---safe-parsing)**

---

## 🎯 **TŘÍSTUPŇOVÉ NAČÍTÁNÍ (LAZY LOADING)**

Pro optimální výkon a minimální datový přenos:

```
1️⃣ SEZNAM (/order-v3/list)
   → Přehled objednávek s pagingem
   → Zobrazuje: číslo, stav, dodavatel, částka, počet položek/faktur
   
2️⃣ POLOŽKY (/order-v3/items)
   → Detail položek po kliknutí na objednávku
   → Zobrazuje: položky, přílohy, poznámky
   
3️⃣ FAKTURY (/orders-v3/invoices)
   → Detail faktur po kliknutí na "Zobrazit faktury"
   → Zobrazuje: VS čísla, částky, stavy, LP kódy
```

---

## 📡 Přehled Endpointů

| Endpoint | Metoda | Účel | Vyžaduje token |
|----------|--------|------|----------------|
| `/api.eeo/order-v3/list` | POST | Seznam objednávek s pagingem | ✅ Ano |
| `/api.eeo/order-v3/items` | POST | Detail položek objednávky (lazy loading) | ✅ Ano |
| `/api.eeo/orders-v3/invoices` | POST | Faktury objednávky (lazy loading) | ✅ Ano |

---

## 🔐 Práva a Viditelnost Objednávek

### 👤 **Co vidí běžný uživatel:**
- **Pouze VLASTNÍ objednávky**, kde je:
  - **Objednatel** (`objednatel_id`)
  - **Garant** (`garant_uzivatel_id`)
  - **Příkazce** (`prikazce_id`)
  - **Schvalovatel** (`schvalovatel_id`)
  - Nebo má právo vidět objednávky z jeho **hierarchie** (podřízení uživatelé)

### 👨‍💼 **Co vidí ADMIN:**
- **VŠECHNY objednávky** v systému bez omezení
- Role: `SUPERADMIN`, `ADMINISTRATOR`

### ⚠️ **Důležité:**
- Backend API **automaticky aplikuje filtrování** podle práv uživatele
- Mobilní aplikace nemusí řešit logiku oprávnění - stačí poslat token a username
- Pokud uživatel nemá právo na objednávku, vrátí se HTTP 403 Forbidden

---

## 🏷️ **DRUH OBJEDNÁVKY (typ/kategorie)**

Každá objednávka má **druh** (typ/kategorii), který určuje charakter objednávky.

### 📋 **Pole v API response:**

| Pole | Typ | Popis |
|------|-----|-------|
| `druh_objednavky_kod` | string | JSON string s kódem a názvem (interní) |
| `druh_objednavky_nazev` | string | **Lidsky čitelný název** (zobrazovat v UI) |
| `druh_objednavky_atribut` | number | 0 = běžné, 1 = majetek (ovlivňuje workflow) |

**Příklad v response:**
```json
{
  "druh_objednavky_kod": "{\"kod_stavu\":\"DODAVKA_ZBOZI\",\"nazev_stavu\":\"Dodávka zboží\"}",
  "druh_objednavky_nazev": "Dodávka zboží",
  "druh_objednavky_atribut": 0
}
```

### 📊 **Kompletní seznam druhů objednávek:**

| Kód | Název | Atribut | Popis |
|-----|-------|---------|-------|
| `DODAVKA_ZBOZI` | Dodávka zboží | 0 | Běžné dodávky materiálu |
| `SLUZBY` | Služby | 0 | Poskytované služby |
| `MAJETEK` | Majetek (drobný i velký) | **1** | Nákup majetku |
| `ELEKTRONIKA` | Elektronika | **1** | Elektronické zařízení |
| `NABYTEK` | Nábytek | **1** | Nábytkové vybavení |
| `VZDELAVANI_VYBAVENI` | Vzdělávání – vybavení | **1** | Vzdělávací pomůcky |
| `FKSP` | FKSP | **1** | Fond kulturních a sociálních potřeb |
| `OPRAVY` | Opravy | 0 | Opravárenské služby |
| `SERVIS` | Servis | 0 | Servisní služby |
| `LICENCE` | Licence | 0 | Softwarové licence |
| `PRONAJEM` | Pronájem | 0 | Pronájmy |
| `VZDELAVANI_KURZY` | Vzdělávání – kurzy zdravotnické a lékařské | 0 | Vzdělávací kurzy |
| `VZDELAVACI_AKCE` | Školení - nelékařské | 0 | Školení |
| `ZDRAV_MATERIAL_SZM` | Zdrav. materiál SZM | 0 | Zdravotnický materiál |
| `LEKY` | Léky | 0 | Léčiva |
| `INFUZE` | Infuze | 0 | Infuzní roztoky |
| `OPIATY` | Opiáty | 0 | Opiátové léky |
| `KANCELARSKE_POTREBY` | Kancelářské potřeby | 0 | Kancelářské potřeby |
| `CISTICÍ_PROSTREDKY` | Čistící prostředky | 0 | Čistící chemie |
| `AUTA` | Auta | 0 | Vozidla a jejich vybavení |
| `EMISE_A_STK` | Emise a STK | 0 | Technické kontroly |
| `BTK` | BTK | 0 | Biologický testovací kit |
| `LEKARSKE_PROHLIDKY` | Lékařské prohlídky | 0 | Preventivní prohlídky zaměstnanců |
| `ZAKONNE_POPLATKY_A_KOLKY` | Zákonné poplatky a kolky | 0 | Úřední poplatky |
| `POKLADNA_DROBNY_NAKUP` | Pokladna – drobný nákup | 0 | Drobné nákupy z pokladny |
| `ZAKAZKA` | Zakázka | 0 | Zakázkové plnění |
| `VEDLEJSI_CINNOST` | Vedlejší činnost | 0 | Speciální kategorie |
| `OSTATNI` | Ostatní | 0 | Ostatní typy objednávek |

### ⚠️ **DŮLEŽITÉ - Atribut MAJETEK:**

Objednávky s **`druh_objednavky_atribut = 1`** jsou **MAJETKOVÉ** objednávky:
- Vyžadují **potvrzení věcné správnosti**
- Mají **speciální workflow** (navíc fáze potvrzení umístění majetku)
- Po dodání se **evidují v majetku organizace**

**📱 UI DOPORUČENÍ:**
```javascript
function renderOrderType(order) {
  const isMajetek = order.druh_objednavky_atribut === 1;
  const icon = isMajetek ? '🏠' : '📦';
  const badge = isMajetek ? 'MAJETEK' : '';
  
  return `
    <div class="order-type">
      <span class="type-icon">${icon}</span>
      <span class="type-name">${order.druh_objednavky_nazev}</span>
      ${badge ? `<span class="type-badge">${badge}</span>` : ''}
    </div>
  `;
}

// Výstup:
// 📦 Dodávka zboží
// 🏠 Elektronika [MAJETEK]
```

### 🎨 **Zobrazení v UI (Card objednávky):**

```
┌─────────────────────────────────────┐
│ 🔵 O-2026-0404          SCHVÁLENÁ   │
│                                      │
│ 📦 Dodávka zboží                     │  ← druh_objednavky_nazev
│ 🏢 ČSOB Leasing                      │
│ 💰 120 000 Kč                        │
│ 👤 Petr Svoboda                      │
│ 📅 15.04.2026                        │
│                                      │
│ 📎 2 přílohy  💬 5 komentářů         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔵 O-2026-0405          SCHVÁLENÁ   │
│                                      │
│ 🏠 Elektronika [MAJETEK]             │  ← atribut = 1
│ 🏢 IT Solutions s.r.o.               │
│ 💰 85 000 Kč                         │
│ 👤 Marie Nováková                    │
│ 📅 10.04.2026                        │
│                                      │
│ 📎 5 příloh  💬 12 komentářů         │
└─────────────────────────────────────┘
```

---

## 🛡️ **OCHRANA PROTI CRASHŮM - SAFE PARSING**

### ⚠️ **KRITICKÉ DŮLEŽITÉ - PREVENCE CRASHŮ MOBILNÍ APLIKACE!**

**PROBLÉM:** Pokud backend přidá nová pole nebo změní formát dat, **mobilní aplikace může crashnout** kvůli:
- Nečekaným `null` nebo `undefined` hodnotám
- Chybějícím polím v objektech
- Špatně naformátovanému JSON stringu
- Neočekávaným datovým typům

**ŘEŠENÍ:** Vždy používejte **defensive programming** s ochranou proti všem možným chybám!

---

### 🔒 **1. SAFE PARSING DRUHU OBJEDNÁVKY**

**⚠️ PROBLÉM:** Pole `druh_objednavky_kod` je **JSON string**, který může být:
- Validní JSON: `"{\"kod_stavu\":\"SLUZBY\",\"nazev_stavu\":\"Služby\"}"`
- `null` nebo `undefined`
- Nevalidní JSON (crash!)
- Prázdný string

**✅ ŘEŠENÍ:**
```javascript
/**
 * 🛡️ SAFE parsování druhu objednávky
 * @returns {kod: string, nazev: string} | null
 */
function safeParseDruhObjednavky(druh_objednavky_kod) {
  // 1. Kontrola null/undefined
  if (!druh_objednavky_kod) {
    return null;
  }

  // 2. Kontrola typu (musí být string)
  if (typeof druh_objednavky_kod !== 'string') {
    console.warn('druh_objednavky_kod není string:', typeof druh_objednavky_kod);
    return null;
  }

  // 3. Safe JSON parsing s try/catch
  try {
    const parsed = JSON.parse(druh_objednavky_kod);
    
    // 4. Validace struktury
    if (!parsed || typeof parsed !== 'object') {
      console.warn('druh_objednavky_kod není objekt:', parsed);
      return null;
    }

    // 5. Validace povinných polí
    if (!parsed.kod_stavu || !parsed.nazev_stavu) {
      console.warn('Chybí povinná pole v druh_objednavky_kod:', parsed);
      return null;
    }

    return {
      kod: parsed.kod_stavu,      // "SLUZBY"
      nazev: parsed.nazev_stavu   // "Služby"
    };
  } catch (error) {
    console.error('Chyba při parsování druh_objednavky_kod:', error);
    return null;
  }
}

// ✅ POUŽITÍ:
const order = getOrderFromAPI();
const druh = safeParseDruhObjednavky(order.druh_objednavky_kod);

if (druh) {
  console.log(`Druh: ${druh.nazev} (${druh.kod})`);
} else {
  console.log('Druh objednávky není k dispozici');
}
```

**📱 UI SAFE ZOBRAZENÍ:**
```javascript
function renderDruhObjednavky(order) {
  // 1. Primární: Použij druh_objednavky_nazev (už je parsovaný v API)
  const nazev = order?.druh_objednavky_nazev || 'Bez kategorie';
  const atribut = order?.druh_objednavky_atribut ?? 0;
  
  // 2. Ikona podle atributu
  const icon = atribut === 1 ? '🏠' : '📦';
  
  // 3. Badge pro majetek
  const badge = atribut === 1 ? ' [MAJETEK]' : '';
  
  return `${icon} ${nazev}${badge}`;
}

// ✅ Výstup:
// "📦 Služby"
// "🏠 Elektronika [MAJETEK]"
// "📦 Bez kategorie" (fallback)
```

---

### 🔒 **2. SAFE PŘÍSTUP K POLOŽKÁM OBJEDNÁVKY**

**⚠️ PROBLÉM:** Položky obsahují vnořené objekty a pole, která mohou být `null`:
- `items` může být `undefined` nebo prázdné pole
- LP kódy (`lppts_cislo`, `lppts_nazev`) mohou být `null`
- Organizační struktura (`usek_kod`, `budova_kod`) může být neúplná

**✅ ŘEŠENÍ:**
```javascript
/**
 * 🛡️ SAFE zpracování položek objednávky
 */
function safeProcessOrderItems(itemsData) {
  // 1. Kontrola existence dat
  if (!itemsData || !itemsData.data) {
    console.warn('Chybí data položek');
    return [];
  }

  // 2. Kontrola pole items
  const items = itemsData.data.items;
  if (!Array.isArray(items)) {
    console.warn('items není pole:', typeof items);
    return [];
  }

  // 3. Safe zpracování každé položky
  return items.map((item, index) => {
    try {
      return {
        id: item?.id ?? null,
        popis: item?.popis || 'Bez popisu',
        
        // Ceny - ALWAYS number, never null
        cena_bez_dph: parseFloat(item?.cena_bez_dph) || 0,
        sazba_dph: parseFloat(item?.sazba_dph) || 0,
        cena_s_dph: parseFloat(item?.cena_s_dph) || 0,
        
        // LP kódy - SAFE přístup
        lp: {
          cislo: item?.lppts_cislo || null,
          nazev: item?.lppts_nazev || null
        },
        
        // Organizační struktura - SAFE přístup
        organizace: {
          usek: item?.usek_kod || null,
          budova: item?.budova_kod || null,
          mistnost: item?.mistnost_kod || null
        },
        
        poznamka: item?.poznamka || null,
        dt_vytvoreni: item?.dt_vytvoreni || null
      };
    } catch (error) {
      console.error(`Chyba při zpracování položky ${index}:`, error);
      return null; // Přeskočit vadnou položku
    }
  }).filter(item => item !== null); // Odstranit vadné položky
}

// ✅ POUŽITÍ:
const itemsData = await fetchOrderDetail(orderId);
const safeItems = safeProcessOrderItems(itemsData);

safeItems.forEach(item => {
  console.log(`${item.popis}: ${item.cena_s_dph} Kč`);
  
  // LP kód (může být null!)
  if (item.lp.cislo) {
    console.log(`  LP: ${item.lp.cislo} - ${item.lp.nazev}`);
  }
  
  // Organizace (může být neúplná!)
  const org = [item.organizace.usek, item.organizace.budova, item.organizace.mistnost]
    .filter(Boolean)
    .join(' / ');
  if (org) {
    console.log(`  Umístění: ${org}`);
  }
});
```

---

### 🔒 **3. SAFE PARSING FAKTUR - LP KÓDY**

**⚠️ PROBLÉM:** LP kódy faktur jsou ve speciálním formátu:
- Formát: `"LP-2026-001|Název1;;LP-2026-002|Název2"`
- Může být `null`, prázdný string nebo špatně naformátovaný
- Separátor `|` může chybět
- Separátor `;;` může chybět

**✅ ŘEŠENÍ:**
```javascript
/**
 * 🛡️ SAFE parsování LP kódů faktur
 * @param {string|null} fa_lp_kody - String ve formátu "LP-X|Název;;LP-Y|Název"
 * @returns {Array<{cislo: string, nazev: string}>}
 */
function safeParseInvoiceLpCodes(fa_lp_kody) {
  // 1. Kontrola null/undefined
  if (!fa_lp_kody) {
    return [];
  }

  // 2. Kontrola typu
  if (typeof fa_lp_kody !== 'string') {
    console.warn('fa_lp_kody není string:', typeof fa_lp_kody);
    return [];
  }

  // 3. Ošetření prázdného stringu
  if (fa_lp_kody.trim() === '') {
    return [];
  }

  try {
    // 4. Split podle ;;
    const lpParts = fa_lp_kody.split(';;');
    
    return lpParts
      .map((lpStr, index) => {
        try {
          // 5. Split podle |
          const parts = lpStr.split('|');
          
          // 6. Validace struktury
          if (parts.length < 1) {
            console.warn(`LP kód ${index}: Chybí číslo LP`);
            return null;
          }

          const cislo = parts[0]?.trim() || '';
          const nazev = parts[1]?.trim() || '(bez názvu)';

          // 7. Validace čísla LP
          if (!cislo || cislo === '') {
            console.warn(`LP kód ${index}: Prázdné číslo LP`);
            return null;
          }

          return {
            cislo: cislo,     // "LP-2026-001"
            nazev: nazev      // "Provozní náklady"
          };
        } catch (error) {
          console.error(`Chyba při parsování LP kódu ${index}:`, error);
          return null;
        }
      })
      .filter(lp => lp !== null); // Odstranit vadné záznamy
  } catch (error) {
    console.error('Chyba při parsování fa_lp_kody:', error);
    return [];
  }
}

// ✅ POUŽITÍ:
const invoice = getInvoiceFromAPI();
const lpCodes = safeParseInvoiceLpCodes(invoice.fa_lp_kody);

if (lpCodes.length > 0) {
  console.log('LP kódy faktury:');
  lpCodes.forEach(lp => {
    console.log(`  ${lp.cislo}: ${lp.nazev}`);
  });
} else {
  console.log('Faktura nemá přiřazené LP kódy');
}
```

---

### 🔒 **4. SAFE PARSING STŘEDISEK**

**⚠️ PROBLÉM:** Střediska jsou JSON pole v textovém formátu:
- Formát: `"[\"123\",\"456\"]"`
- Může být `null`, prázdný string nebo nevalidní JSON

**✅ ŘEŠENÍ:**
```javascript
/**
 * 🛡️ SAFE parsování středisek
 * @param {string|null} fa_strediska_kod - JSON string pole kódů
 * @returns {Array<string>}
 */
function safeParseInvoiceStrediska(fa_strediska_kod) {
  // 1. Kontrola null/undefined
  if (!fa_strediska_kod) {
    return [];
  }

  // 2. Kontrola typu
  if (typeof fa_strediska_kod !== 'string') {
    console.warn('fa_strediska_kod není string:', typeof fa_strediska_kod);
    return [];
  }

  // 3. Ošetření prázdného stringu
  if (fa_strediska_kod.trim() === '') {
    return [];
  }

  try {
    // 4. JSON parsing
    const parsed = JSON.parse(fa_strediska_kod);
    
    // 5. Kontrola, že je to pole
    if (!Array.isArray(parsed)) {
      console.warn('fa_strediska_kod není pole:', typeof parsed);
      return [];
    }

    // 6. Filtrování nevalidních hodnot
    return parsed
      .filter(kod => {
        // Pouze string hodnoty
        if (typeof kod !== 'string') {
          console.warn('Středisko není string:', kod);
          return false;
        }
        // Pouze neprázdné
        if (kod.trim() === '') {
          console.warn('Středisko je prázdný string');
          return false;
        }
        return true;
      })
      .map(kod => kod.trim()); // Trim whitespace
      
  } catch (error) {
    console.error('Chyba při parsování fa_strediska_kod:', error);
    return [];
  }
}

// ✅ POUŽITÍ:
const invoice = getInvoiceFromAPI();
const strediska = safeParseInvoiceStrediska(invoice.fa_strediska_kod);

if (strediska.length > 0) {
  console.log('Střediska: ' + strediska.join(', '));
} else {
  console.log('Faktura nemá přiřazená střediska');
}
```

---

### 🔒 **5. SAFE PARSING CELÉ FAKTURY**

**✅ KOMPLETNÍ PŘÍKLAD - Bezpečné zpracování faktury:**
```javascript
/**
 * 🛡️ SAFE zpracování celé faktury
 */
function safeProcessInvoice(invoice) {
  if (!invoice || typeof invoice !== 'object') {
    console.warn('Nevalidní faktura:', invoice);
    return null;
  }

  try {
    return {
      // Základní údaje - ALWAYS defined
      id: invoice?.id ?? null,
      vs: invoice?.fa_cislo_vema || 'N/A',
      vema_kod: invoice?.fa_vema_kod || null,
      
      // Částka - ALWAYS number
      castka: parseFloat(invoice?.fa_castka) || 0,
      
      // Data - SAFE přístup
      datum_vystaveni: invoice?.fa_datum_vystaveni || null,
      datum_doruceni: invoice?.fa_datum_doruceni || null,
      datum_splatnosti: invoice?.fa_datum_splatnosti || null,
      
      // Stav - SAFE default
      stav: invoice?.stav || 'ZAEVIDOVANA',
      
      // Poznámka
      poznamka: invoice?.fa_poznamka || null,
      
      // LP kódy - SAFE parsing
      lp_kody: safeParseInvoiceLpCodes(invoice?.fa_lp_kody),
      
      // Střediska - SAFE parsing  
      strediska: safeParseInvoiceStrediska(invoice?.fa_strediska_kod),
      
      // Uživatelé - SAFE formátování
      vytvoril: safeFormatUserName('vytvoril', invoice),
      potvrdil_vecnou_spravnost: safeFormatUserName('potvrdil_vecnou_spravnost', invoice),
      
      // Časové údaje
      dt_vytvoreni: invoice?.dt_vytvoreni || null,
      dt_potvrzeni_vecne_spravnosti: invoice?.dt_potvrzeni_vecne_spravnosti || null,
      vecna_spravnost_poznamka: invoice?.vecna_spravnost_poznamka || null
    };
  } catch (error) {
    console.error('Chyba při zpracování faktury:', error);
    return null;
  }
}

/**
 * 🛡️ SAFE formátování jména uživatele
 */
function safeFormatUserName(prefix, invoice) {
  try {
    const jmeno = invoice?.[`${prefix}_jmeno`];
    const prijmeni = invoice?.[`${prefix}_prijmeni`];
    
    if (!jmeno && !prijmeni) {
      return null;
    }

    const parts = [];
    
    // Titul před
    const titulPred = invoice?.[`${prefix}_titul_pred`];
    if (titulPred && titulPred.trim() !== '') {
      parts.push(titulPred);
    }
    
    // Jméno
    if (jmeno && jmeno.trim() !== '') {
      parts.push(jmeno);
    }
    
    // Příjmení
    if (prijmeni && prijmeni.trim() !== '') {
      parts.push(prijmeni);
    }
    
    // Titul za
    const titulZa = invoice?.[`${prefix}_titul_za`];
    if (titulZa && titulZa.trim() !== '') {
      parts.push(titulZa);
    }
    
    return parts.length > 0 ? parts.join(' ') : null;
  } catch (error) {
    console.error(`Chyba při formátování uživatele ${prefix}:`, error);
    return null;
  }
}

// ✅ POUŽITÍ:
const invoicesData = await fetchInvoices(orderId);
const safeInvoices = (invoicesData?.data?.invoices || [])
  .map(invoice => safeProcessInvoice(invoice))
  .filter(invoice => invoice !== null);

safeInvoices.forEach(invoice => {
  console.log(`VS: ${invoice.vs}, Částka: ${invoice.castka} Kč`);
  console.log(`Stav: ${invoice.stav}`);
  
  if (invoice.lp_kody.length > 0) {
    console.log('LP kódy:');
    invoice.lp_kody.forEach(lp => {
      console.log(`  - ${lp.cislo}: ${lp.nazev}`);
    });
  }
  
  if (invoice.strediska.length > 0) {
    console.log('Střediska: ' + invoice.strediska.join(', '));
  }
});
```

---

### 🔒 **6. GENERAL SAFE PATTERNS**

**✅ DOPORUČENÉ PRAKTIKY:**

```javascript
// ❌ ŠPATNĚ - crash při null:
const nazev = order.dodavatel_nazev.toUpperCase();

// ✅ SPRÁVNĚ - safe přístup:
const nazev = order?.dodavatel_nazev?.toUpperCase() || 'N/A';

// ❌ ŠPATNĚ - crash při non-array:
const count = order.items.length;

// ✅ SPRÁVNĚ - kontrola typu:
const count = Array.isArray(order?.items) ? order.items.length : 0;

// ❌ ŠPATNĚ - crash při non-number:
const total = order.cena_s_dph + order.faktury_celkova_castka_s_dph;

// ✅ SPRÁVNĚ - safe number parsing:
const cena = parseFloat(order?.cena_s_dph) || 0;
const faktury = parseFloat(order?.faktury_celkova_castka_s_dph) || 0;
const total = cena + faktury;

// ❌ ŠPATNĚ - crash při missing nested object:
const email = order.garant.email;

// ✅ SPRÁVNĚ - optional chaining:
const email = order?.garant?.email || 'N/A';

// ❌ ŠPATNĚ - crash při enum změně:
const color = COLORS[invoice.stav];

// ✅ SPRÁVNĚ - fallback hodnota:
const color = COLORS[invoice?.stav] || '#6b7280'; // default gray
```

---

### 📋 **CHECKLIST PRO SAFE CODING:**

Před deploymentem mobilní aplikace zkontroluj:

- [ ] **Všechny JSON.parse()** jsou v **try/catch** bloku
- [ ] **Všechny array přístupy** mají kontrolu **Array.isArray()**
- [ ] **Všechny object přístupy** používají **optional chaining (?.)** nebo **nullish coalescing (??)**
- [ ] **Všechny number operace** mají **parseFloat()** nebo **Number()** s fallback na 0
- [ ] **Všechny string operace** mají kontrolu **typeof === 'string'**
- [ ] **Všechny .map()/.filter()** mají **.filter(Boolean)** pro odstranění null
- [ ] **Všechny enum hodnoty** mají **fallback** pro neznámé hodnoty
- [ ] **Všechny API response** mají validaci struktury dat
- [ ] **Všechny error stavy** mají **console.error()** nebo logging
- [ ] **UI zobrazuje fallback hodnoty** místo crash ("N/A", "Bez kategorie", atd.)

---

### 🔍 **Filtrování podle druhu:**

Pro implementaci filtru v mobilní aplikaci:

```javascript
// Načíst seznam druhů objednávek (dynamicky z API nebo hardcoded)
const druhyObjednavek = [
  { kod: "DODAVKA_ZBOZI", nazev: "Dodávka zboží" },
  { kod: "SLUZBY", nazev: "Služby" },
  { kod: "MAJETEK", nazev: "Majetek" },
  { kod: "ELEKTRONIKA", nazev: "Elektronika" },
  // ... další
];

// UI: Toggle buttons nebo dropdown
function renderDruhFilter() {
  return druhyObjednavek.map(druh => `
    <button onclick="filterByDruh('${druh.kod}')">
      ${druh.nazev}
    </button>
  `);
}

// Filtrování při načítání seznamu
async function filterByDruh(druhKod) {
  // Backend zatím nepodporuje filtrování podle druhu v /order-v3/list
  // Musíš filtrovat na frontendu:
  const allOrders = await fetchOrders(1);
  
  const filtered = allOrders.orders.filter(order => {
    if (!order.druh_objednavky_kod) return false;
    
    // Parsovat JSON kód
    try {
      const parsed = JSON.parse(order.druh_objednavky_kod);
      return parsed.kod_stavu === druhKod;
    } catch (e) {
      return false;
    }
  });
  
  renderOrderList(filtered);
}
```

**⚠️ POZNÁMKA:**
- Backend API `/order-v3/list` **zatím nepodporuje filtrování podle druhu** v `filters` parametru
- Pro filtrování podle druhu musíš **načíst všechny objednávky a filtrovat na frontendu**
- Alternativně: Požádat backend tým o přidání `filters.druh` do API

---

## 📋 1. Seznam Objednávek (`/order-v3/list`)

### 📤 **REQUEST**

#### **URL:**
```
POST https://erdms.zachranka.cz/api.eeo/order-v3/list
```

#### **Headers:**
```
Content-Type: application/json
```

#### **Body:**
```json
{
  "token": "dXNlckBkb21haW4uY3p8MTc0MjkwMzk4MA==",
  "username": "user@domain.cz",
  "page": 1,
  "per_page": 5,
  "year": 2026,
  "filters": {
    "stav": ["NOVA", "KE_SCHVALENI"],
    "cislo_objednavky": "O-2026",
    "dodavatel": "ČSOB"
  },
  "sorting": [
    {"id": "dt_objednavky", "desc": true}
  ]
}
```

#### **Parametry:**

| Parametr | Typ | Povinný | Popis |
|----------|-----|---------|-------|
| `token` | string | ✅ Ano | Autentizační token |
| `username` | string | ✅ Ano | Email uživatele |
| `page` | number | ❌ Ne | Číslo stránky (výchozí: 1) |
| `per_page` | number | ❌ Ne | Počet záznamů na stránku (výchozí: 50, **mobil: 5**) |
| `year` | number | ❌ Ne | Rok objednávek (výchozí: aktuální rok) |
| `filters` | object | ❌ Ne | Filtrování podle stavů, dodavatele, čísla obj. atd. |
| `sorting` | array | ❌ Ne | Třídění výsledků |

---

### 🎯 **Filtrování podle STAVU** (hlavní navigace mobilu)

#### **Stavy objednávek (filters.stav):**

| UI Název | Kód pro API | Workflow Kód | Popis |
|----------|-------------|--------------|-------|
| Nové | `NOVA` | `NOVA` | Nově vytvořené objednávky |
| Ke schválení | `KE_SCHVALENI` | `ODESLANA_KE_SCHVALENI` | Čekají na schválení |
| Schválené | `SCHVALENA` | `SCHVALENA` | Schválené objednávky |
| Zamítnuté | `ZAMITNUTA` | `ZAMITNUTA` | Zamítnuté objednávky |
| Rozpracované | `ROZPRACOVANA` | `ROZPRACOVANA` | Probíhající objednávky |
| Odeslané | `ODESLANA` | `ODESLANA` | Odeslané dodavateli |
| Potvrzené | `POTVRZENA` | `POTVRZENA` | Potvrzené dodavatelem |
| K uveřejnění | `K_UVEREJNENI_DO_REGISTRU` | `UVEREJNIT` | Čekají na uveřejnění |
| Uveřejněné | `UVEREJNENA` | `UVEREJNENA` | Uveřejněné v registru |
| Dokončené | `DOKONCENA` | `DOKONCENA` | Dokončené objednávky |
| Zrušené | `ZRUSENA` | `ZRUSENA` | Zrušené objednávky |

#### **Příklad filtrování podle stavu:**

```json
{
  "token": "...",
  "username": "user@domain.cz",
  "page": 1,
  "per_page": 5,
  "filters": {
    "stav": ["SCHVALENA", "POTVRZENA"]
  }
}
```

**📱 TIP PRO MOBILNÍ UI:**
- Vytvořte **toggle tlačítka nebo tagy** pro jednotlivé stavy
- Po kliknutí na stav pošlete request s `filters.stav: ["KLIK_STAV"]`
- Defaultně načtěte všechny stavy bez filtru

---

### � **WORKFLOW OBJEDNÁVEK - Fáze a Částky**

#### **📊 KTERÝ CENOVÝ ÚDAJ POUŽÍT V JAKÉ FÁZI?**

Objednávka prochází několika fázemi a **v každé fázi je relevantní jiná částka**:

| Fáze (stav) | Použitá částka | Pole v API | Význam |
|-------------|----------------|------------|--------|
| **NOVA** | `max_cena_s_dph` | `orders[].max_cena_s_dph` | **Plánovaná maximální cena** - zadává objednatel při vytvoření |
| **KE_SCHVALENI** | `max_cena_s_dph` | `orders[].max_cena_s_dph` | **Částka ke schválení** - schvalovatel schvaluje max. cenu |
| **SCHVALENA** | `max_cena_s_dph` | `orders[].max_cena_s_dph` | **Schválený limit** - maximální částka, kterou lze utratit |
| **ROZPRACOVANA** | `cena_s_dph` | `orders[].cena_s_dph` | **Součet položek** - skutečná cena vyplněných položek |
| **ODESLANA** | `cena_s_dph` | `orders[].cena_s_dph` | **Cena odeslaných položek** dodavateli |
| **POTVRZENA** | `cena_s_dph` | `orders[].cena_s_dph` | **Cena potvrzená dodavatelem** |
| **DOKONCENA** | `faktury_celkova_castka_s_dph` | `orders[].faktury_celkova_castka_s_dph` | **Fakturovaná částka** - součet všech faktur |

#### **💡 PRAVIDLA PRO ZOBRAZENÍ ČÁSTKY:**

```javascript
function getOrderPrice(order) {
  // 1. Pokud má objednávka faktury → zobraz fakturovanou částku
  if (order.pocet_faktur > 0 && order.faktury_celkova_castka_s_dph > 0) {
    return {
      amount: order.faktury_celkova_castka_s_dph,
      label: "Fakturováno",
      type: "invoiced"
    };
  }
  
  // 2. Pokud má položky (ROZPRACOVANA, ODESLANA, POTVRZENA) → zobraz součet položek
  if (order.pocet_polozek > 0 && order.cena_s_dph > 0) {
    return {
      amount: order.cena_s_dph,
      label: "Cena položek",
      type: "items"
    };
  }
  
  // 3. Jinak (NOVA, KE_SCHVALENI, SCHVALENA) → zobraz max. cenu
  return {
    amount: order.max_cena_s_dph,
    label: "Max. cena",
    type: "max"
  };
}

// Příklad použití:
const price = getOrderPrice(order);
console.log(`${price.label}: ${formatCurrency(price.amount)}`);
// Výstup: "Cena položek: 120 000 Kč"
```

#### **🔄 WORKFLOW DIAGRAM - Přechody mezi stavy:**

```
┌─────────┐
│  NOVA   │  ← Nově vytvořená objednávka
└────┬────┘    Částka: max_cena_s_dph
     │
     ↓ Odeslat ke schválení
┌──────────────┐
│ KE_SCHVALENI │  ← Čeká na schválení
└──────┬───────┘    Částka: max_cena_s_dph
       │
       ├──→ ZAMITNUTA (zamítnuto schvalovatelem)
       │
       ↓ Schválit
┌────────────┐
│ SCHVALENA  │  ← Schválená objednávka
└─────┬──────┘    Částka: max_cena_s_dph (limit)
      │
      ↓ Vyplnit položky
┌──────────────┐
│ ROZPRACOVANA │  ← Vyplňování položek
└──────┬───────┘    Částka: cena_s_dph (součet položek)
       │
       ↓ Odeslat dodavateli
┌──────────┐
│ ODESLANA │  ← Odeslaná dodavateli
└────┬─────┘    Částka: cena_s_dph
     │
     ↓ Potvrzení od dodavatele
┌───────────┐
│ POTVRZENA │  ← Potvrzená dodavatelem
└─────┬─────┘    Částka: cena_s_dph
      │
      ↓ Příjem zboží/služby + fakturace
┌────────────┐
│ DOKONCENA  │  ← Dokončená objednávka
└────────────┘    Částka: faktury_celkova_castka_s_dph
```

#### **⚠️ DŮLEŽITÉ POZNÁMKY:**

1. **`max_cena_s_dph`** (maximální cena):
   - Zadává **objednatel** při vytvoření objednávky
   - Schvaluje **schvalovatel**
   - Je to **LIMIT** - skutečná cena může být NIŽŠÍ, ale NIKDY ne vyšší
   - Zobrazuje se ve fázích: NOVA, KE_SCHVALENI, SCHVALENA

2. **`cena_s_dph`** (součet položek):
   - Vypočítává se automaticky jako **součet všech položek** objednávky
   - Vyplňuje **objednatel** nebo **garant** v průběhu rozpracování
   - Obvykle je **nižší nebo rovna** max_cena_s_dph
   - Zobrazuje se ve fázích: ROZPRACOVANA, ODESLANA, POTVRZENA

3. **`faktury_celkova_castka_s_dph`** (fakturované):
   - Součet částek všech **faktur** přiřazených k objednávce
   - Vyplňuje **fakturant** po příjmu zboží/služby
   - Může být **rozdělená do více faktur** (dílčí plnění)
   - Zobrazuje se ve fázi: DOKONCENA (a pokud pocet_faktur > 0)

4. **Kontrola překročení limitu:**
   ```javascript
   // ⚠️ Kontrola, zda položky nepřekračují max. cenu
   if (order.cena_s_dph > order.max_cena_s_dph) {
     showWarning(`Položky překračují schválenou částku o ${formatCurrency(order.cena_s_dph - order.max_cena_s_dph)}`);
   }
   
   // ⚠️ Kontrola, zda faktury nepřekračují cenu položek
   if (order.faktury_celkova_castka_s_dph > order.cena_s_dph) {
     showWarning(`Faktury překračují cenu položek o ${formatCurrency(order.faktury_celkova_castka_s_dph - order.cena_s_dph)}`);
   }
   ```

---

### 📱 **ZOBRAZENÍ V MOBILNÍ APLIKACI**

#### **Card objednávky s dynamickou částkou:**

```javascript
function renderOrderCard(order) {
  const price = getOrderPrice(order);
  const priceColor = getPriceColor(price.type);
  const isMajetek = order.druh_objednavky_atribut === 1;
  
  return `
    <div class="order-card">
      <div class="order-header">
        <span class="order-number">${order.cislo_objednavky}</span>
        <span class="order-status">${order.stav_objednavky}</span>
      </div>
      
      <div class="order-type">
        ${isMajetek ? '🏠' : '📦'} ${order.druh_objednavky_nazev}
        ${isMajetek ? '<span class="badge-majetek">MAJETEK</span>' : ''}
      </div>
      
      <div class="order-supplier">${order.dodavatel_nazev}</div>
      
      <div class="order-price" style="color: ${priceColor}">
        <span class="price-label">${price.label}:</span>
        <span class="price-amount">${formatCurrency(price.amount)}</span>
      </div>
      
      <!-- Pokud má položky a faktury, zobraz oba údaje -->
      ${renderPriceComparison(order)}
      
      <div class="order-meta">
        <span>📎 ${order.pocet_priloh} příloh</span>
        <span>💬 ${order.comments_count} komentářů</span>
        ${order.pocet_polozek > 0 ? `<span>📦 ${order.pocet_polozek} položek</span>` : ''}
        ${order.pocet_faktur > 0 ? `<span>📄 ${order.pocet_faktur} faktur</span>` : ''}
      </div>
    </div>
  `;
}

function renderPriceComparison(order) {
  // Zobraz srovnání pouze pokud má položky i faktury
  if (order.pocet_polozek > 0 && order.pocet_faktur > 0) {
    return `
      <div class="price-comparison">
        <small>Položky: ${formatCurrency(order.cena_s_dph)}</small>
        <small>Faktury: ${formatCurrency(order.faktury_celkova_castka_s_dph)}</small>
      </div>
    `;
  }
  
  // Zobraz srovnání s max. cenou pokud je rozdíl
  if (order.cena_s_dph > 0 && order.cena_s_dph < order.max_cena_s_dph) {
    const savings = order.max_cena_s_dph - order.cena_s_dph;
    return `
      <div class="price-comparison">
        <small style="color: green;">Úspora: ${formatCurrency(savings)}</small>
        <small style="color: gray;">Max: ${formatCurrency(order.max_cena_s_dph)}</small>
      </div>
    `;
  }
  
  return '';
}

function getPriceColor(priceType) {
  switch (priceType) {
    case 'invoiced': return '#10b981'; // Zelená - fakturováno
    case 'items': return '#3b82f6';    // Modrá - položky
    case 'max': return '#6b7280';      // Šedá - max. cena
    default: return '#000000';
  }
}
```

#### **Příklad zobrazení:**

```
┌─────────────────────────────────────┐
│ 🔵 O-2026-0404       ROZPRACOVANÁ   │
│                                      │
│ 📦 Dodávka zboží                     │
│ 🏢 ČSOB Leasing                      │
│ 💰 Cena položek: 120 000 Kč          │
│    ✅ Úspora: 5 000 Kč               │
│    Max: 125 000 Kč                   │
│                                      │
│ 👤 Petr Svoboda                      │
│ 📅 15.04.2026                        │
│                                      │
│ 📎 2 přílohy  💬 5 komentářů         │
│ 📦 3 položky                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔵 O-2026-0405          DOKONČENÁ   │
│                                      │
│ 🏠 Elektronika [MAJETEK]             │
│ 🏢 IT Solutions s.r.o.               │
│ 💰 Fakturováno: 85 000 Kč            │
│    Položky: 85 000 Kč                │
│    Faktury: 85 000 Kč                │
│                                      │
│ 👤 Marie Nováková                    │
│ 📅 10.04.2026                        │
│                                      │
│ 📎 5 příloh  💬 12 komentářů         │
│ 📦 8 položek  📄 2 faktury           │
└─────────────────────────────────────┘
```

---

### �📥 **RESPONSE**

#### **Úspěšná odpověď (HTTP 200):**

```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "id": 415,
        "cislo_objednavky": "O-2026-0404",
        "stav_objednavky": "SCHVALENA",
        "stav_workflow_kod": ["SCHVALENA"],
        "dt_objednavky": "2026-04-15 10:30:00",
        "dt_updated": "2026-04-16 14:20:00",
        
        "dodavatel_id": 25,
        "dodavatel_nazev": "ČSOB Leasing",
        "dodavatel_ico": "12345678",
        "dodavatel_adresa": "Praha 1, Nové Město",
        "dodavatel_kontakt_jmeno": "Jan Novák",
        "dodavatel_kontakt_email": "novak@csob.cz",
        "dodavatel_kontakt_telefon": "+420123456789",
        
        "objednatel_id": 10,
        "objednatel_jmeno": "Petr",
        "objednatel_prijmeni": "Svoboda",
        "objednatel_email": "svoboda@zachranka.cz",
        "objednatel_titul_pred": "Ing.",
        "objednatel_titul_za": null,
        
        "druh_objednavky_kod": "{\"kod_stavu\":\"DODAVKA_ZBOZI\",\"nazev_stavu\":\"Dodávka zboží\"}",
        "druh_objednavky_nazev": "Dodávka zboží",
        "druh_objednavky_atribut": 0,
        
        "garant_uid": 15,
        "garant_jmeno": "Marie",
        "garant_prijmeni": "Nováková",
        "garant_email": "novakova@zachranka.cz",
        
        "prikazce_id": 20,
        "prikazce_jmeno": "Josef",
        "prikazce_prijmeni": "Dvořák",
        "prikazce_email": "dvorak@zachranka.cz",
        
        "schvalovatel_id": 5,
        "schvalovatel_jmeno": "Anna",
        "schvalovatel_prijmeni": "Černá",
        "schvalovatel_email": "cerna@zachranka.cz",
        
        "max_cena_s_dph": 125000.50,
        "cena_s_dph": 120000.00,
        "faktury_celkova_castka_s_dph": 60000.00,
        
        "pocet_polozek": 3,
        "pocet_priloh": 2,
        "pocet_faktur": 1,
        
        "financovani": {
          "typ": "LP",
          "typ_nazev": "Limitovaný příslib",
          "lp_kody": [12, 34],
          "lp_nazvy": [
            {
              "id": 12,
              "cislo_lp": "LP-2026-001",
              "cislo_uctu": "123456/0800",
              "nazev": "Provozní náklady"
            },
            {
              "id": 34,
              "cislo_lp": "LP-2026-045",
              "cislo_uctu": "789012/0800",
              "nazev": "IT vybavení"
            }
          ],
          "cislo_smlouvy": "SMV-2026-012",
          "smlouva": {
            "id": 123,
            "cislo_smlouvy": "SMV-2026-012",
            "nazev_smlouvy": "Dodávka IT vybavení",
            "dodavatel_nazev": "ČSOB Leasing",
            "max_castka_s_dph": 500000.00,
            "zustatek": 380000.00,
            "cerpano_proces": 120000.00
          }
        },
        
        "strediska_kod": ["123", "456"],
        
        "poznamka": "Urgentní dodávka notebooků",
        
        "kontrola_metadata": {
          "kontrolni_body": [
            {"id": "dodavatel", "splneno": true},
            {"id": "polozky", "splneno": true},
            {"id": "prilohy", "splneno": false}
          ],
          "procento_splneni": 66
        },
        
        "comments_count": 5,
        "last_comment_author": "Marie Nováková",
        "last_comment_date": "2026-04-16 09:15:00",
        
        "has_attachments": true,
        "has_invoices": true
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 5,
      "total": 47,
      "total_pages": 10
    },
    "stats": {
      "total": 47,
      "nove": 5,
      "ke_schvaleni": 12,
      "schvalene": 15,
      "rozpracovane": 8,
      "odeslane": 3,
      "potvrzene": 2,
      "dokoncene": 1,
      "zamitnute": 1
    }
  },
  "message": "Seznam objednávek načten úspěšně"
}
```

#### **Popis polí odpovědi:**

| Pole | Typ | Popis |
|------|-----|-------|
| `orders[]` | array | Pole objednávek (BEZ položek - ty se načítají zvlášť) |
| `orders[].id` | number | Unikátní ID objednávky |
| `orders[].cislo_objednavky` | string | Číslo objednávky (např. "O-2026-0404") |
| `orders[].stav_objednavky` | string | Aktuální stav objednávky |
| `orders[].dt_objednavky` | string | Datum vytvoření objednávky |
| `orders[].dodavatel_*` | string | Údaje o dodavateli |
| `orders[].objednatel_*` | string | Údaje o objednateli |
| `orders[].garant_*` | string | Údaje o garantovi |
| `orders[].druh_objednavky_kod` | string | **JSON string s kódem a názvem druhu** (interní) |
| `orders[].druh_objednavky_nazev` | string | **Název druhu objednávky** (např. "Dodávka zboží") |
| `orders[].druh_objednavky_atribut` | number | Atribut: 0 = běžné, 1 = majetek |
| `orders[].max_cena_s_dph` | number | Maximální cena objednávky s DPH |
| `orders[].cena_s_dph` | number | Součet cen položek s DPH |
| `orders[].faktury_celkova_castka_s_dph` | number | Součet částek faktur |
| `orders[].pocet_polozek` | number | Počet položek (podřádků) |
| `orders[].pocet_priloh` | number | Počet příloh |
| `orders[].pocet_faktur` | number | Počet faktur |
| `orders[].financovani` | object | Financování objednávky (LP, smlouva) |
| `orders[].comments_count` | number | Počet komentářů |
| `pagination` | object | Informace o stránkování |
| `pagination.page` | number | Aktuální stránka |
| `pagination.per_page` | number | Počet záznamů na stránku |
| `pagination.total` | number | Celkový počet objednávek |
| `pagination.total_pages` | number | Celkový počet stránek |
| `stats` | object | Statistiky podle stavů |
| `stats.total` | number | Celkový počet objednávek |
| `stats.nove` | number | Počet nových objednávek |
| `stats.schvalene` | number | Počet schválených objednávek |

---

### ❌ **Chybové odpovědi:**

#### **Chybějící token (HTTP 400):**
```json
{
  "status": "error",
  "message": "Chybí token nebo username"
}
```

#### **Neplatný token (HTTP 401):**
```json
{
  "status": "error",
  "message": "Neplatný token"
}
```

#### **Databázová chyba (HTTP 500):**
```json
{
  "status": "error",
  "message": "Chyba při načítání objednávek"
}
```

---

## 📦 2. Detail Položek Objednávky (`/order-v3/items`)

### ⚡ **LAZY LOADING - Třístupňové načítání**

**Proč třístupňové?**
- **1. krok (`/order-v3/list`):** Načte **seznam objednávek** s běžnými údaji (bez položek, bez detailů faktur)
  - Rychlé načtení přehledu
  - Menší data (pagination)
  - Zobrazuje: `pocet_faktur`, `faktury_celkova_castka_s_dph` (jen celkový součet)
  
- **2. krok (`/order-v3/items`):** Načte **detail položek** konkrétní objednávky
  - Lazy loading - pouze když uživatel otevře detail objednávky
  - Položky (podřádky), přílohy, poznámky
  - **NEOBSAHUJE detailní info o fakturách** (jen počet a součet z kroku 1)
  
- **3. krok (`/orders-v3/invoices`):** Načte **detail faktur** konkrétní objednávky
  - Lazy loading - pouze když uživatel klikne na "Zobrazit faktury"
  - VS čísla, jednotlivé částky, stavy, LP kódy, střediska
  - **Optimalizace:** Většina uživatelů nepotřebuje vidět detail faktur

**📱 WORKFLOW PRO MOBILNÍ APLIKACI:**
1. Uživatel otevře seznam objednávek → zavolej `/order-v3/list`
2. Zobraz seznam objednávek (cislo_objednavky, stav, dodavatel, částka, **pocet_faktur**)
3. Uživatel klikne na konkrétní objednávku → zavolej `/order-v3/items?order_id=415`
4. Zobraz detail s položkami, přílohami, poznámkami
5. **(Volitelně)** Uživatel klikne na "Zobrazit faktury (2)" → zavolej `/orders-v3/invoices?order_id=415`
6. Zobraz detail faktur: VS čísla, částky, stavy, LP kódy

---

### 📤 **REQUEST**

#### **URL:**
```
POST https://erdms.zachranka.cz/api.eeo/order-v3/items
```

#### **Headers:**
```
Content-Type: application/json
```

#### **Body:**
```json
{
  "token": "dXNlckBkb21haW4uY3p8MTc0MjkwMzk4MA==",
  "username": "user@domain.cz",
  "order_id": 415
}
```

#### **Parametry:**

| Parametr | Typ | Povinný | Popis |
|----------|-----|---------|-------|
| `token` | string | ✅ Ano | Autentizační token |
| `username` | string | ✅ Ano | Email uživatele |
| `order_id` | number | ✅ Ano | ID objednávky (z `/order-v3/list`) |

---

### 📥 **RESPONSE**

#### **Úspěšná odpověď (HTTP 200):**

```json
{
  "status": "success",
  "data": {
    "order_id": 415,
    "items": [
      {
        "id": 101,
        "popis": "Notebook Dell Latitude 7420",
        "cena_bez_dph": 20661.16,
        "sazba_dph": 21,
        "cena_s_dph": 25000.00,
        "usek_kod": "IT",
        "budova_kod": "HQ",
        "mistnost_kod": "301",
        "poznamka": "14\" Full HD, i7, 16GB RAM, 512GB SSD",
        "lp_id": 12,
        "lppts_cislo": "LP-2026-001",
        "lppts_nazev": "Provozní náklady",
        "dt_vytvoreni": "2026-04-15 10:35:00"
      },
      {
        "id": 102,
        "popis": "Dokovací stanice Dell WD19",
        "cena_bez_dph": 4132.23,
        "sazba_dph": 21,
        "cena_s_dph": 5000.00,
        "usek_kod": "IT",
        "budova_kod": "HQ",
        "mistnost_kod": "301",
        "poznamka": null,
        "lp_id": 12,
        "lppts_cislo": "LP-2026-001",
        "lppts_nazev": "Provozní náklady",
        "dt_vytvoreni": "2026-04-15 10:36:00"
      }
    ],
    "attachments": [
      {
        "id": 50,
        "guid": "2026-04-15_a3f8c2d1e4b9f7a6c5d8e1f2",
        "originalni_nazev_souboru": "Objednávka notebooků.pdf",
        "systemova_cesta": "obj-2026-04-15_a3f8c2d1e4b9f7a6c5d8e1f2.pdf",
        "typ_prilohy": "OBJEDNAVKA",
        "velikost_souboru_b": 245680,
        "nahrano_uzivatel_id": 13,
        "dt_vytvoreni": "2026-04-15 10:40:00",
        "nahral_jmeno": "Jan",
        "nahral_prijmeni": "Novák",
        "nahral_email": "jan.novak@zachranka.cz",
        "nahral_titul_pred": "Ing.",
        "nahral_titul_za": null
      },
      {
        "id": 51,
        "guid": "2026-04-16_b4f9d3e2f5c8g8b7d6e9f3g3",
        "originalni_nazev_souboru": "Schválení objednávky.pdf",
        "systemova_cesta": "obj-2026-04-16_b4f9d3e2f5c8g8b7d6e9f3g3.pdf",
        "typ_prilohy": "SCHVALENI",
        "velikost_souboru_b": 182340,
        "nahrano_uzivatel_id": 15,
        "dt_vytvoreni": "2026-04-16 09:15:00",
        "nahral_jmeno": "Marie",
        "nahral_prijmeni": "Svobodová",
        "nahral_email": "marie.svobodova@zachranka.cz",
        "nahral_titul_pred": "PhDr.",
        "nahral_titul_za": "Ph.D."
      }
    ],
    "notes": "Urgentní dodávka notebooků pro nové zaměstnance IT oddělení. Termín dodání: 30.4.2026."
  },
  "message": "Detail objednávky načten úspěšně"
}
```

#### **Popis polí odpovědi:**

| Pole | Typ | Popis |
|------|-----|-------|
| `order_id` | number | ID objednávky |
| `items[]` | array | Pole položek (podřádků) objednávky |
| `items[].id` | number | Unikátní ID položky |
| `items[].popis` | string | Popis položky/služby (např. "Notebook Dell Latitude 7420") |
| `items[].cena_bez_dph` | number | Cena položky BEZ DPH |
| `items[].sazba_dph` | number | Sazba DPH v % (např. 21) |
| `items[].cena_s_dph` | number | Cena položky s DPH (finální cena) |
| `items[].usek_kod` | string | Kód úseku (organizační útvar) |
| `items[].budova_kod` | string | Kód budovy (např. "HQ", "OB01") |
| `items[].mistnost_kod` | string | Kód místnosti (např. "301", "2.15") |
| `items[].poznamka` | string/null | Poznámka k položce |
| `items[].lp_id` | number/null | ID Limitovaného příslibu (LP kódu) |
| `items[].lppts_cislo` | string/null | Číslo LP kódu (např. "LP-2026-001") |
| `items[].lppts_nazev` | string/null | Název LP kódu (např. "Provozní náklady") |
| `items[].dt_vytvoreni` | string | Datum a čas vytvoření položky |
| `attachments[]` | array | Pole příloh objednávky |
| `attachments[].id` | number | ID přílohy |
| `attachments[].guid` | string | Globálně unikátní identifikátor přílohy |
| `attachments[].originalni_nazev_souboru` | string | Originální název souboru při nahrání |
| `attachments[].systemova_cesta` | string | Cesta k souboru na serveru (relativní) |
| `attachments[].typ_prilohy` | string | Typ přílohy (OBJEDNAVKA, SCHVALENI, FAKTURA, JINE) |
| `attachments[].velikost_souboru_b` | number | Velikost souboru v bytech |
| `attachments[].nahrano_uzivatel_id` | number | ID uživatele, který nahrál přílohu |
| `attachments[].dt_vytvoreni` | string | Datum a čas nahrání přílohy |
| `attachments[].nahral_jmeno` | string | Jméno uživatele, který nahrál |
| `attachments[].nahral_prijmeni` | string | Příjmení uživatele, který nahrál |
| `attachments[].nahral_email` | string | Email uživatele, který nahrál |
| `attachments[].nahral_titul_pred` | string/null | Titul před jménem (Ing., PhDr., atd.) |
| `attachments[].nahral_titul_za` | string/null | Titul za jménem (Ph.D., CSc., atd.) |
| `notes` | string/null | Poznámky k objednávce |

---

### 🧮 **KALKULACE CENY POLOŽKY**

Každá položka obsahuje **3 cenové údaje**, které musí být v souladu:

```javascript
// ✅ Výpočet DPH a ceny s DPH
const item = {
  cena_bez_dph: 20661.16,
  sazba_dph: 21,  // 21%
  cena_s_dph: 25000.00
};

// Ověření správnosti výpočtu:
const dph = item.cena_bez_dph * (item.sazba_dph / 100);  // 4338.84
const vypocet_s_dph = item.cena_bez_dph + dph;           // 25000.00
console.log(vypocet_s_dph === item.cena_s_dph);          // true
```

**📌 DŮLEŽITÉ:**
- **Backend API automaticky počítá `cena_s_dph`** na základě `cena_bez_dph` a `sazba_dph`
- **Uživatel zadává cenu BEZ DPH** + vybere sazbu DPH → backend dopočítá cenu s DPH
- **Součet všech položek** (`SUM(items[].cena_s_dph)`) = `order.cena_s_dph` v seznamu objednávek

---

### 📍 **ORGANIZAČNÍ STRUKTURA POLOŽKY**

Každá položka může mít přiřazené **3 organizační údaje**:

| Pole | Význam | Příklad | Použití |
|------|--------|---------|---------|
| `usek_kod` | Organizační úsek/oddělení | "IT", "FIN", "LOG" | Účetní středisko |
| `budova_kod` | Kód budovy | "HQ", "OB01", "Praha-1" | Umístění majetku |
| `mistnost_kod` | Kód místnosti | "301", "2.15", "A-123" | Konkrétní místnost |

**📱 UI DOPORUČENÍ:**
```javascript
function renderItemLocation(item) {
  const parts = [];
  
  if (item.usek_kod) parts.push(`Úsek: ${item.usek_kod}`);
  if (item.budova_kod) parts.push(`Budova: ${item.budova_kod}`);
  if (item.mistnost_kod) parts.push(`Místnost: ${item.mistnost_kod}`);
  
  return parts.join(' | ') || 'Bez umístění';
}

// Výstup: "Úsek: IT | Budova: HQ | Místnost: 301"
```

---

### 💰 **LP KÓDY (LIMITOVANÉ PŘÍSLIBY)**

Každá položka může být financována z **LP kódu** (limitovaného příslibu):

**Co je LP kód?**
- **Rozpočtový nástroj** - schválený limit na konkrétní účel
- **Sleduje se čerpání** - kolik bylo utraceno vs. kolik zbývá
- **Má bankovní účet** - každý LP má přiřazené číslo účtu

**Struktura LP u položky:**
```javascript
{
  "lp_id": 12,                      // ID LP kódu
  "lppts_cislo": "LP-2026-001",     // Číslo LP (zobrazovat v UI)
  "lppts_nazev": "Provozní náklady" // Název LP (co financuje)
}
```

**📱 Zobrazení v UI:**
```
┌─────────────────────────────────────┐
│ 📦 Notebook Dell Latitude 7420     │
│ 💰 25 000 Kč (20 661 Kč + 21% DPH) │
│ 📍 IT | HQ | 301                    │
│ 💳 LP-2026-001: Provozní náklady    │
│ 📝 14" Full HD, i7, 16GB RAM        │
└─────────────────────────────────────┘
```

---

### 📎 **PŘÍLOHY OBJEDNÁVKY**

Každá objednávka může mít **několik příloh** (PDF dokumenty, obrázky, atd.).

**Typy příloh (`typ_prilohy`):**
- `OBJEDNAVKA` - Samotná objednávka (PDF)
- `SCHVALENI` - Podepsané schválení
- `FAKTURA` - Faktura od dodavatele
- `SMLOUVA` - Smlouva s dodavatelem
- `PRILOHA` - Další příloha (technická specifikace, foto, atd.)
- `JINE` - Ostatní

**📌 Struktura přílohy:**
```javascript
{
  "id": 50,
  "guid": "2026-04-15_a3f8c2d1e4b9f7a6c5d8e1f2",
  "originalni_nazev_souboru": "Objednávka notebooků.pdf",
  "systemova_cesta": "obj-2026-04-15_a3f8c2d1e4b9f7a6c5d8e1f2.pdf",
  "typ_prilohy": "OBJEDNAVKA",
  "velikost_souboru_b": 245680,
  "nahrano_uzivatel_id": 13,
  "dt_vytvoreni": "2026-04-15 10:40:00",
  "nahral_jmeno": "Jan",
  "nahral_prijmeni": "Novák",
  "nahral_email": "jan.novak@zachranka.cz",
  "nahral_titul_pred": "Ing.",
  "nahral_titul_za": null
}
```

**📱 Zobrazení v UI:**
```javascript
function renderAttachment(attachment) {
  // Formátování velikosti
  const sizeMB = (attachment.velikost_souboru_b / 1024 / 1024).toFixed(2);
  
  // Formátování jména nahrávajícího
  const uploader = [
    attachment.nahral_titul_pred,
    attachment.nahral_jmeno,
    attachment.nahral_prijmeni,
    attachment.nahral_titul_za
  ].filter(Boolean).join(' ');
  
  // Typ přílohy - ikona
  const icon = {
    'OBJEDNAVKA': '📄',
    'SCHVALENI': '✅',
    'FAKTURA': '💰',
    'SMLOUVA': '📝',
    'PRILOHA': '📎',
    'JINE': '📋'
  }[attachment.typ_prilohy] || '📄';
  
  return `
    ${icon} ${attachment.originalni_nazev_souboru}
    ${sizeMB} MB | Nahrál: ${uploader}
    ${formatDate(attachment.dt_vytvoreni)}
  `;
}
```

**🔗 STAHOVÁNÍ SOUBORU:**

⚠️ **DŮLEŽITÉ:** Endpoint `/order-v3/items` vrací **POUZE metadata** (název, velikost, kdo nahrál).

Pro **stažení samotného souboru** použij:
```javascript
// URL pro stažení přílohy
const downloadUrl = `${API_BASE_URL}/download/attachment?guid=${attachment.guid}`;

// Nebo pokud máš ID přílohy:
const downloadUrl = `${API_BASE_URL}/download/attachment?id=${attachment.id}`;
```

**Příklad stažení:**
```javascript
async function downloadAttachment(attachment, token, username) {
  const url = `${API_BASE_URL}/download/attachment`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: token,
      username: username,
      guid: attachment.guid
    })
  });
  
  if (!response.ok) {
    throw new Error('Chyba při stahování souboru');
  }
  
  // Získání souboru jako blob
  const blob = await response.blob();
  
  // Stažení souboru na zařízení
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = attachment.originalni_nazev_souboru;
  link.click();
}
```

---

### ❌ **Chybové odpovědi:**

#### **Chybějící order_id (HTTP 400):**
```json
{
  "status": "error",
  "message": "Chybí order_id"
}
```

#### **Nemáte oprávnění (HTTP 403):**
```json
{
  "status": "error",
  "message": "Nemáte oprávnění k této objednávce"
}
```

#### **Objednávka neexistuje (HTTP 404):**
```json
{
  "status": "error",
  "message": "Objednávka neexistuje"
}
```

---

## � 3. Faktury Objednávky (`/orders-v3/invoices`)

### ⚡ **LAZY LOADING - Třístupňové načítání**

**Proč třístupňové načítání?**
1. **Seznam objednávek (`/order-v3/list`)** - Základní přehled s počty faktur
2. **Detail položek (`/order-v3/items`)** - Položky a přílohy (BEZ faktur)
3. **Faktury (`/orders-v3/invoices`)** - Detailní info o fakturách (VS čísla, částky, stavy)

**📱 WORKFLOW PRO MOBILNÍ APLIKACI:**
1. Uživatel otevře seznam objednávek → zavolej `/order-v3/list`
2. Zobraz přehled s: `pocet_faktur` a `faktury_celkova_castka_s_dph`
3. Uživatel klikne na objednávku → zavolej `/order-v3/items` (položky + přílohy)
4. Uživatel chce vidět detail faktur → zavolej `/orders-v3/invoices` (VS čísla, jednotlivé částky)

**⚠️ DŮVOD:**
- Faktury se načítají **samostatně**, protože obsahují hodně dat (LP kódy, střediska, uživatele)
- Většina uživatelů nepotřebuje detailní info o fakturách → načítá se jen když to uživatel explicitně chce

---

### 📤 **REQUEST**

#### **URL:**
```
POST https://erdms.zachranka.cz/api.eeo/orders-v3/invoices
```

#### **Headers:**
```
Content-Type: application/json
```

#### **Body:**
```json
{
  "token": "dXNlckBkb21haW4uY3p8MTc0MjkwMzk4MA==",
  "username": "user@domain.cz",
  "order_id": 415
}
```

#### **Parametry:**

| Parametr | Typ | Povinný | Popis |
|----------|-----|---------|-------|
| `token` | string | ✅ Ano | Autentizační token |
| `username` | string | ✅ Ano | Email uživatele |
| `order_id` | number | ✅ Ano | ID objednávky (z `/order-v3/list`) |

---

### 📥 **RESPONSE**

#### **Úspěšná odpověď (HTTP 200):**

```json
{
  "status": "success",
  "data": {
    "invoices": [
      {
        "id": 201,
        "fa_cislo_vema": "2026001234",
        "fa_vema_kod": "FA-2026-001",
        "fa_datum_vystaveni": "2026-04-20",
        "fa_datum_doruceni": "2026-04-22",
        "fa_datum_splatnosti": "2026-05-20",
        "fa_castka": 60000.00,
        "stav": "K_ZAPLACENI",
        "fa_poznamka": "První dílčí plnění",
        "fa_strediska_kod": "[\"123\",\"456\"]",
        "fa_lp_kody": "LP-2026-001|Provozní náklady;;LP-2026-045|IT vybavení",
        "dt_vytvoreni": "2026-04-22 10:30:00",
        "vytvoril_uzivatel_id": 10,
        "vytvoril_jmeno": "Petr",
        "vytvoril_prijmeni": "Svoboda",
        "vytvoril_email": "svoboda@zachranka.cz",
        "vytvoril_titul_pred": "Ing.",
        "vytvoril_titul_za": null,
        "dt_potvrzeni_vecne_spravnosti": "2026-04-23 14:15:00",
        "potvrdil_vecnou_spravnost_id": 15,
        "potvrdil_vecnou_spravnost_jmeno": "Marie",
        "potvrdil_vecnou_spravnost_prijmeni": "Nováková",
        "potvrdil_vecnou_spravnost_email": "novakova@zachranka.cz",
        "potvrdil_vecnou_spravnost_titul_pred": null,
        "potvrdil_vecnou_spravnost_titul_za": null,
        "vecna_spravnost_poznamka": "Zkontrolováno a v pořádku"
      },
      {
        "id": 202,
        "fa_cislo_vema": "2026001235",
        "fa_vema_kod": "FA-2026-002",
        "fa_datum_vystaveni": "2026-05-10",
        "fa_datum_doruceni": "2026-05-12",
        "fa_datum_splatnosti": "2026-06-10",
        "fa_castka": 60000.00,
        "stav": "ZAPLACENO",
        "fa_poznamka": "Druhé dílčí plnění",
        "fa_strediska_kod": "[\"123\"]",
        "fa_lp_kody": "LP-2026-001|Provozní náklady",
        "dt_vytvoreni": "2026-05-12 09:20:00",
        "vytvoril_uzivatel_id": 10,
        "vytvoril_jmeno": "Petr",
        "vytvoril_prijmeni": "Svoboda",
        "vytvoril_email": "svoboda@zachranka.cz",
        "vytvoril_titul_pred": "Ing.",
        "vytvoril_titul_za": null,
        "dt_potvrzeni_vecne_spravnosti": null,
        "potvrdil_vecnou_spravnost_id": null,
        "potvrdil_vecnou_spravnost_jmeno": null,
        "potvrdil_vecnou_spravnost_prijmeni": null,
        "potvrdil_vecnou_spravnost_email": null,
        "potvrdil_vecnou_spravnost_titul_pred": null,
        "potvrdil_vecnou_spravnost_titul_za": null,
        "vecna_spravnost_poznamka": null
      }
    ],
    "count": 2
  },
  "message": "Faktury načteny úspěšně"
}
```

#### **Popis polí odpovědi:**

| Pole | Typ | Popis |
|------|-----|-------|
| `invoices[]` | array | Pole faktur objednávky |
| `invoices[].id` | number | Unikátní ID faktury |
| `invoices[].fa_cislo_vema` | string | **VS číslo faktury** (variabilní symbol) |
| `invoices[].fa_vema_kod` | string | Kód faktury ve VEMA systému |
| `invoices[].fa_datum_vystaveni` | string (date) | Datum vystavení faktury |
| `invoices[].fa_datum_doruceni` | string (date) | Datum doručení faktury |
| `invoices[].fa_datum_splatnosti` | string (date) | Datum splatnosti faktury |
| `invoices[].fa_castka` | number | **Částka faktury s DPH** |
| `invoices[].stav` | string | Stav faktury (viz tabulka níže) |
| `invoices[].fa_poznamka` | string/null | Poznámka k faktuře |
| `invoices[].fa_strediska_kod` | string/null | JSON pole kódů středisek (např. `["123","456"]`) |
| `invoices[].fa_lp_kody` | string/null | LP kódy faktury (formát: `LP-cislo\|Název;;LP-cislo2\|Název2`) |
| `invoices[].dt_vytvoreni` | string | Datum a čas vytvoření záznamu faktury |
| `invoices[].vytvoril_*` | string | Údaje o uživateli, který vytvořil fakturu |
| `invoices[].potvrdil_vecnou_spravnost_*` | string/null | Údaje o uživateli, který potvrdil věcnou správnost |
| `invoices[].dt_potvrzeni_vecne_spravnosti` | string/null | Datum a čas potvrzení věcné správnosti |
| `invoices[].vecna_spravnost_poznamka` | string/null | Poznámka při potvrzení věcné správnosti |
| `count` | number | Počet faktur |

---

### 🏷️ **STAVY FAKTUR**

| Kód stavu | Název | Popis |
|-----------|-------|-------|
| `ZAEVIDOVANA` | Zaevidovaná | Nově vložená z podatelny |
| `VECNA_SPRAVNOST` | Věcná správnost | Poslaná k potvrzení věcné správnosti |
| `V_RESENI` | V řešení | Čeká se na dořešení (nejasnosti) |
| `PREDANA_PO` | Předána PO | Fyzicky na ředitelství (v kolečku) |
| `K_ZAPLACENI` | K zaplacení | Předáno HÚ k úhradě (finální) |
| `ZAPLACENO` | Zaplaceno | Uhrazeno |
| `STORNO` | Storno | Stažena dodavatelem |

**📊 Barvy pro UI:**
```javascript
function getInvoiceStatusColor(stav) {
  const colors = {
    'ZAEVIDOVANA': '#94a3b8',      // Šedá - nová
    'VECNA_SPRAVNOST': '#f59e0b',  // Oranžová - ke kontrole
    'V_RESENI': '#ef4444',         // Červená - problém
    'PREDANA_PO': '#3b82f6',       // Modrá - v procesu
    'K_ZAPLACENI': '#8b5cf6',      // Fialová - připraveno
    'ZAPLACENO': '#10b981',        // Zelená - dokončeno
    'STORNO': '#ef4444'            // Červená - zrušeno
  };
  return colors[stav] || '#6b7280';
}
```

---

### 💰 **PARSOVÁNÍ LP KÓDŮ**

Faktury obsahují **LP kódy** ve formátu:
```
"LP-2026-001|Provozní náklady;;LP-2026-045|IT vybavení"
```

**⚠️ UPOZORNĚNÍ:** Toto pole může být `null`, prázdný string nebo špatně naformátované!  
👉 **Použij SAFE parsing funkci** z sekce [🛡️ OCHRANA PROTI CRASHŮM](#-ochrana-proti-crashům---safe-parsing)

**Jak zpracovat v JavaScriptu:**
```javascript
// ✅ DOPORUČENÁ VERZE - s plnou ochranou (viz sekce výše)
function safeParseInvoiceLpCodes(fa_lp_kody) {
  if (!fa_lp_kody || typeof fa_lp_kody !== 'string' || fa_lp_kody.trim() === '') {
    return [];
  }

  try {
    return fa_lp_kody.split(';;').map(lpStr => {
      const parts = lpStr.split('|');
      const cislo = parts[0]?.trim() || '';
      const nazev = parts[1]?.trim() || '(bez názvu)';
      
      if (!cislo) return null;
      
      return { cislo, nazev };
    }).filter(lp => lp !== null);
  } catch (error) {
    console.error('Chyba při parsování fa_lp_kody:', error);
    return [];
  }
}

// Použití:
const invoice = {
  fa_lp_kody: "LP-2026-001|Provozní náklady;;LP-2026-045|IT vybavení"
};

const lpCodes = safeParseInvoiceLpCodes(invoice.fa_lp_kody);
console.log(lpCodes);
/*
[
  { cislo: "LP-2026-001", nazev: "Provozní náklady" },
  { cislo: "LP-2026-045", nazev: "IT vybavení" }
]
*/
```

**📱 Zobrazení v UI:**
```
┌─────────────────────────────────────┐
│ 📄 Faktura VS: 2026001234           │
│ 💰 60 000 Kč                         │
│ 📅 Vystaveno: 20.04.2026             │
│ 📅 Splatnost: 20.05.2026             │
│ 🏷️ K zaplacení                       │
│                                      │
│ 💳 LP kódy:                          │
│ • LP-2026-001: Provozní náklady      │
│ • LP-2026-045: IT vybavení           │
└─────────────────────────────────────┘
```

---

### 📊 **PARSOVÁNÍ STŘEDISEK**

Střediska jsou uložena jako **JSON pole v textovém formátu**:
```json
"[\"123\",\"456\"]"
```

**⚠️ UPOZORNĚNÍ:** Toto pole může být `null`, prázdný string nebo nevalidní JSON!  
👉 **Použij SAFE parsing funkci** z sekce [🛡️ OCHRANA PROTI CRASHŮM](#-ochrana-proti-crashům---safe-parsing)

**Jak zpracovat:**
```javascript
// ✅ DOPORUČENÁ VERZE - s plnou ochranou (viz sekce výše)
function safeParseInvoiceStrediska(fa_strediska_kod) {
  if (!fa_strediska_kod || typeof fa_strediska_kod !== 'string' || fa_strediska_kod.trim() === '') {
    return [];
  }
  
  try {
    const parsed = JSON.parse(fa_strediska_kod);
    
    if (!Array.isArray(parsed)) {
      console.warn('fa_strediska_kod není pole');
      return [];
    }
safeP
    return parsed
      .filter(kod => typeof kod === 'string' && kod.trim() !== '')
      .map(kod => kod.trim());
  } catch (error) {
    console.error('Chyba při parsování fa_strediska_kod:', error);
    return [];
  }
}

// Použití:
const invoice = {
  fa_strediska_kod: "[\"123\",\"456\"]"
};

const strediska = parseInvoiceStrediska(invoice.fa_strediska_kod);
console.log(strediska);  // ["123", "456"]
```

---

### 👤 **FORMÁTOVÁNÍ JMEN UŽIVATELŮ**

Faktury obsahují údaje o uživatelích ve formě prefixovaných polí:

**Funkce pro formátování:**
```javascript
function formatUserName(prefix, invoice) {
  const jmeno = invoice[`${prefix}_jmeno`];
  const prijmeni = invoice[`${prefix}_prijmeni`];
  const titul_pred = invoice[`${prefix}_titul_pred`];
  const titul_za = invoice[`${prefix}_titul_za`];
  
  if (!jmeno && !prijmeni) return null;
  
  const parts = [];
  if (titul_pred) parts.push(titul_pred);
  parts.push(jmeno);
  parts.push(prijmeni);
  if (titul_za) parts.push(titul_za);
  
  return parts.join(' ');
}

// Použití:
const vytvoril = formatUserName('vytvoril', invoice);
// "Ing. Petr Svoboda"

const potvrdil = formatUserName('potvrdil_vecnou_spravnost', invoice);
// "Marie Nováková" (nebo null pokud nepotvrzeno)
```

---

### ❌ **Chybové odpovědi:**

#### **Chybějící order_id (HTTP 400):**
```json
{
  "status": "error",
  "message": "Chybí nebo neplatné ID objednávky",
  "code": "INVALID_ORDER_ID"
}
```

#### **Neplatný token (HTTP 401):**
```json
{
  "status": "error",
  "message": "Neplatný nebo vypršelý token",
  "code": "INVALID_TOKEN"
}
```

#### **Databázová chyba (HTTP 500):**
```json
{
  "status": "error",
  "message": "Chyba při načítání faktur objednávky",
  "code": "SERVER_ERROR"
}
```

---

### 💡 **PŘÍKLAD: Kompletní zobrazení faktury**

```javascript
async function fetchAndRenderInvoices(orderId) {
  // 1. Načíst faktury
  const response = await fetch('https://erdms.zachranka.cz/api.eeo/orders-v3/invoices', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      token: getUserToken(),
      username: getUserEmail(),
      order_id: orderId
    })
  });

  const data = await response.json();
  
  if (data.status !== 'success') {
    throw new Error(data.message);
  }

  // 2. Zpracovat a zobrazit faktury
  data.data.invoices.forEach(invoice => {
    // Parsovat LP kódy
    const lpCodes = parseInvoiceLpCodes(invoice.fa_lp_kody);
    
    // Parsovat střediska
    const strediska = parseInvoiceStrediska(invoice.fa_strediska_kod);
    
    // Formátovat uživatele
    const vytvoril = formatUserName('vytvoril', invoice);
    const potvrdil = formatUserName('potvrdil_vecnou_spravnost', invoice);
    
    // Zobrazit
    renderInvoiceCard({
      vs: invoice.fa_cislo_vema,
      castka: invoice.fa_castka,
      datum_vystaveni: invoice.fa_datum_vystaveni,
      datum_splatnosti: invoice.fa_datum_splatnosti,
      stav: invoice.stav,
      stav_color: getInvoiceStatusColor(invoice.stav),
      poznamka: invoice.fa_poznamka,
      lp_codes: lpCodes,
      strediska: strediska,
      vytvoril: vytvoril,
      potvrdil: potvrdil,
      dt_potvrzeni: invoice.dt_potvrzeni_vecne_spravnosti
    });
  });
  
  // 3. Zobrazit součet
  const total = data.data.invoices.reduce((sum, inv) => sum + inv.fa_castka, 0);
  renderInvoiceTotal(total, data.data.count);
}
```

**📱 UI Výstup:**
```
┌─────────────────────────────────────┐
│ 📄 FAKTURY OBJEDNÁVKY O-2026-0404  │
├─────────────────────────────────────┤
│                                      │
│ 📄 VS: 2026001234                    │
│ 💰 60 000 Kč                         │
│ 📅 20.04.2026 → splatnost 20.05.2026 │
│ 🏷️ K zaplacení                       │
│                                      │
│ 💳 LP kódy:                          │
│ • LP-2026-001: Provozní náklady      │
│ • LP-2026-045: IT vybavení           │
│                                      │
│ 👤 Vytvořil: Ing. Petr Svoboda       │
│ ✅ Potvrdil: Marie Nováková (23.04)  │
│                                      │
│ 📝 První dílčí plnění                │
├─────────────────────────────────────┤
│                                      │
│ 📄 VS: 2026001235                    │
│ 💰 60 000 Kč                         │
│ 📅 10.05.2026 → splatnost 10.06.2026 │
│ 🏷️ Zaplaceno ✅                      │
│                                      │
│ 💳 LP kódy:                          │
│ • LP-2026-001: Provozní náklady      │
│                                      │
│ 👤 Vytvořil: Ing. Petr Svoboda       │
│                                      │
│ 📝 Druhé dílčí plnění                │
├─────────────────────────────────────┤
│ CELKEM: 120 000 Kč (2 faktury)      │
└─────────────────────────────────────┘
```

---

## �📱 Implementace pro Mobilní Aplikaci

### ✅ **DOPORUČENÝ WORKFLOW**

#### **1. Seznam objednávek (hlavní obrazovka):**

```javascript
// 📋 Načíst seznam objednávek s pagingem
async function fetchOrders(page = 1, filters = {}) {
  const response = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: getUserToken(),
      username: getUserEmail(),
      page: page,
      per_page: 5, // Mobilní paging: 5 objednávek
      year: new Date().getFullYear(),
      filters: filters // např. {stav: ["SCHVALENA"]}
    })
  });

  const data = await response.json();
  
  if (data.status === 'success') {
    return {
      orders: data.data.orders,
      pagination: data.data.pagination,
      stats: data.data.stats
    };
  } else {
    throw new Error(data.message);
  }
}

// 📱 Příklad použití:
const result = await fetchOrders(1, {stav: ["SCHVALENA", "POTVRZENA"]});
console.log(`Načteno ${result.orders.length} objednávek ze ${result.pagination.total}`);
console.log(`Statistiky: ${result.stats.schvalene} schválených, ${result.stats.potvrzene} potvrzených`);
```

#### **2. Detail objednávky (po kliknutí):**

```javascript
// 📦 Načíst detail objednávky (lazy loading)
async function fetchOrderDetail(orderId) {
  const response = await fetch('https://erdms.zachranka.cz/api.eeo/order-v3/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: getUserToken(),
      username: getUserEmail(),
      order_id: orderId
    })
  });

  const data = await response.json();
  
  if (data.status === 'success') {
    return {
      items: data.data.items,
      attachments: data.data.attachments,
      notes: data.data.notes
    };
  } else {
    throw new Error(data.message);
  }
}

// 📱 Příklad použití:
const detail = await fetchOrderDetail(415);
console.log(`Objednávka má ${detail.items.length} položek a ${detail.attachments.length} příloh`);
```

---

### 🎨 **UI KOMPONENTY PRO MOBILNÍ APLIKACI**

#### **A) Seznam objednávek - Card design:**

```
┌─────────────────────────────────────┐
│ 🔵 O-2026-0404          SCHVÁLENÁ   │
│                                      │
│ 📦 ČSOB Leasing                      │
│ 💰 120 000 Kč                        │
│ 👤 Petr Svoboda                      │
│ 📅 15.04.2026                        │
│                                      │
│ 📎 2 přílohy  💬 5 komentářů         │
└─────────────────────────────────────┘
```

#### **B) Filtrování podle stavů - Toggle tagy:**

```
[ Všechny ]  [ Nové ]  [ Ke schválení ]  [ Schválené ]
```

Po kliknutí na tag:
```javascript
fetchOrders(1, {stav: ["NOVA"]});
```

#### **C) Paging - Load more:**

```
┌─────────────────────────────────────┐
│ Objednávka 1                         │
│ Objednávka 2                         │
│ Objednávka 3                         │
│ Objednávka 4                         │
│ Objednávka 5                         │
├─────────────────────────────────────┤
│     [ Načíst dalších 5 ]             │
│     Zobrazeno 5 z 47                 │
└─────────────────────────────────────┘
```

Při kliknutí:
```javascript
const nextPage = currentPage + 1;
fetchOrders(nextPage);
```

---

### 📊 **Zobrazení Statistik (Dashboard):**

```javascript
// Načíst statistiky ze seznamu objednávek
const result = await fetchOrders(1);

// Zobrazit statistiky
const stats = result.stats;
/*
  stats = {
    total: 47,
    nove: 5,
    ke_schvaleni: 12,
    schvalene: 15,
    ...
  }
*/

// UI:
/*
┌─────────────────────────────────────┐
│  Přehled objednávek (47 celkem)     │
├─────────────────────────────────────┤
│  🆕 Nové:           5                │
│  ⏳ Ke schválení:   12               │
│  ✅ Schválené:      15               │
│  🔄 Rozpracované:   8                │
│  ✉️ Odeslané:       3                │
│  ✔️ Potvrzené:      2                │
│  🏁 Dokončené:      1                │
└─────────────────────────────────────┘
*/
```

---

## 🔍 FAQ - Často Kladené Otázky

### ❓ **Proč třístupňové načítání (list + items + invoices)?**
**Odpověď:** **Optimalizace výkonu a datových toků!** 

**3 úrovně detailu:**
1. **Seznam (`/order-v3/list`)** - Rychlý přehled (číslo, stav, dodavatel, částka, počet faktur)
2. **Detail položek (`/order-v3/items`)** - Položky, přílohy, poznámky
3. **Detail faktur (`/orders-v3/invoices`)** - VS čísla, částky, stavy, LP kódy

**Proč ne vše najednou?**
- Seznam objednávek může mít **50+ záznamů** → načíst všechny položky a faktury = **megabytes dat**
- Většina uživatelů **nepotřebuje vidět položky** v přehledu → načítají se jen když otevřou detail
- **Faktury** obsahují hodně dat (LP kódy, střediska, uživatele) → načítají se jen když uživatel klikne "Zobrazit faktury"

**📱 Uživatelská zkušenost:**
- **Rychlé načtení seznamu** (bez čekání na položky/faktury)
- **Progresivní načítání** (zobraz základní info → detail → faktury)
- **Úspora dat** (mobilní aplikace nepřenáší zbytečná data)

### ❓ **Kolik objednávek načíst na mobilu?**
**Odpověď:** **Doporučujeme `per_page: 5`** pro mobilní aplikaci. Desktop aplikace používá `per_page: 50`. Mobilní obrazovka je menší, uživatel scrolluje pomaleji → menší počet záznamů je přehlednější.

### ❓ **Jak implementovat infinite scroll?**
**Odpověď:** Při scrollování na konec seznamu automaticky načtěte další stránku:
```javascript
let currentPage = 1;

async function loadMoreOrders() {
  currentPage++;
  const result = await fetchOrders(currentPage);
  appendOrdersToList(result.orders);
}

// Event listener na scroll:
window.addEventListener('scroll', () => {
  if (isNearBottom() && !isLoading && currentPage < totalPages) {
    loadMoreOrders();
  }
});
```

### ❓ **Vidí uživatel VŠECHNY objednávky?**
**Odpověď:** **NE!** Běžný uživatel vidí **POUZE VLASTNÍ objednávky** (kde je objednatel, garant, příkazce nebo schvalovatel). Admin vidí všechny objednávky. Backend API automaticky aplikuje filtrování podle práv.

### ❓ **Jak zobrazit cenu objednávky?**
**Odpověď:** V seznamu objednávek máte k dispozici **3 cenové údaje** a každý se používá v jiné fázi:

1. **`max_cena_s_dph`** - Maximální cena objednávky
   - **Kdy použít:** Stavy NOVA, KE_SCHVALENI, SCHVALENA
   - **Význam:** Plánovaný limit, který schvaluje schvalovatel
   - **Příklad:** Objednávka ještě nemá vyplněné položky

2. **`cena_s_dph`** - Součet cen položek
   - **Kdy použít:** Stavy ROZPRACOVANA, ODESLANA, POTVRZENA
   - **Význam:** Skutečná cena vyplněných položek
   - **Příklad:** Objednávka má 3 položky za celkem 120 000 Kč

3. **`faktury_celkova_castka_s_dph`** - Součet částek faktur
   - **Kdy použít:** Stav DOKONCENA (a když pocet_faktur > 0)
   - **Význam:** Fakturovaná částka (může být rozdělena do více faktur)
   - **Příklad:** Objednávka má 2 faktury za celkem 85 000 Kč

**Doporučená logika:**
```javascript
function getDisplayPrice(order) {
  // Priorita: Faktury > Položky > Max. cena
  if (order.pocet_faktur > 0 && order.faktury_celkova_castka_s_dph > 0) {
    return order.faktury_celkova_castka_s_dph; // Fakturováno
  }
  if (order.pocet_polozek > 0 && order.cena_s_dph > 0) {
    return order.cena_s_dph; // Skutečná cena položek
  }
  return order.max_cena_s_dph; // Plánovaná max. cena
}
```

**📊 Srovnání částek:**
- V mobilní aplikaci můžete zobrazit **všechny 3 částky** vedle sebe, pokud se liší
- Příklad: "Max: 125 000 Kč | Položky: 120 000 Kč | Úspora: 5 000 Kč"
- Nebo: "Položky: 85 000 Kč | Fakturováno: 85 000 Kč ✅"

### ❓ **Jak zobrazit název dodavatele?**
**Odpověď:** Použijte pole `dodavatel_nazev` z objektu objednávky. Pokud chcete zobrazit i kontaktní osobu, máte k dispozici `dodavatel_kontakt_jmeno` a `dodavatel_kontakt_email`.

### ❓ **Jak implementovat filtrování podle více stavů?**
**Odpověď:** Pošlete pole kódů stavů:
```json
{
  "filters": {
    "stav": ["SCHVALENA", "POTVRZENA", "DOKONCENA"]
  }
}
```
Backend vrátí objednávky, které mají **NĚKTERÝ Z TĚCHTO STAVŮ** (OR logika).

### ❓ **Jak pracovat s druhem objednávky?**
**Odpověď:** Každá objednávka má **druh** (typ/kategorii):

**📊 Pole v response:**
- `druh_objednavky_nazev` - **Zobrazuj toto v UI** (např. "Dodávka zboží", "Služby")
- `druh_objednavky_atribut` - 0 = běžné, **1 = MAJETEK** (důležité pro workflow!)

**🏠 MAJETKOVÉ objednávky (atribut = 1):**
```javascript
if (order.druh_objednavky_atribut === 1) {
  showBadge('MAJETEK');
  // Majetkové objednávky vyžadují:
  // - Potvrzení věcné správnosti
  // - Potvrzení umístění majetku
  // - Evidenci v majetku organizace
}
```

**📱 UI zobrazení:**
```javascript
const icon = order.druh_objednavky_atribut === 1 ? '🏠' : '📦';
const badge = order.druh_objednavky_atribut === 1 ? '[MAJETEK]' : '';
return `${icon} ${order.druh_objednavky_nazev} ${badge}`;
// Výstup: "🏠 Elektronika [MAJETEK]" nebo "📦 Služby"
```

**🔍 Kompletní seznam druhů:**
- Dodávka zboží, Služby, Opravy, Servis, Licence
- **Majetek** (drobný i velký) - MAJETEK
- **Elektronika** - MAJETEK
- **Nábytek** - MAJETEK
- Léky, Infuze, Vzdělávání, Kancelářské potřeby
- ... celkem 28 druhů (viz sekce "Druh objednávky")

### ❓ **Jak filtrovat podle druhu objednávky?**
**Odpověď:** Backend API `/order-v3/list` **zatím nepodporuje filtrování podle druhu** v parametru `filters`.

**📱 Řešení:**
1. **Načti všechny objednávky** z API
2. **Filtruj na frontendu** podle `druh_objednavky_kod`:

```javascript
function filterByDruh(orders, druhKod) {
  return orders.filter(order => {
    if (!order.druh_objednavky_kod) return false;
    
    try {
      const parsed = JSON.parse(order.druh_objednavky_kod);
      return parsed.kod_stavu === druhKod;
    } catch (e) {
      return false;
    }
  });
}

// Použití:
const allOrders = await fetchOrders(1);
const sluzby = filterByDruh(allOrders.orders, 'SLUZBY');
const majetek = filterByDruh(allOrders.orders, 'MAJETEK');
```

**💡 TIP:** Požádej backend tým o přidání `filters.druh` do API pro efektivnější filtrování!

### ❓ **Existují stránkované položky objednávky?**
**Odpověď:** **NE!** Endpoint `/order-v3/items` vrací **VŠECHNY položky** konkrétní objednávky najednou (bez pagingu). Důvod: Jedna objednávka obvykle nemá více než 10-20 položek, takže paging není potřeba.

### ❓ **Jak stáhnout přílohu?**
**Odpověď:** Přílohy z `/order-v3/items` obsahují pouze metadata (název, typ, velikost). Pro stažení souboru použijte endpoint:
```
GET https://erdms.zachranka.cz/data/eeo-v2/prilohy/{nazev_souboru}
```
kde `nazev_souboru` je hodnota z pole `attachments[].nazev_souboru`.

### ❓ **Jak získat detail faktur?**
**Odpověď:** Faktury mají **SAMOSTATNÝ endpoint** `/orders-v3/invoices`:
```javascript
const response = await fetch('https://erdms.zachranka.cz/api.eeo/orders-v3/invoices', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    token: getUserToken(),
    username: getUserEmail(),
    order_id: 415
  })
});
```
Vrací pole `invoices[]` s:
- **VS čísly** (`fa_cislo_vema`)
- **Jednotlivými částkami** (`fa_castka`)
- **Stavy faktur** (`stav`)
- **LP kódy** (`fa_lp_kody`)
- **Střediska** (`fa_strediska_kod`)

**📊 Rozdíl mezi endpointy:**
- `/order-v3/list` → `pocet_faktur` + `faktury_celkova_castka_s_dph` (jen celkový součet)
- `/orders-v3/invoices` → Detailní rozpad každé faktury zvlášť

### ❓ **Proč faktury nejsou v `/order-v3/items`?**
**Odpověď:** **Optimalizace výkonu a datových toků!** Faktury obsahují hodně dat (LP kódy, střediska, uživatele, poznámky). Většina uživatelů nepotřebuje detailní info o fakturách při každém otevření objednávky → načítají se **lazy loading** jen když uživatel klikne na "Zobrazit faktury".

**📱 UI WORKFLOW:**
```
1. Seznam objednávek → pocet_faktur: 2, celkem: 120 000 Kč
2. Detail objednávky → položky, přílohy
3. [Tlačítko: Zobrazit faktury (2)] → načíst /orders-v3/invoices
4. Zobrazit: VS čísla, částky, stavy, LP kódy
```

### ❓ **Jak zobrazit LP kódy?**
**Odpověď:** V objektu `financovani` máte k dispozici:
- `financovani.lp_kody` - pole ID LP kódů (např. `[12, 34]`)
- `financovani.lp_nazvy` - pole objektů s detaily LP kódů (číslo, název, účet)

Zobrazení:
```javascript
order.financovani.lp_nazvy.forEach(lp => {
  console.log(`${lp.cislo_lp} - ${lp.nazev} (${lp.cislo_uctu})`);
});
```

---

### ❓ **Jak kontrolovat překročení schváleného limitu?**
**Odpověď:** Backend API automaticky validuje limity, ale pro lepší UX můžete kontrolovat i na frontendu:

```javascript
function checkPriceLimits(order) {
  const warnings = [];
  
  // 1. Kontrola: Položky vs. Max. cena
  if (order.cena_s_dph > order.max_cena_s_dph) {
    const difference = order.cena_s_dph - order.max_cena_s_dph;
    warnings.push({
      type: 'error',
      message: `Položky překračují schválenou částku o ${formatCurrency(difference)}!`,
      icon: '⚠️'
    });
  }
  
  // 2. Kontrola: Faktury vs. Položky
  if (order.faktury_celkova_castka_s_dph > order.cena_s_dph) {
    const difference = order.faktury_celkova_castka_s_dph - order.cena_s_dph;
    warnings.push({
      type: 'warning',
      message: `Faktury překračují cenu položek o ${formatCurrency(difference)}`,
      icon: '⚡'
    });
  }
  
  // 3. Info: Úspora
  if (order.cena_s_dph > 0 && order.cena_s_dph < order.max_cena_s_dph) {
    const savings = order.max_cena_s_dph - order.cena_s_dph;
    warnings.push({
      type: 'success',
      message: `Úspora: ${formatCurrency(savings)}`,
      icon: '✅'
    });
  }
  
  return warnings;
}

// Použití:
const warnings = checkPriceLimits(order);
warnings.forEach(w => {
  showNotification(w.icon + ' ' + w.message, w.type);
});
```

**Zobrazení v UI:**
```
┌─────────────────────────────────────┐
│ O-2026-0404       ROZPRACOVANÁ      │
│ ČSOB Leasing                         │
│ 💰 120 000 Kč                        │
│ ✅ Úspora: 5 000 Kč                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ O-2026-0405       ROZPRACOVANÁ      │
│ IT Solutions                         │
│ 💰 130 000 Kč                        │
│ ⚠️ Překročeno o 5 000 Kč!           │
└─────────────────────────────────────┘
```

---

### ❓ **Jaké jsou přechody mezi stavy workflow?**
**Odpověď:** Objednávka prochází těmito stavy v pořadí:

**🔄 Standardní workflow:**
```
NOVA → KE_SCHVALENI → SCHVALENA → ROZPRACOVANA → 
ODESLANA → POTVRZENA → DOKONCENA
```

**⚠️ Alternativní cesty:**
- **KE_SCHVALENI → ZAMITNUTA** (zamítnuto schvalovatelem)
- **Jakýkoliv stav → ZRUSENA** (zrušeno uživatelem s oprávněním)

**📊 Detailní přechody:**

1. **NOVA** (nová objednávka)
   - → Odeslat ke schválení → **KE_SCHVALENI**

2. **KE_SCHVALENI** (čeká na schválení)
   - → Schválit → **SCHVALENA**
   - → Zamítnout → **ZAMITNUTA**

3. **SCHVALENA** (schválená)
   - → Začít vyplňovat položky → **ROZPRACOVANA**

4. **ROZPRACOVANA** (vyplňování položek)
   - → Odeslat dodavateli → **ODESLANA**

5. **ODESLANA** (odeslaná dodavateli)
   - → Potvrzení od dodavatele → **POTVRZENA**

6. **POTVRZENA** (potvrzená dodavatelem)
   - → Příjem + fakturace → **DOKONCENA**

7. **DOKONCENA** (dokončená)
   - Konečný stav - nelze změnit

8. **ZAMITNUTA** / **ZRUSENA**
   - Konečné stavy - nelze změnit

**📱 TIP PRO UI:**
- Zobrazte **timeline progress bar** podle aktuálního stavu
- Příklad: `[✓ NOVA] → [✓ SCHVALENA] → [⏳ ROZPRACOVANA] → [ ] ODESLANA`

---

## 🎯 Příklad Kompletního Workflow

### **Scénář: Uživatel chce zobrazit schválené objednávky, otevřít detail a prohlédnout faktury**

#### **Krok 1: Načíst schválené objednávky**
```javascript
const result = await fetchOrders(1, {stav: ["SCHVALENA"]});

// Zobraz seznam:
result.orders.forEach(order => {
  // Dynamicky zjistit, kterou částku zobrazit
  const price = getOrderPrice(order);
  
  renderOrderCard({
    id: order.id,
    cislo: order.cislo_objednavky,
    stav: order.stav_objednavky,
    dodavatel: order.dodavatel_nazev,
    castka: price.amount,
    castka_label: price.label, // "Max. cena", "Cena položek", nebo "Fakturováno"
    datum: order.dt_objednavky,
    pocet_polozek: order.pocet_polozek,
    pocet_priloh: order.pocet_priloh,
    pocet_faktur: order.pocet_faktur,
    // Srovnání částek
    max_cena: order.max_cena_s_dph,
    cena_polozek: order.cena_s_dph,
    cena_faktur: order.faktury_celkova_castka_s_dph
  });
});

// Helper funkce pro dynamickou částku
function getOrderPrice(order) {
  if (order.pocet_faktur > 0 && order.faktury_celkova_castka_s_dph > 0) {
    return {amount: order.faktury_celkova_castka_s_dph, label: "Fakturováno"};
  }
  if (order.pocet_polozek > 0 && order.cena_s_dph > 0) {
    return {amount: order.cena_s_dph, label: "Cena položek"};
  }
  return {amount: order.max_cena_s_dph, label: "Max. cena"};
}
```

#### **Krok 2: Uživatel klikne na objednávku**
```javascript
const orderId = 415; // ID z vybrané objednávky
const detail = await fetchOrderDetail(orderId);

// Zobraz detail:
renderOrderDetail({
  items: detail.items,
  attachments: detail.attachments,
  notes: detail.notes
});
```

#### **Krok 3: Zobraz položky s kontrolou limitu**
```javascript
// Vypočítej celkovou cenu položek
const totalItemsPrice = detail.items.reduce((sum, item) => sum + item.cena_s_dph, 0);

// Načti základní info objednávky (máš ji už z listu)
const orderFromList = result.orders.find(o => o.id === orderId);

// Kontrola překročení
const maxPrice = orderFromList.max_cena_s_dph;
const exceeded = totalItemsPrice > maxPrice;

if (exceeded) {
  showWarning(`⚠️ Položky překračují schválenou částku o ${formatCurrency(totalItemsPrice - maxPrice)}!`);
} else {
  const savings = maxPrice - totalItemsPrice;
  showSuccess(`✅ Úspora: ${formatCurrency(savings)}`);
}

// Zobraz položky
detail.items.forEach(item => {
  renderItemRow({
    popis: item.popis,
    cena: item.cena_s_dph,
    mnozstvi: item.mnozstvi || 1,
    lp: item.lppts_cislo
  });
});

// Zobraz celkovou částku
renderPriceFooter({
  totalItems: totalItemsPrice,
  maxPrice: maxPrice,
  savings: maxPrice - totalItemsPrice,
  exceeded: exceeded
});
```

#### **Krok 4: Uživatel klikne na "Zobrazit faktury"**
```javascript
// Načíst detail faktur (lazy loading)
async function fetchInvoices(orderId) {
  const response = await fetch('https://erdms.zachranka.cz/api.eeo/orders-v3/invoices', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      token: getUserToken(),
      username: getUserEmail(),
      order_id: orderId
    })
  });

  const data = await response.json();
  
  if (data.status === 'success') {
    return data.data.invoices;
  } else {
    throw new Error(data.message);
  }
}

// Použití:
const invoices = await fetchInvoices(orderId);
console.log(`Objednávka má ${invoices.length} faktur`);

// Zobrazit faktury
invoices.forEach(invoice => {
  // Parsovat LP kódy
  const lpCodes = parseInvoiceLpCodes(invoice.fa_lp_kody);
  
  // Formátovat uživatele
  const vytvoril = formatUserName('vytvoril', invoice);
  
  renderInvoiceCard({
    vs: invoice.fa_cislo_vema,
    castka: invoice.fa_castka,
    datum_vystaveni: invoice.fa_datum_vystaveni,
    datum_splatnosti: invoice.fa_datum_splatnosti,
    stav: invoice.stav,
    stav_color: getInvoiceStatusColor(invoice.stav),
    lp_codes: lpCodes,
    vytvoril: vytvoril
  });
});

// Ověření součtu
const totalInvoices = invoices.reduce((sum, inv) => sum + inv.fa_castka, 0);
const expectedTotal = orderFromList.faktury_celkova_castka_s_dph;

if (Math.abs(totalInvoices - expectedTotal) > 0.01) {
  showWarning(`⚠️ Nesouhlasí součet faktur! Očekáváno: ${formatCurrency(expectedTotal)}, Skutečnost: ${formatCurrency(totalInvoices)}`);
}
```

---

### 📊 **Příklad: Zobrazení Objednávky v Různých Fázích**

#### **1. NOVA - Nově vytvořená (bez položek):**
```
┌─────────────────────────────────────┐
│ 🆕 O-2026-0500            NOVÁ      │
│                                      │
│ 📦 Služby                            │
│ 🏢 ČSOB Leasing                      │
│ 💰 Max. cena: 150 000 Kč             │
│                                      │
│ 👤 Petr Svoboda                      │
│ 📅 25.04.2026                        │
│                                      │
│ 📎 1 příloha  💬 0 komentářů         │
└─────────────────────────────────────┘
```

#### **2. SCHVALENA - Schválená (s limitem):**
```
┌─────────────────────────────────────┐
│ ✅ O-2026-0500         SCHVÁLENÁ     │
│                                      │
│ 📦 Služby                            │
│ 🏢 ČSOB Leasing                      │
│ 💰 Schválený limit: 150 000 Kč       │
│                                      │
│ 👤 Petr Svoboda                      │
│ 📅 25.04.2026 → Schváleno 26.04.2026 │
│                                      │
│ 📎 1 příloha  💬 2 komentáře         │
└─────────────────────────────────────┘
```

#### **3. ROZPRACOVANA - S položkami:**
```
┌─────────────────────────────────────┐
│ 🔄 O-2026-0500      ROZPRACOVANÁ    │
│                                      │
│ 📦 Služby                            │
│ 🏢 ČSOB Leasing                      │
│ 💰 Cena položek: 142 000 Kč          │
│ ✅ Úspora: 8 000 Kč                  │
│    (Max: 150 000 Kč)                 │
│                                      │
│ 👤 Petr Svoboda                      │
│ 📅 25.04.2026                        │
│                                      │
│ 📎 1 příloha  💬 5 komentářů         │
│ 📦 4 položky                         │
└─────────────────────────────────────┘
```

#### **4. DOKONCENA - S fakturami:**
```
┌─────────────────────────────────────┐
│ 🏁 O-2026-0500        DOKONČENÁ     │
│                                      │
│ 📦 Služby                            │
│ 🏢 ČSOB Leasing                      │
│ 💰 Fakturováno: 142 000 Kč           │
│    Položky: 142 000 Kč ✅            │
│    Max: 150 000 Kč                   │
│                                      │
│ 👤 Petr Svoboda                      │
│ 📅 25.04.2026 → Dokončeno 10.05.2026 │
│                                      │
│ 📎 3 přílohy  💬 12 komentářů        │
│ 📦 4 položky  📄 2 faktury           │
│                                      │
│ [ Zobrazit faktury ]  ← LAZY LOAD   │
└─────────────────────────────────────┘

Po kliknutí na "Zobrazit faktury" →

┌─────────────────────────────────────┐
│ 📄 FAKTURY (2)                       │
├─────────────────────────────────────┤
│ VS: 2026001234                       │
│ 💰 85 000 Kč                         │
│ 🏷️ Zaplaceno ✅                      │
│ 📅 20.04.2026 → splatnost 20.05.2026 │
├─────────────────────────────────────┤
│ VS: 2026001235                       │
│ 💰 57 000 Kč                         │
│ 🏷️ K zaplacení ⏳                    │
│ 📅 05.05.2026 → splatnost 05.06.2026 │
├─────────────────────────────────────┤
│ CELKEM: 142 000 Kč                   │
└─────────────────────────────────────┘
```

#### **5. PŘEKROČENÝ LIMIT - Varování:**
```
┌─────────────────────────────────────┐
│ ⚠️ O-2026-0501      ROZPRACOVANÁ    │
│                                      │
│ 🏠 Elektronika [MAJETEK]             │
│ 🏢 IT Solutions s.r.o.               │
│ 💰 Cena položek: 155 000 Kč          │
│ ⚠️ PŘEKROČENO o 5 000 Kč!           │
│    (Max: 150 000 Kč)                 │
│                                      │
│ 👤 Marie Nováková                    │
│ 📅 25.04.2026                        │
│                                      │
│ 📎 2 přílohy  💬 8 komentářů         │
│ 📦 6 položek                         │
└─────────────────────────────────────┘
```

---

## 🔐 Bezpečnostní Doporučení

1. ✅ **Ukládejte token bezpečně** (SecureStorage, Keychain)
2. ✅ **Kontrolujte expiraci tokenu** (24 hodin) a refreshujte
3. ✅ **Používejte HTTPS** pro všechny požadavky
4. ✅ **Neukládejte heslo** v mobilní aplikaci
5. ✅ **Logujte pouze anonymizované chyby** (bez tokenů, hesel)
6. ✅ **Implementujte timeout** pro API požadavky (30s)

---

## 📚 Související Dokumentace

- [Login a Autentizace](./MOBILE_API_LOGIN_DOCUMENTATION.md)
- [Profil Uživatele](./MOBILE_API_USER_DETAIL_DOCUMENTATION.md)
- [Statistiky Objednávek](./MOBILE_API_ORDER_STATS_DOCUMENTATION.md)
- [Přehled API](./README.md)

---

**🎉 Dokumentace vytvořena: 25.04.2026**  
**📝 Verze API: v2025.03_25**  
**🔄 Poslední aktualizace: 25.04.2026**
- Přidána sekce **Faktury** (/orders-v3/invoices) - VS čísla, částky, stavy, LP kódy
- Přidána sekce **Druh objednávky** - 28 typů, majetek vs. běžné, filtrování
- Třístupňové načítání (list → items → invoices)
- Detailní popis položek objednávky (LP kódy, organizační struktura, DPH kalkulace)
- Kompletní UI příklady pro mobilní aplikaci

**🔄 Pro aktuální změny kontaktujte backend tým**
