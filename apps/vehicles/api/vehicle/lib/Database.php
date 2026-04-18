<?php
/**
 * Database - PDO wrapper pro vehicles API
 * 
 * Singleton pattern pro jedno spojení na request
 */
class Database
{
    private static ?PDO $instance = null;

    /**
     * Získat PDO instanci (singleton)
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $config = Config::getDbConfig();

            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=utf8mb4',
                $config['host'],
                $config['database']
            );

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_czech_ci, time_zone = '+02:00'",
            ];

            try {
                self::$instance = new PDO($dsn, $config['user'], $config['password'], $options);
            } catch (PDOException $e) {
                error_log("Vehicles API DB Error: " . $e->getMessage());
                throw new RuntimeException('Chyba připojení k databázi');
            }
        }

        return self::$instance;
    }

    /**
     * Uzavřít spojení
     */
    public static function close(): void
    {
        self::$instance = null;
    }
}
