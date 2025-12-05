# Debug Fix - Role Detail API Call

## Problém

API `/role/detail` vrací **400 Bad Request** při volání.

## Příčina

Podle vašeho popisu API očekává pouze:
```
param: token + username
```

**NEOČEKÁVÁ** `role_id` jako parametr!

## Řešení

Odstranil jsem `role_id` z payloadu a přidal debug logy:

```javascript
export async function fetchRoleDetail({ token, username, roleId }) {
  try {
    // API očekává pouze token a username
    const payload = {
      token,
      username
    };
    
    console.log('[API] fetchRoleDetail - payload:', payload, 'roleId:', roleId);
    
    const response = await api2.post('role/detail', payload);
    
    console.log('[API] fetchRoleDetail - response:', response.data);
    
    return response.data.status === 'ok' ? response.data.data : null;
  } catch (error) {
    console.error('[API] Fetch role detail error:', error);
    console.error('[API] Error response:', error.response?.data);
    return null;
  }
}
```

## Co API pravděpodobně dělá

Možná varianty:
1. API vrací **všechny role s právy najednou** (ne jednu konkrétní)
2. API vrací roli podle aktuálně přihlášeného uživatele
3. Backend musí být upraven, aby přijímal `role_id`

## Debug výstup

Po spuštění uvidíme v konzoli:
- `[API] fetchRoleDetail - payload:` - co posíláme
- `[API] fetchRoleDetail - response:` - co dostáváme zpět
- `[API] Error response:` - detail chyby pokud nastane

## Co dělat dál

1. **Spustit aplikaci** a podívat se na console logy
2. **Zkontrolovat response** - co API skutečně vrací
3. Podle toho upravit:
   - Buď backend (přidat podporu pro `role_id`)
   - Nebo frontend (pracovat s tím co API vrací)

## Možné scénáře

### Scénář A: API vrací všechny role
Pokud API vrací všechny role najednou, upravíme logiku:
```javascript
const allRolesDetails = await fetchRoleDetail({token, username});
// Filtrovat jen ty role které potřebujeme
const roleDetail = allRolesDetails.find(r => r.id === roleId);
```

### Scénář B: Backend potřebuje úpravu
Backend musí přijmout `role_id` parametr a vrátit detail té konkrétní role.

---

**Další krok:** Spustit aplikaci a podívat se na console output! 🔍
