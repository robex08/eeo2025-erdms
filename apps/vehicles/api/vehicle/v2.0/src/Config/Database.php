<?php

declare(strict_types=1);

final class Database
{
    private static ?PDO $eeoConnection = null;

    public static function connect(): PDO
    {
        $host = Env::get('VEHICLES_V2_DB_HOST', 'localhost');
        $port = Env::get('VEHICLES_V2_DB_PORT', '3306');
        $name = Env::get('VEHICLES_V2_DB_NAME', 'vehicles-zzs-dev');
        $user = Env::get('VEHICLES_V2_DB_USER', 'root');
        $pass = Env::get('VEHICLES_V2_DB_PASS', '');

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_czech_ci",
        ]);
    }

    public static function connectEeo(): PDO
    {
        if (self::$eeoConnection === null) {
            $host = Env::get('EEO_DB_HOST', 'localhost');
            $port = Env::get('EEO_DB_PORT', '3306');
            $name = Env::get('EEO_DB_NAME', 'eeo2025');
            $user = Env::get('EEO_DB_USER', 'root');
            $pass = Env::get('EEO_DB_PASS', '');

            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

            self::$eeoConnection = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_czech_ci",
            ]);
        }

        return self::$eeoConnection;
    }
}
