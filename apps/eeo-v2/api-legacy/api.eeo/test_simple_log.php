<?php
/**
 * SIMPLE ERROR LOG TEST
 */

// Test 1: Basic error_log
error_log("[TEST 1] Basic error_log call - " . date('Y-m-d H:i:s'));

// Test 2: Multiple calls
for ($i = 1; $i <= 5; $i++) {
    error_log("[TEST 2] Loop iteration $i");
}

// Test 3: With context
error_log("[TEST 3] Script: " . __FILE__);
error_log("[TEST 3] User: " . get_current_user());
error_log("[TEST 3] PID: " . getmypid());

// Test 4: Dlouhý text
error_log("[TEST 4] " . str_repeat("Long text test ", 20));

// Return success
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Error log tests completed',
    'log_file' => ini_get('error_log'),
    'time' => date('Y-m-d H:i:s')
]);
