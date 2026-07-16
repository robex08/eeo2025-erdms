<?php

declare(strict_types=1);

final class EntraBridgeService
{
    private string $centralAuthBase;

    public function __construct()
    {
        $this->centralAuthBase = rtrim(Env::get('VEHICLES_V2_CENTRAL_AUTH_BASE', 'https://erdms.zachranka.cz'), '/');
    }

    public function buildLoginUrl(string $redirectUrl): string
    {
        return $this->centralAuthBase . '/auth/login?redirect=' . rawurlencode($redirectUrl);
    }

    public function fetchAuthenticatedIdentity(Request $request): array
    {
        $sessionCookie = (string) ($request->cookies['erdms_session'] ?? '');
        if ($sessionCookie === '') {
            throw new RuntimeException('Chybí centrální session cookie erdms_session');
        }

        $payload = $this->callCentralMe($sessionCookie);

        $authUser = [];
        if (isset($payload['user']) && is_array($payload['user'])) {
            $authUser = $payload['user'];
        } elseif (isset($payload['auth_user']) && is_array($payload['auth_user'])) {
            $authUser = $payload['auth_user'];
        } elseif (isset($payload['data']['user']) && is_array($payload['data']['user'])) {
            $authUser = $payload['data']['user'];
        }

        if ($authUser === []) {
            throw new RuntimeException('Centrální autentizace nevrátila data uživatele');
        }

        $entraId = $this->pick($authUser, ['entra_id', 'entraId', 'object_id', 'oid', 'id']);
        $username = $this->pick($authUser, ['username', 'user_name', 'login', 'account']);
        $email = $this->pick($authUser, ['email', 'upn', 'userPrincipalName']);
        $displayName = $this->pick($authUser, ['display_name', 'name', 'full_name']);

        if ($username === '' && $email !== '') {
            $username = strtolower((string) strstr($email, '@', true));
        }

        if ($entraId === '' && $username === '' && $email === '') {
            throw new RuntimeException('Nelze identifikovat uživatele z Entra session');
        }

        return [
            'entra_id' => $entraId,
            'username' => $username,
            'email' => $email,
            'display_name' => $displayName !== '' ? $displayName : ($username !== '' ? $username : $email),
        ];
    }

    private function callCentralMe(string $sessionCookie): array
    {
        $url = $this->centralAuthBase . '/auth/me';

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'Cookie: erdms_session=' . $sessionCookie,
                ],
            ]);

            $response = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if (!is_string($response) || $httpCode >= 400) {
                throw new RuntimeException('Centrální auth /auth/me není dostupný');
            }

            $decoded = json_decode($response, true);
            if (!is_array($decoded)) {
                throw new RuntimeException('Neplatná odpověď z centrální autentizace');
            }

            return $decoded;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 15,
                'header' => "Accept: application/json\r\nCookie: erdms_session={$sessionCookie}\r\n",
            ],
        ]);

        $response = @file_get_contents($url, false, $context);
        if (!is_string($response)) {
            throw new RuntimeException('Centrální auth /auth/me není dostupný');
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Neplatná odpověď z centrální autentizace');
        }

        return $decoded;
    }

    private function pick(array $source, array $keys): string
    {
        foreach ($keys as $key) {
            $value = $source[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return '';
    }
}
