import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import {
  getVemaKontrola,
  saveVemaKontrola,
  KONTROLA_STATUS,
  KONTROLA_STATUS_LABELS,
  KONTROLA_STATUS_COLORS,
  KONTROLA_PRIORITA,
  KONTROLA_PRIORITA_LABELS,
  KONTROLA_PRIORITA_COLORS,
} from '../services/apiVemaKontrola';

// ─── Styled components ──────────────────────────────────────────────────────

const CellWrap = styled.div`
  position: relative;
  font-size: 0.78rem;
`;

const TriggerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.18rem 0.45rem;
  border: 1px solid ${({ $color }) => $color || '#cbd5e1'};
  border-radius: 4px;
  background: ${({ $bgcolor }) => $bgcolor || '#f1f5f9'};
  color: ${({ $textcolor }) => $textcolor || '#475569'};
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.3;
  transition: opacity 0.12s;
  &:hover { opacity: 0.8; }
`;

const PopoverOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9990;
`;

const Popover = styled.div`
  position: fixed;
  z-index: 9999;
  min-width: 340px;
  max-width: 420px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  padding: 1rem;
  font-size: 0.82rem;
  animation: fadeIn 0.1s ease;
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const PopoverTitle = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 0.8rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #94a3b8;
  padding: 0;
  line-height: 1;
  &:hover { color: #475569; }
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.8rem;
`;

const Label = styled.span`
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: inherit;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SaveButton = styled(Button)`
  background: #3b82f6;
  color: white;
`;

const CancelButton = styled(Button)`
  background: #e2e8f0;
  color: #475569;
`;

const InfoText = styled.div`
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: #f8fafc;
  border-radius: 4px;
`;

const ErrorText = styled.div`
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: #fee2e2;
  border-radius: 4px;
`;

// ─── Komponenta ─────────────────────────────────────────────────────────────

/**
 * VemaKontrolaCell - Inline komponenta pro zobrazení a editaci VEMA kontroly
 * 
 * @param {object} props
 * @param {'faktura'|'firma'|'smlouva'} props.typZaznamu - Typ VEMA záznamu
 * @param {string} props.vemaId - VEMA ID (firma/cfak/csml)
 * @param {string} [props.vemaIdSecondary] - Sekundární VEMA ID (např. firma u faktury)
 * @param {string} props.token - Auth token
 * @param {string} props.username - Username
 * @param {function} [props.onSave] - Callback po uložení
 */
export default function VemaKontrolaCell({
  typZaznamu,
  vemaId,
  vemaIdSecondary = null,
  token,
  username,
  onSave,
}) {
  const [kontrola, setKontrola] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formStatus, setFormStatus] = useState(KONTROLA_STATUS.NEZKONTROLOVANO);
  const [formPriorita, setFormPriorita] = useState(KONTROLA_PRIORITA.NORMALNI);
  const [formPoznamka, setFormPoznamka] = useState('');

  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  // Načtení kontroly ze serveru
  const loadKontrola = useCallback(async () => {
    if (!token || !username || !vemaId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await getVemaKontrola(typZaznamu, vemaId, token, username);
      setKontrola(data);
      
      // Nastavit form hodnoty
      if (data) {
        setFormStatus(data.kontrola_status || KONTROLA_STATUS.NEZKONTROLOVANO);
        setFormPriorita(data.priorita ?? KONTROLA_PRIORITA.NORMALNI);
        setFormPoznamka(data.poznamka || '');
      } else {
        // Reset na default
        setFormStatus(KONTROLA_STATUS.NEZKONTROLOVANO);
        setFormPriorita(KONTROLA_PRIORITA.NORMALNI);
        setFormPoznamka('');
      }
    } catch (err) {
      console.error('Chyba při načítání VEMA kontroly:', err);
      setError(err.message || 'Chyba při načítání kontroly');
    } finally {
      setLoading(false);
    }
  }, [typZaznamu, vemaId, token, username]);

  // Načíst při prvním zobrazení
  useEffect(() => {
    loadKontrola();
  }, [loadKontrola]);

  // Otevřít popover
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  // Zavřít popover
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  // Uložit kontrolu
  const handleSave = useCallback(async () => {
    if (!token || !username) {
      setError('Chybí autentizační údaje');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveVemaKontrola(
        {
          typZaznamu,
          vemaId,
          vemaIdSecondary,
          kontrolaStatus: formStatus,
          priorita: formPriorita,
          poznamka: formPoznamka.trim(),
          metadata: null, // Pro budoucí rozšíření
        },
        token,
        username
      );

      // Reload kontroly
      await loadKontrola();

      // Callback
      if (onSave) onSave();

      // Zavřít popover
      handleClose();
    } catch (err) {
      console.error('Chyba při ukládání VEMA kontroly:', err);
      setError(err.message || 'Chyba při ukládání kontroly');
    } finally {
      setSaving(false);
    }
  }, [
    typZaznamu,
    vemaId,
    vemaIdSecondary,
    formStatus,
    formPriorita,
    formPoznamka,
    token,
    username,
    onSave,
    handleClose,
    loadKontrola,
  ]);

  // Pozicování popoveru
  const [popoverStyle, setPopoverStyle] = useState({});
  
  useEffect(() => {
    if (!isOpen || !btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const popoverWidth = 380;
    const popoverHeight = 500; // estimate

    let left = rect.left;
    let top = rect.bottom + 8;

    // Pokud by přetekl vpravo
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 16;
    }

    // Pokud by přetekl dolů
    if (top + popoverHeight > window.innerHeight) {
      top = rect.top - popoverHeight - 8;
      if (top < 0) top = 16; // fallback
    }

    setPopoverStyle({ left: `${left}px`, top: `${top}px` });
  }, [isOpen]);

  // Barvy pro tlačítko
  const status = kontrola?.kontrola_status || KONTROLA_STATUS.NEZKONTROLOVANO;
  const colors = KONTROLA_STATUS_COLORS[status] || KONTROLA_STATUS_COLORS[KONTROLA_STATUS.NEZKONTROLOVANO];

  // Názvy typů záznamů pro nadpis
  const typZaznamuLabels = {
    'faktura': 'Faktura',
    'firma': 'Firma',
    'smlouva': 'Smlouva',
  };
  const typLabel = typZaznamuLabels[typZaznamu] || 'Záznam';

  return (
    <CellWrap>
      <TriggerBtn
        ref={btnRef}
        onClick={handleOpen}
        $bgcolor={colors.bg}
        $color={colors.border}
        $textcolor={colors.text}
        title="VEMA kontrola – klikněte pro editaci"
      >
        <span>{colors.icon}</span>
        <span>{KONTROLA_STATUS_LABELS[status]}</span>
      </TriggerBtn>

      {isOpen && (
        <>
          <PopoverOverlay onClick={handleClose} />
          <Popover ref={popoverRef} style={popoverStyle}>
            <PopoverTitle>
              <span>🔍 Kontrola: {typLabel}</span>
              <CloseBtn onClick={handleClose}>✕</CloseBtn>
            </PopoverTitle>

            {loading && <InfoText>Načítám...</InfoText>}

            {!loading && (
              <>
                <Row>
                  <Label>Status kontroly</Label>
                  <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    {Object.entries(KONTROLA_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {KONTROLA_STATUS_COLORS[key].icon} {label}
                      </option>
                    ))}
                  </Select>
                </Row>

                <Row>
                  <Label>Priorita</Label>
                  <Select value={formPriorita} onChange={(e) => setFormPriorita(Number(e.target.value))}>
                    {Object.entries(KONTROLA_PRIORITA_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Row>

                <Row>
                  <Label>Poznámka</Label>
                  <Textarea
                    value={formPoznamka}
                    onChange={(e) => setFormPoznamka(e.target.value)}
                    placeholder="Volitelná poznámka k záznamu..."
                  />
                </Row>

                {kontrola && (
                  <InfoText>
                    📅 {kontrola.kontroloval_jmeno && kontrola.kontroloval_prijmeni
                      ? `Kontroloval: ${kontrola.kontroloval_jmeno} ${kontrola.kontroloval_prijmeni}`
                      : 'Dosud nekontrolováno'}
                    {kontrola.dt_kontroly && ` (${new Date(kontrola.dt_kontroly).toLocaleString('cs-CZ')})`}
                  </InfoText>
                )}

                {error && <ErrorText>{error}</ErrorText>}

                <ButtonRow>
                  <CancelButton onClick={handleClose}>Zrušit</CancelButton>
                  <SaveButton onClick={handleSave} disabled={saving}>
                    {saving ? 'Ukládám...' : 'Uložit'}
                  </SaveButton>
                </ButtonRow>
              </>
            )}
          </Popover>
        </>
      )}
    </CellWrap>
  );
}
