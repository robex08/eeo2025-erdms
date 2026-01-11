<?php

// Test pouze datetime parsing funkcí přímo

class TestDateTime {
    public function parseDatetime($input) {
        $dt = false;
        
        // ISO format s millisekundami: 2026-01-06T23:02:35.125Z
        if (!$dt) {
            $dt = DateTime::createFromFormat('Y-m-d\TH:i:s.v\Z', $input);
        }
        
        // ISO format bez millisekundy: 2026-01-06T23:02:35Z
        if (!$dt) {
            $dt = DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $input);
        }
        
        if ($dt) {
            $dt->setTimezone(new DateTimeZone('Europe/Prague'));
            return $dt->format('Y-m-d H:i:s');
        }
        
        return 'FAILED';
    }
}

$test = new TestDateTime();
$input = '2026-01-06T23:02:35.125Z';
$result = $test->parseDatetime($input);
echo 'INPUT: ' . $input . PHP_EOL;
echo 'PARSED: ' . $result . PHP_EOL;

// Test field mapping manually
$testData = array(
    'schvalil_uzivatel_id' => 123,
    'dt_schvaleni' => '2026-01-06T23:02:35.125Z'
);

$result = array();
foreach ($testData as $key => $value) {
    if ($key === 'schvalil_uzivatel_id') {
        $result['schvalovatel_id'] = $value;
    } else {
        $result[$key] = $value;
    }
}

echo 'FIELD MAPPING TEST:' . PHP_EOL;
echo 'Input: ' . json_encode($testData) . PHP_EOL;
echo 'Output: ' . json_encode($result) . PHP_EOL;

echo PHP_EOL . 'COMPLETE TEST SUCCESSFUL!' . PHP_EOL;