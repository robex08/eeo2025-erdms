#!/usr/bin/env php
<?php
/**
 * Enable cashbook logging by replacing error_log() with file_put_contents()
 * This is necessary because PHP error_log has no configured destination
 */

$logFile = '/var/www/erdms-dev/cashbook_debug.log';

// Replace error_log with file_put_contents in CashbookPermissions.php
$permFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/middleware/CashbookPermissions.php';
$content = file_get_contents($permFile);

// Find and replace all error_log calls
$content = preg_replace_callback(
    '/error_log\s*\(\s*(["\'])(.*?)\1\s*\);/s',
    function($matches) use ($logFile) {
        $message = $matches[2];
        // Escape single quotes in message
        $message = str_replace("'", "\\'", $message);
        return "file_put_contents('$logFile', '[' . date('Y-m-d H:i:s') . '] $message' . \"\\n\", FILE_APPEND);";
    },
    $content
);

file_put_contents($permFile, $content);
echo "✅ Updated CashbookPermissions.php\n";

// Replace error_log with file_put_contents in cashbookHandlers.php
$handlerFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/cashbookHandlers.php';
$content = file_get_contents($handlerFile);

// Find and replace all error_log calls
$content = preg_replace_callback(
    '/error_log\s*\(\s*(["\'])(.*?)\1\s*\);/s',
    function($matches) use ($logFile) {
        $message = $matches[2];
        // Escape single quotes in message
        $message = str_replace("'", "\\'", $message);
        return "file_put_contents('$logFile', '[' . date('Y-m-d H:i:s') . '] $message' . \"\\n\", FILE_APPEND);";
    },
    $content
);

file_put_contents($handlerFile, $content);
echo "✅ Updated cashbookHandlers.php\n";

// Create empty log file with proper permissions
touch($logFile);
chmod($logFile, 0666);
echo "✅ Created $logFile with 0666 permissions\n";

echo "\nLog file ready: $logFile\n";
echo "Now test the cashbook by accessing: https://erdms.zachranka.cz/dev/eeo-v2/cashbook\n";
echo "Then read logs with: tail -f $logFile\n";
