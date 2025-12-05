import React, { createContext, useState, useEffect, useCallback } from 'react';

export const DebugContext = createContext();

export const DebugProvider = ({ children }) => {
  const [debugMessage, setDebugMessage] = useState('Debug okénko připraveno.');
  const [logEntries, setLogEntries] = useState([]); // { ts, entry, isHtml? }
  const isDisabled = (() => {
    try {
      if (String(process.env.REACT_APP_DEBUG_OFF) === '1') return true;
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('debug_disable') : null;
      // default: enabled unless explicitly disabled
      return v === '1';
    } catch { return false; }
  })();

  const updateDebugMessage = useCallback((data, isUpdate, orderId = null) => {
    const debugData = {
      dborders: process.env.REACT_APP_DB_ORDER_KEY,
      dbattach: process.env.REACT_APP_DB_ATTACHMENT_KEY,
      query: isUpdate ? 'react-update-order' : 'react-insert-order',
      ...(isUpdate && { orderId }),
      ...data,
    };
    setDebugMessage(JSON.stringify(debugData, null, 2));
  }, []);

  const addDebugEntry = useCallback((entry, opts = {}) => {
    if (isDisabled) return; // no-op when disabled
    // If caller wants to preserve object structure (for richer UI), set opts.keepObject = true
    let storedEntry = entry;
    if (typeof entry !== 'string' && !opts.keepObject) {
      try { storedEntry = JSON.stringify(entry); } catch { storedEntry = String(entry); }
    }
    const { keepObject, ...rest } = opts; // don't store internal flag
    setLogEntries(prev => [...prev, { ts: Date.now(), entry: storedEntry, ...rest }]);
  }, []);

  const clearDebug = useCallback(() => {
    setLogEntries([]);
    setDebugMessage('Vymazáno.');
  }, []);

  // Exponovat helpery do window pro rychlé použití v konzoli / kódu
  // Do not expose helpers on window by default anymore — prefer using the DebugContext API
  // (kept for internal use only)

  // Syntax highlight JSON
  const MAX_ARRAY_ITEMS = 10;            // uživatel žádal max 10 položek
  const MAX_STRING_LENGTH = 25000;       // tvrdý strop aby se UI "nezabilo"

  const truncateData = (data) => {
    try {
      if (Array.isArray(data)) {
        if (data.length > MAX_ARRAY_ITEMS) {
          return {
            __truncated: true,
            __originalLength: data.length,
            __note: `Zobrazeno prvních ${MAX_ARRAY_ITEMS} položek z ${data.length}`,
            items: data.slice(0, MAX_ARRAY_ITEMS)
          };
        }
        return data;
      } else if (data && typeof data === 'object') {
        const clone = Array.isArray(data) ? [...data] : { ...data };
        Object.keys(clone).forEach(k => {
          if (Array.isArray(clone[k]) && clone[k].length > MAX_ARRAY_ITEMS) {
            clone[k] = {
              __truncated: true,
              __originalLength: clone[k].length,
              __note: `Zobrazeno prvních ${MAX_ARRAY_ITEMS} položek z ${clone[k].length}`,
              items: clone[k].slice(0, MAX_ARRAY_ITEMS)
            };
          }
        });
        return clone;
      }
      return data;
    } catch { return data; }
  };

  const escapeHtml = (str) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const highlightJson = useCallback((obj) => {
    const truncated = truncateData(obj);
    const IND = '  ';

    const asType = (type, content) => {
      const colorMap = {
        key: '#60a5fa',
        string: '#a3e635',
        number: '#fbbf24',
        boolean: '#f87171',
        null: '#c084fc',
        note: '#94a3b8'
      };
      return `<span style="color:${colorMap[type]};">${content}</span>`;
    };

    const esc = (s) => escapeHtml(String(s));

    const format = (value, depth) => {
      if (value === null) return asType('null', 'null');
      const t = typeof value;
      if (t === 'string') {
        return asType('string', '"' + esc(value) + '"');
      }
      if (t === 'number') return asType('number', String(value));
      if (t === 'boolean') return asType('boolean', String(value));
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map(v => IND.repeat(depth+1) + format(v, depth+1));
        return '[\n' + items.join(',\n') + '\n' + IND.repeat(depth) + ']';
      }
      if (t === 'object') {
        // Handle special truncated marker object shape
        if (value.__truncated && value.items) {
          const metaKeys = ['__truncated','__originalLength','__note'];
          const metaLines = metaKeys.map(k => IND.repeat(depth+1) + asType('key', '"'+k+'"') + ': ' + format(value[k], depth+1));
          const itemsLine = IND.repeat(depth+1) + asType('key', '"items"') + ': ' + format(value.items, depth+1);
          return '{\n' + [...metaLines, itemsLine].join(',\n') + '\n' + IND.repeat(depth) + '}';
        }
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';
        const lines = keys.map(k => {
          return IND.repeat(depth+1) + asType('key', '"'+esc(k)+'"') + ': ' + format(value[k], depth+1);
        });
        return '{\n' + lines.join(',\n') + '\n' + IND.repeat(depth) + '}';
      }
      // fallback
      return esc(String(value));
    };

    let rendered;
    try { rendered = format(truncated, 0); } catch { rendered = esc(JSON.stringify(truncated)); }
    if (rendered.length > MAX_STRING_LENGTH) {
      rendered = rendered.slice(0, MAX_STRING_LENGTH) + '\n' + asType('note', `"__TRUNCATED__ (výstup přesáhl ${MAX_STRING_LENGTH} znaků)"`);
    }
    return rendered;
  }, []);

  // Listener for apiDebug events
  useEffect(() => {
    if (isDisabled) return;
    const handler = (e) => {
      const d = e.detail || {};
      const time = new Date(d.ts || Date.now()).toLocaleTimeString('cs-CZ', { hour12:false }) + (d.duration != null ? ` (+${d.duration}ms)` : '');
      const headerColor = d.phase === 'error' ? '#f87171' : d.phase === 'response' ? '#93c5fd' : '#fde68a';
      const title = `${d.method || ''} ${d.url || ''}`.trim();
      const bodySource = d.phase === 'request' ? d.data : (d.phase === 'error' ? { error: d.error, data: d.data } : d.data);
      const jsonHtml = highlightJson(bodySource);
      const statusLine = d.status ? `status: ${d.status}` : '';
      const phaseLabel = d.phase ? `[${d.phase}]` : '';
      // Provide structured parts so UI může přidat collapse/expand bez regex hacků
      const headerHtml = `<div style="color:${headerColor};font-weight:600;margin:0;">${phaseLabel} ${title} <span style="opacity:.65;">[${time}]</span> ${statusLine}</div>`;
      const bodyHtml = `<pre style="margin:4px 0 4px;padding:4px 6px;background:#0f172a;border:1px solid #1e293b;border-radius:4px;white-space:pre-wrap;word-break:break-word;overflow:hidden;">${jsonHtml}</pre>`+
        `<div style="font-size:10px;opacity:.38;letter-spacing:.8px;">--------------------------------------</div>`;
      addDebugEntry({ headerHtml, bodyHtml, phase: d.phase }, { isHtml: true, structured: true, keepObject: true });
    };
    window.addEventListener('apiDebug', handler);
    return () => window.removeEventListener('apiDebug', handler);
  }, [highlightJson, addDebugEntry, isDisabled]);

  const providerValue = React.useMemo(() => ({ debugMessage, updateDebugMessage, logEntries, addDebugEntry, clearDebug }), [debugMessage, updateDebugMessage, logEntries, addDebugEntry, clearDebug]);

  return (
    <DebugContext.Provider value={providerValue}>
      {children}
    </DebugContext.Provider>
  );
};
