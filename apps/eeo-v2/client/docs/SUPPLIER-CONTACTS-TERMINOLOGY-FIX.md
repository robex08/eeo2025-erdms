# OPRAVA SPRÁVY DODAVATELŮ A SJEDNOCENÍ TERMINOLOGIE

**Datum:** 24. října 2025  
**Status:** ✅ HOTOVO

## 🎯 PŘEHLED ZMĚN

Tato dokumentace popisuje opravu chyby při přidávání dodavatelů z ARES a sjednocení terminologie pro typy kontaktů v celé aplikaci.

---

## 🐛 OPRAVA CHYBY - ICO VALIDATION

### Problém
Při pokusu přidat dodavatele z ARES do místní databáze aplikace hlásila chybu:
```
Chyba při přidávání do kontaktů: ICO and nazev are required for supplier creation.
```

### Příčina
V souboru `src/forms/OrderForm25.js` (řádek 8874) byla špatná struktura dat při volání `createSupplier`:
```javascript
// ❌ ŠPATNĚ - API nedokáže zpracovat supplierData objekt
await createSupplier({
  token: token,
  username: username,
  user_id: user_id,
  supplierData: {
    nazev: icoCheckData.nazev,
    ico: icoCheckData.ico,
    // ...
  }
});
```

### Řešení
API očekává parametry `ico` a `nazev` přímo, ne jako vnořený objekt:
```javascript
// ✅ SPRÁVNĚ - parametry přímo v requestu
await createSupplier({
  token: token,
  username: username,
  nazev: icoCheckData.nazev,
  ico: icoCheckData.ico,
  dic: icoCheckData.dic || '',
  adresa: icoCheckData.adresa || '',
  zastoupeny: '',
  kontakt_jmeno: '',
  kontakt_email: '',
  kontakt_telefon: '',
  user_id: user_id,
  usek_zkr: '' // Osobní kontakt = bez úseku
});
```

**Upravený soubor:** `src/forms/OrderForm25.js` (řádky 8867-8895)

---

## 📝 SJEDNOCENÍ TERMINOLOGIE

### Nové standardy pojmenování

Podle požadavků z BE API dokumentace byly sjednoceny pojmy pro typy kontaktů:

| Starý pojem | Nový standardní pojem |
|-------------|----------------------|
| Globální / Global | **Globální kontakt** |
| Osobní / Moje / Můj | **Osobní kontakt** |
| Úsekový / Úseky / Oddělení / Usekovy | **Kontakty úseku** |

### Důvody změn
1. **Konzistence** - Jednotný naming napříč celou aplikací
2. **Přehlednost** - Jasné rozlišení typů kontaktů
3. **BE kompatibilita** - Odpovídá struktuře z backend API

---

## 🔧 UPRAVENÉ SOUBORY

### 1. OrderForm25.js
**Cesta:** `/src/forms/OrderForm25.js`

#### Změny:
- ✅ Oprava volání `createSupplier` (řádky 8867-8895)
- ✅ Debug log: "Úsekový kontakt" → "Kontakty úseku" (řádek 8731)
- ✅ Option label: "Úsekový" → "Kontakty úseku" (řádek 16010)
- ✅ Option label: "Osobní" → "Osobní kontakt" (řádek 16009)
- ✅ Option label: "Globální" → "Globální kontakt" (řádek 16012)
- ✅ Preview šablony: "Globální šablona" → "Globální kontakt" (řádek 16457)

```javascript
// Příklad změny - dropdown pro výběr viditelnosti
<option value="personal">💼 Osobní kontakt (jen já)</option>
<option value="department">🏢 Kontakty úseku ({userDetail?.usek_zkr || 'N/A'})</option>
{canManageUsers && (
  <option value="global">🌍 Globální kontakt (vidí všichni)</option>
)}
```

### 2. ContactManagement.js
**Cesta:** `/src/components/ContactManagement.js`

#### Změny:
- ✅ `getVisibilityLabel()` funkce (řádky 863-870)
- ✅ Filter chipy (řádky 1058-1077)

```javascript
// getVisibilityLabel - před
case 'global': return 'Globální';
case 'user': return 'Osobní';
case 'department': return 'Úseky';

// getVisibilityLabel - po
case 'global': return 'Globální kontakt';
case 'user': return 'Osobní kontakt';
case 'department': return 'Kontakty úseku';
```

```javascript
// Filter chipy - nové labely
<FilterChip active={activeFilter === 'global'}>
  <Globe size={14} />
  Globální kontakt
</FilterChip>
<FilterChip active={activeFilter === 'user'}>
  <User size={14} />
  Osobní kontakt
</FilterChip>
<FilterChip active={activeFilter === 'department'}>
  <Building size={14} />
  Kontakty úseku
</FilterChip>
```

### 3. ContactEditDialog.js
**Cesta:** `/src/components/ContactEditDialog.js`

#### Změny:
- ✅ `getVisibilityOptions()` funkce (řádky 813-832)

```javascript
// Visibility options s ikonami
const options = [
  { value: 'user', label: 'Osobní kontakt', icon: <User size={14} /> }
];

if (currentUserDepartment) {
  options.push({
    value: 'department',
    label: 'Kontakty úseku',  // ✅ Změněno z "Kontakt úseků"
    icon: <Building size={14} />
  });
}

if (canManageDepartments) {
  options.push({
    value: 'global',
    label: 'Globální kontakt',
    icon: <Globe size={14} />
  });
}
```

---

## 📊 BE API STRUKTURA (Reference)

### Endpoint: `/dodavatele/create`

```javascript
// REQUEST
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "username": "admin",
  "nazev": "Medicor s.r.o.",                 // POVINNÉ
  "ico": "12345678",                          // POVINNÉ
  "dic": "CZ12345678",                        // VOLITELNÉ
  "adresa": "Hlavní 123, Praha",             // VOLITELNÉ
  "zastoupeny": "Jan Novák, ředitel",        // VOLITELNÉ
  "kontakt_jmeno": "Jana Nováková",          // VOLITELNÉ
  "kontakt_email": "jana@medicor.cz",        // VOLITELNÉ
  "kontakt_telefon": "+420 777 888 999",     // VOLITELNÉ
  
  // === VIDITELNOST KONTAKTU ===
  "user_id": 0,                               // 0 = GLOBAL, ID = osobní
  "usek_zkr": ""                              // "" = bez úseku, "IT" = jen IT
}

// RESPONSE
{
  "ok": true,
  "data": {
    "id": 25,
    "message": "Dodavatel úspěšně vytvořen"
  }
}
```

### Logika viditelnosti

| user_id | usek_zkr | Typ kontaktu | Kdo vidí |
|---------|----------|--------------|----------|
| 0 | "" | **Globální kontakt** | Všichni uživatelé |
| 123 | "" | **Osobní kontakt** | Pouze uživatel ID=123 |
| 0 | "IT" | **Kontakty úseku** | Všichni z IT oddělení |
| 0 | '["IT","ZO"]' | **Kontakty úseků** | IT + ZO oddělení |

---

## ✅ TESTOVÁNÍ

### Test 1: Přidání dodavatele z ARES
1. Otevřít OrderForm25
2. Zadat IČO (např. 12345678)
3. Kliknout na "Přidat do osobních kontaktů"
4. ✅ **Očekávaný výsledek:** Úspěšné přidání bez chyby ICO

### Test 2: Výběr viditelnosti kontaktu
1. V ARES dialogu vybrat různé typy uložení:
   - 💼 Osobní kontakt (jen já)
   - 🏢 Kontakty úseku (můj úsek)
   - 🌍 Globální kontakt (všichni) - pouze admin
2. ✅ **Očekávaný výsledek:** Správné uložení s odpovídajícím user_id a usek_zkr

### Test 3: Zobrazení kontaktů v ContactManagement
1. Otevřít Adresář/Kontakty
2. Zkontrolovat filter chipy
3. ✅ **Očekávaný výsledek:** Zobrazují se nové názvy:
   - "Globální kontakt"
   - "Osobní kontakt"
   - "Kontakty úseku"

---

## 📌 DŮLEŽITÉ POZNÁMKY

### Pro vývojáře
- ⚠️ Vždy používat standardní pojmy z této dokumentace
- ⚠️ Při volání `createSupplier` / `updateSupplierByIco` posílat parametry přímo, ne jako vnořený objekt
- ⚠️ Kontrolovat, že `ico` a `nazev` jsou vždy vyplněné (required fields)

### Pro testery
- Otestovat všechny 3 typy kontaktů (globální, osobní, úseku)
- Ověřit, že správci vidí všechny kontakty
- Ověřit, že běžní uživatelé vidí pouze své + globální + úsekové

---

## 🔄 SOUVISEJÍCÍ DOKUMENTACE

- `BACKEND-USER-API-REFERENCE.md` - BE API dokumentace
- `TOOLTIPS-APPLIED-MAIN-PAGES.md` - Dokumentace tooltipů
- `CACHE-INTEGRATION-DONE.md` - Cache systém

---

**Autor:** System  
**Datum poslední aktualizace:** 24. října 2025  
**Verze:** 1.0
