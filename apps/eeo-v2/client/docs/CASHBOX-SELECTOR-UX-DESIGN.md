# 🎨 CASHBOX SELECTOR - UX DESIGN & IMPLEMENTACE

**Datum:** 9. listopadu 2025  
**Autor:** FE Team  
**Status:** ✅ Ready to Implement

---

## 📋 ZADÁNÍ

### Požadavky na zobrazení pokladen:

**A) ADMIN:**
- Vidí **všechny pokladny** všech uživatelů
- Může přepínat mezi libovolnými pokladnami
- Má možnost přidat novou pokladnu

**B) UŽIVATEL:**
- Vidí pouze **své pokladny**
- Rozlišení:
  - **Hlavní pokladna** (`je_hlavni = 1`)
  - **Zástupní pokladny** (`je_hlavni = 0`)
- **Časová validace:**
  - Aktivní: `platne_od <= DNES <= platne_do` (nebo `platne_do IS NULL`)
  - Neaktivní: mimo časový interval
- **Vizuální upozornění** na brzy končící platnost

---

## 🎯 UX KONCEPT

### 1️⃣ **HLAVNÍ ZOBRAZENÍ - Aktivní pokladna**

```
┌──────────────────────────────────────────────────┐
│  🏦 Aktivní pokladna                [⚙️]         │
├──────────────────────────────────────────────────┤
│                                                  │
│  🏛️ Pokladna 600 - Příbram                     │
│  📅 Listopad 2025                               │
│  💰 Stav: 12,450.50 Kč                          │
│                                                  │
│  [ Přepnout pokladnu ▼ ]                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Features:**
- Card design s elevation
- Aktuální stav pokladny (pokud načten)
- Tlačítko pro přepnutí → otevře dropdown
- Ikona nastavení (pro adminy)

---

### 2️⃣ **ADMIN VIEW - Dropdown seznam**

```
┌─────────────────────────────────────────────────┐
│ 🔍 [Vyhledat pokladnu...]                       │
├─────────────────────────────────────────────────┤
│ 📊 VŠECHNY POKLADNY (15)                        │
├─────────────────────────────────────────────────┤
│ ✓ 🏛️ Pokladna 600 - Příbram (Aktivní)         │
│   👤 Správce: Jan Novák                         │
│   📅 2 uživatelé                          [⚙️]  │
├─────────────────────────────────────────────────┤
│   🏢 Pokladna 100 - Hradec Králové             │
│   👤 Správce: Marie Svobodová                   │
│   📅 5 uživatelů                          [⚙️]  │
├─────────────────────────────────────────────────┤
│   🏢 Pokladna 200 - Mladá Boleslav             │
│   👤 Správce: Petr Dvořák                       │
│   📅 3 uživatelé                          [⚙️]  │
├─────────────────────────────────────────────────┤
│                                                 │
│ [ + Přidat novou pokladnu ]                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Features:**
- Vyhledávání v reálném čase
- Seznam všech pokladen
- Zobrazení správce a počtu uživatelů
- Ikona nastavení u každé pokladny
- Tlačítko pro přidání nové

---

### 3️⃣ **USER VIEW - Kategorizovaný dropdown**

```
┌─────────────────────────────────────────────────┐
│ 🔍 [Vyhledat pokladnu...]                       │
├─────────────────────────────────────────────────┤
│ 🏛️ MOJE HLAVNÍ POKLADNA                        │
├─────────────────────────────────────────────────┤
│ ✓ 🏛️ Pokladna 600 - Příbram [Hlavní]          │
│   📍 PB | 👤 Jan Novák                          │
│   📅 Platnost: Trvale                           │
│   💰 Stav: 12,450.50 Kč                        │
├─────────────────────────────────────────────────┤
│ 🔄 ZÁSTUPNÍ POKLADNY (2)                       │
├─────────────────────────────────────────────────┤
│   🏢 Pokladna 100 - Hradec Králové             │
│   📍 HK | 👤 Marie Svobodová                    │
│   📅 1.11. - 30.11.2025                        │
│   ⚠️ Vyprší za 21 dní                          │
├─────────────────────────────────────────────────┤
│   🏢 Pokladna 200 - Mladá Boleslav             │
│   📍 MB | 👤 Petr Dvořák                        │
│   📅 15.10. - 15.12.2025                       │
│   ✅ Aktivní                                    │
├─────────────────────────────────────────────────┤
│ 📋 NEAKTIVNÍ POKLADNY (1)                      │
├─────────────────────────────────────────────────┤
│   🚫 Pokladna 300 - Kolín                      │
│   📅 Platnost skončila: 31.10.2025             │
│   [ Požádat o prodloužení ]                     │
└─────────────────────────────────────────────────┘
```

**Features:**
- **3 kategorie:**
  1. Hlavní pokladna (priorita)
  2. Zástupní pokladny (aktivní)
  3. Neaktivní pokladny (vypršelé)
- **Barevné chipsy:**
  - 🔵 `[Hlavní]` - primary
  - ⚠️ `Vyprší za X dní` - warning (≤30 dní)
  - 🔴 `Vyprší za X dní` - error (≤7 dní)
  - 🚫 `Vypršelo před X dny` - error
- **Informace u každé pokladny:**
  - Číslo + název pracoviště
  - Kód pracoviště
  - Správce (hlavní pokladník)
  - Platnost (od-do nebo "Trvale")
  - Stav pokladny (pokud načten)

---

## 💻 TECHNICKÁ IMPLEMENTACE

### **Soubor:** `src/components/CashboxSelector.jsx`

**Komponenta:** `<CashboxSelector />`

#### Props:

```javascript
{
  currentCashbox: object,      // Aktuálně vybraná pokladna
  userCashboxes: array,        // Pokladny uživatele (pro USER)
  allCashboxes: array,         // Všechny pokladny (pro ADMIN)
  isAdmin: boolean,            // Je uživatel admin?
  onCashboxChange: function,   // Handler pro změnu pokladny
  onAddCashbox: function,      // Handler pro přidání nové (optional)
  onManageCashbox: function    // Handler pro nastavení (optional)
}
```

#### State:

```javascript
const [anchorEl, setAnchorEl] = useState(null);  // Pro Material-UI Menu
const [searchQuery, setSearchQuery] = useState(''); // Vyhledávací query
```

#### Computed Values:

```javascript
// Kategorizace pokladen uživatele
const categorizedCashboxes = useMemo(() => {
  if (isAdmin) {
    return { all: allCashboxes };
  }

  const today = new Date();
  const main = [];
  const substitute = [];
  const expired = [];

  userCashboxes.forEach(cb => {
    const validFrom = cb.platne_od ? new Date(cb.platne_od) : null;
    const validTo = cb.platne_do ? new Date(cb.platne_do) : null;

    const isActive = (!validFrom || validFrom <= today) && 
                     (!validTo || validTo >= today);

    if (!isActive) {
      expired.push(cb);
    } else if (cb.je_hlavni) {
      main.push(cb);
    } else {
      substitute.push(cb);
    }
  });

  return { main, substitute, expired };
}, [userCashboxes, allCashboxes, isAdmin]);
```

#### Validace platnosti:

```javascript
const getExpiryWarning = (validTo) => {
  if (!validTo) return null;
  
  const today = new Date();
  const expiryDate = new Date(validTo);
  const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { type: 'expired', days: Math.abs(daysLeft) };
  if (daysLeft <= 7) return { type: 'critical', days: daysLeft };
  if (daysLeft <= 30) return { type: 'warning', days: daysLeft };
  
  return null;
};
```

---

## 🔌 INTEGRACE DO CASHBOOKPAGE

### **1. Import komponenty:**

```javascript
import CashboxSelector from '../components/CashboxSelector';
```

### **2. Přidat state pro všechny pokladny (admin):**

```javascript
const [allCashboxes, setAllCashboxes] = useState([]);
```

### **3. Detekce admin role:**

```javascript
const isAdmin = useMemo(() => {
  return userDetail?.roles?.some(r => 
    r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR'
  );
}, [userDetail]);
```

### **4. Načtení dat:**

**Pro ADMINA:**
```javascript
useEffect(() => {
  if (!isAdmin) return;
  
  const fetchAllCashboxes = async () => {
    try {
      const result = await cashbookAPI.listAllAssignments(); // Nové API
      setAllCashboxes(result.data);
    } catch (error) {
      console.error('Chyba při načítání všech pokladen:', error);
    }
  };
  
  fetchAllCashboxes();
}, [isAdmin]);
```

**Pro UŽIVATELE:**
```javascript
// Již existující načítání
const result = await cashbookAPI.listAssignments(userDetail.id, true);
setAssignments(result.data);
```

### **5. Handler pro změnu pokladny:**

```javascript
const handleCashboxChange = useCallback((cashbox) => {
  // Přepnout na vybranou pokladnu
  setCurrentAssignment(cashbox);
  
  // Načíst knihu pro vybranou pokladnu
  fetchBooksForAssignment(cashbox);
}, []);
```

### **6. Umístění v UI:**

```javascript
return (
  <PageContainer>
    <Header>
      <Title>Pokladní kniha</Title>
    </Header>

    {/* NOVÁ KOMPONENTA - Výběr pokladny */}
    <CashboxSelector
      currentCashbox={currentAssignment}
      userCashboxes={assignments}
      allCashboxes={allCashboxes}
      isAdmin={isAdmin}
      onCashboxChange={handleCashboxChange}
      onAddCashbox={isAdmin ? handleAddCashbox : undefined}
      onManageCashbox={isAdmin ? handleManageCashbox : undefined}
    />

    {/* Existující obsah pokladní knihy */}
    <MonthNavigation>
      {/* ... */}
    </MonthNavigation>
    
    {/* ... zbytek kódu */}
  </PageContainer>
);
```

---

## 🎨 MATERIAL-UI KOMPONENTY POUŽITÉ

### Instalace (pokud není):
```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
```

### Použité komponenty:
- `Box` - layout container
- `Card`, `CardContent` - karty
- `Button` - tlačítka
- `Menu`, `MenuItem` - dropdown menu
- `List`, `ListItem`, `ListItemButton` - seznamy
- `TextField` - vyhledávací pole
- `Chip` - badge komponenty
- `Typography` - texty
- `Divider` - oddělovače
- `Badge`, `Tooltip` - pomocné komponenty
- `IconButton` - ikonová tlačítka

### Ikony:
- `AccountBalance` - hlavní ikona pokladny
- `Business` - pracoviště
- `CheckCircle` - aktivní
- `Warning` - varování
- `Block` - neaktivní
- `Search` - vyhledávání
- `Person`, `Group` - uživatelé
- `CalendarToday` - datum
- `Add` - přidat
- `Settings` - nastavení

---

## 🔄 BACKEND API - Co je potřeba

### **1. Nový endpoint pro ADMINA:**

**Endpoint:** `GET /api.eeo/cashbook-assignments-all`

**Vrací:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "pokladna_id": 5,
      "cislo_pokladny": "600",
      "nazev_pracoviste": "Příbram",
      "kod_pracoviste": "PB",
      "uzivatel_id": 10,
      "uzivatel_cele_jmeno": "Jan Novák",
      "je_hlavni": 1,
      "platne_od": "2024-01-01",
      "platne_do": null,
      "pocet_uzivatelu": 2
    },
    // ... další pokladny
  ]
}
```

**SQL:**
```sql
SELECT 
  ppu.id,
  ppu.pokladna_id,
  pp.cislo_pokladny,
  pp.nazev AS nazev_pracoviste,
  pp.kod_pracoviste,
  ppu.uzivatel_id,
  CONCAT(u.prijmeni, ' ', u.jmeno) AS uzivatel_cele_jmeno,
  ppu.je_hlavni,
  ppu.platne_od,
  ppu.platne_do,
  (SELECT COUNT(*) 
   FROM 25a_pokladny_uzivatele ppu2 
   WHERE ppu2.pokladna_id = ppu.pokladna_id) AS pocet_uzivatelu
FROM 25a_pokladny_uzivatele ppu
LEFT JOIN 25a_pokladny pp ON ppu.pokladna_id = pp.id
LEFT JOIN zamestnanci u ON ppu.uzivatel_id = u.id
ORDER BY pp.cislo_pokladny ASC
```

### **2. Rozšíření existujícího endpointu:**

**Endpoint:** `GET /api.eeo/cashbook-assignments`

**Aktuální:** Vrací jen aktivní přiřazení  
**Rozšířit:** Přidat parametr `include_expired=1` pro vrácení i vypršelých

---

## ✅ CHECKLIST IMPLEMENTACE

### **Frontend:**
- [x] Vytvořit `src/components/CashboxSelector.jsx`
- [ ] Přidat do `CashBookPage.js`:
  - [ ] Import komponenty
  - [ ] State `allCashboxes`
  - [ ] Computed `isAdmin`
  - [ ] Handler `handleCashboxChange`
  - [ ] Umístit komponentu do UI
- [ ] Přidat do `cashbookService.js`:
  - [ ] `listAllAssignments()` pro adminy
  - [ ] Rozšířit `listAssignments()` o parametr `includeExpired`
- [ ] Testovat:
  - [ ] Admin view - všechny pokladny
  - [ ] User view - kategorizace
  - [ ] Vyhledávání
  - [ ] Přepínání mezi pokladnami
  - [ ] Varování pro brzy končící platnost

### **Backend:**
- [ ] Vytvořit endpoint `cashbook-assignments-all`
- [ ] Rozšířit `cashbook-assignments` o parametr `include_expired`
- [ ] Přidat SQL dotazy
- [ ] Testovat oprávnění (jen ADMIN vidí vše)

---

## 🎯 OČEKÁVANÝ VÝSLEDEK

### **Admin:**
1. Vidí **všechny pokladny** v jednom seznamu
2. Může filtrovat vyhledáváním
3. Může přepnout na jakoukoli pokladnu
4. Ikony nastavení pro správu

### **Uživatel:**
1. Vidí **jen své pokladny** rozdělené do 3 kategorií
2. **Hlavní pokladna** má prioritu (nahoře)
3. **Zástupní pokladny** s datumem platnosti
4. **Neaktivní pokladny** ve spodní sekci
5. Vizuální upozornění:
   - ⚠️ Žlutá - vyprší za 30 dní nebo méně
   - 🔴 Červená - vyprší za 7 dní nebo méně / již vypršelo

### **UX benefity:**
- ✅ Přehledné rozdělení
- ✅ Okamžitá vizuální zpětná vazba
- ✅ Prevence práce s vypršelými pokladnami
- ✅ Profesionální vzhled (Material-UI)
- ✅ Responzivní design
- ✅ Rychlé vyhledávání

---

## 📝 POZNÁMKY

1. **Časová validace** běží na frontendu i backendu
2. **Upozornění** na končící platnost je jen vizuální (backend může stejně odmítnout operaci)
3. **Material-UI** zajistí konzistentní design s moderními komponentami
4. **Vyhledávání** funguje offline (v načtených datech)
5. **Admin** nemá kategorizaci, protože spravuje všechny pokladny globálně

---

**✅ Komponenta je připravena k použití!**

**📌 Další krok:** Integrace do `CashBookPage.js` + backend API
