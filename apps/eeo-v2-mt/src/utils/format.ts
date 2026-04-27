/**
 * Utility funkce pro formátování
 */

/**
 * Formátovat částku v Kč
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + ' Kč';
};

/**
 * Formátovat datum
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

/**
 * Formátovat datum a čas
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Zkrátit text
 */
export const truncate = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Získat iniciály ze jména
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return `${first}${last}` || '?';
};

/**
 * Parse LP kódů z formátu "LP-XXX|Název;;LP-YYY|Název2"
 */
export const parseLPKody = (lpString?: string): Array<{ kod: string; nazev: string }> => {
  if (!lpString) return [];
  
  try {
    return lpString.split(';;').map((item) => {
      const [kod, nazev] = item.split('|');
      return { kod: kod || '', nazev: nazev || '' };
    });
  } catch {
    return [];
  }
};
