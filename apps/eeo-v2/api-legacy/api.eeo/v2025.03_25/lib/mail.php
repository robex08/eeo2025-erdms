<?php
// Simple mail utility for PHP 5.6 using built-in mail()
// Supports: text or HTML body, basic headers, CC/BCC, optional attachments via multipart/mixed

function eeo_mail_send($to, $subject, $body, $options = array()) {
    $cfg = require __DIR__ . '/mailconfig.php';

    // Normalize options
    $isHtml = isset($options['html']) ? (bool)$options['html'] : false;
    $fromEmail = isset($options['from_email']) ? $options['from_email'] : $cfg['from_email'];
    $fromName  = isset($options['from_name']) ? $options['from_name'] : $cfg['from_name'];
    $replyTo   = isset($options['reply_to']) ? $options['reply_to'] : $cfg['reply_to'];
    $cc        = isset($options['cc']) ? $options['cc'] : array();
    $bcc       = isset($options['bcc']) ? $options['bcc'] : array();
    $attachments = isset($options['attachments']) ? $options['attachments'] : array();

    // Ensure arrays
    if (!is_array($cc)) $cc = array($cc);
    if (!is_array($bcc)) $bcc = array($bcc);
    if (!is_array($attachments)) $attachments = array();

    // Sanitize addresses (very basic)
    $to = is_array($to) ? implode(',', $to) : $to;
    $fromHeader = $fromName ? ("$fromName <{$fromEmail}>") : $fromEmail;

    $headers = array();
    $headers[] = 'From: ' . $fromHeader;
    if ($replyTo) $headers[] = 'Reply-To: ' . $replyTo;
    if (count($cc)) $headers[] = 'Cc: ' . implode(',', $cc);
    if (count($bcc)) $headers[] = 'Bcc: ' . implode(',', $bcc);
    $headers[] = 'MIME-Version: 1.0';

    $message = '';
    $subject = encode_header($subject);

    // Handle attachments via multipart/mixed
    if (count($attachments)) {
        $boundary = '==Multipart_Boundary_x' . md5(uniqid(time(), true)) . 'x';
        $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

        // Body part
        $message .= '--' . $boundary . "\r\n";
        $message .= 'Content-Type: ' . ($isHtml ? 'text/html' : 'text/plain') . '; charset="UTF-8"' . "\r\n";
        $message .= 'Content-Transfer-Encoding: 8bit' . "\r\n\r\n";
        $message .= $body . "\r\n\r\n";

        // Attachments
        foreach ($attachments as $att) {
            if (!isset($att['path']) || !is_readable($att['path'])) continue;
            $filename = isset($att['name']) ? $att['name'] : basename($att['path']);
            $ctype = isset($att['type']) ? $att['type'] : 'application/octet-stream';
            $data = file_get_contents($att['path']);
            if ($data === false) continue;
            $data = chunk_split(base64_encode($data));

            $message .= '--' . $boundary . "\r\n";
            $message .= 'Content-Type: ' . $ctype . '; name="' . addcslashes($filename, '"') . '"' . "\r\n";
            $message .= 'Content-Transfer-Encoding: base64' . "\r\n";
            $message .= 'Content-Disposition: attachment; filename="' . addcslashes($filename, '"') . '"' . "\r\n\r\n";
            $message .= $data . "\r\n\r\n";
        }

        $message .= '--' . $boundary . '--';
    } else {
        // Simple body
        $headers[] = 'Content-Type: ' . ($isHtml ? 'text/html' : 'text/plain') . '; charset="UTF-8"';
        $headers[] = 'Content-Transfer-Encoding: 8bit';
        $message = $body;
    }

    $headersStr = implode("\r\n", $headers);

    $ok = @mail($to, $subject, $message, $headersStr);

    if (!$ok && isset($cfg['debug']) && $cfg['debug']) {
        return array('ok' => false, 'debug' => array('to' => $to, 'headers' => $headers, 'subject' => $subject));
    }
    return array('ok' => (bool)$ok);
}

// Encode header (subject) for UTF-8
function encode_header($str) {
    // RFC 2047: =?UTF-8?B?...?=
    return '=?UTF-8?B?' . base64_encode($str) . '?=';
}
