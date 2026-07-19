<?php

declare(strict_types=1);

final class AuthService
{
    private const PENDING_APPROVAL_MESSAGE = 'Váš účet byl vytvořen. Počkejte prosím na schválení správcem systému.';

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

        if (($user['approval_status'] ?? 'approved') !== 'approved') {
            throw new RuntimeException(self::PENDING_APPROVAL_MESSAGE);
        }

        if ((int) $user['is_active'] !== 1) {
            throw new RuntimeException('Uzivatel je deaktivovan');
        }

        $hash = (string) ($user['password_hash'] ?? '');
        if ($hash === '' || !password_verify($password, $hash)) {
            throw new RuntimeException('Neplatne prihlasovaci udaje');
        }

        $role = strtolower((string) $user['role_code']);

        $token = AuthToken::issue((int) $user['id'], (string) $user['username'], $role, 'local');
        AuthToken::setCookie($token);

        return [
            'user' => [
                'id' => (int) $user['id'],
                'username' => (string) $user['username'],
                'display_name' => (string) (($user['display_name'] ?? '') !== '' ? $user['display_name'] : $user['username']),
                'role' => $role,
                'auth_source' => (string) $user['auth_source'],
                'must_change_password' => (int) $user['must_change_password'] === 1,
            ],
        ];
    }

    public function loginEntra(Request $request): array
    {
        $identity = $this->entraBridge->fetchAuthenticatedIdentity($request);

        error_log('Vehicles v2 Entra identity: ' . json_encode($identity, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $user = $this->users->findAuthorizedForEntra(
            (string) $identity['entra_id'],
            (string) $identity['username'],
            (string) $identity['email'],
            (string) $identity['display_name']
        );

        if ($user === null) {
            $this->users->createPendingEntraUser($identity);
            throw new RuntimeException(self::PENDING_APPROVAL_MESSAGE);
        }

        if (($user['approval_status'] ?? 'approved') !== 'approved') {
            throw new RuntimeException(self::PENDING_APPROVAL_MESSAGE);
        }

        if ((int) $user['is_active'] !== 1) {
            throw new RuntimeException('Uzivatel je deaktivovan');
        }

        $role = strtolower((string) $user['role_code']);
        $token = AuthToken::issue((int) $user['id'], (string) $user['username'], $role, 'entra_id');
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

        $authSource = trim((string) ($payload['src'] ?? ''));
        if ($authSource === '') {
            $authSource = (string) $user['auth_source'];
        }

        return [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
            'display_name' => (string) (($user['display_name'] ?? '') !== '' ? $user['display_name'] : $user['username']),
            'role' => strtolower((string) $user['role_code']),
            'auth_source' => $authSource,
            'has_all_vehicles' => (int) ($user['has_all_vehicles'] ?? 1) === 1,
            'must_change_password' => (int) $user['must_change_password'] === 1,
        ];
    }

    public function changeLocalPassword(Request $request, string $newPassword): array
    {
        $current = $this->currentUser($request);
        if ($current === null) {
            throw new RuntimeException('Neautorizovany pristup');
        }

        if (($current['auth_source'] ?? '') !== 'local') {
            throw new RuntimeException('Vynucená změna hesla se vztahuje pouze na lokální přihlášení.');
        }

        if (mb_strlen($newPassword) < 8) {
            throw new RuntimeException('Nové heslo musí mít alespoň 8 znaků.');
        }

        $user = $this->users->findById((int) $current['id']);
        if ($user === null) {
            throw new RuntimeException('Uživatel nebyl nalezen.');
        }

        $this->users->updatePasswordById((int) $current['id'], password_hash($newPassword, PASSWORD_DEFAULT));

        $updated = $this->users->findById((int) $current['id']);
        if ($updated === null) {
            throw new RuntimeException('Heslo se nepodařilo změnit.');
        }

        return [
            'user' => [
                'id' => (int) $updated['id'],
                'username' => (string) $updated['username'],
                'display_name' => (string) (($updated['display_name'] ?? '') !== '' ? $updated['display_name'] : $updated['username']),
                'role' => strtolower((string) $updated['role_code']),
                'auth_source' => 'local',
                'must_change_password' => false,
            ],
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
