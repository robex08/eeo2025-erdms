<?php

declare(strict_types=1);

final class AuthService
{
    public function __construct(
        private UserRepository $users,
        private EntraBridgeService $entraBridge
    ) {
    }

    public function loginLocal(string $username, string $password): array
    {
        $user = $this->users->findByUsername($username);
        if ($user === null) {
            throw new RuntimeException('Neplatne prihlasovaci udaje');
        }

        if ((int) $user['is_active'] !== 1) {
            throw new RuntimeException('Uzivatel je deaktivovan');
        }

        $role = strtolower((string) $user['role_code']);
        if (!in_array($role, ['superadmin', 'administrator'], true)) {
            throw new RuntimeException('Lokalni prihlaseni neni pro tuto roli povoleno');
        }

        $hash = (string) ($user['password_hash'] ?? '');
        if ($hash === '' || !password_verify($password, $hash)) {
            throw new RuntimeException('Neplatne prihlasovaci udaje');
        }

        $token = AuthToken::issue((int) $user['id'], (string) $user['username'], $role);
        AuthToken::setCookie($token);

        return [
            'user' => [
                'id' => (int) $user['id'],
                'username' => (string) $user['username'],
                'display_name' => (string) $user['username'],
                'role' => $role,
                'auth_source' => (string) $user['auth_source'],
                'must_change_password' => (int) $user['must_change_password'] === 1,
            ],
        ];
    }

    public function loginEntra(Request $request): array
    {
        $identity = $this->entraBridge->fetchAuthenticatedIdentity($request);

        $user = $this->users->findAuthorizedForEntra(
            (string) $identity['entra_id'],
            (string) $identity['username'],
            (string) $identity['email']
        );

        if ($user === null) {
            throw new RuntimeException('Uzivatel neni v aplikaci autorizovan');
        }

        if ((int) $user['is_active'] !== 1) {
            throw new RuntimeException('Uzivatel je deaktivovan');
        }

        $role = strtolower((string) $user['role_code']);
        $token = AuthToken::issue((int) $user['id'], (string) $user['username'], $role);
        AuthToken::setCookie($token);

        return [
            'user' => [
                'id' => (int) $user['id'],
                'username' => (string) $user['username'],
                'display_name' => (string) ($identity['display_name'] ?: $user['username']),
                'role' => $role,
                'auth_source' => 'entra_id',
                'must_change_password' => false,
            ],
        ];
    }

    public function getEntraLoginUrl(string $redirectUrl): string
    {
        return $this->entraBridge->buildLoginUrl($redirectUrl);
    }

    public function currentUser(Request $request): ?array
    {
        $token = AuthToken::extract($request);
        $payload = AuthToken::parse($token);
        if ($payload === null || !isset($payload['uid'])) {
            return null;
        }

        $user = $this->users->findById((int) $payload['uid']);
        if ($user === null || (int) $user['is_active'] !== 1) {
            return null;
        }

        return [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
            'display_name' => (string) $user['username'],
            'role' => strtolower((string) $user['role_code']),
            'auth_source' => (string) $user['auth_source'],
            'must_change_password' => (int) $user['must_change_password'] === 1,
        ];
    }

    public function requireAuthenticated(Request $request): array
    {
        $user = $this->currentUser($request);
        if ($user === null) {
            Response::error('Neautorizovany pristup', 401);
            exit;
        }

        return $user;
    }

    public function requireRole(Request $request, array $roles): array
    {
        $user = $this->requireAuthenticated($request);
        if (!in_array($user['role'], $roles, true)) {
            Response::error('Nedostatecna opravneni', 403);
            exit;
        }

        return $user;
    }
}
