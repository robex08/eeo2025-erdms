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
        $centralLoginUrl = $this->centralAuthBase . '/auth/login?redirect=' . rawurlencode($redirectUrl);

        try {
            $resolvedUrl = $this->fetchCentralLoginRedirect($centralLoginUrl);
            if ($resolvedUrl !== '') {
                return $resolvedUrl;
            }
        } catch (Throwable) {
            // Fallback to the central auth endpoint when direct resolution is unavailable.
        }

        return $centralLoginUrl;
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
        } elseif ($this->looksLikeUserPayload($payload)) {
            $authUser = $payload;
        }

        $entraData = isset($payload['entraData']) && is_array($payload['entraData'])
            ? $payload['entraData']
            : (isset($authUser['entraData']) && is_array($authUser['entraData']) ? $authUser['entraData'] : []);

        if ($authUser === [] && $entraData === []) {
            throw new RuntimeException('Centrální autentizace nevrátila data uživatele');
        }

        $entraId = $this->pick($authUser, ['entra_id', 'entraId', 'object_id', 'oid', 'id']);
        if ($entraId === '') {
            $entraId = $this->pick($entraData, ['id', 'entra_id', 'oid', 'object_id']);
        }

        $username = $this->pick($authUser, ['username', 'user_name', 'login', 'account']);
        if ($username === '') {
            $username = $this->pick($entraData, ['onPremisesSamAccountName', 'mailNickname']);
        }

        // Prefer canonical mailbox address (mail), use UPN only as a fallback.
        $email = $this->pick($authUser, ['mail', 'email']);
        if ($email === '') {
            $email = $this->pick($entraData, ['mail']);
        }
        if ($email === '') {
            $email = $this->pick($authUser, ['upn', 'userPrincipalName']);
        }
        if ($email === '') {
            $email = $this->pick($entraData, ['userPrincipalName']);
        }

        $displayName = $this->pick($authUser, ['display_name', 'displayName', 'name', 'full_name', 'jmeno_prijmeni']);
        if ($displayName === '') {
            $displayName = $this->pick($entraData, ['displayName', 'givenName']);
        }

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

    private function fetchCentralLoginRedirect(string $url): string
    {
        if (function_exists('curl_init')) {
            $headers = [];
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                ],
                CURLOPT_HEADERFUNCTION => static function ($curl, string $headerLine) use (&$headers): int {
                    $length = strlen($headerLine);
                    $parts = explode(':', $headerLine, 2);
                    if (count($parts) === 2) {
                        $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }

                    return $length;
                },
            ]);

            $response = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if (($httpCode === 301 || $httpCode === 302 || $httpCode === 303 || $httpCode === 307 || $httpCode === 308)
                && isset($headers['location'])
                && trim($headers['location']) !== '') {
                return trim($headers['location']);
            }

            if (is_string($response)) {
                $decoded = json_decode($response, true);
                if (is_array($decoded) && isset($decoded['authUrl']) && is_string($decoded['authUrl'])) {
                    return trim($decoded['authUrl']);
                }
            }

            return '';
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 15,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\n",
            ],
        ]);

        $response = @file_get_contents($url, false, $context);
        if (is_string($response)) {
            $decoded = json_decode($response, true);
            if (is_array($decoded) && isset($decoded['authUrl']) && is_string($decoded['authUrl'])) {
                return trim($decoded['authUrl']);
            }
        }

        return '';
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

    private function looksLikeUserPayload(array $payload): bool
    {
        return isset($payload['username'])
            || isset($payload['entra_id'])
            || isset($payload['email'])
            || isset($payload['upn'])
            || isset($payload['entraData']);
    }
}
