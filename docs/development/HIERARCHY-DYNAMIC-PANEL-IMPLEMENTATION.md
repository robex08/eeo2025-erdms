# Implementace Dynamického Detail Panelu

## Cíl
Detail panel musí zobrazovat relevantní informace podle typu vztahu (edge):

- **user → user**: Klasický nadřízený-podřízený (všechny možnosti)
- **location → user**: Lokalita sdílí všechny své uživatele nadřízenému
- **user → location**: Nadřízený vidí všechny uživatele v lokalitě
- **department → user**: Úsek sdílí všechny své uživatele nadřízenému
- **user → department**: Nadřízený vidí všechny uživatele v úseku

## Aktuální Stav

### ✅ Hotovo:
1. Helper funkce `getRelationshipTypeInfo()` s definicemi všech typů
2. Badge zobrazující typ vztahu (👤→👤, 📍→👤, etc.)
3. Dynamické labely pro source/target pole

### ❌ Potřebné úpravy:

#### 1. Vysvětlení logiky vztahu
**Současný stav**: Pevný text pro user-user
```jsx
<strong>{sourceNode?.data?.name?.split(' ')[0]}</strong> získá práva vidět data od <strong>{targetNode?.data?.name?.split(' ')[0]}</strong>
```

**Požadované**: Dynamický text z `relationInfo.explanation(source, target)`

#### 2. Druh vztahu (prime/zastupovani)
**Zobrazit pouze**: `relationInfo.showScope === true` (tj. jen user-user)

#### 3. Rozsah viditelnosti (Scope)
**Zobrazit pouze**: `relationInfo.showScope === true` (tj. jen user-user)

**Pro ostatní typy**: Zobrazit info box "Rozsah je automaticky určen typem vztahu"

#### 4. Rozšířené lokality/úseky
**Zobrazit pouze**: `relationInfo.showExtended === true`

**Logika**:
- `user-user`: ANO - nadřízený může mít přístup k extra lokalitám/úsekům
- `location-user`: NE - scope je automaticky LOCATION
- `user-location`: ANO - lze přidat extra lokality
- `department-user`: NE - scope je automaticky TEAM
- `user-department`: ANO - lze přidat extra úseky

#### 5. Viditelné moduly
**Zobrazit vždy**: `relationInfo.showModules === true` (všechny typy)

Moduly určují, KTERÉ TYPY dat nadřízený uvidí (objednávky/faktury/pokladna).

## Implementace

### Krok 1: Opravit vysvětlení
Nahradit pevný text za:
```jsx
{relationInfo.explanation(
  sourceNode?.data?.label || sourceNode?.data?.name?.split(' ')[0],
  targetNode?.data?.label || targetNode?.data?.name?.split(' ')[0]
)}
```

### Krok 2: Podmínit Druh vztahu
Zabalit do:
```jsx
{relationInfo.showScope && (
  <FormGroup>
    <Label>Druh vztahu</Label>
    <Select value={relationshipType}...>
      ...
    </Select>
  </FormGroup>
)}
```

### Krok 3: Podmínit Rozsah viditelnosti
```jsx
{relationInfo.showScope ? (
  <FormGroup>
    <Label>Rozsah viditelnosti (Scope)</Label>
    ...
  </FormGroup>
) : (
  <div style={{ ... }}>
    ℹ️ Rozsah je automaticky určen typem vztahu
  </div>
)}
```

### Krok 4: Podmínit Rozšířené lokality/úseky
Najít sekci s CustomSelect pro lokality/úseky a zabalit do:
```jsx
{relationInfo.showExtended && (
  <>
    {/* Rozšířené lokality */}
    ...
    {/* Rozšířené úseky */}
    ...
  </>
)}
```

## Test Scénáře

### Uživatel → Uživatel
- ✅ Zobrazit: Druh vztahu, Rozsah, Rozšířené lokality/úseky, Moduly, Permission level
- Vysvětlení: "Jan získá práva vidět data od Petra podle nastavení rozsahu a modulů."

### Lokalita → Uživatel  
- ❌ Skrýt: Druh vztahu, Rozsah, Rozšířené lokality/úseky
- ✅ Zobrazit: Moduly, Permission level
- Vysvětlení: "Jan získá práva vidět data od VŠECH uživatelů v lokalitě Beroun."
- Info: "Rozsah je automaticky určen typem vztahu (LOCATION)"

### Uživatel → Lokalita
- ❌ Skrýt: Druh vztahu, Rozsah
- ✅ Zobrazit: Rozšířené lokality (lze přidat další), Moduly, Permission level
- Vysvětlení: "Jan získá práva vidět data od VŠECH uživatelů v lokalitě Beroun."

### Úsek → Uživatel
- ❌ Skrýt: Druh vztahu, Rozsah, Rozšířené lokality/úseky
- ✅ Zobrazit: Moduly, Permission level
- Vysvětlení: "Jan získá práva vidět data od VŠECH uživatelů v úseku IT."
- Info: "Rozsah je automaticky určen typem vztahu (TEAM)"

### Uživatel → Úsek
- ❌ Skrýt: Druh vztahu, Rozsah
- ✅ Zobrazit: Rozšířené úseky (lze přidat další), Moduly, Permission level
- Vysvětlení: "Jan získá práva vidět data od VŠECH uživatelů v úseku IT."

## DB Schema Poznámky

V `25_hierarchie_vztahy` máme pole `typ_vztahu`:
- `user-user`
- `location-user`  
- `user-location`
- `department-user`
- `user-department`

Frontend detekuje typ z `sourceNode.data.type` a `targetNode.data.type`.

## UI/UX Principy

1. **Méně je více**: Skrýt pole, která nedávají smysl pro daný typ vztahu
2. **Jasné vysvětlení**: Info boxy vysvětlují, proč některá pole nejsou k dispozici
3. **Konzistentní styling**: Všechny typy vztahů mají stejný vizuální jazyk
4. **Barevné kódování**:
   - 🟢 Zelená: Nadřízený (získává práva)
   - 🔵 Modrá: Podřízený/Zdroj (sdílí data)
   - 🟣 Fialová: Badge typu vztahu

## Commit Message Template
```
RH: Dynamický detail panel podle typu vztahu

✅ Podmíněné zobrazení polí podle relationInfo:
- Druh vztahu: jen user-user
- Rozsah viditelnosti: jen user-user  
- Rozšířené lokality/úseky: podle relationInfo.showExtended

✅ Dynamické vysvětlení podle typu vztahu:
- location→user: "vidí VŠECHNY uživatele v lokalitě"
- department→user: "vidí VŠECHNY uživatele v úseku"
- user-user: klasické nadřízený-podřízený

✅ Info boxy pro non-user-user vztahy:
"Rozsah je automaticky určen typem vztahu"

📊 Podporované typy:
user-user, location-user, user-location, department-user, user-department
```
