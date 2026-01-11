# Changelog: Validace data přiřazení pokladny (verze 1.96b)

**Datum:** 2026-01-04  
**Autor:** Development Team  
**Typ změny:** Feature - Omezení přístupu k pokladně podle data přiřazení

## Popis problému

Uživatelé mohli přistupovat k pokladním knihám v měsících před datem, kdy jim byla pokladna přiřazena. Například pokud měl uživatel přiřazenou pokladnu od 5.1.2026, mohl přistupovat i k měsíci 12/2025, což není správné z hlediska business logiky.

## Řešení

Implementována trojúrovňová ochrana:

### 1. Backend validace (PHP)

#### a) cashboxByPeriodHandler.php
- **Endpoint:** `POST /cashbox-list-by-period`
- **Změna:** Přidána podmínka do WHERE klauzule
- **SQL:** `DATE(CONCAT(pk.rok, '-', LPAD(pk.mesic, 2, '0'), '-01')) >= pu.platne_od`
- **Účinek:** Pokladny se nezobrazí v seznamu pro měsíce před datem přiřazení

#### b) cashbookHandlers.php

**handle_cashbook_get_post (~řádky 140-165)**
```php
// Kontrola platne_od před čtením knihy
if ($book['uzivatel_id'] == $userData['id']) {
    $stmt = $db->prepare("
        SELECT platne_od, platne_do 
        FROM 25a_pokladny_uzivatele 
        WHERE uzivatel_id = ? 
        AND pokladna_id = ? 
        AND (platne_do IS NULL OR platne_do >= CURDATE())
    ");
    $stmt->execute([$userData['id'], $book['pokladna_id']]);
    $assignment = $stmt->fetch();
    
    if ($assignment && $assignment['platne_od']) {
        $requestedMonthStart = sprintf('%04d-%02d-01', $book['rok'], $book['mesic']);
        if ($requestedMonthStart < $assignment['platne_od']) {
            return api_error(403, 'Nemáte oprávnění zobrazit knihu pro měsíc před přiřazením pokladny.');
        }
    }
}
```

**handle_cashbook_create_post (~řádky 295-320)**
```php
// Stejná validace před vytvořením nové knihy
if ($userId) {
    $stmt = $db->prepare("
        SELECT platne_od, platne_do 
        FROM 25a_pokladny_uzivatele 
        WHERE uzivatel_id = ? 
        AND pokladna_id = ? 
        AND (platne_do IS NULL OR platne_do >= CURDATE())
    ");
    $stmt->execute([$userId, $pokladnaId]);
    $assignment = $stmt->fetch();
    
    if ($assignment && $assignment['platne_od']) {
        $requestedMonthStart = sprintf('%04d-%02d-01', $rok, $mesic);
        if ($requestedMonthStart < $assignment['platne_od']) {
            $errorMsg = 'Nelze vytvořit pokladní knihu pro měsíc před přiřazením pokladny. ' .
                       'Pokladna vám byla přiřazena až od ' . 
                       date('j.n.Y', strtotime($assignment['platne_od'])) . '.';
            return api_error(403, $errorMsg);
        }
    }
}
```

### 2. Frontend validace (React)

#### CashBookPage.js

**goToPreviousMonth**
```javascript
// Kontrola platne_od před navigací na předchozí měsíc
if (mainAssignment?.platne_od) {
    try {
        const platneOdDate = new Date(mainAssignment.platne_od);
        const targetMonthStart = new Date(targetYear, targetMonth - 1, 1);

        if (targetMonthStart < platneOdDate) {
            const formattedDate = platneOdDate.toLocaleDateString('cs-CZ');
            showToast(
                `Pokladna vám byla přiřazena až od ${formattedDate}. ` +
                `Nelze přejít na měsíc ${targetMonth}/${targetYear}.`,
                'warning'
            );
            return; // ZASTAVIT navigaci
        }
    } catch (error) {
        console.error('❌ Chyba při validaci platne_od:', error);
    }
}
```

**goToNextMonth**
- Stejná logika jako goToPreviousMonth
- Kontroluje i cílový měsíc při navigaci vpřed

**canGoToPreviousMonth (useMemo)**
```javascript
const canGoToPreviousMonth = useMemo(() => {
    if (!mainAssignment?.platne_od) {
      return true; // Žádné omezení pokud není platne_od
    }

    // Vypočítat cílový měsíc
    let targetMonth = currentMonth - 1;
    let targetYear = currentYear;

    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear--;
    }

    const platneOdDate = new Date(mainAssignment.platne_od);
    const targetMonthStart = new Date(targetYear, targetMonth - 1, 1);

    // Vrátit true pokud cílový měsíc je >= platne_od
    return targetMonthStart >= platneOdDate;
}, [mainAssignment?.platne_od, currentMonth, currentYear]);
```

**MonthButton (Předchozí)**
```jsx
<MonthButton 
  onClick={goToPreviousMonth} 
  disabled={!canGoToPreviousMonth}
  title={
    canGoToPreviousMonth 
      ? "Předchozí měsíc" 
      : `Pokladna přiřazena od ${new Date(mainAssignment.platne_od).toLocaleDateString('cs-CZ')}`
  }
>
  <FontAwesomeIcon icon={faChevronLeft} />
  Předchozí
</MonthButton>
```
- Tlačítko je disabled, pokud cílový měsíc je před platne_od
- Tooltip zobrazuje důvod (datum přiřazení pokladny)

**Data transformace**
```javascript
const transformedData = allResult.data.assignments.map(item => ({
    ...item,
    platne_od: item.platne_od, // Zachovat datum přiřazení
    platne_do: item.platne_do, // Zachovat datum ukončení
}));
```

## Testování

### Testovací scénář 1: Přiřazení od 5.1.2026
1. Vytvořit uživatele s přiřazením pokladny od `2026-01-05`
2. Přihlásit se jako tento uživatel
3. Zkusit přejít na měsíc 12/2025 ← **BLOKOVÁNO**
4. Zkusit přejít na měsíc 1/2026 ← **POVOLENO**

### Testovací scénář 2: Backend API validace
```bash
# Test GET na měsíc před přiřazením
curl -X POST http://localhost/api.eeo/v2025.03_25/cashbook-get \
  -d '{"username":"test","token":"xyz","rok":2025,"mesic":12,"pokladna_id":1}'
# Očekávaná odpověď: 403 Forbidden
```

### Testovací scénář 3: Frontend navigace
1. Otevřít CashBookPage
2. Kontrolovat konzoli: `mainAssignment` musí obsahovat `platne_od`
3. Použít šipky ◄ ► pro přepínání měsíců
4. Ověřit, že nelze přejít na měsíc před `platne_od`

## Bezpečnostní poznámky

- ✅ Validace probíhá na **backendu** (nelze obejít z frontendu)
- ✅ Validace probíhá na **frontendu** (UX feedback)
- ✅ SQL používá **prepared statements** (ochrana proti SQL injection)
- ✅ Kontrola data používá **ISO formát** (YYYY-MM-DD)
- ✅ Správci s oprávněním `CASHBOOK_MANAGE` **nejsou omezeni** (mohou spravovat všechny knihy)

## Databázová struktura

### Tabulka: 25a_pokladny_uzivatele
```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pokladna_id` int(11) NOT NULL,
  `uzivatel_id` int(11) NOT NULL,
  `je_hlavni` tinyint(1) DEFAULT 0,
  `platne_od` date DEFAULT NULL,        -- 🆕 Klíčové pole
  `platne_do` date DEFAULT NULL,        -- 🆕 Klíčové pole
  `poznamka` text,
  `vytvoreno` datetime DEFAULT CURRENT_TIMESTAMP,
  `vytvoril` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_prirazeni_pokladna` (`pokladna_id`),
  KEY `fk_prirazeni_uzivatel` (`uzivatel_id`),
  CONSTRAINT `fk_prirazeni_pokladna` FOREIGN KEY (`pokladna_id`) 
    REFERENCES `25a_pokladny` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prirazeni_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
);
```

## Ovlivněné soubory

### Backend
- `v2025.03_25/lib/cashboxByPeriodHandler.php` - WHERE klauzule
- `v2025.03_25/lib/cashbookHandlers.php` - handle_cashbook_get_post, handle_cashbook_create_post

### Frontend
- `apps/eeo-v2/client/src/pages/CashBookPage.js` - goToPreviousMonth, goToNextMonth, transformace dat

### Modely
- `v2025.03_25/models/CashboxAssignmentModel.php` - již vrací platne_od, platne_do (beze změny)

## Migrace dat

Žádná databázová migrace není nutná - sloupce `platne_od` a `platne_do` již v tabulce existují.

Pro existující přiřazení **BEZ** `platne_od`:
```sql
-- Pokud chcete nastavit platne_od na datum vytvoření přiřazení:
UPDATE 25a_pokladny_uzivatele 
SET platne_od = DATE(vytvoreno)
WHERE platne_od IS NULL;

-- NEBO nastavit pevné datum (např. začátek roku):
UPDATE 25a_pokladny_uzivatele 
SET platne_od = '2026-01-01'
WHERE platne_od IS NULL;
```

## Kompatibilita

- ✅ **Starší data:** Pokud `platne_od IS NULL`, validace se **neprovádí** (zachování zpětné kompatibility)
- ✅ **Správci:** Uživatelé s `CASHBOOK_MANAGE` oprávněním mohou spravovat všechny knihy bez omezení
- ✅ **API:** Existující API endpointy zůstávají zpětně kompatibilní

## Známé limitace

1. Validace se netýká **hromadných operací** (např. export všech knih)
2. Správci mohou obejít validaci (záměrné pro administrativní účely)
3. Frontend validace závisí na dostupnosti `mainAssignment.platne_od` (musí být vráceno API)

## Budoucí vylepšení

- [x] ~~Přidat validaci do handle_cashbook_update_post~~ - Dokončeno
- [x] ~~Přidat validaci do cashbook entry operací (create, edit, delete)~~ - Dokončeno  
- [x] ~~Přidat vizuální indikátor v UI~~ - Tooltip na disabled tlačítku
- [x] ~~Disable šipky ◄ ► když uživatel dosáhne hranice platne_od~~ - Dokončeno
- [ ] Přidat audit log pro pokusy o přístup před platne_od
- [ ] Přidat podobnou validaci pro platne_do (konec přiřazení)

## Verze

**1.96b** - Initial implementation (2026-01-04)
  - Backend validace (cashboxByPeriodHandler, cashbookHandlers)
  - Frontend validace při navigaci měsíců
  - Disabled tlačítko "Předchozí" s informativním tooltipem
