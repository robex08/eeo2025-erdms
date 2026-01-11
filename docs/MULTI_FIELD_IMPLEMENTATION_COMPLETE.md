# 📋 KOMPLETNÍ MULTI-FIELD IMPLEMENTACE - DOKUMENTACE

## 🎯 Přehled

Byla úspěšně implementována kompletní podpora multi-field selekce v notifikačním systému hierarchie organizace, která rozšiřuje původní single-field funkčnost na možnost výběru více uživatelských polí současně.

## ✅ Implementované funkce

### 1. **Backend validace a ukládání** (`hierarchyHandlers.php`)

**Co bylo přidáno:**
- ✅ Automatická migrace starého formátu `field` → `fields` array
- ✅ Validace všech polí proti seznamu povolených uživatelských polí
- ✅ Normalizace dat před uložením do databáze
- ✅ Verzování struktury (v1.1 pro multi-field support)
- ✅ Kompletní zpětná kompatibilita

**Podporovaná pole:**
```php
$validFields = [
    'uzivatel_id',           // Základní uživatel
    'uzivatel_akt_id',       // Aktuální uživatel
    'garant_uzivatel_id',    // Garant objednávky
    'objednatel_id',         // Objednatel
    'schvalovatel_id',       // Schvalovatel
    'prikazce_id',           // Příkazce
    'zamek_uzivatel_id',     // Uzamčeno uživatelem
    'vytvoril_uzivatel_id',  // Vytvořil uživatel
    'aktualizoval_uzivatel_id', // Aktualizoval uživatel
    'potvrdil_dodavatel_id', // Potvrdil dodavatel (faktury)
    'prikazce_fakturace_id'  // Příkazce fakturace
];
```

### 2. **Frontend localStorage management** (`OrganizationHierarchy.js`)

**Co bylo přidáno:**
- ✅ Automatická migrace localStorage dat ze starého formátu
- ✅ Validace polí před uložením do localStorage
- ✅ Metadata tracking pro verzování
- ✅ Synchronizace UI stavů s node/edge konfigurací
- ✅ Ochrana proti nevalidním polím

**Funkce:**
```javascript
// Automatická migrace při načítání
if (scope.field && !scope.fields) {
  normalized.data.scopeDefinition.fields = [scope.field];
  delete normalized.data.scopeDefinition.field;
}

// Validace polí
normalized.data.scopeDefinition.fields = scope.fields.filter(field => {
  return validFields.includes(field);
});
```

### 3. **UI komponenty** (již existující)

Frontend už měl implementované:
- ✅ Checkboxy pro výběr více polí současně  
- ✅ Multi-field pole `targetScopeFields` a `sourceInfoFields`
- ✅ Vizuální indikace vybraných polí
- ✅ Automatické ukládání změn

## 🔧 Technické detaily

### Backend flow:
1. **Receive data** → Raw nodes/edges z frontendu
2. **Migrate** → Starý `field` → nový `fields` array
3. **Validate** → Kontrola proti whitelistu povolených polí
4. **Normalize** → Odstranění nevalidních polí, deduplikace
5. **Save** → Uložení do `25_hierarchie_profily.structure_json`

### Frontend flow:
1. **Load localStorage** → Zkontrolovat drafty
2. **Check version** → Detekce potřeby migrace
3. **Migrate & validate** → Převod na multi-field + validace
4. **Sync UI** → Aktualizace stavů `targetScopeFields`/`sourceInfoFields`
5. **Auto-save** → Kontinuální ukládání do localStorage

### Database structure:
```json
{
  "version": "1.1",
  "saved_at": "2026-01-04 ...",
  "nodes": [
    {
      "id": "node-123",
      "data": {
        "scopeDefinition": {
          "fields": ["prikazce_id", "objednatel_id", "garant_uzivatel_id"]
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-456", 
      "data": {
        "source_info_recipients": {
          "fields": ["uzivatel_id", "schvalovatel_id"]
        }
      }
    }
  ]
}
```

## 🧪 Testování

### Testovací scénáře:
1. ✅ **Migrace starých dat** - `field` → `fields`
2. ✅ **Validace nevalidních polí** - odstranění `INVALID_FIELD`
3. ✅ **Backend-frontend konzistence** - stejná normalizace
4. ✅ **Perzistence localStorage** - ukládání s metadaty
5. ✅ **Database versioning** - verze 1.1 struktura

### Výsledky testů:
```
✅ Backend: Validace a normalizace multi-field konfigurace
✅ Database: Ukládání s verzí 1.1 a metadata  
✅ Frontend: localStorage synchronizace a migrace
✅ Všechna uživatelská pole z objednávek a faktur podporována
```

## 📚 Usage 

### Pro vývojáře:

**Backend rozšíření:**
```php
// Přidání nového uživatelského pole
$validFields[] = 'nove_uzivatel_pole_id';
```

**Frontend konfigurace:**
```javascript
// Výběr více polí pro target node
setTargetScopeFields(['prikazce_id', 'objednatel_id', 'garant_uzivatel_id']);

// Výběr více polí pro edge source info
setSourceInfoFields(['uzivatel_id', 'schvalovatel_id']);
```

### Pro uživatele:

1. **Vyberte target node** (komu se posílají notifikace)
2. **Zaškrtněte více polí** v sekci "Pole entity" 
3. **Systém automaticky resolvuje** všechny uživatele z vybraných polí
4. **Duplikáty jsou automaticky odstraněny**
5. **Role filtering zůstává zachováno**

## 🔒 Bezpečnost

- ✅ **Whitelist validation** - pouze povolená pole
- ✅ **SQL injection protection** - prepared statements
- ✅ **Input sanitization** - validace na backend i frontend
- ✅ **Backward compatibility** - žádné breaking changes

## 📈 Performance

- ✅ **Minimal overhead** - validace O(n) where n = počet polí 
- ✅ **Efficient storage** - localStorage compression
- ✅ **Auto-cleanup** - staré drafty se automaticky mažou
- ✅ **Lazy loading** - migrace jen při potřebě

## 🎯 Výsledek

Uživatelé moyen nyní vybírat více uživatelských polí současně z jednoho node v hierarchii, čím se významně snižuje počet potřebných nodes a edges pro pokrytí komplexních notifikačních scénářů.

**Příklad:**
Dříve: 3 nodes pro `prikazce_id`, `objednatel_id`, `garant_uzivatel_id`
Nyní: 1 node s multi-field `[prikazce_id, objednatel_id, garant_uzivatel_id]`

---

*Implementace dokončena 4.1.2026 - plně funkční a otestované.*