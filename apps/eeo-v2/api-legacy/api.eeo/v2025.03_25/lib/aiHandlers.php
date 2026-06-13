<?php

function ai_safe_filename_part($value) {
    $value = strtolower(trim((string)$value));
    if ($value === '') {
        return 'default';
    }
    $value = preg_replace('/[^a-z0-9_\-]/', '_', $value);
    return $value !== '' ? $value : 'default';
}

function ai_history_file_path($user_id, $conversation_id) {
    $base_dir = rtrim(sys_get_temp_dir(), '/');
    $history_dir = $base_dir . '/erdms_ai_chat';
    if (!is_dir($history_dir)) {
        @mkdir($history_dir, 0770, true);
    }

    $safe_user = ai_safe_filename_part($user_id);
    $safe_conv = ai_safe_filename_part($conversation_id);
    return $history_dir . '/history_' . $safe_user . '_' . $safe_conv . '.json';
}

function ai_normalize_messages($messages) {
    $normalized = array();
    if (!is_array($messages)) {
        return $normalized;
    }

    foreach ($messages as $msg) {
        if (!is_array($msg)) {
            continue;
        }

        $role = isset($msg['role']) ? trim((string)$msg['role']) : '';
        $content = isset($msg['content']) ? $msg['content'] : '';

        if (!in_array($role, array('system', 'user', 'assistant'), true)) {
            continue;
        }

        if (is_string($content)) {
            $content = trim($content);
        }

        if ($content === '' || $content === null) {
            continue;
        }

        $normalized[] = array(
            'role' => $role,
            'content' => $content
        );
    }

    return $normalized;
}

function ai_load_history($history_path) {
    if (!is_string($history_path) || $history_path === '' || !file_exists($history_path)) {
        return array();
    }

    $raw = @file_get_contents($history_path);
    if ($raw === false || trim($raw) === '') {
        return array();
    }

    $decoded = json_decode($raw, true);
    return ai_normalize_messages($decoded);
}

function ai_save_history($history_path, $messages) {
    if (!is_string($history_path) || $history_path === '') {
        return;
    }
    @file_put_contents($history_path, json_encode($messages, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function ai_openrouter_request($endpoint, $api_key, $payload, &$http_code, &$transport_error) {
    $http_code = 0;
    $transport_error = '';
    $raw_response = false;
    $payload_json = json_encode($payload, JSON_UNESCAPED_UNICODE);

    if ($payload_json === false) {
        $transport_error = 'Nepodařilo se serializovat JSON payload';
        return null;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($endpoint);
        if ($ch === false) {
            $transport_error = 'Nepodařilo se inicializovat HTTP klient';
            return null;
        }

        $headers = array(
            'Content-Type: application/json',
            'Authorization: Bearer ' . $api_key
        );

        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload_json);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

        $raw_response = curl_exec($ch);
        $http_code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $transport_error = (string)curl_error($ch);
        curl_close($ch);
    } else {
        $context = stream_context_create(array(
            'http' => array(
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n" . "Authorization: Bearer " . $api_key . "\r\n",
                'content' => $payload_json,
                'timeout' => 45,
                'ignore_errors' => true
            )
        ));

        $raw_response = @file_get_contents($endpoint, false, $context);
        if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
            if (preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
                $http_code = (int)$m[1];
            }
        }
        if ($raw_response === false) {
            $transport_error = 'file_get_contents selhal';
        }
    }

    if ($raw_response === false) {
        return null;
    }

    $decoded = json_decode($raw_response, true);
    if (!is_array($decoded)) {
        $transport_error = 'AI provider vratil neplatny JSON';
        return null;
    }

    return $decoded;
}

function ai_extract_reply_text($decoded) {
    if (isset($decoded['choices'][0]['message']['content']) && is_string($decoded['choices'][0]['message']['content'])) {
        return trim($decoded['choices'][0]['message']['content']);
    }
    return '';
}

function ai_sanitize_user_reply_text($text) {
    $text = trim((string)$text);
    if ($text === '') {
        return '';
    }

    $lines = preg_split('/\R/u', $text);
    $clean = array();

    foreach ($lines as $line) {
        $lineTrim = trim((string)$line);
        if ($lineTrim === '') {
            $clean[] = '';
            continue;
        }

        // Některé free modely vrací interní metadata místo odpovědi.
        if (preg_match('/^(user\s*safety|assistant\s*safety|prompt\s*safety|response\s*safety|content\s*safety|model\s*safety|safety|moderation)\s*:/i', $lineTrim)) {
            continue;
        }

        // Odfiltrovat technické artefakty (fragmenty JS/React kódu), které se nemají ukázat uživateli.
        if (preg_match('/^\}\s*,\s*\[[^\]]+\]\s*\)\s*;?$/', $lineTrim)) {
            continue;
        }
        if (preg_match('/\buseCallback\b|\buseEffect\b|\bsetState\b|\bconversation_id\b|\baiQuickChat\w*\b/i', $lineTrim)) {
            continue;
        }

        $clean[] = $line;
    }

    $out = trim(implode("\n", $clean));
    return $out;
}

function ai_extract_reference_number($text) {
    $text = trim((string)$text);
    if ($text === '') {
        return null;
    }

    if (preg_match('/\b\d{4}[-\/]\d{2,6}\b/u', $text, $m)) {
        return $m[0];
    }
    if (preg_match('/\b\d{6,}\b/u', $text, $m)) {
        return $m[0];
    }
    return null;
}

function ai_extract_json_object_from_text($text) {
    if (!is_string($text)) {
        return null;
    }

    $trimmed = trim($text);
    if ($trimmed === '') {
        return null;
    }

    if (strpos($trimmed, '```') === 0) {
        $trimmed = preg_replace('/^```(?:json)?\s*/i', '', $trimmed);
        $trimmed = preg_replace('/\s*```$/', '', $trimmed);
        $trimmed = trim($trimmed);
    }

    $decoded = json_decode($trimmed, true);
    if (is_array($decoded)) {
        return $decoded;
    }

    if (preg_match('/\{.*\}/s', $trimmed, $m)) {
        $decoded = json_decode($m[0], true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return null;
}

function ai_strip_code_fences($text) {
    if (!is_string($text)) {
        return '';
    }
    $out = trim($text);
    if (strpos($out, '```') === 0) {
        $out = preg_replace('/^```(?:sql|json)?\s*/i', '', $out);
        $out = preg_replace('/\s*```$/', '', $out);
    }
    return trim($out);
}

function ai_get_allowed_sql_tables() {
    $tables = array();
    if (defined('TBL_OBJEDNAVKY')) {
        $tables[] = TBL_OBJEDNAVKY;
    }
    if (defined('TBL_FAKTURY')) {
        $tables[] = TBL_FAKTURY;
    }
    if (defined('TBL_SMLOUVY')) {
        $tables[] = TBL_SMLOUVY;
    }
    if (defined('TBL_UZIVATELE')) {
        $tables[] = TBL_UZIVATELE;
    }

    return array_values(array_unique(array_filter($tables, function($v) {
        return is_string($v) && trim($v) !== '';
    })));
}

function ai_get_table_schema_text($db, $table_name) {
    $schema_name = ai_get_current_schema_name($db);
    if ($schema_name === null) {
        return null;
    }

    try {
        $stmt = $db->prepare('SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION');
        $stmt->execute(array($schema_name, $table_name));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return null;
    }

    if (!is_array($rows) || empty($rows)) {
        return null;
    }

    $lines = array();
    $lines[] = 'Tabulka: ' . $table_name;
    $lines[] = 'Sloupce:';
    foreach ($rows as $r) {
        $col = isset($r['COLUMN_NAME']) ? (string)$r['COLUMN_NAME'] : '';
        $type = isset($r['DATA_TYPE']) ? (string)$r['DATA_TYPE'] : '';
        if ($col !== '') {
            $lines[] = '  - ' . $col . ' (' . $type . ')';
        }
    }

    return implode("\n", $lines);
}

function ai_build_sql_schema_prompt($db, $tables) {
    $chunks = array();
    foreach ($tables as $table_name) {
        $chunk = ai_get_table_schema_text($db, $table_name);
        if (is_string($chunk) && $chunk !== '') {
            $chunks[] = $chunk;
        }
    }

    if (empty($chunks)) {
        return '';
    }

    $relations = "Mozne vazby mezi tabulkami (pouzij jen pokud sloupce existuji):\n"
        . "- faktury.objednavka_id = objednavky.id\n"
        . "- faktury.smlouva_id = smlouvy.id\n"
        . "- objednavky.smlouva_id = smlouvy.id\n"
        . "- kontakty lze hledat v tabulce uzivatele (jmeno, prijmeni, email, telefon)";

    return implode("\n\n", $chunks) . "\n\n" . $relations;
}

function ai_extract_tables_from_sql($sql) {
    $tables = array();
    if (!is_string($sql) || trim($sql) === '') {
        return $tables;
    }

    if (preg_match_all('/(?:from|join)\s+`?([a-zA-Z0-9_]+)`?(?:\s|$)/i', $sql, $m)) {
        foreach ($m[1] as $table) {
            $table = trim((string)$table);
            if ($table !== '') {
                $tables[] = $table;
            }
        }
    }

    return array_values(array_unique($tables));
}

function ai_validate_select_sql($sql, $allowed_tables, &$reason, &$normalized_sql) {
    $reason = '';
    $normalized_sql = ai_strip_code_fences($sql);
    if ($normalized_sql === '') {
        $reason = 'Prazdny SQL dotaz';
        return false;
    }

    if (substr($normalized_sql, -1) === ';') {
        $normalized_sql = rtrim(substr($normalized_sql, 0, -1));
    }

    if (strpos($normalized_sql, ';') !== false) {
        $reason = 'Vice SQL statementu neni povoleno';
        return false;
    }

    if (preg_match('/(--|\/\*|#)/', $normalized_sql)) {
        $reason = 'SQL komentare nejsou povolene';
        return false;
    }

    if (!preg_match('/^SELECT\s+/i', $normalized_sql)) {
        $reason = 'Povolene jsou pouze SELECT dotazy';
        return false;
    }

    $forbidden = '/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE|RENAME|GRANT|REVOKE|CALL|DO|SET|USE|COMMIT|ROLLBACK|LOCK|UNLOCK|HANDLER|LOAD|OUTFILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i';
    if (preg_match($forbidden, $normalized_sql)) {
        $reason = 'Dotaz obsahuje nepovolenou operaci';
        return false;
    }

    if (preg_match('/\b(heslo|password|passwd|hash|salt|token)\b/i', $normalized_sql)) {
        $reason = 'Dotaz obsahuje nepovolene citlive sloupce';
        return false;
    }

    $used_tables = ai_extract_tables_from_sql($normalized_sql);
    if (empty($used_tables)) {
        $reason = 'Dotaz neobsahuje FROM/JOIN';
        return false;
    }

    $allowed_set = array_fill_keys($allowed_tables, true);
    foreach ($used_tables as $table) {
        if (!isset($allowed_set[$table])) {
            $reason = 'Dotaz pouziva nepovolenou tabulku: ' . $table;
            return false;
        }
    }

    if (defined('TBL_UZIVATELE') && in_array(TBL_UZIVATELE, $used_tables, true) && preg_match('/^SELECT\s+\*/i', $normalized_sql)) {
        $reason = 'SELECT * nad uzivateli neni povoleno';
        return false;
    }

    return true;
}

function ai_sanitize_rows_for_output($rows) {
    if (!is_array($rows)) {
        return array();
    }

    $out = array();
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $clean = array();
        foreach ($row as $key => $value) {
            $k = (string)$key;
            if (preg_match('/(heslo|password|passwd|hash|salt|token)/i', $k)) {
                continue;
            }
            $clean[$k] = $value;
        }
        $out[] = $clean;
    }

    return $out;
}

function ai_enforce_sql_limit($sql, $default_limit = 50) {
    $normalized = trim((string)$sql);
    if ($normalized === '') {
        return $normalized;
    }
    if (preg_match('/\blimit\s+\d+/i', $normalized)) {
        return $normalized;
    }
    return $normalized . ' LIMIT ' . (int)$default_limit;
}

function ai_generate_sql_query($endpoint, $api_key, $model, $schema_prompt, $user_query) {
    $sql_model = $_ENV['OPENROUTER_SQL_MODEL'] ?? $_SERVER['OPENROUTER_SQL_MODEL'] ?? getenv('OPENROUTER_SQL_MODEL');
    $sql_model = is_string($sql_model) ? trim($sql_model) : '';
    if ($sql_model === '') {
        $sql_model = $model;
    }

    $instruction = "Jsi expert na SQL a databaze. Tvym ukolem je prevest textovy pozadavek uzivatele do validniho SQL dotazu.\n"
        . "Pouzij striktne pouze schema nize:\n" . $schema_prompt . "\n\n"
        . "PRAVIDLA:\n"
        . "1) Vrat POUZE cisty SQL dotaz bez markdownu a bez vysvetleni.\n"
        . "2) Dotaz MUSI byt pouze SELECT.\n"
        . "3) Dotaz nesmi obsahovat INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE ani dalsi DDL/DML.\n"
        . "4) Pouzij pouze tabulky uvedene ve schematu.\n"
        . "5) U objednavek VZDY vracej sloupec cislo_objednavky (pokud existuje) a interni id vrat maximalne jako doplnkovy sloupec.\n"
        . "6) Interni id objednavky nikdy nepouzivej jako evidencni cislo objednavky.\n"
        . "7) Pokud dotaz nelze sestavit, vrat presne ERROR.";

    $payload = array(
        'model' => $sql_model,
        'messages' => array(
            array('role' => 'system', 'content' => $instruction),
            array('role' => 'user', 'content' => $user_query)
        ),
        'temperature' => 0.0
    );

    $http_code = 0;
    $transport_error = '';
    $decoded = ai_openrouter_request($endpoint, $api_key, $payload, $http_code, $transport_error);
    if ($decoded === null || $http_code < 200 || $http_code >= 300) {
        return array('ok' => false, 'sql' => '', 'model' => $sql_model, 'error' => ($transport_error !== '' ? $transport_error : 'AI SQL generovani selhalo'));
    }

    $sql_text = ai_extract_reply_text($decoded);
    if (strtoupper(trim($sql_text)) === 'ERROR') {
        return array('ok' => false, 'sql' => '', 'model' => $sql_model, 'error' => 'AI vratila ERROR');
    }

    return array('ok' => true, 'sql' => $sql_text, 'model' => $sql_model, 'error' => '');
}

function ai_execute_safe_select_sql($db, $sql, $max_rows = 50) {
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return array('ok' => false, 'rows' => array(), 'error' => 'SQL execute error: ' . $e->getMessage());
    }

    if (!is_array($rows)) {
        $rows = array();
    }
    if (count($rows) > $max_rows) {
        $rows = array_slice($rows, 0, $max_rows);
    }

    $rows = ai_sanitize_rows_for_output($rows);

    return array('ok' => true, 'rows' => $rows, 'error' => '');
}

function ai_build_sql_context($db, $endpoint, $api_key, $model, $user_query) {
    $allowed_tables = ai_get_allowed_sql_tables();
    if (empty($allowed_tables)) {
        return array('ok' => false, 'context' => '', 'sql' => '', 'rows_count' => 0, 'error' => 'Nejsou dostupne povolene tabulky pro Text-to-SQL', 'sql_model' => '');
    }

    $schema_prompt = ai_build_sql_schema_prompt($db, $allowed_tables);
    if ($schema_prompt === '') {
        return array('ok' => false, 'context' => '', 'sql' => '', 'rows_count' => 0, 'error' => 'Nepodarilo se nacist schema tabulek pro Text-to-SQL', 'sql_model' => '');
    }

    $generated = ai_generate_sql_query($endpoint, $api_key, $model, $schema_prompt, $user_query);
    if (!$generated['ok']) {
        return array('ok' => false, 'context' => '', 'sql' => '', 'rows_count' => 0, 'error' => $generated['error'], 'sql_model' => $generated['model']);
    }

    $reason = '';
    $normalized_sql = '';
    if (!ai_validate_select_sql($generated['sql'], $allowed_tables, $reason, $normalized_sql)) {
        return array('ok' => false, 'context' => '', 'sql' => $generated['sql'], 'rows_count' => 0, 'error' => 'SQL validace selhala: ' . $reason, 'sql_model' => $generated['model']);
    }

    $limited_sql = ai_enforce_sql_limit($normalized_sql, 50);
    $executed = ai_execute_safe_select_sql($db, $limited_sql, 50);
    if (!$executed['ok']) {
        return array('ok' => false, 'context' => '', 'sql' => $limited_sql, 'rows_count' => 0, 'error' => $executed['error'], 'sql_model' => $generated['model']);
    }

    $rows = $executed['rows'];
    $rows_count = count($rows);
    $context = 'Text-to-SQL vysledek (' . $rows_count . ' radku): ' . json_encode($rows, JSON_UNESCAPED_UNICODE);

    return array('ok' => true, 'context' => $context, 'sql' => $limited_sql, 'rows_count' => $rows_count, 'error' => '', 'sql_model' => $generated['model']);
}

function ai_get_current_schema_name($db) {
    try {
        $stmt = $db->query('SELECT DATABASE() AS db_name');
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
        if (is_array($row) && isset($row['db_name']) && is_string($row['db_name']) && $row['db_name'] !== '') {
            return $row['db_name'];
        }
    } catch (Exception $e) {
    }
    return null;
}

function ai_get_table_columns($db, $table_name) {
    $schema_name = ai_get_current_schema_name($db);
    if ($schema_name === null || !is_string($table_name) || $table_name === '') {
        return array();
    }

    try {
        $stmt = $db->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION');
        $stmt->execute(array($schema_name, $table_name));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = array();
        foreach ($rows as $row) {
            if (isset($row['COLUMN_NAME']) && is_string($row['COLUMN_NAME']) && $row['COLUMN_NAME'] !== '') {
                $out[] = $row['COLUMN_NAME'];
            }
        }
        return $out;
    } catch (Exception $e) {
        return array();
    }
}

function ai_find_reference_row($db, $table_name, $reference, $candidate_columns, $preferred_select_columns) {
    if (!is_string($table_name) || $table_name === '' || !is_string($reference) || trim($reference) === '') {
        return null;
    }

    $reference = trim($reference);
    $available_columns = ai_get_table_columns($db, $table_name);
    if (empty($available_columns)) {
        return null;
    }

    $column_set = array_fill_keys($available_columns, true);

    $search_columns = array();
    foreach ($candidate_columns as $col) {
        if (isset($column_set[$col])) {
            $search_columns[] = $col;
        }
    }

    if (empty($search_columns)) {
        foreach ($available_columns as $col) {
            if (strpos($col, 'cislo') !== false || strpos($col, 'kod') !== false || strpos($col, 'vs') !== false) {
                $search_columns[] = $col;
            }
        }
    }

    if (empty($search_columns)) {
        return null;
    }

    $select_columns = array();
    foreach ($preferred_select_columns as $col) {
        if (isset($column_set[$col])) {
            $select_columns[] = $col;
        }
    }
    if (empty($select_columns)) {
        $select_columns = array_slice($available_columns, 0, 12);
    }

    $safe_search_columns = array();
    foreach ($search_columns as $col) {
        if (preg_match('/^[a-zA-Z0-9_]+$/', $col)) {
            $safe_search_columns[] = $col;
        }
    }
    if (empty($safe_search_columns)) {
        return null;
    }

    $safe_select_columns = array();
    foreach ($select_columns as $col) {
        if (preg_match('/^[a-zA-Z0-9_]+$/', $col)) {
            $safe_select_columns[] = $col;
        }
    }
    if (empty($safe_select_columns)) {
        return null;
    }

    $where_parts = array();
    $params = array();
    foreach ($safe_search_columns as $col) {
        $where_parts[] = 'CAST(`' . $col . '` AS CHAR) = ?';
        $params[] = $reference;
        $where_parts[] = 'CAST(`' . $col . '` AS CHAR) LIKE ?';
        $params[] = '%' . $reference . '%';
    }

    $sql = 'SELECT ';
    $select_sql_parts = array();
    foreach ($safe_select_columns as $col) {
        $select_sql_parts[] = '`' . $col . '`';
    }
    $sql .= implode(', ', $select_sql_parts);
    $sql .= ' FROM `' . $table_name . '` WHERE (' . implode(' OR ', $where_parts) . ') LIMIT 1';

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    } catch (Exception $e) {
        return null;
    }
}

function ai_assoc_to_context_text($prefix, $row) {
    if (!is_array($row) || empty($row)) {
        return $prefix . ': data nebyla nalezena.';
    }

    $parts = array();
    foreach ($row as $key => $value) {
        if (is_scalar($value) || $value === null) {
            $parts[] = $key . '=' . (string)$value;
        }
    }

    if (empty($parts)) {
        return $prefix . ': data byla nalezena, ale nejsou vhodna k zobrazeni.';
    }

    return $prefix . ': ' . implode(', ', $parts);
}

function ai_fetch_order_context($db, $reference) {
    if (!defined('TBL_OBJEDNAVKY')) {
        return 'Objednavky: konstanta TBL_OBJEDNAVKY neni dostupna.';
    }

    $row = ai_find_reference_row(
        $db,
        TBL_OBJEDNAVKY,
        $reference,
        array('cislo_objednavky', 'objednavka_cislo', 'cislo_faktury', 'id'),
        array('id', 'cislo_objednavky', 'predmet', 'stav_objednavky', 'stav_id', 'max_cena_s_dph', 'datum_objednavky', 'dt_vytvoreni')
    );

    return ai_assoc_to_context_text('Data z interni DB objednavek', $row);
}

function ai_fetch_invoice_context($db, $reference) {
    if (!defined('TBL_FAKTURY')) {
        return 'Faktury: konstanta TBL_FAKTURY neni dostupna.';
    }

    $row = ai_find_reference_row(
        $db,
        TBL_FAKTURY,
        $reference,
        array('fa_cislo_vema', 'cislo_faktury', 'faktura_cislo', 'fa_vs', 'variabilni_symbol', 'id'),
        array('id', 'fa_cislo_vema', 'fa_vs', 'fa_typ', 'fa_castka', 'fa_datum_splatnosti', 'fa_datum_vystaveni', 'fa_dorucena', 'dt_vytvoreni')
    );

    return ai_assoc_to_context_text('Data z interni DB faktur', $row);
}

function ai_fetch_contract_context($db, $reference) {
    if (!defined('TBL_SMLOUVY')) {
        return 'Smlouvy: konstanta TBL_SMLOUVY neni dostupna.';
    }

    $row = ai_find_reference_row(
        $db,
        TBL_SMLOUVY,
        $reference,
        array('cislo_smlouvy', 'smlouva_cislo', 'cislo', 'id'),
        array('id', 'cislo_smlouvy', 'predmet', 'stav', 'datum_podpisu', 'datum_splatnosti', 'dt_vytvoreni')
    );

    return ai_assoc_to_context_text('Data z interni DB smluv', $row);
}

function ai_guess_contact_search_term($query) {
    $query = trim((string)$query);
    if ($query === '') {
        return '';
    }

    if (preg_match('/\bna\s+([\p{L}\-]{2,40})\b/iu', $query, $m)) {
        return trim($m[1]);
    }

    if (preg_match_all('/[\p{L}\-]{2,40}/u', $query, $m)) {
        $stop = array('jaky','je','telefon','tel','cislo','kontakt','na','prosim','email','mail','atd','jakyho','jake','jaka','kde');
        $best = '';
        foreach ($m[0] as $token) {
            $t = mb_strtolower($token);
            if (in_array($t, $stop, true)) {
                continue;
            }
            if (mb_strlen($token) > mb_strlen($best)) {
                $best = $token;
            }
        }
        return $best;
    }

    return '';
}

function ai_fetch_contact_context($db, $query) {
    if (!defined('TBL_UZIVATELE')) {
        return 'Kontakty: konstanta TBL_UZIVATELE neni dostupna.';
    }

    $search_term = ai_guess_contact_search_term($query);
    if ($search_term === '') {
        return 'Kontakty: pro vyhledani je potreba jmeno nebo prijmeni.';
    }

    $table = TBL_UZIVATELE;
    $columns = ai_get_table_columns($db, $table);
    if (empty($columns)) {
        return 'Kontakty: nepodarilo se nacist schema tabulky uzivatelu.';
    }

    $colset = array_fill_keys($columns, true);

    $search_candidates = array('prijmeni', 'jmeno', 'username', 'email', 'telefon', 'mobil');
    $search_cols = array();
    foreach ($search_candidates as $c) {
        if (isset($colset[$c])) {
            $search_cols[] = $c;
        }
    }
    if (empty($search_cols)) {
        return 'Kontakty: nejsou dostupne vhodne vyhledavaci sloupce.';
    }

    $display_candidates = array('id', 'jmeno', 'prijmeni', 'username', 'email', 'telefon', 'mobil', 'usek_id');
    $display_cols = array();
    foreach ($display_candidates as $c) {
        if (isset($colset[$c]) && !preg_match('/(heslo|password|passwd|hash|salt|token)/i', $c)) {
            $display_cols[] = $c;
        }
    }
    if (empty($display_cols)) {
        return 'Kontakty: nejsou dostupne bezpecne sloupce pro zobrazeni.';
    }

    $where_parts = array();
    $params = array();
    foreach ($search_cols as $c) {
        $where_parts[] = 'LOWER(CAST(`' . $c . '` AS CHAR)) LIKE ?';
        $params[] = '%' . mb_strtolower($search_term) . '%';
    }

    $sql = 'SELECT ';
    $select_parts = array();
    foreach ($display_cols as $c) {
        $select_parts[] = '`' . $c . '`';
    }
    $sql .= implode(', ', $select_parts);
    $sql .= ' FROM `' . $table . '` WHERE (' . implode(' OR ', $where_parts) . ') LIMIT 5';

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return 'Kontakty: vyhledani selhalo.';
    }

    $rows = ai_sanitize_rows_for_output(is_array($rows) ? $rows : array());
    if (empty($rows)) {
        return 'Kontakty: pro hledany vyraz "' . $search_term . '" nebyla nalezena shoda.';
    }

    return 'Data z interni DB uzivatelu (kontakty): ' . json_encode($rows, JSON_UNESCAPED_UNICODE);
}

function ai_is_news_query($query) {
    $q = mb_strtolower(trim((string)$query));
    if ($q === '') {
        return false;
    }

    return (bool)preg_match('/\b(zpravy|zprava|novinky|novinka|aktuality|udalosti|co\s+je\s+noveho|co\s+noveho)\b/u', $q);
}

function ai_compact_url_for_chat($url, $max_len = 56) {
    $url = trim((string)$url);
    if ($url === '') {
        return '';
    }

    $parsed = parse_url($url);
    if (!is_array($parsed) || empty($parsed['host'])) {
        return $url;
    }

    $host = strtolower((string)$parsed['host']);
    $host = preg_replace('/^www\./i', '', $host);
    $path = isset($parsed['path']) ? (string)$parsed['path'] : '';
    $path = preg_replace('#/+#', '/', $path);
    $path = trim($path, '/');

    $compact = $host;
    if ($path !== '') {
        $segments = array_values(array_filter(explode('/', $path), function($s) {
            return trim((string)$s) !== '';
        }));

        if (count($segments) === 1) {
            $compact .= '/' . $segments[0];
        } elseif (count($segments) >= 2) {
            $last = $segments[count($segments) - 1];
            $compact .= '/' . $segments[0] . '/…/' . $last;
        }
    }

    if ($compact === '') {
        $compact = $host;
    }

    if (mb_strlen($compact) > $max_len) {
        $compact = mb_substr($compact, 0, max(10, $max_len - 1)) . '…';
    }

    return $compact;
}

function ai_fetch_dashboard_rss_events($db, $max_items = 6) {
    $result = array(
        'ok' => false,
        'events' => array(),
        'context' => '',
        'error' => ''
    );

    if (!defined('TBL_NASTAVENI_GLOBALNI')) {
        $result['error'] = 'Chybi konstanta TBL_NASTAVENI_GLOBALNI.';
        return $result;
    }

    if (!function_exists('fetch_rss_feed')) {
        $rss_handlers = __DIR__ . '/rssHandlers.php';
        if (file_exists($rss_handlers)) {
            require_once $rss_handlers;
        }
    }

    if (!function_exists('fetch_rss_feed')) {
        $result['error'] = 'RSS parser neni dostupny.';
        return $result;
    }

    try {
        $stmt = $db->prepare("SELECT klic, hodnota FROM " . TBL_NASTAVENI_GLOBALNI . " WHERE klic LIKE 'rss_%'");
        $stmt->execute();
        $rss_settings = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rss_settings[$row['klic']] = $row['hodnota'];
        }
    } catch (Exception $e) {
        $result['error'] = 'Nepodarilo se nacist RSS nastaveni: ' . $e->getMessage();
        return $result;
    }

    $rss_enabled = ($rss_settings['rss_enabled'] ?? '0') === '1';
    if (!$rss_enabled) {
        $result['error'] = 'RSS feed widget je vypnuty v globalnim nastaveni.';
        return $result;
    }

    $feeds_json = $rss_settings['rss_feeds'] ?? '[]';
    $feeds = json_decode($feeds_json, true);
    if (!is_array($feeds) || empty($feeds)) {
        $result['error'] = 'RSS feedy nejsou nakonfigurovany.';
        return $result;
    }

    $db_max_items = (int)($rss_settings['rss_max_items'] ?? $max_items);
    $max_total = max(1, min(20, $db_max_items));
    $max_items = max(1, min((int)$max_items, $max_total));

    $all_items = array();
    foreach ($feeds as $feed) {
        $feed_url = isset($feed['url']) ? trim((string)$feed['url']) : '';
        $feed_name = isset($feed['name']) ? trim((string)$feed['name']) : 'RSS Feed';
        $feed_enabled = !isset($feed['enabled']) || (bool)$feed['enabled'];

        if (!$feed_enabled || $feed_url === '' || !filter_var($feed_url, FILTER_VALIDATE_URL)) {
            continue;
        }

        $parsed = parse_url($feed_url);
        $scheme = strtolower((string)($parsed['scheme'] ?? ''));
        if (!in_array($scheme, array('http', 'https'), true)) {
            continue;
        }

        $feed_result = fetch_rss_feed($feed_url, $feed_name, $max_items);
        if (!is_array($feed_result) || !isset($feed_result['items']) || !is_array($feed_result['items'])) {
            continue;
        }

        foreach ($feed_result['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $all_items[] = array(
                'title' => trim((string)($item['title'] ?? '')),
                'feed_name' => trim((string)($item['feed_name'] ?? $feed_name)),
                'pub_date' => trim((string)($item['pub_date'] ?? '')),
                'pub_date_raw' => trim((string)($item['pub_date_raw'] ?? '')),
                'link' => trim((string)($item['link'] ?? ''))
            );
        }
    }

    if (empty($all_items)) {
        $result['error'] = 'Nepodarilo se nacist zadne RSS udalosti.';
        return $result;
    }

    usort($all_items, function($a, $b) {
        $ta = strtotime((string)($a['pub_date_raw'] ?? ''));
        $tb = strtotime((string)($b['pub_date_raw'] ?? ''));
        return (int)$tb - (int)$ta;
    });

    $all_items = array_slice($all_items, 0, $max_items);

    $events = array();
    foreach ($all_items as $item) {
        $title = trim((string)($item['title'] ?? ''));
        if ($title === '') {
            continue;
        }
        $feed_name = trim((string)($item['feed_name'] ?? 'RSS'));
        $pub_date = trim((string)($item['pub_date'] ?? ''));
        $link = trim((string)($item['link'] ?? ''));
        $line = $feed_name . ': ' . $title;
        if ($pub_date !== '') {
            $line .= ' (' . $pub_date . ')';
        }
        if ($link !== '') {
            $compact_source = ai_compact_url_for_chat($link, 56);
            $line .= ' - zdroj: [' . $compact_source . '](' . $link . ')';
        }
        $events[] = $line;
    }

    if (empty($events)) {
        $result['error'] = 'RSS udalosti neobsahuji pouzitelne titulky.';
        return $result;
    }

    $result['ok'] = true;
    $result['events'] = $events;
    $result['context'] = 'Aktualni zpravy z RSS widgetu dashboardu: ' . json_encode($events, JSON_UNESCAPED_UNICODE);
    return $result;
}

function ai_is_count_query($query) {
    $q = mb_strtolower(trim((string)$query));
    if ($q === '') {
        return false;
    }

    $has_count_word = (bool)preg_match('/\b(kolik|pocet|pocty|celkem|souhrn|count|sum|soucet)\b/u', $q);
    $has_target = (bool)preg_match('/objednav|faktur/u', $q);

    // Filtrované count dotazy (jméno, uživatel, období, smlouva, ID atd.)
    // nesmí spadnout do server-direct agregace, ale mají jít přes SQL/context vrstvu.
    $has_filter_hint = (bool)preg_match('/\b(kdo|ktera|ktery|jmeno|prijmeni|uzivatel|uzivatelka|vytvoril|vytvorila|vytvorene|odbor|usek|organizac|dodavatel|smlouv|cislo|id|dnes|vcera|letos|loni|od|do)\b/u', $q);

    return $has_count_word && $has_target && !$has_filter_hint;
}

function ai_normalize_search_text($text) {
    $text = mb_strtolower(trim((string)$text));
    if ($text === '') {
        return '';
    }

    $map = array(
        'á' => 'a', 'ä' => 'a',
        'č' => 'c',
        'ď' => 'd',
        'é' => 'e', 'ě' => 'e',
        'í' => 'i',
        'ň' => 'n',
        'ó' => 'o', 'ö' => 'o',
        'ř' => 'r',
        'š' => 's',
        'ť' => 't',
        'ú' => 'u', 'ů' => 'u', 'ü' => 'u',
        'ý' => 'y',
        'ž' => 'z'
    );

    $text = strtr($text, $map);
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim($text);
}

function ai_extract_creator_name_hint($query) {
    $q = trim((string)$query);
    if ($q === '') {
        return '';
    }

    $q_lc = mb_strtolower($q);
    if (!preg_match('/objednav/u', $q_lc) || !preg_match('/vytvoril|vytvorila|vytvorene/u', $q_lc)) {
        return '';
    }

    if (preg_match('/uzivatelk[ay]\s+([[:alpha:]\-]{2,})/u', $q, $m)) {
        return trim((string)$m[1]);
    }
    if (preg_match('/uzivatel(?:em|ka)?\s+([[:alpha:]\-]{2,})/u', $q, $m)) {
        return trim((string)$m[1]);
    }
    if (preg_match('/vytvoril(?:a)?\s+([[:alpha:]\-]{2,})/u', $q, $m)) {
        return trim((string)$m[1]);
    }

    return '';
}

function ai_match_users_by_name_hint($db, $name_hint) {
    $out = array(
        'user_ids' => array(),
        'display_names' => array()
    );

    if (!defined('TBL_UZIVATELE')) {
        return $out;
    }

    $name_hint_norm = ai_normalize_search_text($name_hint);
    if ($name_hint_norm === '') {
        return $out;
    }

    try {
        $stmt = $db->query('SELECT `id`, `jmeno`, `prijmeni`, `username` FROM `' . TBL_UZIVATELE . '` WHERE `aktivni` = 1');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : array();
    } catch (Exception $e) {
        return $out;
    }

    foreach ((array)$rows as $r) {
        $id = isset($r['id']) ? (int)$r['id'] : 0;
        if ($id <= 0) {
            continue;
        }

        $jmeno = isset($r['jmeno']) ? trim((string)$r['jmeno']) : '';
        $prijmeni = isset($r['prijmeni']) ? trim((string)$r['prijmeni']) : '';
        $username = isset($r['username']) ? trim((string)$r['username']) : '';

        $variants = array_filter(array(
            $jmeno,
            $prijmeni,
            trim($jmeno . ' ' . $prijmeni),
            $username
        ));

        $matched = false;
        foreach ($variants as $v) {
            if (strpos(ai_normalize_search_text($v), $name_hint_norm) !== false) {
                $matched = true;
                break;
            }
        }

        if ($matched) {
            $out['user_ids'][] = $id;
            $out['display_names'][] = trim($jmeno . ' ' . $prijmeni) !== '' ? trim($jmeno . ' ' . $prijmeni) : $username;
        }
    }

    $out['user_ids'] = array_values(array_unique($out['user_ids']));
    $out['display_names'] = array_values(array_unique($out['display_names']));
    return $out;
}

function ai_count_orders_by_creator_name($db, $query, $request_user_id, $is_admin) {
    $result = array(
        'handled' => false,
        'ok' => false,
        'count' => 0,
        'name_hint' => '',
        'matched_names' => array(),
        'error' => ''
    );

    $name_hint = ai_extract_creator_name_hint($query);
    if ($name_hint === '') {
        return $result;
    }
    $result['handled'] = true;
    $result['name_hint'] = $name_hint;

    if (!defined('TBL_OBJEDNAVKY')) {
        $result['error'] = 'Chybi konstanta TBL_OBJEDNAVKY';
        return $result;
    }

    $matched = ai_match_users_by_name_hint($db, $name_hint);
    $user_ids = isset($matched['user_ids']) ? (array)$matched['user_ids'] : array();
    $result['matched_names'] = isset($matched['display_names']) ? (array)$matched['display_names'] : array();

    if (empty($user_ids)) {
        $result['ok'] = true;
        $result['count'] = 0;
        return $result;
    }

    $order_cols = ai_get_table_columns($db, TBL_OBJEDNAVKY);
    $order_user_candidates = array(
        'uzivatel_id',
        'uzivatel_akt_id',
        'garant_uzivatel_id',
        'objednatel_id',
        'schvalovatel_id',
        'prikazce_id',
        'potvrdil_vecnou_spravnost_id'
    );
    $order_where_visibility = ai_build_user_visibility_conditions('o', $order_cols, $order_user_candidates, 'request_user_id');

    $in_ids = implode(',', array_map('intval', $user_ids));
    $sql = 'SELECT COUNT(*) AS cnt FROM `' . TBL_OBJEDNAVKY . '` o WHERE o.`aktivni` = 1 AND o.`id` > 1 AND o.`uzivatel_id` IN (' . $in_ids . ')';

    if (!$is_admin) {
        if (empty($order_where_visibility)) {
            $result['ok'] = true;
            $result['count'] = 0;
            return $result;
        }
        $sql .= ' AND (' . implode(' OR ', $order_where_visibility) . ')';
    }

    try {
        if ($is_admin) {
            $stmt = $db->query($sql);
        } else {
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':request_user_id', (int)$request_user_id, PDO::PARAM_INT);
            $stmt->execute();
        }
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
        $result['count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
        $result['ok'] = true;
    } catch (Exception $e) {
        $result['error'] = 'Chyba pri vypoctu poctu objednavek podle jmena: ' . $e->getMessage();
    }

    return $result;
}

function ai_is_status_query($query) {
    $q = mb_strtolower(trim((string)$query));
    if ($q === '') {
        return false;
    }

    $has_target = (bool)preg_match('/objednav|faktur/u', $q);
    $has_status_hint = (bool)preg_match('/stav|schval|schvá|schal|cek|ček|zamit|zamí|storn|zrus|zruš|doruc|doruč/u', $q);

    return $has_target && $has_status_hint;
}

function ai_build_status_query_reply($db, $query, $request_user_id, $is_admin) {
    $result = array(
        'handled' => false,
        'ok' => false,
        'reply' => '',
        'orders_count' => 0,
        'invoices_count' => 0,
        'error' => ''
    );

    if (!ai_is_status_query($query)) {
        return $result;
    }
    $result['handled'] = true;

    if (!defined('TBL_OBJEDNAVKY') || !defined('TBL_FAKTURY')) {
        $result['error'] = 'Chybi konstanty TBL_OBJEDNAVKY nebo TBL_FAKTURY';
        return $result;
    }

    $q = mb_strtolower(trim((string)$query));
    $asks_orders = (bool)preg_match('/objednav/u', $q);
    $asks_invoices = (bool)preg_match('/faktur/u', $q);
    if (!$asks_orders && !$asks_invoices) {
        $asks_orders = true;
        $asks_invoices = true;
    }

    $asks_approval = (bool)preg_match('/schval|schvá|schal|cek|ček/u', $q);

    $order_cols = ai_get_table_columns($db, TBL_OBJEDNAVKY);
    $invoice_cols = ai_get_table_columns($db, TBL_FAKTURY);
    if (empty($order_cols) || empty($invoice_cols)) {
        $result['error'] = 'Nepodarilo se nacist schema tabulek pro status dotaz';
        return $result;
    }

    $order_colset = array_fill_keys($order_cols, true);
    $invoice_colset = array_fill_keys($invoice_cols, true);

    $order_user_candidates = array(
        'uzivatel_id',
        'uzivatel_akt_id',
        'garant_uzivatel_id',
        'objednatel_id',
        'schvalovatel_id',
        'prikazce_id',
        'potvrdil_vecnou_spravnost_id'
    );
    $invoice_user_candidates = array(
        'fa_predana_zam_id',
        'potvrdil_vecnou_spravnost_id',
        'vytvoril_uzivatel_id'
    );

    $order_visibility = ai_build_user_visibility_conditions('o', $order_cols, $order_user_candidates, 'user_id');
    $invoice_visibility = array_merge(
        ai_build_user_visibility_conditions('f', $invoice_cols, $invoice_user_candidates, 'user_id'),
        ai_build_user_visibility_conditions('o', $order_cols, $order_user_candidates, 'user_id')
    );

    $out_lines = array();

    if ($asks_orders) {
        if (!$is_admin && empty($order_visibility)) {
            $result['orders_count'] = 0;
        } else {
            $order_base = ' FROM `' . TBL_OBJEDNAVKY . '` o WHERE o.`aktivni` = 1 AND o.`id` > 1';

            if ($asks_approval) {
                $approval_parts = array();
                if (isset($order_colset['stav_objednavky'])) {
                    $approval_parts[] = 'LOWER(o.`stav_objednavky`) LIKE \'%ke schv%\'';
                    $approval_parts[] = 'LOWER(o.`stav_objednavky`) LIKE \'%cekaj%\'';
                    $approval_parts[] = 'LOWER(o.`stav_objednavky`) LIKE \'%cek%\'';
                    $approval_parts[] = 'LOWER(o.`stav_objednavky`) LIKE \'%ček%\'';
                }
                if (isset($order_colset['stav_workflow_kod'])) {
                    $approval_parts[] = 'LOWER(o.`stav_workflow_kod`) LIKE \'%ke_schv%\'';
                    $approval_parts[] = 'LOWER(o.`stav_workflow_kod`) LIKE \'%cek%\'';
                    $approval_parts[] = 'LOWER(o.`stav_workflow_kod`) LIKE \'%ček%\'';
                }

                if (!empty($approval_parts)) {
                    $order_base .= ' AND (' . implode(' OR ', $approval_parts) . ')';
                }
                if (isset($order_colset['stav_objednavky'])) {
                    $order_base .= ' AND (o.`stav_objednavky` IS NULL OR o.`stav_objednavky` NOT IN (\'Zamítnutá\', \'Zamitnuta\', \'Zrušena\', \'Zrusena\', \'Storno\', \'Stornováno\', \'Stornovano\'))';
                }
            }

            if (!$is_admin) {
                $order_base .= ' AND (' . implode(' OR ', $order_visibility) . ')';
            }

            try {
                $count_sql = 'SELECT COUNT(*) AS cnt' . $order_base;
                if ($is_admin) {
                    $stmt = $db->query($count_sql);
                } else {
                    $stmt = $db->prepare($count_sql);
                    $stmt->bindValue(':user_id', (int)$request_user_id, PDO::PARAM_INT);
                    $stmt->execute();
                }
                $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
                $orders_count = isset($row['cnt']) ? (int)$row['cnt'] : 0;
                $result['orders_count'] = $orders_count;

                if ($asks_approval) {
                    if ($orders_count > 0) {
                        $out_lines[] = 'V rozsahu vasich opravneni je ' . $orders_count . ' objednavek ke schvaleni.';

                        $select_parts = array();
                        if (isset($order_colset['cislo_objednavky'])) {
                            $select_parts[] = 'o.`cislo_objednavky`';
                        }
                        if (isset($order_colset['id'])) {
                            $select_parts[] = 'o.`id`';
                        }
                        if (isset($order_colset['stav_objednavky'])) {
                            $select_parts[] = 'o.`stav_objednavky`';
                        }
                        if (isset($order_colset['stav_workflow_kod'])) {
                            $select_parts[] = 'o.`stav_workflow_kod`';
                        }
                        if (empty($select_parts)) {
                            $select_parts[] = 'o.`id`';
                        }

                        $list_sql = 'SELECT ' . implode(', ', $select_parts) . $order_base . ' ORDER BY o.`id` DESC LIMIT 5';
                        if ($is_admin) {
                            $list_stmt = $db->query($list_sql);
                        } else {
                            $list_stmt = $db->prepare($list_sql);
                            $list_stmt->bindValue(':user_id', (int)$request_user_id, PDO::PARAM_INT);
                            $list_stmt->execute();
                        }
                        $list_rows = $list_stmt ? $list_stmt->fetchAll(PDO::FETCH_ASSOC) : array();

                        foreach ((array)$list_rows as $r) {
                            $evid = trim((string)($r['cislo_objednavky'] ?? ''));
                            $id = isset($r['id']) ? (int)$r['id'] : 0;
                            $stav = trim((string)($r['stav_objednavky'] ?? ($r['stav_workflow_kod'] ?? 'neuveden')));

                            $label = $evid !== '' ? $evid : ('ID ' . $id);
                            if ($evid !== '' && $id > 0) {
                                $label .= ' (ID ' . $id . ')';
                            }
                            $out_lines[] = '- Objednavka ' . $label . ' - Stav: ' . ($stav !== '' ? $stav : 'neuveden');
                        }
                    } else {
                        $out_lines[] = 'V rozsahu vasich opravneni momentalne neevidujeme objednavky ke schvaleni.';
                    }
                } else {
                    $group_col = isset($order_colset['stav_objednavky']) ? 'o.`stav_objednavky`' : (isset($order_colset['stav_workflow_kod']) ? 'o.`stav_workflow_kod`' : null);
                    if ($group_col !== null) {
                        $group_sql = 'SELECT COALESCE(' . $group_col . ', \'(neuveden)\') AS stav, COUNT(*) AS cnt' . $order_base . ' GROUP BY ' . $group_col . ' ORDER BY cnt DESC LIMIT 6';
                        if ($is_admin) {
                            $group_stmt = $db->query($group_sql);
                        } else {
                            $group_stmt = $db->prepare($group_sql);
                            $group_stmt->bindValue(':user_id', (int)$request_user_id, PDO::PARAM_INT);
                            $group_stmt->execute();
                        }
                        $group_rows = $group_stmt ? $group_stmt->fetchAll(PDO::FETCH_ASSOC) : array();
                        if (!empty($group_rows)) {
                            $parts = array();
                            foreach ($group_rows as $gr) {
                                $parts[] = (string)$gr['stav'] . ': ' . (int)$gr['cnt'];
                            }
                            $out_lines[] = 'Prehled stavu objednavek: ' . implode(', ', $parts) . '.';
                        }
                    }
                }
            } catch (Exception $e) {
                $result['error'] = 'Chyba pri nacitani stavu objednavek: ' . $e->getMessage();
                return $result;
            }
        }
    }

    if ($asks_invoices) {
        if (!$is_admin && empty($invoice_visibility)) {
            $result['invoices_count'] = 0;
        } else {
            $invoice_base = ' FROM `' . TBL_FAKTURY . '` f LEFT JOIN `' . TBL_OBJEDNAVKY . '` o ON f.`objednavka_id` = o.`id` WHERE f.`aktivni` = 1';

            if ($asks_approval) {
                $inv_approval_parts = array();
                if (isset($invoice_colset['stav'])) {
                    $inv_approval_parts[] = 'LOWER(f.`stav`) LIKE \'%schval%\'';
                    $inv_approval_parts[] = 'LOWER(f.`stav`) LIKE \'%cek%\'';
                    $inv_approval_parts[] = 'LOWER(f.`stav`) LIKE \'%ček%\'';
                    $inv_approval_parts[] = 'f.`stav` IN (\'VECNA_SPRAVNOST\', \'K_ZAPLACENI\')';
                }
                if (!empty($inv_approval_parts)) {
                    $invoice_base .= ' AND (' . implode(' OR ', $inv_approval_parts) . ')';
                }
            }

            if (!$is_admin) {
                $invoice_base .= ' AND (' . implode(' OR ', $invoice_visibility) . ')';
            }

            try {
                if ($asks_approval) {
                    $inv_count_sql = 'SELECT COUNT(*) AS cnt' . $invoice_base;
                    if ($is_admin) {
                        $inv_stmt = $db->query($inv_count_sql);
                    } else {
                        $inv_stmt = $db->prepare($inv_count_sql);
                        $inv_stmt->bindValue(':user_id', (int)$request_user_id, PDO::PARAM_INT);
                        $inv_stmt->execute();
                    }
                    $inv_row = $inv_stmt ? $inv_stmt->fetch(PDO::FETCH_ASSOC) : null;
                    $result['invoices_count'] = isset($inv_row['cnt']) ? (int)$inv_row['cnt'] : 0;
                    $out_lines[] = 'Faktur ke schvaleni/evidencni kontrole je ' . (int)$result['invoices_count'] . '.';
                } else {
                    if (isset($invoice_colset['stav'])) {
                        $inv_group_sql = 'SELECT COALESCE(f.`stav`, \'(neuveden)\') AS stav, COUNT(*) AS cnt' . $invoice_base . ' GROUP BY f.`stav` ORDER BY cnt DESC LIMIT 6';
                        if ($is_admin) {
                            $inv_group_stmt = $db->query($inv_group_sql);
                        } else {
                            $inv_group_stmt = $db->prepare($inv_group_sql);
                            $inv_group_stmt->bindValue(':user_id', (int)$request_user_id, PDO::PARAM_INT);
                            $inv_group_stmt->execute();
                        }
                        $inv_group_rows = $inv_group_stmt ? $inv_group_stmt->fetchAll(PDO::FETCH_ASSOC) : array();
                        if (!empty($inv_group_rows)) {
                            $parts = array();
                            foreach ($inv_group_rows as $gr) {
                                $parts[] = (string)$gr['stav'] . ': ' . (int)$gr['cnt'];
                            }
                            $out_lines[] = 'Prehled stavu faktur: ' . implode(', ', $parts) . '.';
                        }
                    }
                }
            } catch (Exception $e) {
                $result['error'] = 'Chyba pri nacitani stavu faktur: ' . $e->getMessage();
                return $result;
            }
        }
    }

    if (empty($out_lines)) {
        $result['reply'] = 'Pro dany dotaz momentalne nemam dostupna data o stavech v rozsahu vasich opravneni.';
    } else {
        $result['reply'] = implode("\n", $out_lines);
    }

    $result['ok'] = true;
    return $result;
}

function ai_build_user_visibility_conditions($alias, $available_columns, $candidates, $param_name) {
    $conds = array();
    $set = array_fill_keys($available_columns, true);
    foreach ($candidates as $col) {
        if (isset($set[$col])) {
            $conds[] = $alias . '.`' . $col . '` = :' . $param_name;
        }
    }
    return $conds;
}

function ai_get_scoped_counts_context($db, $user_id, $is_admin) {
    $result = array(
        'orders_visible_count' => null,
        'invoices_visible_active_count' => null,
        'orders_rejected_count' => null,
        'orders_cancelled_count' => null,
        'ok' => false,
        'error' => ''
    );

    if (!defined('TBL_OBJEDNAVKY') || !defined('TBL_FAKTURY')) {
        $result['error'] = 'Chybi konstanty TBL_OBJEDNAVKY nebo TBL_FAKTURY';
        return $result;
    }

    $order_cols = ai_get_table_columns($db, TBL_OBJEDNAVKY);
    $invoice_cols = ai_get_table_columns($db, TBL_FAKTURY);

    if (empty($order_cols) || empty($invoice_cols)) {
        $result['error'] = 'Nepodarilo se nacist schema tabulek pro scoped counts';
        return $result;
    }

    $order_user_candidates = array(
        'uzivatel_id',
        'uzivatel_akt_id',
        'garant_uzivatel_id',
        'objednatel_id',
        'schvalovatel_id',
        'prikazce_id',
        'potvrdil_vecnou_spravnost_id'
    );
    $invoice_user_candidates = array(
        'fa_predana_zam_id',
        'potvrdil_vecnou_spravnost_id',
        'vytvoril_uzivatel_id'
    );

    $order_conds = ai_build_user_visibility_conditions('o', $order_cols, $order_user_candidates, 'user_id');
    $invoice_conds = ai_build_user_visibility_conditions('f', $invoice_cols, $invoice_user_candidates, 'user_id');
    $invoice_order_conds = ai_build_user_visibility_conditions('o', $order_cols, $order_user_candidates, 'user_id');

    $order_where_visibility = array_merge($order_conds);
    $invoice_where_visibility = array_merge($invoice_conds, $invoice_order_conds);

    $order_sql = 'SELECT COUNT(*) AS cnt FROM `' . TBL_OBJEDNAVKY . '` o WHERE o.`aktivni` = 1 AND o.`id` > 1 '
        . 'AND (o.`stav_objednavky` IS NULL OR o.`stav_objednavky` NOT IN (\'Zamítnutá\', \'Zamitnuta\', \'Zrušena\', \'Zrusena\', \'Storno\', \'Stornováno\', \'Stornovano\'))';
    if (!$is_admin) {
        if (empty($order_where_visibility)) {
            $result['orders_visible_count'] = 0;
        } else {
            $order_sql .= ' AND (' . implode(' OR ', $order_where_visibility) . ')';
            try {
                $stmt = $db->prepare($order_sql);
                $stmt->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
                $stmt->execute();
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $result['orders_visible_count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
            } catch (Exception $e) {
                $result['error'] = 'Chyba pri vypoctu poctu objednavek: ' . $e->getMessage();
                return $result;
            }
        }
    } else {
        try {
            $stmt = $db->query($order_sql);
            $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
            $result['orders_visible_count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
        } catch (Exception $e) {
            $result['error'] = 'Chyba pri vypoctu poctu objednavek: ' . $e->getMessage();
            return $result;
        }
    }

    $invoice_status_filter = '';
    if (isset($invoice_cols['stav'])) {
        $invoice_status_filter = ' AND f.`stav` IN (\'DOKONCENA\', \'VECNA_SPRAVNOST\', \'K_ZAPLACENI\', \'ZAPLACENO\')';
    }

    $invoice_sql = 'SELECT COUNT(*) AS cnt FROM `' . TBL_FAKTURY . '` f LEFT JOIN `' . TBL_OBJEDNAVKY . '` o ON f.`objednavka_id` = o.`id` WHERE f.`aktivni` = 1 AND (f.`objednavka_id` IS NULL OR f.`objednavka_id` > 1)' . $invoice_status_filter;
    if (!$is_admin) {
        if (empty($invoice_where_visibility)) {
            $result['invoices_visible_active_count'] = 0;
        } else {
            $invoice_sql .= ' AND (' . implode(' OR ', $invoice_where_visibility) . ')';
            try {
                $stmt = $db->prepare($invoice_sql);
                $stmt->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
                $stmt->execute();
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $result['invoices_visible_active_count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
            } catch (Exception $e) {
                $result['error'] = 'Chyba pri vypoctu poctu faktur: ' . $e->getMessage();
                return $result;
            }
        }
    } else {
        try {
            $stmt = $db->query($invoice_sql);
            $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
            $result['invoices_visible_active_count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
        } catch (Exception $e) {
            $result['error'] = 'Chyba pri vypoctu poctu faktur: ' . $e->getMessage();
            return $result;
        }
    }

    $result['ok'] = true;

    $status_base_sql = 'SELECT COUNT(*) AS cnt FROM `' . TBL_OBJEDNAVKY . '` o WHERE o.`aktivni` = 1 AND o.`id` > 1';

    $status_visibility = '';
    if (!$is_admin) {
        if (empty($order_where_visibility)) {
            $result['orders_rejected_count'] = 0;
            $result['orders_cancelled_count'] = 0;
            return $result;
        }
        $status_visibility = ' AND (' . implode(' OR ', $order_where_visibility) . ')';
    }

    $rejected_sql = $status_base_sql . ' AND o.`stav_objednavky` IN (\'Zamítnutá\', \'Zamitnuta\')' . $status_visibility;
    try {
        if ($is_admin) {
            $stmt = $db->query($rejected_sql);
        } else {
            $stmt = $db->prepare($rejected_sql);
            $stmt->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
            $stmt->execute();
        }
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
        $result['orders_rejected_count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
    } catch (Exception $e) {
        $result['error'] = 'Chyba pri vypoctu poctu zamitnutych objednavek: ' . $e->getMessage();
        return $result;
    }

    $cancelled_sql = $status_base_sql . ' AND o.`stav_objednavky` IN (\'Zrušena\', \'Zrusena\', \'Storno\', \'Stornováno\', \'Stornovano\')' . $status_visibility;
    try {
        if ($is_admin) {
            $stmt = $db->query($cancelled_sql);
        } else {
            $stmt = $db->prepare($cancelled_sql);
            $stmt->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
            $stmt->execute();
        }
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
        $result['orders_cancelled_count'] = isset($row['cnt']) ? (int)$row['cnt'] : 0;
    } catch (Exception $e) {
        $result['error'] = 'Chyba pri vypoctu poctu stornovanych/zrusenych objednavek: ' . $e->getMessage();
        return $result;
    }

    return $result;
}

function ai_weather_code_label($code) {
    $c = (int)$code;
    $map = array(
        0 => 'jasno',
        1 => 'prevazne jasno',
        2 => 'polojasno',
        3 => 'zatazeno',
        45 => 'mlha',
        48 => 'namrazova mlha',
        51 => 'slabe mrholeni',
        53 => 'mrholeni',
        55 => 'silne mrholeni',
        61 => 'slaby dest',
        63 => 'dest',
        65 => 'silny dest',
        71 => 'slabe snezeni',
        73 => 'snezeni',
        75 => 'silne snezeni',
        80 => 'prehanky',
        81 => 'destove prehanky',
        82 => 'silne prehanky',
        95 => 'bourky'
    );

    return isset($map[$c]) ? $map[$c] : ('kod ' . $c);
}

function ai_build_weather_daily_summary($decoded) {
    if (!is_array($decoded) || !isset($decoded['daily']) || !is_array($decoded['daily'])) {
        return '';
    }

    $daily = $decoded['daily'];
    if (!isset($daily['time']) || !is_array($daily['time'])) {
        return '';
    }

    $today = date('Y-m-d');
    $lines = array();
    $count = min(4, count($daily['time']));

    for ($i = 0; $i < $count; $i++) {
        $day = isset($daily['time'][$i]) ? (string)$daily['time'][$i] : '';
        if ($day === '') {
            continue;
        }

        $label = $day;
        if ($day === $today) {
            $label = 'Dnes';
        } elseif ($day === date('Y-m-d', strtotime('+1 day'))) {
            $label = 'Zitra';
        } elseif ($day === date('Y-m-d', strtotime('+2 day'))) {
            $label = 'Pozitri';
        } elseif ($day === date('Y-m-d', strtotime('-1 day'))) {
            $label = 'Vcera';
        }

        $tmax = isset($daily['temperature_2m_max'][$i]) ? $daily['temperature_2m_max'][$i] : '?';
        $tmin = isset($daily['temperature_2m_min'][$i]) ? $daily['temperature_2m_min'][$i] : '?';
        $wcode = isset($daily['weather_code'][$i]) ? $daily['weather_code'][$i] : null;
        $wtext = $wcode !== null ? ai_weather_code_label($wcode) : 'bez popisu';

        $lines[] = $label . ' (' . $day . '): min ' . $tmin . "°C, max " . $tmax . "°C, " . $wtext . '.';
    }

    return implode(' ', $lines);
}

function ai_extract_city_from_query($query) {
    if (!is_string($query) || trim($query) === '') {
        return null;
    }

    if (preg_match('/\bv\s+([\p{L}\-]{2,40})\b/u', $query, $m)) {
        return $m[1];
    }

    return null;
}

function ai_fetch_weather_context($query, $router_city) {
    $weather_url_template = $_ENV['AI_WEATHER_URL_TEMPLATE'] ?? $_SERVER['AI_WEATHER_URL_TEMPLATE'] ?? getenv('AI_WEATHER_URL_TEMPLATE');
    $weather_url_template = is_string($weather_url_template) ? trim($weather_url_template) : '';

    $city = is_string($router_city) && trim($router_city) !== '' ? trim($router_city) : ai_extract_city_from_query($query);
    if ($city === null || $city === '') {
        $city = 'Praha';
    }

    if ($weather_url_template === '') {
        return 'Internetovy zdroj pocasi neni nakonfigurovan (chybi AI_WEATHER_URL_TEMPLATE).';
    }

    $url = strpos($weather_url_template, '%s') !== false
        ? sprintf($weather_url_template, rawurlencode($city))
        : $weather_url_template;

    if (strpos($url, 'forecast_days=') === false) {
        $url .= (strpos($url, '?') !== false ? '&' : '?') . 'forecast_days=4';
    }
    if (strpos($url, 'past_days=') === false) {
        $url .= '&past_days=1';
    }

    $context = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 10,
            'ignore_errors' => true
        )
    ));

    $raw = @file_get_contents($url, false, $context);
    if ($raw === false || trim($raw) === '') {
        return 'Aktualni data pocasi z internetu se nepodarilo nacist pro mesto ' . $city . '.';
    }

    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        // Open-Meteo format (stejny zdroj jako dashboard widget)
        if (isset($decoded['current']) && is_array($decoded['current'])) {
            $cur = $decoded['current'];
            $temp = isset($cur['temperature_2m']) ? $cur['temperature_2m'] : '?';
            $apparent = isset($cur['apparent_temperature']) ? $cur['apparent_temperature'] : '?';
            $wind = isset($cur['wind_speed_10m']) ? $cur['wind_speed_10m'] : '?';
            $humidity = isset($cur['relative_humidity_2m']) ? $cur['relative_humidity_2m'] : '?';
            $daily_summary = ai_build_weather_daily_summary($decoded);
            return 'Aktualni data z internetu o pocasi: ' . $city
                . ': teplota ' . $temp . "°C"
                . ', pocitova ' . $apparent . "°C"
                . ', vitr ' . $wind . ' km/h'
                . ', vlhkost ' . $humidity . '%. '
                . 'Predpoved dalsich/predchozich dni: ' . $daily_summary;
        }

        // Alternativni format (napr. wttr-like)
        if (isset($decoded['current_condition'][0]['temp_C']) || isset($decoded['current_condition'][0]['weatherDesc'][0]['value'])) {
            $temp = $decoded['current_condition'][0]['temp_C'] ?? '?';
            $desc = $decoded['current_condition'][0]['weatherDesc'][0]['value'] ?? 'bez popisu';
            return 'Aktualni data z internetu o pocasi: ' . $city . ': ' . $temp . "°C, " . $desc;
        }
    }

    $snippet = mb_substr(trim($raw), 0, 300);
    return 'Aktualni data z internetu o pocasi (' . $city . '): ' . $snippet;
}

function ai_route_intent($endpoint, $api_key, $model, $user_query) {
    $router_model = $_ENV['OPENROUTER_ROUTER_MODEL'] ?? $_SERVER['OPENROUTER_ROUTER_MODEL'] ?? getenv('OPENROUTER_ROUTER_MODEL');
    $router_model = is_string($router_model) ? trim($router_model) : '';
    if ($router_model === '') {
        $router_model = $model;
    }

    $router_instruction = "Jsi mozek aplikace, ktery analyzuje text uzivatele a kategorizuje ho.\n"
        . "Tvym jedinym ukolem je vratit JSON s klici intent, parameter a city.\n"
        . "Povolene hodnoty intent: POCASI, OBJEDNAVKA, FAKTURA, SMLOUVA, KONTAKT, OBECNE.\n"
        . "Do parameter vytahni cislo objednavky nebo faktury, pokud je v dotazu. Jinak null.\n"
        . "Do city vytahni mesto pro pocasi, jinak null.\n"
        . "Odpovez pouze cistym JSONem bez dalsiho textu.";

    $router_payload = array(
        'model' => $router_model,
        'messages' => array(
            array('role' => 'system', 'content' => $router_instruction),
            array('role' => 'user', 'content' => $user_query)
        ),
        'temperature' => 0.0
    );

    $http_code = 0;
    $transport_error = '';
    $decoded = ai_openrouter_request($endpoint, $api_key, $router_payload, $http_code, $transport_error);

    if ($decoded !== null && $http_code >= 200 && $http_code < 300) {
        $reply = ai_extract_reply_text($decoded);
        $json = ai_extract_json_object_from_text($reply);
        if (is_array($json)) {
            $intent = isset($json['intent']) ? strtoupper(trim((string)$json['intent'])) : 'OBECNE';
            if (!in_array($intent, array('POCASI', 'OBJEDNAVKA', 'FAKTURA', 'SMLOUVA', 'KONTAKT', 'OBECNE'), true)) {
                $intent = 'OBECNE';
            }
            $parameter = isset($json['parameter']) ? $json['parameter'] : null;
            $city = isset($json['city']) ? $json['city'] : null;
            return array(
                'intent' => $intent,
                'parameter' => is_scalar($parameter) ? trim((string)$parameter) : null,
                'city' => is_scalar($city) ? trim((string)$city) : null,
                'router_model' => $router_model,
                'router_raw' => $reply
            );
        }
    }

    $fallback_intent = 'OBECNE';
    if (preg_match('/pocasi|teplota|venku|predpoved/u', $user_query)) {
        $fallback_intent = 'POCASI';
    } elseif (preg_match('/telefon|kontakt|email|mail|mobil|tel\.?/u', $user_query)) {
        $fallback_intent = 'KONTAKT';
    } elseif (preg_match('/faktur/u', $user_query)) {
        $fallback_intent = 'FAKTURA';
    } elseif (preg_match('/smlouv/u', $user_query)) {
        $fallback_intent = 'SMLOUVA';
    } elseif (preg_match('/objednav/u', $user_query)) {
        $fallback_intent = 'OBJEDNAVKA';
    }

    return array(
        'intent' => $fallback_intent,
        'parameter' => ai_extract_reference_number($user_query),
        'city' => ai_extract_city_from_query($user_query),
        'router_model' => $router_model,
        'router_raw' => ''
    );
}

/**
 * AI chat proxy endpoint (OpenRouter via backend).
 *
 * POST input:
 * - token (string)
 * - username (string)
 * - prompt (string) OR messages (array)
 * - model (optional, string)
 */
function handle_ai_chat_proxy($input, $config, $queries) {
    $token = isset($input['token']) ? trim((string)$input['token']) : '';
    $request_username = isset($input['username']) ? trim((string)$input['username']) : '';

    if ($token === '' || $request_username === '') {
        api_error(401, 'Chybí token nebo username', 'UNAUTHORIZED');
        return;
    }

    try {
        $db = get_db($config);
        if (function_exists('setMysqlTimezone')) {
            setMysqlTimezone($db);
        }
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return;
    }

    $token_data = verify_token_v2($request_username, $token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return;
    }

    // 🔒 AI CHAT - pouze pro SUPERADMIN
    $user_roles = isset($token_data['roles']) ? $token_data['roles'] : array();
    if (!in_array('SUPERADMIN', $user_roles)) {
        api_error(403, 'AI chat je dostupný pouze pro SUPERADMIN roli', 'INSUFFICIENT_PERMISSIONS');
        return;
    }

    $endpoint = $_ENV['OPENROUTER_API_URL'] ?? $_SERVER['OPENROUTER_API_URL'] ?? getenv('OPENROUTER_API_URL');
    $api_key = $_ENV['OPENROUTER_API_KEY'] ?? $_SERVER['OPENROUTER_API_KEY'] ?? getenv('OPENROUTER_API_KEY');
    $default_model = $_ENV['OPENROUTER_MODEL'] ?? $_SERVER['OPENROUTER_MODEL'] ?? getenv('OPENROUTER_MODEL');

    $endpoint = is_string($endpoint) ? trim($endpoint) : '';
    $api_key = is_string($api_key) ? trim($api_key) : '';
    $default_model = is_string($default_model) ? trim($default_model) : '';

    if ($endpoint === '' || $api_key === '') {
        api_error(500, 'AI konfigurace není nastavena na backendu', 'AI_CONFIG_MISSING');
        return;
    }

    $model = isset($input['model']) ? trim((string)$input['model']) : $default_model;
    if ($model === '') {
        $model = 'openrouter/free';
    }

    $conversation_id = isset($input['conversation_id']) ? trim((string)$input['conversation_id']) : 'default';
    if ($conversation_id === '') {
        $conversation_id = 'default';
    }

    $prompt = isset($input['prompt']) ? trim((string)$input['prompt']) : '';
    $messages = isset($input['messages']) && is_array($input['messages']) ? $input['messages'] : array();

    $history_path = ai_history_file_path((string)$token_data['id'], $conversation_id);
    $incoming_messages = ai_normalize_messages($messages);
    $stored_history = ai_load_history($history_path);

    $payload_messages = array();

    if (!empty($incoming_messages)) {
        $payload_messages = $incoming_messages;
    } elseif (!empty($stored_history)) {
        $payload_messages = $stored_history;
        if ($prompt !== '') {
            $payload_messages[] = array('role' => 'user', 'content' => $prompt);
        }
    } elseif ($prompt !== '') {
        $payload_messages[] = array('role' => 'user', 'content' => $prompt);
    }

    if (empty($payload_messages)) {
        api_error(400, 'Chybí prompt nebo messages', 'MISSING_PROMPT');
        return;
    }

    // Držíme pouze dialog + poslední část konverzace kvůli velikosti tokenů.
    $dialog_messages = array();
    foreach ($payload_messages as $msg) {
        if ($msg['role'] !== 'system') {
            $dialog_messages[] = $msg;
        }
    }
    $max_dialog_messages = 30;
    if (count($dialog_messages) > $max_dialog_messages) {
        $dialog_messages = array_slice($dialog_messages, -1 * $max_dialog_messages);
    }

    $latest_user_query = $prompt;
    for ($i = count($dialog_messages) - 1; $i >= 0; $i--) {
        if ($dialog_messages[$i]['role'] === 'user') {
            $latest_user_query = (string)$dialog_messages[$i]['content'];
            break;
        }
    }

    $router_result = ai_route_intent($endpoint, $api_key, $model, $latest_user_query);
    $intent = isset($router_result['intent']) ? $router_result['intent'] : 'OBECNE';
    $intent_parameter = isset($router_result['parameter']) ? $router_result['parameter'] : null;
    $intent_city = isset($router_result['city']) ? $router_result['city'] : null;
    $is_admin_user = !empty($token_data['is_admin']);

    if ((!is_string($intent_parameter) || trim($intent_parameter) === '') && is_string($latest_user_query)) {
        $intent_parameter = ai_extract_reference_number($latest_user_query);
    }

    $dynamic_context = 'Zadny specialni externi kontext neni potreba.';
    $context_source = 'none';

    if ($intent === 'POCASI') {
        $dynamic_context = ai_fetch_weather_context($latest_user_query, $intent_city);
        $context_source = 'internet_weather';
    } elseif ($intent === 'KONTAKT') {
        $dynamic_context = ai_fetch_contact_context($db, $latest_user_query);
        $context_source = 'contacts_db';
    } elseif ($intent === 'OBJEDNAVKA') {
        if (is_string($intent_parameter) && trim($intent_parameter) !== '') {
            $dynamic_context = ai_fetch_order_context($db, trim($intent_parameter));
        } else {
            $dynamic_context = 'Data z interni DB objednavek: dotaz je bez cisla objednavky.';
        }
        $context_source = 'orders_db';
    } elseif ($intent === 'FAKTURA') {
        if (is_string($intent_parameter) && trim($intent_parameter) !== '') {
            $dynamic_context = ai_fetch_invoice_context($db, trim($intent_parameter));
        } else {
            $dynamic_context = 'Data z interni DB faktur: dotaz je bez cisla faktury.';
        }
        $context_source = 'invoices_db';
    } elseif ($intent === 'SMLOUVA') {
        if (is_string($intent_parameter) && trim($intent_parameter) !== '') {
            $dynamic_context = ai_fetch_contract_context($db, trim($intent_parameter));
        } else {
            $dynamic_context = 'Data z interni DB smluv: dotaz je bez cisla smlouvy.';
        }
        $context_source = 'contracts_db';
    }

    $sql_context_result = array(
        'ok' => false,
        'context' => '',
        'sql' => '',
        'rows_count' => 0,
        'error' => '',
        'sql_model' => ''
    );

    $scoped_counts_result = array(
        'ok' => false,
        'orders_visible_count' => null,
        'invoices_visible_active_count' => null,
        'error' => ''
    );

    $count_query = ai_is_count_query($latest_user_query);
    $news_query = ai_is_news_query($latest_user_query);

    $status_result = ai_build_status_query_reply($db, $latest_user_query, (int)$token_data['id'], $is_admin_user);
    if ($status_result['handled'] && $status_result['ok']) {
        $direct_reply = (string)$status_result['reply'];

        $history_to_store = $dialog_messages;
        $history_to_store[] = array(
            'role' => 'assistant',
            'content' => $direct_reply
        );
        ai_save_history($history_path, $history_to_store);

        api_ok(array(
            'provider' => 'server-direct',
            'model' => 'server-direct-status',
            'intent' => $intent,
            'intent_parameter' => $intent_parameter,
            'context_source' => 'status_db',
            'router_model' => isset($router_result['router_model']) ? $router_result['router_model'] : $model,
            'router_trace' => array(
                'intent' => $intent,
                'parameter' => $intent_parameter,
                'city' => $intent_city,
                'source' => 'status_db',
                'latest_user_query' => $latest_user_query,
                'status_query' => true,
                'orders_count' => $status_result['orders_count'],
                'invoices_count' => $status_result['invoices_count'],
                'router_raw' => isset($router_result['router_raw']) ? $router_result['router_raw'] : ''
            ),
            'conversation_id' => $conversation_id,
            'history_count' => count($history_to_store),
            'reply' => $direct_reply,
            'choices' => array(),
            'usage' => null
        ));
        return;
    }

    if ($news_query) {
        $rss_news_result = ai_fetch_dashboard_rss_events($db, 6);
        if ($rss_news_result['ok']) {
            $events = array_values((array)$rss_news_result['events']);
            $events = array_slice($events, 0, 6);

            $direct_reply = "Aktualni udalosti z RSS feedu dashboardu:\n";
            foreach ($events as $idx => $event_line) {
                $direct_reply .= ((int)$idx + 1) . '. ' . (string)$event_line . "\n";
            }
            $direct_reply = trim($direct_reply);

            $history_to_store = $dialog_messages;
            $history_to_store[] = array(
                'role' => 'assistant',
                'content' => $direct_reply
            );
            ai_save_history($history_path, $history_to_store);

            api_ok(array(
                'provider' => 'server-direct',
                'model' => 'server-direct-rss-news',
                'intent' => $intent,
                'intent_parameter' => $intent_parameter,
                'context_source' => 'rss_dashboard_widget',
                'router_model' => isset($router_result['router_model']) ? $router_result['router_model'] : $model,
                'router_trace' => array(
                    'intent' => $intent,
                    'parameter' => $intent_parameter,
                    'city' => $intent_city,
                    'source' => 'rss_dashboard_widget',
                    'latest_user_query' => $latest_user_query,
                    'news_query' => true,
                    'rss_events_count' => count($events),
                    'router_raw' => isset($router_result['router_raw']) ? $router_result['router_raw'] : ''
                ),
                'conversation_id' => $conversation_id,
                'history_count' => count($history_to_store),
                'reply' => $direct_reply,
                'choices' => array(),
                'usage' => null
            ));
            return;
        }

        $dynamic_context = 'RSS zpravy/novinky nejsou dostupne: ' . (string)$rss_news_result['error'];
        $context_source = 'rss_dashboard_widget_error';
    }

    $creator_count_result = ai_count_orders_by_creator_name($db, $latest_user_query, (int)$token_data['id'], $is_admin_user);
    if ($creator_count_result['handled'] && $creator_count_result['ok']) {
        $name_text = trim(implode(', ', (array)$creator_count_result['matched_names']));
        if ($name_text === '') {
            $name_text = (string)$creator_count_result['name_hint'];
        }

        $direct_reply = 'Uzivatel ' . $name_text . ' ma v rozsahu vasich opravneni vytvoreno '
            . (int)$creator_count_result['count'] . ' aktivnich objednavek.';

        $history_to_store = $dialog_messages;
        $history_to_store[] = array(
            'role' => 'assistant',
            'content' => $direct_reply
        );
        ai_save_history($history_path, $history_to_store);

        api_ok(array(
            'provider' => 'server-direct',
            'model' => 'server-direct-filtered-count',
            'intent' => $intent,
            'intent_parameter' => $intent_parameter,
            'context_source' => $context_source,
            'router_model' => isset($router_result['router_model']) ? $router_result['router_model'] : $model,
            'router_trace' => array(
                'intent' => $intent,
                'parameter' => $intent_parameter,
                'city' => $intent_city,
                'source' => $context_source,
                'latest_user_query' => $latest_user_query,
                'dynamic_context' => $dynamic_context,
                'router_raw' => isset($router_result['raw']) ? $router_result['raw'] : '',
                'count_query' => $count_query,
                'creator_filtered_count' => true,
                'creator_name_hint' => $creator_count_result['name_hint'],
                'creator_names' => $creator_count_result['matched_names'],
                'creator_count' => $creator_count_result['count']
            ),
            'conversation_id' => $conversation_id,
            'history_count' => count($history_to_store),
            'reply' => $direct_reply,
            'choices' => array(),
            'usage' => null
        ));
        return;
    }

    if ($count_query) {
        $scoped_counts_result = ai_get_scoped_counts_context($db, (int)$token_data['id'], $is_admin_user);
        if ($scoped_counts_result['ok']) {
            $dynamic_context .= ' Agregovana data v rozsahu opravneni uzivatele: '
                . 'viditelne aktivni objednavky=' . (int)$scoped_counts_result['orders_visible_count'] . ', '
                . 'viditelne aktivni faktury=' . (int)$scoped_counts_result['invoices_visible_active_count'] . ', '
                . 'zamitnute objednavky=' . (int)$scoped_counts_result['orders_rejected_count'] . ', '
                . 'stornovane/zrusene objednavky=' . (int)$scoped_counts_result['orders_cancelled_count'] . '.';
            $context_source = $context_source === 'none' ? 'scoped_counts' : ($context_source . '+scoped_counts');
        }
    }

    if ($intent !== 'POCASI' && $intent !== 'KONTAKT' && !$count_query) {
        $sql_context_result = ai_build_sql_context($db, $endpoint, $api_key, $model, $latest_user_query);
        if ($sql_context_result['ok']) {
            $dynamic_context .= ' ' . $sql_context_result['context'];
            $context_source = $context_source === 'none' ? 'db_text_to_sql' : ($context_source . '+db_text_to_sql');
        }
    }

    if ($count_query && $scoped_counts_result['ok']) {
        $q = mb_strtolower($latest_user_query);
        $direct_reply = '';
        $asks_rejected = (bool)preg_match('/zamit|zamítn|zamitnut/u', $q);
        $asks_cancelled = (bool)preg_match('/storn|zrus|zruš/u', $q);

        if ($asks_rejected || $asks_cancelled) {
            if ($asks_rejected && $asks_cancelled) {
                $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                    . (int)$scoped_counts_result['orders_rejected_count'] . ' zamitnutych objednavek '
                    . 'a ' . (int)$scoped_counts_result['orders_cancelled_count'] . ' stornovanych/zrusenych objednavek.';
            } elseif ($asks_rejected) {
                $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                    . (int)$scoped_counts_result['orders_rejected_count'] . ' zamitnutych objednavek.';
            } else {
                $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                    . (int)$scoped_counts_result['orders_cancelled_count'] . ' stornovanych/zrusenych objednavek.';
            }
        } elseif (preg_match('/objednav/u', $q) && preg_match('/faktur/u', $q)) {
            $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                . (int)$scoped_counts_result['orders_visible_count'] . ' aktivnich objednavek '
                . 'a ' . (int)$scoped_counts_result['invoices_visible_active_count'] . ' aktivnich faktur.';
        } elseif (preg_match('/objednav/u', $q)) {
            $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                . (int)$scoped_counts_result['orders_visible_count'] . ' aktivnich objednavek.';
        } elseif (preg_match('/faktur/u', $q)) {
            $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                . (int)$scoped_counts_result['invoices_visible_active_count'] . ' aktivnich faktur.';
        } else {
            $direct_reply = 'V rozsahu vasich opravneni evidujeme '
                . (int)$scoped_counts_result['orders_visible_count'] . ' aktivnich objednavek a '
                . (int)$scoped_counts_result['invoices_visible_active_count'] . ' aktivnich faktur.';
        }

        $history_to_store = $dialog_messages;
        $history_to_store[] = array(
            'role' => 'assistant',
            'content' => $direct_reply
        );
        ai_save_history($history_path, $history_to_store);

        api_ok(array(
            'provider' => 'server-direct',
            'model' => 'server-direct-counts',
            'intent' => $intent,
            'intent_parameter' => $intent_parameter,
            'context_source' => $context_source,
            'router_model' => isset($router_result['router_model']) ? $router_result['router_model'] : $model,
            'router_trace' => array(
                'intent' => $intent,
                'parameter' => $intent_parameter,
                'city' => $intent_city,
                'source' => $context_source,
                'latest_user_query' => $latest_user_query,
                'dynamic_context' => $dynamic_context,
                'router_raw' => isset($router_result['router_raw']) ? $router_result['router_raw'] : '',
                'sql' => '',
                'sql_rows_count' => 0,
                'sql_ok' => false,
                'sql_error' => '',
                'sql_model' => '',
                'count_query' => $count_query,
                'scoped_counts_ok' => $scoped_counts_result['ok'],
                'scoped_counts_orders_visible' => $scoped_counts_result['orders_visible_count'],
                'scoped_counts_invoices_visible_active' => $scoped_counts_result['invoices_visible_active_count'],
                'scoped_counts_orders_rejected' => $scoped_counts_result['orders_rejected_count'],
                'scoped_counts_orders_cancelled' => $scoped_counts_result['orders_cancelled_count'],
                'scoped_counts_error' => $scoped_counts_result['error']
            ),
            'conversation_id' => $conversation_id,
            'history_count' => count($history_to_store),
            'reply' => $direct_reply,
            'choices' => array(),
            'usage' => null
        ));
        return;
    }

    $db_context = isset($input['db_context']) ? trim((string)$input['db_context']) : '';
    $final_system_instruction = "Jsi inteligentni asistent klientskeho servisu ERDMS.\n"
        . "KOMUNIKACNI PRAVIDLO: Musis odpovidat VZDY v perfektni, prirozene a gramaticky spravne cestine. "
        . "Nikdy nepouzivej anglicka slova, pokud to nejsou nazvy produktu. "
        . "Nikdy neprekladej fraze doslovne z anglictiny.\n"
        . "FORMAT OBJEDNAVEK: U objednavek vzdy uvadej evidencni cislo (cislo_objednavky). "
        . "Interni ID uvadej pouze doplnkove v zavorce, napr. O-2026-00123 (ID 456). "
        . "Nikdy neoznacuj samotne ID jako cislo objednavky.\n"
        . "Odpovidej strucne, vecne a dr se kontextu konverzace.\n"
        . "Rozpoznany zamer uzivatele: " . $intent . ".\n"
        . "Zde jsou extrahovana data, ktera pouzijes jen pokud jsou relevantni: " . $dynamic_context;

    if ($db_context !== '') {
        $final_system_instruction .= " Dodatecny DB kontext: " . $db_context;
    }

    $router_trace = array(
        'intent' => $intent,
        'parameter' => $intent_parameter,
        'city' => $intent_city,
        'source' => $context_source,
        'latest_user_query' => $latest_user_query,
        'dynamic_context' => $dynamic_context,
        'router_raw' => isset($router_result['router_raw']) ? $router_result['router_raw'] : '',
        'sql' => $sql_context_result['sql'],
        'sql_rows_count' => $sql_context_result['rows_count'],
        'sql_ok' => $sql_context_result['ok'],
        'sql_error' => $sql_context_result['error'],
        'sql_model' => $sql_context_result['sql_model'],
        'count_query' => $count_query,
        'scoped_counts_ok' => $scoped_counts_result['ok'],
        'scoped_counts_orders_visible' => $scoped_counts_result['orders_visible_count'],
        'scoped_counts_invoices_visible_active' => $scoped_counts_result['invoices_visible_active_count'],
        'scoped_counts_orders_rejected' => $scoped_counts_result['orders_rejected_count'],
        'scoped_counts_orders_cancelled' => $scoped_counts_result['orders_cancelled_count'],
        'scoped_counts_error' => $scoped_counts_result['error']
    );

    $payload_messages = array_merge(
        array(array('role' => 'system', 'content' => $final_system_instruction)),
        $dialog_messages
    );

    $openrouter_payload = array(
        'model' => $model,
        'messages' => $payload_messages,
        'temperature' => 0.1
    );

    $http_code = 0;
    $transport_error = '';

    $decoded = ai_openrouter_request($endpoint, $api_key, $openrouter_payload, $http_code, $transport_error);
    if ($decoded === null) {
        api_error(502, 'AI provider neodpověděl: ' . $transport_error, 'OPENROUTER_UNREACHABLE');
        return;
    }

    if ($http_code < 200 || $http_code >= 300) {
        $provider_message = '';
        if (isset($decoded['error']) && is_array($decoded['error']) && isset($decoded['error']['message'])) {
            $provider_message = (string)$decoded['error']['message'];
        } elseif (isset($decoded['message'])) {
            $provider_message = (string)$decoded['message'];
        }

        api_error(502, 'AI provider chyba' . ($provider_message !== '' ? ': ' . $provider_message : ''), 'OPENROUTER_ERROR');
        return;
    }

    $reply_text = ai_extract_reply_text($decoded);
    $reply_text = ai_sanitize_user_reply_text($reply_text);
    if ($reply_text === '') {
        $reply_text = 'Promiň, odpověď modelu nebyla použitelná. Zkus prosím dotaz formulovat ještě jednou.';
    }

    $history_to_store = $dialog_messages;
    if ($reply_text !== '') {
        $history_to_store[] = array(
            'role' => 'assistant',
            'content' => $reply_text
        );
    }
    ai_save_history($history_path, $history_to_store);

    api_ok(array(
        'provider' => 'openrouter',
        'model' => isset($decoded['model']) ? $decoded['model'] : $model,
        'intent' => $intent,
        'intent_parameter' => $intent_parameter,
        'context_source' => $context_source,
        'router_model' => isset($router_result['router_model']) ? $router_result['router_model'] : $model,
        'router_trace' => $router_trace,
        'conversation_id' => $conversation_id,
        'history_count' => count($history_to_store),
        'reply' => $reply_text,
        'choices' => isset($decoded['choices']) ? $decoded['choices'] : array(),
        'usage' => isset($decoded['usage']) ? $decoded['usage'] : null
    ));
}
