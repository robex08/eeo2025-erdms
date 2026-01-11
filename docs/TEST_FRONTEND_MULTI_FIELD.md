# TEST: Frontend Multi-Field Implementace

## Datum: 4. ledna 2026
## Kontext: Rozšíření frontend UI pro multi-field výběr uživatelských polí

## Implementované změny

### 1. State Management
```javascript
// LEGACY - single field (kompatibilita)
const [targetScopeField, setTargetScopeField] = useState('prikazce_id');

// NOVÝ - multi-field systém
const [targetScopeFields, setTargetScopeFields] = useState(['prikazce_id']);
```

### 2. Kompletní seznam uživatelských polí
- **25a_objednavky:** uzivatel_id, uzivatel_akt_id, garant_uzivatel_id, objednatel_id, schvalovatel_id, prikazce_id, odesilatel_id, dodavatel_potvrdil_id, zverejnil_id, fakturant_id, dokoncil_id, potvrdil_vecnou_spravnost_id, zamek_uzivatel_id
- **25a_faktury:** fa_predana_zam_id, vytvoril_uzivatel_id, aktualizoval_uzivatel_id

### 3. UI Komponenty
- Nahrazení dropdown selectu checkboxes multi-selectem
- Vizuální feedback pro vybraná pole
- Indikátory pro tabulku původu každého pole
- Validace - musí být vybrán alespoň 1 pole

### 4. Backend kompatibilita
- Ukládá se `fields: [...] ` (NOVÝ)
- Ukládá se `field: "..."` (LEGACY pro zpětnou kompatibilitu)
- Backend podporuje oba formáty

## Test flow
1. ✅ Otevřít organizační hierarchii
2. ✅ Kliknout na cílový uzel (TARGET)
3. ✅ Vybrat "Dynamicky z pole entity"
4. ✅ Zobrazí se checkboxes s všemi uživatelskými poli
5. ✅ Vybrat více polí (např. prikazce_id + garant_uzivatel_id + objednatel_id)
6. ✅ Uložit konfiguraci
7. ✅ Backend zpracuje multi-field notifikace

## Status: IMPLEMENTOVÁNO ✅
Frontend UI nyní podporuje výběr více uživatelských polí současně pomocí checkboxes.

## Benefity
- **Redukce workflow uzlů:** Jeden uzel může notifikovat více rolí současně
- **Flexibilita:** Možnost přesného výběru relevantních polí pro každý typ události
- **Kompatibilita:** Zachována zpětná kompatibilita se starými konfiguracemi
- **Přehlednost:** Vizuální indikace původní tabulky každého pole