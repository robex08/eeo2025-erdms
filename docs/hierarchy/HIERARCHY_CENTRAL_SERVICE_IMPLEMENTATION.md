# 🏢 Centrální hierarchie služba - Implementace

**Datum:** 15. prosince 2025  
**Autor:** GitHub Copilot & robex08  
**Status:** ✅ Implementováno

---

## 📋 Přehled

Vytvořena **centrální služba pro hierarchické řízení viditelnosti dat** (hierarchyService), která poskytuje jednotné API pro desktop i mobilní aplikaci.

---

## 🎯 Vytvořené soubory

### 1. `/apps/eeo-v2/client/src/services/hierarchyService.js`
**Centrální služba pro hierarchii**

#### Funkce:
- ✅ `getHierarchyConfig(token, username)` - načte kompletní konfiguraci hierarchie
- ✅ `getHierarchyConfigCached(token, username)` - cached verze (60s cache)
- ✅ `isHierarchyActiveForModule(module, token, username)` - kontrola modulu
- ✅ `getHierarchyInfoMessage(config, module)` - textová zpráva pro uživatele
- ✅ `getHierarchyBannerColor(config)` - barva banneru podle statusu
- ✅ `clearHierarchyCache()` - vyčistí cache

#### Export:
```javascript
export const HierarchyModules = {
  ORDERS: 'orders',
  INVOICES: 'invoices',
  CASHBOOK: 'cashbook'
};

export const HierarchyStatus = {
  DISABLED: 'disabled',
  IMMUNE: 'immune',
  ACTIVE: 'active',
  NO_PROFILE: 'no_profile',
  ERROR: 'error'
};
```

---

### 2. `/apps/eeo-v2/client/src/components/common/HierarchyBanner.jsx`
**Univerzální komponenta pro zobrazení stavu hierarchie**

#### Props:
- `module` - typ modulu (HierarchyModules.ORDERS, ...)
- `compact` - kompaktní režim (true/false)

#### Vlastnosti:
- ✅ Automatické načítání konfigurace
- ✅ Zobrazení pouze pokud je hierarchie aktivní
- ✅ Barevné kódování podle statusu (info/warning/error/success)
- ✅ Zavírací tlačítko
- ✅ Responsive design

#### Použití:
```jsx
<HierarchyBanner module={HierarchyModules.ORDERS} compact={false} />
```

---

### 3. `/apps/eeo-v2/client/src/hooks/useHierarchy.js`
**React Hook pro snadné použití hierarchie**

#### Funkce:
- ✅ `useHierarchy(module, autoRefresh)` - hlavní hook
- ✅ `useHierarchyModule(module)` - jednoduchá kontrola modulu

#### Vrací:
```javascript
{
  config,        // Kompletní konfigurace
  loading,       // Načítá se?
  error,         // Chyba
  isActive,      // Je hierarchie aktivní?
  isDisabled,    // Je vypnuta?
  isImmune,      // Má user HIERARCHY_IMMUNE?
  message,       // Textová zpráva
  bannerColor,   // Barva banneru
  refresh        // Funkce pro force refresh
}
```

#### Použití:
```jsx
const { isActive, message, loading } = useHierarchy(HierarchyModules.ORDERS);

if (isActive) {
  console.log(message);
}
```

---

## 📱 Integrace do aplikací

### Desktop - Orders25List.js
**Soubor:** `/apps/eeo-v2/client/src/pages/Orders25List.js`

#### Změny:
1. Import komponenty a konstanty
```javascript
import HierarchyBanner from '../components/common/HierarchyBanner';
import { HierarchyModules } from '../services/hierarchyService';
```

2. Přidání banneru do JSX (hned za `<Container>`)
```jsx
<Container>
  <HierarchyBanner module={HierarchyModules.ORDERS} compact={false} />
  <PageContent $blurred={loading}>
    {/* ... */}
  </PageContent>
</Container>
```

---

### Mobilní - MobileDashboard.jsx
**Soubor:** `/apps/eeo-v2/client/src/components/mobile/MobileDashboard.jsx`

#### Změny:
1. Import komponenty a konstanty
```javascript
import HierarchyBanner from '../common/HierarchyBanner';
import { HierarchyModules } from '../../services/hierarchyService';
```

2. Přidání banneru do JSX (pod `<MobileHeader>`)
```jsx
<MobileHeader {...props} />
<HierarchyBanner module={HierarchyModules.ORDERS} compact={true} />
{/* ... */}
```

---

### Mobile Data Service
**Soubor:** `/apps/eeo-v2/client/src/services/mobileDataService.js`

#### Změny:
1. Import hierarchyService
```javascript
import hierarchyService, { HierarchyModules } from './hierarchyService';
```

2. Načtení hierarchie před načítáním dat
```javascript
const hierarchyConfig = await hierarchyService.getHierarchyConfigCached(token, username);
console.log('🏢 Hierarchy status:', hierarchyConfig.status);
```

3. Přidání hierarchie info do metadata
```javascript
meta: {
  // ... ostatní metadata
  hierarchy: {
    status: hierarchyConfig.status,
    enabled: hierarchyConfig.enabled,
    profileName: hierarchyConfig.profileName,
    logic: hierarchyConfig.logic,
    message: hierarchyService.getHierarchyInfoMessage(hierarchyConfig, HierarchyModules.ORDERS)
  }
}
```

---

## 🎨 Vizuální ukázka

### Banner stavy

#### 1. Hierarchie AKTIVNÍ (modrý)
```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Hierarchie aktivní: Vidíte objednávky podle organizač-  │
│    ního řádu "Org. řád 2025" (Liberální - stačí splnit     │
│    alespoň jednu úroveň).                              [×] │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Žádný profil (oranžový)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Hierarchie je zapnutá, ale není vybrán žádný profil.    │
│    Kontaktujte administrátora.                         [×] │
└─────────────────────────────────────────────────────────────┘
```

#### 3. User IMMUNE (zelený)
```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Máte neomezený přístup k datům (HIERARCHY_IMMUNE).     │
│                                                         [×] │
└─────────────────────────────────────────────────────────────┘
```

#### 4. Chyba (červený)
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Chyba při načítání hierarchie. Kontaktujte              │
│    administrátora.                                     [×] │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend opravy

### Soubor: `hierarchyOrderFilters.php`
**Datum:** 15. prosince 2025

#### Opraven problém: Uživatel neviděl vlastní objednávky

**Před:**
```php
if (empty($relationships)) {
    return "1 = 0"; // ❌ Blokoval VŠECHNY objednávky
}
```

**Po:**
```php
if (empty($relationships)) {
    // ✅ Uživatel musí vidět minimálně své vlastní objednávky
    return "(o.uzivatel_id = $userId OR o.objednatel_id = $userId OR o.garant_uzivatel_id = $userId)";
}
```

#### Další změny:
1. Vlastní objednávky mají VŽDY prioritu (přidány jako první podmínka)
2. Pokud se nevygenerují podmínky z hierarchie, vrací se filtr pro vlastní objednávky
3. Hierarchické vztahy se přidávají navíc k vlastním objednávkám

---

## ✅ Výhody centrální služby

### 1. **Konzistence**
✅ Stejná logika pro desktop i mobilní  
✅ Jednotné chování napříč celou aplikací  
✅ Snadná údržba (změna na jednom místě)

### 2. **Performance**
✅ Cache (60s) pro snížení API volání  
✅ Paralelní načítání s ostatními daty  
✅ Optimalizované pro mobile

### 3. **Developer Experience**
✅ Jednoduchý React Hook  
✅ Typové konstanty (HierarchyModules, HierarchyStatus)  
✅ Comprehensive API dokumentace

### 4. **User Experience**
✅ Jasné informační bannery  
✅ Barevné kódování podle statusu  
✅ Zavírací tlačítko pro banner  
✅ Kompaktní režim pro mobile

---

## 📊 Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND APLIKACE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐           ┌─────────────┐                 │
│  │  Desktop    │           │   Mobile    │                 │
│  │ Orders25List│           │ Dashboard   │                 │
│  └──────┬──────┘           └──────┬──────┘                 │
│         │                         │                         │
│         └─────────┬───────────────┘                         │
│                   │                                         │
│         ┌─────────▼──────────┐                             │
│         │ HierarchyBanner    │ ◄─── React komponenta       │
│         │   (common)         │                             │
│         └─────────┬──────────┘                             │
│                   │                                         │
│         ┌─────────▼──────────┐                             │
│         │  useHierarchy      │ ◄─── React Hook             │
│         │    (hook)          │                             │
│         └─────────┬──────────┘                             │
│                   │                                         │
│         ┌─────────▼──────────┐                             │
│         │ hierarchyService   │ ◄─── Centrální služba       │
│         │   (service)        │      (cache, API)           │
│         └─────────┬──────────┘                             │
│                   │                                         │
├───────────────────┼─────────────────────────────────────────┤
│                   │  API CALLS                              │
│         ┌─────────▼──────────┐                             │
│         │ globalSettingsApi  │                             │
│         └─────────┬──────────┘                             │
│                   │                                         │
└───────────────────┼─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                   BACKEND (PHP)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │  hierarchyOrderFilters.php           │                  │
│  │  ✅ applyHierarchyFilterToOrders()   │                  │
│  │  ✅ Vlastní objednávky VŽDY viditelné│                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │  25a_nastaveni_globalni (DB)         │                  │
│  │  - hierarchy_enabled                  │                  │
│  │  - hierarchy_profile_id               │                  │
│  │  - hierarchy_logic                    │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Další rozšíření

### Sprint 2: Pokladna
```javascript
// 1. Backend PHP - cashbookFilters.php
function applyCashbookHierarchyFilter($userId, $db) {
  // ... stejná logika jako hierarchyOrderFilters.php
}

// 2. Frontend - CashbookList
<HierarchyBanner module={HierarchyModules.CASHBOOK} />
```

### Sprint 3: Faktury
```javascript
// 1. Backend PHP - invoiceFilters.php
function applyInvoiceHierarchyFilter($userId, $db) {
  // ... stejná logika jako hierarchyOrderFilters.php
}

// 2. Frontend - InvoicesList
<HierarchyBanner module={HierarchyModules.INVOICES} />
```

---

## 📝 Best Practices

### 1. Použití v nových komponentách
```jsx
import { HierarchyBanner } from '../components/common/HierarchyBanner';
import { useHierarchy } from '../hooks/useHierarchy';
import { HierarchyModules } from '../services/hierarchyService';

function MyComponent() {
  const { isActive, loading } = useHierarchy(HierarchyModules.ORDERS);
  
  return (
    <>
      <HierarchyBanner module={HierarchyModules.ORDERS} />
      {/* ... */}
    </>
  );
}
```

### 2. Podmíněné zobrazení podle hierarchie
```jsx
const { config } = useHierarchy(HierarchyModules.ORDERS);

if (config.status === HierarchyStatus.ACTIVE) {
  // Zobraz informaci o hierarchii
}
```

### 3. Force refresh hierarchie
```jsx
const { refresh } = useHierarchy(HierarchyModules.ORDERS);

// Po změně nastavení hierarchie v admin UI:
await refresh(); // Vynutí nové načtení
```

---

## 🎓 Závěr

Centrální hierarchie služba poskytuje:
- ✅ **Jednotné API** pro všechny moduly
- ✅ **Konzistentní UX** pro desktop i mobile
- ✅ **Performance** optimalizace (cache)
- ✅ **Snadnou rozšiřitelnost** pro nové moduly

**Status:** Připraveno k testování na DEV prostředí! 🚀
