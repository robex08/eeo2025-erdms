# 🎯 Implementační plán: ROLE v hierarchickém diagramu

## ✅ Hotovo
- [x] Opraveny barvy edge pro notifikace (#f59e0b)
- [x] Přidána role do legendy (#8b5cf6 fialová)
- [x] Přidána podpora pro barvu role edge

## 📋 TODO: Kompletní implementace ROLE

### 1. Přidat ROLE do CustomNode komponent (OrganizationHierarchy.js)

V sekci `CustomNode` komponenty přidat podporu pro `data.type === 'role'`:

```javascript
const CustomNode = ({ data, selected }) => {
  const isTemplate = data.type === 'template';
  const isLocation = data.type === 'location';
  const isDepartment = data.type === 'department';
  const isRole = data.type === 'role';  // ← PŘIDAT
  const isUser = !isLocation && !isDepartment && !isTemplate && !isRole;  // ← UPRAVIT
  
  // Přidat rendering pro role node
  if (isRole) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' : 'white',
        border: `3px solid ${selected ? '#8b5cf6' : '#8b5cf6'}`,
        minWidth: '200px',
        boxShadow: selected ? '0 6px 16px rgba(139, 92, 246, 0.4)' : '0 2px 8px rgba(139, 92, 246, 0.15)',
        // ... styling
      }}>
        {/* Ikon role, název, počet uživatelů apod. */}
      </div>
    );
  }
}
```

### 2. Přidat ROLE do sidebaru

V sidebaru přidat novou sekci "Role" podobně jako Templates:

```javascript
<CollapsibleSection>
  <SectionHeader 
    expanded={expandedSections.roles}
    onClick={() => toggleSection('roles')}
  >
    <FontAwesomeIcon icon={faUserShield} />
    <span>Role ({allRoles.length})</span>
    <FontAwesomeIcon icon={expandedSections.roles ? faChevronUp : faChevronDown} />
  </SectionHeader>
  
  {expandedSections.roles && (
    <SectionContent>
      {filteredRoles.map(role => (
        <DraggableItem key={role.id} data-role-id={role.id} data-type="role" draggable onDragStart={(e) => onDragStart(e, role, 'role')}>
          <FontAwesomeIcon icon={faUserShield} style={{ color: '#8b5cf6' }} />
          <span>{role.nazev_role}</span>
        </DraggableItem>
      ))}
    </SectionContent>
  )}
</CollapsibleSection>
```

### 3. Načíst role z API

```javascript
const [allRoles, setAllRoles] = useState([]);
const [searchRoles, setSearchRoles] = useState('');

// V useEffect načíst role
useEffect(() => {
  const fetchRoles = async () => {
    try {
      const response = await apiv2Dictionaries.getRoles({ token, username });
      setAllRoles(response.data || []);
    } catch (error) {
      console.error('Chyba při načítání rolí:', error);
    }
  };
  fetchRoles();
}, [token, username]);
```

### 4. Přidat detail panel pro ROLE node

V sekci `selectedNode` přidat:

```javascript
{/* ROLE NODE */}
{selectedNode && selectedNode.data.type === 'role' && (
  <>
    <FormGroup>
      <Label>Název role</Label>
      <Input value={selectedNode.data.label || selectedNode.data.name} readOnly />
    </FormGroup>
    <FormGroup>
      <Label>Popis</Label>
      <Input value={selectedNode.data.metadata?.popis || 'Neuvedeno'} readOnly />
    </FormGroup>
    
    {/* Zobrazit přiřazené uživatele */}
    <div style={{ marginTop: '16px', padding: '12px', background: '#f3e8ff', border: '2px solid #8b5cf6', borderRadius: '8px' }}>
      <strong>👥 Kdo má tuto roli:</strong>
      <div style={{ marginTop: '8px' }}>
        {(() => {
          // Najít všechny edge vedoucí K této roli (uživatelé přiřazení k roli)
          const usersWithRole = edges
            .filter(e => e.target === selectedNode.id && e.source)
            .map(e => {
              const sourceNode = nodes.find(n => n.id === e.source);
              return sourceNode?.data?.name || 'Neznámý';
            });
          
          return usersWithRole.length > 0 ? (
            <ul>{usersWithRole.map((name, i) => <li key={i}>{name}</li>)}</ul>
          ) : (
            <span style={{ fontStyle: 'italic', color: '#6b7280' }}>Žádní uživatelé</span>
          );
        })()}
      </div>
    </div>
    
    {/* Přiřazené moduly */}
    <div style={{ marginTop: '16px' }}>
      <strong>📋 Moduly pro tuto roli:</strong>
      <CheckboxGroup>
        <CheckboxLabel>
          <input type="checkbox" checked={roleModules.orders} readOnly />
          <span>📋 Objednávky</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <input type="checkbox" checked={roleModules.invoices} readOnly />
          <span>🧾 Faktury</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <input type="checkbox" checked={roleModules.cashbook} readOnly />
          <span>💰 Pokladna</span>
        </CheckboxLabel>
      </CheckboxGroup>
    </div>
  </>
)}
```

### 5. Přidat podporu edge role-user

V `getRelationshipTypeInfo` přidat:

```javascript
'role-user': {
  label: 'Role → Uživatel',
  icon: '🛡️→👤',
  description: 'Uživatel má přiřazenou roli s právy',
  sourceLabel: 'Role (sada práv)',
  targetLabel: 'Uživatel (má roli)',
  showScope: false,
  showExtended: false,
  showModules: true, // Role určuje moduly
  explanation: (source, target) => `${target} má přiřazenou roli ${source} s definovanými právy a moduly.`
},
'user-role': {
  label: 'Uživatel → Role',
  icon: '👤→🛡️',
  description: 'Uživatel je přiřazen k roli',
  sourceLabel: 'Uživatel',
  targetLabel: 'Role',
  showScope: false,
  showExtended: false,
  showModules: true,
  explanation: (source, target) => `${source} je přiřazen k roli ${target}.`
}
```

### 6. Edge panel pro role

Když je vybrán edge mezi uživatelem a rolí, zobrazit:
- Jaké moduly role povoluje
- Jaká práva role obsahuje
- Zda jsou notifikace aktivní pro tuto roli

### 7. Notifikace pro role

V edge panelu pro notifikace přidat podporu pro `template-role`:

```javascript
'template-role': {
  label: 'Notifikační šablona → Role',
  icon: '📧→🛡️',
  description: 'Všichni uživatelé v roli budou dostávat notifikace',
  sourceLabel: 'Notifikační šablona',
  targetLabel: 'Příjemci (role)',
  showScope: false,
  showExtended: false,
  showModules: false,
  explanation: (source, target) => `VŠICHNI uživatelé s rolí ${target} budou dostávat notifikace typu "${source}".`
}
```

## 🔧 Technické detaily

### Databázová struktura (již existuje):
- `25_role` - tabulka rolí
- `25_uzivatel_role` - vazba uživatel ↔ role
- `25_role_prava` - vazba role ↔ práva (user_id = -1 pro globální práva role)

### API endpointy (již existují):
- `GET /api.eeo/ciselniky/role/list` - seznam rolí
- `GET /api.eeo/ciselniky/role/detail/:id` - detail role včetně práv
- `POST /api.eeo/ciselniky/role/assign-pravo` - přiřadit právo k roli
- `POST /api.eeo/ciselniky/role/remove-pravo` - odebrat právo z role

## 🎨 Design konzistence

Role nodes by měly:
- Mít **fialovou barvu** (#8b5cf6)
- Ikonu **🛡️ nebo faUserShield**
- Zobrazovat **počet uživatelů** kteří mají roli
- Mít **source handle** (vlevo) pro příchozí spojení z uživatelů
- Mít **target handle** (vpravo) pro odchozí spojení k notifikacím

## ⚠️ Důležité poznámky

1. **Role vs. Práva**: Role je skupina práv. Uživatel může mít více rolí.
2. **Hierarchie**: Role NEMAJÍ hierarchii mezi sebou (nejsou podřízené/nadřízené).
3. **Notifikace**: Můžu přiřadit notifikační šablonu k roli → všichni v roli dostanou notifikace.
4. **Moduly**: Role určuje ke kterým modulům má uživatel přístup (objednávky, faktury, pokladna).
5. **Scope**: Scope (OWN/TEAM/LOCATION/ALL) je na úrovni vztahu uživatel-uživatel, NE na úrovni role.

## 🧪 Testování

1. Přetáhnout roli do canvasu
2. Propojit uživatele s rolí
3. Propojit notifikační šablonu s rolí
4. Ověřit že detail panelu správně zobrazuje informace
5. Ověřit barvy edge podle legendy

---

**Status**: Základní struktura připravena, čeká na kompletní implementaci.
**Priorita**: HIGH - role jsou klíčová část RBAC systému
