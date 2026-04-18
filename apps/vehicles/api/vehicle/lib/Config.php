<?php
/**
 * Config - načítání .env a správa konfigurace
 */
class Config
{
    private static bool $loaded = false;

    /**
     * Načte .env soubor a nastaví proměnné prostředí
     */
    public static function load(string $envPath = null): void
    {
        if (self::$loaded) {
            return;
        }

        $path = $envPath ?? __DIR__ . '/../.env';

        if (!file_exists($path)) {
            error_log("Vehicles API: .env soubor nenalezen: $path");
            throw new RuntimeException("Konfigurační soubor nenalezen");
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $name = trim($parts[0]);
            $value = trim($parts[1]);

            $_ENV[$name] = $value;
            putenv("$name=$value");
        }

        self::$loaded = true;
    }

    /**
     * Získat hodnotu z konfigurace
     */
    public static function get(string $key, $default = null)
    {
        return $_ENV[$key] ?? $default;
    }

    /**
     * Získat povinnou hodnotu z konfigurace
     */
    public static function getRequired(string $key)
    {
        $value = self::get($key);
        if ($value === null) {
            throw new RuntimeException("Chybí povinná konfigurační hodnota: $key");
        }
        return $value;
    }

    /**
     * Získat DB konfiguraci
     */
    public static function getDbConfig(): array
    {
        return [
            'host' => self::getRequired('DB_HOST'),
            'user' => self::getRequired('DB_USER'),
            'password' => self::getRequired('DB_PASSWORD'),
            'database' => self::getRequired('DB_NAME'),
        ];
    }

    /**
     * Získat WebDispečink credentials
     */
    public static function getWebDispecinkConfig(): array
    {
        return [
            'kodf' => self::getRequired('WEBDISPECINK_KODF'),
            'username' => self::getRequired('WEBDISPECINK_USERNAME'),
            'password' => self::getRequired('WEBDISPECINK_PASSWORD'),
        ];
    }

    /**
     * Je debug mód?
     */
    public static function isDebug(): bool
    {
        return strtolower(self::get('DEBUG', 'false')) === 'true';
    }
}
