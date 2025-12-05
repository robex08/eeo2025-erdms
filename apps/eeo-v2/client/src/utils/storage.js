// LocalStorage helpers

export function nsKey(orderId, key) {
  return orderId ? `orderForm.${orderId}.${key}` : `orderForm.${key}`;
}

/**
 * Clear all known per-order localStorage keys for a given order id.
 * Also removes order_open_for_edit keys if they reference this id and
 * optionally clears a per-user draft that mirrors the deleted order.
 */
export function clearOrderLocalState(orderId, opts = {}) {
  if (!orderId) return;
  try {
    const prefix = `orderForm.${orderId}.`;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(prefix)) toRemove.push(k);
      if (k === 'order_open_for_edit' && String(localStorage.getItem(k)) === String(orderId)) toRemove.push(k);
      if (k === 'order_open_for_edit_mode') toRemove.push(k);
    }
    toRemove.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });

    // Optionally clear a per-user draft if it mirrors the deleted order
    const userId = opts.userId || null;
    if (userId) {
      try {
        const dkey = `order_draft_${userId}`;
        const raw = localStorage.getItem(dkey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (String(parsed.id) === String(orderId) || String(parsed.orderId) === String(orderId) || String(parsed.order_id) === String(orderId))) {
            localStorage.removeItem(dkey);
          }
        }
      } catch(e) { /* ignore */ }
    }
  } catch (e) {
    try { console.warn('clearOrderLocalState failed', e); } catch(_) {}
  }
}
