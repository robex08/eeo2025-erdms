<?php
/**
 * Timezone Helper pro Order V2 API
 * Řeší problémy s časovými zónami mezi PHP a MySQL
 * 
 * Datum: 31. října 2025
 * Kompatibilita: PHP 5.6+, MySQL 5.5.43+
 */

class TimezoneHelper {
    
    /**
     * Získá aktuální čas v české časové zóně
     * Řeší problém s PHP UTC vs český čas
     * 
     * @param string $format Format datumu (default: 'Y-m-d H:i:s')
     * @return string Čas v české časové zóně
     */
    public static function getCzechDateTime($format = 'Y-m-d H:i:s') {
        // Nastavit českou časovou zónu
        $original_timezone = date_default_timezone_get();
        date_default_timezone_set('Europe/Prague');
        
        $czech_time = date($format);
        
        // Vrátit původní timezone
        date_default_timezone_set($original_timezone);
        
        return $czech_time;
    }
    
    /**
     * Získá aktuální čas pro timestamp v response (ISO 8601 s českou zónou)
     * 
     * @return string ISO 8601 timestamp s timezone offset
     */
    public static function getApiTimestamp() {
        $original_timezone = date_default_timezone_get();
        date_default_timezone_set('Europe/Prague');
        
        // ISO 8601 s timezone offset (+01:00 nebo +02:00)
        $timestamp = date('Y-m-d\TH:i:sP');
        
        date_default_timezone_set($original_timezone);
        
        return $timestamp;
    }
    
    /**
     * Nastaví MySQL session timezone na českou časovou zónu
     * Zajistí konzistenci mezi PHP a MySQL časy
     * 
     * @param PDO $db Database connection
     */
    public static function setMysqlTimezone($db) {
        try {
            // Nastaví MySQL session timezone na +01:00 (zimní čas) nebo +02:00 (letní čas)
            $original_timezone = date_default_timezone_get();
            date_default_timezone_set('Europe/Prague');
            
            $offset = date('P'); // Získá aktuální timezone offset (+01:00 nebo +02:00)
            
            date_default_timezone_set($original_timezone);
            
            $stmt = $db->prepare("SET time_zone = ?");
            $stmt->execute(array($offset));
            
        } catch (Exception $e) {
            // Nefatální chyba - pokračujeme bez nastavení timezone
            error_log("TimezoneHelper: Nelze nastavit MySQL timezone: " . $e->getMessage());
        }
    }
    
    /**
     * Bezpečné volání NOW() pro MySQL s fallback
     * 
     * @param PDO $db Database connection
     * @param string $fallback_format Format pro fallback PHP čas
     * @return string SQL fragment pro čas
     */
    public static function getMysqlNow($db = null, $fallback_format = 'Y-m-d H:i:s') {
        if ($db) {
            // Pokusit se nastavit timezone a použít NOW()
            self::setMysqlTimezone($db);
            return 'NOW()';
        } else {
            // Fallback - použít PHP s českou časovou zónou
            return "'" . self::getCzechDateTime($fallback_format) . "'";
        }
    }
    
    /**
     * Konvertuje datetime z UTC (který posílá FE) na Czech timezone
     * Podporuje různé formáty: ISO 8601, MySQL datetime, atd.
     * 
     * @param string|null $datetime_value Datetime z frontendu (UTC)
     * @return string|null Datetime v české timezone (Y-m-d H:i:s) nebo null
     */
    public static function convertUtcToCzech($datetime_value) {
        if (empty($datetime_value) || $datetime_value === null) {
            return null;
        }
        
        try {
            // PHP 5.6 kompatibilní konverze
            $utc_tz = new DateTimeZone('UTC');
            $prague_tz = new DateTimeZone('Europe/Prague');
            
            // Detekce formátu a parsování
            // 1. ISO 8601 s Z: "2025-11-14T18:50:57Z"
            if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $datetime_value)) {
                $dt = new DateTime($datetime_value, $utc_tz);
            }
            // 2. ISO 8601 s timezone: "2025-11-14T18:50:57+00:00"
            else if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/', $datetime_value)) {
                $dt = new DateTime($datetime_value); // Už obsahuje timezone
            }
            // 3. MySQL datetime formát: "2025-11-14 18:50:57" (předpokládáme UTC)
            else if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $datetime_value)) {
                $dt = new DateTime($datetime_value, $utc_tz);
            }
            // 4. Pouze datum: "2025-11-14"
            else if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $datetime_value)) {
                // Datum bez času - přidáme půlnoc v UTC
                $dt = new DateTime($datetime_value . ' 00:00:00', $utc_tz);
            }
            // 5. Jiný formát - zkusíme parsovat
            else {
                $dt = new DateTime($datetime_value, $utc_tz);
            }
            
            // Konvertuj na Prague timezone
            $dt->setTimezone($prague_tz);
            
            // Formátuj zpět jako MySQL datetime
            return $dt->format('Y-m-d H:i:s');
            
        } catch (Exception $e) {
            // Pokud konverze selže, vracíme původní hodnotu
            error_log("TimezoneHelper::convertUtcToCzech failed for '$datetime_value': " . $e->getMessage());
            return $datetime_value;
        }
    }
}