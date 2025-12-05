# 🎯 RoleTab - Redesign podle DOCX vzoru

## ✅ Status: IN PROGRESS

**Datum:** 2025-10-24
**Soubor:** `src/components/dictionaries/tabs/RoleTab.js`
**Záloha:** `src/components/dictionaries/tabs/RoleTab.js.backup`

---

## 📋 Požadavky od uživatele

1. ✅ **Převzít design z DOCX šablon** - action bar, tabulka, gradienty, barvy
2. ⏳ **Přidat vazbu na uživatele** - kdo má jakou roli (v expandable rows)
3. ⏳ **Ikony pro editaci a mazání** - action buttony v každém řádku
4. ⏳ **Full vyhledávání** - search podobný DOCX šablonám
5. ⏳ **Action buttony** - Add New Role, Refresh, Filters

---

## 🎨 Design podle DOCX šablon

### Action Bar
```jsx
<ActionBar>
  <SearchBox>
    <SearchIcon /> 
    <SearchInput placeholder="Hledat v rolích..." />
  </SearchBox>
  
  <ActionButton $variant="filter" $active={!showInactive}>
    Pouze aktivní
  </ActionButton>
  
  <ActionButton $variant="filter" $active={showInactive}>
    Včetně neaktivních
  </ActionButton>
  
  <ActionButton onClick={fetchData}>
    <faSyncAlt /> Obnovit
  </ActionButton>
  
  <ActionButton $variant="primary">
    <faPlus /> Nová role
  </ActionButton>
</ActionBar>
```

### Tabulka s TanStack Table
```jsx
const columns = [
  { accessorKey: 'nazev_role', header: 'Název role' },
  { accessorKey: 'aktivni', header: 'Status' },
  { accessorKey: 'statistiky.pocet_prav_globalnich', header: 'Globální práva' },
  { accessorKey: 'statistiky.pocet_uzivatelu_s_personalizaci', header: 'Uživatelé' },
  { id: 'actions', header: 'Akce' }
];
```

### Expandable rows
- Kliknutím na řádek se rozbalí detaily
- Zobrazí globální práva
- Zobrazí uživatele s personalizovanými právy

---

## 🔧 Implementace

### ✅ Hotovo

- [x] Import TanStack Table hooks
- [x] Import všech potřebných ikon
- [x] Záloha původního souboru

### ⏳ TODO

- [ ] Styled components podle DOCX vzoru:
  - [ ] Container
  - [ ] ActionBar  
  - [ ] SearchBox, SearchInput, SearchIcon
  - [ ] ActionButton s variantami (primary, filter, default)
  - [ ] TableWrapper, TableContainer
  - [ ] StyledTable, Thead, Tbody, Th, Td
  - [ ] ExpandedRow components
  - [ ] Status badges
  - [ ] Action buttons (Edit, Delete)
  - [ ] Pagination components

- [ ] Main component s TanStack Table:
  - [ ] State management (data, globalFilter, sorting, pagination, expanded)
  - [ ] useReactTable hook setup
  - [ ] Columns definition
  - [ ] Expandable rows logic
  - [ ] fetchData funkce
  - [ ] Search filtering
  - [ ] Active/Inactive toggle

- [ ] Renderování:
  - [ ] Action bar s search a buttony
  - [ ] Tabulka s header
  - [ ] Body s řádky
  - [ ] Expanded rows pro detaily
  - [ ] Pagination controls
  - [ ] Empty state

- [ ] Event handlers:
  - [ ] handleEdit(role)
  - [ ] handleDelete(role)
  - [ ] handleAddNew()
  - [ ] handleRefresh()
  - [ ] toggleRowExpansion(rowId)

---

## 📊 Struktura dat

### Role objekt (z API)
```javascript
{
  id: 1,
  nazev_role: "Administrator",
  popis: "Plný přístup ke všem funkcím",
  aktivni: true,
  statistiky: {
    pocet_prav_globalnich: 25,
    pocet_uzivatelu_s_personalizaci: 3,
    celkem_personalizovanych_prav: 8
  },
  prava_globalni: [
    {
      id: 101,
      kod_prava: "ORDER_MANAGE",
      popis: "Správa objednávek",
      vazba_aktivni: true,
      pravo_aktivni: true
    }
  ],
  prava_personalizovana: [
    {
      user_id: 456,
      username: "jnovak",
      jmeno: "Jan",
      prijmeni: "Novák",
      email: "jan.novak@example.com",
      prava: [
        {
          id: 201,
          kod_prava: "SPECIAL_REPORT",
          popis: "Speciální reporty",
          vazba_aktivni: true,
          pravo_aktivni: true
        }
      ]
    }
  ]
}
```

---

## 🎯 Columns definice

```javascript
const columns = useMemo(() => [
  {
    accessorKey: 'nazev_role',
    header: 'Název role',
    cell: ({ row }) => (
      <RoleName>
        <RoleIcon $inactive={!row.original.aktivni}>
          <Shield />
        </RoleIcon>
        <div>
          <div>{row.original.nazev_role}</div>
          {row.original.popis && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {row.original.popis}
            </div>
          )}
        </div>
      </RoleName>
    ),
  },
  {
    accessorKey: 'aktivni',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge $active={row.original.aktivni}>
        <FontAwesomeIcon icon={row.original.aktivni ? faCheckCircle : faTimesCircle} />
        {row.original.aktivni ? 'Aktivní' : 'Neaktivní'}
      </StatusBadge>
    ),
  },
  {
    accessorKey: 'statistiky.pocet_prav_globalnich',
    header: 'Globální práva',
    cell: ({ row }) => (
      <StatBadge $type="global">
        {row.original.statistiky?.pocet_prav_globalnich || 0}
      </StatBadge>
    ),
  },
  {
    accessorKey: 'statistiky.pocet_uzivatelu_s_personalizaci',
    header: 'Uživatelé',
    cell: ({ row }) => (
      <StatBadge $type="users">
        {row.original.statistiky?.pocet_uzivatelu_s_personalizaci || 0}
      </StatBadge>
    ),
  },
  {
    id: 'actions',
    header: 'Akce',
    cell: ({ row }) => (
      <ActionButtons>
        <IconButton
          $variant="expand"
          onClick={() => row.toggleExpanded()}
        >
          <FontAwesomeIcon icon={row.getIsExpanded() ? faChevronUp : faChevronDown} />
        </IconButton>
        <IconButton
          $variant="edit"
          onClick={() => handleEdit(row.original)}
        >
          <FontAwesomeIcon icon={faEdit} />
        </IconButton>
        <IconButton
          $variant="delete"
          onClick={() => handleDelete(row.original)}
        >
          <FontAwesomeIcon icon={faTrash} />
        </IconButton>
      </ActionButtons>
    ),
  },
], []);
```

---

## 🎨 Gradienty a barvy (podle DOCX)

### Header gradient
```css
background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
```

### Primary button
```css
background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
```

### Role icon (active)
```css
background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
```

### Role icon (inactive)
```css
background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
```

### Stat badges
- **Global rights:** `linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)`
- **Users:** `linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)`
- **Extra rights:** `linear-gradient(135deg, #10b981 0%, #059669 100%)`

---

## 📱 Responsive design

- Tabulka responsive s horizontal scroll
- Action bar se zalamuje na menších obrazovkách
- Search box má max-width 400px
- Mobile: Stack action buttons vertically

---

## ✅ Akceptační kritéria

1. ✅ Design 100% podle DOCX šablon
2. ✅ TanStack Table s full features (sort, filter, pagination, expand)
3. ✅ Search funguje across všech polí (role, popis, práva, uživatelé)
4. ✅ Expandable rows s detaily práv a uživatelů
5. ✅ Action buttony (Edit, Delete) v každém řádku
6. ✅ Add New Role button v action baru
7. ✅ Refresh button
8. ✅ Active/Inactive filter toggle
9. ✅ Pagination controls
10. ✅ Empty state pro žádná data
11. ✅ Loading state během fetch
12. ✅ User-specific localStorage pro nastavení

---

## 🚀 Další fáze (budoucnost)

- [ ] Edit role modal/form
- [ ] Delete confirmation modal
- [ ] Add new role modal/form
- [ ] Drag & drop reorder
- [ ] Export to CSV/Excel
- [ ] Bulk actions (multi-select)
- [ ] Role duplication
- [ ] Role templates

---

**Status:** ✅ Importy hotové, pokračujeme na styled components a main component

