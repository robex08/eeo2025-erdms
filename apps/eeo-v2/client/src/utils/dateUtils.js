/**
 * Date/Time Utility Functions pro eRDMS
 * 
 * ⚠️ DŮLEŽITÉ: Všechny funkce vrací LOKÁLNÍ ČESKÉ datum/čas!
 * MySQL DATE a DATETIME pole NEMAJÍ timezone info, proto ukládáme vždy lokální čas.
 */

/**
 * Získá aktuální lokální české datum ve formátu YYYY-MM-DD
 * 
 * @returns {string} Datum ve formátu 'YYYY-MM-DD' (např. '2026-01-09')
 * 
 * @example
 * // V 0:30 CET (9.1.2026)
 * getCurrentLocalDate() // '2026-01-09' ✅
 * 
 * // ❌ NEPOUŽÍVAT:
 * new Date().toISOString().split('T')[0] // '2026-01-08' (UTC!)
 */
export const getCurrentLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Získá aktuální lokální český čas ve formátu YYYY-MM-DD HH:MM:SS
 * 
 * @returns {string} Datetime ve formátu 'YYYY-MM-DD HH:MM:SS' (např. '2026-01-09 00:30:15')
 * 
 * @example
 * // V 0:30:15 CET (9.1.2026)
 * getCurrentLocalDateTime() // '2026-01-09 00:30:15' ✅
 * 
 * // ❌ NEPOUŽÍVAT:
 * new Date().toISOString() // '2026-01-08T23:30:15.000Z' (UTC!)
 */
export const getCurrentLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Formátuje Date objekt na lokální datum ve formátu YYYY-MM-DD
 * 
 * @param {Date|string|number} date - Date objekt, ISO string nebo timestamp
 * @returns {string} Datum ve formátu 'YYYY-MM-DD' nebo prázdný string pokud nevalidní
 * 
 * @example
 * formatLocalDate(new Date()) // '2026-01-09'
 * formatLocalDate('2026-01-09T12:30:00Z') // '2026-01-09' (konvertuje z UTC)
 * formatLocalDate(null) // ''
 */
export const formatLocalDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formátuje Date objekt na lokální datetime ve formátu YYYY-MM-DD HH:MM:SS
 * 
 * @param {Date|string|number} date - Date objekt, ISO string nebo timestamp
 * @returns {string} Datetime ve formátu 'YYYY-MM-DD HH:MM:SS' nebo prázdný string
 * 
 * @example
 * formatLocalDateTime(new Date()) // '2026-01-09 00:30:15'
 * formatLocalDateTime('2026-01-09T12:30:00Z') // '2026-01-09 13:30:00' (CET +1)
 */
export const formatLocalDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Formátuje datum pro input type="date" (YYYY-MM-DD)
 * Alias pro formatLocalDate pro kompatibilitu se starým kódem
 * 
 * @param {Date|string|number} date - Date objekt, ISO string nebo timestamp
 * @returns {string} Datum ve formátu 'YYYY-MM-DD'
 */
export const formatDateForPicker = formatLocalDate;

/**
 * Parsuje datum z různých formátů a vrací Date objekt
 * 
 * @param {string|Date|number} value - Datum v různých formátech
 * @returns {Date|null} Date objekt nebo null pokud nelze parsovat
 */
export const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Zjistí, zda je datum validní
 * 
 * @param {string|Date|number} value - Hodnota k ověření
 * @returns {boolean} True pokud je validní datum
 */
export const isValidDate = (value) => {
  const d = parseDate(value);
  return d !== null;
};

/**
 * 📚 DOKUMENTACE: Timezone Best Practices
 * 
 * ## ✅ SPRÁVNĚ:
 * ```javascript
 * import { getCurrentLocalDate, getCurrentLocalDateTime } from '@/utils/dateUtils';
 * 
 * // Pro DATE pole v DB
 * fa_datum_vystaveni: getCurrentLocalDate() // '2026-01-09'
 * 
 * // Pro DATETIME pole v DB
 * dt_vytvoreni: getCurrentLocalDateTime() // '2026-01-09 00:30:15'
 * ```
 * 
 * ## ❌ ŠPATNĚ:
 * ```javascript
 * // UTC datum místo lokálního!
 * fa_datum_vystaveni: new Date().toISOString().split('T')[0]
 * // V 0:30 CET vrátí '2026-01-08' ❌
 * 
 * // UTC datetime
 * dt_vytvoreni: new Date().toISOString()
 * // Vrátí '2026-01-08T23:30:15.000Z' ❌
 * ```
 * 
 * ## 🎯 PROČ?
 * 
 * MySQL `DATE` a `DATETIME` pole **NEMAJÍ timezone informaci**!
 * Když uložíš `'2026-01-09 00:30:00'`, MySQL **neví** jestli je to:
 * - České datum (CET/CEST)
 * - UTC datum
 * - Americké datum (PST)
 * 
 * Proto **VŽDY** ukládáme **LOKÁLNÍ ČESKÝ ČAS** do databáze.
 * 
 * ## ⚠️ PROBLÉM s toISOString():
 * 
 * ```javascript
 * // Situace: Jsme v ČR, je 0:30 ráno dne 9.1.2026 (CET = UTC+1)
 * 
 * new Date().toISOString()  // '2026-01-08T23:30:00.000Z'
 * // ❌ Vrací UTC čas, což je stále včera v noci!
 * 
 * new Date().toISOString().split('T')[0]  // '2026-01-08'
 * // ❌ Vrací VČEREJŠÍ datum!
 * ```
 * 
 * **Off-by-one error** nastává každou noc mezi 00:00 - 01:00 CET (zimní čas)
 * nebo 00:00 - 02:00 CEST (letní čas)!
 * 
 * ## 📊 Praktický příklad timezone problému:
 * 
 * | Lokální čas ČR | UTC čas | toISOString().split('T')[0] | getCurrentLocalDate() |
 * |----------------|---------|-----------------------------|-----------------------|
 * | 9.1.2026 00:30 CET | 8.1.2026 23:30 UTC | '2026-01-08' ❌ | '2026-01-09' ✅ |
 * | 9.1.2026 02:00 CET | 9.1.2026 01:00 UTC | '2026-01-09' ✅ | '2026-01-09' ✅ |
 * 
 * To byl přesně důvod, proč se nezobrazovaly objednávky O-0063, O-0064, O-0065!
 */
