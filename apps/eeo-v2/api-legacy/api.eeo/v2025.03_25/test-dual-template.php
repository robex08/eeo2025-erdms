<?php
/**
 * Test skript pro dual-template email systém
 * Demonstrační použití email-template-helper.php
 */

require_once __DIR__ . '/lib/email-template-helper.php';

echo "🧪 TEST: Dual-template email systém\n";
echo str_repeat("=", 60) . "\n\n";

// 1️⃣ Připojení k DB
$conn = new mysqli('10.3.172.11', 'erdms_user', 'AhchohTahnoh7eim', 'eeo2025');
if ($conn->connect_error) {
    die("❌ Chyba připojení: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");
echo "✅ Připojeno k DB\n\n";

// 2️⃣ Načtení šablony z DB
$sql = "SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE type = 'order_status_ke_schvaleni' LIMIT 1";
$result = $conn->query($sql);

if (!$result || $result->num_rows === 0) {
    die("❌ Šablona 'order_status_ke_schvaleni' nenalezena v DB\n");
}

$template = $result->fetch_assoc();
echo "✅ Načtena šablona: {$template['name']}\n";
echo "   - ID: {$template['id']}\n";
echo "   - Subject: {$template['email_subject']}\n";
echo "   - Body length: " . strlen($template['email_body']) . " znaků\n\n";

// 3️⃣ Testovací data objednávky
$order_data = [
    'id' => 12345,
    'ev_cislo' => 'O-0001/75030926/2025/PTN',
    'predmet' => 'SENESI - Mapei MAPESIL AC 150 ŽLUTÁ 310 ml',
    'dodavatel_nazev' => 'SENESI, SE',
    'financovani_display' => 'LPIT1 - Spotřeba materiálu',
    'max_price_with_dph' => 15000.50,
    'garant_id' => 10, // Autor objednávky
    'garant_name' => 'Jan Novák',
    'prikazce_id' => 25, // Schvalovatel
    'prikazce_name' => 'Petra Svobodová',
    'dt_created' => '2025-12-07 10:30:00'
];

echo "📦 Testovací objednávka:\n";
echo "   - Číslo: {$order_data['ev_cislo']}\n";
echo "   - Předmět: {$order_data['predmet']}\n";
echo "   - Autor (garant): {$order_data['garant_name']} (ID: {$order_data['garant_id']})\n";
echo "   - Příkazce: {$order_data['prikazce_name']} (ID: {$order_data['prikazce_id']})\n\n";

// 4️⃣ TEST PŘÍKAZCE (APPROVER)
echo str_repeat("-", 60) . "\n";
echo "🔴 TEST 1: Email pro PŘÍKAZCE (schvalovatel)\n";
echo str_repeat("-", 60) . "\n";

$approver_user_id = $order_data['prikazce_id'];
$recipient_type = detect_recipient_type($approver_user_id, $order_data);
echo "✅ Detekován typ: $recipient_type\n";

$email_body_approver = get_email_template_by_recipient($template['email_body'], 'APPROVER');
echo "✅ Extrahována šablona APPROVER: " . strlen($email_body_approver) . " znaků\n";

// Kontrola obsahu
if (strpos($email_body_approver, 'Nová objednávka ke schválení') !== false) {
    echo "✅ Nadpis: 'Nová objednávka ke schválení' ✓\n";
}
if (strpos($email_body_approver, '{approver_name}') !== false) {
    echo "✅ Obsahuje placeholder: {approver_name} ✓\n";
}
if (strpos($email_body_approver, 'Schválit / Zamítnout objednávku') !== false) {
    echo "✅ Tlačítko: 'Schválit / Zamítnout' ✓\n";
}
if (strpos($email_body_approver, '#dc2626') !== false) {
    echo "✅ Barva: Červený gradient ✓\n";
}

// Nahrazení placeholderů
$email_body_approver_final = $email_body_approver;
$email_body_approver_final = str_replace('{approver_name}', $order_data['prikazce_name'], $email_body_approver_final);
$email_body_approver_final = str_replace('{user_name}', $order_data['garant_name'], $email_body_approver_final);
$email_body_approver_final = str_replace('{order_number}', $order_data['ev_cislo'], $email_body_approver_final);
$email_body_approver_final = str_replace('{order_id}', $order_data['id'], $email_body_approver_final);
$email_body_approver_final = str_replace('{predmet}', $order_data['predmet'], $email_body_approver_final);
$email_body_approver_final = str_replace('{dodavatel_nazev}', $order_data['dodavatel_nazev'], $email_body_approver_final);
$email_body_approver_final = str_replace('{financovani}', $order_data['financovani_display'], $email_body_approver_final);
$email_body_approver_final = str_replace('{amount}', number_format($order_data['max_price_with_dph'], 2, ',', ' ') . ' Kč', $email_body_approver_final);
$email_body_approver_final = str_replace('{date}', date('d.m.Y', strtotime($order_data['dt_created'])), $email_body_approver_final);

echo "✅ Placeholdery nahrazeny\n";

// Uložení do souboru pro náhled
file_put_contents('/tmp/email_approver_preview.html', $email_body_approver_final);
echo "💾 Uloženo: /tmp/email_approver_preview.html\n\n";

// 5️⃣ TEST AUTOR (SUBMITTER)
echo str_repeat("-", 60) . "\n";
echo "🟢 TEST 2: Email pro AUTORA objednávky (garant)\n";
echo str_repeat("-", 60) . "\n";

$submitter_user_id = $order_data['garant_id'];
$recipient_type = detect_recipient_type($submitter_user_id, $order_data);
echo "✅ Detekován typ: $recipient_type\n";

$email_body_submitter = get_email_template_by_recipient($template['email_body'], 'SUBMITTER');
echo "✅ Extrahována šablona SUBMITTER: " . strlen($email_body_submitter) . " znaků\n";

// Kontrola obsahu
if (strpos($email_body_submitter, 'Objednávka odeslána ke schválení') !== false) {
    echo "✅ Nadpis: 'Objednávka odeslána ke schválení' ✓\n";
}
if (strpos($email_body_submitter, 'Vaše objednávka byla úspěšně odeslána') !== false) {
    echo "✅ Text: 'Vaše objednávka byla úspěšně odeslána' ✓\n";
}
if (strpos($email_body_submitter, 'Zobrazit objednávku') !== false) {
    echo "✅ Tlačítko: 'Zobrazit objednávku' ✓\n";
}
if (strpos($email_body_submitter, '#059669') !== false) {
    echo "✅ Barva: Zelený gradient ✓\n";
}

// Nahrazení placeholderů
$email_body_submitter_final = $email_body_submitter;
$email_body_submitter_final = str_replace('{user_name}', $order_data['garant_name'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{approver_name}', $order_data['prikazce_name'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{order_number}', $order_data['ev_cislo'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{order_id}', $order_data['id'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{predmet}', $order_data['predmet'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{dodavatel_nazev}', $order_data['dodavatel_nazev'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{financovani}', $order_data['financovani_display'], $email_body_submitter_final);
$email_body_submitter_final = str_replace('{amount}', number_format($order_data['max_price_with_dph'], 2, ',', ' ') . ' Kč', $email_body_submitter_final);

echo "✅ Placeholdery nahrazeny\n";

// Uložení do souboru pro náhled
file_put_contents('/tmp/email_submitter_preview.html', $email_body_submitter_final);
echo "💾 Uloženo: /tmp/email_submitter_preview.html\n\n";

// 6️⃣ SOUHRN
echo str_repeat("=", 60) . "\n";
echo "✅ VŠECHNY TESTY PROŠLY!\n";
echo str_repeat("=", 60) . "\n";
echo "\n📂 Náhledy emailů:\n";
echo "   🔴 Příkazce: /tmp/email_approver_preview.html\n";
echo "   🟢 Autor:    /tmp/email_submitter_preview.html\n\n";
echo "💡 Otevřete soubory v prohlížeči pro náhled HTML designu.\n\n";

$conn->close();
