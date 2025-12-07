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

    // If SMTP is enabled, use SMTP sending
    if (isset($cfg['use_smtp']) && $cfg['use_smtp']) {
        return eeo_mail_send_smtp($to, $subject, $body, $fromEmail, $fromName, $replyTo, $isHtml, $cc, $bcc, $cfg);
    }

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

// SMTP sending function (without authentication)
function eeo_mail_send_smtp($to, $subject, $body, $fromEmail, $fromName, $replyTo, $isHtml, $cc, $bcc, $cfg) {
    $smtpHost = $cfg['smtp_host'];
    $smtpPort = isset($cfg['smtp_port']) ? $cfg['smtp_port'] : 25;
    $smtpAuth = isset($cfg['smtp_auth']) ? $cfg['smtp_auth'] : false;
    $smtpSecure = isset($cfg['smtp_secure']) ? $cfg['smtp_secure'] : '';
    $debug = isset($cfg['debug']) ? $cfg['debug'] : false;

    $debugLog = array(); // Initialize debug log array
    $errno = 0;
    $errstr = '';
    
    // Connect to SMTP server
    $socket = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, 30);
    
    if (!$socket) {
        if ($debug) {
            return array('ok' => false, 'error' => "SMTP connection failed: $errstr ($errno)");
        }
        return array('ok' => false);
    }

    // Read greeting
    $response = fgets($socket, 515);
    if ($debug) $debugLog[] = "GREETING: $response";
    
    // Send EHLO
    $hostname = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
    fputs($socket, "EHLO $hostname\r\n");
    $response = fgets($socket, 515);
    if ($debug) $debugLog[] = "EHLO: $response";
    
    // Skip extended SMTP features
    while (substr($response, 3, 1) == '-') {
        $response = fgets($socket, 515);
        if ($debug) $debugLog[] = "EHLO CONT: $response";
    }
    
    // MAIL FROM
    fputs($socket, "MAIL FROM: <$fromEmail>\r\n");
    $response = fgets($socket, 515);
    if ($debug) $debugLog[] = "MAIL FROM: $response";
    if (substr($response, 0, 3) != '250') {
        fclose($socket);
        if ($debug) {
            return array('ok' => false, 'error' => 'MAIL FROM rejected', 'debug' => $debugLog);
        }
        return array('ok' => false);
    }
    
    // RCPT TO (main recipient)
    $recipients = is_array($to) ? $to : array($to);
    foreach ($recipients as $recipient) {
        fputs($socket, "RCPT TO: <$recipient>\r\n");
        $response = fgets($socket, 515);
        if ($debug) $debugLog[] = "RCPT TO $recipient: $response";
        if (substr($response, 0, 3) != '250') {
            fclose($socket);
            if ($debug) {
                return array('ok' => false, 'error' => "RCPT TO rejected: $recipient", 'debug' => $debugLog);
            }
            return array('ok' => false);
        }
    }
    
    // CC recipients
    foreach ($cc as $ccRecipient) {
        if ($ccRecipient) {
            fputs($socket, "RCPT TO: <$ccRecipient>\r\n");
            $response = fgets($socket, 515);
            if ($debug) $debugLog[] = "RCPT TO (CC) $ccRecipient: $response";
        }
    }
    
    // BCC recipients
    foreach ($bcc as $bccRecipient) {
        if ($bccRecipient) {
            fputs($socket, "RCPT TO: <$bccRecipient>\r\n");
            $response = fgets($socket, 515);
            if ($debug) $debugLog[] = "RCPT TO (BCC) $bccRecipient: $response";
        }
    }
    
    // DATA
    fputs($socket, "DATA\r\n");
    $response = fgets($socket, 515);
    if ($debug) $debugLog[] = "DATA: $response";
    if (substr($response, 0, 3) != '354') {
        fclose($socket);
        if ($debug) {
            return array('ok' => false, 'error' => 'DATA command rejected', 'debug' => $debugLog);
        }
        return array('ok' => false);
    }
    
    // Build email headers
    $fromHeader = $fromName ? "$fromName <$fromEmail>" : $fromEmail;
    $toHeader = is_array($to) ? implode(', ', $to) : $to;
    
    // ✅ UTF-8 ENCODING pro subject (RFC 2047)
    $encodedSubject = encode_header($subject);
    
    $headers = "From: $fromHeader\r\n";
    $headers .= "To: $toHeader\r\n";
    $headers .= "Subject: $encodedSubject\r\n";
    if ($replyTo) $headers .= "Reply-To: $replyTo\r\n";
    if (count($cc) > 0) $headers .= "Cc: " . implode(', ', $cc) . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: " . ($isHtml ? 'text/html' : 'text/plain') . "; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: 8bit\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "\r\n";
    
    // Send headers and body
    fputs($socket, $headers);
    fputs($socket, $body);
    fputs($socket, "\r\n.\r\n");
    
    $response = fgets($socket, 515);
    if ($debug) $debugLog[] = "SEND: $response";
    
    // QUIT
    fputs($socket, "QUIT\r\n");
    $response = fgets($socket, 515);
    if ($debug) $debugLog[] = "QUIT: $response";
    
    fclose($socket);
    
    if ($debug) {
        return array('ok' => true, 'debug' => $debugLog);
    }
    return array('ok' => true);
}
