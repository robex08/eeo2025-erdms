<?php

declare(strict_types=1);

final class UserRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, username, password_hash, role_code, auth_source, entra_id, is_active, must_change_password
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
            'SELECT id, username, role_code, auth_source, entra_id, is_active, must_change_password
             FROM vehicles_users
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findAuthorizedForEntra(string $entraId, string $username, string $email): ?array
    {
        $conditions = [];
        $params = [];

        if ($entraId !== '') {
            $conditions[] = 'entra_id = :entra_id';
            $params['entra_id'] = $entraId;
        }

        if ($username !== '') {
            $conditions[] = 'LOWER(username) = LOWER(:username)';
            $params['username'] = $username;
        }

        if ($email !== '') {
            $conditions[] = 'LOWER(email) = LOWER(:email)';
            $params['email'] = $email;
        }

        if ($conditions === []) {
            return null;
        }

        $sql = 'SELECT id, username, password_hash, role_code, auth_source, entra_id, is_active, must_change_password
                FROM vehicles_users
                WHERE is_active = 1
                  AND (' . implode(' OR ', $conditions) . ')
                LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $user = $stmt->fetch();

        return $user ?: null;
    }
}
