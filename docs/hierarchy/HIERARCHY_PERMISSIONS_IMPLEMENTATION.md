# 🔐 Hierarchický systém práv - Implementace

**Datum:** 15. prosince 2025  
**Sprint:** 1 - OrderForm25 Cleanup  
**Autor:** GitHub Copilot & robex08

---

## 📋 Přehled

Implementoval jsem univerzální systém hierarchických práv, který **rozšiřuje a posiluje** existující práva uživatelů podle organizační hierarchie, ale **nevytváří** práva úplně nová.

---

## 🎯 Klíčové principy

### ✅ CO HIERARCHIE DĚLÁ

1. **Rozšiřuje rozsah** (OWN → ALL)
   - `ORDER_READ_OWN` + hierarchie → `ORDER_READ_ALL`
   - Uživatel vidí nejen svoje, ale i objednávky podřízených

2. **Posiluje akce** (READ → EDIT)
   - `ORDER_READ_ALL` + hierarchie → `ORDER_EDIT_ALL`
   - Uživatel může editovat objednávky, které původně jen viděl

3. **Kombinuje oba efekty**
   - `ORDER_READ_OWN` + hierarchie → `ORDER_READ_ALL` + `ORDER_EDIT_OWN` + `ORDER_EDIT_ALL`

### ❌ CO HIERARCHIE NEDĚLÁ

1. **Nevytváří práva z ničeho**
   - Pokud uživatel nemá žádné právo k objednávkám, hierarchie mu je **nedá**
   - Právo musí existovat v základní roli

2. **Neobchází bezpečnostní omezení**
   - Hierarchie je **dodatek** k základním právům, ne jejich náhrada

---

## 🏗️ Architektura

### 1. **permissionHierarchyService.js**

Centrální služba pro rozšiřování práv.

```javascript
import { expandPermissionsWithHierarchy } from '../services/permissionHierarchyService';

// Rozšíř práva podle hierarchie
const expandedPerms = expandPermissionsWithHierarchy(
  basePermissions,  // Základní práva z role
  hierarchyEnabled, // Je hierarchie zapnutá?
  true,            // Povolit rozšíření rozsahu (OWN → ALL)
  true             // Povolit povýšení akce (READ → EDIT)
);
```

**Mapa rozšíření:**

```javascript
const PERMISSION_HIERARCHY_MAP = {
  'ORDER_READ_OWN': {
    expand: 'ORDER_READ_ALL',   // Rozšíření rozsahu
    upgrade: 'ORDER_EDIT_OWN'   // Povýšení akce
  },
  'ORDER_READ_ALL': {
    expand: null,               // Už je ALL
    upgrade: 'ORDER_EDIT_ALL'   // Může získat editaci
  },
  'ORDER_EDIT_OWN': {
    expand: 'ORDER_EDIT_ALL',   // Rozšíření rozsahu
    upgrade: 'ORDER_DELETE_OWN' // Povýšení akce
  },
  // ... další mapování
};
```

### 2. **AuthContext.js**

Integrace do autentizačního kontextu.

```javascript
// State
const [userPermissions, setUserPermissions] = useState([]); // Základní práva
const [expandedPermissions, setExpandedPermissions] = useState([]); // Rozšířená práva

// hasPermission používá expandedPermissions
const hasPermission = useCallback((code) => {
  const norm = code.toString().trim().toUpperCase();
  
  // 1. Kontrola v expandedPermissions (obsahuje hierarchii)
  if ((expandedPermissions || []).some(p => p === norm)) return true;
  
  // 2. Fallback na userPermissions (bez hierarchie)
  if ((userPermissions || []).some(p => p === norm)) return true;
  
  return false;
}, [expandedPermissions, userPermissions, userDetail]);
```

**Kdy se rozšiřují práva:**

1. **Při přihlášení** - načte se hierarchie a rozšíří práva
2. **Při refresh user detail** - přepočítá rozšířená práva
3. **Při změně hierarchie** - automaticky aktualizuje

### 3. **Orders25List.js**

UI komponenta s informačním bannerem.

```javascript
// Načíst konfiguraci hierarchie
useEffect(() => {
  const loadHierarchy = async () => {
    const { getHierarchyConfig } = await import('../services/hierarchyService');
    const config = await getHierarchyConfig(token, username);
    setHierarchyConfig(config);
  };
  
  loadHierarchy();
}, [token, username]);

// Zobrazit informační banner
{hierarchyConfig && hierarchyConfig.status !== 'disabled' && (
  <div style={{ /* styling */ }}>
    {/* Informace o hierarchii */}
    {hierarchyConfig.status === 'active' && 
      `Vidíte objednávky podle organizačního řádu "${hierarchyConfig.profileName}"`
    }
  </div>
)}
```

### 4. **OrderForm25.js**

Formulář automaticky používá `hasPermission` z AuthContext, takže hierarchie funguje transparentně.

```javascript
const { hasPermission } = useContext(AuthContext);

// Všechny kontroly používají hasPermission (které používá expandedPermissions)
const canEditPhase2 = hasPermission('ORDER_EDIT_ALL');
const canApproveOrders = hasPermission('ORDER_APPROVE');
```

---

## 🔄 Workflow

### Příklad 1: Základní uživatel

**Základní práva:**
- `ORDER_READ_OWN` - vidí svoje objednávky
- `ORDER_CREATE` - může vytvářet nové

**S vypnutou hierarchií:**
- Vidí pouze svoje objednávky
- Nemůže editovat cizí objednávky

**Se zapnutou hierarchií:**
- `ORDER_READ_OWN` → `ORDER_READ_ALL` ✅ Vidí i objednávky podřízených
- `ORDER_READ_OWN` → `ORDER_EDIT_OWN` ✅ Může editovat svoje
- `ORDER_READ_ALL` → `ORDER_EDIT_ALL` ✅ Může editovat i cizí

**Výsledek:**
```
Základní práva: [ORDER_READ_OWN, ORDER_CREATE]
Rozšířená práva: [ORDER_READ_OWN, ORDER_CREATE, ORDER_READ_ALL, ORDER_EDIT_OWN, ORDER_EDIT_ALL]
```

### Příklad 2: Uživatel bez práv k objednávkám

**Základní práva:**
- `USER_VIEW` - vidí uživatele
- `DICT_MANAGE` - spravuje číselníky

**Se zapnutou hierarchií:**
- Hierarchie **nic nepřidá**, protože základní práva neobsahují žádné `ORDER_*`

**Výsledek:**
```
Základní práva: [USER_VIEW, DICT_MANAGE]
Rozšířená práva: [USER_VIEW, DICT_MANAGE]  ← Žádná změna!
```

### Příklad 3: Administrátor

**Základní práva:**
- `ORDER_MANAGE` - plná správa objednávek

**Se zapnutou hierarchií:**
- `ORDER_MANAGE` už obsahuje všechna práva
- Hierarchie nepřidá nic extra (už má maximum)

---

## 📊 Stavy hierarchie

| Stav | Popis | Barva banneru |
|------|-------|---------------|
| `disabled` | Hierarchie vypnutá | Žádný banner |
| `no_profile` | Zapnutá, ale chybí profil | ⚠️ Žlutá |
| `active` | Aktivní a funkční | 🏢 Modrá |
| `error` | Chyba při načítání | ❌ Červená |

---

## 🧪 Testování

### Test 1: Vypnutá hierarchie

```javascript
// Základní práva
const basePerms = ['ORDER_READ_OWN', 'ORDER_CREATE'];

// Hierarchie vypnutá
const expanded = expandPermissionsWithHierarchy(basePerms, false);

// Výsledek: STEJNÉ jako základní práva
expect(expanded).toEqual(['ORDER_READ_OWN', 'ORDER_CREATE']);
```

### Test 2: Zapnutá hierarchie

```javascript
// Základní práva
const basePerms = ['ORDER_READ_OWN'];

// Hierarchie zapnutá
const expanded = expandPermissionsWithHierarchy(basePerms, true, true, true);

// Výsledek: Rozšířená práva
expect(expanded).toContain('ORDER_READ_ALL');  // Rozšíření rozsahu
expect(expanded).toContain('ORDER_EDIT_OWN');  // Povýšení akce
```

### Test 3: Žádná práva + hierarchie

```javascript
// Žádná práva
const basePerms = [];

// Hierarchie zapnutá
const expanded = expandPermissionsWithHierarchy(basePerms, true);

// Výsledek: Stále ŽÁDNÁ práva
expect(expanded).toEqual([]);
```

---

## 🔒 Bezpečnostní aspekty

### ✅ Bezpečné

1. **Hierarchie je opt-in** - musí být explicitně zapnutá administrátorem
2. **Nevytváří práva z ničeho** - vyžaduje základní právo
3. **Průhledné logování** - všechny rozšíření jsou zalogované
4. **Fallback mechanismus** - při chybě používá pouze základní práva

### ⚠️ Pozor na

1. **Caching** - `expandedPermissions` jsou cachované, ale aktualizují se při změně hierarchie
2. **Kombinace rozšíření** - více základních práv může vést k rozsáhlému rozšíření
3. **Performance** - rozšíření se provádí při přihlášení a refresh, ne při každém `hasPermission()`

---

## 📝 Použití

### Komponenty

Všechny komponenty, které již používají `hasPermission` z `AuthContext`, automaticky využívají hierarchii.

```javascript
import { AuthContext } from '../context/AuthContext';

function MyComponent() {
  const { hasPermission } = useContext(AuthContext);
  
  // Toto automaticky používá expandedPermissions (s hierarchií)
  if (hasPermission('ORDER_EDIT_ALL')) {
    // ...
  }
}
```

### Debugging

```javascript
import { getPermissionsSummary } from '../services/permissionHierarchyService';

// Získej přehled všech práv
const summary = getPermissionsSummary(userPermissions, hierarchyConfig);

console.log(summary);
// {
//   hierarchyEnabled: true,
//   profileId: 5,
//   profileName: "Finanční ředitel",
//   basePermissions: [ORDER_READ_OWN, ORDER_CREATE],
//   expandedPermissions: [ORDER_READ_OWN, ORDER_CREATE, ORDER_READ_ALL, ORDER_EDIT_OWN, ORDER_EDIT_ALL],
//   addedByHierarchy: [ORDER_READ_ALL, ORDER_EDIT_OWN, ORDER_EDIT_ALL],
//   summary: {
//     baseCount: 2,
//     expandedCount: 5,
//     addedCount: 3
//   }
// }
```

---

## 🚀 Budoucí rozšíření

### Sprint 2: Pokladna (Cashbook)
- Přidat mapování pro `CASHBOOK_*` práva
- Analogické rozšíření jako u objednávek

### Sprint 3: Faktury (Invoices)
- Přidat mapování pro `INVOICE_*` práva
- Integrace do Invoices25List

### Obecné vylepšení
- **UI konfigurace** - vizuální nastavení mapování v admin panelu
- **Role-based mapping** - různá mapování pro různé role
- **Audit log** - sledování, kdy a komu hierarchie rozšířila práva

---

## 🛠️ Maintenance

### Přidání nového práva

1. Otevři `permissionHierarchyService.js`
2. Přidej mapování do `PERMISSION_HIERARCHY_MAP`:
   ```javascript
   'NEW_PERMISSION_OWN': {
     expand: 'NEW_PERMISSION_ALL',
     upgrade: 'NEW_PERMISSION_EDIT_OWN'
   }
   ```
3. Není potřeba měnit nic jiného - AuthContext automaticky použije nové mapování

### Debugging problémů

1. **Zkontroluj console.log** - všechny rozšíření jsou zalogované
2. **Použij `getPermissionsSummary()`** - získej přehled všech práv
3. **Zkontroluj hierarchyConfig** - status musí být `active`
4. **Verifikuj basePermissions** - musí existovat základní právo

---

## 📖 Související dokumentace

- [HIERARCHY_IMPLEMENTATION_README.md](/var/www/erdms-dev/HIERARCHY_IMPLEMENTATION_README.md) - Celková implementace hierarchie
- [HIERARCHY_ROLE_IMPLEMENTATION_PLAN.md](/var/www/erdms-dev/HIERARCHY_ROLE_IMPLEMENTATION_PLAN.md) - Plán implementace pro role

---

**Poznámky:**
- Hierarchie funguje transparentně - žádná změna v komponentách není potřeba
- Všechno, co používá `hasPermission`, automaticky používá hierarchii
- Při vypnutí hierarchie se vše vrátí k původnímu chování

