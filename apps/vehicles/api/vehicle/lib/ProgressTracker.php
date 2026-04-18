<?php
/**
 * ProgressTracker - sledování průběhu dlouhých operací
 * 
 * Používá soubory v /tmp/ pro ukládání progress dat mezi requesty
 */
class ProgressTracker
{
    private string $progressId;
    private string $filePath;

    public function __construct(string $progressId)
    {
        $this->progressId = $progressId;
        $this->filePath = sys_get_temp_dir() . '/vehicles_progress_' . $progressId . '.json';
    }

    /**
     * Inicializovat progress tracking
     */
    public function init(int $total): void
    {
        $data = [
            'total' => $total,
            'processed' => 0,
            'synced' => 0,
            'skipped' => 0,
            'started' => time(),
            'status' => 'running'
        ];
        file_put_contents($this->filePath, json_encode($data));
    }

    /**
     * Aktualizovat progress
     */
    public function update(int $processed, int $synced, int $skipped): void
    {
        $data = $this->read();
        if ($data) {
            $data['processed'] = $processed;
            $data['synced'] = $synced;
            $data['skipped'] = $skipped;
            $data['updated'] = time();
            file_put_contents($this->filePath, json_encode($data));
        }
    }

    /**
     * Označit jako dokončené
     */
    public function complete(string $message = ''): void
    {
        $data = $this->read();
        if ($data) {
            $data['status'] = 'completed';
            $data['completed'] = time();
            $data['message'] = $message;
            file_put_contents($this->filePath, json_encode($data));
        }
    }

    /**
     * Označit jako chybné
     */
    public function error(string $message): void
    {
        $data = $this->read();
        if ($data) {
            $data['status'] = 'error';
            $data['error'] = $message;
            $data['completed'] = time();
            file_put_contents($this->filePath, json_encode($data));
        }
    }

    /**
     * Přečíst aktuální stav
     */
    public function read(): ?array
    {
        if (!file_exists($this->filePath)) {
            return null;
        }
        $json = file_get_contents($this->filePath);
        return json_decode($json, true);
    }

    /**
     * Smazat progress soubor (cleanup)
     */
    public function cleanup(): void
    {
        if (file_exists($this->filePath)) {
            unlink($this->filePath);
        }
    }

    /**
     * Získat progress ID
     */
    public function getProgressId(): string
    {
        return $this->progressId;
    }

    /**
     * Vygenerovat nové progress ID
     */
    public static function generateId(): string
    {
        return uniqid('sync_', true);
    }
}
