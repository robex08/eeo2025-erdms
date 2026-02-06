<?php
/**
 * TEST PHP ERRORS - Force errors to trigger logging
 */

// Vyvolej chybu
error_log("START ERROR TEST");

// Trigger warnings
$undefined_var;  // Notice
echo $undefined_array['key'];  // Notice/Warning

// Trigger warning
trigger_error("Manual WARNING test", E_USER_WARNING);

// Trigger notice  
trigger_error("Manual NOTICE test", E_USER_NOTICE);

// Divide by zero
$x = 10 / 0;

error_log("END ERROR TEST");

echo json_encode(['status' => 'done']);
