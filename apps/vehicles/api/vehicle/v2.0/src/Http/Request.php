<?php

declare(strict_types=1);

final class Request
{
    public string $method;
    public string $path;
    public array $query;
    public array $body;
    public array $headers;
    public array $cookies;

    public static function capture(): self
    {
        $request = new self();
        $request->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $request->path = self::normalizePath($_SERVER['REQUEST_URI'] ?? '/');
        $request->query = $_GET;
        $request->body = self::body();
        $request->headers = self::headers();
        $request->cookies = $_COOKIE;

        return $request;
    }

    private static function normalizePath(string $uri): string
    {
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return '/';
        }

        $basePath = trim(Env::get('VEHICLES_V2_API_BASE_PATH', '/dev/api.vehicles/vehicle/v2.0'));
        if ($basePath !== '') {
            $path = preg_replace('#^' . preg_quote('/' . ltrim($basePath, '/'), '#') . '#', '', $path);
        }

        $path = preg_replace('#^/dev/api\.vehicles/vehicle/v2\.0#', '', $path);
        $path = preg_replace('#^/api\.vehicles-v2/vehicle/v2\.0#', '', $path);
        $path = '/' . ltrim((string) $path, '/');

        return rtrim($path, '/') === '' ? '/' : rtrim($path, '/');
    }

    private static function body(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            if (!is_string($raw) || trim($raw) === '') {
                return [];
            }

            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }

        return $_POST;
    }

    private static function headers(): array
    {
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            return is_array($headers) ? $headers : [];
        }

        return [];
    }
}
