# Vylepšení fulltextového vyhledávání a parametr archivovano

## Datum: 19. října 2025

## 1. Parametr archivovano při editaci objednávky ✅

### Problém
Při otevírání objednávky k editaci ze seznamu se nenačítaly archivované objednávky, protože API bez parametru `archivovano=1` blokuje jejich načtení.

### Řešení
Přidán parametr `archivovano=1` do URL při otevírání objednávky k editaci.

### Změny v souborech

#### Orders25List.js
```javascript
// Při otevírání konceptu
navigate(`/order-form-25?edit=${order.id || order.objednavka_id}&archivovano=1`);

// Při načítání objednávky z DB
navigate(`/order-form-25?edit=${orderId}&archivovano=1`);
```

#### OrderForm25.js
```javascript
// Načtení parametru z URL
const archivovanoParam = urlParams.get('archivovano');

// Použití při načítání objednávky pro editaci
const dbOrder = await getOrder25({
  token,
  username,
  orderId: editOrderId,
  archivovano: archivovanoParam ? 1 : undefined
});

// Použití při kopírování objednávky
const response = await getOrder25({
  token,
  username,
  orderId: copyOrderId,
  archivovano: archivovanoParam ? 1 : undefined
});

// Při revalidaci vždy zahrnout archivované
const dbOrder = await getOrder25({ 
  token, 
  username, 
  orderId,
  archivovano: 1
});
```

#### api25orders.js
```javascript
export async function getOrder25({ token, username, orderId, archivovano }) {
  const payload = { 
    token, 
    username,
    id: orderId
  };
  
  // Pokud je archivovano nastaveno, přidej do payload
  if (archivovano) {
    payload.archivovano = archivovano;
  }
  
  // ... zbytek kódu
}
```

---

## 2. Ikona lupy a clear tlačítko ve fulltextových inputech ✅

### Problém
Fulltextové inputy neměly vizuální indikátor pro vyhledávání (lupa) a chybělo tlačítko pro rychlé vymazání textu.

### Řešení
Přidána ikona lupy jako prefix (vlevo) a clear tlačítko (křížek) vpravo do všech fulltextových inputů.

### Změny v souborech

#### Orders25List.js - Styled komponenty

##### 1. Hlavní fulltextový input (FilterInputWithIcon)
```javascript
const FilterInputWithIcon = styled.div`
  position: relative;
  width: 100%;
  
  > svg:first-of-type {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;
  
  &:hover {
    color: #6b7280;
  }
  
  > svg {
    width: 14px !important;
    height: 14px !important;
  }
`;

const FilterInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.75rem 2.5rem 0.75rem 2.5rem' : '0.75rem'};
  // ... zbytek
`;
```

##### 2. Column filter inputy (v tabulce)
```javascript
const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  
  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 16px;
  height: 16px;
  
  &:hover {
    color: #6b7280;
  }
  
  > svg {
    width: 10px !important;
    height: 10px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  // ... zbytek
`;
```

#### JSX implementace

##### Hlavní fulltext input
```jsx
<FilterInputWithIcon>
  <FontAwesomeIcon icon={faSearch} />
  <FilterInput
    type="text"
    placeholder="Hledat v evidenčním čísle, předmětu, objednateli..."
    value={globalFilter}
    onChange={(e) => setGlobalFilter(e.target.value)}
    hasIcon
  />
  {globalFilter && (
    <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
      <FontAwesomeIcon icon={faTimes} />
    </ClearButton>
  )}
</FilterInputWithIcon>
```

##### Column filter input (v tabulce)
```jsx
<ColumnFilterWrapper>
  <FontAwesomeIcon icon={faSearch} />
  <ColumnFilterInput
    type="text"
    placeholder={`Hledat ${header.column.columnDef.header}...`}
    value={columnFilters[header.column.columnDef.accessorKey] || ''}
    onChange={(e) => {
      const newFilters = { ...columnFilters };
      newFilters[header.column.columnDef.accessorKey] = e.target.value;
      setColumnFilters(newFilters);
    }}
  />
  {columnFilters[header.column.columnDef.accessorKey] && (
    <ColumnClearButton 
      onClick={() => {
        const newFilters = { ...columnFilters };
        delete newFilters[header.column.columnDef.accessorKey];
        setColumnFilters(newFilters);
      }}
      title="Vymazat"
    >
      <FontAwesomeIcon icon={faTimes} />
    </ColumnClearButton>
  )}
</ColumnFilterWrapper>
```

---

## Výsledek

### ✅ Parametr archivovano
- Objednávky se nyní správně načítají i když jsou archivované
- Parametr se předává automaticky při otevírání k editaci
- Při revalidaci se vždy zahrnují archivované objednávky

### ✅ Vylepšení UX vyhledávání
- **Ikona lupy (prefix)**: Vizuální indikace vyhledávacího pole
- **Clear tlačítko**: Rychlé vymazání textu jedním kliknutím
- **Konzistentní design**: Stejný pattern pro hlavní i column filtry
- **Podmíněné zobrazení**: Clear tlačítko se zobrazí jen když je něco napsáno
- **Bez pozadí**: Křížek je transparentní, jen se mění barva při hover

---

## Testování

### Před nasazením ověřte:
1. ✅ Načítání archivovaných objednávek funguje
2. ✅ Clear tlačítko vymaže text v hlavním fulltextu
3. ✅ Clear tlačítko vymaže text v column filtrech
4. ✅ Ikona lupy je viditelná vlevo
5. ✅ Clear tlačítko se zobrazí jen když je text
6. ✅ Hover efekt na clear tlačítku funguje
7. ✅ Žádné chyby v konzoli

---

**Status:** ✅ HOTOVO
**Autor:** AI Assistant
**Datum:** 19. října 2025
