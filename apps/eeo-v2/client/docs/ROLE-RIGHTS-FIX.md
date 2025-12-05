# Quick Fix - Role Rights Loading

## Problem
Při otevření dialogu nebo změně rolí se práva z rolí nesprávně přidávala do `direct_rights`.

## Solution

### Implementace
1. **Nový state:** `rightsFromRoles` (Set) - obsahuje ID práv z aktuálně vybraných rolí
2. **Automatické načítání:** useEffect reaguje na změnu `formData.roles`
3. **Zobrazení:** Práva z rolí jsou disabled, přímá práva editovatelná

### Klíčové změny

```javascript
// State pro práva z rolí
const [rightsFromRoles, setRightsFromRoles] = useState(new Set());

// Automatické načítání při změně rolí
useEffect(() => {
  if (isOpen && formData.roles && formData.roles.length > 0) {
    loadRightsFromRoles(formData.roles);
  } else {
    setRightsFromRoles(new Set());
  }
}, [formData.roles, isOpen]);

// Funkce načte práva ze všech vybraných rolí
const loadRightsFromRoles = async (roleIds) => {
  const allRights = new Set();
  for (const roleId of roleIds) {
    const roleDetail = await fetchRoleDetail({...});
    if (roleDetail?.prava) {
      roleDetail.prava.forEach(p => allRights.add(p.id));
    }
  }
  setRightsFromRoles(allRights);
};
```

### UI zobrazení

```javascript
const isFromRole = rightsFromRoles.has(p.id);
const isDirectlySelected = formData.direct_rights.includes(p.id);
const isChecked = isFromRole || isDirectlySelected;

// Právo z role → disabled, modrý podklad, "(z role)"
// Přímé právo → editovatelné, bílý podklad
```

## Výsledek

✅ Při otevření dialogu se automaticky načtou práva z rolí  
✅ Při změně role se přenačtou všechna práva ze všech rolí  
✅ Práva z rolí jsou readonly (disabled)  
✅ Přímá práva jsou editovatelná  
✅ Clean data separation - backend dostává správná data

## API

```
POST /role/detail
{
  "token": "...",
  "username": "...",
  "role_id": 9
}
```

## Files Changed
- `/src/services/api2auth.js` - nová funkce `fetchRoleDetail()`
- `/src/components/userManagement/UserManagementModal.js` - logika načítání práv
- `/docs/ROLE-RIGHTS-AUTO-SELECT.md` - dokumentace
