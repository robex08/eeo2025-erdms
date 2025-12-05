/**
 * TypeScript type definitions pro číselníky a šablony
 *
 * @author Frontend Team
 * @date 2025-10-19
 * @version 1.0
 */

// =============================================================================
// LOKALITY (Pobočky)
// =============================================================================

/**
 * @typedef {Object} Lokalita
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název lokality
 * @property {string} typ - Typ lokality
 * @property {number|null} parent_id - ID nadřazené lokality
 * @property {boolean} aktivni - Je lokalita aktivní?
 * @property {string} dt_vytvoreni - Datum vytvoření (ISO 8601)
 */

// =============================================================================
// POZICE (Pracovní pozice)
// =============================================================================

/**
 * @typedef {Object} Pozice
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev_pozice - Název pracovní pozice
 * @property {number|null} parent_id - ID nadřazené pozice
 * @property {boolean} aktivni - Je pozice aktivní?
 * @property {string} dt_vytvoreni - Datum vytvoření (ISO 8601)
 */

// =============================================================================
// ÚSEKY (Organizační útvary)
// =============================================================================

/**
 * @typedef {Object} Usek
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název úseku
 * @property {string} zkratka - Zkratka úseku
 * @property {number|null} parent_id - ID nadřazeného úseku
 * @property {boolean} aktivni - Je úsek aktivní?
 * @property {string} dt_vytvoreni - Datum vytvoření (ISO 8601)
 */

/**
 * @typedef {Object} UsekHierarchy
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název úseku
 * @property {string} zkratka - Zkratka úseku
 * @property {number|null} parent_id - ID nadřazeného úseku
 * @property {boolean} aktivni - Je úsek aktivní?
 * @property {UsekHierarchy[]} children - Podřízené úseky
 */

// =============================================================================
// ORGANIZACE (Vizitka organizace)
// =============================================================================

/**
 * @typedef {Object} Organizace
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název organizace
 * @property {string} ico - IČO
 * @property {string} dic - DIČ
 * @property {string} ulice - Ulice
 * @property {string} mesto - Město
 * @property {string} psc - PSČ
 * @property {string} telefon - Telefon
 * @property {string} email - E-mail
 * @property {string} web - Webová stránka
 * @property {string|null} logo_url - URL loga
 * @property {boolean} aktivni - Je organizace aktivní?
 */

// =============================================================================
// DODAVATELÉ
// =============================================================================

/**
 * @typedef {Object} Dodavatel
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název dodavatele
 * @property {string} ico - IČO
 * @property {string} dic - DIČ
 * @property {string} adresa - Adresa
 * @property {string|null} kontakt_osoba - Kontaktní osoba
 * @property {string|null} kontakt_email - Kontaktní e-mail
 * @property {string|null} kontakt_telefon - Kontaktní telefon
 * @property {boolean} aktivni - Je dodavatel aktivní?
 * @property {string} dt_vytvoreni - Datum vytvoření (ISO 8601)
 */

// =============================================================================
// STAVY (Read-only)
// =============================================================================

/**
 * @typedef {Object} Stav
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název stavu
 * @property {string} popis - Popis stavu
 * @property {string} barva - Barva (hex)
 * @property {number} poradi - Pořadí
 * @property {boolean} aktivni - Je stav aktivní?
 */

// =============================================================================
// ROLE (Read-only)
// =============================================================================

/**
 * @typedef {Object} Role
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název role
 * @property {string} popis - Popis role
 * @property {boolean} aktivni - Je role aktivní?
 */

// =============================================================================
// PRÁVA (Read-only)
// =============================================================================

/**
 * @typedef {Object} Pravo
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název práva
 * @property {string} kod - Kód práva
 * @property {string} popis - Popis práva
 * @property {boolean} aktivni - Je právo aktivní?
 */

// =============================================================================
// DOCX ŠABLONY
// =============================================================================

/**
 * @typedef {Object} DocxMapovani
 * @property {string} [docvariableName] - Objekt s mapováním pro DocVariable
 * @property {string} [docvariableName.db_field] - Databázové pole
 * @property {string} [docvariableName.db_expression] - Databázový výraz
 * @property {string} [docvariableName.format] - Formát hodnoty
 * @property {string} docvariableName.default - Výchozí hodnota
 */

/**
 * @typedef {Object} DocxSablonaVytvoril
 * @property {number} id - ID uživatele
 * @property {string} jmeno - Jméno uživatele
 * @property {string} email - E-mail uživatele
 */

/**
 * @typedef {Object} DocxSablona
 * @property {number} id - Unikátní identifikátor
 * @property {string} nazev - Název šablony
 * @property {string|null} popis - Popis šablony
 * @property {string|null} typ_dokumentu - Typ dokumentu (objednavka, smlouva, atd.)
 * @property {string} nazev_souboru - Původní název souboru
 * @property {string} nazev_souboru_ulozeny - Název souboru na disku
 * @property {string} cesta_souboru - Relativní cesta k souboru
 * @property {number} velikost_souboru - Velikost souboru v bajtech
 * @property {string} md5_hash - MD5 hash souboru
 * @property {DocxMapovani|null} mapovani_json - JSON mapování DocVariables
 * @property {string|null} platnost_od - Platnost od (YYYY-MM-DD)
 * @property {string|null} platnost_do - Platnost do (YYYY-MM-DD)
 * @property {boolean} aktivni - Je šablona aktivní?
 * @property {string[]|null} usek_omezeni - Omezení na úseky (pole ID)
 * @property {string} verze - Verze šablony
 * @property {string|null} poznamka - Poznámka
 * @property {string} dt_vytvoreni - Datum vytvoření (ISO 8601)
 * @property {string|null} dt_aktualizace - Datum poslední aktualizace (ISO 8601)
 * @property {DocxSablonaVytvoril|null} vytvoril - Uživatel, který vytvořil
 * @property {DocxSablonaVytvoril|null} aktualizoval - Uživatel, který aktualizoval
 * @property {boolean} ma_mapovani - Má šablona definované mapování?
 */

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * @typedef {Object} ApiResponse
 * @property {string} status - Status odpovědi ("ok" nebo "error")
 * @property {any} [data] - Data odpovědi
 * @property {string} [message] - Zpráva
 */

/**
 * @typedef {Object} DocxApiResponse
 * @property {boolean} success - Úspěch operace
 * @property {any} [data] - Data odpovědi
 * @property {string} [message] - Zpráva
 * @property {string} [error] - Chybová zpráva
 */

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * @typedef {Object} DocxSablonyFilter
 * @property {0|1} [aktivni] - Filtr pro aktivní šablony
 * @property {string} [typ_dokumentu] - Filtr pro typ dokumentu
 * @property {0|1} [pouze_platne] - Pouze platné šablony (v platnosti)
 * @property {string} [search] - Fulltextové vyhledávání
 */

// =============================================================================
// EXPORT (pro JSDoc usage)
// =============================================================================

export default {};
