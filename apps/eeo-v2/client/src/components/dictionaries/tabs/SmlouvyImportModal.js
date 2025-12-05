/**
 * SmlouvyImportModal - Hromadný import smluv z Excel/CSV
 * 
 * Funkce:
 * - Drag & drop nebo file upload
 * - Parsování Excel/CSV pomocí XLSX
 * - Mapování sloupců na DB pole
 * - Preview dat před importem
 * - Validace dat
 * - Progress indikátor
 * - Výsledky importu s chybami
 * 
 * @author Frontend Team
 * @date 2025-11-23
 */

import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faFileUpload, faCheckCircle, faExclamationTriangle,
  faDownload, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';

import ConfirmDialog from '../../ConfirmDialog';

import { useContext } from 'react';
import AuthContext from '../../../context/AuthContext';
import { bulkImportSmlouvy, DRUH_SMLOUVY_OPTIONS } from '../../../services/apiSmlouvy';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 0.5rem;
`;

const Modal = styled.div`
  background: white;
  border-radius: 8px;
  width: 100%;
  height: 98vh;
  max-width: 98vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px 12px 0 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const Body = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => 
    props.$variant === 'primary' ? '#3b82f6' :
    props.$variant === 'success' ? '#10b981' :
    props.$variant === 'danger' ? '#ef4444' : '#6b7280'};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const UploadZone = styled.div`
  border: 2px dashed ${props => props.$dragOver ? '#3b82f6' : '#cbd5e1'};
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  background: ${props => props.$dragOver ? '#eff6ff' : '#f8fafc'};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  color: #94a3b8;
  margin-bottom: 1rem;
`;

const UploadText = styled.div`
  font-size: 1.1rem;
  color: #475569;
  margin-bottom: 0.5rem;
`;

const UploadHint = styled.div`
  font-size: 0.9rem;
  color: #94a3b8;
`;

const FileInput = styled.input`
  display: none;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #1e40af;
  font-size: 0.9rem;
`;

const PreviewSection = styled.div`
  margin-top: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  color: #1e293b;
  margin-bottom: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 6px;
  font-weight: 600;
`;

const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const PreviewThead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 1rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  user-select: none;

  &:first-of-type {
    text-align: left;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const PreviewTh = styled.th`
  padding: 0.75rem 1rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 600;
  font-size: 0.875rem;
  color: white;

  &:first-of-type {
    text-align: left;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const PreviewTd = styled.td`
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
`;

const PreviewTr = styled.tr`
  &:nth-of-type(even) {
    background: #f8fafc;
  }
`;

const ValidationWarning = styled.div`
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  color: #92400e;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResultsBox = styled.div`
  background: ${props => props.$success ? '#d1fae5' : '#fee2e2'};
  border: 1px solid ${props => props.$success ? '#6ee7b7' : '#fca5a5'};
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
`;

const ResultsSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.875rem;
  margin-bottom: 0.875rem;
`;

const ResultStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ResultLabel = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
`;

const ResultValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#1e293b'};
`;

const ErrorList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border-radius: 6px;
  padding: 1rem;
`;

const ErrorItem = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.85rem;

  &:last-child {
    border-bottom: none;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #475569;
  cursor: pointer;

  input {
    cursor: pointer;
  }
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const SmlouvyImportModal = ({ useky, onClose }) => {
  const { user, token } = useContext(AuthContext);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // =============================================================================
  // FILE HANDLING
  // =============================================================================

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx?|csv)$/i)) {
      setErrorMessage('Prosím vyberte Excel (.xlsx, .xls) nebo CSV soubor');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    parseFile(selectedFile);
  }, []);

  const parseFile = useCallback((file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

        // Helper pro konverzi Excel data na YYYY-MM-DD
        const excelDateToString = (value) => {
          if (!value) return null;
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            return value.split('T')[0]; // Ořízne čas pokud je
          }
          if (typeof value === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + value * 86400000);
            return date.toISOString().split('T')[0];
          }
          return null;
        };

        // Map column names to DB fields dle BE dokumentace + reálný Excel formát
        const mapped = jsonData.map(row => ({
          cislo_smlouvy: row['Číslo smlouvy'] || row['cislo_smlouvy'] || null,
          usek_zkr: row['Úsek'] || row['Útvar'] || row['usek_zkr'] || null,
          druh_smlouvy: row['Druh smlouvy'] || row['druh_smlouvy'] || 'SLUŽBY',
          nazev_firmy: row['Partner'] || row['Dodavatel'] || row['Název firmy'] || row['nazev_firmy'] || null,
          ico: row['IČO'] || row['ICO'] || row['ico'] || null,
          dic: row['DIČ'] || row['DIC'] || row['dic'] || null,
          nazev_smlouvy: row['Název'] || row['Předmět smlouvy'] || row['Název smlouvy'] || row['nazev_smlouvy'] || null,
          popis_smlouvy: row['Popis'] || row['popis_smlouvy'] || null,
          platnost_od: excelDateToString(row['Platné od'] || row['Platnost od'] || row['platnost_od']),
          platnost_do: excelDateToString(row['Platné do'] || row['Platnost do'] || row['platnost_do']),
          
          // DŮLEŽITÉ: Správné mapování dle BE dokumentace!
          // POZOR: Excel má mezery za "s DPH " a "bez DPH "
          hodnota_bez_dph: row['ZBÝVÁ bez DPH '] || row['ZBÝVÁ bez DPH'] || row['Zbyva bez DPH'] || row['Hodnota bez DPH'] || row['hodnota_bez_dph'] || null,
          hodnota_s_dph: row['ZBÝVÁ s DPH'] || row['Zbyva s DPH'] || row['Hodnota s DPH'] || row['hodnota_s_dph'] || null,
          sazba_dph: row['Sazba DPH'] || row['sazba_dph'] || 21,
          
          hodnota_plneni_bez_dph: row['Předpokládaná hodnota bez DPH'] || row['Predpokladana hodnota bez DPH'] || row['hodnota_plneni_bez_dph'] || null,
          hodnota_plneni_s_dph: row['Předpokládaná hodnota s DPH '] || row['Předpokládaná hodnota s DPH'] || row['Predpokladana hodnota s DPH'] || row['hodnota_plneni_s_dph'] || null,
          
          aktivni: row['Aktivní'] || row['aktivni'] || 1,
          poznamka: row['Poznámka'] || row['poznamka'] || `Import z Excelu ${new Date().toLocaleDateString('cs-CZ')}`,
          cislo_dms: row['Číslo DMS'] || row['cislo_dms'] || null,
          kategorie: row['Kategorie'] || row['kategorie'] || null
        }));

        setParsedData(mapped);
        setErrorMessage(null);
      } catch (err) {
        setErrorMessage('Chyba při parsování souboru: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  // =============================================================================
  // IMPORT
  // =============================================================================

  const handleImportClick = () => {
    if (parsedData.length === 0) {
      setErrorMessage('Nejsou žádná data k importu');
      return;
    }
    setShowConfirm(true);
  };

  const handleImport = async () => {
    setShowConfirm(false);
    try {
      setImporting(true);
      setErrorMessage(null);

      const result = await bulkImportSmlouvy({
        token: token,
        username: user.username,
        data: parsedData,
        overwrite_existing: overwriteExisting,
        // Metadata o souboru pro BE log
        nazev_souboru: file.name,
        typ_souboru: file.name.split('.').pop().toUpperCase(),
        velikost_souboru: file.size
      });

      setImportResults(result);
    } catch (err) {
      setErrorMessage('Chyba při importu: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // =============================================================================
  // DOWNLOAD TEMPLATE
  // =============================================================================

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Číslo smlouvy': 'S-147/750309/26/23',
        'Útvar': 'KM',
        'Druh smlouvy': 'SLUŽBY',
        'Dodavatel': 'Nemocnice Na Homolce',
        'IČO': '12345678',
        'DIČ': 'CZ12345678',
        'Předmět smlouvy': 'Dodávka zdravotnického materiálu',
        'Popis': 'Detailní popis smlouvy',
        'Platnost od': '2025-01-01',
        'Platnost do': '2025-12-31',
        'ZBÝVÁ bez DPH': 413223.14,
        'ZBÝVÁ s DPH': 500000.00,
        'Sazba DPH': 21,
        'Předpokládaná hodnota bez DPH': 330578.51,
        'Předpokládaná hodnota s DPH': 400000.00,
        'Aktivní': 1,
        'Poznámka': 'Test import',
        'Číslo DMS': 'DMS-2025-001',
        'Kategorie': 'ZDRAVOTNICTVI'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Smlouvy');
    XLSX.writeFile(wb, 'smlouvy_sablona.xlsx');
  };

  // =============================================================================
  // HELPERS
  // =============================================================================

  // Konverze Excel data (integer) na formátované datum
  const formatExcelDate = (value) => {
    if (!value) return '-';
    
    // Pokud je to už string ve formátu YYYY-MM-DD, vrátíme formátovaně
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(value);
      return date.toLocaleDateString('cs-CZ');
    }
    
    // Pokud je to Excel serial number (integer)
    if (typeof value === 'number') {
      // Excel počítá dny od 1.1.1900 (ale má bug s rokem 1900)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toLocaleDateString('cs-CZ');
    }
    
    return value;
  };

  // =============================================================================
  // VALIDATION - ZRUŠENO (BE již nevaliduje povinná pole)
  // =============================================================================

  const warnings = [];

  // =============================================================================
  // RENDER
  // =============================================================================

  return ReactDOM.createPortal(
    <Overlay onClick={(e) => e.target === e.currentTarget && !importing && onClose(false)}>
      <Modal>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faFileUpload} />
            Import smluv z Excel/CSV
          </Title>
          <CloseButton onClick={() => !importing && onClose(importResults !== null)}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </Header>

        {errorMessage && (
          <div style={{ padding: '1rem 1.5rem', background: '#fee2e2', borderLeft: '4px solid #dc2626', color: '#dc2626', fontWeight: 600 }}>
            ❌ {errorMessage}
          </div>
        )}

        <Body>
          {!importResults ? (
            <>
              <InfoBox>
                <strong>📋 Formát importu:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                  <li>Excel (.xlsx, .xls) nebo CSV soubor</li>
                  <li>První řádek musí obsahovat názvy sloupců</li>
                  <li><strong>Povinné sloupce:</strong> Číslo smlouvy, Úsek, Partner, Název, Platné do</li>
                  <li><strong>Volitelné:</strong> IČO, Předpokládaná hodnota bez/s DPH, ZBÝVÁ bez/s DPH</li>
                  <li><strong>DŮLEŽITÉ:</strong> "ZBÝVÁ s DPH" = počáteční stav smlouvy, "Předpokládaná hodnota s DPH" = maximální plnění</li>
                  <li>Datum se zadává ve formátu Excel (automaticky se převede)</li>
                </ul>
              </InfoBox>

              <Button onClick={handleDownloadTemplate} style={{ marginBottom: '1rem' }}>
                <FontAwesomeIcon icon={faDownload} />
                Stáhnout šablonu
              </Button>

              {!file ? (
                <>
                  <UploadZone
                    $dragOver={dragOver}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input').click()}
                  >
                    <UploadIcon>
                      <FontAwesomeIcon icon={faFileUpload} />
                    </UploadIcon>
                    <UploadText>
                      Přetáhněte soubor sem nebo klikněte pro výběr
                    </UploadText>
                    <UploadHint>
                      Excel (.xlsx, .xls) nebo CSV
                    </UploadHint>
                  </UploadZone>
                  <FileInput
                    id="file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </>
              ) : (
                <>
                  <PreviewSection>
                    <SectionTitle>
                      <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
                      Soubor načten: {file.name}
                    </SectionTitle>

                    <div style={{ marginTop: '1rem' }}>
                      <strong>Náhled dat ({parsedData.length} řádků):</strong>
                    </div>

                    <PreviewTable>
                      <PreviewThead>
                        <tr>
                          <PreviewTh>Číslo smlouvy</PreviewTh>
                          <PreviewTh>Úsek</PreviewTh>
                          <PreviewTh>Název</PreviewTh>
                          <PreviewTh>IČO</PreviewTh>
                          <PreviewTh>Partner</PreviewTh>
                          <PreviewTh>Předpokl. bez DPH</PreviewTh>
                          <PreviewTh>Předpokl. s DPH</PreviewTh>
                          <PreviewTh>Platné do</PreviewTh>
                          <PreviewTh>ZBÝVÁ bez DPH</PreviewTh>
                          <PreviewTh>ZBÝVÁ s DPH</PreviewTh>
                        </tr>
                      </PreviewThead>
                      <tbody>
                        {parsedData.slice(0, 10).map((row, index) => (
                          <PreviewTr key={index}>
                            <PreviewTd>{row.cislo_smlouvy || '-'}</PreviewTd>
                            <PreviewTd>{row.usek_zkr || '-'}</PreviewTd>
                            <PreviewTd>{row.nazev_smlouvy || '-'}</PreviewTd>
                            <PreviewTd>{row.ico || '-'}</PreviewTd>
                            <PreviewTd>{row.nazev_firmy || '-'}</PreviewTd>
                            <PreviewTd>{row.hodnota_plneni_bez_dph || '-'}</PreviewTd>
                            <PreviewTd>{row.hodnota_plneni_s_dph || '-'}</PreviewTd>
                            <PreviewTd>{formatExcelDate(row.platnost_do)}</PreviewTd>
                            <PreviewTd>{row.hodnota_bez_dph || '-'}</PreviewTd>
                            <PreviewTd>{row.hodnota_s_dph || '-'}</PreviewTd>
                          </PreviewTr>
                        ))}
                      </tbody>
                    </PreviewTable>

                    {parsedData.length > 10 && (
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        ... zobrazeno prvních 10 z {parsedData.length} řádků
                      </div>
                    )}
                  </PreviewSection>

                  <div style={{ marginTop: '1rem' }}>
                    <CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={overwriteExisting}
                        onChange={(e) => setOverwriteExisting(e.target.checked)}
                      />
                      Přepsat existující smlouvy (podle čísla smlouvy)
                    </CheckboxLabel>
                  </div>
                </>
              )}
            </>
          ) : (
            <ResultsBox $success={importResults.chyb === 0}>
              <SectionTitle>
                <FontAwesomeIcon
                  icon={importResults.chyb === 0 ? faCheckCircle : faExclamationTriangle}
                  style={{ color: importResults.chyb === 0 ? '#10b981' : '#f59e0b' }}
                />
                Výsledky importu
              </SectionTitle>

              <ResultsSummary>
                <ResultStat>
                  <ResultLabel>Celkem řádků</ResultLabel>
                  <ResultValue>{importResults.celkem_radku}</ResultValue>
                </ResultStat>
                <ResultStat>
                  <ResultLabel>Úspěšně</ResultLabel>
                  <ResultValue $color="#10b981">{importResults.uspesne_importovano}</ResultValue>
                </ResultStat>
                <ResultStat>
                  <ResultLabel>Aktualizováno</ResultLabel>
                  <ResultValue $color="#3b82f6">{importResults.aktualizovano}</ResultValue>
                </ResultStat>
                <ResultStat>
                  <ResultLabel>Přeskočeno</ResultLabel>
                  <ResultValue $color="#f59e0b">{importResults.preskoceno_duplicit}</ResultValue>
                </ResultStat>
                <ResultStat>
                  <ResultLabel>Chyb</ResultLabel>
                  <ResultValue $color="#ef4444">{importResults.chyb}</ResultValue>
                </ResultStat>
              </ResultsSummary>

              {importResults.chybove_zaznamy && importResults.chybove_zaznamy.length > 0 && (
                <>
                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Chybové záznamy:
                  </div>
                  <ErrorList>
                    {importResults.chybove_zaznamy.map((err, index) => (
                      <ErrorItem key={index}>
                        <strong>Řádek {err.row}:</strong> {err.cislo_smlouvy || '(neznámé číslo)'}<br />
                        <span style={{ color: '#dc2626' }}>{err.error}</span>
                      </ErrorItem>
                    ))}
                  </ErrorList>
                </>
              )}

              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                Čas importu: {importResults.cas_importu_ms} ms
              </div>
            </ResultsBox>
          )}
        </Body>

        <Footer>
          <div>
            {importing && (
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Probíhá import...
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!importResults ? (
              <>
                {file && (
                  <Button onClick={() => { setFile(null); setParsedData([]); }}>
                    Zrušit
                  </Button>
                )}
                <Button
                  $variant="success"
                  onClick={handleImport}
                  disabled={!file || parsedData.length === 0 || importing}
                >
                  {importing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Importuji...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} />
                      Importovat ({parsedData.length})
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button $variant="primary" onClick={() => onClose(true)}>
                Zavřít
              </Button>
            )}
          </div>
        </Footer>
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Potvrzení importu smluv"
        icon={faExclamationTriangle}
        variant={overwriteExisting ? 'danger' : 'warning'}
        onConfirm={handleImport}
        onClose={() => setShowConfirm(false)}
      >
        <p>Opravdu chcete importovat <strong>{parsedData.length} smluv</strong>?</p>
        {overwriteExisting && (
          <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ <strong>POZOR:</strong> Existující smlouvy budou přepsány!
          </p>
        )}
      </ConfirmDialog>
    </Overlay>,
    document.body
  );
};

export default SmlouvyImportModal;
