export function lookupLabel(lookupByCategory, category, code) {
  if (!code) return '';
  const list = Array.isArray(lookupByCategory?.[category]) ? lookupByCategory[category] : [];
  const found = list.find((it) => it && it.code === code);
  return found?.item_name || code;
}

export function formatDateCs(value) {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('cs-CZ');
  } catch {
    return String(value);
  }
}

export function formatMoneyCs(amount, currency = 'CZK') {
  if (amount === null || amount === undefined || amount === '') return '-';
  const num = Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return `${num.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
