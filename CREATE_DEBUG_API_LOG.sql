-- Debug API Log Table
-- Pro zachycení PHP chyb z API endpointů

USE eeo2025;

CREATE TABLE IF NOT EXISTS debug_api_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    input_data TEXT,
    error_message TEXT,
    stack_trace TEXT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Test insert
INSERT INTO debug_api_log (endpoint, method, input_data) 
VALUES ('test-create', 'GET', 'Test při vytváření tabulky');

SELECT 'Debug tabulka vytvořena' AS status;
