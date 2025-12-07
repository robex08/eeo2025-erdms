<?php
// Mail configuration for notifications (PHP 5.6 compatible)
// You can override these via environment variables if available.
return array(
    'from_email' => getenv('MAIL_FROM') ? getenv('MAIL_FROM') : 'webmaster@zachranka.cz',
    'from_name'  => getenv('MAIL_FROM_NAME') ? getenv('MAIL_FROM_NAME') : 'eRDMS Systém',
    // Optional reply-to
    'reply_to'   => getenv('MAIL_REPLY_TO') ? getenv('MAIL_REPLY_TO') : 'podpora@zachranka.cz',
    // Toggle debug output in API responses (false for production)
    'debug'      => (getenv('MAIL_DEBUG') ? (strtolower(getenv('MAIL_DEBUG')) === 'true') : true),
    // SMTP configuration (if use_smtp = true)
    'use_smtp'   => true,
    'smtp_host'  => 'akp-it-smtp01.zzssk.zachranka.cz',
    'smtp_port'  => 25,
    'smtp_auth'  => false,
    'smtp_username' => '',
    'smtp_password' => '',
    'smtp_secure' => '' // '', 'ssl', or 'tls'
);
