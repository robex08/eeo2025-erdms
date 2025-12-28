<?php
/**
 * Debug Mail Endpoint
 * 
 * Endpoint pro testování HTML email šablon z debug panelu
 * Umožňuje odeslání HTML emailu na libovolnou adresu
 * 
 * POUZE PRO VÝVOJ A TESTOVÁNÍ!
 */

// CORS headers pro development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST.'
    ]);
    exit;
}

// Require mail library
require_once __DIR__ . '/lib/mail.php';

try {
    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        throw new Exception('Invalid JSON input');
    }

    // Validate required fields
    if (empty($data['to'])) {
        throw new Exception('Missing required field: to');
    }
    if (empty($data['subject'])) {
        throw new Exception('Missing required field: subject');
    }
    if (empty($data['html'])) {
        throw new Exception('Missing required field: html');
    }

    // Validate email format
    if (!filter_var($data['to'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email address format');
    }

    // Prepare email data
    $to = $data['to'];
    $subject = $data['subject'];
    $html = $data['html'];
    $templateName = $data['template_name'] ?? 'Debug Template';

    // Add debug header to HTML
    $debugHeader = '
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px; font-family: Arial, sans-serif;">
            <strong style="color: #92400e;">🧪 DEBUG EMAIL</strong><br>
            <span style="font-size: 13px; color: #78350f;">
                Šablona: ' . htmlspecialchars($templateName) . '<br>
                Odesláno: ' . date('Y-m-d H:i:s') . '<br>
                Z debug panelu eRDMS
            </span>
        </div>
    ';
    
    $fullHtml = $debugHeader . $html;

    // Send email using eRDMS mail function
    $options = [
        'html' => true,
        'from_email' => 'webmaster@zachranka.cz',
        'from_name' => 'eRDMS Debug Panel'
    ];

    $result = eeo_mail_send($to, $subject, $fullHtml, $options);

    if ($result['ok']) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Email byl úspěšně odeslán',
            'data' => [
                'to' => $to,
                'subject' => $subject,
                'template' => $templateName,
                'sent_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        throw new Exception($result['error'] ?? 'Nepodařilo se odeslat email');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
