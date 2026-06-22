import { useState, useEffect, useRef } from 'react';
import './CopilotWidget.css';

/**
 * CopilotWidget - Microsoft Copilot Chat Integration
 * - Zobrazuje se pouze pro uživatele s Copilot Business licencí
 * - Chat icon v headeru vedle kalendáře
 * - Modal/sidebar s chat UI
 */
function CopilotWidget() {
  console.log('🤖 CopilotWidget: Component mounted/rendered');
  
  const [isOpen, setIsOpen] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(true);

  // Check license on mount
  useEffect(() => {
    checkLicense();
  }, []);

  /**
   * Zjistit zda má uživatel Copilot licenci
   */
  const checkLicense = async () => {
    console.log('🤖 CopilotWidget: Checking license...');
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/copilot/check-license?_t=${timestamp}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await response.json();
      
      console.log('🤖 CopilotWidget: License check result:', data);
      setHasLicense(data.hasLicense || false);
      
    } catch (err) {
      console.error('🤖 CopilotWidget: Failed to check Copilot license:', err);
      setHasLicense(false);
    } finally {
      setCheckingLicense(false);
      console.log('🤖 CopilotWidget: License check complete, hasLicense:', hasLicense);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const openCopilot = () => {
    window.open('https://copilot.microsoft.com/', '_blank');
  };

  // DEBUG MODE: Always show widget with license info
  const buttonTitle = checkingLicense 
    ? "Kontroluji Copilot licenci..." 
    : hasLicense 
      ? "Microsoft Copilot Chat (Licence OK)" 
      : "Microsoft Copilot Chat (Bez licence - MVP demo)";

  return (
    <>
      {/* Chat toggle button in header - ALWAYS VISIBLE IN DEBUG MODE */}
      <button 
        className="copilot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={buttonTitle}
        aria-label="Otevřít Copilot chat"
        style={{ opacity: checkingLicense ? 0.5 : 1 }}
      >
        💬
        {!hasLicense && !checkingLicense && (
          <span style={{ 
            position: 'absolute', 
            top: -5, 
            right: -5, 
            background: 'red', 
            color: 'white', 
            borderRadius: '50%', 
            width: 16, 
            height: 16, 
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>!</span>
        )}
      </button>

      {/* Chat modal/sidebar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="copilot-backdrop"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat panel with embedded Copilot */}
          <div className="copilot-panel">
            {/* Header */}
            <div className="copilot-header">
              <div className="copilot-title">
                <span className="copilot-icon">🤖</span>
                <h3>Microsoft Copilot</h3>
              </div>
              <div className="copilot-actions">
                <button 
                  className="copilot-close-btn"
                  onClick={togglePanel}
                  title="Zavřít"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Embedded Copilot iframe */}
            <div className="copilot-iframe-container">
              <iframe
                src="https://copilot.microsoft.com/"
                className="copilot-iframe"
                title="Microsoft Copilot"
                allow="microphone; camera; clipboard-read; clipboard-write"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
            
            {/* Footer */}
            <div className="copilot-footer">
              <small>
                <span className="copilot-badge">Microsoft Copilot Business</span>
                {' · '}
                <a 
                  href="https://support.microsoft.com/cs-cz/copilot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Nápověda
                </a>
              </small>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default CopilotWidget;
