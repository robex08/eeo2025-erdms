# CHANGELOG: Frontend - Filtr smluv pro OrderForm25 (pouzit_v_obj_formu)

**Datum:** 2025-12-30  
**Autor:** AI Assistant  
**Verze:** v2025.03_25  
**Typ změny:** Enhancement - Frontend

---

## 📋 Shrnutí

Implementována frontendová podpora pro filtrování smluv v OrderForm25 podle příznaku `pouzit_v_obj_formu = 1`. Autocomplete pole pro typ smlouvy nyní zobrazuje pouze smlouvy označené jako použitelné v objednávkovém formuláři.

---

## 🎯 Důvod změny

Návaznost na backendový filtr implementovaný v `smlouvyHandlers.php`. Uživatel požadoval, aby:
> "Potřebuji na OrderForm25 typ smlouva, při našeptávání donutil nás našeptávat hledat jen v smlouvy které mají sloupec v DB `pouzit_v_obj_formu = 1`"

Backend byl připraven, nyní frontend posílá potřebný parametr.

---

## 🔧 Technické změny

### 1. **apiSmlouvy.js** - Rozšíření API funkce

**Soubor:** `/apps/eeo-v2/client/src/services/apiSmlouvy.js`

#### Přidán parametr `pouzit_v_obj_formu`

```javascript
export async function getSmlouvyList({
  token,
  username,
  show_inactive = false,
  usek_id = null,
  druh_smlouvy = null,
  stav = null,
  search = null,
  platnost_od = null,
  platnost_do = null,
  limit = 1000,
  offset = 0,
  pouzit_v_obj_formu = null  // 🆕 NOVÝ PARAMETR
}) {
  try {
    const payload = {
      username,
      token,
      show_inactive,
      usek_id,
      druh_smlouvy,
      stav,
      search,
      platnost_od,
      platnost_do,
      limit,
      offset,
      pouzit_v_obj_formu  // 🆕 PŘIDÁNO DO PAYLOAD
    };

    const response = await api.post('ciselniky/smlouvy/list', payload);
```

**Význam:**
- Parametr je volitelný (`null` jako default)
- Pokud je nastaven na `true`, backend vrátí pouze smlouvy s `pouzit_v_obj_formu = 1`
- Pokud je `null` nebo `false`, filtr se nepoužije

---

### 2. **OrderForm25.js** - Použití filtru v autocomplete

**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`

#### Místo 1: Řádek ~5473 (Load smlouvy pro validaci)

```javascript
const response = await getSmlouvyList({
  token,
  username,
  show_inactive: false,
  limit: 500,
  pouzit_v_obj_formu: true  // 🆕 FILTROVAT POUZE POUŽITELNÉ V OBJ. FORMULÁŘI
});
```

#### Místo 2: Řádek ~12500 (Load smlouvy pro autocomplete list)

```javascript
const response = await getSmlouvyList({
  token,
  username,
  show_inactive: false,
  limit: 500,
  pouzit_v_obj_formu: true  // 🆕 FILTROVAT POUZE POUŽITELNÉ V OBJ. FORMULÁŘI
});
```

**Kontext použití:**
- **První volání:** Načítá smlouvy pro validaci při změně čísla smlouvy
- **Druhé volání:** Načítá seznam smluv pro autocomplete dropdown

Obě místa **musí** používat stejný filtr, aby uživatel viděl konzistentní seznam.

---

## 📊 Dopad změny

### ✅ Pozitivní efekty

1. **Redukce šumu v autocomplete**
   - Uživatel vidí pouze relevantní smlouvy
   - Menší seznam = rychlejší výběr

2. **Konzistence s backend logikou**
   - Backend filtruje v SQL: `WHERE s.pouzit_v_obj_formu = 1`
   - Frontend posílá: `pouzit_v_obj_formu: true`

3. **Žádný breaking change**
   - Parametr je volitelný
   - Jiné části systému mohou volat `getSmlouvyList` bez tohoto parametru

### 🔍 Testování

**Scénář 1: OrderForm25 autocomplete**
```
1. Otevřít OrderForm25
2. Začít psát do pole "Smlouva"
3. ✅ Měly by se zobrazit POUZE smlouvy s pouzit_v_obj_formu = 1
```

**Scénář 2: Validace čísla smlouvy**
```
1. V OrderForm25 zadat číslo smlouvy ručně
2. ✅ Systém by měl validovat proti filtrovanému seznamu
```

**Scénář 3: Správa smluv (není ovlivněna)**
```
1. Otevřít číselník smluv (mimo OrderForm25)
2. ✅ Měly by se zobrazit VŠECHNY smlouvy (filtr se nepoužívá)
```

---

## 🔗 Souvislosti

### Backend implementace
- **Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php`
- **Funkce:** `handle_ciselniky_smlouvy_list()`
- **Řádky:** ~352-357

```php
// Filter: pouzit_v_obj_formu (pro OrderForm25 autocomplete)
if (isset($input['pouzit_v_obj_formu']) && $input['pouzit_v_obj_formu']) {
    $where[] = 's.pouzit_v_obj_formu = 1';
}
```

### Databáze
- **Tabulka:** `25_smlouvy`
- **Sloupec:** `pouzit_v_obj_formu` TINYINT(1) DEFAULT 0
- **Index:** `idx_pouzit_obj_form` pro rychlé filtrování

---

## 📦 Deployment

### Build frontend
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
```

### Kontrola buildu
```bash
# Zkontrolovat, že build proběhl bez chyb
ls -lh /var/www/erdms-dev/apps/eeo-v2/client/build/static/js/
```

### Reload aplikace
- Obnovit stránku v prohlížeči (Ctrl+F5)
- Vyzkoušet autocomplete v OrderForm25

---

## 🐛 Možné problémy

### 1. Autocomplete vrací prázdný seznam
**Příčina:** Žádná smlouva nemá `pouzit_v_obj_formu = 1`  
**Řešení:**
```sql
-- Zkontrolovat počet použitelných smluv
SELECT COUNT(*) FROM 25_smlouvy WHERE pouzit_v_obj_formu = 1;

-- Nastavit smlouvu jako použitelnou
UPDATE 25_smlouvy SET pouzit_v_obj_formu = 1 WHERE id = 123;
```

### 2. Frontend stále zobrazuje všechny smlouvy
**Příčina:** Cache prohlížeče  
**Řešení:**
- Hard reload (Ctrl+Shift+R nebo Ctrl+F5)
- Zkontrolovat Network tab v DevTools, že se posílá `pouzit_v_obj_formu: true`

### 3. Backend ignoruje parametr
**Příčina:** Nesprávná verze backendu  
**Řešení:**
- Zkontrolovat, že používáte verzi `v2025.03_25`
- Zkontrolovat soubor `smlouvyHandlers.php` řádky ~352

---

## ✅ Verification Checklist

- [x] Parametr přidán do `apiSmlouvy.js`
- [x] Parametr použit v obou voláních v `OrderForm25.js`
- [x] JavaScript syntax OK (0 errors)
- [x] Dokumentace vytvořena
- [ ] Frontend build proveden
- [ ] Manuální test v prohlížeči
- [ ] Kontrola Network tab (posílá se správný payload)

---

## 📝 Poznámky

- Změna je **zpětně kompatibilní** - parametr je volitelný
- Jiné části systému (např. správa smluv) nejsou ovlivněny
- Filtr je aktivní **pouze v OrderForm25**
- Frontend posílá `true`, backend kontroluje `== 1` v MySQL

---

**Status:** ✅ READY FOR BUILD & TEST  
**Next step:** Build frontend a otestovat autocomplete v OrderForm25
