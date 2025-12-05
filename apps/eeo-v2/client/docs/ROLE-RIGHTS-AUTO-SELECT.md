# Automatické načítání práv při výběru role

## 📋 Přehled

Implementována funkce automatického načítání a zobrazování práv z rolí v dialogu správy uživatelů. Práva z rolí jsou zobrazena jako **read-only** (disabled), zatímco přímá práva jsou plně editovatelná.

**Datum implementace:** 18. října 2025

## 🎯 Funkčnost

### Chování

1. **Při otevření dialogu:**
   - Načtou se role uživatele z `userData.roles`
   - Automaticky se načtou všechna práva z těchto rolí přes API
   - Práva z rolí se zobrazí v tabu "Přímá práva" jako **zaškrtnuté a disabled** (nelze odškrtnout)
   - Přímá práva (`direct_rights`) jsou zobrazena jako editovatelná

2. **Při zaškrtnutí nové role:**
   - Automaticky se načtou práva této role z API
   - Práva se přidají do zobrazení (zaškrtnutá, disabled)
   - useEffect automaticky zavolá `loadRightsFromRoles()` pro všechny vybrané role

3. **Při odškrtnutí role:**
   - Role se odstraní ze seznamu
   - useEffect automaticky přenačte práva ze zbývajících rolí
   - Práva této role zmizí z "read-only" zobrazení

4. **Přímá práva:**
   - Uživatel může přidat další práva nad rámec rolí
   - Tato práva jsou plně editovatelná
   - Pokud právo je zároveň z role i přímé, je editovatelné

### Vizuální rozlišení

- **Práva z rolí (pouze):** Modrý podklad, disabled checkbox, označení "(z role)"
- **Přímá práva:** Bílý podklad, editovatelný checkbox
- **Práva z rolí + přímá:** Bílý podklad, editovatelný checkbox (lze odebrat z přímých)

### API Endpoint

```
POST /role/detail

Parametry:
{
  "token": "user-token",
  "username": "requestor-username",
  "role_id": 9
}

Odpověď:
{
  "status": "ok",
  "data": {
    "id": 9,
    "nazev": "Správce",
    "popis": "Administrátor systému",
    "prava": [
      {
        "id": 1,
        "kod_prava": "view_orders",
        "popis": "Zobrazení objednávek"
      },
      {
        "id": 2,
        "kod_prava": "edit_orders",
        "popis": "Editace objednávek"
      },
      {
        "id": 3,
        "kod_prava": "delete_orders",
        "popis": "Mazání objednávek"
      }
    ]
  }
}
```

## 📁 Změněné soubory

### 1. `/src/services/api2auth.js`

Přidána nová funkce pro načtení detailu role:

```javascript
export async function fetchRoleDetail({ token, username, roleId }) {
  try {
    const response = await api2.post('role/detail', {
      username,
      token,
      role_id: roleId
    });
    return response.data.status === 'ok' ? response.data.data : null;
  } catch (error) {
    console.error('[API] Fetch role detail error:', error);
    return null;
  }
}
```

### 2. `/src/components/userManagement/UserManagementModal.js`

#### Nový state pro práva z rolí:

```javascript
// Práva načtená z rolí (pro zobrazení jako disabled/readonly)
const [rightsFromRoles, setRightsFromRoles] = useState(new Set());
```

#### Funkce pro načtení práv ze všech rolí:

```javascript
const loadRightsFromRoles = async (roleIds) => {
  if (!roleIds || roleIds.length === 0) {
    setRightsFromRoles(new Set());
    return;
  }

  try {
    const allRights = new Set();
    
    // Načíst detail každé role
    for (const roleId of roleIds) {
      const roleDetail = await fetchRoleDetail({
        token,
        username: user.username,
        roleId: roleId
      });
      
      if (roleDetail && roleDetail.prava && Array.isArray(roleDetail.prava)) {
        roleDetail.prava.forEach(p => {
          if (p.id) {
            allRights.add(p.id);
          }
        });
      }
    }
    
    console.log(`✅ Načteno ${allRights.size} práv z ${roleIds.length} rolí`);
    setRightsFromRoles(allRights);
  } catch (error) {
    console.error('Chyba při načítání práv z rolí:', error);
    setRightsFromRoles(new Set());
  }
};
```

#### useEffect pro automatické načítání práv při změně rolí:

```javascript
// Při změně rolí přenačíst jejich práva
useEffect(() => {
  if (isOpen && formData.roles && formData.roles.length > 0 && token && user?.username) {
    loadRightsFromRoles(formData.roles);
  } else if (isOpen) {
    setRightsFromRoles(new Set());
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formData.roles, isOpen, token, user?.username]);
```

#### Zjednodušená funkce handleCheckboxChange:

```javascript
const handleCheckboxChange = (field, id) => {
  // Standardní toggle pro všechna pole (role i práva)
  setFormData(prev => {
    const current = prev[field] || [];
    const isChecked = current.includes(id);
    
    return {
      ...prev,
      [field]: isChecked 
        ? current.filter(x => x !== id)
        : [...current, id]
    };
  });
};
```

#### Upravené UI v tabu "Přímá práva":

```javascript
{prava.map(p => {
  const isFromRole = rightsFromRoles.has(p.id);
  const isDirectlySelected = formData.direct_rights.includes(p.id);
  const isChecked = isFromRole || isDirectlySelected;
  
  return (
    <CheckboxLabel 
      key={p.id}
      $checked={isChecked}
      style={{ 
        opacity: isFromRole && !isDirectlySelected ? 0.7 : 1,
        background: isFromRole && !isDirectlySelected ? '#f0f9ff' : undefined
      }}
    >
      <Checkbox
        type="checkbox"
        checked={isChecked}
        disabled={isFromRole && !isDirectlySelected}
        onChange={() => handleCheckboxChange('direct_rights', p.id)}
        style={{ cursor: isFromRole && !isDirectlySelected ? 'not-allowed' : 'pointer' }}
      />
      <CheckboxContent>
        <CheckboxTitle style={{ fontFamily: 'monospace' }}>
          {p.kod_prava || p.nazev}
          {isFromRole && !isDirectlySelected && (
            <span style={{ 
              marginLeft: '0.5rem', 
              fontSize: '0.75rem', 
              color: '#0284c7',
              fontWeight: 600
            }}>
              (z role)
            </span>
          )}
        </CheckboxTitle>
        {p.popis && <CheckboxDescription>{p.popis}</CheckboxDescription>}
      </CheckboxContent>
    </CheckboxLabel>
  );
})}
```

## 🔄 Workflow

### Scénář 1: Vytvoření nového uživatele

```
1. Otevřít dialog "Přidat uživatele"
2. Přejít na tab "Role"
3. Zaškrtnout roli "Správce"
   → useEffect detekuje změnu formData.roles
   → Automaticky volá loadRightsFromRoles()
   → Načtou se práva z API
4. Přejít na tab "Přímá práva"
   → Zobrazí se práva z role (disabled, modrý podklad, "(z role)")
5. Volitelně přidat další přímá práva (editovatelné)
6. Uložit uživatele
   → Backend dostane: roles: [9], direct_rights: [4, 5] (pouze extra práva)
```

### Scénář 2: Úprava existujícího uživatele

```
1. Otevřít dialog "Upravit uživatele"
   → Načtou se jeho role (např. [9])
   → useEffect automaticky načte práva z těchto rolí
2. Přejít na tab "Přímá práva"
   → Zobrazí se práva z role + jeho přímá práva
3. Přidat další roli
   → useEffect detekuje změnu
   → Přenačtou se práva ze VŠECH aktuálních rolí
4. Odebrat roli
   → useEffect detekuje změnu
   → Přenačtou se práva ze zbývajících rolí
5. Uložit změny
```

## ✅ Výhody

1. **Transparentnost:** Vidíte přesně, která práva přicházejí z kterých rolí
2. **Ochrana:** Práva z rolí nelze omylem odškrtnout
3. **Flexibilita:** Lze přidat extra práva nad rámec rolí
4. **Automatika:** Při změně rolí se práva automaticky přenačítají
5. **Čistota dat:** Do `direct_rights` se ukládají pouze skutečně přímá práva (ne z rolí)

## 🔍 Konzolové logy

```javascript
console.log(`✅ Načteno ${allRights.size} práv z ${roleIds.length} rolí`);
```

## 📝 Důležité poznámky

### Rozdíl oproti předchozí verzi:

**DŘÍVE (špatně):**
- Práva z rolí se přidávala do `direct_rights`
- Všechna práva byla editovatelná
- Při odškrtnutí role práva zůstávala v `direct_rights`

**NYNÍ (správně):**
- Práva z rolí jsou v separátním state `rightsFromRoles` (Set)
- Zobrazují se jako disabled/readonly
- Při změně rolí se automaticky přenačítají
- `direct_rights` obsahuje POUZE skutečně přímá práva
- Backend dostává čistá data

### Data odeslaná na backend:

```javascript
{
  roles: [9, 12],           // ID rolí
  direct_rights: [15, 20]   // ID pouze přímých práv (ne z rolí!)
}
```

## 🧪 Testování

1. ✅ Otevřít dialog s uživatelem s rolemi → práva se načtou automaticky
2. ✅ Zaškrtnout novou roli → práva se přidají do zobrazení
3. ✅ Odškrtnout roli → práva zmizí ze zobrazení
4. ✅ Zkusit odškrtnout právo z role → nelze (disabled)
5. ✅ Přidat přímé právo → lze zaškrtnout/odškrtnout
6. ✅ Console log → zobrazí počet načtených práv

## 🚀 Deployment

- ✅ Bez breaking changes
- ✅ Zpětně kompatibilní
- ✅ Žádné změny v databázi
- ✅ Funguje s existujícím API
- ✅ Clean data separation

---

**Status:** ✅ Implementováno a připraveno k testování
**Verze:** 2.0 (opravena logika správy práv)

### API Endpoint

```
POST /role/detail

Parametry:
{
  "token": "user-token",
  "username": "requestor-username",
  "role_id": 9
}

Odpověď:
{
  "status": "ok",
  "data": {
    "id": 9,
    "nazev": "Správce",
    "popis": "Administrátor systému",
    "prava": [
      {
        "id": 1,
        "kod_prava": "view_orders",
        "popis": "Zobrazení objednávek"
      },
      {
        "id": 2,
        "kod_prava": "edit_orders",
        "popis": "Editace objednávek"
      },
      {
        "id": 3,
        "kod_prava": "delete_orders",
        "popis": "Mazání objednávek"
      }
    ]
  }
}
```

## 📁 Změněné soubory

### 1. `/src/services/api2auth.js`

Přidána nová funkce pro načtení detailu role:

```javascript
export async function fetchRoleDetail({ token, username, roleId }) {
  try {
    const response = await api2.post('role/detail', {
      username,
      token,
      role_id: roleId
    });
    return response.data.status === 'ok' ? response.data.data : null;
  } catch (error) {
    console.error('[API] Fetch role detail error:', error);
    return null;
  }
}
```

### 2. `/src/components/userManagement/UserManagementModal.js`

#### Import nové API funkce:
```javascript
import { 
  // ... ostatní
  fetchRoleDetail, 
  // ... ostatní
} from '../../services/api2auth';
```

#### Upravená funkce `handleCheckboxChange`:

```javascript
const handleCheckboxChange = async (field, id) => {
  // Pro změny v rolích - načíst práva z role
  if (field === 'roles') {
    const current = formData.roles || [];
    const isChecked = current.includes(id);
    
    if (isChecked) {
      // Odškrtávání role - odstranit ji
      setFormData(prev => ({
        ...prev,
        roles: current.filter(x => x !== id)
      }));
    } else {
      // Zaškrtávání role - načíst práva z této role
      try {
        const roleDetail = await fetchRoleDetail({
          token,
          username: user.username,
          roleId: id
        });
        
        if (roleDetail && roleDetail.prava && Array.isArray(roleDetail.prava)) {
          const newRights = roleDetail.prava.map(p => p.id);
          
          setFormData(prev => {
            // Přidáme novou roli
            const newRoles = [...current, id];
            
            // Přidáme práva z této role k přímým právům (pokud tam ještě nejsou)
            const existingRights = new Set(prev.direct_rights);
            newRights.forEach(rightId => existingRights.add(rightId));
            
            return {
              ...prev,
              roles: newRoles,
              direct_rights: Array.from(existingRights)
            };
          });
          
          console.log(`✅ Role ${id} načtena s ${newRights.length} právy`);
        } else {
          // Role nemá práva, jen ji přidáme
          setFormData(prev => ({
            ...prev,
            roles: [...current, id]
          }));
        }
      } catch (error) {
        console.error('Chyba při načítání práv role:', error);
        // I při chybě přidáme roli
        setFormData(prev => ({
          ...prev,
          roles: [...current, id]
        }));
      }
    }
  } else {
    // Pro ostatní pole (např. direct_rights) standardní toggle
    setFormData(prev => {
      const current = prev[field] || [];
      const isChecked = current.includes(id);
      
      return {
        ...prev,
        [field]: isChecked 
          ? current.filter(x => x !== id)
          : [...current, id]
      };
    });
  }
};
```

#### Upravený UI v tabu "Přímá práva":

- Odstraněn indikátor "(z role)" - všechna práva jsou nyní v direct_rights
- Zjednodušené zobrazení počtu práv
- Všechna práva jsou editovatelná (žádná disabled)

## 🔄 Workflow

### Příklad použití:

1. **Vytvoření nového uživatele:**
   ```
   1. Otevřít dialog "Přidat uživatele"
   2. Přejít na tab "Role"
   3. Zaškrtnout roli "Správce"
      → Automaticky se načtou práva této role
      → Práva se přidají do "Přímá práva"
   4. Přejít na tab "Přímá práva"
      → Zobrazí se všechna práva ze role (zaškrtnutá)
   5. Volitelně přidat/odebrat další práva ručně
   6. Uložit uživatele
   ```

2. **Úprava existujícího uživatele:**
   ```
   1. Otevřít dialog "Upravit uživatele"
   2. Přejít na tab "Role"
   3. Přidat další roli
      → Práva z nové role se automaticky přidají
      → Stávající práva zůstanou zachována
   4. Uložit změny
   ```

## ✅ Výhody

1. **Transparentnost:** Uživatel vidí okamžitě, jaká práva role obsahuje
2. **Flexibilita:** Práva lze ručně upravit i po načtení z role
3. **Jednoduchost:** Není třeba rozlišovat "práva z role" vs "přímá práva"
4. **Kontrola:** Uživatel má plnou kontrolu nad všemi právy

## 🔍 Konzolové logy

Pro debugging:
```javascript
console.log(`✅ Role ${id} načtena s ${newRights.length} právy`);
```

## 📝 Poznámky

- Práva se PŘIDÁVAJÍ do existujících (nenahrazují je)
- Při odškrtnutí role se práva nezrušují automaticky
- Funkce `rightsFromRoles` v useMemo je nyní prázdná (ponechána pro budoucí použití)
- API volání je asynchronní - používá `async/await`

## 🧪 Testování

1. Zaškrtnout roli → zkontrolovat console log a tab "Přímá práva"
2. Zaškrtnout více rolí → práva se kombinují
3. Odškrtnout roli → práva zůstávají
4. Zkusit API chybu → role se i tak přidá, práva ne

## 🚀 Deployment

- ✅ Bez breaking changes
- ✅ Zpětně kompatibilní
- ✅ Žádné změny v databázi
- ✅ Funguje s existujícím API

---

**Status:** ✅ Implementováno a připraveno k testování
