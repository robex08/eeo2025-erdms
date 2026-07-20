<?php

declare(strict_types=1);

final class UserService
{
    private const ROLE_CODES = ['superadmin', 'administrator', 'fleet_manager', 'user'];
    private const AUTH_SOURCES = ['local', 'entra_id'];
    private const APPROVAL_STATUSES = ['approved', 'pending'];

    public function __construct(private UserRepository $users)
    {
    }

    public function listUsers(): array
    {
        return array_map(fn(array $row): array => $this->formatUser($row), $this->users->listUsers());
    }

    public function createUser(array $payload): array
    {
        $data = $this->normalizePayload($payload, null, true);
        $userId = $this->users->createManagedUser($data);

        $this->saveAssignments($userId, $data);

        $created = $this->users->findFullById($userId);
        if ($created === null) {
            throw new RuntimeException('Uživatele se nepodařilo vytvořit.');
        }

        return $this->formatUser($created);
    }

    public function updateUser(int $userId, array $payload, int $actorUserId): array
    {
        $existing = $this->users->findFullById($userId);
        if ($existing === null) {
            throw new RuntimeException('Uživatel nebyl nalezen.');
        }

        if ($actorUserId === $userId && isset($payload['is_active']) && (int) $payload['is_active'] !== 1) {
            throw new RuntimeException('Nelze zablokovat vlastní účet.');
        }

        $data = $this->normalizePayload($payload, $existing, false);
        if ($actorUserId === $userId && (int) $data['is_active'] !== 1) {
            throw new RuntimeException('Nelze zablokovat vlastní účet.');
        }

        $this->users->updateManagedUser($userId, $data);
        $this->saveAssignments($userId, $data);

        $updated = $this->users->findFullById($userId);
        if ($updated === null) {
            throw new RuntimeException('Uživatele se nepodařilo uložit.');
        }

        return $this->formatUser($updated);
    }

    public function deleteUser(int $userId, int $actorUserId): void
    {
        if ($userId === $actorUserId) {
            throw new RuntimeException('Nelze smazat vlastní účet.');
        }

        $existing = $this->users->findFullById($userId);
        if ($existing === null) {
            throw new RuntimeException('Uživatel nebyl nalezen.');
        }

        $this->users->deleteUserById($userId);
    }

    public function getVehicleAssignments(int $userId): array
    {
        $existing = $this->users->findFullById($userId);
        if ($existing === null) {
            throw new RuntimeException('Uživatel nebyl nalezen.');
        }

        return [
            'user_id' => $userId,
            'has_all_vehicles' => (int) ($existing['has_all_vehicles'] ?? 1) === 1,
            'vehicle_ids' => $this->users->getAssignedVehicleIds($userId),
        ];
    }

    public function getVehiclesCatalog(): array
    {
        $items = $this->users->listVehiclesForAssignments();
        $statusesMap = [];

        foreach ($items as $item) {
            $status = trim((string) ($item['status'] ?? ''));
            if ($status !== '') {
                $statusesMap[$status] = true;
            }
        }

        $statuses = array_keys($statusesMap);
        sort($statuses);

        return [
            'items' => $items,
            'count' => count($items),
            'statuses' => $statuses,
        ];
    }

    private function normalizePayload(array $payload, ?array $existing, bool $isCreate): array
    {
        $username = trim((string) ($payload['username'] ?? ($existing['username'] ?? '')));
        if ($username === '') {
            throw new RuntimeException('Uživatelské jméno je povinné.');
        }
        if ($this->users->usernameExists($username, (int) ($existing['id'] ?? 0))) {
            throw new RuntimeException('Uživatelské jméno už existuje.');
        }

        $roleCode = strtolower(trim((string) ($payload['role_code'] ?? ($existing['role_code'] ?? 'user'))));
        if (!in_array($roleCode, self::ROLE_CODES, true)) {
            throw new RuntimeException('Neplatná role uživatele.');
        }

        $authSource = strtolower(trim((string) ($payload['auth_source'] ?? ($existing['auth_source'] ?? 'local'))));
        if (!in_array($authSource, self::AUTH_SOURCES, true)) {
            throw new RuntimeException('Neplatný typ účtu.');
        }

        $approvalStatus = strtolower(trim((string) ($payload['approval_status'] ?? ($existing['approval_status'] ?? 'approved'))));
        if (!in_array($approvalStatus, self::APPROVAL_STATUSES, true)) {
            throw new RuntimeException('Neplatný stav schválení.');
        }

        $displayName = $this->nullableText((string) ($payload['display_name'] ?? ($existing['display_name'] ?? '')), 150);
        $email = $this->nullableText((string) ($payload['email'] ?? ($existing['email'] ?? '')), 190);
        $phone = $this->nullableText((string) ($payload['phone'] ?? ($existing['phone'] ?? '')), 40);
        if ($email !== null && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('E-mail nemá platný formát.');
        }

        // Entra ID is system-managed from first Entra login and cannot be edited in admin form.
        $entraId = $this->nullableText((string) ($existing['entra_id'] ?? ''), 128);
        if ($isCreate) {
            $entraId = null;
        }
        if ($entraId !== null && $this->users->entraIdExists($entraId, (int) ($existing['id'] ?? 0))) {
            throw new RuntimeException('Entra identifikátor už je přiřazen jinému účtu.');
        }

        $passwordRaw = (string) ($payload['password'] ?? '');
        $passwordHash = null;
        if ($passwordRaw !== '') {
            if (mb_strlen($passwordRaw) < 8) {
                throw new RuntimeException('Heslo musí mít alespoň 8 znaků.');
            }
            $passwordHash = password_hash($passwordRaw, PASSWORD_DEFAULT);
        }

        if ($isCreate && $authSource === 'local' && $passwordHash === null) {
            throw new RuntimeException('Pro lokální účet je povinné heslo.');
        }

        $mustChangePassword = $passwordHash !== null
            ? (int) $this->normalizeBool($payload['must_change_password'] ?? false)
            : (int) ($existing['must_change_password'] ?? 0);

        $previousApprovalStatus = strtolower(trim((string) ($existing['approval_status'] ?? 'approved')));
        $isActive = (int) $this->normalizeBool($payload['is_active'] ?? ($existing['is_active'] ?? true));
        if ($approvalStatus === 'pending') {
            $isActive = 0;
        } elseif (!$isCreate && $previousApprovalStatus === 'pending' && $approvalStatus === 'approved') {
            // Approving a previously pending account always unblocks it.
            $isActive = 1;
        }

        $normalized = [
            'username' => $username,
            'role_code' => $roleCode,
            'auth_source' => $authSource,
            'approval_status' => $approvalStatus,
            'entra_id' => $entraId,
            'display_name' => $displayName,
            'email' => $email,
            'phone' => $phone,
            'must_change_password' => $mustChangePassword,
            'is_active' => $isActive,
            'has_all_vehicles' => (int) $this->normalizeBool($payload['has_all_vehicles'] ?? ($existing['has_all_vehicles'] ?? true)),
            'assigned_vehicle_ids' => $this->normalizeVehicleIds($payload['assigned_vehicle_ids'] ?? []),
        ];

        if ($passwordHash !== null) {
            $normalized['password_hash'] = $passwordHash;
        } elseif ($isCreate) {
            $normalized['password_hash'] = null;
        }

        return $normalized;
    }

    private function formatUser(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'username' => (string) ($row['username'] ?? ''),
            'role_code' => (string) ($row['role_code'] ?? 'user'),
            'auth_source' => (string) ($row['auth_source'] ?? 'local'),
            'approval_status' => (string) ($row['approval_status'] ?? 'approved'),
            'entra_id' => (string) ($row['entra_id'] ?? ''),
            'display_name' => (string) ($row['display_name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'phone' => (string) ($row['phone'] ?? ''),
            'must_change_password' => (int) ($row['must_change_password'] ?? 0) === 1,
            'is_active' => (int) ($row['is_active'] ?? 0) === 1,
            'has_all_vehicles' => (int) ($row['has_all_vehicles'] ?? 1) === 1,
            'assigned_vehicle_count' => (int) ($row['assigned_vehicle_count'] ?? 0),
            'has_local_password' => trim((string) ($row['password_hash'] ?? '')) !== '',
            'last_login_at' => (string) ($row['last_login_at'] ?? ''),
            'last_activity_at' => (string) ($row['last_activity_at'] ?? ''),
            'created_at' => (string) ($row['created_at'] ?? ''),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    private function saveAssignments(int $userId, array $data): void
    {
        $hasAllVehicles = (int) ($data['has_all_vehicles'] ?? 1) === 1;
        if ($hasAllVehicles) {
            $this->users->replaceUserVehicleAssignments($userId, []);
            return;
        }

        $vehicleIds = $this->users->filterExistingVehicleIds($data['assigned_vehicle_ids'] ?? []);
        $this->users->replaceUserVehicleAssignments($userId, $vehicleIds);
    }

    private function normalizeVehicleIds(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }

        $normalized = array_map('intval', $raw);
        $normalized = array_values(array_unique(array_filter($normalized, static fn(int $id): bool => $id > 0)));
        sort($normalized);

        return $normalized;
    }

    private function normalizeBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower(trim((string) $value));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    private function nullableText(string $value, int $maxLength): ?string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        return mb_substr($trimmed, 0, $maxLength);
    }
}