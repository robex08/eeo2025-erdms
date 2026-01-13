/** @jsxImportSource @emotion/react */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes, faEnvelope, faBan, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const overlayStyle = css`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const dialogStyle = css`
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.25);
  max-width: 92%;
  width: 550px;
  box-sizing: border-box;
  font-family: var(--app-font-family, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Inter', 'Helvetica Neue', Arial, sans-serif);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 2px solid #eef2f7;
  margin-bottom: 20px;
`;

const titleStyle = css`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: #f59e0b;
  }
`;

const closeBtnStyle = css`
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const userInfoStyle = css`
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  border-left: 4px solid #3b82f6;

  h3 {
    margin: 0 0 6px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e40af;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #1e40af;
  }
`;

const optionsContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const optionCardStyle = css`
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: #ffffff;

  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
    transform: translateX(4px);
  }

  &.selected {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  &.cancel {
    border-color: #e5e7eb;
    
    &:hover {
      border-color: #dc2626;
      background: #fef2f2;
    }

    &.selected {
      border-color: #dc2626;
      background: #fef2f2;
    }
  }
`;

const optionHeaderStyle = css`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  svg {
    font-size: 20px;
  }

  h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }
`;

const optionDescStyle = css`
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 0 32px;
  line-height: 1.5;
`;

const templateSelectStyle = css`
  margin: 12px 0 0 32px;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  width: calc(100% - 32px);
  transition: all 0.2s;
  background: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const warningBoxStyle = css`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
  padding: 14px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #92400e;
  line-height: 1.6;

  strong {
    color: #78350f;
  }
`;

const buttonContainerStyle = css`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 2px solid #eef2f7;
`;

const buttonStyle = css`
  padding: 11px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const cancelButtonStyle = css`
  ${buttonStyle}
  background: #f3f4f6;
  color: #374151;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const confirmButtonStyle = css`
  ${buttonStyle}
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
`;

const ForcePasswordChangeModal = ({ isOpen, onClose, onConfirm, userData, templates = [] }) => {
  const [selectedOption, setSelectedOption] = useState(null); // 'with-email', 'without-email', 'cancel'
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Filtrovat pouze relevantní šablony pro reset hesla (welcome, password)
  const relevantTemplates = templates.filter(t => {
    const typ = (t.typ || '').toLowerCase();
    const nazev = (t.nazev || '').toLowerCase();
    const predmet = (t.email_predmet || '').toLowerCase();
    
    return typ.includes('welcome') || 
           typ.includes('password') || 
           nazev.includes('uvítací') ||
           nazev.includes('heslo') ||
           predmet.includes('heslo');
  });

  useEffect(() => {
    if (isOpen && relevantTemplates.length > 0) {
      // Najít default šablonu - preferovat welcome_new_user
      const defaultTemplate = relevantTemplates.find(t => t.typ === 'welcome_new_user') ||
                             relevantTemplates.find(t => 
                               t.nazev?.toLowerCase().includes('uvítací') || 
                               t.nazev?.toLowerCase().includes('heslo')
                             ) || 
                             relevantTemplates[0];
      
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id.toString());
      }
    }
  }, [isOpen, relevantTemplates]);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
  };

  const handleConfirm = () => {
    if (!selectedOption) return;

    if (selectedOption === 'cancel') {
      onClose();
      return;
    }

    onConfirm({
      option: selectedOption,
      templateId: selectedOption === 'with-email' ? selectedTemplate : null
    });
  };

  if (!isOpen) return null;

  const isForcing = userData?.vynucena_zmena_hesla !== 1;

  return ReactDOM.createPortal(
    <div css={overlayStyle} onClick={onClose}>
      <div css={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div css={headerStyle}>
          <h2 css={titleStyle}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
            {isForcing ? 'Vynucení změny hesla' : 'Zrušení vynucení'}
          </h2>
          <button css={closeBtnStyle} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <div css={userInfoStyle}>
          <h3>{userData?.fullName || userData?.username || 'Neznámý uživatel'}</h3>
          <p>{userData?.email || 'Email není k dispozici'}</p>
        </div>

        {isForcing ? (
          <>
            <div css={warningBoxStyle}>
              <strong>⚠️ Důležité:</strong> Uživatel bude při příštím přihlášení vyzván ke změně hesla.
              Můžete mu také vygenerovat a zaslat nové heslo emailem.
            </div>

            <div css={optionsContainerStyle}>
              <div 
                css={optionCardStyle}
                className={selectedOption === 'with-email' ? 'selected' : ''}
                onClick={() => handleOptionClick('with-email')}
              >
                <div css={optionHeaderStyle}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ color: '#3b82f6' }} />
                  <h4>Vynucení změny + zaslání nového hesla emailem</h4>
                </div>
                <p css={optionDescStyle}>
                  Vygeneruje se nové heslo a zašle se uživateli na email pomocí vybrané šablony.
                  Uživatel bude při příštím přihlášení vyzván ke změně tohoto hesla.
                </p>
                {selectedOption === 'with-email' && (
                  <select
                    css={templateSelectStyle}
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">-- Vyberte šablonu --</option>
                    {relevantTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.nazev || template.email_predmet || `Šablona ${template.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div 
                css={optionCardStyle}
                className={selectedOption === 'without-email' ? 'selected' : ''}
                onClick={() => handleOptionClick('without-email')}
              >
                <div css={optionHeaderStyle}>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#16a34a' }} />
                  <h4>Pouze vynucení změny hesla (bez emailu)</h4>
                </div>
                <p css={optionDescStyle}>
                  Aktivuje se vynucení změny hesla, ale žádný email se neodešle.
                  Uživatel si musí heslo změnit při příštím přihlášení s použitím svého současného hesla.
                </p>
              </div>

              <div 
                css={optionCardStyle}
                className={`cancel ${selectedOption === 'cancel' ? 'selected' : ''}`}
                onClick={() => handleOptionClick('cancel')}
              >
                <div css={optionHeaderStyle}>
                  <FontAwesomeIcon icon={faBan} style={{ color: '#dc2626' }} />
                  <h4>Zrušit operaci</h4>
                </div>
                <p css={optionDescStyle}>
                  Žádné změny nebudou provedeny.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div css={warningBoxStyle}>
            Opravdu chcete zrušit vynucení změny hesla pro tohoto uživatele?
            Uživatel se bude moci nadále přihlašovat se svým stávajícím heslem bez nutnosti ho měnit.
          </div>
        )}

        <div css={buttonContainerStyle}>
          <button css={cancelButtonStyle} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
            Zavřít
          </button>
          {isForcing && (
            <button 
              css={confirmButtonStyle} 
              onClick={handleConfirm}
              disabled={!selectedOption || selectedOption === 'cancel' || (selectedOption === 'with-email' && !selectedTemplate)}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} />
              Potvrdit
            </button>
          )}
          {!isForcing && (
            <button 
              css={confirmButtonStyle} 
              onClick={() => onConfirm({ option: 'remove-force' })}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              Zrušit vynucení
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ForcePasswordChangeModal;
