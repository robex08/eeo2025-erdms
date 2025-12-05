# API Fix - fetchRoleDetail

## Změna

Upravena funkce `fetchRoleDetail()` v `/src/services/api2auth.js` aby správně posílala parametry podle API požadavků.

## Původní problém

API endpoint očekává pouze `token` a `username`, ale kód posílal i další parametry.

## Řešení

```javascript
export async function fetchRoleDetail({ token, username, roleId }) {
  try {
    const payload = {
      token,
      username
    };
    
    // Pokud je roleId poskytnuto, přidej ho do payloadu
    if (roleId !== undefined && roleId !== null) {
      payload.role_id = roleId;
    }
    
    const response = await api2.post('role/detail', payload);
    return response.data.status === 'ok' ? response.data.data : null;
  } catch (error) {
    console.error('[API] Fetch role detail error:', error);
    return null;
  }
}
```

## Posílané parametry

### Minimální (vždy):
```json
{
  "token": "user-token",
  "username": "requesting-username"
}
```

### S role_id (pokud je poskytnut):
```json
{
  "token": "user-token",
  "username": "requesting-username",
  "role_id": 9
}
```

## Volání z komponenty

```javascript
const roleDetail = await fetchRoleDetail({
  token,
  username: user.username,
  roleId: id  // Volitelné - pokud není, API vrátí všechny role
});
```

---

**Status:** ✅ Opraveno
**Datum:** 18. října 2025
