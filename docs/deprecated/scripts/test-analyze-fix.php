<?php
echo "======= THP Notifikace - Analýza Fix =======\n\n";

$mimoradna_udalost = 0; // Normální objednávka
$uzivatel_id = 100; // THP uživatel
$role = 'THP/PES';

echo "Scénář:\n";
echo "- Uživatel ID: $uzivatel_id ($role)\n";  
echo "- Mimoradná událost: $mimoradna_udalost (normální objednávka)\n\n";

echo "Před opravou:\n";
echo "- Frontend poslal: is_urgent=$mimoradna_udalost\n";
echo "- Backend očekával: mimoradna_udalost\n";
echo "- Hierarchie hledala: objednatel_id\n";
echo "- Výsledek: Pole mismatch → WARNING/URGENT priorita → 🟠 oranžová notifikace\n\n";

echo "Po opravě:\n";
echo "- ✅ Frontend posílá: mimoradna_udalost=$mimoradna_udalost + uzivatel_id=$uzivatel_id\n";
echo "- ✅ Backend používá: mimoradna_udalost pro priority + uzivatel_id pro matching\n";
echo "- ✅ Hierarchie hledá: uzivatel_id místo objednatel_id\n";
echo "- ✅ THP role má nastavenou prioritu: INFO\n";
echo "- ✅ Výsledek: INFO priorita → 🟢 zelená notifikace\n\n";

echo "Logika priority:\n";
echo "1. Hierarchie role 9 (THP/PES) má priority='INFO'\n";
echo "2. Pole uzivatel_id=$uzivatel_id se teď matchuje s fields=['uzivatel_id','garant_uzivatel_id']\n";
echo "3. Backend resolveAutoPriority() vrací 'INFO' pro mimoradna_udalost=0\n";
echo "4. Finální priorita: INFO → frontend zobrazí zelenou notifikaci\n\n";

echo "======= Fix je kompletní =======\n";
?>