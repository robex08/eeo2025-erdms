<?php

declare(strict_types=1);

final class UserRepository
{
    private const TBL_USERS = 'vehicles_users';
    private const TBL_VEHICLES = 'vehicles_cars_list_v2';
    private const TBL_ASSIGNMENTS = 'vehicles_user_vehicle_assignments';

    public function __construct(private PDO $pdo)
    {
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, username, password_hash, role_code, auth_source, approval_status, entra_id, display_name, email, phone, last_login_at, last_activity_at, activity_meta_json, is_active, must_change_password, has_all_vehicles, created_at, updated_at
             FROM vehicles_users
             WHERE username = :username
             LIMIT 1'
        );
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findById(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, username, password_hash, role_code, auth_source, approval_status, entra_id, display_name, email, phone, last_login_at, last_activity_at, activity_meta_json, is_active, must_change_password, has_all_vehicles, created_at, updated_at
             FROM vehicles_users
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findAuthorizedForEntra(string $entraId, string $username, string $email, string $displayName = ''): ?array
    {
        $conditions = [];
        $params = [];

        if ($entraId !== '') {
            $conditions[] = 'LOWER(entra_id) = LOWER(:entra_id)';
            $params['entra_id'] = $entraId;
        }

        if ($username !== '') {
            $conditions[] = '(LOWER(username) = LOWER(:username) OR LOWER(entra_id) = LOWER(:username))';
            $params['username'] = $username;
        }

        if ($email !== '') {
            $conditions[] = 'LOWER(email) = LOWER(:email)';
            $params['email'] = $email;
        }

        if ($displayName !== '') {
            $conditions[] = 'LOWER(display_name) = LOWER(:display_name)';
            $params['display_name'] = $displayName;
        }

        if ($conditions === []) {
            return null;
        }

        $sql = 'SELECT id, username, password_hash, role_code, auth_source, approval_status, entra_id, display_name, email, phone, last_login_at, last_activity_at, activity_meta_json, is_active, must_change_password, created_at, updated_at
                FROM vehicles_users
                WHERE (' . implode(' OR ', $conditions) . ')
                LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function listUsers(): array
    {
        $stmt = $this->pdo->query(
            'SELECT
                id,
                username,
                password_hash,
                role_code,
                auth_source,
                approval_status,
                entra_id,
                display_name,
                email,
                phone,
                last_login_at,
                last_activity_at,
                activity_meta_json,
                must_change_password,
                has_all_vehicles,
                is_active,
                created_at,
                updated_at,
                (SELECT COUNT(*) FROM ' . self::TBL_ASSIGNMENTS . ' ua WHERE ua.user_id = vehicles_users.id) AS assigned_vehicle_count
             FROM vehicles_users
             ORDER BY updated_at DESC, id DESC'
        );

        $rows = $stmt->fetchAll();
        return is_array($rows) ? $rows : [];
    }

    public function findFullById(int $userId): ?array
    {
        return $this->findById($userId);
    }

    public function usernameExists(string $username, int $excludeId = 0): bool
    {
        $sql = 'SELECT id FROM vehicles_users WHERE LOWER(username) = LOWER(:username)';
        $params = ['username' => $username];

        if ($excludeId > 0) {
            $sql .= ' AND id <> :exclude_id';
            $params['exclude_id'] = $excludeId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }

    public function entraIdExists(string $entraId, int $excludeId = 0): bool
    {
        if (trim($entraId) === '') {
            return false;
        }

        $sql = 'SELECT id FROM vehicles_users WHERE LOWER(entra_id) = LOWER(:entra_id)';
        $params = ['entra_id' => $entraId];

        if ($excludeId > 0) {
            $sql .= ' AND id <> :exclude_id';
            $params['exclude_id'] = $excludeId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }

    public function createManagedUser(array $payload): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO vehicles_users (
                username,
                password_hash,
                role_code,
                auth_source,
                approval_status,
                entra_id,
                display_name,
                email,
                phone,
                must_change_password,
                is_active,
                has_all_vehicles
            ) VALUES (
                :username,
                :password_hash,
                :role_code,
                :auth_source,
                :approval_status,
                :entra_id,
                :display_name,
                :email,
                :phone,
                :must_change_password,
                :is_active,
                :has_all_vehicles
            )'
        );

        $stmt->execute([
            'username' => $payload['username'],
            'password_hash' => $payload['password_hash'],
            'role_code' => $payload['role_code'],
            'auth_source' => $payload['auth_source'],
            'approval_status' => $payload['approval_status'],
            'entra_id' => $payload['entra_id'],
            'display_name' => $payload['display_name'],
            'email' => $payload['email'],
            'phone' => $payload['phone'],
            'must_change_password' => $payload['must_change_password'],
            'is_active' => $payload['is_active'],
            'has_all_vehicles' => $payload['has_all_vehicles'],
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateManagedUser(int $userId, array $payload): void
    {
        $fields = [
            'username = :username',
            'role_code = :role_code',
            'auth_source = :auth_source',
            'approval_status = :approval_status',
            'entra_id = :entra_id',
            'display_name = :display_name',
            'email = :email',
            'phone = :phone',
            'must_change_password = :must_change_password',
            'is_active = :is_active',
            'has_all_vehicles = :has_all_vehicles',
        ];

        $params = [
            'id' => $userId,
            'username' => $payload['username'],
            'role_code' => $payload['role_code'],
            'auth_source' => $payload['auth_source'],
            'approval_status' => $payload['approval_status'],
            'entra_id' => $payload['entra_id'],
            'display_name' => $payload['display_name'],
            'email' => $payload['email'],
            'phone' => $payload['phone'],
            'must_change_password' => $payload['must_change_password'],
            'is_active' => $payload['is_active'],
            'has_all_vehicles' => $payload['has_all_vehicles'],
        ];

        if (array_key_exists('password_hash', $payload)) {
            $fields[] = 'password_hash = :password_hash';
            $params['password_hash'] = $payload['password_hash'];
        }

        $stmt = $this->pdo->prepare(
            'UPDATE vehicles_users
             SET ' . implode(', ', $fields) . '
             WHERE id = :id
             LIMIT 1'
        );

        $stmt->execute($params);
    }

    public function updatePasswordById(int $userId, string $passwordHash): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE vehicles_users
             SET password_hash = :password_hash,
                 must_change_password = 0,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
             LIMIT 1'
        );

        $stmt->execute([
            'id' => $userId,
            'password_hash' => $passwordHash,
        ]);
    }

    public function touchUserActivity(int $userId, bool $isLogin, ?string $ip = null, ?string $userAgent = null): void
    {
        $existingMetaRaw = null;
        $metaStmt = $this->pdo->prepare(
            'SELECT activity_meta_json
             FROM vehicles_users
             WHERE id = :id
             LIMIT 1'
        );
        $metaStmt->execute(['id' => $userId]);
        $metaRow = $metaStmt->fetch();
        if (is_array($metaRow)) {
            $existingMetaRaw = $metaRow['activity_meta_json'] ?? null;
        }

        $meta = [];
        if (is_string($existingMetaRaw) && trim($existingMetaRaw) !== '') {
            $decoded = json_decode($existingMetaRaw, true);
            if (is_array($decoded)) {
                $meta = $decoded;
            }
        }

        $meta['last_activity_at'] = date('Y-m-d H:i:s');
        if ($ip !== null && trim($ip) !== '') {
            $meta['last_ip'] = mb_substr(trim($ip), 0, 64);
        }
        if ($userAgent !== null && trim($userAgent) !== '') {
            $meta['last_user_agent'] = mb_substr(trim($userAgent), 0, 255);
        }
        if ($isLogin) {
            $meta['last_login_at'] = date('Y-m-d H:i:s');
        }

        $stmt = $this->pdo->prepare(
            'UPDATE vehicles_users
             SET
               last_activity_at = NOW(),
               last_login_at = CASE WHEN :is_login = 1 THEN NOW() ELSE last_login_at END,
               activity_meta_json = :activity_meta_json,
               updated_at = updated_at
             WHERE id = :id
             LIMIT 1'
        );

        $stmt->execute([
            'id' => $userId,
            'is_login' => $isLogin ? 1 : 0,
            'activity_meta_json' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    public function deleteUserById(int $userId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM vehicles_users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
    }

    public function listVehiclesForAssignments(): array
    {
        $stmt = $this->pdo->query(
            'SELECT
                v.id,
                v.spz,
                v.status,
                COALESCE(NULLIF(TRIM(v.w_tovarni_znacka), ""), "") AS w_tovarni_znacka,
                COALESCE(NULLIF(TRIM(v.w_model_vozu), ""), "") AS w_model_vozu,
                COALESCE(NULLIF(TRIM(v.w_groupname), ""), "") AS w_groupname,
                COALESCE(NULLIF(TRIM(d.w_popis), ""), "") AS w_popis,
                COALESCE(NULLIF(TRIM(d.w_stanoviste), ""), "") AS w_stanoviste
             FROM ' . self::TBL_VEHICLES . ' v
             LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
             ORDER BY
                CASE v.status
                    WHEN "aktivni" THEN 1
                    WHEN "neaktivni" THEN 2
                    WHEN "vyrazene" THEN 3
                    ELSE 9
                END,
                v.spz ASC'
        );

        $rows = $stmt->fetchAll();
        return is_array($rows) ? $rows : [];
    }

    public function getAssignedVehicleIds(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT vehicle_id
             FROM ' . self::TBL_ASSIGNMENTS . '
             WHERE user_id = :user_id
             ORDER BY vehicle_id ASC'
        );
        $stmt->execute(['user_id' => $userId]);
        $rows = $stmt->fetchAll() ?: [];

        return array_values(array_map(static fn(array $row): int => (int) ($row['vehicle_id'] ?? 0), $rows));
    }

    public function replaceUserVehicleAssignments(int $userId, array $vehicleIds): void
    {
        $this->pdo->beginTransaction();

        try {
            $deleteStmt = $this->pdo->prepare('DELETE FROM ' . self::TBL_ASSIGNMENTS . ' WHERE user_id = :user_id');
            $deleteStmt->execute(['user_id' => $userId]);

            if ($vehicleIds !== []) {
                $insertStmt = $this->pdo->prepare(
                    'INSERT INTO ' . self::TBL_ASSIGNMENTS . ' (user_id, vehicle_id)
                     VALUES (:user_id, :vehicle_id)'
                );

                foreach ($vehicleIds as $vehicleId) {
                    $insertStmt->execute([
                        'user_id' => $userId,
                        'vehicle_id' => $vehicleId,
                    ]);
                }
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function filterExistingVehicleIds(array $vehicleIds): array
    {
        $vehicleIds = array_values(array_unique(array_filter(array_map('intval', $vehicleIds), static fn(int $id): bool => $id > 0)));
        if ($vehicleIds === []) {
            return [];
        }

        $placeholders = [];
        $params = [];
        foreach ($vehicleIds as $idx => $vehicleId) {
            $paramName = 'vehicle_' . $idx;
            $placeholders[] = ':' . $paramName;
            $params[$paramName] = $vehicleId;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id
             FROM ' . self::TBL_VEHICLES . '
             WHERE id IN (' . implode(', ', $placeholders) . ')'
        );

        foreach ($params as $paramName => $value) {
            $stmt->bindValue(':' . $paramName, (int) $value, PDO::PARAM_INT);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll() ?: [];

        $existing = array_values(array_map(static fn(array $row): int => (int) ($row['id'] ?? 0), $rows));
        sort($existing);
        return $existing;
    }

    public function createPendingEntraUser(array $identity): array
    {
        $username = $this->buildPendingUsername($identity);
        $displayName = $this->truncate((string) ($identity['display_name'] ?? ''), 150);
        $email = $this->truncate((string) ($identity['email'] ?? ''), 190);
        $entraId = $this->truncate((string) ($identity['entra_id'] ?? ''), 128);

        $stmt = $this->pdo->prepare(
            'INSERT INTO vehicles_users (
                username,
                password_hash,
                role_code,
                auth_source,
                approval_status,
                entra_id,
                display_name,
                email,
                phone,
                must_change_password,
                is_active
            ) VALUES (
                :username,
                NULL,
                :role_code,
                :auth_source,
                :approval_status,
                :entra_id,
                :display_name,
                :email,
                NULL,
                0,
                0
            )'
        );

        $stmt->execute([
            'username' => $username,
            'role_code' => 'user',
            'auth_source' => 'entra_id',
            'approval_status' => 'pending',
            'entra_id' => $entraId !== '' ? $entraId : null,
            'display_name' => $displayName !== '' ? $displayName : null,
            'email' => $email !== '' ? $email : null,
        ]);

        return $this->findById((int) $this->pdo->lastInsertId()) ?? [];
    }

    public function syncEntraIdentityData(int $userId, array $identity): void
    {
        $entraId = $this->truncate((string) ($identity['entra_id'] ?? ''), 128);
        $displayName = $this->truncate((string) ($identity['display_name'] ?? ''), 150);
        $email = $this->truncate((string) ($identity['email'] ?? ''), 190);

        $fields = [];
        $params = ['id' => $userId];

        if ($entraId !== '') {
            $fields[] = 'entra_id = :entra_id';
            $params['entra_id'] = $entraId;
        }

        if ($displayName !== '') {
            $fields[] = 'display_name = :display_name';
            $params['display_name'] = $displayName;
        }

        if ($email !== '') {
            $fields[] = 'email = :email';
            $params['email'] = $email;
        }

        if ($fields === []) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE vehicles_users
             SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
             LIMIT 1'
        );

        $stmt->execute($params);
    }

    private function buildPendingUsername(array $identity): string
    {
        $candidates = [
            (string) ($identity['username'] ?? ''),
            (string) strstr((string) ($identity['email'] ?? ''), '@', true),
            (string) ($identity['display_name'] ?? ''),
            (string) ($identity['entra_id'] ?? ''),
        ];

        $base = 'entra_user';
        foreach ($candidates as $candidate) {
            $normalized = $this->normalizeUsernameCandidate($candidate);
            if ($normalized !== '') {
                $base = $normalized;
                break;
            }
        }

        $suffix = 0;
        $username = $base;
        while ($this->findByUsername($username) !== null) {
            $suffix++;
            $username = substr($base, 0, max(1, 64 - strlen((string) $suffix) - 1)) . '_' . $suffix;
        }

        return $username;
    }

    private function normalizeUsernameCandidate(string $value): string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return '';
        }

        $normalized = strtolower($normalized);
        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        if (is_string($transliterated) && $transliterated !== '') {
            $normalized = $transliterated;
        }

        $normalized = preg_replace('/[^a-z0-9._-]+/', '_', $normalized) ?? '';
        $normalized = trim($normalized, '._-');

        return substr($normalized, 0, 64);
    }

    private function truncate(string $value, int $maxLength): string
    {
        return mb_substr(trim($value), 0, $maxLength);
    }
}
