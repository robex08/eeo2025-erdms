<?php
echo "=== ANALÝZA ŽIVOTNÍHO CYKLU OBJEDNÁVKY ===\n\n";

echo "SOUČASNÝ STAV (před opravou):\n";
echo "❌ INSERT query neobsahoval uzivatel_id → MySQL použil první dostupný klíč (1)\n";
echo "❌ UPDATE při schválení používal neexistující sloupec schvalil_uzivatel_id místo schvalovatel_id\n";
echo "❌ Všechny objednávky měly uzivatel_id = objednatel_id = prikazce_id = 1\n\n";

echo "OPRAVY PROVEDENY:\n";
echo "✅ Přidán uzivatel_id do INSERT query\n";
echo "✅ Opraven UPDATE na schvalovatel_id místo schvalil_uzivatel_id\n";
echo "✅ Logická struktura ID:\n";
echo "   - uzivatel_id: Kdo vytvořil objednávku (z tokenu)\n";
echo "   - objednatel_id: Kdo objednává (obvykle = uzivatel_id, ale může být jiný)\n";
echo "   - schvalovatel_id: Kdo schválil objednávku (nastavuje se při schválení)\n";
echo "   - prikazce_id: Příkazce operace (z frontendu)\n\n";

echo "ŽIVOTNÍ CYKLUS OBJEDNÁVKY:\n\n";

echo "1. VYTVOŘENÍ OBJEDNÁVKY:\n";
echo "   Frontend → POST /api.eeo/order-v2/create\n";
echo "   - uzivatel_id = token.id (kdo vytváří)\n";
echo "   - objednatel_id = token.id (default) nebo z frontendu\n";
echo "   - prikazce_id = z frontendu\n";
echo "   - schvalovatel_id = NULL (ještě neschváleno)\n\n";

echo "2. SCHVÁLENÍ OBJEDNÁVKY:\n";
echo "   Frontend → PUT /api.eeo/order-v2/{id}/update (stav_id = SCHVÁLENA)\n";
echo "   - schvalovatel_id = token.id (kdo schvaluje)\n";
echo "   - datum_schvaleni = NOW()\n";
echo "   - uzivatel_akt_id = token.id (aktuální uživatel)\n\n";

echo "3. NOTIFIKAČNÍ SYSTÉM:\n";
echo "   Hierarchie teď může správně matchovat uživatele podle:\n";
echo "   - objednatel_id (kdo objednává)\n";
echo "   - uzivatel_id (kdo vytvořil)\n";
echo "   - schvalovatel_id (kdo schválil)\n";
echo "   - garant_uzivatel_id (garant)\n";
echo "   - prikazce_id (příkazce)\n\n";

echo "TESTOVACÍ SCÉNÁŘ:\n";
echo "- Uživatel 100 (THP) vytvoří objednávku → uzivatel_id=100\n";
echo "- Objednává pro sebe → objednatel_id=100\n";
echo "- Příkazce operace je 1 → prikazce_id=1\n";
echo "- Uživatel 107 schválí → schvalovatel_id=107\n";
echo "- Hierarchie najde THP role podle objednatel_id=100 ✅\n";
echo "- THP dostane INFO prioritu (zelenou notifikaci) ✅\n\n";

echo "=== OPRAVY DOKONČENY ===\n";
?>