/**
 * Překládá anglické error messages do češtiny
 * @param {string} errorMessage - Původní error message
 * @returns {string} - Přeložený error message
 */
export function translateErrorMessage(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return errorMessage || 'Neznámá chyba';
  }

  // Překládáme timeout chyby
  if (errorMessage.includes('timeout') && errorMessage.includes('exceeded')) {
    const match = errorMessage.match(/timeout of (\d+)ms exceeded/);
    if (match) {
      const timeoutMs = match[1];
      const timeoutSec = Math.round(timeoutMs / 1000);
      return `Překročen časový limit ${timeoutSec}s - server neodpověděl včas`;
    } else {
      return 'Překročen časový limit - server neodpověděl včas';
    }
  }

  // Překládáme další běžné axios/network chyby
  if (errorMessage.includes('Network Error')) {
    return 'Chyba sítě - zkontrolujte internetové připojení';
  }

  if (errorMessage.includes('Request failed with status code 500')) {
    return 'Chyba serveru (kód 500) - zkuste to znovu později';
  }

  if (errorMessage.includes('Request failed with status code 404')) {
    return 'Požadovaný zdroj nebyl nalezen (kód 404)';
  }

  if (errorMessage.includes('Request failed with status code 403')) {
    return 'Nemáte oprávnění k této operaci (kód 403)';
  }

  if (errorMessage.includes('Request failed with status code 401')) {
    return 'Neautorizovaný přístup - zkuste se znovu přihlásit (kód 401)';
  }

  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connection refused')) {
    return 'Nelze se připojit k serveru - server je pravděpodobně nedostupný';
  }

  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo ENOTFOUND')) {
    return 'Server nenalezen - zkontrolujte adresu serveru';
  }

  // Pokud není rozpoznaná chyba, vrať původní message
  return errorMessage;
}

/**
 * Zkrácená verze pro timeout chyby bez dodatečného textu
 * @param {string} errorMessage - Původní error message
 * @returns {string} - Přeložený error message (kratší verze)
 */
export function translateErrorMessageShort(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return errorMessage || 'Neznámá chyba';
  }

  // Překládáme timeout chyby
  if (errorMessage.includes('timeout') && errorMessage.includes('exceeded')) {
    const match = errorMessage.match(/timeout of (\d+)ms exceeded/);
    if (match) {
      const timeoutMs = match[1];
      const timeoutSec = Math.round(timeoutMs / 1000);
      return `Překročen časový limit ${timeoutSec}s`;
    } else {
      return 'Překročen časový limit';
    }
  }

  // Pro ostatní chyby použij plnou funkci
  return translateErrorMessage(errorMessage);
}