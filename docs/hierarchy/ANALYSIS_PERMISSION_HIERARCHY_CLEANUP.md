# 🔍 ANALÝZA: Permission Hierarchy & Code Cleanup

**Datum:** 18. prosince 2025  
**Autor:** GitHub Copilot & robex08  
**Účel:** Analýza systému hierarchických práv a identifikace legacy kódu k odstranění

---

## 📋 1. PERMISSION HIERARCHY SYSTÉM

### ✅ AKTUÁLNÍ POLITIKA (v souladu s organizační hierarchií)

**Princip:**
- Hierarchie **ROZŠIŘUJE** existující práva (OWN → ALL)
- Hierarchie **POSILUJE** existující práva (READ → EDIT)
- Hierarchie **NEVYTVÁŘÍ** práva z ničeho

**Platné upgrade chains:**

```
READ_OWN → READ_ALL → EDIT_ALL → DELETE_ALL
   ↓           ↓
EDIT_OWN → DELETE_OWN
```

### ❌ CO JSME ODSTRANILI (18.12.2025)

**Problematické upgrady:**
```javascript
// ❌ NESPRÁVNĚ (odstraněno)
ORDER_DELETE_OWN → ORDER_MANAGE  // Admin právo nesmí být z hierarchie
ORDER_DELETE_ALL → ORDER_MANAGE  // Admin právo nesmí být z hierarchie
ORDER_APPROVE → ORDER_MANAGE     // Admin právo nesmí být z hierarchie
```

**Důvod odstranění:**
- `ORDER_MANAGE` je **administrativní právo**
- Nesmí být automaticky přidáváno hierarchií
- Musí být přiřazeno **přímo z role** v databázi
- Uživatel s právem `ORDER_DELETE_OWN` získával `ORDER_MANAGE` → mohl schvalovat objednávky bez oprávnění

---

## 🎯 2. DOPORUČENÉ UPGRADY (v souladu s politikou)

### ✅ OBJEDNÁVKY (Orders) - AKTUÁLNÍ STAV

```javascript
// READ chain
ORDER_READ_OWN: {
  expand: 'ORDER_READ_ALL',      // ✅ OK - vidí podřízené
  upgrade: 'ORDER_EDIT_OWN'      // ✅ OK - může editovat svoje
}

ORDER_READ_ALL: {
  expand: null,                  // ✅ OK - už je ALL
  upgrade: 'ORDER_EDIT_ALL'      // ✅ OK - může editovat všechny
}

// EDIT chain
ORDER_EDIT_OWN: {
  expand: 'ORDER_EDIT_ALL',      // ✅ OK - může editovat podřízené
  upgrade: 'ORDER_DELETE_OWN'    // ✅ OK - může mazat svoje
}

ORDER_EDIT_ALL: {
  expand: null,                  // ✅ OK - už je ALL
  upgrade: 'ORDER_DELETE_ALL'    // ✅ OK - může mazat všechny
}

// DELETE chain
ORDER_DELETE_OWN: {
  expand: 'ORDER_DELETE_ALL',    // ✅ OK - může mazat podřízené
  upgrade: null                  // ✅ OPRAVENO - nesmí na MANAGE
}

ORDER_DELETE_ALL: {
  expand: null,                  // ✅ OK - už je ALL
  upgrade: null                  // ✅ OPRAVENO - nesmí na MANAGE
}

// CREATE
ORDER_CREATE: {
  expand: null,                  // ✅ OK - CREATE je globální
  upgrade: 'ORDER_EDIT_OWN'      // ⚠️ DISKUTABILNÍ - možná odstranit?
}

// APPROVE
ORDER_APPROVE: {
  expand: null,                  // ✅ OK - APPROVE je globální
  upgrade: null                  // ✅ OPRAVENO - nesmí na MANAGE
}
```

### ⚠️ DISKUTABILNÍ UPGRADE

**ORDER_CREATE → ORDER_EDIT_OWN**
```javascript
ORDER_CREATE: {
  expand: null,
  upgrade: 'ORDER_EDIT_OWN'      // ⚠️ Je toto potřeba?
}
```

**Otázky:**
1. Má uživatel s právem `ORDER_CREATE` automaticky získat i `ORDER_EDIT_OWN`?
2. Nebo by měl mít pouze právo vytvořit objednávku, ale ne editovat?
3. **Doporučení:** Odstranit tento upgrade - CREATE ≠ EDIT

**Návrh opravy:**
```javascript
ORDER_CREATE: {
  expand: null,                  // CREATE je globální
  upgrade: null                  // ✅ CREATE nedává právo editovat
}
```

---

## 🗑️ 3. LEGACY KÓD K ODSTRANĚNÍ

### A. DEPRECATED PERMISSIONS (starý systém)

#### 🔍 Nalezené v databázi/kódu:

```sql
-- ❌ Stará práva (deprecated)
ORDER_2025        -- Pravděpodobně přechodné právo z migrace
ORDER_OLD         -- Odkaz na starý systém objednávek
CASH_BOOK_*       -- Pokladna - není implementována v hierarchii
```

**Akce:**
1. ✅ **ORDER_2025** - Zkontrolovat v DB, zda se používá
   - Pokud ano, přejmenovat na `ORDER_ACCESS_2025_SYSTEM`
   - Pokud ne, odstranit z role assignments

2. ✅ **ORDER_OLD** - Zkontrolovat, zda ještě potřebujeme přístup ke starým objednávkám
   - Pokud ano, nechat
   - Pokud ne, odstranit

3. ⚠️ **CASH_BOOK_*** - Pokladna ještě není aktivní
   - Nechat prepared v `permissionHierarchyService.js`
   - Až bude aktivní, implementovat plně

### B. DEPRECATED NOTIFICATION SCOPE FILTERS

**Soubor:** `notificationHandlers.php`

```php
// ❌ DEPRECATED od 17.12.2025
case 'ENTITY_PARTICIPANTS':
    // @deprecated Bude odstraněno v příští verzi
    // ⚠️ DEPRECATED - použít místo toho PARTICIPANTS_ALL
```

**Akce:**
1. ✅ Najít všechny hierarchické profily v DB, které používají `ENTITY_PARTICIPANTS`
2. ✅ Migrovat na `PARTICIPANTS_ALL`
3. ✅ Odstranit celý case blok z `applyScopeFilter()`

**SQL migrace:**
```sql
-- Najít profily s deprecated scope_filter
SELECT 
    id, 
    nazev,
    JSON_EXTRACT(structure_json, '$.edges[*].data.scope_filter') as scope_filters
FROM 25_hierarchie_profily
WHERE structure_json LIKE '%ENTITY_PARTICIPANTS%';

-- Migrovat na PARTICIPANTS_ALL
UPDATE 25_hierarchie_profily
SET structure_json = JSON_REPLACE(
    structure_json,
    '$.edges[*].data.scope_filter',
    'PARTICIPANTS_ALL'
)
WHERE structure_json LIKE '%ENTITY_PARTICIPANTS%';
```

### C. TODOS SUPPORT (nefunkční)

**Soubor:** `notificationHandlers.php`

```php
// ❌ NEIMPLEMENTOVÁNO
case 'todos':
    // TODO: autor + přiřazený uživatel
    $userIds = [
        $db->query("SELECT created_by_user_id FROM " . TABLE_TODOS . " WHERE id = :entity_id"),
        $db->query("SELECT assigned_to_user_id FROM " . TABLE_TODOS . " WHERE id = :entity_id")
    ];
```

**Problém:**
- TODO systém není implementován v hierarchii
- Kód je nefunkční (špatný SQL query format)
- Používá neexistující tabulku `TABLE_TODOS`

**Akce:**
1. ❌ Odstranit celý case 'todos' blok z:
   - `getEntityParticipants()`
   - `getUserIdFromEntity()`
   - `applyScopeFilter()`

2. ✅ Až bude TODO systém implementován, vytvořit nový clean implementation

### D. UNUSED EMAIL NOTIFICATION TODO

**Soubor:** `notificationHandlers.php` řádek 988

```php
// TODO: Implementovat sendNotificationEmail($uzivatel_id, $email_predmet, $email_telo);
```

**Akce:**
1. ✅ Zkontrolovat, zda je emailové odesílání potřeba
2. ✅ Pokud ano, implementovat pomocí stávajícího mail systému
3. ✅ Pokud ne, odstranit TODO

---

## 🧹 4. CLEANUP SCRIPT

**Soubory k vyčištění:**

### Backend PHP:
```bash
# 1. Test skripty (ponechat pro debugging)
/var/www/erdms-dev/test-*.php                    # ✅ PONECHAT
/var/www/erdms-dev/debug-*.php                   # ✅ PONECHAT
/var/www/erdms-dev/fix-*.php                     # ✅ PONECHAT
/var/www/erdms-dev/check-*.php                   # ✅ PONECHAT

# 2. Notifikace - deprecated kód
apps/eeo-v2/api-legacy/.../notificationHandlers.php:
  - Řádek 1733-1744: case 'ENTITY_PARTICIPANTS'  # ❌ ODSTRANIT
  - Řádek 1671-1678: case 'todos'                # ❌ ODSTRANIT
  - Řádek 2043-2044: case 'todos'                # ❌ ODSTRANIT
  - Řádek 988: TODO email                        # ⚠️ IMPLEMENTOVAT nebo ODSTRANIT
```

### Frontend JS:
```bash
# Permission Hierarchy
apps/eeo-v2/client/src/services/permissionHierarchyService.js:
  - Řádek 76: ORDER_CREATE.upgrade               # ⚠️ DISKUTOVAT → ODSTRANIT?
```

### Database:
```sql
-- 1. Deprecated permissions v rolích
SELECT 
    r.nazev_role,
    p.kod_prava
FROM 25_role r
JOIN 25_role_prava rp ON rp.role_id = r.id
JOIN 25_prava p ON p.id = rp.pravo_id
WHERE p.kod_prava IN ('ORDER_2025', 'ORDER_OLD')
ORDER BY r.nazev_role;

-- 2. Deprecated scope_filter v hierarchii
SELECT 
    id,
    nazev,
    structure_json
FROM 25_hierarchie_profily
WHERE structure_json LIKE '%ENTITY_PARTICIPANTS%'
   OR structure_json LIKE '%todos%';
```

---

## 📝 5. AKČNÍ PLÁN

### PRIORITA 1: KRITICKÉ (okamžitě)
- [x] ✅ Odstranit ORDER_MANAGE upgrade z hierarchie ✅ HOTOVO 18.12.2025
- [ ] ❌ Odstranit case 'ENTITY_PARTICIPANTS' z notificationHandlers.php
- [ ] ❌ Migrovat existující profily z ENTITY_PARTICIPANTS → PARTICIPANTS_ALL

### PRIORITA 2: VYSOKÁ (tento týden)
- [ ] ⚠️ Diskutovat ORDER_CREATE → ORDER_EDIT_OWN upgrade
- [ ] ❌ Odstranit case 'todos' bloky z notificationHandlers.php
- [ ] ✅ Implementovat nebo odstranit TODO email notification

### PRIORITA 3: STŘEDNÍ (příští týden)
- [ ] 🔍 Zkontrolovat použití ORDER_2025 a ORDER_OLD práv v DB
- [ ] 📋 Vytvořit migrační skript pro deprecated permissions
- [ ] 🧪 Otestovat hierarchii po cleanupech

### PRIORITA 4: NÍZKÁ (backlog)
- [ ] 📚 Aktualizovat dokumentaci permission hierarchy
- [ ] 🎨 Vyčistit build.backup složku (obsahuje minifikovaný kód)
- [ ] 📊 Audit všech ORDER_* práv v databázi

---

## 🎯 6. ZÁVĚRY

### ✅ CO JE V POŘÁDKU:
1. Permission hierarchy systém je správně navržen
2. Základní upgrade chains jsou logické (READ → EDIT → DELETE)
3. Expand mechanismus funguje správně (OWN → ALL)
4. Admin práva jsou nyní chráněna proti auto-upgrade

### ❌ CO POTŘEBUJE CLEANUP:
1. Deprecated ENTITY_PARTICIPANTS scope filter
2. Nefunkční TODO system bloky
3. Diskutabilní ORDER_CREATE → ORDER_EDIT_OWN upgrade
4. Neimplementovaný email notification TODO
5. Legacy ORDER_2025, ORDER_OLD permissions

### ⚠️ CO VYŽADUJE ROZHODNUTÍ:
1. **ORDER_CREATE upgrade** - má dávat EDIT právo?
2. **ORDER_2025/ORDER_OLD** - ještě potřebujeme?
3. **Email notifications** - implementovat nebo odstranit?
4. **TODO system** - kdy začneme implementovat?

---

## 📞 KONTAKT PRO OTÁZKY

- **Permission systém:** GitHub Copilot, robex08
- **Notifikace:** GitHub Copilot, robex08
- **Organizační hierarchie:** GitHub Copilot, robex08

---

**Poslední update:** 18. prosince 2025 00:24
