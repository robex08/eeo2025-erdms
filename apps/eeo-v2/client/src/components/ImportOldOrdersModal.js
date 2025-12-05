import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheckCircle, faTimesCircle, faSpinner, faFileImport } from '@fortawesome/free-solid-svg-icons';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ProgressSection = styled.div`
  margin-bottom: 1.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 32px;
  background: #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;

  ${props => props.error && `
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  `}
`;

const ProgressText = styled.div`
  margin-top: 0.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
`;

const SummaryBox = styled.div`
  background: ${props => props.type === 'success' ? '#ecfdf5' : props.type === 'error' ? '#fef2f2' : '#f3f4f6'};
  border: 2px solid ${props => props.type === 'success' ? '#10b981' : props.type === 'error' ? '#ef4444' : '#d1d5db'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const SummaryTitle = styled.div`
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: ${props => props.type === 'success' ? '#065f46' : props.type === 'error' ? '#991b1b' : '#374151'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border-radius: 6px;
  font-size: 0.875rem;
`;

const StatLabel = styled.span`
  color: #6b7280;
`;

const StatValue = styled.span`
  font-weight: 600;
  color: ${props =>
    props.type === 'success' ? '#10b981' :
    props.type === 'error' ? '#ef4444' :
    props.type === 'info' ? '#3b82f6' :
    '#374151'
  };
`;

const ResultsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const ResultItem = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f9fafb;
  }
`;

const SpinnerIcon = styled(FontAwesomeIcon)`
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 2px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #f9fafb;
`;

const Button = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.primary ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  ` : `
    background: white;
    color: #374151;
    border: 2px solid #d1d5db;

    &:hover:not(:disabled) {
      border-color: #9ca3af;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ImportOldOrdersModal = ({
  isOpen,
  onClose,
  selectedOrderIds,
  onImportComplete,
  importFunction
}) => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [currentOperation, setCurrentOperation] = useState(''); // 'reading', 'inserting', 'updating'
  const [currentProcessedCount, setCurrentProcessedCount] = useState(0); // Počet zpracovaných objednávek během importu
  const [totalToImport, setTotalToImport] = useState(0); // Celkový počet k importu
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set()); // Rozbalené položky
  const [searchTerm, setSearchTerm] = useState(''); // Vyhledávací term

  // Reset state při otevření
  useEffect(() => {
    if (isOpen) {
      setImporting(false);
      setProgress(0);
      setCurrentOrder(null);
      setCurrentOperation('');
      setCurrentProcessedCount(0);
      setTotalToImport(0);
      setResults(null);
      setError(null);
      setExpandedItems(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);
  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    setError(null);
    setResults(null);

    // Inicializace progress trackingu
    setTotalToImport(selectedOrderIds.length);
    setCurrentProcessedCount(0);
    setCurrentOperation('reading');
    setCurrentOrder('Připojování k databázi...');

    // Progress simulace pro klasické API (deklarace VNĚ try bloku pro cleanup v catch)
    let progressSimulation = null;

    try {
      setCurrentOrder('Odesílání dat na server...');

      // Fallback progress simulace pro klasické API (non-SSE)
      const startSimulation = () => {
        let simulatedProgress = 0;
        const totalOrders = selectedOrderIds.length;

        progressSimulation = setInterval(() => {
          simulatedProgress = Math.min(simulatedProgress + 5, 90);
          setProgress(simulatedProgress);

          // Vypočti odhadovaný počet zpracovaných objednávek
          const estimatedProcessed = Math.floor((simulatedProgress / 100) * totalOrders);
          setCurrentProcessedCount(estimatedProcessed);

          if (simulatedProgress >= 90) {
            setCurrentOperation('waiting');
            setCurrentOrder('Čekání na server...');
          } else {
            // Simuluj různé operace
            const operations = ['reading', 'inserting', 'updating'];
            const randomOp = operations[Math.floor(Math.random() * operations.length)];
            setCurrentOperation(randomOp);
          }
        }, 500);
      };

      // Vždy start simulace (backend nemá SSE)
      startSimulation();

      const response = await importFunction(selectedOrderIds, {
        // onProgress callback - volá se pouze pokud backend podporuje SSE
        onProgress: (progressData) => {
          // Zastav simulaci pokud dostaneme real data
          if (progressSimulation) {
            clearInterval(progressSimulation);
            progressSimulation = null;
          }

          // Update progress bar
          setProgress(progressData.percentage);

          // Update počítadla
          setCurrentProcessedCount(progressData.current);
          setTotalToImport(progressData.total);

          // Update aktuální objednávky ze SSE dat
          if (progressData.last_result) {
            const result = progressData.last_result;

            // Nastav operaci podle typu z backendu
            if (result.operation === 'INSERT') {
              setCurrentOperation('inserting');
            } else if (result.operation === 'UPDATE') {
              setCurrentOperation('updating');
            } else {
              setCurrentOperation('reading');
            }

            // Zobraz číslo objednávky
            setCurrentOrder(result.cislo_objednavky || `#${result.old_id}`);
          }
        },

        // onComplete callback - volá se po dokončení importu
        onComplete: (completeData) => {
          setProgress(100);
          setCurrentOperation('');
          setCurrentOrder('Import dokončen!');
        },

        // onError callback - volá se při chybě
        onError: (error) => {
          throw error; // Re-throw pro catch blok
        }
      });

      // Zastav simulaci pokud běží
      if (progressSimulation) {
        clearInterval(progressSimulation);
        progressSimulation = null;
      }

      // Nastav finální progress
      setProgress(100);
      setCurrentOperation('');
      setCurrentOrder('Import dokončen!');

      // Validace odpovědi
      if (response && response.results) {
        setResults(response);
      } else {
        throw new Error(`Neplatná odpověď ze serveru: ${JSON.stringify(response)}`);
      }
    } catch (err) {

      // ⚠️ Zastav simulaci při chybě!
      if (progressSimulation) {
        clearInterval(progressSimulation);
        progressSimulation = null;
      }

      // Detailnější error message podle typu chyby
      let errorMessage = 'Neznámá chyba při importu';

      // Timeout chyba
      if (err.message && err.message.includes('Import timeout')) {
        errorMessage = err.message;
      }
      // Network chyba
      else if (err.message === 'Network Error') {
        errorMessage = '❌ Chyba připojení k serveru.\n\n' +
                      'Možné příčiny:\n' +
                      '• Backend server neběží nebo je nedostupný\n' +
                      '• Nesprávná API URL v konfiguraci\n' +
                      '• CORS problém (Access-Control-Allow-Origin)\n' +
                      '• Firewall blokuje spojení';
      }
      // Server odpověděl s HTTP error kódem
      else if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        // Validační chyby z backendu
        if (status === 400 && errorData?.validation_errors) {
          const validationErrors = errorData.validation_errors;
          errorMessage = '❌ Validační chyba - některé objednávky nelze importovat:\n\n';

          Object.entries(validationErrors).forEach(([orderId, errors]) => {
            errorMessage += `Objednávka ${orderId}:\n`;
            if (Array.isArray(errors)) {
              errors.forEach(err => errorMessage += `  • ${err}\n`);
            } else {
              errorMessage += `  • ${errors}\n`;
            }
          });
        }
        // Obecná chyba z backendu
        else {
          errorMessage = errorData?.error ||
                        errorData?.message ||
                        errorData?.detail ||
                        `❌ Server error (${status}): ${err.response.statusText}\n\n` +
                        'Backend odmítl request. Zkontrolujte:\n' +
                        '• Formát posílaných dat\n' +
                        '• Oprávnění uživatele\n' +
                        '• Logy na backendu pro detaily';
        }
      }
      // Request byl odeslán, ale žádná odpověď
      else if (err.request) {
        errorMessage = '❌ Server neodpověděl na request.\n\n' +
                      'Možné příčiny:\n' +
                      '• Backend server zamrzl během zpracování\n' +
                      '• Import trvá příliš dlouho (přetížený server)\n' +
                      '• Síťový timeout\n\n' +
                      'Zkuste:\n' +
                      '1. Zkontrolovat zda backend běží\n' +
                      '2. Importovat méně objednávek najednou\n' +
                      '3. Zkontrolovat logy backendu';
      }
      // 🤷 Ostatní chyby
      else {
        errorMessage = err.message || 'Neznámá chyba při importu';
      }

      setError(errorMessage);
      setProgress(0);
      setCurrentOperation('');
      setCurrentOrder('');
    } finally {
      // ⚠️ DŮLEŽITÉ: Vždy zastav simulaci při ukončení
      if (progressSimulation) {
        clearInterval(progressSimulation);
        progressSimulation = null;
      }
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      if (results && results.imported_count > 0 && onImportComplete) {
        onImportComplete();
      }
      onClose();
    }
  };

  // Toggle rozbalení/sbalení položky
  const toggleExpand = (index) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Filtrování výsledků podle vyhledávání
  const filteredResults = results?.results?.filter(result => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();

    // Vyhledávání v evidenčním čísle, statusu a chybě
    if (result.cislo_objednavky?.toLowerCase().includes(searchLower)) return true;
    if (result.status?.toLowerCase().includes(searchLower)) return true;
    if (result.error?.toLowerCase().includes(searchLower)) return true;

    // Vyhledávání v ID nové DB
    if (result.new_id?.toString().includes(searchLower)) return true;

    // Vyhledávání v počtu položek a příloh
    if (result.polozky_count?.toString().includes(searchLower)) return true;
    if (result.prilohy_count?.toString().includes(searchLower)) return true;

    // Vyhledávání v detailech příloh (názvy souborů a popisy)
    if (result.prilohy_details && Array.isArray(result.prilohy_details)) {
      for (const priloha of result.prilohy_details) {
        if (priloha.soubor?.toLowerCase().includes(searchLower)) return true;
        if (priloha.popis?.toLowerCase().includes(searchLower)) return true;
        if (priloha.error?.toLowerCase().includes(searchLower)) return true;
      }
    }

    return false;
  }) || [];

  if (!isOpen) return null;

  const totalOrders = selectedOrderIds.length;
  const processedCount = results?.results?.length || 0;
  const importedCount = results?.imported_count || 0;  // Nové objednávky (INSERT)
  const updatedCount = results?.updated_count || 0;    // Aktualizované (UPDATE)
  const failedCount = results?.failed_count || 0;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            <FontAwesomeIcon icon={faFileImport} />
            Import starých objednávek
          </ModalTitle>
          <CloseButton onClick={handleClose} disabled={importing}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Před zahájením importu */}
          {!importing && !results && !error && (
            <div>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Připraveno k importu <strong>{totalOrders}</strong> objednávek ze staré databáze do nového systému.
              </p>
              <SummaryBox>
                <SummaryTitle>
                  ℹ️ Co se bude dít:
                </SummaryTitle>
                <ul style={{ margin: '0.5rem 0 0 1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  <li>Načtení objednávek ze staré DB: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{process.env.REACT_APP_DB_ORDER_KEY || 'DEMO_objednavky_2025'}</strong></li>
                  <li>Načtení příloh z tabulky: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{process.env.REACT_APP_DB_ATTACHMENT_KEY || 'DEMO_pripojene_odokumenty'}</strong></li>
                  <li>Kontrola duplicit podle evidenčního čísla</li>
                  <li>Vytvoření/aktualizace záznamu v nové DB (orders25)</li>
                  <li>Import položek a příloh s vazbou na objednávku</li>
                  <li>Extrakce LP kódů z poznámek</li>
                </ul>
              </SummaryBox>
            </div>
          )}

          {/* Progress bar během importu */}
          {importing && (
            <ProgressSection>
              <ProgressBar>
                <ProgressFill style={{ width: `${progress}%` }}>
                  {progress}%
                </ProgressFill>
              </ProgressBar>
              <ProgressText>
                <SpinnerIcon icon={faSpinner} /> Probíhá import objednávek...
              </ProgressText>

              {/* 📊 Detailní info o aktuálním zpracování */}
              {currentOrder && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#e0f2fe',
                  borderRadius: '6px',
                  border: '1px solid #0284c7',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#075985' }}>
                      {currentOperation === 'reading' && '📖 Čtení dat...'}
                      {currentOperation === 'inserting' && '➕ Vkládání nové objednávky...'}
                      {currentOperation === 'updating' && '✏️ Aktualizace objednávky...'}
                      {currentOperation === 'waiting' && '⏳ Čekání na server...'}
                      {!currentOperation && '⚙️ Zpracování...'}
                    </strong>
                  </div>
                  <div style={{ color: '#0c4a6e' }}>
                    <strong>{currentOperation === 'waiting' ? 'Status:' : 'Objednávka:'}</strong> {currentOrder}
                  </div>
                  {totalToImport > 0 && (
                    <div style={{ color: '#0c4a6e', marginTop: '0.25rem' }}>
                      <strong>Průběh:</strong> {currentProcessedCount} / {totalToImport} objednávek
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                  ⏱️ <strong>Import může trvat několik minut.</strong> Prosím neopouštějte tuto stránku a počkejte na dokončení.
                  Systém zpracovává {selectedOrderIds.length} objednávek včetně příloh a položek.
                </p>
              </div>
            </ProgressSection>
          )}

          {/* Chybová zpráva */}
          {error && (
            <SummaryBox type="error">
              <SummaryTitle type="error">
                <FontAwesomeIcon icon={faTimesCircle} />
                Chyba při importu
              </SummaryTitle>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            </SummaryBox>
          )}

          {/* Výsledky importu */}
          {results && (
            <>
              <SummaryBox type={failedCount === 0 ? 'success' : 'error'}>
                <SummaryTitle type={failedCount === 0 ? 'success' : 'error'}>
                  <FontAwesomeIcon icon={failedCount === 0 ? faCheckCircle : faTimesCircle} />
                  {failedCount === 0 ? 'Import dokončen úspěšně' : 'Import dokončen s chybami'}
                </SummaryTitle>
                <SummaryStats>
                  <StatItem>
                    <StatLabel>Celkem:</StatLabel>
                    <StatValue>{processedCount}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Nových:</StatLabel>
                    <StatValue type="success">{importedCount}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Aktualizovaných:</StatLabel>
                    <StatValue type="info">{updatedCount}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Selhalo:</StatLabel>
                    <StatValue type="error">{failedCount}</StatValue>
                  </StatItem>
                </SummaryStats>
              </SummaryBox>

              {results.results && results.results.length > 0 && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Detail importovaných objednávek:
                    </h3>

                    {/* Fultext vyhledávání */}
                    <div style={{ position: 'relative', marginTop: '0.75rem' }}>
                      <input
                        type="text"
                        placeholder="🔍 Vyhledat objednávku (číslo, status, chyba)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.875rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          style={{
                            position: 'absolute',
                            right: '0.5rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            fontSize: '1rem'
                          }}
                          title="Vymazat vyhledávání"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {searchTerm && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        Nalezeno: <strong>{filteredResults.length}</strong> z {results.results.length}
                      </div>
                    )}
                  </div>

                  <ResultsList>
                    {filteredResults.map((result, index) => {
                      const isExpanded = expandedItems.has(index);
                      const isSuccess = result.status === 'OK';
                      const isNew = result.operation === 'INSERT';

                      return (
                  <ResultItem key={index}>
                    <div style={{ width: '100%' }}>
                    {/* Hlavní řádek - jeden řádek s vším */}
                    <div
                      onClick={() => toggleExpand(index)}
                      style={{
                        cursor: 'pointer',
                        padding: '0.625rem 0.75rem',
                        transition: 'all 0.2s',
                        borderRadius: '6px',
                        background: isExpanded ? '#f9fafb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? '#f9fafb' : 'transparent'}
                    >
                      {/* +/- tlačítko */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        color: '#6b7280',
                        border: '1.5px solid #d1d5db',
                        borderRadius: '3px',
                        background: 'white',
                        flexShrink: 0
                      }}>
                        {isExpanded ? '−' : '+'}
                      </div>

                      {/* Ikona úspěch/chyba */}
                      <div style={{
                        fontSize: '1.125rem',
                        flexShrink: 0,
                        color: isSuccess ? '#10b981' : '#ef4444'
                      }}>
                        {isSuccess ? '✓' : '✗'}
                      </div>

                      {/* Evidenční číslo */}
                      <div style={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#111827',
                        minWidth: '200px'
                      }}>
                        {result.cislo_objednavky}
                      </div>

                      {/* Rozdělovací čára */}
                      <div style={{
                        width: '1px',
                        height: '20px',
                        background: '#d1d5db',
                        flexShrink: 0
                      }} />

                      {/* Badge NOVÁ/AKTUALIZACE */}
                      {isSuccess && (
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '3px',
                          backgroundColor: isNew ? '#d1fae5' : '#dbeafe',
                          color: isNew ? '#065f46' : '#1e40af',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {isNew ? 'NOVÁ' : 'AKTUALIZACE'}
                        </div>
                      )}

                      {!isSuccess && (
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '3px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          CHYBA
                        </div>
                      )}
                    </div>

                    {/* Detail - zobrazí se pouze po rozkliknutí */}
                    {isExpanded && (
                      <div style={{
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.5rem',
                        paddingBottom: '0.625rem',
                        background: '#f9fafb'
                      }}>
                        {isSuccess ? (
                          <>
                            {/* Základní info */}
                            <div style={{
                              display: 'flex',
                              gap: '1.25rem',
                              fontSize: '0.8125rem',
                              color: '#6b7280',
                              flexWrap: 'wrap',
                              marginBottom: '0.625rem',
                              paddingLeft: '2.5rem'
                            }}>
                              <div>
                                <span>✓ Status: </span>
                                <strong style={{ color: '#10b981' }}>Úspěch</strong>
                              </div>
                              <div>
                                <span>ID v nové DB: </span>
                                <strong style={{ color: '#374151' }}>{result.new_id || 'N/A'}</strong>
                              </div>
                              <div>
                                <span>Položky: </span>
                                <strong style={{ color: '#374151' }}>{result.polozky_count}</strong>
                              </div>
                              <div>
                                <span>Přílohy: </span>
                                <strong style={{ color: '#374151' }}>{result.prilohy_count}</strong>
                              </div>
                            </div>

                            {/* Detail příloh */}
                            {result.prilohy_details && result.prilohy_details.length > 0 && (
                              <div style={{
                                marginTop: '0.625rem',
                                paddingTop: '0.625rem',
                                paddingLeft: '2.5rem',
                                borderTop: '1px dashed #d1d5db'
                              }}>
                                <div style={{
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: '#374151',
                                  marginBottom: '0.375rem'
                                }}>
                                  📎 Přílohy:
                                </div>
                                <div style={{
                                  paddingLeft: '1.25rem',
                                  fontSize: '0.75rem',
                                  color: '#6b7280'
                                }}>
                                  {result.prilohy_details.map((priloha, pIdx) => (
                                    <div key={pIdx} style={{
                                      marginBottom: '0.25rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}>
                                      <span style={{
                                        color: priloha.status === 'OK' ? '#10b981' : '#ef4444',
                                        fontSize: '0.875rem'
                                      }}>
                                        {priloha.status === 'OK' ? '✓' : '✗'}
                                      </span>
                                      <span style={{ color: '#374151' }}>{priloha.soubor}</span>
                                      {priloha.popis && (
                                        <span style={{ color: '#9ca3af' }}>({priloha.popis})</span>
                                      )}
                                      {priloha.error && (
                                        <span style={{ color: '#ef4444' }}>
                                          - {priloha.error}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{
                            fontSize: '0.8125rem',
                            color: '#dc2626',
                            padding: '0.5rem',
                            background: '#fee2e2',
                            borderRadius: '4px',
                            borderLeft: '3px solid #ef4444'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                              ✗ Chyba při importu:
                            </div>
                            <div>{result.error || 'Neznámá chyba'}</div>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </ResultItem>
                      );
                    })}
              </ResultsList>
                </>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          {!results && !error && (
            <>
              <Button onClick={handleClose} disabled={importing}>
                Zrušit
              </Button>
              <Button primary onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <SpinnerIcon icon={faSpinner} /> Importuji...
                  </>
                ) : (
                  `Importovat (${totalOrders})`
                )}
              </Button>
            </>
          )}
          {(results || error) && (
            <Button primary onClick={handleClose}>
              Zavřít
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

export default ImportOldOrdersModal;
