<?php
/**
 * Email Template Helper Functions
 * Pomocné funkce pro práci s email šablonami obsahujícími více variant
 */

/**
 * Extrahuje specifickou variantu HTML šablony podle příjemce
 * 
 * @param string $email_body Celý email_body z DB (obsahuje obě varianty oddělené <!-- RECIPIENT: -->)
 * @param string $recipient_type Typ příjemce: 'APPROVER' nebo 'SUBMITTER'
 * @return string HTML šablona pro daného příjemce
 * 
 * @example
 * $template = get_email_template_by_recipient($email_body, 'APPROVER');
 * // Vrátí HTML od <!-- RECIPIENT: APPROVER --> do <!-- RECIPIENT: SUBMITTER -->
 */
function get_email_template_by_recipient($email_body, $recipient_type = 'APPROVER') {
    // Normalizace na velká písmena
    $recipient_type = strtoupper($recipient_type);
    
    // Kontrola podporovaných typů
    if (!in_array($recipient_type, ['APPROVER', 'SUBMITTER'])) {
        error_log("⚠️ Neznámý recipient_type: $recipient_type, použiji APPROVER");
        $recipient_type = 'APPROVER';
    }
    
    // Definice delimiteru
    $delimiter_approver = '<!-- RECIPIENT: APPROVER -->';
    $delimiter_submitter = '<!-- RECIPIENT: SUBMITTER -->';
    
    // Pokud šablona neobsahuje delimitery, vrátíme celou (zpětná kompatibilita)
    if (strpos($email_body, $delimiter_approver) === false) {
        error_log("ℹ️ Email šablona neobsahuje delimitery, vracím celou (starý formát)");
        return $email_body;
    }
    
    // Rozdělení podle delimiteru
    $parts = explode($delimiter_submitter, $email_body);
    
    if ($recipient_type === 'APPROVER') {
        // Vezmi část před <!-- RECIPIENT: SUBMITTER -->
        $template = $parts[0];
        // Odstraň <!-- RECIPIENT: APPROVER --> delimiter ze začátku
        $template = str_replace($delimiter_approver, '', $template);
        return trim($template);
    } else {
        // Vezmi část za <!-- RECIPIENT: SUBMITTER -->
        if (isset($parts[1])) {
            return trim($parts[1]);
        } else {
            error_log("⚠️ SUBMITTER šablona nenalezena, použiji APPROVER jako fallback");
            $template = $parts[0];
            $template = str_replace($delimiter_approver, '', $template);
            return trim($template);
        }
    }
}

/**
 * Detekuje zda je uživatel schvalovatel (příkazce) nebo autor objednávky
 * 
 * @param int $user_id ID uživatele, kterému posíláme email
 * @param array $order_data Data objednávky z DB
 * @return string 'APPROVER' nebo 'SUBMITTER'
 * 
 * @example
 * $recipient_type = detect_recipient_type($user_id, $order_data);
 * if ($recipient_type === 'APPROVER') {
 *     // Email pro schvalovatele
 * }
 */
function detect_recipient_type($user_id, $order_data) {
    // Pokud je user_id stejné jako prikazce_id → APPROVER
    if (isset($order_data['prikazce_id']) && $order_data['prikazce_id'] == $user_id) {
        return 'APPROVER';
    }
    
    // Pokud je user_id stejné jako garant_id → SUBMITTER (autor)
    if (isset($order_data['garant_id']) && $order_data['garant_id'] == $user_id) {
        return 'SUBMITTER';
    }
    
    // Pokud je user_id stejné jako vytvoril → SUBMITTER (autor)
    if (isset($order_data['vytvoril']) && $order_data['vytvoril'] == $user_id) {
        return 'SUBMITTER';
    }
    
    // Default: považuj za APPROVER (schvalovatel)
    return 'APPROVER';
}

/**
 * Příklad použití v notifikačním systému:
 * 
 * // 1. Načti šablonu z DB
 * $template = get_notification_template('order_status_ke_schvaleni');
 * 
 * // 2. Detekuj typ příjemce
 * $recipient_type = detect_recipient_type($user_id, $order_data);
 * 
 * // 3. Získej správnou HTML šablonu
 * $email_body = get_email_template_by_recipient($template['email_body'], $recipient_type);
 * 
 * // 4. Nahraď placeholdery
 * $email_body = str_replace('{user_name}', $order_data['user_name'], $email_body);
 * $email_body = str_replace('{approver_name}', $order_data['approver_name'], $email_body);
 * // ... atd.
 * 
 * // 5. Odešli email
 * eeo_mail_send($to, $subject, $email_body, true);
 */
