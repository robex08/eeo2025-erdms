import React, { createContext, useState, useCallback, useEffect } from 'react';
import { registerGlobalToast, unregisterGlobalToast } from '../utils/globalToast';

export const ToastContext = createContext();

const DEFAULT_TIMEOUT = 6000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, { type = 'info', timeout = DEFAULT_TIMEOUT, action } = {}) => {
    // Kontrola, zda už neexistuje toast se stejnou zprávou a typem
    setToasts(currentToasts => {
      const isDuplicate = currentToasts.some(toast =>
        toast.message === message && toast.type === type
      );

      // Pokud už existuje duplicitní toast, neděláme nic
      if (isDuplicate) {
        return currentToasts;
      }

      const id = Date.now() + Math.random().toString(36).slice(2, 7);
      const newToast = { id, message, type, action };

      // Pokud má action, nenastavuj automatický timeout
      if (timeout > 0 && !action) {
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), timeout);
      }

      return [...currentToasts, newToast];
    });
  }, []);

  const removeToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  // Registruj global toast pro případy kdy Toast context není dostupný
  useEffect(() => {
    registerGlobalToast(showToast);
    return () => unregisterGlobalToast();
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts, setToasts }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
      `}</style>
      {children}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 20000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => {
          const typeLabelMap = {
            success: 'Úspěch',
            error: 'Chyba',
            info: 'Info',
            warning: 'Varování',
            greeting: '', // Prázdný nadpis pro pozdravy
            alarm: 'ALARM', // Toast notifikace pro TODO alarm
            alarm_high: 'HIGH ALARM' // Toast notifikace pro HIGH alarm
          };

          // Speciální styly pro ALARM typy
          const getToastStyle = () => {
            if (t.type === 'alarm') {
              return {
                background: 'linear-gradient(135deg, #fb923c, #f97316, #ea580c)',
                color: 'white',
                borderLeft: '4px solid #fb923c',
                boxShadow: '0 6px 18px rgba(249, 115, 22, 0.4)'
              };
            }
            if (t.type === 'alarm_high') {
              return {
                background: 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)',
                color: 'white',
                borderLeft: '4px solid #ef4444',
                boxShadow: '0 6px 18px rgba(220, 38, 38, 0.5)',
                animation: 'pulse 2s infinite'
              };
            }
            // Standardní styly
            return {
              background: t.type === 'error' ? '#fee2e2' : t.type === 'warning' ? '#fef3c7' : (t.type === 'success' ? '#ecfdf5' : '#eef2ff'),
              color: '#0f172a',
              borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : (t.type === 'success' ? '#10b981' : '#6366f1')}`
            };
          };

          const toastStyle = getToastStyle();
          const heading = typeLabelMap[t.type] || t.type;

          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              aria-live={t.type === 'error' ? 'assertive' : 'polite'}
              style={{
                minWidth: 220,
                maxWidth: 420,
                ...toastStyle,
                padding: '10px 12px',
                borderRadius: 8,
                boxShadow: toastStyle.boxShadow || '0 6px 18px rgba(2,6,23,0.08)',
                fontSize: 13
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{heading}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: t.action ? 8 : 0 }}>{t.message}</div>
                {t.action && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        if (t.action.onCancel) t.action.onCancel();
                        removeToast(t.id);
                      }}
                      style={{ background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', padding: '4px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                    >
                      {t.action.cancelText || 'Zrušit'}
                    </button>
                    <button
                      onClick={() => {
                        if (t.action.onConfirm) {
                          t.action.onConfirm();
                        } else if (t.action.onClick) {
                          t.action.onClick();
                        }
                        removeToast(t.id);
                      }}
                      style={{ background: t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : '#6366f1', border: 'none', color: 'white', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                    >
                      {t.action.confirmText || t.action.label || 'OK'}
                    </button>
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastContext;
