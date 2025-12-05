# 📚 Systém Help Textů - Návod k použití

## 🎯 Účel

Centralizovaný systém pro správu všech nápověd, tipů a vysvětlení v aplikaci. Texty jsou:
- **Strukturované** podle stránek a prvků
- **Indexované** pro rychlé vyhledávání
- **Přístupné** z jednoho místa
- **Snadno rozšiřitelné**

---

## 📁 Struktura souborů

```
src/
├── data/
│   └── helperTexts.js          # Centrální soubor s help texty
├── components/
│   └── ModernHelper.js         # Komponenta pomocníka (avatar)
└── docs/
    ├── HELPER-SYSTEM-GUIDELINE.md  # Tento návod
    └── HELPER-TEXTY-AKCEPTACE.md   # Přehled schválených textů
```

---

## 🏗️ Struktura dat v helperTexts.js

### Základní struktura pro jednu stránku:

```javascript
pageContext: {
  _meta: {
    icon: "📋",
    title: "Název stránky",
    description: "Popis účelu stránky"
  },
  
  _general: [
    { 
      text: "Obecný tip pro celou stránku", 
      type: "tip",      // tip | info | warning | example
      trigger: "auto"   // auto | focus | hover | error
    }
  ],
  
  fieldName: [
    { 
      text: "Tip pro konkrétní pole", 
      type: "tip", 
      trigger: "focus" 
    }
  ]
}
```

### Typy textů (`type`):

| Typ | Použití | Ikona avatara |
|-----|---------|---------------|
| `tip` | Praktický tip, rada | 💡 Levý dolní roh |
| `info` | Vysvětlení, informace | ❓ Pravý dolní roh |
| `warning` | Varování, upozornění | ⚠️ Pravý dolní roh |
| `example` | Příklad použití | 📝 Levý dolní roh |

### Triggery (`trigger`):

| Trigger | Kdy se zobrazí |
|---------|----------------|
| `auto` | Automaticky po nečinnosti |
| `focus` | Při focusu na pole |
| `hover` | Při najetí myší |
| `error` | Při chybě validace |

---

## 📝 Jak přidat nové help texty

### Krok 1: Identifikuj kontext

Urči `pageContext` podle routy:
- `/orders` → `orders`
- `/order/:id` → `orderDetail`
- `/cashbook` → `cashbook`
- `/profile` → `profile`
- `/users` → `users`
- `/dictionaries` → `dictionaries`

### Krok 2: Přidej metadata stránky

```javascript
myNewPage: {
  _meta: {
    icon: "🎯",
    title: "Moje nová stránka",
    description: "Co tato stránka dělá"
  }
}
```

### Krok 3: Přidej obecné tipy

```javascript
_general: [
  { 
    text: "První obecný tip pro celou stránku", 
    type: "tip", 
    trigger: "auto" 
  },
  { 
    text: "Další tip", 
    type: "info", 
    trigger: "auto" 
  }
]
```

### Krok 4: Přidej tipy pro konkrétní pole

```javascript
myFieldName: [
  { 
    text: "Co má uživatel zadat do tohoto pole", 
    type: "tip", 
    trigger: "focus" 
  },
  { 
    text: "Podrobné vysvětlení funkce pole", 
    type: "info", 
    trigger: "focus" 
  },
  { 
    text: "Příklad: 'OBJ-2025-0001'", 
    type: "example", 
    trigger: "focus" 
  }
]
```

---

## 🔍 Jak zjistit fieldName

### 1. Podle HTML atributů

Podívej se na:
- `name` atribut: `<input name="dodavatel" />`
- `id` atribut: `<input id="supplier-field" />`
- `data-field`: `<input data-field="supplier" />`

### 2. Podle routy

Pro dynamické routy použij kontext:
- `/order/123` → `orderDetail`
- `/cashbook/2025/11` → `cashbook`

### 3. Podle funkce

Logicky pojmenuj podle účelu:
- Vyhledávací pole → `search`
- Tlačítko exportu → `export`
- Filtr → `filter`

---

## 📋 Checklist pro přidání help textů na novou stránku

- [ ] Projít všechna pole ve formuláři
- [ ] Zapsat názvy polí (name/id)
- [ ] Pro každé pole napsat:
  - [ ] Základní tip (co zadat)
  - [ ] Vysvětlení (proč/k čemu to slouží)
  - [ ] Příklad (pokud je relevantní)
  - [ ] Varování (pokud může dojít k chybě)
- [ ] Přidat obecné tipy pro stránku
- [ ] Vyplnit metadata (_meta)
- [ ] Otestovat zobrazení

---

## 🎨 Pravidla pro psaní textů

### ✅ DO:
- Používej **2. osobu jednotného čísla** ("Zadej", "Klikni")
- Buď **stručný** ale **jasný**
- Uveď **konkrétní příklady**
- Vysvětli **proč** (ne jen jak)
- Použij **správnou češtinu** s diakritikou

### ❌ DON'T:
- Nepoužívej hovorové výrazy ("jo", "super", "fajn")
- Nevkládej technický žargon
- Nezapomínej na diakritiku
- Nepřeháněj s délkou textu (max 2-3 věty)

---

## 🔧 API funkce

### `getHelperTextsForPage(pageContext)`
Vrátí všechny help texty pro danou stránku.

```javascript
import { getHelperTextsForPage } from '@/data/helperTexts';

const pageHelp = getHelperTextsForPage('orders');
```

### `getHelperTextsForField(pageContext, fieldName)`
Vrátí tipy pro konkrétní pole.

```javascript
import { getHelperTextsForField } from '@/data/helperTexts';

const fieldTips = getHelperTextsForField('orderDetail', 'dodavatel');
```

### `getGeneralTips(pageContext)`
Vrátí pouze obecné tipy stránky.

```javascript
import { getGeneralTips } from '@/data/helperTexts';

const tips = getGeneralTips('orders');
```

### `getPageMetadata(pageContext)`
Vrátí metadata stránky.

```javascript
import { getPageMetadata } from '@/data/helperTexts';

const meta = getPageMetadata('orders');
// { icon: "📋", title: "Objednávky", description: "..." }
```

### `searchHelperTexts(keyword)`
Vyhledá v help textech.

```javascript
import { searchHelperTexts } from '@/data/helperTexts';

const results = searchHelperTexts('dodavatel');
// [{ pageContext, fieldName, text, type, trigger }]
```

---

## 🚀 Integrace do komponenty

### ModernHelper - automatické zobrazení

Helper automaticky:
1. Načte texty podle `pageContext` prop
2. Zobrazí tip při focusu na pole
3. Střídá tipy při nečinnosti
4. Přizpůsobí dobu zobrazení délce textu (10-15s)

```jsx
<ModernHelper pageContext="orderDetail" />
```

### Manuální trigger

Můžeš vyvolat tip programově:

```javascript
// Vytvoř custom event
const showTipEvent = new CustomEvent('showHelperTip', {
  detail: { 
    pageContext: 'orders', 
    fieldName: 'search' 
  }
});
window.dispatchEvent(showTipEvent);
```

---

## 📊 Přehled pokrytí stránek

| Stránka | PageContext | Status | Počet tipů |
|---------|-------------|--------|------------|
| Seznam objednávek | `orders` | ✅ Kompletní | 13 |
| Detail objednávky | `orderDetail` | ✅ Kompletní | 22 |
| Pokladní kniha | `cashbook` | ✅ Kompletní | 7 |
| Profil | `profile` | ✅ Kompletní | 5 |
| Uživatelé | `users` | ✅ Kompletní | 5 |
| Číselníky | `dictionaries` | ✅ Kompletní | 5 |
| Dashboard | `dashboard` | ⏳ TODO | 0 |
| Reporty | `reports` | ⏳ TODO | 0 |
| Nastavení | `settings` | ⏳ TODO | 0 |

---

## 🎯 Plán rozšíření

### Fáze 1: Základní stránky ✅
- ✅ Objednávky (seznam + detail)
- ✅ Pokladní kniha
- ✅ Profil
- ✅ Uživatelé
- ✅ Číselníky

### Fáze 2: Pokročilé funkce ⏳
- ⏳ Dashboard
- ⏳ Reporty
- ⏳ Nastavení systému
- ⏳ Schvalovací proces
- ⏳ Notifikace

### Fáze 3: Speciální funkce ⏳
- ⏳ Import/Export
- ⏳ API integrace
- ⏳ Statistiky
- ⏳ Audit log

---

## 💡 Tipy pro sběr textů

### 1. Projdi formulář pole po poli
Otevři stránku, klikej postupně na každé pole a zapiš si:
- Co pole dělá
- Co má uživatel zadat
- Jaké jsou validační pravidla
- Co se stane po odeslání

### 2. Sleduj chybové stavy
Zkus zadat špatné hodnoty a zaznamenej:
- Jaké chyby se zobrazují
- Co je potřeba opravit
- Jak se vyhnout chybám

### 3. Mapuj workflow
Projdi celý proces od začátku do konce:
- Jak začít
- Co dělat postupně
- Jak dokončit
- Co se stane potom

### 4. Ptej se uživatelů
Největší zdroj informací:
- Co jim není jasné
- Kde dělají chyby
- Co by potřebovali vysvětlit
- Jaké mají dotazy

---

## 📅 Aktualizace textů

### Kdy aktualizovat:
- ✏️ Při přidání nového pole do formuláře
- 🔄 Při změně funkcionality
- 🐛 Když uživatelé hlásí nejasnosti
- 📊 Po analýze chybovosti

### Proces aktualizace:
1. Uprav soubor `src/data/helperTexts.js`
2. Aktualizuj `HELPER-TEXTY-AKCEPTACE.md`
3. Otestuj zobrazení v aplikaci
4. Commit s popisem změn

---

## 🔍 Debug režim

Pro vývoj můžeš povolit debug režim:

```javascript
// V konzoli prohlížeče
localStorage.setItem('helperDebug', 'true');

// Reload stránky
location.reload();
```

Debug režim zobrazí:
- pageContext v konzoli
- fieldName při focusu
- Trigger events
- Načítané texty

---

---

## 🔮 Budoucí vývoj

### Možnost: Přesun do databáze

V budoucnu je možné systém rozšířit o:

#### 📊 Dynamický sběr dat
- **Sledování chování uživatelů**: Kde klikají, co je zajímá
- **Analýza obtížných míst**: Kde uživatelé chybují nebo váhají
- **Automatické návrhy tipů**: AI by navrhovala tipy na základě častých chyb
- **Personalizace**: Různé tipy pro různé role uživatelů

#### 💾 Databázové úložiště
```sql
CREATE TABLE helper_texts (
  id INT PRIMARY KEY,
  page_context VARCHAR(50),
  field_name VARCHAR(50),
  text TEXT,
  type ENUM('tip', 'info', 'warning', 'example'),
  trigger_type ENUM('auto', 'focus', 'hover', 'error'),
  display_count INT DEFAULT 0,
  usefulness_rating DECIMAL(3,2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE user_helper_interactions (
  id INT PRIMARY KEY,
  user_id INT,
  helper_text_id INT,
  action ENUM('viewed', 'helpful', 'not_helpful', 'dismissed'),
  timestamp TIMESTAMP
);
```

#### 🎯 Výhody DB řešení
- ✅ **Editace za běhu** bez redeploye
- ✅ **A/B testování** různých formulací
- ✅ **Metriky užitečnosti** - co uživatelé oceňují
- ✅ **Vícejazyčnost** - snadné přidání překladů
- ✅ **Historie změn** - kdo a kdy upravil
- ✅ **Dynamické načítání** - rychlejší initial load

#### ⚠️ Nevýhody DB řešení
- ❌ Složitější správa
- ❌ Potřeba admin rozhraní
- ❌ Závislost na DB dostupnosti
- ❌ Pomalejší než statické texty

**Doporučení**: Začít s JS souborem (současný stav), po získání zkušeností a dat zvážit migraci do DB.

---

**Datum vytvoření**: 20. 11. 2025  
**Poslední aktualizace**: 20. 11. 2025  
**Autor**: System Helper Team  
**Verze**: 1.0 (Statické texty v JS)
