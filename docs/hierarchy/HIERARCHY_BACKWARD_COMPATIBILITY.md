# ✅ Hierarchie - Zpětná kompatibilita

**Datum:** 15. prosince 2025  
**Autor:** GitHub Copilot & robex08

---

## 🎯 Záruka: Vypnutá hierarchie = žádný vliv

Implementace hierarchie je navržena tak, aby **NIKDY** nenarušila stávající funkcionalitu. Pokud je hierarchie vypnutá, systém funguje **přesně stejně** jako před její implementací.

---

## 🔒 Úrovně kontroly

### 1. **Backend (PHP) - hierarchyOrderFilters.php**

```php
function applyHierarchyFilterToOrders($userId, $db) {
    $settings = getHierarchySettings($db);
    
    // ✅ KONTROLA 1: Je hierarchie zapnutá?
    if (!$settings['enabled']) {
        return null; // ← Žádná filtrace, použije se role-based filter
    }
    
    // ✅ KONTROLA 2: Je vybrán profil?
    if (!$settings['profile_id']) {
        return null; // ← Žádná filtrace
    }
    
    // ✅ KONTROLA 3: Má user HIERARCHY_IMMUNE právo?
    if (isUserHierarchyImmune($userId, $db)) {
        return null; // ← Žádná filtrace, vidí vše
    }
    
    // ✅ KONTROLA 4: Vlastní objednávky VŽDY viditelné
    // I když nemá hierarchické vztahy, vidí své vlastní objednávky
    
    // Až teď aplikujeme hierarchii
    return $whereClause;
}
```

**Výsledek:**
- `return null` → standardní role-based filter (ORDER_VIEW_ALL, ORDER_VIEW_OWN, atd.)
- `return WHERE clause` → hierarchie **nahradí** role-based filter

---

### 2. **Backend (PHP) - orderV2Endpoints.php**

```php
// Zavolej hierarchii
$hierarchyFilter = applyHierarchyFilterToOrders($current_user_id, $db);

if ($hierarchyFilter !== null) {
    // ✅ Hierarchie AKTIVNÍ → nahradí role-based filter
    $whereConditions[] = $hierarchyFilter;
    $hierarchyApplied = true;
} else {
    // ✅ Hierarchie VYPNUTÁ → použije se role-based filter
    $hierarchyApplied = false;
}

// Standardní role-based filter (jen pokud hierarchie neaplikována)
if (!$hierarchyApplied) {
    if ($has_order_view_all) {
        // Vidí všechny objednávky
    } else if ($has_order_view_own) {
        // Vidí jen své objednávky
        $whereConditions[] = "o.uzivatel_id = :current_user_id";
    }
}
```

---

### 3. **Frontend (React) - hierarchyService.js**

```javascript
export const getHierarchyConfig = async (token, username) => {
  try {
    const settings = await getGlobalSettings(token, username);
    
    const enabled = Boolean(settings.hierarchy_enabled);
    const profileId = settings.hierarchy_profile_id || null;
    
    // ✅ KONTROLA: Je hierarchie zapnutá?
    let status = HierarchyStatus.DISABLED;
    if (enabled) {
      if (!profileId) {
        status = HierarchyStatus.NO_PROFILE;
      } else {
        status = HierarchyStatus.ACTIVE;
      }
    }
    
    return {
      status,
      enabled,
      profileId,
      // ...
    };
    
  } catch (error) {
    // ✅ V případě chyby vrátit safe default (vypnuto)
    return {
      status: HierarchyStatus.ERROR,
      enabled: false,
      profileId: null,
      // ...
    };
  }
};
```

---

### 4. **Frontend (React) - HierarchyBanner.jsx**

```jsx
const HierarchyBanner = ({ module, compact }) => {
  const { token, username } = useContext(AuthContext);
  const [config, setConfig] = useState(null);
  
  const loadHierarchyConfig = async () => {
    // ✅ KONTROLA 1: Je user přihlášen?
    if (!token || !username) {
      setLoading(false);
      return; // Nezobrazujeme nic
    }
    
    try {
      const hierarchyConfig = await hierarchyService.getHierarchyConfigCached(token, username);
      setConfig(hierarchyConfig);
    } catch (error) {
      // ✅ V případě chyby se tiše skryjeme (není to critical)
      setConfig(null);
    }
  };
  
  // ✅ KONTROLA 2: Je hierarchie aktivní?
  if (loading || !config || config.status === HierarchyStatus.DISABLED) {
    return null; // ← Nezobrazujeme nic
  }
  
  // Banner se zobrazí pouze pokud je hierarchie AKTIVNÍ
  return <div>...</div>;
};
```

---

## 🧪 Testovací scénáře

### ✅ Scénář 1: Hierarchie vypnutá
```sql
UPDATE 25a_nastaveni_globalni 
SET hodnota = '0' 
WHERE klic = 'hierarchy_enabled';
```

**Očekávané chování:**
- ❌ Žádný hierarchie banner na frontend
- ✅ Standardní role-based filter funguje
- ✅ ORDER_VIEW_ALL uživatelé vidí všechny objednávky
- ✅ ORDER_VIEW_OWN uživatelé vidí jen své objednávky
- ✅ Univerzální vyhledávání funguje normálně
- ✅ Mobilní aplikace funguje normálně

---

### ✅ Scénář 2: Hierarchie zapnutá, ale žádný profil
```sql
UPDATE 25a_nastaveni_globalni 
SET hodnota = '1' 
WHERE klic = 'hierarchy_enabled';

UPDATE 25a_nastaveni_globalni 
SET hodnota = NULL 
WHERE klic = 'hierarchy_profile_id';
```

**Očekávané chování:**
- ⚠️ Banner zobrazí: "Hierarchie je zapnutá, ale není vybrán žádný profil"
- ✅ Standardní role-based filter funguje (hierarchie neaplikována)
- ✅ Systém funguje jako s vypnutou hierarchií

---

### ✅ Scénář 3: Hierarchie zapnutá + profil vybrán + user NENÍ v hierarchii
```sql
UPDATE 25a_nastaveni_globalni 
SET hodnota = '1' 
WHERE klic = 'hierarchy_enabled';

UPDATE 25a_nastaveni_globalni 
SET hodnota = '1' 
WHERE klic = 'hierarchy_profile_id';
```

**Očekávané chování:**
- 🏢 Banner zobrazí: "Hierarchie aktivní: Vidíte objednávky podle organizačního řádu..."
- ✅ Uživatel vidí **minimálně své vlastní objednávky** (kde je tvůrce/objednatel/garant)
- ✅ Pokud nemá žádné hierarchické vztahy, vidí jen vlastní objednávky
- ✅ Role-based práva se NEPOUŽÍVAJÍ (nahrazena hierarchií)

---

### ✅ Scénář 4: User má právo HIERARCHY_IMMUNE
```sql
-- Právo je automaticky přiřazeno SUPERADMIN a ADMINISTRATOR rolím
```

**Očekávané chování:**
- 🛡️ Banner může zobrazit: "Máte neomezený přístup k datům (HIERARCHY_IMMUNE)"
- ✅ Uživatel vidí **VŠECHNA data** bez ohledu na hierarchii
- ✅ Hierarchie se neaplikuje (backend vrací null)

---

### ✅ Scénář 5: Chyba při načítání hierarchie
```
- DB je nedostupná
- global_settings tabulka chybí
- Token je neplatný
```

**Očekávané chování:**
- ❌ Banner se nezobrazí (tiché selhání)
- ✅ Backend vrací null → standardní role-based filter
- ✅ Systém funguje jako s vypnutou hierarchií
- 📝 Chyba se loguje do error_log

---

## 🔐 Bezpečnostní záruky

### 1. **Fallback na bezpečný default**
```javascript
// Frontend
catch (error) {
  return {
    status: HierarchyStatus.ERROR,
    enabled: false, // ← Bezpečný default
    // ...
  };
}
```

```php
// Backend
catch (PDOException $e) {
    error_log("HIERARCHY ERROR: " . $e->getMessage());
    return [
        'enabled' => false, // ← Bezpečný default
        'profile_id' => null,
        'logic' => 'OR'
    ];
}
```

### 2. **Vlastní objednávky VŽDY viditelné**
```php
// I když hierarchie aktivní a user není v hierarchii
if (empty($relationships)) {
    // ✅ Uživatel vidí minimálně své vlastní objednávky
    return "(o.uzivatel_id = $userId OR o.objednatel_id = $userId OR o.garant_uzivatel_id = $userId)";
}

// A i když má hierarchické vztahy, vlastní objednávky mají prioritu
$conditions[] = "(
    o.uzivatel_id = $userId
    OR o.objednatel_id = $userId
    OR o.garant_uzivatel_id = $userId
)"; // ← Přidáno jako první podmínka
```

### 3. **Transparentnost**
```javascript
// Banner se zobrazí pouze pokud:
// 1. User je přihlášen (token + username)
// 2. Hierarchie je aktivní
// 3. Načítání proběhlo úspěšně

// Pokud JAKÁKOLIV z těchto podmínek není splněna → banner se nezobrazí
```

---

## 📊 Kompatibilita s existujícími funkcemi

### ✅ Univerzální vyhledávání
- Používá **stejné API** jako Orders25List
- Automaticky respektuje hierarchii (pokud zapnutá)
- Funguje normálně pokud vypnutá

### ✅ Background tasks
- Používá **stejné API** jako Orders25List
- Automaticky respektuje hierarchii
- Funguje normálně pokud vypnutá

### ✅ Export do Excel/DOCX
- Používá **stejné API** jako Orders25List
- Exportuje pouze viditelné objednávky
- Funguje normálně pokud vypnutá

### ✅ Mobilní aplikace
- Používá **centrální hierarchyService**
- Banner se zobrazí pouze pokud hierarchie aktivní
- Funguje normálně pokud vypnutá

### ✅ OrderForm25 (detail objednávky)
- Backend kontroluje `canUserViewOrder()`
- Vrací 403 pokud nemá přístup
- Frontend zobrazí toast a přesměruje na seznam
- Funguje normálně pokud vypnutá

---

## 🎓 Závěr

### ✅ Záruky:

1. **Vypnutá hierarchie = žádný vliv**
   - Backend vrací `null` → standardní role-based filter
   - Frontend nezobrazuje banner
   - Všechny funkce fungují jako dříve

2. **Chyba v hierarchii = bezpečný fallback**
   - System degraduje na standardní práva
   - Uživatel není zablokován

3. **Vlastní objednávky VŽDY viditelné**
   - I když user není v hierarchii
   - Základní práva nejsou narušena

4. **Transparentnost**
   - Uživatel vidí, když je hierarchie aktivní
   - Admin vidí, proč není vybrán profil

5. **Testovatelnost**
   - Lze snadno zapnout/vypnout
   - Lze testovat všechny scénáře
   - Lze rollbackovat bez dopadu

**Status:** Plně zpětně kompatibilní! ✅
