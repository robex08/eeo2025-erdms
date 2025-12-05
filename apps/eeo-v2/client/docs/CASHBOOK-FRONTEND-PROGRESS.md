# 🎨 CASHBOOK FRONTEND - ZMĚNY PRO NORMALIZOVANOU STRUKTURU

**Datum:** 8. listopadu 2025  
**Status:** 🔨 V pr\u00e1ci  
**Priorita:** 🔥 Vysok\u00e1

---

## ✅ DOKONČENO

### 1. cashbookService.js - Nové API metody

Přidáno **6 nových metod** do `src/services/cashbookService.js`:

```javascript
// 🆕 NOVÉ ENDPOINTY
cashbookAPI.getCashboxList(activeOnly, includeUsers)  // Seznam pokladen + uživatelé
cashbookAPI.createCashbox(cashboxData)                // Vytvořit pokladnu
cashbookAPI.updateCashbox(pokladnaId, updates)        // Upravit pokladnu ⚠️ ovlivní všechny
cashbookAPI.deleteCashbox(pokladnaId)                 // Smazat pokladnu
cashbookAPI.assignUserToCashbox(assignmentData)       // Přiřadit uživatele
cashbookAPI.unassignUserFromCashbox(prirazeniId)      // Odebrat uživatele
cashbookAPI.getAvailableUsers(pokladnaId, search)     // Dropdown dostupných uživatelů
```

**Použití:**
```javascript
// Načíst seznam pokladen
const result = await cashbookAPI.getCashboxList(true, true);
// result.data.pokladny = [
//   {
//     id: 1,
//     cislo_pokladny: 100,
//     nazev: "Sdílená pokladna IT",
//     ciselna_rada_vpd: "599",
//     pocet_uzivatelu: 2,
//     uzivatele: [
//       { uzivatel_id: 1, uzivatel_cele_jmeno: "Super ADMIN", je_hlavni: true },
//       { uzivatel_id: 102, uzivatel_cele_jmeno: "Tereza Bezoušková", je_hlavni: false }
//     ]
//   }
// ]

// Vytvořit novou pokladnu
const result = await cashbookAPI.createCashbox({
  cislo_pokladny: 103,
  nazev: "Nová pokladna OI",
  kod_pracoviste: "OI",
  nazev_pracoviste: "Oddělení informatiky",
  ciselna_rada_vpd: "597",
  vpd_od_cislo: 1,
  ciselna_rada_ppd: "497",
  ppd_od_cislo: 1,
  poznamka: ""
});
// result.data.pokladna_id = 3

// Přiřadit uživatele k pokladně
const result = await cashbookAPI.assignUserToCashbox({
  pokladna_id: 1,
  uzivatel_id: 105,
  je_hlavni: false,
  platne_od: "2025-11-08",
  poznamka: "Zástup za kolegu"
});
```

---

## 🔨 V PRÁCI

### 2. CashbookTab.js - Redesign tabulky

**Co se mění:**

#### ❌ PŘED (nyní):
```jsx
// Tabulka: Řádek = Uživatel + parametry jeho pokladny
<Table>
  <Row>
    <Cell>Admin</Cell>
    <Cell>100</Cell>
    <Cell>V599</Cell>
    <Cell>P499</Cell>
    <Cell>Edit | Delete</Cell>
  </Row>
  <Row>
    <Cell>Tereza</Cell>
    <Cell>100</Cell>        ← duplicita!
    <Cell>V599</Cell>        ← duplicita!
    <Cell>P499</Cell>        ← duplicita!
    <Cell>Edit | Delete</Cell>
  </Row>
</Table>
```

#### ✅ PO (cíl):
```jsx
// Tabulka: Řádek = Pokladna + expandable seznam uživatelů
<Table>
  <Row onClick={() => toggleExpand(100)}>
    <Cell>
      <ExpandIcon expanded={expanded[100]} />
    </Cell>
    <Cell>100</Cell>
    <Cell>Sdílená IT</Cell>
    <Cell>V599</Cell>
    <Cell>P499</Cell>
    <Cell>2 uživatelů</Cell>
    <Cell>Edit | Delete</Cell>
  </Row>
  
  {expanded[100] && (
    <ExpandedRow>
      <UsersList>
        <UserItem>
          👤 Admin (hlavní)
          <Button onClick={() => unassign(1)}>Odebrat</Button>
        </UserItem>
        <UserItem>
          👤 Tereza Bezoušková
          <Button onClick={() => unassign(2)}>Odebrat</Button>
        </UserItem>
        <UserItem>
          <Button onClick={() => openAssignDialog(100)}>+ Přidat uživatele</Button>
        </UserItem>
      </UsersList>
    </ExpandedRow>
  )}
</Table>
```

**Změny v columns:**

```javascript
const columns = [
  {
    id: 'expander',
    header: '',
    cell: ({ row }) => (
      <ExpandButton onClick={() => row.toggleExpanded()}>
        <FontAwesomeIcon 
          icon={row.getIsExpanded() ? faChevronUp : faChevronDown} 
        />
      </ExpandButton>
    ),
  },
  {
    accessorKey: 'cislo_pokladny',
    header: 'Číslo',
    cell: ({ row }) => (
      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
        {row.original.cislo_pokladny}
      </div>
    ),
  },
  {
    accessorKey: 'nazev',
    header: 'Název pokladny',
  },
  {
    accessorKey: 'ciselna_rada_vpd',
    header: 'VPD',
    cell: ({ row }) => (
      <NumberBadge $type="vpd">
        V{row.original.ciselna_rada_vpd}
      </NumberBadge>
    ),
  },
  {
    accessorKey: 'ciselna_rada_ppd',
    header: 'PPD',
    cell: ({ row }) => (
      <NumberBadge $type="ppd">
        P{row.original.ciselna_rada_ppd}
      </NumberBadge>
    ),
  },
  {
    accessorKey: 'pocet_uzivatelu',
    header: 'Uživatelů',
    cell: ({ row }) => (
      <div style={{ color: '#64748b' }}>
        {row.original.pocet_uzivatelu} uživatelů
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'Akce',
    cell: ({ row }) => (
      <ActionsCell>
        <IconButton onClick={() => handleEdit(row.original)}>
          <FontAwesomeIcon icon={faEdit} />
        </IconButton>
        <IconButton onClick={() => handleDelete(row.original)} $delete>
          <FontAwesomeIcon icon={faTrash} />
        </IconButton>
      </ActionsCell>
    ),
  },
];
```

**Expandable row content:**

```javascript
// V renderSubComponent funkci
const renderSubComponent = ({ row }) => {
  const pokladna = row.original;
  
  return (
    <ExpandedContent>
      <UsersTitle>
        <User /> Přiřazení uživatelé
      </UsersTitle>
      
      <UsersList>
        {pokladna.uzivatele?.map(user => (
          <UserItem key={user.prirazeni_id}>
            <UserInfo>
              <UserAvatar>
                <User />
              </UserAvatar>
              <UserDetails>
                <UserName>{user.uzivatel_cele_jmeno}</UserName>
                <UserMeta>
                  {user.je_hlavni && <Badge>Hlavní</Badge>}
                  <span>Od: {user.platne_od}</span>
                </UserMeta>
              </UserDetails>
            </UserInfo>
            
            <UserActions>
              <IconButton 
                onClick={() => handleUnassignUser(user.prirazeni_id)}
                title="Odebrat uživatele"
              >
                <FontAwesomeIcon icon={faTrash} />
              </IconButton>
            </UserActions>
          </UserItem>
        ))}
        
        <AddUserButton onClick={() => handleAssignUser(pokladna.id)}>
          <FontAwesomeIcon icon={faPlus} />
          Přiřadit uživatele
        </AddUserButton>
      </UsersList>
    </ExpandedContent>
  );
};
```

**Změna loadData:**

```javascript
const loadData = useCallback(async () => {
  setLoading(true);
  try {
    // 🆕 Nové API - načíst pokladny místo assignments
    const result = await cashbookAPI.getCashboxList(true, true);
    
    if (result.status === 'ok') {
      setCashboxes(result.data.pokladny || []);
    } else {
      showToast?.('Chyba při načítání pokladen', { type: 'error' });
    }
  } catch (error) {
    showToast?.('Chyba při načítání dat', { type: 'error' });
    console.error('Error loading cashboxes:', error);
  } finally {
    setLoading(false);
  }
}, [showToast]);
```

---

## 📋 ZBÝVÁ VYTVOŘIT

### 3. EditCashboxDialog.js

Dialog pro editaci parametrů pokladny (VPD/PPD, název, pracoviště).

**Props:**
```javascript
<EditCashboxDialog 
  open={editDialogOpen}
  onClose={() => setEditDialogOpen(false)}
  cashbox={selectedCashbox}
  onSuccess={handleEditSuccess}
/>
```

**Funkce:**
- Formulář s poli: `nazev`, `ciselna_rada_vpd`, `vpd_od_cislo`, `ciselna_rada_ppd`, `ppd_od_cislo`
- ⚠️ **Varování**: "Tato změna ovlivní X uživatelů"
- Vyžadovat potvrzení před uložením
- Volat `cashbookAPI.updateCashbox()`

**Soubor:** `src/components/cashbook/EditCashboxDialog.js`

---

### 4. AddCashboxDialog.js

Dialog pro vytvoření nové pokladny.

**Props:**
```javascript
<AddCashboxDialog 
  open={addDialogOpen}
  onClose={() => setAddDialogOpen(false)}
  onSuccess={handleAddSuccess}
/>
```

**Funkce:**
- Formulář s poli: `cislo_pokladny`, `nazev`, `kod_pracoviste`, `nazev_pracoviste`, VPD/PPD
- Validace čísla pokladny (unique)
- Volat `cashbookAPI.createCashbox()`

**Soubor:** `src/components/cashbook/AddCashboxDialog.js`

---

### 5. AssignUserDialog.js

Dialog pro přiřazení uživatele k pokladně.

**Props:**
```javascript
<AssignUserDialog 
  open={assignDialogOpen}
  onClose={() => setAssignDialogOpen(false)}
  cashbox={selectedCashbox}
  onSuccess={handleAssignSuccess}
/>
```

**Funkce:**
- Dropdown s vyhledáváním uživatelů (použít `cashbookAPI.getAvailableUsers()`)
- Pole: `je_hlavni` (checkbox), `platne_od` (date), `poznamka`
- Volat `cashbookAPI.assignUserToCashbox()`

**Soubor:** `src/components/cashbook/AssignUserDialog.js`

---

## 🎯 WORKFLOW

### Vytvoření nové pokladny:
1. User klikne "Přidat pokladnu"
2. Otevře se `AddCashboxDialog`
3. Vyplní číslo, název, VPD/PPD
4. Backend vytvoří záznam v `25a_pokladny`
5. Refresh tabulky → nová pokladna se zobrazí (0 uživatelů)

### Přiřazení uživatele:
1. User rozbalí řádek pokladny (expand)
2. Klikne "+ Přiřadit uživatele"
3. Otevře se `AssignUserDialog`
4. Vybere uživatele z dropdownu
5. Backend vytvoří záznam v `25a_pokladny_uzivatele`
6. Refresh → uživatel se zobrazí v expandable listu

### Editace VPD/PPD:
1. User klikne Edit u pokladny
2. Otevře se `EditCashboxDialog`
3. **Varování**: "Tato změna ovlivní 2 uživatele"
4. User potvrdí
5. Backend UPDATEne `25a_pokladny`
6. Změna se projeví u VŠECH uživatelů této pokladny

### Odebrání uživatele:
1. User rozbalí řádek pokladny
2. Klikne "Odebrat" u uživatele
3. Confirm dialog
4. Backend nastaví `platne_do = dnes`
5. Refresh → uživatel zmizí ze seznamu

---

## 📦 SOUHRN SOUBORŮ

```
src/
├── services/
│   └── cashbookService.js          ✅ HOTOVO - přidáno 6 nových metod
├── components/
│   ├── dictionaries/tabs/
│   │   └── CashbookTab.js          🔨 V PRÁCI - redesign tabulky
│   └── cashbook/
│       ├── EditCashboxDialog.js    📋 TODO - dialog pro editaci pokladny
│       ├── AddCashboxDialog.js     📋 TODO - dialog pro vytvoření
│       └── AssignUserDialog.js     📋 TODO - dialog pro přiřazení uživatele
```

---

## 🧪 TESTOVÁNÍ

Po dokončení otestovat:

- [ ] Načtení seznamu pokladen
- [ ] Expandable řádky (rozbalit/zabalit)
- [ ] Vytvoření nové pokladny
- [ ] Editace VPD/PPD (s varováním)
- [ ] Přiřazení uživatele k pokladně
- [ ] Odebrání uživatele z pokladny
- [ ] Smazání pokladny (s/bez uživatelů)
- [ ] Filtrování a vyhledávání
- [ ] Pagination
- [ ] Responsive design

---

**Status:** 🔨 Rozpracováno - cashbookService.js hotov, CashbookTab.js v práci  
**Next:** Dokončit CashbookTab.js, vytvořit 3 dialogy  
**Vytvořil:** Robert Holovský + GitHub Copilot
