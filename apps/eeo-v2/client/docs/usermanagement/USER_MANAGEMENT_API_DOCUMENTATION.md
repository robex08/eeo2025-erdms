# User Management API Documentation

Kompletní API dokumentace pro správu uživatelů v systému evidence smluv. Všechny endpointy vyžadují autentifikaci pomocí tokenu.

## Přehled endpointů

### Existující read-only endpointy (již implementované)
- `POST users/list` - Seznam uživatelů s filtračními možnostmi
- `POST user/detail` - Detail uživatele podle username/ID

### Nové CRUD endpointy (právě implementované)
- `POST users/create` - Vytvoření nového uživatele
- `POST users/update` - Kompletní update uživatele
- `POST users/partial-update` - Částečný update uživatele
- `POST users/deactivate` - Deaktivace uživatele

### Číselníkové endpointy pro FE selecty
- `POST lokality/list` - Seznam lokalit
- `POST lokality/detail` - Detail lokality podle ID
- `POST pozice/list` - Seznam pozic
- `POST pozice/detail` - Detail pozice podle ID
- `POST organizace/list` - Seznam organizací  
- `POST organizace/detail` - Detail organizace podle ID
- `POST role/list` - Seznam rolí
- `POST role/detail` - Detail role včetně práv
- `POST prava/list` - Seznam práv
- `POST prava/detail` - Detail práva podle ID
- `POST useky/list` - Seznam útvarů (již existuje)
- `POST useky/detail` - Detail útvaru (již existuje)

---

## 1. Vytvoření uživatele

**Endpoint:** `POST users/create`

**Popis:** Vytváří nového uživatele včetně správy rolí a přímých práv.

### Request JSON:
```json
{
    "username": "novak.jan",
    "token": "valid_auth_token",
    "password": "heslo123",
    "jmeno": "Jan",
    "prijmeni": "Novák",
    "titul_pred": "Ing.",
    "titul_za": "Ph.D.",
    "email": "jan.novak@example.com",
    "telefon": "+420 123 456 789",
    "usek_id": 5,
    "lokalita_id": 2,
    "pozice_id": 3,
    "organizace_id": 1,
    "aktivni": 1,
    "roles": [1, 3, 5],
    "direct_rights": [10, 15, 20]
}
```

### Povinná pole:
- `username` (string, min. 3 znaky, pouze písmena, číslice, tečky, pomlčky, podtržítka)
- `token` (string, platný autentifikační token)
- `password` (string, min. 6 znaků)
- `jmeno` (string)
- `prijmeni` (string)

### Volitelná pole:
- `titul_pred`, `titul_za`, `email`, `telefon` (string nebo null)
- `usek_id`, `lokalita_id`, `pozice_id`, `organizace_id` (int > 0 nebo null)
- `aktivni` (int, default: 1)
- `roles` (array of int, ID rolí)
- `direct_rights` (array of int, ID práv)

### Response úspěch (201):
```json
{
    "status": "ok",
    "data": {
        "id": 42,
        "username": "novak.jan",
        "message": "Uživatel byl úspěšně vytvořen"
    }
}
```

### Response chyby:
```json
// 400 - Validační chyba
{
    "status": "error",
    "message": "Username musí mít alespoň 3 znaky",
    "code": "VALIDATION_ERROR"
}

// 409 - Konflikt (duplicita)
{
    "status": "error",
    "message": "Username již existuje",
    "code": "DUPLICATE_ERROR"
}

// 401 - Neautorizováno
{
    "status": "error",
    "message": "Neplatný nebo chybějící token",
    "code": "UNAUTHORIZED"
}
```

---

## 2. Update uživatele

**Endpoint:** `POST users/update`

**Popis:** Kompletní aktualizace uživatele. Lze aktualizovat všechna pole včetně hesla, rolí a práv.

### Request JSON:
```json
{
    "id": 42,
    "username": "admin",
    "token": "valid_auth_token",
    "jmeno": "Jan",
    "prijmeni": "Nový Příjmení",
    "email": "novy.email@example.com",
    "aktivni": 1,
    "password": "nove_heslo123",
    "roles": [1, 2],
    "direct_rights": [5, 10, 15]
}
```

### Povinná pole:
- `id` (int, ID uživatele k aktualizaci)
- `username` (string, username uživatele provádějícího operaci)
- `token` (string, platný autentifikační token)

### Volitelná pole:
- Všechna pole z create endpointu (kromě password, které je volitelné)
- Pokud pole není uvedeno, zůstává nezměněno

### Response úspěch (200):
```json
{
    "status": "ok",
    "data": {
        "id": 42,
        "username": "novak.jan",
        "updated_fields": ["jmeno", "prijmeni", "email"],
        "message": "Uživatel byl úspěšně aktualizován"
    }
}
```

### Response chyby:
```json
// 404 - Uživatel nenalezen
{
    "status": "error",
    "message": "Uživatel nenalezen",
    "code": "NOT_FOUND"
}
```

---

## 3. Částečný update uživatele

**Endpoint:** `POST users/partial-update`

**Popis:** Alias pro `users/update` - implementuje stejnou logiku.

Použijte pro semantic clarity, kdy chcete zdůraznit, že provádíte pouze částečnou aktualizaci.

---

## 4. Deaktivace uživatele

**Endpoint:** `POST users/deactivate`

**Popis:** Nastaví uživatele jako neaktivního (aktivni = 0). Nedochází k mazání dat.

### Request JSON:
```json
{
    "id": 42,
    "username": "admin",
    "token": "valid_auth_token"
}
```

### Povinná pole:
- `id` (int, ID uživatele k deaktivaci)
- `username` (string, username uživatele provádějícího operaci)
- `token` (string, platný autentifikační token)

### Response úspěch (200):
```json
{
    "status": "ok",
    "data": {
        "id": 42,
        "username": "novak.jan",
        "deactivated": true,
        "message": "Uživatel byl úspěšně deaktivován"
    }
}
```

---

## 5. Seznam uživatelů (existující)

**Endpoint:** `POST users/list`

### Request JSON:
```json
{
    "username": "admin",
    "token": "valid_auth_token",
    "limit": 50,
    "offset": 0,
    "search": "novák",
    "usek_id": 5,
    "aktivni": 1
}
```

### Response úspěch (200):
```json
{
    "status": "ok",
    "users": [
        {
            "id": 42,
            "username": "novak.jan",
            "jmeno": "Jan",
            "prijmeni": "Novák",
            "titul_pred": "Ing.",
            "titul_za": "Ph.D.",
            "email": "jan.novak@example.com",
            "telefon": "+420 123 456 789",
            "aktivni": 1,
            "usek_id": 5,
            "usek_nazev": "IT oddělení",
            "lokalita_id": 2,
            "lokalita_nazev": "Praha",
            "pozice_id": 3,
            "pozice_nazev": "Vývojář",
            "organizace_id": 1,
            "organizace_nazev": "Hlavní organizace",
            "dt_vytvoreni": "2025-01-15 10:30:15",
            "dt_aktualizace": "2025-01-15 14:20:30",
            "roles": [
                {"id": 1, "nazev": "Admin", "popis": "Administrátor systému"},
                {"id": 3, "nazev": "Editor", "popis": "Editor obsahu"}
            ],
            "direct_rights": [
                {"id": 10, "nazev": "USER_CREATE", "popis": "Vytváření uživatelů"},
                {"id": 15, "nazev": "USER_EDIT", "popis": "Editace uživatelů"}
            ]
        }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
}
```

---

## 6. Detail uživatele (existující)

**Endpoint:** `POST user/detail`

### Request JSON:
```json
{
    "username": "admin",
    "token": "valid_auth_token",
    "target_username": "novak.jan"
}
```

### Response úspěch (200):
```json
{
    "status": "ok",
    "user": {
        "id": 42,
        "username": "novak.jan",
        "jmeno": "Jan",
        "prijmeni": "Novák",
        "titul_pred": "Ing.",
        "titul_za": "Ph.D.",
        "email": "jan.novak@example.com",
        "telefon": "+420 123 456 789",
        "aktivni": 1,
        "usek_id": 5,
        "usek_nazev": "IT oddělení",
        "lokalita_id": 2,
        "lokalita_nazev": "Praha",
        "pozice_id": 3,
        "pozice_nazev": "Vývojář",
        "organizace_id": 1,
        "organizace_nazev": "Hlavní organizace",
        "dt_vytvoreni": "2025-01-15 10:30:15",
        "dt_aktualizace": "2025-01-15 14:20:30",
        "roles": [
            {"id": 1, "nazev": "Admin", "popis": "Administrátor systému"},
            {"id": 3, "nazev": "Editor", "popis": "Editor obsahu"}
        ],
        "direct_rights": [
            {"id": 10, "nazev": "USER_CREATE", "popis": "Vytváření uživatelů"},
            {"id": 15, "nazev": "USER_EDIT", "popis": "Editace uživatelů"}
        ]
    }
}
```

---

## Obecné informace

### Autentifikace
Všechny endpointy vyžadují platný `token` a `username`. Token se ověřuje pomocí funkce `verify_token()`.

### Error kódy
- `UNAUTHORIZED` (401) - Neplatný nebo chybějící token
- `VALIDATION_ERROR` (400) - Chyba validace vstupních dat
- `RELATION_ERROR` (400) - Neplatné foreign key reference
- `DUPLICATE_ERROR` (409) - Porušení unique constraints
- `NOT_FOUND` (404) - Záznam nenalezen
- `MISSING_ID` (400) - Chybějící povinné ID
- `MISSING_PASSWORD` (400) - Chybějící heslo při vytváření
- `SERVER_ERROR` (500) - Interní chyba serveru

### Validace
- **Username:** min. 3 znaky, pouze `[a-zA-Z0-9._-]`
- **Password:** min. 6 znaků (pouze při vytváření/změně hesla)
- **Email:** validní formát emailu (volitelný)
- **Foreign Keys:** kladná čísla nebo null, existence se ověřuje v DB

### Databázové transakce
Všechny CRUD operace používají databázové transakce pro zajištění konzistence dat.

### Role a práva
- **Role:** Přiřazují se do tabulky `role_uzivatele` (many-to-many)
- **Přímá práva:** Přiřazují se do tabulky `prava_uzivatele` (many-to-many)
- Při update/create se všechny stávající vazby smažou a vytvoří se nové

### Odkazy na vnořené tabulky
Systém validuje existenci záznamů v tabulkách:
- `useky` (usek_id)
- `lokality` (lokalita_id) 
- `pozice` (pozice_id)
- `organizace` (organizace_id)

### PHP 5.6 kompatibilita
API je plně kompatibilní s PHP 5.6:
- Použití `array()` syntaxe místo `[]`
- Fallback na `md5()` pokud není dostupný `password_hash()`
- PDO prepared statements pro zabezpečení

---

## 7. Číselníkové endpointy pro FE selecty

Pro vytváření a editaci uživatelů potřebuje FE načítat data pro select boxy. Všechny číselníkové endpointy vyžadují autentifikaci.

### Lokality

**Endpoint:** `POST lokality/list`

**Request:**
```json
{
    "username": "admin",
    "token": "valid_auth_token"
}
```

**Response:**
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "nazev": "Praha - Hlavní budova",
            "adresa": "Václavské náměstí 1, Praha 1",
            "aktivni": 1
        },
        {
            "id": 2,
            "nazev": "Brno - Pobočka",
            "adresa": "Masarykova 50, Brno",
            "aktivni": 1
        }
    ]
}
```

**Detail lokality:** `POST lokality/detail`
```json
{
    "username": "admin",
    "token": "valid_auth_token",
    "id": 1
}
```

### Pozice

**Endpoint:** `POST pozice/list`

**Response:**
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "nazev_pozice": "Systémový administrátor",
            "popis": "Správa IT infrastruktury",
            "usek_id": 1,
            "parent_id": null,
            "aktivni": 1
        },
        {
            "id": 2,
            "nazev_pozice": "Právník",
            "popis": "Zpracování smluv a právních dokumentů",
            "usek_id": 2,
            "parent_id": null,
            "aktivni": 1
        }
    ]
}
```

### Organizace

**Endpoint:** `POST organizace/list`

**Response:**
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "nazev": "Hlavní organizace s.r.o.",
            "ico": "12345678",
            "dic": "CZ12345678"
        }
    ]
}
```

### Role

**Endpoint:** `POST role/list`

**Response:**
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "nazev_role": "Administrátor",
            "popis": "Plná správa systému"
        },
        {
            "id": 2,
            "nazev_role": "Editor",
            "popis": "Editace obsahu"
        },
        {
            "id": 3,
            "nazev_role": "Právník",
            "popis": "Práce s právními dokumenty"
        }
    ]
}
```

**Detail role včetně práv:** `POST role/detail`

**Request:**
```json
{
    "username": "admin",
    "token": "valid_auth_token",
    "id": 1
}
```

**Response:**
```json
{
    "status": "ok",
    "data": {
        "id": 1,
        "nazev_role": "Administrátor",
        "popis": "Plná správa systému",
        "aktivni": 1,
        "prava": [
            {
                "id": 1,
                "kod_prava": "USER_CREATE",
                "popis": "Vytváření uživatelů"
            },
            {
                "id": 2,
                "kod_prava": "USER_EDIT",
                "popis": "Editace uživatelů"
            },
            {
                "id": 3,
                "kod_prava": "USER_DELETE",
                "popis": "Mazání uživatelů"
            }
        ]
    }
}
```

### Práva

**Endpoint:** `POST prava/list`

**Response:**
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "kod_prava": "USER_CREATE",
            "popis": "Vytváření uživatelů"
        },
        {
            "id": 2,
            "kod_prava": "USER_EDIT",
            "popis": "Editace uživatelů"
        },
        {
            "id": 3,
            "kod_prava": "USER_DELETE",
            "popis": "Mazání uživatelů"
        },
        {
            "id": 10,
            "kod_prava": "ORDER_CREATE",
            "popis": "Vytváření objednávek"
        },
        {
            "id": 15,
            "kod_prava": "CONTRACT_EDIT",
            "popis": "Editace smluv"
        }
    ]
}
```

### Útvary (již existuje)

**Endpoint:** `POST useky/list`

**Response:**
```json
{
    "status": "ok",
    "data": [
        {
            "id": 1,
            "usek_zkr": "IT",
            "usek_nazev": "IT oddělení"
        },
        {
            "id": 2,
            "usek_zkr": "PRAVNI",
            "usek_nazev": "Právní oddělení"
        },
        {
            "id": 3,
            "usek_zkr": "FIN",
            "usek_nazev": "Finanční oddělení"
        }
    ]
}
```

---

## Příklady pro React FE

### React hook pro User Management API
### React hook pro User Management API
```javascript
// hooks/useUserManagement.js
import { useState, useCallback } from 'react';

const API_BASE_URL = '/api.eeo';

export const useUserManagement = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const apiCall = useCallback(async (endpoint, data) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.status === 'error') {
                throw new Error(result.message || 'API error');
            }
            
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createUser = useCallback(async (userData) => {
        return await apiCall('users/create', userData);
    }, [apiCall]);

    const updateUser = useCallback(async (userId, userData) => {
        return await apiCall('users/update', { id: userId, ...userData });
    }, [apiCall]);

    const partialUpdateUser = useCallback(async (userId, userData) => {
        return await apiCall('users/partial-update', { id: userId, ...userData });
    }, [apiCall]);

    const deactivateUser = useCallback(async (userId, username, token) => {
        return await apiCall('users/deactivate', { id: userId, username, token });
    }, [apiCall]);

    const getUsersList = useCallback(async (filters = {}) => {
        return await apiCall('users/list', filters);
    }, [apiCall]);

    const getUserDetail = useCallback(async (targetUsername, username, token) => {
        return await apiCall('user/detail', { target_username: targetUsername, username, token });
    }, [apiCall]);

    return {
        loading,
        error,
        createUser,
        updateUser,
        partialUpdateUser,
        deactivateUser,
        getUsersList,
        getUserDetail
    };
};
```

### React komponenta pro vytvoření uživatele
```javascript
// components/CreateUserForm.js
import React, { useState } from 'react';
import { useUserManagement } from '../hooks/useUserManagement';

export const CreateUserForm = ({ currentUser, onSuccess, onCancel }) => {
    const { createUser, loading, error } = useUserManagement();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        jmeno: '',
        prijmeni: '',
        titul_pred: '',
        titul_za: '',
        email: '',
        telefon: '',
        usek_id: null,
        lokalita_id: null,
        pozice_id: null,
        organizace_id: null,
        aktivni: 1,
        roles: [],
        direct_rights: []
    });

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? parseInt(value) : null) : value
        }));
    };

    const handleArrayChange = (name, values) => {
        setFormData(prev => ({
            ...prev,
            [name]: values
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const userData = {
                ...formData,
                username: currentUser.username,
                token: currentUser.token
            };
            
            const result = await createUser(userData);
            
            if (result.status === 'ok') {
                alert(`Uživatel ${result.data.username} byl úspěšně vytvořen`);
                onSuccess && onSuccess(result.data);
            }
        } catch (err) {
            console.error('Chyba při vytváření uživatele:', err);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Username (povinný):</label>
                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9._-]+"
                />
            </div>
            
            <div>
                <label>Heslo (povinný):</label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                />
            </div>
            
            <div>
                <label>Jméno (povinný):</label>
                <input
                    type="text"
                    name="jmeno"
                    value={formData.jmeno}
                    onChange={handleChange}
                    required
                />
            </div>
            
            <div>
                <label>Příjmení (povinný):</label>
                <input
                    type="text"
                    name="prijmeni"
                    value={formData.prijmeni}
                    onChange={handleChange}
                    required
                />
            </div>
            
            <div>
                <label>Email:</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                />
            </div>
            
            <div>
                <label>Telefon:</label>
                <input
                    type="text"
                    name="telefon"
                    value={formData.telefon}
                    onChange={handleChange}
                />
            </div>
            
            <div>
                <label>Aktivní:</label>
                <select
                    name="aktivni"
                    value={formData.aktivni}
                    onChange={handleChange}
                >
                    <option value={1}>Ano</option>
                    <option value={0}>Ne</option>
                </select>
            </div>

            {error && <div style={{color: 'red'}}>Chyba: {error}</div>}
            
            <div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Vytváření...' : 'Vytvořit uživatele'}
                </button>
                <button type="button" onClick={onCancel}>
                    Zrušit
                </button>
            </div>
        </form>
    );
};
```

### React komponenta pro seznam uživatelů
```javascript
// components/UsersList.js
import React, { useState, useEffect } from 'react';
import { useUserManagement } from '../hooks/useUserManagement';

export const UsersList = ({ currentUser }) => {
    const { getUsersList, deactivateUser, loading, error } = useUserManagement();
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        usek_id: null,
        aktivni: 1,
        limit: 50,
        offset: 0
    });

    useEffect(() => {
        loadUsers();
    }, [filters]);

    const loadUsers = async () => {
        try {
            const result = await getUsersList({
                ...filters,
                username: currentUser.username,
                token: currentUser.token
            });
            
            if (result.status === 'ok') {
                setUsers(result.users || []);
            }
        } catch (err) {
            console.error('Chyba při načítání uživatelů:', err);
        }
    };

    const handleDeactivate = async (user) => {
        if (!confirm(`Opravdu chcete deaktivovat uživatele ${user.username}?`)) {
            return;
        }
        
        try {
            const result = await deactivateUser(user.id, currentUser.username, currentUser.token);
            
            if (result.status === 'ok') {
                alert(`Uživatel ${user.username} byl deaktivován`);
                loadUsers(); // Reload list
            }
        } catch (err) {
            console.error('Chyba při deaktivaci:', err);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value === '' ? null : value,
            offset: 0 // Reset pagination
        }));
    };

    return (
        <div>
            <h2>Seznam uživatelů</h2>
            
            {/* Filtry */}
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    name="search"
                    placeholder="Hledat..."
                    value={filters.search}
                    onChange={handleFilterChange}
                />
                
                <select
                    name="aktivni"
                    value={filters.aktivni || ''}
                    onChange={handleFilterChange}
                >
                    <option value="">Všichni</option>
                    <option value={1}>Aktivní</option>
                    <option value={0}>Neaktivní</option>
                </select>
            </div>

            {error && <div style={{color: 'red'}}>Chyba: {error}</div>}
            
            {loading ? (
                <div>Načítání...</div>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Jméno</th>
                            <th>Email</th>
                            <th>Útvar</th>
                            <th>Aktivní</th>
                            <th>Role</th>
                            <th>Akce</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>
                                    {user.titul_pred && `${user.titul_pred} `}
                                    {user.jmeno} {user.prijmeni}
                                    {user.titul_za && ` ${user.titul_za}`}
                                </td>
                                <td>{user.email || '-'}</td>
                                <td>{user.usek_nazev || '-'}</td>
                                <td>{user.aktivni ? 'Ano' : 'Ne'}</td>
                                <td>
                                    {user.roles.map(role => role.nazev).join(', ')}
                                </td>
                                <td>
                                    {user.aktivni && (
                                        <button
                                            onClick={() => handleDeactivate(user)}
                                            style={{ color: 'red' }}
                                        >
                                            Deaktivovat
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};
```

### Error handling utility
```javascript
// utils/apiErrorHandler.js
export const handleApiError = (error, fallbackMessage = 'Došlo k chybě') => {
    if (error.code) {
        switch (error.code) {
            case 'VALIDATION_ERROR':
                return `Chyba validace: ${error.message}`;
            case 'DUPLICATE_ERROR':
                return `Duplicitní data: ${error.message}`;
            case 'UNAUTHORIZED':
                return 'Nejste autorizováni k této operaci';
            case 'NOT_FOUND':
                return 'Požadovaný záznam nebyl nalezen';
            case 'RELATION_ERROR':
                return `Chyba vazeb: ${error.message}`;
            case 'SERVER_ERROR':
                return 'Chyba serveru, zkuste to později';
            default:
                return error.message || fallbackMessage;
        }
    }
    
    return error.message || fallbackMessage;
};

// Usage in component:
// import { handleApiError } from '../utils/apiErrorHandler';
// 
// catch (err) {
//     const errorMessage = handleApiError(err);
//     setError(errorMessage);
// }
```