/*
 * 🏦 BACKEND API - CASHBOX ASSIGNMENTS ALL (Pro ADMINY)
 * 
 * Endpoint pro získání všech přiřazení pokladen všech uživatelů.
 * Přístup pouze pro uživatele s rolí SUPERADMIN nebo ADMINISTRATOR.
 * 
 * @endpoint POST /api.eeo/cashbook-assignments-all
 * @author BE Team
 * @date 9. listopadu 2025
 */

// =============================================================================
// PARAMETRY REQUESTU
// =============================================================================

/*
{
  "username": "admin@zachranka.cz",
  "token": "abc123..."
}
*/

// =============================================================================
// SQL DOTAZ
// =============================================================================

/*
SELECT 
  ppu.id,
  ppu.pokladna_id,
  pp.cislo_pokladny,
  pp.nazev AS nazev_pracoviste,
  pp.kod_pracoviste,
  pp.ciselna_rada_vpd,
  pp.vpd_od_cislo,
  pp.ciselna_rada_ppd,
  pp.ppd_od_cislo,
  ppu.uzivatel_id,
  CONCAT(u.prijmeni, ' ', u.jmeno) AS uzivatel_cele_jmeno,
  u.email AS uzivatel_email,
  ppu.je_hlavni,
  ppu.platne_od,
  ppu.platne_do,
  ppu.poznamka,
  -- Stav pokladny (pokud existuje aktuální kniha)
  COALESCE(
    (SELECT koncovy_stav 
     FROM 25a_pokladni_knihy 
     WHERE prirazeni_id = ppu.id 
     AND rok = YEAR(CURDATE()) 
     AND mesic = MONTH(CURDATE())
     LIMIT 1), 
    0
  ) AS koncovy_stav,
  -- Počet uživatelů přiřazených k této pokladně
  (SELECT COUNT(*) 
   FROM 25a_pokladny_uzivatele ppu2 
   WHERE ppu2.pokladna_id = pp.id
  ) AS pocet_uzivatelu,
  -- ID hlavního pokladníka
  (SELECT ppu3.uzivatel_id
   FROM 25a_pokladny_uzivatele ppu3
   WHERE ppu3.pokladna_id = pp.id
   AND ppu3.je_hlavni = 1
   LIMIT 1
  ) AS hlavni_pokladnik_id,
  -- Celé jméno hlavního pokladníka
  (SELECT CONCAT(u2.prijmeni, ' ', u2.jmeno)
   FROM 25a_pokladny_uzivatele ppu3
   LEFT JOIN zamestnanci u2 ON ppu3.uzivatel_id = u2.id
   WHERE ppu3.pokladna_id = pp.id
   AND ppu3.je_hlavni = 1
   LIMIT 1
  ) AS hlavni_pokladnik_cele_jmeno
FROM 25a_pokladny_uzivatele ppu
LEFT JOIN 25a_pokladny pp ON ppu.pokladna_id = pp.id
LEFT JOIN zamestnanci u ON ppu.uzivatel_id = u.id
ORDER BY 
  pp.cislo_pokladny ASC,
  ppu.je_hlavni DESC,
  u.prijmeni ASC,
  u.jmeno ASC
*/

// =============================================================================
// PHP IMPLEMENTACE (PŘÍKLAD)
// =============================================================================

/*
<?php
// Endpoint: cashbook-assignments-all

// 1. Kontrola autentizace
$username = $_POST['username'] ?? null;
$token = $_POST['token'] ?? null;

if (!$username || !$token) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí autentizační údaje'
    ]);
    exit;
}

// 2. Ověření uživatele a tokenu
$user = validateUser($username, $token);
if (!$user) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatné přihlašovací údaje'
    ]);
    exit;
}

// 3. Kontrola oprávnění - pouze pro ADMINY
$isAdmin = false;
foreach ($user['roles'] as $role) {
    if ($role['kod_role'] === 'SUPERADMIN' || $role['kod_role'] === 'ADMINISTRATOR') {
        $isAdmin = true;
        break;
    }
}

if (!$isAdmin) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění k zobrazení všech pokladen. Pouze pro administrátory.'
    ]);
    exit;
}

// 4. SQL dotaz pro získání všech přiřazení
$query = "
    SELECT 
      ppu.id,
      ppu.pokladna_id,
      pp.cislo_pokladny,
      pp.nazev AS nazev_pracoviste,
      pp.kod_pracoviste,
      pp.ciselna_rada_vpd,
      pp.vpd_od_cislo,
      pp.ciselna_rada_ppd,
      pp.ppd_od_cislo,
      ppu.uzivatel_id,
      CONCAT(u.prijmeni, ' ', u.jmeno) AS uzivatel_cele_jmeno,
      u.email AS uzivatel_email,
      lok.nazev AS lokalita_nazev,
      lok.kod AS lokalita_kod,
      us.nazev AS usek_nazev,
      ppu.je_hlavni,
      ppu.platne_od,
      ppu.platne_do,
      ppu.poznamka,
      COALESCE(
        (SELECT koncovy_stav 
         FROM 25a_pokladni_knihy 
         WHERE prirazeni_id = ppu.id 
         AND rok = YEAR(CURDATE()) 
         AND mesic = MONTH(CURDATE())
         LIMIT 1), 
        0
      ) AS koncovy_stav,
      (SELECT COUNT(*) 
       FROM 25a_pokladny_uzivatele ppu2 
       WHERE ppu2.pokladna_id = pp.id
      ) AS pocet_uzivatelu,
      (SELECT ppu3.uzivatel_id
       FROM 25a_pokladny_uzivatele ppu3
       WHERE ppu3.pokladna_id = pp.id
       AND ppu3.je_hlavni = 1
       LIMIT 1
      ) AS hlavni_pokladnik_id,
      (SELECT CONCAT(u2.prijmeni, ' ', u2.jmeno)
       FROM 25a_pokladny_uzivatele ppu3
       LEFT JOIN zamestnanci u2 ON ppu3.uzivatel_id = u2.id
       WHERE ppu3.pokladna_id = pp.id
       AND ppu3.je_hlavni = 1
       LIMIT 1
      ) AS hlavni_pokladnik_cele_jmeno
    FROM 25a_pokladny_uzivatele ppu
    LEFT JOIN 25a_pokladny pp ON ppu.pokladna_id = pp.id
    LEFT JOIN zamestnanci u ON ppu.uzivatel_id = u.id
    LEFT JOIN 25_lokality lok ON u.lokalita_id = lok.id
    LEFT JOIN 25_useky us ON u.usek_id = us.id
    ORDER BY 
      pp.cislo_pokladny ASC,
      ppu.je_hlavni DESC,
      u.prijmeni ASC,
      u.jmeno ASC
";

$result = $db->query($query);
$assignments = [];

while ($row = $result->fetch_assoc()) {
    $assignments[] = [
        'id' => (int)$row['id'],
        'pokladna_id' => (int)$row['pokladna_id'],
        'cislo_pokladny' => $row['cislo_pokladny'],
        'nazev_pracoviste' => $row['nazev_pracoviste'],
        'kod_pracoviste' => $row['kod_pracoviste'],
        'ciselna_rada_vpd' => $row['ciselna_rada_vpd'],
        'vpd_od_cislo' => (int)$row['vpd_od_cislo'],
        'ciselna_rada_ppd' => $row['ciselna_rada_ppd'],
        'ppd_od_cislo' => (int)$row['ppd_od_cislo'],
        'uzivatel_id' => (int)$row['uzivatel_id'],
        'uzivatel_cele_jmeno' => $row['uzivatel_cele_jmeno'],
        'uzivatel_email' => $row['uzivatel_email'],
        'lokalita_nazev' => $row['lokalita_nazev'],
        'lokalita_kod' => $row['lokalita_kod'],
        'usek_nazev' => $row['usek_nazev'],
        'je_hlavni' => (bool)$row['je_hlavni'],
        'platne_od' => $row['platne_od'],
        'platne_do' => $row['platne_do'],
        'poznamka' => $row['poznamka'],
        'koncovy_stav' => (float)$row['koncovy_stav'],
        'pocet_uzivatelu' => (int)$row['pocet_uzivatelu'],
        'hlavni_pokladnik_id' => (int)$row['hlavni_pokladnik_id'],
        'hlavni_pokladnik_cele_jmeno' => $row['hlavni_pokladnik_cele_jmeno']
    ];
}

// 5. Response
echo json_encode([
    'status' => 'success',
    'data' => $assignments,
    'meta' => [
        'total_count' => count($assignments),
        'timestamp' => date('Y-m-d H:i:s')
    ]
]);
?>
*/

// =============================================================================
// PŘÍKLAD RESPONSE
// =============================================================================

/*
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "pokladna_id": 5,
      "cislo_pokladny": "100",
      "nazev_pracoviste": "Hradec Králové",
      "kod_pracoviste": "HK",
      "ciselna_rada_vpd": "VPD",
      "vpd_od_cislo": 1,
      "ciselna_rada_ppd": "PPD",
      "ppd_od_cislo": 1,
      "uzivatel_id": 10,
      "uzivatel_cele_jmeno": "Svobodová Marie",
      "uzivatel_email": "marie.svobodova@zachranka.cz",
      "je_hlavni": true,
      "platne_od": "2024-01-01",
      "platne_do": null,
      "poznamka": null,
      "koncovy_stav": 15230.50,
      "pocet_uzivatelu": 5,
      "hlavni_pokladnik_id": 10,
      "hlavni_pokladnik_cele_jmeno": "Svobodová Marie"
    },
    {
      "id": 2,
      "pokladna_id": 5,
      "cislo_pokladny": "100",
      "nazev_pracoviste": "Hradec Králové",
      "kod_pracoviste": "HK",
      "ciselna_rada_vpd": "VPD",
      "vpd_od_cislo": 1,
      "ciselna_rada_ppd": "PPD",
      "ppd_od_cislo": 1,
      "uzivatel_id": 25,
      "uzivatel_cele_jmeno": "Novák Jan",
      "uzivatel_email": "jan.novak@zachranka.cz",
      "je_hlavni": false,
      "platne_od": "2025-11-01",
      "platne_do": "2025-11-30",
      "poznamka": "Zástup během dovolené",
      "koncovy_stav": 0,
      "pocet_uzivatelu": 5,
      "hlavni_pokladnik_id": 10,
      "hlavni_pokladnik_cele_jmeno": "Svobodová Marie"
    },
    {
      "id": 3,
      "pokladna_id": 12,
      "cislo_pokladny": "200",
      "nazev_pracoviste": "Mladá Boleslav",
      "kod_pracoviste": "MB",
      "ciselna_rada_vpd": "VPD",
      "vpd_od_cislo": 1,
      "ciselna_rada_ppd": "PPD",
      "ppd_od_cislo": 1,
      "uzivatel_id": 45,
      "uzivatel_cele_jmeno": "Dvořák Petr",
      "uzivatel_email": "petr.dvorak@zachranka.cz",
      "je_hlavni": true,
      "platne_od": "2024-06-01",
      "platne_do": null,
      "poznamka": null,
      "koncovy_stav": 8500.00,
      "pocet_uzivatelu": 3,
      "hlavni_pokladnik_id": 45,
      "hlavni_pokladnik_cele_jmeno": "Dvořák Petr"
    },
    {
      "id": 4,
      "pokladna_id": 18,
      "cislo_pokladny": "600",
      "nazev_pracoviste": "Příbram",
      "kod_pracoviste": "PB",
      "ciselna_rada_vpd": "VPD",
      "vpd_od_cislo": 1,
      "ciselna_rada_ppd": "PPD",
      "ppd_od_cislo": 1,
      "uzivatel_id": 52,
      "uzivatel_cele_jmeno": "Nováková Jana",
      "uzivatel_email": "jana.novakova@zachranka.cz",
      "je_hlavni": true,
      "platne_od": "2025-01-01",
      "platne_do": null,
      "poznamka": null,
      "koncovy_stav": 12450.50,
      "pocet_uzivatelu": 2,
      "hlavni_pokladnik_id": 52,
      "hlavni_pokladnik_cele_jmeno": "Nováková Jana"
    }
  ],
  "meta": {
    "total_count": 4,
    "timestamp": "2025-11-09 14:30:25"
  }
}
*/

// =============================================================================
// ROZŠÍŘENÍ EXISTUJÍCÍHO ENDPOINTU: cashbook-assignments-list
// =============================================================================

/*
Přidat parametr `include_expired` pro vrácení i vypršelých přiřazení.

REQUEST:
{
  "username": "jan.novak@zachranka.cz",
  "token": "abc123...",
  "uzivatel_id": 52,
  "active_only": false,
  "include_expired": true   // <-- NOVÝ PARAMETR
}

ZMĚNA V SQL:
- Pokud `include_expired = false` (default):
  WHERE (ppu.platne_do IS NULL OR ppu.platne_do >= CURDATE())

- Pokud `include_expired = true`:
  WHERE 1=1  -- vše bez filtru platnosti
*/

// =============================================================================
// TESTOVÁNÍ
// =============================================================================

/*
1. Test jako ADMIN:
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin@zachranka.cz",
       "token": "admin_token_here"
     }'
   
   Očekávaný result: Status 200, pole `data` se všemi pokladnami

2. Test jako běžný uživatel:
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
     -H "Content-Type: application/json" \
     -d '{
       "username": "user@zachranka.cz",
       "token": "user_token_here"
     }'
   
   Očekávaný result: Status 403, message: "Nemáte oprávnění..."

3. Test bez tokenu:
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin@zachranka.cz"
     }'
   
   Očekávaný result: Status 400, message: "Chybí autentizační údaje"
*/

// =============================================================================
// CHECKLIST PRO BACKEND VÝVOJÁŘE
// =============================================================================

/*
[ ] 1. Vytvořit nový soubor /api.eeo/cashbook-assignments-all.php
[ ] 2. Implementovat kontrolu autentizace (username + token)
[ ] 3. Implementovat kontrolu ADMIN role (SUPERADMIN nebo ADMINISTRATOR)
[ ] 4. Připravit SQL dotaz dle výše uvedeného vzoru
[ ] 5. Zajistit správný formát response (status, data, meta)
[ ] 6. Otestovat 3 scénáře (admin, user, bez tokenu)
[ ] 7. Rozšířit cashbook-assignments-list.php o parametr `include_expired`
[ ] 8. Upravit SQL WHERE clause podle parametru `include_expired`
[ ] 9. Otestovat `include_expired=true` vs `include_expired=false`
[ ] 10. Dokumentovat oba endpointy v API dokumentaci
*/
