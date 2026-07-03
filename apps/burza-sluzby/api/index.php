<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

load_local_env(__DIR__ . '/.env');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$routePath = normalize_api_path($path);

if ($routePath === '/health') {
    send_json([
        'status' => 'ok',
        'service' => 'burza-sluzby-api',
        'php' => PHP_VERSION,
        'timestamp' => date('c')
    ]);
}

$pdo = db_connect();
if ($pdo === null) {
    send_json([
        'status' => 'error',
        'message' => 'Database is not configured (BURZA_DB_* env vars).',
    ], 500);
}

try {
    if ($method === 'POST' && $routePath === '/auth/local-login') {
        handle_local_login($pdo);
    }

    if ($method === 'POST' && $routePath === '/auth/local-logout') {
        handle_local_logout();
    }

    if ($method === 'GET' && $routePath === '/me') {
        $ctx = require_auth_context($pdo);

        send_json([
            'status' => 'ok',
            'auth_source' => $ctx['auth_source'],
            'auth_user' => $ctx['auth_user'],
            'local_user' => $ctx['local_user'],
            'effective_role' => $ctx['effective_role'],
            'permissions' => $ctx['permissions'],
        ]);
    }

    if ($method === 'GET' && $routePath === '/permissions') {
        $ctx = require_auth_context($pdo);

        send_json([
            'status' => 'ok',
            'data' => [
                'effective_role' => $ctx['effective_role'],
                'permissions' => $ctx['permissions'],
                'department' => (string) ($ctx['local_user']['department'] ?? ''),
            ],
        ]);
    }

    if ($method === 'GET' && $routePath === '/admin/users') {
        $ctx = require_auth_context($pdo);
        require_admin($ctx);
        handle_get_admin_users($pdo, $ctx);
    }

    if ($method === 'GET' && $routePath === '/admin/catalog') {
        $ctx = require_auth_context($pdo);
        require_admin($ctx);
        handle_get_admin_catalog($pdo, $ctx);
    }

    if ($method === 'GET' && $routePath === '/admin/settings') {
        $ctx = require_auth_context($pdo);
        require_admin($ctx);
        handle_get_admin_settings($pdo, $ctx);
    }

    if ($method === 'PATCH' && $routePath === '/admin/settings') {
        $ctx = require_auth_context($pdo);
        require_admin($ctx);
        handle_update_admin_settings($pdo, $ctx);
    }

    if ($method === 'PATCH' && preg_match('#^/admin/users/(\d+)$#', $routePath, $m) === 1) {
        $ctx = require_auth_context($pdo);
        require_admin($ctx);
        handle_update_admin_user($pdo, $ctx, (int) $m[1]);
    }

    if ($method === 'DELETE' && preg_match('#^/admin/users/(\d+)$#', $routePath, $m) === 1) {
        $ctx = require_auth_context($pdo);
        require_admin($ctx);
        handle_delete_admin_user($pdo, $ctx, (int) $m[1]);
    }

    if ($method === 'POST' && $routePath === '/availabilities') {
        $ctx = require_auth_context($pdo);
        handle_create_availability($pdo, $ctx);
    }

    if ($method === 'PATCH' && preg_match('#^/availabilities/(\d+)$#', $routePath, $m) === 1) {
        $ctx = require_auth_context($pdo);
        handle_update_availability($pdo, $ctx, (int) $m[1]);
    }

    if ($method === 'DELETE' && preg_match('#^/availabilities/(\d+)$#', $routePath, $m) === 1) {
        $ctx = require_auth_context($pdo);
        handle_delete_availability($pdo, $ctx, (int) $m[1]);
    }

    if ($method === 'GET' && $routePath === '/availabilities/mine') {
        $ctx = require_auth_context($pdo);
        handle_get_my_availabilities($pdo, $ctx);
    }

    if ($method === 'GET' && $routePath === '/availabilities/day-summary') {
        $ctx = require_auth_context($pdo);
        handle_get_availability_day_summary($pdo, $ctx);
    }

    if ($method === 'GET' && $routePath === '/approvals/availabilities') {
        $ctx = require_auth_context($pdo);
        require_approver_or_admin($ctx);
        handle_get_pending_approvals($pdo, $ctx);
    }

    if ($method === 'POST' && preg_match('#^/approvals/availabilities/(\d+)/assign$#', $routePath, $m) === 1) {
        $ctx = require_auth_context($pdo);
        require_approver_or_admin($ctx);
        handle_assign_availability($pdo, $ctx, (int) $m[1]);
    }

    if ($method === 'POST' && preg_match('#^/approvals/availabilities/(\d+)/reject$#', $routePath, $m) === 1) {
        $ctx = require_auth_context($pdo);
        require_approver_or_admin($ctx);
        handle_reject_availability($pdo, $ctx, (int) $m[1]);
    }

    if ($method === 'GET' && $routePath === '/assignments/mine') {
        $ctx = require_auth_context($pdo);
        handle_get_my_assignments($pdo, $ctx);
    }

    if ($method === 'GET' && $routePath === '/assignments/calendar') {
        $ctx = require_auth_context($pdo);
        require_approver_or_admin($ctx);
        handle_get_assignments_calendar($pdo, $ctx);
    }
} catch (ApiException $e) {
    send_json([
        'status' => 'error',
        'message' => $e->getMessage(),
        'code' => $e->errorCode,
    ], $e->httpStatus);
} catch (Throwable $e) {
    error_log('Burza API fatal error: ' . $e->getMessage());
    send_json([
        'status' => 'error',
        'message' => 'Internal server error',
    ], 500);
}

send_json([
    'status' => 'error',
    'message' => 'Endpoint not found',
    'available' => [
        'GET /health',
        'GET /me',
        'POST /availabilities',
        'PATCH /availabilities/{id}',
        'DELETE /availabilities/{id}',
        'GET /availabilities/mine',
        'GET /availabilities/day-summary',
        'GET /permissions',
        'GET /admin/users',
        'GET /admin/catalog',
        'GET /admin/settings',
        'PATCH /admin/settings',
        'PATCH /admin/users/{id}',
        'DELETE /admin/users/{id}',
        'GET /approvals/availabilities',
        'POST /approvals/availabilities/{id}/assign',
        'POST /approvals/availabilities/{id}/reject',
        'GET /assignments/mine',
        'GET /assignments/calendar',
    ],
], 404);

function send_json(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_api_path(string $rawPath): string
{
    $normalized = rtrim($rawPath, '/');
    if ($normalized === '') {
        $normalized = '/';
    }

    $prefixes = ['/dev/api.burza-sluzby', '/api.burza-sluzby'];
    foreach ($prefixes as $prefix) {
        if ($normalized === $prefix) {
            return '/';
        }
        if (str_starts_with($normalized, $prefix . '/')) {
            return substr($normalized, strlen($prefix));
        }
    }

    return $normalized;
}

function read_json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new ApiException('Invalid JSON payload.', 400, 'invalid_json');
    }

    return $decoded;
}

function parse_datetime_value(string $value, string $field): string
{
    $value = trim($value);
    if ($value === '') {
        throw new ApiException("Field {$field} is required.", 400, 'missing_field');
    }

    $ts = strtotime($value);
    if ($ts === false) {
        throw new ApiException("Field {$field} is not a valid datetime.", 400, 'invalid_datetime');
    }

    return date('Y-m-d H:i:s', $ts);
}

function json_or_null(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    if (is_array($value)) {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new ApiException('Unable to encode JSON payload.', 400, 'json_encode_failed');
        }
        return $encoded;
    }

    throw new ApiException('JSON field must be an object.', 400, 'invalid_json_field');
}

function get_app_setting_value(PDO $pdo, string $key): ?string
{
    $stmt = $pdo->prepare('SELECT setting_value FROM burza_sluzby_app_settings WHERE setting_key = :setting_key LIMIT 1');
    $stmt->execute([':setting_key' => $key]);
    $value = $stmt->fetchColumn();

    return is_string($value) ? trim($value) : null;
}

function get_app_setting_int(PDO $pdo, string $key, int $default): int
{
    $raw = get_app_setting_value($pdo, $key);
    if ($raw === null || $raw === '') {
        return $default;
    }

    return filter_var($raw, FILTER_VALIDATE_INT) !== false ? (int) $raw : $default;
}

function upsert_app_setting(PDO $pdo, string $key, string $value, string $valueType, ?string $description, int $updatedBy): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO burza_sluzby_app_settings
            (setting_key, setting_value, value_type, description, updated_by, created_at, updated_at)
         VALUES
            (:setting_key, :setting_value, :value_type, :description, :updated_by, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            value_type = VALUES(value_type),
            description = VALUES(description),
            updated_by = VALUES(updated_by),
            updated_at = NOW()'
    );
    $stmt->execute([
        ':setting_key' => $key,
        ':setting_value' => $value,
        ':value_type' => $valueType,
        ':description' => $description,
        ':updated_by' => $updatedBy > 0 ? $updatedBy : null,
    ]);
}

function require_auth_context(PDO $pdo): array
{
    $localAuthUser = fetch_local_auth_user($pdo);
    if ($localAuthUser !== null) {
        if ((int) ($localAuthUser['aktivni'] ?? 0) !== 1) {
            throw new ApiException('User is not active.', 403, 'user_inactive');
        }

        $effectiveRole = normalize_effective_role($localAuthUser);
        $permissions = decode_permissions($localAuthUser['permissions_json'] ?? null);

        return [
            'auth_source' => 'local',
            'auth_user' => [
                'username' => (string) ($localAuthUser['username'] ?? ''),
                'displayName' => (string) ($localAuthUser['display_name'] ?? $localAuthUser['username'] ?? ''),
            ],
            'local_user' => $localAuthUser,
            'effective_role' => $effectiveRole,
            'permissions' => $permissions,
        ];
    }

    $authUser = fetch_auth_me();
    if ($authUser === null) {
        throw new ApiException('Not authenticated (Auth API /auth/me).', 401, 'not_authenticated');
    }

    sync_local_user($pdo, $authUser);
    $localUser = find_local_user($pdo, $authUser);
    if ($localUser === null) {
        throw new ApiException('Unable to load local user profile.', 500, 'local_user_missing');
    }

    if ((int) ($localUser['aktivni'] ?? 0) !== 1) {
        $accessStatus = strtolower(trim((string) ($localUser['access_status'] ?? '')));
        if ($accessStatus === 'pending') {
            throw new ApiException('Váš přístup čeká na schválení administrátorem. O výsledku (schváleno/neschváleno) budete informováni.', 403, 'access_pending_approval');
        }
        if ($accessStatus === 'rejected') {
            throw new ApiException('Váš přístup byl zamítnut administrátorem.', 403, 'access_rejected');
        }

        throw new ApiException('Uživatel není aktivní.', 403, 'user_inactive');
    }

    $effectiveRole = normalize_effective_role($localUser);
    $permissions = decode_permissions($localUser['permissions_json'] ?? null);

    return [
        'auth_source' => 'entra',
        'auth_user' => $authUser,
        'local_user' => $localUser,
        'effective_role' => $effectiveRole,
        'permissions' => $permissions,
    ];
}

function normalize_effective_role(array $localUser): string
{
    $localRole = strtolower((string) ($localUser['local_role'] ?? ''));
    if (in_array($localRole, ['employee', 'doctor', 'head_doctor', 'paramedic', 'approver', 'admin'], true)) {
        return $localRole;
    }

    $legacyRole = strtolower((string) ($localUser['role'] ?? 'user'));
    if ($legacyRole === 'admin') {
        return 'admin';
    }

    if (in_array($legacyRole, ['approver', 'schvalovatel'], true)) {
        return 'head_doctor';
    }

    return 'employee';
}

function decode_permissions(?string $json): array
{
    if ($json === null || trim($json) === '') {
        return [];
    }

    $decoded = json_decode($json, true);
    if (!is_array($decoded)) {
        return [];
    }

    return array_values(array_filter(array_map(
        static fn($v) => is_string($v) ? trim($v) : '',
        $decoded
    )));
}

function require_approver_or_admin(array $ctx): void
{
    if (!in_array($ctx['effective_role'], ['head_doctor', 'approver', 'admin'], true)) {
        throw new ApiException('Insufficient permissions. Approver/Admin required.', 403, 'forbidden');
    }
}

function require_admin(array $ctx): void
{
    if (($ctx['effective_role'] ?? '') !== 'admin') {
        throw new ApiException('Insufficient permissions. Admin required.', 403, 'forbidden');
    }
}

function normalize_admin_role(string $role): string
{
    $normalized = strtolower(trim($role));
    if (!in_array($normalized, ['employee', 'doctor', 'head_doctor', 'paramedic', 'approver', 'admin'], true)) {
        throw new ApiException('Invalid role value.', 400, 'invalid_role');
    }

    return $normalized;
}

function normalize_admin_permissions(mixed $rawPermissions): string
{
    if ($rawPermissions === null) {
        return '[]';
    }

    if (!is_array($rawPermissions)) {
        throw new ApiException('permissions must be an array of strings.', 400, 'invalid_permissions');
    }

    $clean = [];
    foreach ($rawPermissions as $permission) {
        if (!is_string($permission)) {
            continue;
        }
        $value = trim($permission);
        if ($value === '') {
            continue;
        }
        $clean[] = $value;
    }

    $clean = array_values(array_unique($clean));
    $encoded = json_encode($clean, JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        throw new ApiException('Unable to encode permissions.', 400, 'json_encode_failed');
    }

    return $encoded;
}

function fetch_catalog_items(PDO $pdo, string $category, ?string $role = null): array
{
    $sql =
        'SELECT
            id,
            category,
            item_key,
            item_value,
            description,
            role_scope,
            purpose,
            sort_order,
            is_active,
            metadata,
            created_at,
            updated_at
         FROM burza_sluzby_catalog
         WHERE category = :category
           AND is_active = 1';

    $params = [':category' => $category];
    if ($role !== null && $role !== '') {
        $scopes = match ($role) {
            'doctor' => ['doctor', 'employee'],
            'paramedic' => ['paramedic', 'employee'],
            'head_doctor' => ['head_doctor', 'approver'],
            'approver' => ['approver', 'head_doctor'],
            default => [$role],
        };

        $scopePredicates = [];
        foreach ($scopes as $index => $scope) {
            $key = ':role_scope_' . $index;
            $scopePredicates[] = 'role_scope = ' . $key;
            $params[$key] = $scope;
        }

        $sql .= ' AND (role_scope = :all_roles';
        foreach ($scopePredicates as $predicate) {
            $sql .= ' OR ' . $predicate;
        }
        $sql .= ')';
        $params[':all_roles'] = '*';
    }

    $sql .= ' ORDER BY sort_order ASC, item_value ASC, id ASC';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    return $stmt->fetchAll();
}

function handle_get_admin_catalog(PDO $pdo, array $ctx): void
{
    $category = trim((string) ($_GET['category'] ?? 'permissions'));
    if ($category === '') {
        throw new ApiException('category is required.', 400, 'missing_category');
    }

    $roleRaw = trim((string) ($_GET['role'] ?? ''));
    $role = $roleRaw === '' ? null : normalize_admin_role($roleRaw);

    $items = fetch_catalog_items($pdo, $category, $role);

    send_json([
        'status' => 'ok',
        'data' => $items,
        'filters' => [
            'category' => $category,
            'role' => $role,
        ],
        'meta' => [
            'edited_by' => (int) ($ctx['local_user']['id'] ?? 0),
        ],
    ]);
}

function handle_get_admin_settings(PDO $pdo, array $ctx): void
{
    send_json([
        'status' => 'ok',
        'data' => [
            'max_candidates_per_day' => get_app_setting_int($pdo, 'max_candidates_per_day', 4),
        ],
        'meta' => [
            'edited_by' => (int) ($ctx['local_user']['id'] ?? 0),
        ],
    ]);
}

function handle_update_admin_settings(PDO $pdo, array $ctx): void
{
    $payload = read_json_input();

    if (!array_key_exists('max_candidates_per_day', $payload)) {
        throw new ApiException('Chybí max_candidates_per_day.', 400, 'missing_max_candidates_per_day');
    }

    $maxCandidates = filter_var($payload['max_candidates_per_day'], FILTER_VALIDATE_INT);
    if ($maxCandidates === false || $maxCandidates < 1 || $maxCandidates > 50) {
        throw new ApiException('Maximální počet zájemců na den musí být celé číslo 1 až 50.', 400, 'invalid_max_candidates_per_day');
    }

    upsert_app_setting(
        $pdo,
        'max_candidates_per_day',
        (string) $maxCandidates,
        'int',
        'Maximální počet zájemců na jeden den.',
        (int) ($ctx['local_user']['id'] ?? 0)
    );

    send_json([
        'status' => 'ok',
        'data' => [
            'max_candidates_per_day' => $maxCandidates,
        ],
        'meta' => [
            'edited_by' => (int) ($ctx['local_user']['id'] ?? 0),
        ],
    ]);
}

function handle_get_admin_users(PDO $pdo, array $ctx): void
{
    $search = trim((string) ($_GET['search'] ?? ''));
    $roleFilter = trim((string) ($_GET['role'] ?? ''));
    $activeFilter = trim((string) ($_GET['active'] ?? ''));
    $limit = max(1, min(300, (int) ($_GET['limit'] ?? 200)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $where = ['1 = 1'];
    $params = [];

    if ($search !== '') {
        $where[] = '(u.username LIKE :search OR u.display_name LIKE :search OR u.title_before LIKE :search OR u.title_after LIKE :search OR u.email LIKE :search OR u.phone LIKE :search OR u.department LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    if ($roleFilter !== '') {
        $where[] = 'u.local_role = :role_filter';
        $params[':role_filter'] = normalize_admin_role($roleFilter);
    }

    if ($activeFilter !== '') {
        if (!in_array($activeFilter, ['0', '1'], true)) {
            throw new ApiException('active filter must be 0 or 1.', 400, 'invalid_active_filter');
        }
        $where[] = 'u.aktivni = :active_filter';
        $params[':active_filter'] = (int) $activeFilter;
    }

    $sql =
        'SELECT
            u.id,
            u.entra_id,
            u.username,
            u.user_principal_name,
            u.email,
            u.phone,
            u.display_name,
            u.title_before,
            u.title_after,
            u.given_name,
            u.surname,
            u.department,
            u.job_title,
            u.local_role,
            u.access_status,
            u.local_login_enabled,
            u.local_login_username,
            u.role,
            u.permissions_json,
            u.local_settings,
            u.aktivni,
            u.local_note,
            u.last_login_at,
            u.created_at,
            u.updated_at
         FROM burza_sluzby_users u
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY u.updated_at DESC, u.id DESC
         LIMIT :limit OFFSET :offset';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        if ($key === ':active_filter') {
            $stmt->bindValue($key, (int) $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, (string) $value);
        }
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    send_json([
        'status' => 'ok',
        'data' => $stmt->fetchAll(),
        'filters' => [
            'search' => $search,
            'role' => $roleFilter,
            'active' => $activeFilter,
            'limit' => $limit,
            'offset' => $offset,
        ],
        'meta' => [
            'edited_by' => (int) ($ctx['local_user']['id'] ?? 0),
        ],
    ]);
}

function handle_update_admin_user(PDO $pdo, array $ctx, int $userId): void
{
    $payload = read_json_input();

    if ($userId <= 0) {
        throw new ApiException('Invalid user id.', 400, 'invalid_user_id');
    }

    $sel = $pdo->prepare('SELECT * FROM burza_sluzby_users WHERE id = :id LIMIT 1');
    $sel->execute([':id' => $userId]);
    $existing = $sel->fetch();
    if (!is_array($existing)) {
        throw new ApiException('User not found.', 404, 'user_not_found');
    }

    $displayName = trim((string) ($payload['display_name'] ?? $existing['display_name'] ?? ''));
    $email = trim((string) ($payload['email'] ?? $existing['email'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? $existing['phone'] ?? ''));
    $titleBefore = trim((string) ($payload['title_before'] ?? $existing['title_before'] ?? ''));
    $titleAfter = trim((string) ($payload['title_after'] ?? $existing['title_after'] ?? ''));
    $department = trim((string) ($payload['department'] ?? $existing['department'] ?? ''));
    $jobTitle = trim((string) ($payload['job_title'] ?? $existing['job_title'] ?? ''));
    $localNote = trim((string) ($payload['local_note'] ?? $existing['local_note'] ?? ''));
    $localRole = normalize_admin_role((string) ($payload['local_role'] ?? $existing['local_role'] ?? 'employee'));
    $localLoginEnabled = array_key_exists('local_login_enabled', $payload)
        ? ((int) ((bool) $payload['local_login_enabled']))
        : (int) ($existing['local_login_enabled'] ?? 0);
    $localLoginUsername = trim((string) ($payload['local_login_username'] ?? ($existing['local_login_username'] ?? '')));
    $localLoginPassword = (string) ($payload['local_login_password'] ?? '');
    $clearLocalLoginPassword = array_key_exists('clear_local_login_password', $payload)
        ? ((bool) $payload['clear_local_login_password'])
        : false;

    if ($localLoginEnabled === 1 && $localLoginUsername === '') {
        throw new ApiException('Pro lokální přihlášení je nutné vyplnit lokální username.', 400, 'missing_local_login_username');
    }

    if ($localLoginUsername !== '') {
        $dup = $pdo->prepare('SELECT id FROM burza_sluzby_users WHERE local_login_username = :username AND id <> :id LIMIT 1');
        $dup->bindValue(':username', $localLoginUsername);
        $dup->bindValue(':id', $userId, PDO::PARAM_INT);
        $dup->execute();
        if (is_array($dup->fetch())) {
            throw new ApiException('Lokální username už používá jiný účet.', 400, 'duplicate_local_login_username');
        }
    }

    if ($localLoginEnabled === 1 && $localLoginPassword === '' && trim((string) ($existing['local_password_hash'] ?? '')) === '') {
        throw new ApiException('Pro zapnutí lokálního přihlášení je nutné nastavit heslo.', 400, 'missing_local_login_password');
    }

    $localPasswordHash = (is_string($existing['local_password_hash'] ?? null) && trim((string) $existing['local_password_hash']) !== '')
        ? (string) $existing['local_password_hash']
        : null;

    if ($localLoginPassword !== '') {
        $localPasswordHash = password_hash($localLoginPassword, PASSWORD_DEFAULT);
        if ($localPasswordHash === false) {
            throw new ApiException('Nepodařilo se zpracovat heslo.', 500, 'password_hash_failed');
        }
    }

    if ($clearLocalLoginPassword) {
        $localPasswordHash = null;
    }

    if ($localLoginEnabled === 1 && ($localPasswordHash === null || trim($localPasswordHash) === '')) {
        throw new ApiException('Zapnutý lokální login vyžaduje uložené heslo.', 400, 'local_login_requires_password');
    }

    $permissionsJson = array_key_exists('permissions', $payload)
        ? normalize_admin_permissions($payload['permissions'])
        : ((is_string($existing['permissions_json'] ?? null) && trim((string) $existing['permissions_json']) !== '') ? (string) $existing['permissions_json'] : '[]');

    if (array_key_exists('permissions', $payload)) {
        $selected = json_decode($permissionsJson, true);
        $selectedList = is_array($selected)
            ? array_values(array_filter(array_map(static fn($v) => is_string($v) ? trim($v) : '', $selected)))
            : [];

        $allowedItems = fetch_catalog_items($pdo, 'permissions', $localRole);
        $allowedCodes = array_values(array_filter(array_map(
            static fn($item) => is_array($item) && is_string($item['item_key'] ?? null) ? trim((string) $item['item_key']) : '',
            $allowedItems
        )));

        if (!empty($allowedCodes)) {
            $invalid = array_values(array_diff($selectedList, $allowedCodes));
            if (!empty($invalid)) {
                throw new ApiException(
                    'Neplatna prava pro roli ' . $localRole . ': ' . implode(', ', $invalid),
                    400,
                    'invalid_permissions_for_role'
                );
            }
        }
    }

    $active = array_key_exists('aktivni', $payload)
        ? ((int) ((bool) $payload['aktivni']))
        : (int) ($existing['aktivni'] ?? 1);

    $accessStatus = trim((string) ($existing['access_status'] ?? ($active === 1 ? 'approved' : 'pending')));
    if (array_key_exists('aktivni', $payload)) {
        $accessStatus = $active === 1 ? 'approved' : 'rejected';
    }

    $localSettings = array_key_exists('local_settings', $payload)
        ? json_or_null($payload['local_settings'])
        : ((is_string($existing['local_settings'] ?? null) && trim((string) $existing['local_settings']) !== '') ? (string) $existing['local_settings'] : null);

    $legacyRole = $localRole === 'admin'
        ? 'admin'
        : ((in_array($localRole, ['head_doctor', 'approver'], true)) ? 'approver' : 'user');

    $upd = $pdo->prepare(
        'UPDATE burza_sluzby_users
         SET display_name = :display_name,
             email = :email,
             phone = :phone,
             title_before = :title_before,
             title_after = :title_after,
             department = :department,
             job_title = :job_title,
             local_role = :local_role,
             access_status = :access_status,
             local_login_enabled = :local_login_enabled,
             local_login_username = :local_login_username,
             local_password_hash = :local_password_hash,
             role = :role,
             permissions_json = :permissions_json,
             local_settings = :local_settings,
             aktivni = :aktivni,
             local_note = :local_note,
             updated_at = NOW()
         WHERE id = :id'
    );

    $upd->bindValue(':display_name', $displayName === '' ? null : $displayName);
    $upd->bindValue(':email', $email === '' ? null : $email);
    $upd->bindValue(':phone', $phone === '' ? null : $phone);
    $upd->bindValue(':title_before', $titleBefore === '' ? null : $titleBefore);
    $upd->bindValue(':title_after', $titleAfter === '' ? null : $titleAfter);
    $upd->bindValue(':department', $department === '' ? null : $department);
    $upd->bindValue(':job_title', $jobTitle === '' ? null : $jobTitle);
    $upd->bindValue(':local_role', $localRole);
    $upd->bindValue(':access_status', $accessStatus === '' ? ($active === 1 ? 'approved' : 'pending') : $accessStatus);
    $upd->bindValue(':local_login_enabled', $localLoginEnabled, PDO::PARAM_INT);
    $upd->bindValue(':local_login_username', $localLoginUsername === '' ? null : $localLoginUsername);
    $upd->bindValue(':local_password_hash', $localPasswordHash);
    $upd->bindValue(':role', $legacyRole);
    $upd->bindValue(':permissions_json', $permissionsJson);
    $upd->bindValue(':local_settings', $localSettings);
    $upd->bindValue(':aktivni', $active, PDO::PARAM_INT);
    $upd->bindValue(':local_note', $localNote === '' ? null : $localNote);
    $upd->bindValue(':id', $userId, PDO::PARAM_INT);
    $upd->execute();

    $refresh = $pdo->prepare(
        'SELECT
            id,
            entra_id,
            username,
            user_principal_name,
            email,
            phone,
            display_name,
            title_before,
            title_after,
            given_name,
            surname,
            department,
            job_title,
            local_role,
            access_status,
            local_login_enabled,
            local_login_username,
            role,
            permissions_json,
            local_settings,
            aktivni,
            local_note,
            last_login_at,
            created_at,
            updated_at
         FROM burza_sluzby_users
         WHERE id = :id
         LIMIT 1'
    );
    $refresh->execute([':id' => $userId]);
    $updated = $refresh->fetch();

    send_json([
        'status' => 'ok',
        'data' => $updated,
        'meta' => [
            'edited_by' => (int) ($ctx['local_user']['id'] ?? 0),
        ],
    ]);
}

function handle_delete_admin_user(PDO $pdo, array $ctx, int $userId): void
{
    if ($userId <= 0) {
        throw new ApiException('Invalid user id.', 400, 'invalid_user_id');
    }

    $currentUserId = (int) ($ctx['local_user']['id'] ?? 0);
    if ($currentUserId === $userId) {
        throw new ApiException('Nelze smazat právě přihlášený účet.', 400, 'cannot_delete_self');
    }

    $refCheck = $pdo->prepare(
        'SELECT
            (SELECT COUNT(*) FROM burza_sluzby_availabilities WHERE user_id = :id1) AS avail_count,
            (SELECT COUNT(*) FROM burza_sluzby_shift_assignments WHERE user_id = :id2 OR approver_id = :id3) AS assign_count'
    );
    $refCheck->execute([
        ':id1' => $userId,
        ':id2' => $userId,
        ':id3' => $userId,
    ]);
    $refs = $refCheck->fetch();
    $availCount = (int) ($refs['avail_count'] ?? 0);
    $assignCount = (int) ($refs['assign_count'] ?? 0);
    if ($availCount > 0 || $assignCount > 0) {
        throw new ApiException('Uživatel má historická data. Místo smazání účet deaktivujte.', 409, 'user_has_history');
    }

    $del = $pdo->prepare('DELETE FROM burza_sluzby_users WHERE id = :id LIMIT 1');
    $del->bindValue(':id', $userId, PDO::PARAM_INT);
    $del->execute();

    if ($del->rowCount() <= 0) {
        throw new ApiException('User not found.', 404, 'user_not_found');
    }

    send_json([
        'status' => 'ok',
        'data' => [
            'deleted_user_id' => $userId,
        ],
        'meta' => [
            'edited_by' => $currentUserId,
        ],
    ]);
}

function handle_create_availability(PDO $pdo, array $ctx): void
{
    $payload = read_json_input();

    $start = parse_datetime_value((string) ($payload['start_time'] ?? ''), 'start_time');
    $end = parse_datetime_value((string) ($payload['end_time'] ?? ''), 'end_time');
    if (strtotime($end) <= strtotime($start)) {
        throw new ApiException('end_time must be greater than start_time.', 400, 'invalid_range');
    }

    $employeeNote = isset($payload['employee_note']) ? trim((string) $payload['employee_note']) : null;
    $metadata = json_or_null($payload['metadata'] ?? null);

    $maxCandidatesPerDay = get_app_setting_int($pdo, 'max_candidates_per_day', 4);
    $countStmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM burza_sluzby_availabilities
         WHERE DATE(start_time) = DATE(:start_time)
           AND status IN (\'pending\', \'approved\')'
    );
    $countStmt->execute([':start_time' => $start]);
    $currentCount = (int) $countStmt->fetchColumn();

    if ($currentCount >= $maxCandidatesPerDay) {
        throw new ApiException(
            'Na tento den už je evidován maximální počet zájemců (' . $maxCandidatesPerDay . ').',
            400,
            'max_candidates_per_day_reached'
        );
    }

    $stmt = $pdo->prepare(
        'INSERT INTO burza_sluzby_availabilities
            (user_id, created_by, updated_by, start_time, end_time, status, employee_note, metadata, created_at, updated_at)
         VALUES
            (:user_id, :created_by, :updated_by, :start_time, :end_time, :status, :employee_note, :metadata, NOW(), NOW())'
    );

    $stmt->execute([
        ':user_id' => (int) $ctx['local_user']['id'],
        ':created_by' => (int) $ctx['local_user']['id'],
        ':updated_by' => (int) $ctx['local_user']['id'],
        ':start_time' => $start,
        ':end_time' => $end,
        ':status' => 'pending',
        ':employee_note' => ($employeeNote === '' ? null : $employeeNote),
        ':metadata' => $metadata,
    ]);

    send_json([
        'status' => 'ok',
        'data' => [
            'id' => (int) $pdo->lastInsertId(),
            'user_id' => (int) $ctx['local_user']['id'],
            'start_time' => $start,
            'end_time' => $end,
            'state' => 'pending',
        ],
    ], 201);
}

function handle_update_availability(PDO $pdo, array $ctx, int $availabilityId): void
{
    if ($availabilityId <= 0) {
        throw new ApiException('Invalid availability id.', 400, 'invalid_availability_id');
    }

    $payload = read_json_input();
    $start = parse_datetime_value((string) ($payload['start_time'] ?? ''), 'start_time');
    $end = parse_datetime_value((string) ($payload['end_time'] ?? ''), 'end_time');
    if (strtotime($end) <= strtotime($start)) {
        throw new ApiException('end_time must be greater than start_time.', 400, 'invalid_range');
    }

    $sel = $pdo->prepare('SELECT * FROM burza_sluzby_availabilities WHERE id = :id LIMIT 1');
    $sel->execute([':id' => $availabilityId]);
    $existing = $sel->fetch();
    if (!is_array($existing)) {
        throw new ApiException('Availability not found.', 404, 'availability_not_found');
    }

    if ((int) ($existing['user_id'] ?? 0) !== (int) ($ctx['local_user']['id'] ?? 0)) {
        throw new ApiException('Nelze upravit cizí dostupnost.', 403, 'forbidden_availability_edit');
    }

    $employeeNote = isset($payload['employee_note']) ? trim((string) $payload['employee_note']) : null;
    $metadata = json_or_null($payload['metadata'] ?? null);

    $upd = $pdo->prepare(
        'UPDATE burza_sluzby_availabilities
         SET start_time = :start_time,
             end_time = :end_time,
             employee_note = :employee_note,
             metadata = :metadata,
             updated_by = :updated_by,
             updated_at = NOW()
         WHERE id = :id'
    );
    $upd->execute([
        ':start_time' => $start,
        ':end_time' => $end,
        ':employee_note' => ($employeeNote === '' ? null : $employeeNote),
        ':metadata' => $metadata,
        ':updated_by' => (int) ($ctx['local_user']['id'] ?? 0),
        ':id' => $availabilityId,
    ]);

    $refresh = $pdo->prepare(
        'SELECT id, user_id, start_time, end_time, status, employee_note, metadata, created_at, updated_at
         FROM burza_sluzby_availabilities
         WHERE id = :id
         LIMIT 1'
    );
    $refresh->execute([':id' => $availabilityId]);

    send_json([
        'status' => 'ok',
        'data' => $refresh->fetch(),
    ]);
}

function handle_delete_availability(PDO $pdo, array $ctx, int $availabilityId): void
{
    if ($availabilityId <= 0) {
        throw new ApiException('Invalid availability id.', 400, 'invalid_availability_id');
    }

    $sel = $pdo->prepare('SELECT * FROM burza_sluzby_availabilities WHERE id = :id LIMIT 1');
    $sel->execute([':id' => $availabilityId]);
    $existing = $sel->fetch();
    if (!is_array($existing)) {
        throw new ApiException('Availability not found.', 404, 'availability_not_found');
    }

    if ((int) ($existing['user_id'] ?? 0) !== (int) ($ctx['local_user']['id'] ?? 0)) {
        throw new ApiException('Nelze smazat cizí dostupnost.', 403, 'forbidden_availability_delete');
    }

    $del = $pdo->prepare('DELETE FROM burza_sluzby_availabilities WHERE id = :id LIMIT 1');
    $del->execute([':id' => $availabilityId]);

    send_json([
        'status' => 'ok',
        'data' => [
            'deleted_availability_id' => $availabilityId,
        ],
    ]);
}

function handle_get_my_availabilities(PDO $pdo, array $ctx): void
{
    $limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $sql =
        'SELECT
            id,
            user_id,
            start_time,
            end_time,
            status,
            employee_note,
            metadata,
            created_at,
            updated_at
         FROM burza_sluzby_availabilities
         WHERE user_id = :user_id
         ORDER BY start_time DESC
         LIMIT :limit OFFSET :offset';

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':user_id', (int) $ctx['local_user']['id'], PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    send_json([
        'status' => 'ok',
        'data' => $stmt->fetchAll(),
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
        ],
    ]);
}

function can_view_availability_names(array $ctx): bool
{
    return in_array((string) ($ctx['effective_role'] ?? ''), ['head_doctor', 'admin'], true);
}

function handle_get_availability_day_summary(PDO $pdo, array $ctx): void
{
    $rangeStart = isset($_GET['range_start'])
        ? parse_datetime_value((string) $_GET['range_start'], 'range_start')
        : date('Y-m-d H:i:s', strtotime('-30 days'));
    $rangeEnd = isset($_GET['range_end'])
        ? parse_datetime_value((string) $_GET['range_end'], 'range_end')
        : date('Y-m-d H:i:s', strtotime('+90 days'));

    $includeNames = can_view_availability_names($ctx);
    $sql =
        'SELECT
            a.start_time,
            a.end_time' .
            ($includeNames
                ? ", COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.title_before, ''), ' ', COALESCE(u.display_name, u.username, ''), ' ', COALESCE(u.title_after, ''))), ''), u.username) AS candidate_name"
                : '') .
        ' FROM burza_sluzby_availabilities a
          LEFT JOIN burza_sluzby_users u ON u.id = a.user_id
         WHERE a.status IN (\'pending\', \'approved\')
           AND a.start_time < :range_end
           AND a.end_time > :range_start
         ORDER BY a.start_time ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':range_start' => $rangeStart,
        ':range_end' => $rangeEnd,
    ]);

    $rows = $stmt->fetchAll();
    $rangeStartTs = strtotime($rangeStart);
    $rangeEndTs = strtotime($rangeEnd);
    $days = [];

    foreach (is_array($rows) ? $rows : [] as $row) {
        $startTs = strtotime((string) ($row['start_time'] ?? ''));
        $endTs = strtotime((string) ($row['end_time'] ?? ''));
        if ($startTs === false || $endTs === false || $endTs <= $startTs) {
            continue;
        }

        $cursor = strtotime(date('Y-m-d 00:00:00', max($startTs, $rangeStartTs)));
        if ($cursor === false) {
            continue;
        }

        while ($cursor < $endTs && $cursor < $rangeEndTs) {
            $dayKey = date('Y-m-d', $cursor);
            if (!isset($days[$dayKey])) {
                $days[$dayKey] = [
                    'day_key' => $dayKey,
                    'candidate_count' => 0,
                    'candidate_names' => [],
                ];
            }

            $days[$dayKey]['candidate_count'] += 1;

            if ($includeNames) {
                $name = trim((string) ($row['candidate_name'] ?? ''));
                if ($name !== '') {
                    $days[$dayKey]['candidate_names'][] = $name;
                }
            }

            $cursor = strtotime('+1 day', $cursor);
            if ($cursor === false) {
                break;
            }
        }
    }

    ksort($days);
    $data = array_values(array_map(static function (array $entry): array {
        $entry['candidate_names'] = array_values($entry['candidate_names'] ?? []);
        return $entry;
    }, $days));

    send_json([
        'status' => 'ok',
        'data' => $data,
        'filters' => [
            'range_start' => $rangeStart,
            'range_end' => $rangeEnd,
            'include_names' => $includeNames,
        ],
    ]);
}

function handle_get_pending_approvals(PDO $pdo, array $ctx): void
{
    $department = trim((string) ($_GET['department'] ?? ''));
    $statusParam = trim((string) ($_GET['status'] ?? 'pending'));

    $allowedStatuses = ['pending', 'rejected', 'approved', 'cancelled'];
    $statuses = array_values(array_filter(array_map('trim', explode(',', $statusParam)), static function (string $value): bool {
        return $value !== '';
    }));
    if ($statuses === []) {
        $statuses = ['pending'];
    }

    foreach ($statuses as $status) {
        if (!in_array($status, $allowedStatuses, true)) {
            throw new ApiException('Invalid status filter.', 400, 'invalid_status_filter');
        }
    }

    $rangeStart = isset($_GET['range_start'])
        ? parse_datetime_value((string) $_GET['range_start'], 'range_start')
        : date('Y-m-d H:i:s', strtotime('-30 days'));
    $rangeEnd = isset($_GET['range_end'])
        ? parse_datetime_value((string) $_GET['range_end'], 'range_end')
        : date('Y-m-d H:i:s', strtotime('+90 days'));

    $limit = max(1, min(300, (int) ($_GET['limit'] ?? 100)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $statusPlaceholders = [];
    foreach (array_values($statuses) as $index => $_status) {
        $statusPlaceholders[] = ':status_' . $index;
    }

    $sql =
        'SELECT
            a.id,
            a.user_id,
            a.start_time,
            a.end_time,
            a.status,
            a.employee_note,
            a.metadata,
            u.display_name,
            u.department
         FROM burza_sluzby_availabilities a
         JOIN burza_sluzby_users u ON u.id = a.user_id
                 WHERE a.status IN (' . implode(', ', $statusPlaceholders) . ')
           AND u.aktivni = 1
           AND a.start_time < :range_end
                     AND a.end_time > :range_start' .
                     ($department !== '' ? ' AND u.department = :department' : '') .
                '
         ORDER BY a.start_time ASC
         LIMIT :limit OFFSET :offset';

    $stmt = $pdo->prepare($sql);
    foreach (array_values($statuses) as $index => $status) {
        $stmt->bindValue(':status_' . $index, $status);
    }
    if ($department !== '') {
        $stmt->bindValue(':department', $department);
    }
    $stmt->bindValue(':range_end', $rangeEnd);
    $stmt->bindValue(':range_start', $rangeStart);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    send_json([
        'status' => 'ok',
        'data' => $stmt->fetchAll(),
        'filters' => [
            'department' => $department,
            'status' => $statuses,
            'range_start' => $rangeStart,
            'range_end' => $rangeEnd,
            'limit' => $limit,
            'offset' => $offset,
        ],
    ]);
}

function handle_assign_availability(PDO $pdo, array $ctx, int $availabilityId): void
{
    $payload = read_json_input();

    $assignedDepartment = trim((string) ($payload['assigned_department'] ?? ''));
    if ($assignedDepartment === '') {
        throw new ApiException('assigned_department is required.', 400, 'missing_assigned_department');
    }

    $assignedStart = parse_datetime_value((string) ($payload['assigned_start'] ?? ''), 'assigned_start');
    $assignedEnd = parse_datetime_value((string) ($payload['assigned_end'] ?? ''), 'assigned_end');
    if (strtotime($assignedEnd) <= strtotime($assignedStart)) {
        throw new ApiException('assigned_end must be greater than assigned_start.', 400, 'invalid_assigned_range');
    }

    $metadata = json_or_null($payload['metadata'] ?? null);

    $pdo->beginTransaction();

    try {
        $sel = $pdo->prepare(
            'SELECT id, user_id, start_time, end_time, status
             FROM burza_sluzby_availabilities
             WHERE id = :id
             FOR UPDATE'
        );
        $sel->execute([':id' => $availabilityId]);
        $availability = $sel->fetch();

        if (!is_array($availability)) {
            throw new ApiException('Availability not found.', 404, 'availability_not_found');
        }

        $currentStatus = (string) ($availability['status'] ?? 'pending');
        if (!in_array($currentStatus, ['pending', 'approved', 'rejected'], true)) {
            throw new ApiException('Availability cannot be approved in current status.', 409, 'availability_not_approvable');
        }

        $origStart = strtotime((string) $availability['start_time']);
        $origEnd = strtotime((string) $availability['end_time']);
        $newStart = strtotime($assignedStart);
        $newEnd = strtotime($assignedEnd);

        if ($newStart < $origStart || $newEnd > $origEnd) {
            throw new ApiException('Assigned interval must be inside offered availability interval.', 400, 'assigned_outside_availability');
        }

        $assignmentId = 0;
        if ($currentStatus === 'approved') {
            $findAssignment = $pdo->prepare(
                'SELECT id
                 FROM burza_sluzby_shift_assignments
                 WHERE availability_id = :availability_id
                 ORDER BY id DESC
                 LIMIT 1
                 FOR UPDATE'
            );
            $findAssignment->execute([':availability_id' => $availabilityId]);
            $existingAssignment = $findAssignment->fetch();

            if (is_array($existingAssignment) && isset($existingAssignment['id'])) {
                $assignmentId = (int) $existingAssignment['id'];
                $updAssignment = $pdo->prepare(
                    'UPDATE burza_sluzby_shift_assignments
                     SET approver_id = :approver_id,
                         updated_by = :updated_by,
                         assigned_department = :assigned_department,
                         assigned_start = :assigned_start,
                         assigned_end = :assigned_end,
                         metadata = :metadata,
                         updated_at = NOW()
                     WHERE id = :id'
                );
                $updAssignment->execute([
                    ':approver_id' => (int) $ctx['local_user']['id'],
                    ':updated_by' => (int) $ctx['local_user']['id'],
                    ':assigned_department' => $assignedDepartment,
                    ':assigned_start' => $assignedStart,
                    ':assigned_end' => $assignedEnd,
                    ':metadata' => $metadata,
                    ':id' => $assignmentId,
                ]);
            } else {
                $ins = $pdo->prepare(
                    'INSERT INTO burza_sluzby_shift_assignments
                        (availability_id, user_id, approver_id, created_by, updated_by, assigned_department, assigned_start, assigned_end, metadata, created_at, updated_at)
                     VALUES
                        (:availability_id, :user_id, :approver_id, :created_by, :updated_by, :assigned_department, :assigned_start, :assigned_end, :metadata, NOW(), NOW())'
                );
                $ins->execute([
                    ':availability_id' => $availabilityId,
                    ':user_id' => (int) $availability['user_id'],
                    ':approver_id' => (int) $ctx['local_user']['id'],
                    ':created_by' => (int) $ctx['local_user']['id'],
                    ':updated_by' => (int) $ctx['local_user']['id'],
                    ':assigned_department' => $assignedDepartment,
                    ':assigned_start' => $assignedStart,
                    ':assigned_end' => $assignedEnd,
                    ':metadata' => $metadata,
                ]);
                $assignmentId = (int) $pdo->lastInsertId();
            }
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO burza_sluzby_shift_assignments
                    (availability_id, user_id, approver_id, created_by, updated_by, assigned_department, assigned_start, assigned_end, metadata, created_at, updated_at)
                 VALUES
                    (:availability_id, :user_id, :approver_id, :created_by, :updated_by, :assigned_department, :assigned_start, :assigned_end, :metadata, NOW(), NOW())'
            );
            $ins->execute([
                ':availability_id' => $availabilityId,
                ':user_id' => (int) $availability['user_id'],
                ':approver_id' => (int) $ctx['local_user']['id'],
                ':created_by' => (int) $ctx['local_user']['id'],
                ':updated_by' => (int) $ctx['local_user']['id'],
                ':assigned_department' => $assignedDepartment,
                ':assigned_start' => $assignedStart,
                ':assigned_end' => $assignedEnd,
                ':metadata' => $metadata,
            ]);

            $assignmentId = (int) $pdo->lastInsertId();
        }

        $upd = $pdo->prepare(
            'UPDATE burza_sluzby_availabilities
             SET status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $upd->execute([
            ':status' => 'approved',
            ':id' => $availabilityId,
        ]);

        $updAudit = $pdo->prepare(
            'UPDATE burza_sluzby_availabilities
             SET updated_by = :updated_by
             WHERE id = :id'
        );
        $updAudit->execute([
            ':updated_by' => (int) $ctx['local_user']['id'],
            ':id' => $availabilityId,
        ]);

        $pdo->commit();

        send_json([
            'status' => 'ok',
            'data' => [
                'assignment_id' => $assignmentId,
                'availability_id' => $availabilityId,
                'new_availability_status' => 'approved',
            ],
        ], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        if ($e instanceof ApiException) {
            throw $e;
        }

        throw new ApiException('Failed to assign availability.', 500, 'assign_failed');
    }
}

function handle_reject_availability(PDO $pdo, array $ctx, int $availabilityId): void
{
    $payload = read_json_input();
    $reason = isset($payload['reason']) ? trim((string) $payload['reason']) : null;

    $pdo->beginTransaction();

    try {
        $sel = $pdo->prepare(
            'SELECT id, status, metadata
             FROM burza_sluzby_availabilities
             WHERE id = :id
             FOR UPDATE'
        );
        $sel->execute([':id' => $availabilityId]);
        $availability = $sel->fetch();

        if (!is_array($availability)) {
            throw new ApiException('Availability not found.', 404, 'availability_not_found');
        }

        $currentStatus = (string) ($availability['status'] ?? 'pending');
        if (!in_array($currentStatus, ['pending', 'approved', 'rejected'], true)) {
            throw new ApiException('Availability cannot be rejected in current status.', 409, 'availability_not_rejectable');
        }

        if ($currentStatus === 'approved') {
            $deleteAssignments = $pdo->prepare(
                'DELETE FROM burza_sluzby_shift_assignments
                 WHERE availability_id = :availability_id'
            );
            $deleteAssignments->execute([':availability_id' => $availabilityId]);
        }

        $metadataArr = [];
        $existingMetadata = $availability['metadata'] ?? null;
        if (is_string($existingMetadata) && trim($existingMetadata) !== '') {
            $decoded = json_decode($existingMetadata, true);
            if (is_array($decoded)) {
                $metadataArr = $decoded;
            }
        }

        $metadataArr['review'] = [
            'action' => 'rejected',
            'reason' => ($reason === '' ? null : $reason),
            'approver_id' => (int) $ctx['local_user']['id'],
            'reviewed_at' => date('c'),
        ];

        $upd = $pdo->prepare(
            'UPDATE burza_sluzby_availabilities
             SET status = :status,
                 metadata = :metadata,
                 updated_by = :updated_by,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $upd->execute([
            ':status' => 'rejected',
            ':metadata' => json_encode($metadataArr, JSON_UNESCAPED_UNICODE),
            ':updated_by' => (int) $ctx['local_user']['id'],
            ':id' => $availabilityId,
        ]);

        $pdo->commit();

        send_json([
            'status' => 'ok',
            'data' => [
                'availability_id' => $availabilityId,
                'new_availability_status' => 'rejected',
            ],
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        if ($e instanceof ApiException) {
            throw $e;
        }

        throw new ApiException('Failed to reject availability.', 500, 'reject_failed');
    }
}

function handle_get_my_assignments(PDO $pdo, array $ctx): void
{
    $limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $sql =
        'SELECT
            s.id,
            s.availability_id,
            s.user_id,
            s.approver_id,
            s.assigned_department,
            s.assigned_start,
            s.assigned_end,
            s.metadata,
            s.created_at,
            s.updated_at,
            u.display_name AS user_display_name,
            a.display_name AS approver_display_name
         FROM burza_sluzby_shift_assignments s
         JOIN burza_sluzby_users u ON u.id = s.user_id
         LEFT JOIN burza_sluzby_users a ON a.id = s.approver_id
         WHERE s.user_id = :user_id
         ORDER BY s.assigned_start DESC
         LIMIT :limit OFFSET :offset';

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':user_id', (int) $ctx['local_user']['id'], PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    send_json([
        'status' => 'ok',
        'data' => $stmt->fetchAll(),
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
        ],
    ]);
}

function handle_get_assignments_calendar(PDO $pdo, array $ctx): void
{
    $department = trim((string) ($_GET['department'] ?? ''));

    $rangeStart = isset($_GET['range_start'])
        ? parse_datetime_value((string) $_GET['range_start'], 'range_start')
        : date('Y-m-d H:i:s', strtotime('-30 days'));
    $rangeEnd = isset($_GET['range_end'])
        ? parse_datetime_value((string) $_GET['range_end'], 'range_end')
        : date('Y-m-d H:i:s', strtotime('+90 days'));

    if (strtotime($rangeEnd) <= strtotime($rangeStart)) {
        throw new ApiException('range_end must be greater than range_start.', 400, 'invalid_range');
    }

    $limit = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $sql =
        'SELECT
            s.id,
            s.availability_id,
            s.user_id,
            s.approver_id,
            s.assigned_department,
            s.assigned_start,
            s.assigned_end,
            s.metadata,
            s.created_at,
            s.updated_at,
            u.display_name AS user_display_name,
            u.department AS user_department,
            a.display_name AS approver_display_name
         FROM burza_sluzby_shift_assignments s
         JOIN burza_sluzby_users u ON u.id = s.user_id
         LEFT JOIN burza_sluzby_users a ON a.id = s.approver_id
                 WHERE s.assigned_start < :range_end
                     AND s.assigned_end > :range_start' .
                     ($department !== '' ? ' AND s.assigned_department = :department' : '') .
                '
         ORDER BY s.assigned_start ASC
         LIMIT :limit OFFSET :offset';

    $stmt = $pdo->prepare($sql);
    if ($department !== '') {
        $stmt->bindValue(':department', $department);
    }
    $stmt->bindValue(':range_end', $rangeEnd);
    $stmt->bindValue(':range_start', $rangeStart);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    send_json([
        'status' => 'ok',
        'data' => $stmt->fetchAll(),
        'filters' => [
            'department' => $department,
            'range_start' => $rangeStart,
            'range_end' => $rangeEnd,
            'limit' => $limit,
            'offset' => $offset,
        ],
    ]);
}

function fetch_auth_me(): ?array
{
    $authMeUrl = getenv('BURZA_AUTH_ME_URL') ?: 'http://localhost/auth/me';
    $authHostHeader = getenv('BURZA_AUTH_HOST_HEADER') ?: 'erdms.zachranka.cz';

    // Prefer forwarding full incoming Cookie header.
    // Fallback to erdms_session only when available.
    $incomingCookieHeader = trim((string) ($_SERVER['HTTP_COOKIE'] ?? ''));
    if ($incomingCookieHeader === '') {
        $sessionId = $_COOKIE['erdms_session'] ?? '';
        if ($sessionId === '') {
            return null;
        }
        $incomingCookieHeader = 'erdms_session=' . $sessionId;
    }

    $httpHeaders = [
        'Cookie: ' . $incomingCookieHeader,
        'Accept: application/json',
    ];

    // Apache vhost on localhost needs explicit Host header for /auth routes.
    $urlHost = (string) (parse_url($authMeUrl, PHP_URL_HOST) ?? '');
    if ($urlHost === 'localhost' || $urlHost === '127.0.0.1') {
        $httpHeaders[] = 'Host: ' . $authHostHeader;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($authMeUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => $httpHeaders,
        ]);

        $body = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false || $httpCode !== 200) {
            return null;
        }

        $decoded = json_decode($body, true);
        return normalize_auth_me_payload(is_array($decoded) ? $decoded : null);
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $httpHeaders) . "\r\n",
            'timeout' => 10,
            'ignore_errors' => true,
        ]
    ]);

    $body = @file_get_contents($authMeUrl, false, $context);
    if ($body === false) {
        return null;
    }

    $decoded = json_decode($body, true);
    return normalize_auth_me_payload(is_array($decoded) ? $decoded : null);
}

function pick_first_string(array $sources, array $keys): string
{
    foreach ($sources as $source) {
        if (!is_array($source)) {
            continue;
        }

        foreach ($keys as $key) {
            if (!array_key_exists($key, $source)) {
                continue;
            }

            $value = $source[$key];
            if (!is_scalar($value)) {
                continue;
            }

            $normalized = trim((string) $value);
            if ($normalized !== '') {
                return $normalized;
            }
        }
    }

    return '';
}

function split_profile_name_and_department(string $rawName): array
{
    $name = trim($rawName);
    if ($name === '' || !str_contains($name, '|')) {
        return [$name, ''];
    }

    $parts = array_values(array_filter(array_map('trim', explode('|', $name)), static fn($v) => $v !== ''));
    if (count($parts) < 2) {
        return [$name, ''];
    }

    $department = (string) array_pop($parts);
    $displayName = trim(implode(' | ', $parts));

    return [$displayName === '' ? $name : $displayName, $department];
}

function is_likely_department_value(string $value): bool
{
    $normalized = trim($value);
    if ($normalized === '') {
        return false;
    }

    // Cista zkratka organizace (napr. ZZSSK) neni oddeleni.
    if (preg_match('/^[A-Z0-9]{3,10}$/', $normalized) === 1) {
        return false;
    }

    return true;
}

function normalize_auth_me_payload(?array $decoded): ?array
{
    if (!is_array($decoded)) {
        return null;
    }

    $data = is_array($decoded['data'] ?? null) ? $decoded['data'] : [];

    $userDetail = [];
    if (is_array($data['userDetail'] ?? null)) {
        $userDetail = $data['userDetail'];
    } elseif (is_array($decoded['userDetail'] ?? null)) {
        $userDetail = $decoded['userDetail'];
    }

    $entraData = [];
    if (is_array($userDetail['entraData'] ?? null)) {
        $entraData = $userDetail['entraData'];
    } elseif (is_array($data['entraData'] ?? null)) {
        $entraData = $data['entraData'];
    } elseif (is_array($decoded['entraData'] ?? null)) {
        $entraData = $decoded['entraData'];
    }

    $sources = [$decoded, $data, $userDetail, $entraData];

    $entraId = pick_first_string($sources, ['entra_id', 'oid', 'id', 'objectId']);
    if ($entraId === '') {
        // Pokud auth API nevrátí identitu, bereme to jako nepřihlášeného,
        // ne jako interní chybu backendu burzy.
        return null;
    }

    $upn = pick_first_string($sources, ['upn', 'userPrincipalName', 'preferred_username', 'user_principal_name']);
    $email = pick_first_string($sources, ['email', 'mail']);
    if ($email === '') {
        $email = $upn;
    }

    $username = pick_first_string($sources, ['username', 'samAccountName', 'sAMAccountName']);
    if ($username === '' && $upn !== '' && str_contains($upn, '@')) {
        $username = explode('@', $upn)[0];
    }
    if ($username === '' && $email !== '' && str_contains($email, '@')) {
        $username = explode('@', $email)[0];
    }

    $displayName = pick_first_string($sources, ['displayName', 'name', 'display_name']);
    if ($displayName === '') {
        $displayName = $username;
    }

    $jmeno = pick_first_string($sources, ['jmeno', 'givenName', 'given_name']);
    $prijmeni = pick_first_string($sources, ['prijmeni', 'surname', 'familyName']);
    $department = pick_first_string($sources, ['department', 'oddeleni', 'departmentName']);
    $jobTitle = pick_first_string($sources, ['jobTitle', 'job_title', 'title']);
    $titleBefore = pick_first_string($sources, ['titleBefore', 'title_before', 'academicTitleBefore', 'titulPred', 'titul_pred']);
    $titleAfter = pick_first_string($sources, ['titleAfter', 'title_after', 'academicTitleAfter', 'titulZa', 'titul_za']);

    if ($department === '') {
        [$normalizedDisplayName, $derivedDepartment] = split_profile_name_and_department($displayName);
        if (is_likely_department_value($derivedDepartment)) {
            $displayName = $normalizedDisplayName;
            $department = $derivedDepartment;
        }
    }

    $normalizedEntraData = !empty($entraData)
        ? $entraData
        : (!empty($userDetail)
            ? $userDetail
            : (!empty($data)
                ? $data
                : $decoded));

    return [
        'entra_id' => $entraId,
        'upn' => $upn,
        'email' => $email,
        'username' => $username,
        'displayName' => $displayName,
        'jmeno' => $jmeno,
        'prijmeni' => $prijmeni,
        'department' => $department,
        'jobTitle' => $jobTitle,
        'titleBefore' => $titleBefore,
        'titleAfter' => $titleAfter,
        'entraData' => $normalizedEntraData,
    ];
}

function db_connect(): ?PDO
{
    $host = getenv('BURZA_DB_HOST') ?: '';
    $port = getenv('BURZA_DB_PORT') ?: '3306';
    $dbName = getenv('BURZA_DB_NAME') ?: '';
    $user = getenv('BURZA_DB_USER') ?: '';
    $password = getenv('BURZA_DB_PASSWORD') ?: '';

    if ($host === '' || $dbName === '' || $user === '') {
        return null;
    }

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $dbName);
    return new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function sync_local_user(PDO $pdo, array $authUser): void
{
    $entraId = trim((string) ($authUser['entra_id'] ?? ''));
    if ($entraId === '') {
        throw new RuntimeException('Missing entra_id in auth user payload.');
    }

    $email = trim((string) ($authUser['email'] ?? ''));
    $upn = trim((string) ($authUser['upn'] ?? $email));
    $username = trim((string) ($authUser['username'] ?? ''));
    if ($username === '' && $email !== '' && str_contains($email, '@')) {
        $username = explode('@', $email)[0];
    }

    $entraData = is_array($authUser['entraData'] ?? null) ? $authUser['entraData'] : [];

    $displayName = trim((string) ($authUser['displayName'] ?? $authUser['name'] ?? $entraData['displayName'] ?? $username));
    $givenName = trim((string) ($authUser['jmeno'] ?? $entraData['givenName'] ?? ''));
    $surname = trim((string) ($authUser['prijmeni'] ?? $entraData['surname'] ?? ''));
    $phone = trim((string) ($authUser['phone'] ?? $entraData['mobilePhone'] ?? $entraData['telephoneNumber'] ?? ''));
    $titleBefore = trim((string) ($authUser['titleBefore'] ?? $entraData['titleBefore'] ?? $entraData['academicTitleBefore'] ?? ''));
    $titleAfter = trim((string) ($authUser['titleAfter'] ?? $entraData['titleAfter'] ?? $entraData['academicTitleAfter'] ?? ''));
    $department = trim((string) ($authUser['department'] ?? $entraData['department'] ?? ''));
    if (!is_likely_department_value($department)) {
        $department = '';
    }
    $jobTitle = trim((string) ($authUser['jobTitle'] ?? $entraData['jobTitle'] ?? ''));

    $entraDataJson = !empty($entraData)
        ? json_encode($entraData, JSON_UNESCAPED_UNICODE)
        : null;

    $newUserActive = default_new_entra_users_active();
    $newUserAccessStatus = $newUserActive === 1 ? 'approved' : 'pending';

    $sql = "
        INSERT INTO burza_sluzby_users
            (
                entra_id,
                username,
                user_principal_name,
                email,
                phone,
                display_name,
                title_before,
                title_after,
                given_name,
                surname,
                department,
                job_title,
                role,
                access_status,
                local_login_enabled,
                local_login_username,
                local_password_hash,
                entra_data,
                permissions_json,
                aktivni,
                last_login_at,
                created_at,
                updated_at
            )
        VALUES
            (
                :entra_id,
                :username,
                :upn,
                :email,
                :phone,
                :display_name,
                :title_before,
                :title_after,
                :given_name,
                :surname,
                :department,
                :job_title,
                'user',
                :access_status_insert,
                0,
                NULL,
                NULL,
                :entra_data,
                '[]',
                :aktivni_insert,
                NOW(),
                NOW(),
                NOW()
            )
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            user_principal_name = VALUES(user_principal_name),
            email = VALUES(email),
            phone = COALESCE(NULLIF(VALUES(phone), ''), phone),
            display_name = COALESCE(NULLIF(VALUES(display_name), ''), display_name),
            title_before = COALESCE(NULLIF(VALUES(title_before), ''), title_before),
            title_after = COALESCE(NULLIF(VALUES(title_after), ''), title_after),
            given_name = COALESCE(NULLIF(VALUES(given_name), ''), given_name),
            surname = COALESCE(NULLIF(VALUES(surname), ''), surname),
            department = COALESCE(NULLIF(VALUES(department), ''), department),
            job_title = COALESCE(NULLIF(VALUES(job_title), ''), job_title),
            entra_data = VALUES(entra_data),
            last_login_at = NOW(),
            updated_at = NOW()
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':entra_id' => $entraId,
        ':username' => $username,
        ':upn' => $upn,
        ':email' => $email,
        ':phone' => ($phone === '' ? null : $phone),
        ':display_name' => $displayName,
        ':title_before' => ($titleBefore === '' ? null : $titleBefore),
        ':title_after' => ($titleAfter === '' ? null : $titleAfter),
        ':given_name' => ($givenName === '' ? null : $givenName),
        ':surname' => ($surname === '' ? null : $surname),
        ':department' => ($department === '' ? null : $department),
        ':job_title' => ($jobTitle === '' ? null : $jobTitle),
        ':aktivni_insert' => $newUserActive,
        ':access_status_insert' => $newUserAccessStatus,
        ':entra_data' => $entraDataJson,
    ]);
}

function default_new_entra_users_active(): int
{
    $raw = strtolower(trim((string) (getenv('BURZA_NEW_ENTRA_USERS_ACTIVE') ?: '0')));
    return in_array($raw, ['1', 'true', 'yes', 'on'], true) ? 1 : 0;
}

function local_auth_enabled(): bool
{
    $value = strtolower(trim((string) (getenv('BURZA_LOCAL_AUTH_ENABLED') ?: '0')));

    return in_array($value, ['1', 'true', 'yes', 'on'], true);
}

function ensure_local_session_started(): void
{
    if (!local_auth_enabled()) {
        throw new ApiException('Local authentication is disabled.', 403, 'local_auth_disabled');
    }

    if (session_status() === PHP_SESSION_NONE) {
        configure_local_session_storage();
        session_name('burza_local_auth');
        session_start();
    }
}

function configure_local_session_storage(): void
{
    $configuredPath = trim((string) (getenv('BURZA_SESSION_SAVE_PATH') ?: ''));
    $sessionPath = $configuredPath !== '' ? $configuredPath : (__DIR__ . '/.sessions');

    if (!is_dir($sessionPath)) {
        @mkdir($sessionPath, 0775, true);
    }

    if (is_dir($sessionPath) && is_writable($sessionPath)) {
        ini_set('session.save_handler', 'files');
        ini_set('session.save_path', $sessionPath);
    }
}

function fetch_local_auth_user(PDO $pdo): ?array
{
    if (!local_auth_enabled()) {
        return null;
    }

    ensure_local_session_started();

    $userId = (int) ($_SESSION['burza_local_user_id'] ?? 0);
    if ($userId <= 0) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM burza_sluzby_users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $row = $stmt->fetch();

    return is_array($row) ? $row : null;
}

function fetch_local_user_by_username(PDO $pdo, string $username): ?array
{
    $stmt = $pdo->prepare(
        'SELECT *
         FROM burza_sluzby_users
         WHERE local_login_enabled = 1
           AND (
               local_login_username = :username_exact
               OR (local_login_username IS NULL AND username = :username_fallback)
           )
         LIMIT 1'
    );
    $stmt->execute([
        ':username_exact' => $username,
        ':username_fallback' => $username,
    ]);
    $row = $stmt->fetch();

    return is_array($row) ? $row : null;
}

function handle_local_login(PDO $pdo): void
{
    ensure_local_session_started();

    $payload = read_json_input();
    $username = trim((string) ($payload['username'] ?? ''));
    $password = (string) ($payload['password'] ?? '');

    if ($username === '' || $password === '') {
        throw new ApiException('Username a heslo jsou povinné.', 400, 'missing_credentials');
    }

    $localUser = fetch_local_user_by_username($pdo, $username);
    if ($localUser === null) {
        throw new ApiException('Neplatné přihlašovací údaje.', 401, 'invalid_credentials');
    }

    $passwordHash = (string) ($localUser['local_password_hash'] ?? '');
    if ($passwordHash === '' || !password_verify($password, $passwordHash)) {
        throw new ApiException('Neplatné přihlašovací údaje.', 401, 'invalid_credentials');
    }

    if ((int) ($localUser['aktivni'] ?? 0) !== 1) {
        throw new ApiException('Uživatel není aktivní.', 403, 'user_inactive');
    }

    session_regenerate_id(true);
    $_SESSION['burza_local_user_id'] = (int) $localUser['id'];
    $_SESSION['burza_local_username'] = (string) $localUser['username'];

    $stmt = $pdo->prepare('UPDATE burza_sluzby_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = :id');
    $stmt->execute([':id' => (int) $localUser['id']]);

    send_json([
        'status' => 'ok',
        'auth_source' => 'local',
        'data' => [
            'auth_source' => 'local',
            'local_user' => $localUser,
            'effective_role' => normalize_effective_role($localUser),
        ],
    ]);
}

function handle_local_logout(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        configure_local_session_storage();
        session_name('burza_local_auth');
        session_start();
    }

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }

    session_destroy();

    send_json([
        'status' => 'ok',
        'logoutUrl' => null,
    ]);
}

function find_local_user(PDO $pdo, array $authUser): ?array
{
    $entraId = trim((string) ($authUser['entra_id'] ?? ''));
    if ($entraId === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM burza_sluzby_users WHERE entra_id = :entra_id LIMIT 1');
    $stmt->execute([':entra_id' => $entraId]);
    $row = $stmt->fetch();

    return is_array($row) ? $row : null;
}

final class ApiException extends RuntimeException
{
    public int $httpStatus;
    public string $errorCode;

    public function __construct(string $message, int $httpStatus = 400, string $errorCode = 'api_error')
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
        $this->errorCode = $errorCode;
    }
}

function load_local_env(string $envFile): void
{
    if (!is_file($envFile) || !is_readable($envFile)) {
        return;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $eqPos = strpos($line, '=');
        if ($eqPos === false) {
            continue;
        }

        $key = trim(substr($line, 0, $eqPos));
        $value = trim(substr($line, $eqPos + 1));
        if ($key === '') {
            continue;
        }

        $value = trim($value, "\"'");

        // Keep values from process env if already injected by server config.
        if (getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}
