<?php
// Mail configuration for notifications (PHP 5.6 compatible)
// You can override these via environment variables if available.
return array(
    'from_email' => getenv('MAIL_FROM') ? getenv('MAIL_FROM') : 'no-reply@localhost',
    'from_name'  => getenv('MAIL_FROM_NAME') ? getenv('MAIL_FROM_NAME') : 'EEO Notifikace',
    // Optional reply-to
    'reply_to'   => getenv('MAIL_REPLY_TO') ? getenv('MAIL_REPLY_TO') : '',
    // Toggle debug output in API responses (false for production)
    'debug'      => (getenv('MAIL_DEBUG') ? (strtolower(getenv('MAIL_DEBUG')) === 'true') : false)
);
