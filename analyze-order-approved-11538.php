<?php
/**
 * ANALÝZA NOTIFIKACÍ ORDER_APPROVED PRO OBJEDNÁVKU 11538
 * Podle org hierarchie PRIKAZCI
 */

echo "🔍 ANALÝZA: ORDER_APPROVED notifikace pro objednávku #11538\n";
echo str_repeat('=', 70) . "\n\n";

// Database connection
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4', 'erdms_user', 'AhchohTahnoh7eim', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// 1. Načíst údaje objednávky 11538
echo "1️⃣ ÚDAJE OBJEDNÁVKY #11538\n";
echo str_repeat('-', 50) . "\n";

$stmt = $pdo->prepare("
    SELECT 
        o.id,
        o.cislo_objednavky,
        o.objednatel_id,
        o.garant_uzivatel_id,
        o.prikazce_id,
        o.schvalovatel_id,
        u1.username AS objednatel_username,
        u2.username AS garant_username,
        u3.username AS prikazce_username,
        u4.username AS schvalovatel_username
    FROM 25a_objednavky o
    LEFT JOIN 25_uzivatele u1 ON o.objednatel_id = u1.id
    LEFT JOIN 25_uzivatele u2 ON o.garant_uzivatel_id = u2.id
    LEFT JOIN 25_uzivatele u3 ON o.prikazce_id = u3.id
    LEFT JOIN 25_uzivatele u4 ON o.schvalovatel_id = u4.id
    WHERE o.id = 11538
");
$stmt->execute();
$objednavka = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$objednavka) {
    die("❌ Objednávka #11538 nebyla nalezena!\n");
}

echo "✅ Objednávka nalezena:\n";
echo "   Číslo: {$objednavka['cislo_objednavky']}\n";
echo "   Objednatel: {$objednavka['objednatel_username']} (ID: {$objednavka['objednatel_id']})\n";
echo "   Garant: {$objednavka['garant_username']} (ID: {$objednavka['garant_uzivatel_id']})\n";
echo "   Příkazce: {$objednavka['prikazce_username']} (ID: {$objednavka['prikazce_id']})\n";
echo "   Schvalovatel: {$objednavka['schvalovatel_username']} (ID: {$objednavka['schvalovatel_id']})\n\n";

// 2. Načíst hierarchii PRIKAZCI
echo "2️⃣ HIERARCHIE PRIKAZCI - ORDER_APPROVED\n";
echo str_repeat('-', 50) . "\n";

$stmt = $pdo->prepare("SELECT id, nazev, structure_json FROM 25_hierarchie_profily WHERE nazev = 'PRIKAZCI' AND aktivni = 1");
$stmt->execute();
$hierarchie = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$hierarchie) {
    die("❌ Hierarchie PRIKAZCI nebyla nalezena!\n");
}

$structure = json_decode($hierarchie['structure_json'], true);

// 3. Najít ORDER_APPROVED template
$approvedTemplate = null;
foreach ($structure['nodes'] as $node) {
    if ($node['typ'] === 'template' && 
        isset($node['data']['eventTypes']) && 
        in_array('ORDER_APPROVED', $node['data']['eventTypes'])) {
        $approvedTemplate = $node;
        break;
    }
}

if (!$approvedTemplate) {
    die("❌ ORDER_APPROVED template nebyl nalezen v hierarchii!\n");
}

echo "✅ ORDER_APPROVED Template nalezen:\n";
echo "   ID: {$approvedTemplate['id']}\n";
echo "   Název: {$approvedTemplate['data']['name']}\n\n";

// 4. Najít všechny edges (spojení) z tohoto template
echo "3️⃣ CÍLOVÉ ROLE PRO ORDER_APPROVED\n";
echo str_repeat('-', 50) . "\n";

$targetEdges = [];
foreach ($structure['edges'] as $edge) {
    if ($edge['source'] === $approvedTemplate['id']) {
        $targetEdges[] = $edge;
    }
}

echo "Počet cílových rolí: " . count($targetEdges) . "\n\n";

// 5. Pro každý edge zjistit příjemce
$allRecipients = [];

foreach ($targetEdges as $edge) {
    $targetNodeId = $edge['target'];
    
    // Najít cílový node
    $targetNode = null;
    foreach ($structure['nodes'] as $node) {
        if ($node['id'] === $targetNodeId) {
            $targetNode = $node;
            break;
        }
    }
    
    if (!$targetNode) {
        echo "⚠️ Cílový node '$targetNodeId' nebyl nalezen!\n";
        continue;
    }
    
    echo "📌 Edge: {$approvedTemplate['id']} → {$targetNodeId}\n";
    echo "   Typ cílového node: {$targetNode['typ']}\n";
    echo "   Název role: {$targetNode['data']['name']}\n";
    echo "   Role ID: {$targetNode['data']['roleId']}\n";
    
    // Edge data
    $edgeData = $edge['data'] ?? [];
    echo "   Priority: " . ($edgeData['priority'] ?? 'AUTO') . "\n";
    echo "   Email: " . ($edgeData['sendEmail'] ? 'ANO' : 'NE') . "\n";
    echo "   InApp: " . ($edgeData['sendInApp'] ? 'ANO' : 'NE') . "\n";
    
    // Source info recipients - odkud se berou uživatelé
    $sourceFields = $edgeData['source_info_recipients']['fields'] ?? [];
    echo "   Source fields: " . implode(', ', $sourceFields) . "\n";
    
    // Vypočítat příjemce podle source_info_recipients
    $recipients = [];
    foreach ($sourceFields as $field) {
        $userId = $objednavka[$field] ?? null;
        if ($userId) {
            // Načíst uživatele z DB
            $userStmt = $pdo->prepare("SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE id = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            $recipients[] = [
                'field' => $field,
                'user_id' => $userId,
                'username' => $user ? $user['username'] : 'unknown',
                'full_name' => $user ? "{$user['jmeno']} {$user['prijmeni']}" : 'unknown'
            ];
        }
    }
    
    if (!empty($recipients)) {
        echo "   📧 Příjemci:\n";
        foreach ($recipients as $recipient) {
            echo "      - {$recipient['full_name']} ({$recipient['username']}, ID: {$recipient['user_id']}) z pole '{$recipient['field']}'\n";
            $allRecipients[] = $recipient;
        }
    } else {
        echo "   ⚠️ Žádní příjemci nenalezeni!\n";
    }
    
    echo "\n";
}

// 6. Shrnutí
echo "4️⃣ SHRNUTÍ\n";
echo str_repeat('-', 50) . "\n";
echo "Celkem unikátních příjemců ORDER_APPROVED: " . count(array_unique(array_column($allRecipients, 'user_id'))) . "\n";

$uniqueRecipients = [];
foreach ($allRecipients as $r) {
    $uniqueRecipients[$r['user_id']] = [
        'username' => $r['username'],
        'full_name' => $r['full_name']
    ];
}

echo "\nPříjemci:\n";
foreach ($uniqueRecipients as $userId => $data) {
    echo "   - {$data['full_name']} ({$data['username']}, ID: $userId)\n";
}

// 7. Ověřit, zda notifikace existují
echo "\n5️⃣ KONTROLA NOTIFIKACÍ V DATABÁZI\n";
echo str_repeat('-', 50) . "\n";

$stmt = $pdo->prepare("
    SELECT COUNT(*) as pocet 
    FROM 25_notifikace 
    WHERE objekt_typ = 'objednavka' AND objekt_id = 11538
");
$stmt->execute();
$pocet = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Počet notifikací pro objednávku 11538: {$pocet['pocet']}\n";

if ($pocet['pocet'] == 0) {
    echo "\n⚠️ POZOR: Žádné notifikace nebyly vytvořeny!\n";
    echo "   To znamená, že notifikační systém nebyl spuštěn při schválení objednávky.\n";
} else {
    echo "\n✅ Notifikace existují - zobrazuji:\n\n";
    $stmt = $pdo->prepare("
        SELECT 
            n.id,
            n.typ,
            n.nadpis,
            n.pro_uzivatele_id,
            u.username,
            n.priorita,
            n.dt_created
        FROM 25_notifikace n
        LEFT JOIN 25_uzivatele u ON n.pro_uzivatele_id = u.id
        WHERE n.objekt_typ = 'objednavka' AND n.objekt_id = 11538
        ORDER BY n.dt_created DESC
    ");
    $stmt->execute();
    $notifikace = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($notifikace as $notif) {
        echo "   ID: {$notif['id']}\n";
        echo "   Typ: {$notif['typ']}\n";
        echo "   Nadpis: {$notif['nadpis']}\n";
        echo "   Pro: {$notif['username']} (ID: {$notif['pro_uzivatele_id']})\n";
        echo "   Priorita: {$notif['priorita']}\n";
        echo "   Vytvořeno: {$notif['dt_created']}\n";
        echo "\n";
    }
}

echo "\n✅ ANALÝZA DOKONČENA\n";
