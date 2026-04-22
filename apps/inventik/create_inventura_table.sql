-- Tabulka pro naskenovaný a upravený majetek při inventuře
CREATE TABLE IF NOT EXISTS inventura_majetek (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Základní data z původního majetku
  cislo_majetku VARCHAR(50) NOT NULL,
  nazev TEXT,
  datum_zarazeni DATE,
  cena_mj_num DECIMAL(10,2),
  
  -- Číselníkové vazby (upravitelné)
  cinv INT,
  budt INT,
  mist INT,
  
  -- Volitelné doplňkové údaje
  poznamka TEXT,
  ip_adresa VARCHAR(50),
  
  -- JSON pro budoucí rozšíření (sériové číslo, další metadata)
  metadata TEXT,
  
  -- Tracking uživatele a změn
  jmeno_uzivatele VARCHAR(100) NOT NULL,
  datum_vytvoreni TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  datum_modifikace TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexy pro rychlejší dotazy
  INDEX idx_cislo (cislo_majetku),
  INDEX idx_uzivatel (jmeno_uzivatele),
  INDEX idx_datum (datum_vytvoreni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
