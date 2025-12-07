#!/usr/bin/php
<?php
// Test SMTP sending

require_once __DIR__ . '/lib/mail.php';

echo "=== SMTP EMAIL TEST ===\n\n";

$to = 'robert.holovsky@zachranka.cz';
$subject = 'Test SMTP z eRDMS - ' . date('Y-m-d H:i:s');
$body = "Toto je testovaci email odeslany pres SMTP server akp-it-smtp01.zzssk.zachranka.cz\n\n";
$body .= "Datum: " . date('Y-m-d H:i:s') . "\n";
$body .= "Server: " . gethostname() . "\n";

$options = array(
    'html' => false,
    'from_email' => 'webmaster@zachranka.cz',
    'from_name' => 'eRDMS Systém'
);

echo "Odesílám email na: $to\n";
echo "Předmět: $subject\n";
echo "SMTP: akp-it-smtp01.zzssk.zachranka.cz:25\n\n";

$result = eeo_mail_send($to, $subject, $body, $options);

if ($result['ok']) {
    echo "✅ SUCCESS: Email byl odeslán!\n";
    if (isset($result['debug'])) {
        echo "\nDebug log:\n";
        foreach ($result['debug'] as $line) {
            echo "  $line";
        }
    }
} else {
    echo "❌ FAILED: Email se nepodařilo odeslat!\n";
    if (isset($result['error'])) {
        echo "Error: " . $result['error'] . "\n";
    }
    if (isset($result['debug'])) {
        echo "\nDebug log:\n";
        foreach ($result['debug'] as $line) {
            echo "  $line";
        }
    }
}

echo "\n";
