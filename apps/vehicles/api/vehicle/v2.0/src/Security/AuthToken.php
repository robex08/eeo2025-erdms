<?php

declare(strict_types=1);

final class AuthToken
{
    private const COOKIE = 'vehicles_v2_token';

    public static function issue(int $userId, string $username, string $role): string
    {
        $payload = [
            'uid' => $userId,
            'usr' => $username,
            'role' => strtolower($role),
            'iat' => time(),
        ];

        return base64_encode(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    public static function parse(?string $token): ?array
    {
        if ($token === null || $token === '') {
            return null;
        }

        $decoded = base64_decode($token, true);
        if ($decoded === false) {
            return null;
        }

        $payload = json_decode($decoded, true);
        if (!is_array($payload)) {
            return null;
        }

        return $payload;
    }

    public static function setCookie(string $token): void
    {
        setcookie(self::COOKIE, $token, [
            'expires' => time() + 60 * 60 * 12,
            'path' => '/dev/api.vehicles/vehicle/v2.0',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function clearCookie(): void
    {
        setcookie(self::COOKIE, '', [
            'expires' => time() - 3600,
            'path' => '/dev/api.vehicles/vehicle/v2.0',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function extract(Request $request): ?string
    {
        return $request->cookies[self::COOKIE] ?? null;
    }
}
