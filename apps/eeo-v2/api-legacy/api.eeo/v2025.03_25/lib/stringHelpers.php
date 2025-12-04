<?php
/**
 * Helper funkce pro zpracování string hodnot z FE requestů
 * 
 * Řeší problém kdy FE pošle NULL hodnoty které DB neakceptuje v NOT NULL VARCHAR/TEXT sloupcích
 * 
 * @author AI Assistant
 * @date 2025-10-24
 * @version 1.0
 */

/**
 * Konvertuje NULL hodnoty na prázdný string pro VARCHAR/TEXT pole
 * Pokud je DB sloupec NOT NULL, použije '' místo NULL
 * 
 * @param mixed $value - Hodnota z FE input
 * @param bool $allowNull - FALSE = konvertuj NULL na "", TRUE = ponech NULL (default: FALSE)
 * @return string|null - Vrací string nebo NULL (pokud $allowNull = true)
 * 
 * @example
 * // Pro NOT NULL sloupce:
 * $name = sanitizeStringField($input['name'] ?? null, false);  // NULL → ""
 * 
 * // Pro NULL-able sloupce:
 * $address = sanitizeStringField($input['address'] ?? null, true);  // NULL → NULL
 */
function sanitizeStringField($value, $allowNull = false) {
    // Pokud je NULL a NULLy jsou zakázané, vrať prázdný string
    if ($value === null || $value === '') {
        return $allowNull ? null : '';
    }
    
    // Pokud je string, trim a vrať
    if (is_string($value)) {
        $trimmed = trim($value);
        // Pokud po trim je prázdný a NULLy jsou zakázané, vrať ""
        if ($trimmed === '' && !$allowNull) {
            return '';
        }
        return $trimmed;
    }
    
    // Pro ostatní typy konvertuj na string
    return (string)$value;
}

/**
 * Alias pro čitelnější syntaxi - pro pole která MUSÍ být vždy string (NOT NULL)
 * 
 * Použij pro DB sloupce: VARCHAR NOT NULL nebo TEXT NOT NULL
 * 
 * @param mixed $value - Hodnota z FE input
 * @return string - Vždy vrací string, nikdy NULL
 * 
 * @example
 * $orderData = [
 *     ':predmet' => ensureString($input['predmet'] ?? 'Default'),  // NOT NULL sloupec
 *     ':nazev' => ensureString($input['nazev'] ?? null),           // NULL → ""
 * ];
 */
function ensureString($value) {
    return sanitizeStringField($value, false);
}

/**
 * Alias pro čitelnější syntaxi - pro pole která mohou být NULL
 * 
 * Použij pro DB sloupce: VARCHAR DEFAULT NULL nebo TEXT DEFAULT NULL
 * 
 * @param mixed $value - Hodnota z FE input
 * @return string|null - Vrací string nebo NULL
 * 
 * @example
 * $orderData = [
 *     ':dodavatel_ico' => nullableString($input['dodavatel_ico'] ?? null),  // NULL OK
 *     ':poznamka' => nullableString($input['poznamka'] ?? null),            // NULL OK
 * ];
 */
function nullableString($value) {
    return sanitizeStringField($value, true);
}

/**
 * Bezpečně zpracuje integer hodnotu z FE requestu
 * 
 * @param mixed $value - Hodnota z FE input
 * @param int|null $default - Výchozí hodnota pokud je NULL (default: null)
 * @return int|null
 * 
 * @example
 * $userId = safeInt($input['user_id'] ?? null, 0);  // NULL → 0
 * $optional = safeInt($input['optional_id'] ?? null);  // NULL → NULL
 */
function safeInt($value, $default = null) {
    if ($value === null || $value === '') {
        return $default;
    }
    return (int)$value;
}

/**
 * Bezpečně zpracuje float/decimal hodnotu z FE requestu
 * 
 * @param mixed $value - Hodnota z FE input
 * @param float|null $default - Výchozí hodnota pokud je NULL (default: null)
 * @return float|null
 * 
 * @example
 * $price = safeFloat($input['price'] ?? null, 0.0);  // NULL → 0.0
 * $optional = safeFloat($input['optional_price'] ?? null);  // NULL → NULL
 */
function safeFloat($value, $default = null) {
    if ($value === null || $value === '') {
        return $default;
    }
    return (float)$value;
}

/**
 * Bezpečně zpracuje boolean hodnotu z FE requestu
 * 
 * @param mixed $value - Hodnota z FE input
 * @param bool $default - Výchozí hodnota pokud je NULL (default: false)
 * @return bool
 * 
 * @example
 * $active = safeBool($input['active'] ?? null, true);  // NULL → true
 * $flag = safeBool($input['flag'] ?? null);  // NULL → false
 */
function safeBool($value, $default = false) {
    if ($value === null || $value === '') {
        return $default;
    }
    
    // PHP 5.6 kompatibilní boolean konverze
    if (is_bool($value)) {
        return $value;
    }
    
    if (is_numeric($value)) {
        return (int)$value !== 0;
    }
    
    if (is_string($value)) {
        $lower = strtolower($value);
        if ($lower === 'true' || $lower === '1' || $lower === 'yes') {
            return true;
        }
        if ($lower === 'false' || $lower === '0' || $lower === 'no') {
            return false;
        }
    }
    
    return (bool)$value;
}

/**
 * Bezpečně zpracuje JSON string z FE requestu
 * 
 * @param mixed $value - Hodnota z FE input (string, array nebo null)
 * @param mixed $default - Výchozí hodnota pokud je NULL nebo parsing selže (default: null)
 * @return string|null - JSON string nebo NULL
 * 
 * @example
 * $financovani = safeJson($input['financovani'] ?? null, '[]');  // NULL → "[]"
 * $data = safeJson($input['data'] ?? null);  // NULL → NULL
 */
function safeJson($value, $default = null) {
    if ($value === null || $value === '') {
        return $default;
    }
    
    // Pokud už je array, zakóduj na JSON
    if (is_array($value)) {
        return json_encode($value);
    }
    
    // Pokud je string, ověř že je validní JSON
    if (is_string($value)) {
        $decoded = json_decode($value);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $value;  // Validní JSON, vrať původní
        }
    }
    
    // Jinak vrať default
    return $default;
}

// ============================================
// PŘÍKLADY POUŽITÍ
// ============================================

/*

// === PŘÍKLAD 1: INSERT objednávky ===
$orderData = [
    // NOT NULL sloupce - vždy string
    ':predmet' => ensureString($input['predmet'] ?? 'Návrh objednávky'),
    ':strediska_kod' => ensureString($input['strediska_kod'] ?? 'NEZADANO'),
    ':druh_objednavky_kod' => ensureString($input['druh_objednavky_kod'] ?? 'STANDARDNI'),
    
    // NULL-able sloupce - může být NULL
    ':dodavatel_nazev' => nullableString($input['dodavatel_nazev'] ?? null),
    ':dodavatel_adresa' => nullableString($input['dodavatel_adresa'] ?? null),
    ':dodavatel_ico' => nullableString($input['dodavatel_ico'] ?? null),
    ':poznamka' => nullableString($input['poznamka'] ?? null),
    
    // Integer hodnoty
    ':uzivatel_id' => safeInt($input['uzivatel_id'] ?? $token_data['id']),
    ':garant_id' => safeInt($input['garant_id'] ?? null),  // NULL OK
    ':dodavatel_id' => safeInt($input['dodavatel_id'] ?? null),  // NULL OK
    
    // Float hodnoty
    ':max_cena_s_dph' => safeFloat($input['max_cena_s_dph'] ?? null),
    
    // Boolean hodnoty
    ':aktivni' => safeBool($input['aktivni'] ?? true),
    
    // JSON hodnoty
    ':financovani' => safeJson($input['financovani'] ?? null, '[]'),
];

// === PŘÍKLAD 2: UPDATE dodavatele ===
$params = [
    ':id' => safeInt($input['id']),
    ':nazev' => ensureString($input['nazev'] ?? null),  // NOT NULL
    ':ico' => nullableString($input['ico'] ?? null),  // NULL OK
    ':dic' => nullableString($input['dic'] ?? null),  // NULL OK
    ':email' => nullableString($input['email'] ?? null),  // NULL OK
    ':telefon' => nullableString($input['telefon'] ?? null),  // NULL OK
    ':aktivni' => safeBool($input['aktivni'] ?? 1),
];

*/
