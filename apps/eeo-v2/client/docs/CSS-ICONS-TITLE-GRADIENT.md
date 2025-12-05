# Přidání ikon a modrého gradientového pozadí k titulkům

**Datum:** 18. října 2025  
**Status:** ✅ DOKONČENO

## 🎯 Cíl
1. Přidat ikony k názvům stránek (VPRAVO od textu)
2. Akční ikony v buttonech ponechat VLEVO
3. Doplnit modré gradientové pozadí pod titulky jako na Orders25List

## 📋 Provedené změny

### 1. **Orders25List.js** ✅

#### Přidání ikony k titulku:
```jsx
<YearFilterTitle>
  {/* cache status komponenty */}
  Přehled objednávek
  <FontAwesomeIcon icon={faClipboardList} style={{ marginLeft: '0.5rem' }} />
</YearFilterTitle>
```

**Ikona:** `faClipboardList` (schránka se seznamem) - vpravo  
**Pozadí:** Již existuje `YearFilterPanel` s gradientem

---

### 2. **Users.js** ✅

#### Nový styled component `TitlePanel`:
```css
const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;
```

#### Upravený PageTitle:
```css
const PageTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;                              /* ← změněno z #1e293b */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* ← přidáno */
`;
```

#### JSX struktura:
```jsx
<TitlePanel>
  <PageTitle>
    Správa uživatelů
    <FontAwesomeIcon icon={faUsers} />  {/* ikona vpravo */}
  </PageTitle>
</TitlePanel>

<ActionBar>
  <ActionButton onClick={fetchUsers}>
    <FontAwesomeIcon icon={faSyncAlt} />  {/* ikona vlevo */}
    Obnovit
  </ActionButton>
  {/* další action buttony */}
</ActionBar>
```

**Ikona:** `faUsers` (více uživatelů) - vpravo  
**Pozadí:** Modrý gradient `#1e40af → #3b82f6`

---

### 3. **AddressBookPage.js** ✅

#### Import FontAwesome ikony:
```javascript
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAddressBook } from '@fortawesome/free-solid-svg-icons';
```

#### Nový styled component `TitlePanel`:
```css
const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;
```

#### Upravený PageTitle:
```css
const PageTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;                              /* ← změněno z #1e293b */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* ← přidáno */
`;
```

#### JSX struktura:
```jsx
<TitlePanel>
  <PageTitle>
    Adresář
    <FontAwesomeIcon icon={faAddressBook} />  {/* ikona vpravo */}
  </PageTitle>
</TitlePanel>
```

**Změny:**
- Emoji `📚` nahrazeno FontAwesome ikonou `faAddressBook`
- Titulek zkrácen z "Adresář kontaktů" na "Adresář"
- Přidán modrý gradient pozadí

**Ikona:** `faAddressBook` (adresář/kniha kontaktů) - vpravo  
**Pozadí:** Modrý gradient `#1e40af → #3b82f6`

---

### 4. **Dictionaries.js** ✅

#### Import ikony:
```javascript
import { faSyncAlt, faBook } from '@fortawesome/free-solid-svg-icons';
```

#### Nový styled component `TitlePanel`:
```css
const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;
```

#### Upravený DictionariesTitle:
```css
const DictionariesTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;                              /* ← změněno z #1e293b */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* ← přidáno */
  
  &[data-mode='dark'] { 
    color: white;                             /* ← změněno z #f1f5f9 */
  }
`;
```

#### JSX struktura:
```jsx
<TitlePanel>
  <DictionariesTitle>
    Číselníky
    <FontAwesomeIcon icon={faBook} />  {/* ikona vpravo */}
  </DictionariesTitle>
</TitlePanel>
```

**Změny:**
- Odstraněn `RefreshIcon` z titulku (byl tam `faSyncAlt`)
- Nahrazen ikonou `faBook` (kniha/číselníky)
- `DictionariesHeader` nahrazen `TitlePanel`

**Ikona:** `faBook` (kniha/slovník) - vpravo  
**Pozadí:** Modrý gradient `#1e40af → #3b82f6`

---

## 🎨 Standardní TitlePanel styling

Všechny stránky nyní používají jednotný `TitlePanel`:

```css
const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;        /* ← zarovnání vpravo */
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;

const PageTitle = styled.h1`        /* nebo DictionariesTitle */
  margin: 0;
  font-size: calc(1.5rem + 3px);    /* ← stejná velikost jako Orders25List */
  font-weight: 700;
  color: white;                      /* ← bílý text na modrém pozadí */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);  /* ← jemný stín */
`;
```

## 📊 Přehled ikon

| Stránka | Ikona | Pozice | Popis |
|---------|-------|--------|-------|
| **Orders25List** | `faClipboardList` | vpravo | Schránka se seznamem objednávek |
| **Users** | `faUsers` | vpravo | Skupina uživatelů |
| **AddressBook** | `faAddressBook` | vpravo | Adresář kontaktů |
| **Dictionaries** | `faBook` | vpravo | Kniha/slovník číselníků |

### Akční ikony (vlevo v buttonech):
- `faSyncAlt` - Obnovit/Refresh
- `faDashboard` - Dashboard
- `faFilter` - Filtr
- `faFileExport` - Export
- `faPlus` - Přidat
- `faEraser` - Debug
- atd.

## 🎯 Princip umístění ikon

### ✅ SPRÁVNĚ:
```jsx
{/* Ikona titulku - VPRAVO */}
<PageTitle>
  Název stránky
  <FontAwesomeIcon icon={faIkona} />
</PageTitle>

{/* Akční ikona - VLEVO */}
<ActionButton>
  <FontAwesomeIcon icon={faAkce} />
  Text akce
</ActionButton>
```

### ❌ ŠPATNĚ:
```jsx
{/* Ikona titulku - NE vlevo */}
<PageTitle>
  <FontAwesomeIcon icon={faIkona} />
  Název stránky
</PageTitle>

{/* Akční ikona - NE vpravo */}
<ActionButton>
  Text akce
  <FontAwesomeIcon icon={faAkce} />
</ActionButton>
```

## ✅ Výsledek

Všechny stránky mají nyní:
1. ✅ Modrý gradientový panel s bílým textem
2. ✅ Ikony umístěné VPRAVO od názvu
3. ✅ Jednotný styling `calc(1.5rem + 3px)`
4. ✅ Text-shadow pro lepší čitelnost
5. ✅ Box-shadow pro 3D efekt panelu
6. ✅ Zarovnání vpravo (`justify-content: flex-end`)

---

**Autor:** GitHub Copilot  
**Datum dokončení:** 18. října 2025
