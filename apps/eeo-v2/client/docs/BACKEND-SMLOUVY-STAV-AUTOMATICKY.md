# Backend: Automatický výpočet stavu smlouvy

## Problém
Sloupec `stav` v tabulce smluv se aktuálně ukládá manuálně, ale měl by se počítat **automaticky** podle těchto pravidel:

## Logika výpočtu stavu

```sql
IF aktivni = 0 THEN
  stav = "Neaktivní"
ELSE IF CURDATE() < platnost_od THEN
  stav = "Připravená"
ELSE IF CURDATE() > platnost_do THEN
  stav = "Vypršela"
ELSE
  stav = "Platná"
END IF
```

## Implementace

### 1. Při importu smluv
- Automaticky nastavit `stav` podle výše uvedené logiky
- Import by měl vždy přepočítat stav podle aktuálního data

### 2. Při vytváření/editaci smlouvy (API)
- `POST /api/smlouvy` - automaticky přepočítat `stav`
- `PUT /api/smlouvy/:id` - automaticky přepočítat `stav`
- Sloupec `stav` by **neměl** být přijímán z POST/PUT requestu (ignorovat)

### 3. Ideální řešení: DB trigger nebo computed column
```sql
-- Příklad MySQL trigger
DELIMITER $$
CREATE TRIGGER smlouvy_before_insert
BEFORE INSERT ON smlouvy
FOR EACH ROW
BEGIN
  IF NEW.aktivni = 0 THEN
    SET NEW.stav = 'Neaktivní';
  ELSEIF CURDATE() < NEW.platnost_od THEN
    SET NEW.stav = 'Připravená';
  ELSEIF CURDATE() > NEW.platnost_do THEN
    SET NEW.stav = 'Vypršela';
  ELSE
    SET NEW.stav = 'Platná';
  END IF;
END$$

CREATE TRIGGER smlouvy_before_update
BEFORE UPDATE ON smlouvy
FOR EACH ROW
BEGIN
  IF NEW.aktivni = 0 THEN
    SET NEW.stav = 'Neaktivní';
  ELSEIF CURDATE() < NEW.platnost_od THEN
    SET NEW.stav = 'Připravená';
  ELSEIF CURDATE() > NEW.platnost_do THEN
    SET NEW.stav = 'Vypršela';
  ELSE
    SET NEW.stav = 'Platná';
  END IF;
END$$
DELIMITER ;
```

### 4. Denní CRON job pro aktualizaci stavů
- Spouštět každý den ve 00:01
- Smlouvy které byly "Platná" včera mohou být dnes "Vypršela"
- Smlouvy které byly "Připravená" včera mohou být dnes "Platná"

```sql
-- Příklad SQL pro batch update
UPDATE smlouvy
SET stav = CASE
  WHEN aktivni = 0 THEN 'Neaktivní'
  WHEN CURDATE() < platnost_od THEN 'Připravená'
  WHEN CURDATE() > platnost_do THEN 'Vypršela'
  ELSE 'Platná'
END
WHERE stav != CASE
  WHEN aktivni = 0 THEN 'Neaktivní'
  WHEN CURDATE() < platnost_od THEN 'Připravená'
  WHEN CURDATE() > platnost_do THEN 'Vypršela'
  ELSE 'Platná'
END;
```

## Možné stavy smlouvy

| Stav | Podmínka | Barva na FE | Popis |
|------|----------|-------------|-------|
| **Neaktivní** | `aktivni = 0` | Šedá (#6b7280) | Smlouva je deaktivována bez ohledu na platnost |
| **Připravená** | `aktivni = 1` AND `CURDATE() < platnost_od` | Oranžová (#f59e0b) | Smlouva ještě nezačala platit |
| **Platná** | `aktivni = 1` AND `platnost_od <= CURDATE() <= platnost_do` | Zelená (#10b981) | Smlouva je aktivní a v platnosti |
| **Vypršela** | `aktivni = 1` AND `CURDATE() > platnost_do` | Červená (#dc2626) | Smlouva již vypršela |

## Priorita kontrol
1. **První kontrola: aktivni** - pokud je 0, stav je VŽDY "Neaktivní"
2. **Druhá kontrola: platnost_od** - pokud ještě nezačala, je "Připravená"
3. **Třetí kontrola: platnost_do** - pokud již skončila, je "Vypršela"
4. **Jinak:** je "Platná"

## Poznámky pro Frontend
- Sloupec `stav` je **READ-ONLY** z pohledu FE
- Frontend očekává, že BE vrací správný stav
- FE si nebude počítat stav lokálně (kromě vizualizace)
- Formulář pro vytvoření/editaci smlouvy **NEBUDE obsahovat** pole pro ruční zadání stavu

## API Response
```json
{
  "id": 123,
  "cislo_smlouvy": "S-2025-001",
  "nazev_smlouvy": "Dodávka materiálu",
  "aktivni": 1,
  "platnost_od": "2025-01-01",
  "platnost_do": "2025-12-31",
  "stav": "Platná"  // <-- Automaticky vypočítaný BE
}
```

## Testovací scénáře

### Scénář 1: Neaktivní smlouva
- `aktivni = 0`, `platnost_od = '2025-01-01'`, `platnost_do = '2025-12-31'`
- Očekávaný stav: **"Neaktivní"** (bez ohledu na dnešní datum)

### Scénář 2: Připravená smlouva
- `aktivni = 1`, `platnost_od = '2025-12-01'`, `platnost_do = '2025-12-31'`
- Dnešní datum: 2025-11-23
- Očekávaný stav: **"Připravená"**

### Scénář 3: Platná smlouva
- `aktivni = 1`, `platnost_od = '2025-01-01'`, `platnost_do = '2025-12-31'`
- Dnešní datum: 2025-11-23
- Očekávaný stav: **"Platná"**

### Scénář 4: Vypršelá smlouva
- `aktivni = 1`, `platnost_od = '2024-01-01'`, `platnost_do = '2024-12-31'`
- Dnešní datum: 2025-11-23
- Očekávaný stav: **"Vypršela"**

## Migrace stávajících dat
Po implementaci spustit:
```sql
UPDATE smlouvy
SET stav = CASE
  WHEN aktivni = 0 THEN 'Neaktivní'
  WHEN CURDATE() < platnost_od THEN 'Připravená'
  WHEN CURDATE() > platnost_do THEN 'Vypršela'
  ELSE 'Platná'
END;
```
