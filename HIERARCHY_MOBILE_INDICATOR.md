# 📱 Mobilní aplikace - Hierarchie indikátor

**Datum:** 15. prosince 2025  
**Autor:** GitHub Copilot & robex08

---

## 🎯 Změny

### ❌ Odstraněno: HierarchyBanner z mobilní aplikace

**Důvod:** 
- Banner plýtvá cenným místem na malé obrazovce
- Textová zpráva je příliš dlouhá pro mobilní zobrazení
- Lepší je kompaktní indikátor v hlavičce

**Soubory upraveny:**
```javascript
// /apps/eeo-v2/client/src/components/mobile/MobileDashboard.jsx

// PŘED:
import HierarchyBanner from '../common/HierarchyBanner';
import { HierarchyModules } from '../../services/hierarchyService';

<MobileHeader {...} />
<HierarchyBanner module={HierarchyModules.ORDERS} compact={true} />

// PO:
import mobileDataService from '../../services/mobileDataService';

<MobileHeader {...} />
// Žádný banner - pouze indikátor v hlavičce
```

---

### ✅ Zachováno: Hierarchie indikátor v MobileHeader

**Zobrazení:**
```
┌────────────────────────────────┐
│  🏥  EEO 1.88.H8      ☰       │
│      Elektronická...           │
└────────────────────────────────┘
```

**Formát:**
- `1.88` = verze aplikace (žlutá barva `#fbbf24`)
- `.H8` = hierarchie profil ID 8 (zelená barva `#10b981`)
- Zobrazí se pouze pokud je hierarchie aktivní a má vybraný profil

**Kód:**
```jsx
// /apps/eeo-v2/client/src/components/mobile/MobileHeader.jsx

const { hierarchyStatus } = useContext(AuthContext);
const versionNumber = fullVersion.match(/(\d+\.\d+[a-z]?)/)?.[1] || fullVersion;
const profileId = hierarchyStatus?.profileId;

<h1>
  {title || 'EEO'}
  {!title && (
    <sup style={{ /* ... */ }}>
      {versionNumber}
      {profileId && (
        <span style={{ color: '#10b981', fontWeight: '700' }}>.H{profileId}</span>
      )}
    </sup>
  )}
</h1>
```

---

### 🔧 Aktualizace: AuthContext používá centrální hierarchyService

**Důvod:**
- Jednotné API pro desktop i mobile
- Lepší cache management
- Konzistentní struktura dat

**Změna:**
```javascript
// /apps/eeo-v2/client/src/context/AuthContext.js

// PŘED:
const { getHierarchyStatus } = await import('../services/hierarchyOrderService');
const status = await getHierarchyStatus(loginData.id, loginData.token, loginData.username);
setHierarchyStatus(status);

// PO:
const { getHierarchyConfig } = await import('../services/hierarchyService');
const config = await getHierarchyConfig(loginData.token, loginData.username);

// Převést na formát kompatibilní s hierarchyStatus
setHierarchyStatus({
  hierarchyEnabled: config.enabled,
  isImmune: false, // Backend kontroluje automaticky
  profileId: config.profileId,
  profileName: config.profileName,
  logic: config.logic,
  logicDescription: config.logicDescription
});
```

---

## 📊 Porovnání Desktop vs Mobile

### Desktop (Layout.js)
```
┌─────────────────────────────────────────────────┐
│  🏥 Systém správy a workflow objednávek 1.88.H8│
│                                                 │
│ 🏢 Hierarchie aktivní: Vidíte objednávky...    │
│                                              [×]│
│                                                 │
│ [Dashboard s objednávkami]                      │
└─────────────────────────────────────────────────┘
```

**Zobrazení:**
- ✅ Textový banner (HierarchyBanner) - plný popis
- ✅ Indikátor `.H8` v hlavičce

---

### Mobile (MobileDashboard.jsx)
```
┌────────────────────────────────┐
│  🏥  EEO 1.88.H8      ☰       │
│      Elektronická...           │
├────────────────────────────────┤
│                                │
│ [Dashboard s objednávkami]     │
│                                │
└────────────────────────────────┘
```

**Zobrazení:**
- ❌ Žádný textový banner - šetří místo
- ✅ Indikátor `.H8` v hlavičce

---

## 🎨 Design rozhodnutí

### Proč bez banneru na mobile?

1. **Omezený prostor**
   - Mobile obrazovka je malá (cca 375-414px šířka)
   - Banner by zabral 50-80px výšky
   - Uživatel by musel scrollovat pro vidění obsahu

2. **Textová zpráva je dlouhá**
   ```
   🏢 Hierarchie aktivní: Vidíte objednávky podle 
      organizačního řádu "Org. řád 2025" (Liberální 
      (NEBO) - stačí splnit alespoň jednu úroveň).
   ```
   - Na mobile by zabralo 3-4 řádky
   - Těžko čitelné na malé obrazovce

3. **Indikátor je dostačující**
   - `.H8` je jasný signál, že hierarchie je aktivní
   - Zelená barva naznačuje, že je to "ok" stav
   - Uživatel vidí číslo profilu (užitečné pro support)

4. **Konzistence s desktop layoutem**
   - Desktop má indikátor v hlavičce TAKÉ
   - Banner je tam navíc, protože je dost místa
   - Mobile má stejný indikátor, jen bez banneru

---

## ✅ Výhody tohoto řešení

### Pro uživatele:
- 📱 **Více místa** pro obsah na mobile
- 👁️ **Okamžitá viditelnost** hierarchie (v hlavičce, stále viditelná)
- 🎯 **Jednodušší** než dlouhá textová zpráva

### Pro vývojáře:
- 🔧 **Méně komponent** na mobile (méně complexity)
- 📦 **Stejný indikátor** jako desktop (konzistence)
- 🚀 **Rychlejší** rendering (bez HierarchyBanner komponenty)

### Pro support:
- 🔍 **Viditelné číslo profilu** (.H8) v screenshotech
- 📞 **Snadná komunikace** - "Máte v hlavičce .H8?"
- 🐛 **Debug** - okamžitě vidíte, jaký profil je aktivní

---

## 🧪 Testování

### Scénář 1: Hierarchie vypnutá
```
Mobile hlavička: EEO 1.88
Desktop hlavička: 1.88
```
✅ Žádný `.H8` indikátor  
✅ Žádný banner na desktopu

---

### Scénář 2: Hierarchie zapnutá, profil ID 8
```
Mobile hlavička: EEO 1.88.H8
Desktop hlavička: 1.88.H8 + banner
```
✅ `.H8` indikátor viditelný  
✅ Banner na desktopu  
✅ Žádný banner na mobile

---

### Scénář 3: Změna profilu (8 → 5)
```
Mobile hlavička: EEO 1.88.H5
Desktop hlavička: 1.88.H5 + banner
```
✅ Indikátor se aktualizuje  
✅ Konzistentní zobrazení

---

## 📝 Dokumentace aktualizována

- ✅ `HIERARCHY_IMPLEMENTATION_README.md` - aktualizována sekce "Integrace do aplikací"
- ✅ Odstraněna zmínka o HierarchyBanner v mobile
- ✅ Přidán popis indikátoru v hlavičce

---

## 🎓 Závěr

**Mobilní aplikace:**
- ✅ Kompaktní hierarchie indikátor v hlavičce (`.H{profileId}`)
- ✅ Žádný plýtvající banner
- ✅ Konzistentní s desktop verzí (stejný indikátor)
- ✅ Lepší UX pro mobile uživatele

**Status:** Připraveno k testování! 📱
