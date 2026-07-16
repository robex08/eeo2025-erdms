<?php

declare(strict_types=1);

final class SyncJobRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function createJob(string $kind, string $status, string $message): int
    {
        $message = $this->normalizeMessage($message);

        $stmt = $this->pdo->prepare(
            'INSERT INTO vehicles_sync_jobs (job_kind, status, message, started_at, updated_at)
             VALUES (:job_kind, :status, :message, NOW(), NOW())'
        );

        $stmt->execute([
            'job_kind' => $kind,
            'status' => $status,
            'message' => $message,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function completeJob(int $jobId, string $status, string $message): void
    {
        $message = $this->normalizeMessage($message);

        $stmt = $this->pdo->prepare(
            'UPDATE vehicles_sync_jobs
             SET status = :status, message = :message, finished_at = NOW(), updated_at = NOW()
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $jobId,
            'status' => $status,
            'message' => $message,
        ]);
    }

    public function findById(int $jobId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, job_kind, status, message, started_at, finished_at, updated_at
             FROM vehicles_sync_jobs
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $jobId]);

        $job = $stmt->fetch();
        return $job ?: null;
    }

    private function normalizeMessage(string $message): string
    {
        $message = trim($message);
        if ($message === '') {
            return '';
        }

        if (function_exists('mb_strcut')) {
            return mb_strcut($message, 0, 255, 'UTF-8');
        }

        return substr($message, 0, 255);
    }
}
