import { useState, useEffect } from 'react';
import './MobileConfirmDialog.css';

/**
 * Mobilní confirm dialog s podporou dark/light mode
 * 
 * @param {boolean} isOpen - Zda je dialog otevřený
 * @param {function} onClose - Callback pro zavření dialogu
 * @param {function} onConfirm - Callback pro potvrzení (dostane text důvodu)
 * @param {string} title - Nadpis dialogu
 * @param {string} message - Zpráva v dialogu
 * @param {string} confirmText - Text potvrzovacího tlačítka
 * @param {string} cancelText - Text zrušovacího tlačítka
 * @param {boolean} requireReason - Zda je důvod povinný
 * @param {string} reasonPlaceholder - Placeholder pro textarea
 * @param {string} variant - Barevný styl: 'danger' | 'warning' | 'primary'
 */
function MobileConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Potvrdit',
  cancelText = 'Zrušit',
  requireReason = false,
  reasonPlaceholder = 'Zadejte důvod...',
  variant = 'primary' // 'danger' | 'warning' | 'primary'
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Reset při otevření/zavření
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  // Zabránit scrollování pozadí když je dialog otevřený
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Důvod je povinný');
      return;
    }
    onConfirm(reason.trim());
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-confirm-overlay" onClick={handleCancel}>
      <div 
        className={`mobile-confirm-dialog ${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nadpis */}
        <div className="mobile-confirm-header">
          <h3>{title}</h3>
        </div>

        {/* Obsah */}
        <div className="mobile-confirm-body">
          {message && <p className="mobile-confirm-message">{message}</p>}
          
          {requireReason && (
            <div className="mobile-confirm-reason">
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                placeholder={reasonPlaceholder}
                rows={4}
                autoFocus
              />
              {error && (
                <div className="mobile-confirm-error">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tlačítka */}
        <div className="mobile-confirm-actions">
          <button
            className="mobile-confirm-btn cancel"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button
            className={`mobile-confirm-btn confirm ${variant}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileConfirmDialog;
