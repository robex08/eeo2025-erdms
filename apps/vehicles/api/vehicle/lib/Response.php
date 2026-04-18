<?php
/**
 * Response - helper pro standardizované JSON odpovědi
 * 
 * Formát odpovědi:
 * {
 *   "status": "success|error",
 *   "data": mixed,
 *   "message": string,
 *   "count": int (volitelné)
 * }
 */
class Response
{
    /**
     * Odeslat úspěšnou odpověď
     * 
     * @param mixed $data Data k odeslání
     * @param string $message Zpráva
     * @param int $httpCode HTTP status kód
     * @param string $dataKey Název klíče pro data (default: 'data')
     */
    public static function success($data = null, string $message = 'OK', int $httpCode = 200, string $dataKey = 'data'): void
    {
        http_response_code($httpCode);
        $response = [
            'status' => 'success',
            'message' => $message,
            $dataKey => $data,
        ];

        if (is_array($data)) {
            $response['count'] = count($data);
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Odeslat chybovou odpověď
     */
    public static function error(string $message, int $httpCode = 400, $debug = null): void
    {
        http_response_code($httpCode);
        $response = [
            'status' => 'error',
            'message' => $message,
        ];

        if ($debug !== null && Config::isDebug()) {
            $response['debug'] = $debug;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Odeslat odpověď "metoda není povolena"
     */
    public static function methodNotAllowed(string $allowed = 'GET, POST'): void
    {
        header("Allow: $allowed");
        self::error("Metoda není povolena. Povolené: $allowed", 405);
    }
}
