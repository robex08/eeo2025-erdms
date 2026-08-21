<?php

declare(strict_types=1);

final class Response
{
    public static function json(array $payload, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function success(array $data = [], int $code = 200): void
    {
        self::json([
            'status' => 'ok',
            'data' => $data,
        ], $code);
    }

    public static function error(string $message, int $code = 400): void
    {
        self::json([
            'status' => 'error',
            'error' => [
                'message' => $message,
            ],
        ], $code);
    }
}
