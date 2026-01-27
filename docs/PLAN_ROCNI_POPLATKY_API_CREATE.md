# 🔌 API ENDPOINT - Vytvoření ročního poplatku s automatickým generováním položek

## POST annual-fees/create

### ⚡ AUTOMATICKÉ GENEROVÁNÍ POLOŽEK

Backend **automaticky vytvoří položky** podle typu `platba`:

| Typ platby | Počet položek | Automatické názvy | Splatnost |
|------------|---------------|-------------------|-----------|
| `MESICNI` | 12 | Leden 2026, Únor 2026, ... | 20. den každého měsíce |
| `KVARTALNI` | 4 | Q1 2026, Q2 2026, Q3 2026, Q4 2026 | Poslední den kvartálu |
| `ROCNI` | 1 | Roční poplatek 2026 | 31.12. daného roku |
| `JINA` | 0 | Žádné (přidávají se manuálně) | - |

---

### INPUT

```json
{
  "token": "abc123...",
  "username": "jan.novak",
  "smlouva_id": 123,
  "nazev": "Roční poplatky 2026 - Nájem kanceláří",
  "popis": "Měsíční nájemné za kancelářské prostory v budově A",
  "rok": 2026,
  "druh": "NAJEMNI",              // Z číselníku: NAJEMNI|ENERGIE|POPLATKY|JINE
  "platba": "MESICNI",             // Z číselníku: MESICNI|KVARTALNI|ROCNI|JINA
  "castka_na_polozku": 1000.00,   // Částka jedné položky (všechny stejné)
  "datum_prvni_splatnosti": "2026-01-20",  // První splatnost (další se dopočítají)
  "rozsirujici_data": {
    "variabilni_symbol": "12548",
    "poznamka": "Automaticky generováno"
  }
}
```

---

### OUTPUT - Úspěch

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "nazev": "Roční poplatky 2026 - Nájem kanceláří",
    "rok": 2026,
    "druh": "NAJEMNI",
    "druh_nazev": "Nájemní",
    "platba": "MESICNI",
    "platba_nazev": "Měsíční",
    "celkova_castka": 12000.00,
    "pocet_polozek": 12,
    "polozky_vytvoren": [
      { "poradi": 1, "nazev": "Leden 2026", "castka": 1000.00, "splatnost": "2026-01-20" },
      { "poradi": 2, "nazev": "Únor 2026", "castka": 1000.00, "splatnost": "2026-02-20" },
      { "poradi": 3, "nazev": "Březen 2026", "castka": 1000.00, "splatnost": "2026-03-20" },
      "... (dalších 9 měsíců)"
    ],
    "message": "Roční poplatek byl úspěšně vytvořen včetně 12 měsíčních položek"
  }
}
```

---

### OUTPUT - Chyba

```json
{
  "status": "error",
  "message": "Smlouva s ID 123 neexistuje",
  "error_code": "SMLOUVA_NOT_FOUND"
}
```

---

## POST annual-fees/add-item (pro typ platby "JINÁ")

### INPUT

```json
{
  "token": "abc123...",
  "username": "jan.novak",
  "rocni_poplatek_id": 1,
  "nazev_polozky": "Mimořádná platba - oprava",
  "castka": 1500.00,
  "datum_splatnosti": "2026-03-15",
  "poznamka": "Jednorázová platba za opravu",
  "rozsirujici_data": {
    "custom_field": "value"
  }
}
```

### OUTPUT

```json
{
  "status": "success",
  "data": {
    "id": 25,
    "rocni_poplatek_id": 1,
    "nazev_polozky": "Mimořádná platba - oprava",
    "castka": 1500.00,
    "datum_splatnosti": "2026-03-15",
    "stav": "NEZAPLACENO",
    "message": "Položka byla úspěšně přidána"
  }
}
```

---

## BACKEND LOGIKA - Automatické generování

### PHP funkce pro generování položek:

```php
function generatePolozky($platba, $rok, $castka_na_polozku, $datum_prvni_splatnosti) {
    $polozky = [];
    
    switch ($platba) {
        case 'MESICNI':
            // 12 měsíčních položek
            $mesice = [
                'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
                'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
            ];
            
            $den_splatnosti = date('d', strtotime($datum_prvni_splatnosti));
            
            for ($i = 0; $i < 12; $i++) {
                $mesic_cislo = $i + 1;
                $splatnost = sprintf('%d-%02d-%s', $rok, $mesic_cislo, $den_splatnosti);
                
                $polozky[] = [
                    'poradi' => $i + 1,
                    'nazev_polozky' => $mesice[$i] . ' ' . $rok,
                    'castka' => $castka_na_polozku,
                    'datum_splatnosti' => $splatnost,
                    'stav' => 'NEZAPLACENO'
                ];
            }
            break;
            
        case 'KVARTALNI':
            // 4 kvartální položky
            $kvartaly = [
                ['nazev' => 'Q1', 'mesic' => 3, 'den' => 31],
                ['nazev' => 'Q2', 'mesic' => 6, 'den' => 30],
                ['nazev' => 'Q3', 'mesic' => 9, 'den' => 30],
                ['nazev' => 'Q4', 'mesic' => 12, 'den' => 31]
            ];
            
            foreach ($kvartaly as $index => $kvartal) {
                $splatnost = sprintf('%d-%02d-%02d', $rok, $kvartal['mesic'], $kvartal['den']);
                
                $polozky[] = [
                    'poradi' => $index + 1,
                    'nazev_polozky' => $kvartal['nazev'] . ' ' . $rok,
                    'castka' => $castka_na_polozku,
                    'datum_splatnosti' => $splatnost,
                    'stav' => 'NEZAPLACENO'
                ];
            }
            break;
            
        case 'ROCNI':
            // 1 roční položka
            $splatnost = sprintf('%d-12-31', $rok);
            
            $polozky[] = [
                'poradi' => 1,
                'nazev_polozky' => 'Roční poplatek ' . $rok,
                'castka' => $castka_na_polozku,
                'datum_splatnosti' => $splatnost,
                'stav' => 'NEZAPLACENO'
            ];
            break;
            
        case 'JINA':
            // Žádné automatické položky - uživatel přidá manuálně
            break;
    }
    
    return $polozky;
}
```

---

## VALIDACE

### Backend musí zkontrolovat:

1. ✅ Token a username jsou platné
2. ✅ Smlouva s `smlouva_id` existuje
3. ✅ Hodnoty `druh` a `platba` jsou v číselníku `25_ciselnik_stavy`
4. ✅ Rok je validní (2020-2100)
5. ✅ Částka je kladné číslo
6. ✅ Datum splatnosti je validní datum

---

## RESPONSE CODES

| HTTP Code | Význam | Příklad |
|-----------|--------|---------|
| 200 | OK - Úspěch | Roční poplatek vytvořen |
| 400 | Bad Request | Chybí povinné pole `smlouva_id` |
| 401 | Unauthorized | Neplatný token |
| 404 | Not Found | Smlouva neexistuje |
| 500 | Server Error | Chyba při vytváření položek |

---

## PŘÍKLAD VOLÁNÍ (curl)

```bash
curl -X POST https://erdms.zachranka.cz/api.eeo/annual-fees/create \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "username": "jan.novak",
    "smlouva_id": 123,
    "nazev": "Roční poplatky 2026 - Nájem",
    "rok": 2026,
    "druh": "NAJEMNI",
    "platba": "MESICNI",
    "castka_na_polozku": 1000.00,
    "datum_prvni_splatnosti": "2026-01-20"
  }'
```
