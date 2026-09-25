/**
 * Kontrola překročení fakturace objednávky (pro povinnou poznámku k věcné správnosti).
 *
 * Fakturace je překročena, pokud součet všech faktur objednávky (bez STORNO / neaktivních)
 * převyšuje celkovou částku objednávky (součet položek s DPH) NEBO MAX cenu s DPH,
 * tj. je vyšší než menší z obou kladných hodnot.
 */

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Součet položek objednávky s DPH (hodnoty mohou být formátované stringy) */
export const sumPolozkySDph = (polozky) => (Array.isArray(polozky) ? polozky : []).reduce((sum, p) => {
  const cena = parseFloat(String(p?.cena_s_dph ?? '0').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  return sum + cena;
}, 0);

const isCountedInvoice =(f) => f && f.stav !== 'STORNO' && String(f.aktivni ?? 1) !== '0';

/**
 * @param {Object} p
 * @param {Array}  p.faktury            Faktury objednávky
 * @param {*}      [p.currentInvoiceId] ID právě editované faktury (její částka se nahradí currentCastka)
 * @param {*}      [p.currentCastka]    Aktuální částka editované / nové faktury
 * @param {boolean}[p.includeCurrentAsNew] Přičíst currentCastka jako novou fakturu (není ve faktury)
 * @param {*}      p.maxCena            MAX cena objednávky s DPH
 * @param {*}      p.polozkyCelkem      Součet položek objednávky s DPH
 * @returns {{ limit: number, total: number, rozdil: number, prekroceno: boolean }}
 */
export const calcInvoiceOverrun = ({
  faktury = [],
  currentInvoiceId = null,
  currentCastka = null,
  includeCurrentAsNew = false,
  maxCena,
  polozkyCelkem
}) => {
  const kandidati = [parseAmount(maxCena), parseAmount(polozkyCelkem)].filter(v => v > 0);
  const limit = kandidati.length > 0 ? Math.min(...kandidati) : 0;

  let total = (Array.isArray(faktury) ? faktury : []).reduce((sum, f) => {
    if (!isCountedInvoice(f)) return sum;
    const isCurrent = currentInvoiceId !== null && currentInvoiceId !== undefined
      && String(f.id) === String(currentInvoiceId);
    return sum + (isCurrent && currentCastka !== null ? parseAmount(currentCastka) : parseAmount(f.fa_castka));
  }, 0);
  if (includeCurrentAsNew) total += parseAmount(currentCastka);

  const rozdil = total - limit;
  return { limit, total, rozdil, prekroceno: limit > 0 && rozdil > 0.005 };
};

export const formatOverrunMessage = ({ limit, total, rozdil }) => {
  const fmt = (v) => v.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Součet faktur objednávky (${fmt(total)} Kč) převyšuje částku objednávky (${fmt(limit)} Kč) o ${fmt(rozdil)} Kč. `
    + 'Vyplňte důvod v poznámce k věcné správnosti.';
};
