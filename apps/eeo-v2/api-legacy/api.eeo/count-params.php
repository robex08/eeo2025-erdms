<?php
$file = file_get_contents('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php');

// Find the fulltext search section
$start = strpos($file, 'fulltext_search');
$start = strpos($file, 'where_conditions[] = "(', $start);
$end = strpos($file, ');', $start + 10);

$section = substr($file, $start, $end - $start);

// Count ? parameters
$count = substr_count($section, '?');

echo "🔍 POČET ? PARAMETRŮ V FULLTEXT SEARCH: $count\n";

// Try to extract individual parameter counts by section
$lines = explode("\n", $section);
$section_counts = [];
$current_section = 'unknown';

foreach ($lines as $line) {
    $line = trim($line);
    
    // Detect sections
    if (strpos($line, 'cislo_objednavky') !== false) $current_section = 'cislo_objednavky';
    elseif (strpos($line, 'predmet') !== false) $current_section = 'predmet';  
    elseif (strpos($line, 'poznamka') !== false) $current_section = 'poznamka';
    elseif (strpos($line, 'dodavatel_nazev') !== false) $current_section = 'dodavatel_nazev';
    elseif (strpos($line, 'u1.jmeno') !== false) $current_section = 'u1_jmeno';
    elseif (strpos($line, 'u1.email') !== false) $current_section = 'u1_email';
    elseif (strpos($line, 'u2.jmeno') !== false) $current_section = 'u2_jmeno';
    elseif (strpos($line, 'u2.email') !== false) $current_section = 'u2_email';
    elseif (strpos($line, 'u3.jmeno') !== false) $current_section = 'u3_jmeno';
    elseif (strpos($line, 'u3.email') !== false) $current_section = 'u3_email';
    elseif (strpos($line, 'u4.jmeno') !== false) $current_section = 'u4_jmeno';
    elseif (strpos($line, 'u4.email') !== false) $current_section = 'u4_email';
    elseif (strpos($line, 'EXISTS') !== false && strpos($line, 'ux') !== false) $current_section = 'exists_users';
    elseif (strpos($line, 'EXISTS') !== false && strpos($line, 'smlouvy') !== false) $current_section = 'exists_smlouvy';
    elseif (strpos($line, 'JSON_UNQUOTE') !== false) $current_section = 'json_individual';
    elseif (strpos($line, 'EXISTS') !== false && strpos($line, 'lp') !== false) $current_section = 'exists_lp';
    elseif (strpos($line, 'EXISTS') !== false && strpos($line, 'faktury') !== false) $current_section = 'exists_faktury';
    elseif (strpos($line, 'EXISTS') !== false && strpos($line, 'prilohy') !== false) $current_section = 'exists_prilohy';
    elseif (strpos($line, 'EXISTS') !== false && strpos($line, 'polozky') !== false) $current_section = 'exists_polozky';
    
    // Count ? in this line
    $line_count = substr_count($line, '?');
    if ($line_count > 0) {
        if (!isset($section_counts[$current_section])) {
            $section_counts[$current_section] = 0;
        }
        $section_counts[$current_section] += $line_count;
    }
}

echo "\n📊 ROZLOŽENÍ PODLE SEKCÍ:\n";
foreach ($section_counts as $section => $count) {
    echo "- $section: $count\n";
}

$total_sections = array_sum($section_counts);
echo "\n🎯 CELKEM ZE SEKCÍ: $total_sections\n";
echo "🎯 CELKOVÝ POČET ?: $count\n";

if ($count !== $total_sections) {
    echo "⚠️ ROZDÍL: " . ($count - $total_sections) . "\n";
}
?>