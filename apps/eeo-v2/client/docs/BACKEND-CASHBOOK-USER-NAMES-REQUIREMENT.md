# Backend Requirement: Jména uživatelů v pokladní knize

## Problém
Frontend pro PDF export a zobrazení stavu knihy potřebuje **celá jména uživatelů** (s titulem), kteří knihu uzavřeli nebo zamkli.

## Požadavek na Backend API

### Endpoint: `GET /api/cashbooks/{id}` nebo `GET /api/cashbooks/list`

Backend musí v objektu `book` vracet následující pole:

```php
[
    'id' => 123,
    'stav_knihy' => 'uzavrena_uzivatelem', // nebo 'zamknuta_spravcem'
    'uzivatel_id' => 456,
    
    // ✅ NOVÁ POLE - JOIN s tabulkou 25_uzivatele
    'uzivatel_jmeno_plne' => 'MUDr. Jan Novák, Ph.D.',  // Celé jméno vlastníka knihy
    
    // Pokud je uzavřená uživatelem:
    'uzavrena_uzivatelem_kdy' => '2025-11-09 15:30:00',
    
    // Pokud je zamčená správcem:
    'zamknuta_spravcem_kdy' => '2025-11-09 16:00:00',
    'zamknuta_spravcem_kym' => 789,
    'zamknul_spravce_jmeno_plne' => 'Ing. Petr Svoboda, CSc.',  // Celé jméno správce
    
    // ... ostatní pole
]
```

### SQL příklad

```sql
SELECT 
    pk.*,
    -- Jméno vlastníka knihy
    CONCAT_WS(' ', 
        u.titul_pred, 
        u.jmeno, 
        u.prijmeni, 
        u.titul_za
    ) AS uzivatel_jmeno_plne,
    
    -- Jméno správce, který zamknul
    CONCAT_WS(' ', 
        s.titul_pred, 
        s.jmeno, 
        s.prijmeni, 
        s.titul_za
    ) AS zamknul_spravce_jmeno_plne
    
FROM 25a_pokladni_knihy pk
LEFT JOIN 25_uzivatele u ON pk.uzivatel_id = u.id
LEFT JOIN 25_uzivatele s ON pk.zamknuta_spravcem_kym = s.id
WHERE pk.id = ?
```

## Použití na Frontendu

Tato jména se zobrazují:
1. **V PDF exportu** - vizitka stavu knihy (oranžová/červená karta nahoře)
2. **V UI** - badge "Uzavřena dne: ... / Uzavřel: ..."

## Fallback

Pokud backend nevrací tato pole, frontend použije:
- Pro vlastní knihu: údaje z `userDetail` (přihlášený uživatel)
- Pro cizí knihu: `ID: 123` (zobrazí jen ID)

## Priority
**VYSOKÁ** - bez tohoto se v PDF nezobrazí kompletní informace o tom, kdo knihu uzavřel/zamknul.
