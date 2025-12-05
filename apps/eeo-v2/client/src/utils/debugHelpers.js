// Centralized helpers for debug logging used across forms/components
// Keep formatting consistent with existing debug panel entries.

import { escapeHtml } from './strings';

// Unified styles/colors used in debug entries
export const DEBUG_COLORS = {
  form: '#34d399',        // zelená – form snapshoty
  apiInfo: '#60a5fa',     // modrá – API info / success
  apiWarn: '#f59e0b',     // žlutá – API varování
  apiError: '#f97316',    // oranžová – API selhání
  payload: '#0ea5a4',     // tyrkys – připravený payload
  skip: '#fb923c',        // oranžová světlá – skip info
  cancel: '#f97316'       // oranžová – cancel
};

const PRE_STYLE = 'margin:4px 0 4px;padding:4px 6px;background:#0a0a0a;border:1px solid #262626;border-radius:4px;white-space:pre-wrap;word-break:break-word;overflow:hidden;';
const PRE_STYLE_FORM = 'margin:4px 0 4px;padding:4px 6px;background:#052e16;border:1px solid #064e3b;border-radius:4px;white-space:pre-wrap;word-break:break-word;overflow:hidden;';

function timeBadge() {
  try { return new Date().toLocaleTimeString('cs-CZ', { hour12: false }); } catch { return ''; }
}

function wrapHeader(color, title, withTime = false) {
  const ts = withTime ? ` <span style="opacity:.65;">[${timeBadge()}]</span>` : '';
  return `<div style="color:${color};font-weight:700;">${title}${ts}</div>`;
}

function preHtml(obj, forForm = false) {
  const style = forForm ? PRE_STYLE_FORM : PRE_STYLE;
  return `<pre style="${style}">${escapeHtml(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2))}</pre>`;
}

// Serialize all form controls (by name/id) into a flat object, with light numeric sanitation
export function serializeFormElements(formRootEl) {
  const out = {};
  if (!formRootEl || !formRootEl.elements) return out;
  const els = Array.from(formRootEl.elements || []);
  els.forEach(el => {
    if (!el || (!el.name && !el.id)) return;
    const key = el.name || el.id;
    const sanitizeNumber = (v) => typeof v === 'string' ? v.replace(/\s+/g, '').replace(',', '.') : v;
    const isPriceField = /(maxPriceInclVat|priceExclVat|priceInclVat)$/.test(key) || /items\[\d+\]\.(priceExclVat|priceInclVat)$/.test(key);
    if (el.type === 'checkbox') {
      out[key] = el.checked;
    } else if (el.type === 'radio') {
      if (el.checked) out[key] = el.value; // zachováme pro schválení (true/false/pending)
    } else {
      const val = el.value;
      out[key] = isPriceField ? sanitizeNumber(val) : val;
    }
  });
  return out;
}

// Uniform logger for form snapshots to the floating debug panel
export function logFormSnapshot({ addDebugEntry, formRootEl, isAdmin, userId, draftKey, action, extra = {} }) {
  if (!isAdmin || typeof addDebugEntry !== 'function') return;
  try {
    const flat = serializeFormElements(formRootEl);
    const payload = {
      form: 'OrderForm',
      action,
      user_id: userId,
      draftKey,
      timestamp: new Date().toISOString(),
      fields: flat,
      ...extra
    };
    addDebugEntry({
      headerHtml: `<div style="color:${DEBUG_COLORS.form};font-weight:600;margin:0;">[form] OrderForm ${action} <span style="opacity:.65;">[${timeBadge()}]</span></div>`,
      bodyHtml: `${preHtml(payload, true)}<div style="font-size:10px;opacity:.38;letter-spacing:.8px;">--------------------------------------</div>`,
      phase: 'form'
    }, { isHtml: true, structured: true, keepObject: true });
  } catch {}
}

// Generic API info log
export function logApiInfo({ addDebugEntry, title, data, phase = 'api' }) {
  if (typeof addDebugEntry !== 'function') return;
  try {
    addDebugEntry({
      headerHtml: wrapHeader(DEBUG_COLORS.apiInfo, title, false),
      bodyHtml: preHtml(data, false),
      phase
    }, { isHtml: true, structured: true, keepObject: true });
  } catch {}
}

// Generic API error/warn log
export function logApiError({ addDebugEntry, title, error, warn = false, phase = 'api' }) {
  if (typeof addDebugEntry !== 'function') return;
  try {
    const color = warn ? DEBUG_COLORS.apiWarn : DEBUG_COLORS.apiError;
    addDebugEntry({
      headerHtml: wrapHeader(color, title, false),
      bodyHtml: preHtml(typeof error === 'string' ? error : (error?.message || String(error)), false),
      phase
    }, { isHtml: true, structured: true, keepObject: true });
  } catch {}
}

// Specialized log for payload preparation (e.g., INSERT/UPDATE)
export function logPayload({ addDebugEntry, title = 'Prepared payload', payload, phase = 'api' }) {
  if (typeof addDebugEntry !== 'function') return;
  try {
    addDebugEntry({
      headerHtml: wrapHeader(DEBUG_COLORS.payload, title, false),
      bodyHtml: preHtml(payload, false),
      phase
    }, { isHtml: true, structured: true, keepObject: true });
  } catch {}
}
