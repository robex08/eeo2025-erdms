// Utilities for order status normalization and coloring

// Convert hex color (e.g., #e63946) to rgba string with given alpha
export function hexToRgba(hex, alpha = 0.08) {
  try {
    if (!hex) return 'transparent';
    let h = String(hex).replace('#','').trim();
    if (h.length === 3) { h = h.split('').map(c => c + c).join(''); }
    const num = parseInt(h, 16);
    if (Number.isNaN(num)) return 'transparent';
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch { return 'transparent'; }
}

// Normalize known workflow codes to canonical tokens and numeric ids
export function normalizeStav(val) {
  if (val == null) return { code: null, num: null };
  const raw = String(val).trim();
  if (/^\d+$/.test(raw)) {
    const num = parseInt(raw, 10);
    const map = {
      1: 'NOVA',
      2: 'ODESLANA_KE_SCHVALENI',
      3: 'SCHVALENA',
      4: 'ZAMITNUTA',
      5: 'CEKA_SE',
      6: 'ODESLANA',
      7: 'POTVRZENA',
      8: 'DOKONCENA',
      9: 'ZRUSENA',
      10: 'CEKA_POTVRZENI'
    };
    return { num, code: map[num] || null };
  }
  const s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const simplify = s.replace(/\s+/g,'_');
  if (simplify.includes('ODESLANA') && simplify.includes('SCHVAL')) return { code: 'ODESLANA_KE_SCHVALENI', num: 2 };
  if (simplify.includes('SCHVALENA') || simplify.includes('SCHVALENO')) return { code: 'SCHVALENA', num: 3 };
  if (simplify.includes('ZAMIT')) return { code: 'ZAMITNUTA', num: 4 };
  if (simplify.includes('CEKA')) return { code: 'CEKA_SE', num: 5 };
  if (simplify.includes('ROZPRAC')) return { code: 'NOVA', num: null };
  if (simplify.includes('POTVRZEN')) return { code: 'POTVRZENA', num: null };
  if (simplify.includes('DOKONC') || simplify.includes('VYRIZ')) return { code: 'DOKONCENA', num: null };
  if (simplify.includes('ZRUS') || simplify.includes('STORNO') || simplify.includes('CANCEL')) return { code: 'ZRUSENA', num: null };
  if (simplify.includes('SMAZ')) return { code: 'SMAZANA', num: null };
  if (simplify.includes('UVEREJN') && simplify.includes('REGISTR')) return { code: 'K_UVEREJNENI_DO_REGISTRU', num: null };
  return { code: null, num: null };
}

// Map canonical status to base color
export const mapStatusColor = (status) => {
  try {
    const n = normalizeStav(status);
    const code = n?.code;
    switch (code) {
      case 'SCHVALENA': return '#86efac';
      case 'ODESLANA_KE_SCHVALENI': return '#b91c1c';
      case 'CEKA_SE': return '#f87171';
      case 'ZAMITNUTA': return '#6b7280';
      case 'SMAZANA': return '#6b7280';
      case 'NOVA': return '#fdba74';
      case 'DOKONCENA': return '#ffffff';
      case 'VYRIZENA': return '#ffffff';
      case 'POTVRZENA': return '#93c5fd';
      case 'K_UVEREJNENI_DO_REGISTRU': return '#166534';
      default:
        break;
    }
    if (n && n.num != null) {
      if (n.num === 1) return '#fdba74';
      else if (n.num === 2) return '#b91c1c';
      else if (n.num === 3) return '#86efac';
      else if (n.num === 4) return '#6b7280';
      else if (n.num === 5) return '#f87171';
      else if (n.num === 7) return '#93c5fd';
      else if (n.num === 8) return '#ffffff';
      else if (n.num === 9) return '#6b7280';
      else if (n.num === 10) return '#f87171';
    }
  } catch {}

  if (!status) return '#6b7280';
  const sRaw = String(status || '');
  const sNorm = sRaw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const norm = sNorm.replace(/\s+/g,' ').trim();
  if (/rozprac/.test(norm)) return '#fdba74';
  if (/schvalena|schvaleno/.test(norm)) return '#86efac';
  if (/ke\s*schval|odeslan.*schval/.test(norm)) return '#b91c1c';
  if (/cek|ceka|cekani/.test(norm)) return '#f87171';
  if (/zamit|odmit|reject|smaz/.test(norm)) return '#6b7280';
  if (/potvrzen/.test(norm)) return '#93c5fd';
  if (/uverejn.*registr/.test(norm)) return '#166534';
  if (/dokonc|vyrizen|hotovo|complete|finished|done/.test(norm)) return '#ffffff';
  return '#5e60ce';
};

// Derive a soft row background color from the order status
export function getRowBackgroundFromStatus(original) {
  try {
    const label = original?.nazev_stavu || original?.status_name || original?.status || '';
    const sidRaw = original?.stav_id_num ?? original?.stav_id ?? original?.status_id ?? original?.stav ?? null;
    const norm = normalizeStav(sidRaw ?? label);
    const code = norm.code;
    if (code === 'DOKONCENA' || code === 'VYRIZENA') return 'transparent';
    const base = mapStatusColor(code || label || sidRaw);
    return hexToRgba(base, 0.08);
  } catch { return 'transparent'; }
}

// Base color used for thin status bars on cards
export function getRowBaseColor(original) {
  try {
    const label = original?.nazev_stavu || original?.status_name || original?.status || '';
    const sidRaw = original?.stav_id_num ?? original?.stav_id ?? original?.status_id ?? original?.stav ?? null;
    const norm = normalizeStav(sidRaw ?? label);
    const code = norm.code;
    if (String(sidRaw) === '25' || code === 'SCHVALENA') return mapStatusColor('SCHVALENA');
    return mapStatusColor(code || label || sidRaw);
  } catch { return '#6b7280'; }
}
