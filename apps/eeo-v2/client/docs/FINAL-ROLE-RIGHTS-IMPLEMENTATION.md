# Finální implementace - Role a práva

## ✅ Co bylo implementováno

### 1. API endpoint opraveno
**Soubor:** `/src/services/api2auth.js`

```javascript
export async function fetchRoleDetail({ token, username, roleId }) {
  const payload = {
    token,
    username,
    id: typeof roleId === 'string' ? parseInt(roleId, 10) : roleId
  };
  
  const response = await api2.post('role/detail', payload);
  return response.data.status === 'ok' ? response.data.data : null;
}
```

**Klíčové body:**
- Parametr se jmenuje `id` (ne `role_id`)
- Hodnota musí být `number` (převádíme string → number)
- Posílá se: `{token, username, id: 2}`

### 2. Automatické načítání při otevření dialogu
**Soubor:** `/src/components/userManagement/UserManagementModal.js`

```javascript
// Při změně rolí přenačíst jejich práva
useEffect(() => {
  if (isOpen && formData.roles && formData.roles.length > 0 && token && user?.username) {
    console.log('🔄 Načítám práva pro role:', formData.roles);
    loadRightsFromRoles(formData.roles);
  } else if (isOpen) {
    console.log('🔄 Žádné role, vynulování práv');
    setRightsFromRoles(new Set());
  }
}, [formData.roles, isOpen, token, user?.username]);

// Při zavření dialogu vyčistit práva z rolí
useEffect(() => {
  if (!isOpen) {
    setRightsFromRoles(new Set());
  }
}, [isOpen]);
```

**Co se děje:**
1. **Dialog se otevře s uživatelem** → načtou se jeho role → automaticky se načtou práva
2. **Kliknutí na roli** → změní se `formData.roles` → trigger useEffect → reload všech práv
3. **Zavření dialogu** → vyčištění `rightsFromRoles`

### 3. Vylepšené console logy

```javascript
const loadRightsFromRoles = async (roleIds) => {
  console.log('🔍 Začínám načítat práva pro role:', roleIds);
  
  for (const roleId of roleIds) {
    console.log(`📡 Načítám detail role ID: ${roleId}`);
    const roleDetail = await fetchRoleDetail({...});
    
    if (roleDetail?.prava) {
      console.log(`  ✓ Role ${roleId} má ${roleDetail.prava.length} práv:`, 
                  roleDetail.prava.map(p => p.kod_prava));
    }
  }
  
  console.log(`✅ Načteno celkem ${allRights.size} unikátních práv z ${roleIds.length} rolí`);
};
```

### 4. Vylepšené zobrazení počtu práv

**V tabu "Přímá práva":**
```
Přímá práva uživatele (90/5)
```

Kde:
- **90** = celkem práv (přímá + z rolí)
- **5** = počet práv z rolí

```javascript
<SectionTitle>
  Přímá práva uživatele
  <span>
    ({formData.direct_rights.length + rightsFromRoles.size}/{rightsFromRoles.size})
  </span>
</SectionTitle>
```

## 🔄 Workflow

### Scénář 1: Otevření dialogu s uživatelem

```
1. Otevřít dialog → userData obsahuje roles: ['2', '5']
2. formData.roles se nastaví na ['2', '5']
3. useEffect detekuje změnu formData.roles
4. Zavolá loadRightsFromRoles(['2', '5'])
5. Pro každou roli:
   - API call: POST /role/detail {token, username, id: 2}
   - Načtou se práva role
6. Všechna práva se uloží do rightsFromRoles (Set)
7. UI zobrazí práva jako disabled s "(z role)"
```

### Scénář 2: Kliknutí na roli

```
1. Uživatel zaškrtne roli ID: 3
2. handleCheckboxChange() → formData.roles = ['2', '5', '3']
3. useEffect detekuje změnu
4. Zavolá loadRightsFromRoles(['2', '5', '3'])
5. Načtou se práva ze VŠECH 3 rolí
6. rightsFromRoles se aktualizuje
7. UI se překreslí s novými právy
```

### Scénář 3: Odškrtnutí role

```
1. Uživatel odškrtne roli ID: 2
2. handleCheckboxChange() → formData.roles = ['5', '3']
3. useEffect detekuje změnu
4. Zavolá loadRightsFromRoles(['5', '3'])
5. Načtou se práva pouze ze zbývajících 2 rolí
6. rightsFromRoles se aktualizuje (práva z role 2 zmizí)
7. UI se překreslí
```

## 📊 Struktura dat

### rightsFromRoles (Set)
```javascript
Set {
  1,   // ID práva z role
  2,   // ID práva z role
  5,   // ID práva z role
  ...
}
```

### formData.direct_rights (Array)
```javascript
[
  15,  // ID přímého práva (ne z role)
  20,  // ID přímého práva (ne z role)
  ...
]
```

### UI zobrazení práva
```javascript
const isFromRole = rightsFromRoles.has(p.id);           // Je z role?
const isDirectlySelected = formData.direct_rights.includes(p.id);  // Je přímé?
const isChecked = isFromRole || isDirectlySelected;     // Zaškrtnuté?

// Právo z role → disabled, modrý podklad, "(z role)"
// Přímé právo → editovatelné, bílý podklad
```

## 🐛 Debug výstup v konzoli

```
🔄 Načítám práva pro role: ['2', '5']
🔍 Začínám načítat práva pro role: ['2', '5']
📡 Načítám detail role ID: 2
[API] fetchRoleDetail - payload: {token: "...", username: "...", id: 2}
[API] fetchRoleDetail - response: {status: "ok", data: {id: 2, nazev: "...", prava: [...]}}
  ✓ Role 2 má 15 práv: ['view_orders', 'edit_orders', ...]
📡 Načítám detail role ID: 5
[API] fetchRoleDetail - payload: {token: "...", username: "...", id: 5}
[API] fetchRoleDetail - response: {status: "ok", data: {id: 5, nazev: "...", prava: [...]}}
  ✓ Role 5 má 8 práv: ['view_users', 'edit_users', ...]
✅ Načteno celkem 20 unikátních práv z 2 rolí
```

## ✅ Checklist

- ✅ API posílá správný parametr `id` jako number
- ✅ Automatické načítání při otevření dialogu
- ✅ Reload při změně rolí (zaškrtnutí/odškrtnutí)
- ✅ Vyčištění při zavření dialogu
- ✅ Vylepšené console logy pro debug
- ✅ Zobrazení počtu práv ve formátu (celkem/z_rolí)
- ✅ Práva z rolí jsou disabled
- ✅ Přímá práva jsou editovatelná

---

**Status:** ✅ Kompletně implementováno
**Datum:** 18. října 2025
**Build:** Úspěšný bez chyb
