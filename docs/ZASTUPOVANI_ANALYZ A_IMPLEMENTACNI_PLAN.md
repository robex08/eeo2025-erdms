# 📋 Analýza a implementační plán: Funkce ZÁSTUPU uživatelů

**Datum:** 26. března 2026  
**Autor:** GitHub Copilot  
**Verze:** 1.0  
**Status:** ✅ ANALÝZA KOMPLETNÍ - Připraveno k implementaci

---

## 📊 EXECUTIVE SUMMARY

**Scénář:**  
Příkazce Fajka jede na dovolenou. Objednávky zůstanou na něj jako příkazce, ale v nastavení si může vybrat kolegu jako **zástupce**, který bude moci schvalovat jeho objednávky během dovolené.

**Současný stav infrastruktury:** 🔧  
- ⚠️ **DB tabulka NEEXISTUJE**: `25_uzivatele_zastupovani` - **MUSÍ SE VYTVOŘIT!**
- ✅ **Konstanta v kódu definována**: `TBL_UZIVATELE_ZASTUPOVANI` v api.php
- ✅ **Backend API je kompletní**: všechny CRUD operace implementovány v hierarchyHandlers.php
- ✅ **SQL queries připraveny**: v queries.php
- ✅ **Logika zastupování je částečně integrována**: v schvalovacích pravomocích

**Co je potřeba udělat:** ⚠️  
- 🔴 **KRITICKÉ: Vytvořit DB tabulku** (migration script připraven)
- ❌ **Frontend UI pro správu zastupování** (ProfilePage nebo OrganizationHierarchy)
- ❌ **Integrace do schvalovací logiky OrdersV3** (právě implementovaná kontrola úseku)
- ❌ **Vizualizace aktivních zastupování** (notifikace, badge, info panel)

---

## 🗄️ SOUČASNÝ STAV - DB & BACKEND

### ⚠️ Databázová tabulka: `25_uzivatele_zastupovani` - NEEXISTUJE!

**Status:** ❌ Tabulka není vytvořena v databázi  
**Připraveno:** ✅ Migration script v `/migrations/2026-03-26_create_zastupovani_table.sql`

**Struktura tabulky (k vytvoření):**

```sql
CREATE TABLE 25_uzivatele_zastupovani (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zastupovany_id INT NOT NULL,              -- User ID zastupovaného (např. Fajka)
    zastupce_id INT NOT NULL,                 -- User ID zástupce (např. Nováková)
    dt_od DATE NOT NULL,                      -- Začátek zastupování (např. '2026-04-01')
    dt_do DATE NOT NULL,                      -- Konec zastupování (např. '2026-04-14')
    typ_zastupovani ENUM('full', 'orders_only', 'limited') NOT NULL,
    popis TEXT,                               -- Volitelný popis (např. "Dovolená - Řecko")
    aktivni TINYINT(1) DEFAULT 1,             -- Soft delete (0 = deaktivováno)
    vytvoril_user_id INT NOT NULL,            -- Kdo vytvořil záznam
    dt_vytvoreni DATETIME DEFAULT NOW(),
    dt_aktualizace DATETIME ON UPDATE NOW(),
    
    FOREIGN KEY (zastupovany_id) REFERENCES 25_uzivatele(id),
    FOREIGN KEY (zastupce_id) REFERENCES 25_uzivatele(id),
    FOREIGN KEY (vytvoril_user_id) REFERENCES 25_uzivatele(id),
    
    INDEX idx_zastupovany (zastupovany_id, aktivni),
    INDEX idx_zastupce (zastupce_id, aktivni),
    INDEX idx_datum (dt_od, dt_do, aktivni)
);
```

**Typy zastupování:**
- `full` - Plné zastupování (všechna práva zastupovaného)
- `orders_only` - Pouze schvalování objednávek
- `limited` - Omezené zastupování (zatím nedefinováno)

---

### Backend API Endpointy (✅ JIŽ EXISTUJÍ)

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyHandlers.php`

| Endpoint | Metoda | Funkce | Status |
|----------|--------|--------|--------|
| `/substitution/list` | POST | Seznam zastupování (filter by user_id) | ✅ Implementováno |
| `/substitution/create` | POST | Vytvoření nového zastupování | ✅ Implementováno |
| `/substitution/update` | POST | Aktualizace zastupování (datum, typ, popis) | ✅ Implementováno |
| `/substitution/deactivate` | POST | Deaktivace zastupování | ✅ Implementováno |
| `/substitution/current` | POST | Aktivní zastupování pro přihlášeného uživatele | ✅ Implementováno |

**Oprávnění:**
- `USER_SUBSTITUTE_MANAGE` - Pro správu zastupování (create, update, deactivate)
- Admin / SUPERADMIN - Mohou spravovat zastupování všech uživatelů
- Běžný uživatel - Může si nastavit vlastní zástupce (pokud má právo)

---

### SQL Queries (✅ PŘIPRAVENY)

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php`

```php
// Získání aktivních zastupování (aktuální datum mezi dt_od a dt_do)
$queries['substitution_get_active'] = "...";

// Zastupování pro konkrétního uživatele
$queries['substitution_get_by_user'] = "...";

// Kontrola aktuálního zastupování pro přihlášeného uživatele
$queries['substitution_check_current'] = "...";

// CRUD operace
$queries['substitution_create'] = "...";
$queries['substitution_update'] = "...";
$queries['substitution_deactivate'] = "...";
```

**✅ INTEGRACE DO SCHVALOVACÍCH PRAVOMOCÍ:**

V `approval_get_user_permissions` query již existuje logika:
```sql
OR EXISTS (
    -- Zastupování - práva zastupovaného
    SELECT 1 FROM 25_uzivatele_zastupovani z
    WHERE z.zastupce_id = :user_id
    AND z.aktivni = 1
    AND CURDATE() BETWEEN z.dt_od AND z.dt_do
    AND z.typ_zastupovani IN ('full', 'orders_only')
    AND (práva zastupovaného...)
)
```

**➡️ TO ZNAMENÁ:** Backend již podporuje přenos schvalovacích práv přes zastupování!

---

## 🚫 CO CHYBÍ - GAP ANALÝZA

### 1. Frontend UI - ProfilePage

**Současný stav:**
- ProfilePage zobrazuje: Jméno, Email, Telefon, Role, Úsek, Pozice, Lokalita
- Sekce "Nastavení" obsahuje: Výchozí rok, Období, Viditelnost nástrojů
- ❌ **CHYBÍ**: Sekce "Zastupování"

**Co implementovat:**
```javascript
// ProfilePage.js - nová sekce "Zastupování"
<SettingsSection>
  <SectionTitle>🔄 Zastupování během nepřítomnosti</SectionTitle>
  
  {/* Seznam aktivních zastupování */}
  <SubstitutionList>
    {currentSubstitutions.map(sub => (
      <SubstitutionCard key={sub.id}>
        <strong>{sub.zastupce.jmeno} {sub.zastupce.prijmeni}</strong>
        <DateRange>{formatDate(sub.dt_od)} - {formatDate(sub.dt_do)}</DateRange>
        <Badge>{sub.typ_zastupovani}</Badge>
        <Actions>
          <Edit onClick={() => editSubstitution(sub)} />
          <Delete onClick={() => deactivateSubstitution(sub.id)} />
        </Actions>
      </SubstitutionCard>
    ))}
  </SubstitutionList>
  
  {/* Formulář pro nové zastupování */}
  <AddSubstitutionForm>
    <UserSelect 
      label="Vyberte zástupce"
      options={eligibleUsers} // Pouze ze stejného úseku!
      onChange={setZastupce}
    />
    <DatePicker label="Od" value={dtOd} onChange={setDtOd} />
    <DatePicker label="Do" value={dtDo} onChange={setDtDo} />
    <Select label="Typ" options={['full', 'orders_only']} />
    <Textarea label="Poznámka" placeholder="Důvod (např. Dovolená)" />
    <Button onClick={createSubstitution}>Nastavit zástupce</Button>
  </AddSubstitutionForm>
</SettingsSection>
```

---

### 2. Frontend API Service

**Vytvořit:** `/apps/eeo-v2/client/src/services/apiSubstitution.js`

```javascript
export const getMySubstitutions = async (token, username, userId) => {
  const response = await fetch(`${API_BASE}/substitution/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username, user_id: userId })
  });
  return response.json();
};

export const createSubstitution = async (token, username, data) => {
  const response = await fetch(`${API_BASE}/substitution/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username, ...data })
  });
  return response.json();
};

export const updateSubstitution = async (token, username, substitutionId, data) => {
  // ...
};

export const deactivateSubstitution = async (token, username, substitutionId) => {
  // ...
};

export const getCurrentSubstitutions = async (token, username) => {
  // Vrátí koho aktuálně zastupuji
  const response = await fetch(`${API_BASE}/substitution/current`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username })
  });
  return response.json();
};
```

---

### 3. Integrace do schvalovací logiky OrdersV3

**Problém:**  
Právě implementovaná kontrola úseku v `Orders25ListV3.js` a `OrdersTableV3.js` kontroluje pouze:
```javascript
if (myUsekId !== prikazceUsekId) {
  return false; // NEMŮŽE schválit
}
```

**Řešení:**  
Přidat kontrolu aktivního zastupování:

**A) Orders25ListV3.js - canApprove callback**

```javascript
const canApprove = useCallback((order) => {
  // ... stávající kód ...
  
  // 🔄 KONTROLA ZASTUPOVÁNÍ (přidat PŘED kontrolu úseku)
  const isActiveDeputy = currentSubstitutions?.some(sub => 
    sub.zastupovany_id === order.prikazce_id &&
    sub.typ_zastupovani !== 'limited' // full nebo orders_only
  );
  
  if (isActiveDeputy) {
    return isAllowedState; // ✅ Mohu schválit jako zástupce
  }
  
  // ... zbytek kontroly úseku ...
}, [currentUserId, currentSubstitutions, userDetail]);
```

**B) Načíst aktuální zastupování při mount**

```javascript
// Orders25ListV3.js - useEffect
useEffect(() => {
  const loadCurrentSubstitutions = async () => {
    try {
      const token = await loadAuthData.token();
      const username = await loadAuthData.user().then(u => u.username);
      const result = await getCurrentSubstitutions(token, username);
      
      if (result.status === 'ok') {
        setCurrentSubstitutions(result.data); // State pro aktivní zastupování
      }
    } catch (error) {
      console.error('Chyba načítání zastupování:', error);
    }
  };
  
  loadCurrentSubstitutions();
}, []);
```

**C) OrdersTableV3.js - handleApprovalAction**

Upravit validaci:
```javascript
// Před stávající kontrolou úseku
const isActiveDeputy = currentSubstitutions?.some(sub => 
  sub.zastupovany_id === orderToApprove.prikazce_id
);

if (isActiveDeputy) {
  // ✅ Může schválit jako zástupce - pokračovat
} else if (!isPrikazce && !isAdmin) {
  // Kontrola úseku...
}
```

**D) Backend - orderV2Endpoints.php**

Upravit našeho právě implementovaného validátora:
```php
// V handle_order_v2_update - před kontrolou úseku
$stmt_deputy = $db->prepare("
    SELECT COUNT(*) 
    FROM 25_uzivatele_zastupovani 
    WHERE zastupce_id = :current_user_id 
    AND zastupovany_id = :prikazce_id
    AND aktivni = 1 
    AND CURDATE() BETWEEN dt_od AND dt_do
    AND typ_zastupovani IN ('full', 'orders_only')
");
$stmt_deputy->execute([
    ':current_user_id' => $current_user_id,
    ':prikazce_id' => $existingOrder['prikazce_id']
]);

if ($stmt_deputy->fetchColumn() > 0) {
    // ✅ Je aktivní zástupce - povolit schválení
    // ... continue with dt_schvaleni update ...
} else {
    // ... kontrola úseku jako doposud ...
}
```

---

### 4. Vizualizace aktivního zastupování

**A) Badge v horní liště (Navbar.js)**

```javascript
{currentSubstitutions && currentSubstitutions.length > 0 && (
  <SubstitutionBadge>
    🔄 Zastupuji: {currentSubstitutions.map(s => 
      s.zastupovany_jmeno + ' ' + s.zastupovany_prijmeni
    ).join(', ')}
  </SubstitutionBadge>
)}
```

**B) Info panel v OrdersTableV3**

```javascript
{currentSubstitutions && currentSubstitutions.length > 0 && (
  <Alert type="info" style={{ marginBottom: '1rem' }}>
    📋 <strong>Aktivní zastupování:</strong> Schvalujete objednávky za:
    <ul>
      {currentSubstitutions.map(sub => (
        <li key={sub.zastupovany_id}>
          {sub.zastupovany_jmeno} {sub.zastupovany_prijmeni} 
          (do {formatDate(sub.dt_do)})
        </li>
      ))}
    </ul>
  </Alert>
)}
```

**C) Tooltip na ikoně schválení**

```javascript
title={
  isActiveDeputy
    ? `Schválit jako zástupce za ${order.prikazce_jmeno} ${order.prikazce_prijmeni}`
    : 'Schválit objednávku'
}
```

---

## 🎯 IMPLEMENTAČNÍ PLÁN

### FÁZE 0: DB Migration - Vytvoření tabulky (15 minut) 🔴 KRITICKÉ!

**0.1 Ověření aktuálního stavu**
- ✅ Zkontrolovat, že tabulka neexistuje: `SHOW TABLES LIKE '25_uzivatele_zastupovani';`
- ✅ Ověřit přístup k DEV DB

**0.2 Spuštění migrace**
```bash
# DEV databáze
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD EEO-OSTRA-DEV < migrations/2026-03-26_create_zastupovani_table.sql

# Ověření
mysql -h 10.3.172.11 -u erdms_user -pCHANGE_ME_DB_PASSWORD EEO-OSTRA-DEV -e "DESCRIBE 25_uzivatele_zastupovani;"
```

**0.3 Testovací data (volitelné)**
```sql
-- Testovací INSERT pro ověření funkčnosti
INSERT INTO 25_uzivatele_zastupovani 
    (zastupovany_id, zastupce_id, dt_od, dt_do, typ_zastupovani, popis, vytvoril_user_id)
VALUES
    (71, 72, '2026-04-01', '2026-04-14', 'orders_only', 'Test dovolená', 1);

-- Ověření
SELECT * FROM 25_uzivatele_zastupovani WHERE aktivni = 1;
```

**⚠️ POZNÁMKA:** Dokud není tabulka vytvořena, backend API SELŽE s chybou "Table doesn't exist"!

---

### FÁZE 1: Frontend UI - Správa zastupování (2-3 hodiny)

**1.1 API Service**
- ✅ Vytvořit `/apps/eeo-v2/client/src/services/apiSubstitution.js`
- Implementovat všechny 5 funkcí (list, create, update, deactivate, current)

**1.2 ProfilePage.js - Nová sekce**
- ✅ Přidat sekci "Zastupování" do Settings tabu
- ✅ Komponenta `SubstitutionList` - zobrazení aktivních zastupování
- ✅ Komponenta `SubstitutionForm` - formulář pro nastavení nového
- ✅ Validace:
  - Datum od < Datum do
  - Zástupce MUSÍ být ze stejného úseku (usek_id matching)
  - Zástupce ≠ zastupovaný
  - Žádné překrývající se zastupování (pouze 1 aktivní zástupce najednou)

**1.3 UI Komponenty**
```jsx
<SubstitutionCard>
  <Avatar user={zastupce} />
  <Info>
    <Name>{zastupce.jmeno} {zastupce.prijmeni}</Name>
    <DateRange>{dt_od} - {dt_do}</DateRange>
    <Type badge>{typ_zastupovani}</Type>
  </Info>
  <Actions>
    <IconButton icon={Edit} onClick={handleEdit} />
    <IconButton icon={Trash} onClick={handleDeactivate} />
  </Actions>
</SubstitutionCard>
```

---

### FÁZE 2: Integrace do schválení OrdersV3 (1-2 hodiny)

**2.1 Orders25ListV3.js**
- ✅ State `currentSubstitutions` - načíst při mount
- ✅ Upravit `canApprove` callback - přidat kontrolu zastupování PŘED kontrolou úseku
- ✅ useEffect hook pro načtení současných zastupování

**2.2 OrdersTableV3.js**
- ✅ Přidat prop `currentSubstitutions` (předat z Orders25ListV3)
- ✅ Upravit `handleApprovalAction` validaci
- ✅ Upravit tooltip na ikoně schválení

**2.3 Backend - orderV2Endpoints.php**
- ✅ Přidat SQL dotaz na kontrolu aktivního zastupování
- ✅ Upravit logiku schválení:
  ```
  1. Je admin? → POVOLIT
  2. Je přímo příkazce? → POVOLIT
  3. Je aktivní zástupce příkazce? → POVOLIT
  4. Je ze stejného úseku jako příkazce? → POVOLIT (pokud má právo)
  5. Jinak → ZAMÍTNOUT s HTTP 403
  ```

---

### FÁZE 3: Vizualizace & Notifikace (1 hodina)

**3.1 Navbar.js - Badge**
- ✅ Context pro `currentSubstitutions` (nebo fetch v App.js)
- ✅ Zobrazit badge "🔄 Zastupuji: Jméno Příjmení"

**3.2 OrdersTableV3 - Info panel**
- ✅ Alert box nad tabulkou se seznamem zastupovaných

**3.3 Tooltip & Visual hints**
- ✅ Ikona schválení má jiný tooltip když schvaluji jako zástupce
- ✅ Možná badge "👤" u objednávky pokud schvaluji jako zástupce

---

### FÁZE 4: Testování & Edge cases (1-2 hodiny)

**4.1 Testovací scénáře**

| # | Scénář | Očekávaný výsledek |
|---|--------|-------------------|
| 1 | Fajka jede na dovolenou, nastaví Novákovou jako zástupce (01.04 - 14.04) | ✅ Nováková vidí všechny Fajkovy objednávky k schválení |
| 2 | Nováková schválí objednávku za Fajku dne 05.04 | ✅ dt_schvaleni = 05.04, schvalovatel_id = Nováková.id |
| 3 | Nováková se pokusí schválit objednávku 15.04 (po konci zastupování) | ❌ Ikona šedá, error "Zastupování skončilo" |
| 4 | Fajka nastaví 2 zástupce najednou | ❌ Validace: "Můžete mít pouze 1 aktivního zástupce" |
| 5 | Fajka nastaví zástupce z jiného úseku | ❌ Validace: "Zástupce musí být ze stejného úseku" |
| 6 | Fajka deaktivuje zastupování předčasně | ✅ `aktivni = 0`, Nováková ztrácí přístup |
| 7 | Admin schvaluje objednávku i přes úsek a zastupování | ✅ Vždy povolit |
| 8 | Log audit - kdo schválil objednávku | ✅ V DB: schvalovatel_id = skutečný uživatel (Nováková), ne Fajka |

**4.2 Edge Cases**
- Zastupování začíná dnes v 00:00 a končí včetně dt_do 23:59
- Překrývající se zastupování (např. user1 zastupuje user2, user2 zastupuje user3) - **NEPODPOROVAT**
- Reaktivace deaktivovaného zastupování - pouze přes create nového
- Mazání uživatele při aktivním zastupování - spouště FOREIGN KEY constraint nebo soft delete

---

### FÁZE 5: Dokumentace (30 minut)

**5.1 User Manual - ZASTUPOVANI_UZIVATELSKA_PRIRUCKA.md**
```markdown
# Jak nastavit zástupce během dovolené?

1. Přejít do **Profil** (ikona uživatele)
2. Otevřít tab **Nastavení**
3. Sekce **"Zastupování během nepřítomnosti"**
4. Kliknout **"Přidat zástupce"**
5. Vybrat kolegu ze stejného úseku
6. Zadat datum od-do
7. Vybrat typ: "Plné zastupování" nebo "Pouze objednávky"
8. Uložit

**Co zástupce může:**
- ✅ Schvalovat vaše objednávky
- ✅ Vidět historie schválení
- ❌ Měnit vaše nastavení profilu
- ❌ Přistupovat k jiným modulům (pokud typ = orders_only)
```

**5.2 Tech dokumentace**
- Aktualizovat `ANNUAL_FEES_PERMISSIONS_DOCS.md` nebo vytvořit nový
- Diagramy workflow zastupování
- API dokumentace endpointů

---

## 🔒 BEZPEČNOST & VALIDACE

### Frontend validace (před zasláním na backend)

```javascript
const validateSubstitution = (data) => {
  const errors = [];
  
  // 1. Datum
  if (new Date(data.dt_od) >= new Date(data.dt_do)) {
    errors.push('Datum začátku musí být před datem konce');
  }
  
  // 2. Zástupce ≠ zastupovaný
  if (data.zastupce_id === zastupovany_id) {
    errors.push('Nemůžete zastupovat sám sebe');
  }
  
  // 3. Stejný úsek
  if (zastupce.usek_id !== my_usek_id) {
    errors.push('Zástupce musí být ze stejného úseku');
  }
  
  // 4. Již existující aktivní zastupování v daném období
  const hasOverlap = currentSubstitutions.some(sub => 
    (data.dt_od <= sub.dt_do && data.dt_do >= sub.dt_od)
  );
  if (hasOverlap) {
    errors.push('V tomto období již máte aktivního zástupce');
  }
  
  return errors;
};
```

### Backend validace (hierarchyHandlers.php - JIŽ IMPLEMENTOVÁNO!)

```php
// ✅ Kontrola existence uživatelů
// ✅ Kontrola aktivního stavu
// ✅ Kontrola dt_od < dt_do
// ✅ Kontrola typ_zastupovani ENUM
// ✅ Oprávnění USER_SUBSTITUTE_MANAGE

// ⚠️ CO PŘIDAT:
// - Kontrola stejného úseku (usek_id matching)
// - Kontrola překrývajících se zastupování
```

---

## 📈 VÝHODY IMPLEMENTACE

1. **UX zlepšení:**
   - ✅ Uživatelé nemusí sdílet hesla během dovolené
   - ✅ Transparentní audit trail (kdo skutečně schválil)
   - ✅ Automatické vypršení po dt_do

2. **Bezpečnost:**
   - ✅ Časově omezené oprávnění
   - ✅ Typované zastupování (full vs orders_only)
   - ✅ Kontrola úseku (stejná jako u běžného schválení)

3. **Audit & Compliance:**
   - ✅ DB log: kdo, koho, kdy, jak dlouho zastupoval
   - ✅ `schvalovatel_id` obsahuje skutečného schvalovatele (Nováková), ne zastupovaného (Fajka)

---

## 🛠️ TECHNICKÉ POZNÁMKY

### Stávající struktura NEVYŽADUJE změny!

- ✅ DB tabulka existuje
- ✅ Backend API kompletní
- ✅ SQL queries připraveny
### Infrastruktura - současný stav

**Backend kód:**
- ✅ Konstanta `TBL_UZIVATELE_ZASTUPOVANI` definována v api.php
- ✅ Backend API kompletní (hierarchyHandlers.php)
- ✅ SQL queries připraveny (queries.php)
- ✅ Integrace do schvalovacích pravomocí (partial)

**Databáze:**
- ❌ Tabulka `25_uzivatele_zastupovani` NEEXISTUJE v DB
- ✅ Migration script připraven: `/migrations/2026-03-26_create_zastupovani_table.sql`

### Co NENÍ třeba dělat:

- ❌ NOVÉ DB sloupce v `25_uzivatele`
- ❌ Migrace existujících dat
- ❌ Změna autentifikace
- ❌ Změna backend API (již hotové)

### Co JE třeba udělat:

- ✅ Frontend UI (ProfilePage sekce)
- ✅ Frontend API service
- ✅ Integrace do OrdersV3 schválení (+ backend validace)
- ✅ Vizualizace (badge, info panel)
- ✅ Testování edge cases
- ✅ Dokumentace

---

## 🚀 ČASOVÝ ODHAD

| Fáze | Čas | Priorita |
|------|-----|----------|
| **Fáze 0:** DB Migration (CREATE TABLE) | 0.25 h | 🔴 CRITICAL |
| **Fáze 1:** Frontend UI (ProfilePage) | 2-3 h | 🔴 HIGH |
| **Fáze 2:** Integrace OrdersV3 | 1-2 h | 🔴 HIGH |
| **Fáze 3:** Vizualizace | 1 h | 🟡 MEDIUM |
| **Fáze 4:** Testování | 1-2 h | 🔴 HIGH |
| **Fáze 5:** Dokumentace | 0.5 h | 🟢 LOW |
| **CELKEM** | **6 - 9 h** | |

**1 pracovní den = 8 hodin** → Implementace do **1-2 dnů**

**⚠️ KRITICKÁ ZÁVISLOST:** Fáze 0 (DB Migration) MUSÍ být hotová PŘED Fází 1-5!

---

## 🎓 DOPORUČENÍ

### Pro rychlou implementaci:

1. **NEJDŘÍVE**: Fáze 0 (DB Migration) - 🔴 KRITICKÉ! Bez tohoto nic nefunguje
2. **START**: Fáze 1 (UI) - users hned uvidí funkci
3. **THEN**: Fáze 2 (Integrace) - fungující schválení
4. **POLISH**: Fáze 3 (Vizualizace) - lepší UX
5. **VALIDATE**: Fáze 4 (Testování) - stabilita

### Pro budoucí rozšíření:

- **Notifikace:** Email/in-app notifikace při aktivaci zastupování
- **Kalendář:** Zobrazit zastupování v kalendáři (timeline view)
- **Historie:** Archiv minulých zastupování (pro audit)
- **Hierarchie:** Automatické přiřazení nadřízeného jako fallback zástupce

---

## ✅ ZÁVĚR

**Funkce zastupování je technicky připravena na 70%.**  
Backend kód je hotový, ale **DB tabulka chybí** + frontend implementace.

**Backend kód:** ✅ HOTOVO (API, queries, handlery)  
**DB tabulka:** ❌ NEEXISTUJE - **MUSÍ SE VYTVOŘIT!** (migration připraven)  
**Frontend UI:** ❌ CHYBÍ  
**Integrace:** ⚠️ ČÁSTEČNÁ (práva připraveny, ale UI kontrola chybí)

**Odhadovaný čas implementace:** 1-2 pracovní dny  
**Doporučení:** Implementovat v rámci aktuálního sprintu

---

**Připraven k implementaci:** ⚠️ ČÁSTEČNĚ (chybí DB migrace)  
**Vyžaduje DB změny:** 🔴 **ANO - KRITICKÉ!** (CREATE TABLE migrace)  
**Vyžaduje backend změny:** ✅ ANO (minimální - pouze validace v orderV2Endpoints.php)  
**Vyžaduje frontend změny:** ✅ ANO (ProfilePage + OrdersV3 integrace)

---

## 🚨 AKČNÍ KROKY - PRIORITA

1. **NEJDŘÍVE:** Spustit DB migration (15 min)
   ```bash
   mysql -h 10.3.172.11 -u erdms_user -p EEO-OSTRA-DEV < migrations/2026-03-26_create_zastupovani_table.sql
   ```

2. **PAK:** Frontend implementace (6-8 hodin)
   - ProfilePage sekce
   - OrdersV3 integrace
   - Vizualizace

3. **NAKONEC:** Testování a dokumentace (2 hodiny)

---

*Dokument vytvořen: 26. března 2026*  
*Autor: GitHub Copilot*  
*Verze: 1.1 - AKTUALIZOVÁNO (DB tabulka neexistuje)*
