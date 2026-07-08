import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import {
  getFkCase,
  fkUpsert,
  fkAddKomentar,
  fkSetStav,
  FK_STAV_LABELS,
  FK_STAV_COLORS,
  FK_PRIORITA_LABELS,
  FK_PRIORITA_COLORS,
} from '../services/apiFkSledovani';

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
  min-width: 320px;
  max-width: 380px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  padding: 0.85rem 1rem 0.9rem;
  font-size: 0.82rem;
  /* plynulý fade-in */
  animation: fkFadeIn 0.1s ease;
  @keyframes fkFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const PopoverTitle = styled.div`
  font-weight: 700;
  font-size: 0.88rem;
  margin-bottom: 0.5rem;
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
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  flex-wrap: wrap;
`;

const Label = styled.span`
  color: #64748b;
  font-size: 0.75rem;
  white-space: nowrap;
  min-width: 56px;
`;

const StavSelect = styled.select`
  padding: 0.2rem 0.4rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.78rem;
  background: #f8fafc;
  cursor: pointer;
  width: 120px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #f1f5f9;
  margin: 0.55rem 0;
`;

const JournalList = styled.div`
  max-height: 130px;
  overflow-y: auto;
  margin-bottom: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const JournalItem = styled.div`
  background: #f8fafc;
  border-radius: 4px;
  padding: 0.3rem 0.45rem;
  font-size: 0.75rem;
  color: #334155;
  line-height: 1.4;
`;

const JournalMeta = styled.span`
  font-size: 0.68rem;
  color: #94a3b8;
  margin-right: 0.35rem;
`;

const KomentarInput = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 0.3rem 0.45rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.78rem;
  resize: vertical;
  min-height: 52px;
  background: #f8fafc;
  font-family: inherit;
  &::placeholder { color: #94a3b8; }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
  margin-top: 0.4rem;
`;

const BtnPrimary = styled.button`
  padding: 0.28rem 0.7rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
  &:hover:not(:disabled) { background: #1d4ed8; }
`;

const ErrMsg = styled.div`
  color: #dc2626;
  font-size: 0.72rem;
  margin-top: 0.3rem;
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDt(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}. ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function typLabel(typ) {
  const m = {
    KOMENTAR: '💬',
    ZMENA_STAVU: '🔄',
    ZMENA_PRIORITY: '⚡',
    PRIRAZENI: '👤',
    ZMENA_VYZADUJE_AKCI: '✅',
    AUTO_SYSTEM: '🤖',
  };
  return m[typ] || typ;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * FkInlineCell – kompaktní buňka pro FK sledování případu v tabulkové řádce.
 *
 * Props:
 *   objednavkaId  {number}  – 0 pokud FA-only případ
 *   fakturaId     {number}  – 0 pokud OBJ-only případ
 *   entityType    {string}  – 'OBJ' | 'FA' | 'OBJ_FA'
 *   sectionKey    {string}  – klíč sekce (pro section_kontext)
 *   token         {string}
 *   username      {string}
 */
function FkInlineCell({ objednavkaId = 0, fakturaId = 0, entityType = 'OBJ', sectionKey = '', token, username, onFkLoad }) {
  const [fkData, setFkData] = useState(null);      // {case, udalosti} | null (null = not loaded)
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [komentarText, setKomentarText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [pendingStav, setPendingStav] = useState('');
  const [pendingPriority, setPendingPriority] = useState(1);
  const btnRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});

  const entity = useMemo(
    () => ({ objednavkaId: objednavkaId || 0, fakturaId: fakturaId || 0 }),
    [objednavkaId, fakturaId]
  );

  // ── Lazy load on popover open ──────────────────────────────────────────────
  const loadCase = useCallback(async (forceRefresh = false) => {
    if (!token || !username) return;
    if (loading) return;
    setLoading(true);
    setErr('');
    try {
      const data = await getFkCase(entity, token, username, { forceRefresh });
      setFkData(data); // null or {case, udalosti}
      if (data) {
        setPendingStav(data.case.stav);
        setPendingPriority(data.case.priorita || 1);
      }
      if (onFkLoad) onFkLoad(`${sectionKey}_${objednavkaId}_${fakturaId}`, data?.case?.stav || null);
    } catch (e) {
      // Ignore load errors silently – fallback to "no case"
      setFkData(null);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [entity, token, username, onFkLoad, sectionKey, objednavkaId, fakturaId, loading]);

  // Eager load on mount – zobrazí aktuální stav bez nutnosti kliknout
  useEffect(() => {
    if (token && username) loadCase(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh při každém otevření popoveru (aktuální data)
  useEffect(() => {
    if (open && !loading) {
      loadCase(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Position the popover near the trigger button
  const handleOpen = useCallback(() => {
    if (!btnRef.current) { setOpen(true); return; }
    const rect = btnRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const pW = 380;
    // Horizontální osa – přednostně vpravo, jinak vlevo
    let left = rect.right + 8;
    if (left + pW > vpW - 8) left = rect.left - pW - 8;
    if (left < 8) left = 8;
    // Vertikální osa – nejdřív otevřeme s top (přepočítáme po vykreslení)
    setPopoverStyle({ left, top: rect.top, visibility: 'hidden' });
    setOpen(true);
  }, []);

  // Po vykreslení popoveru (nebo změně obsahu) přepočítám pozici
  useEffect(() => {
    if (!open || !popoverRef.current || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vpH = window.innerHeight;
    const MARGIN = 12;
    // Skutečná výška popovreru – max ohraničena viewportem
    const maxH = vpH - 2 * MARGIN;
    const pH = Math.min(popoverRef.current.scrollHeight, maxH);
    // Místo dole: od bottom buttonu do spodního okraje
    const spaceBelow = vpH - rect.bottom - MARGIN;
    // Místo nahoře: od horního okraje do top buttonu
    const spaceAbove = rect.top - MARGIN;
    let style;
    if (spaceBelow >= pH || spaceBelow >= spaceAbove) {
      // Otevřít dolů
      let top = rect.bottom + 4;
      if (top + pH > vpH - MARGIN) top = vpH - pH - MARGIN;
      if (top < MARGIN) top = MARGIN;
      style = { left: popoverStyle.left, top, bottom: 'auto', visibility: 'visible' };
    } else {
      // Otevřít nahoru
      let bottom = vpH - rect.top + 4;
      if (bottom + pH > vpH - MARGIN) bottom = vpH - MARGIN - (rect.top - pH - 4 < MARGIN ? -(MARGIN - (rect.top - pH - 4)) : 0);
      style = { left: popoverStyle.left, bottom, top: 'auto', visibility: 'visible' };
    }
    setPopoverStyle(style);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fkData, loading]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setKomentarText('');
    setErr('');
  }, []);

  // ── Save stav change ──────────────────────────────────────────────────────
  const handleSaveStav = useCallback(async () => {
    if (!pendingStav || !fkData) return;
    if (pendingStav === fkData.case.stav) {
      handleClose();
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const updated = await fkSetStav(entity, pendingStav, token, username);
      setFkData(updated);
      setPendingPriority(updated.case.priorita || 1);
      // Aktualizuj fkStavMapRef v rodiči → přepočítá filtry (Ignorováno/Vyřešeno)
      if (onFkLoad) onFkLoad(`${sectionKey}_${objednavkaId}_${fakturaId}`, updated.case.stav || null);
      // Zavři popover – řádek může zmizet z tabulky pokud nový stav neodpovídá filtru
      handleClose();
    } catch (e) {
      setErr(e.message || 'Chyba při změně stavu');
    } finally {
      setSaving(false);
    }
  }, [pendingStav, fkData, entity, token, username, handleClose, onFkLoad, sectionKey, objednavkaId, fakturaId]);

  // ── Save priority change ──────────────────────────────────────────────────
  const handleSavePriority = useCallback(async () => {
    if (!fkData) return;
    if (Number(pendingPriority) === Number(fkData.case.priorita)) return;
    setSaving(true);
    setErr('');
    try {
      const updated = await fkUpsert(
        {
          objednavkaId: entity.objednavkaId,
          fakturaId:    entity.fakturaId,
          entityType:   fkData.case.entita_typ,
          sectionKey:   fkData.case.section_kontext,
          stav:         fkData.case.stav,
          priorita:     Number(pendingPriority),
          vyzadujeAkci: !!fkData.case.vyzaduje_akci,
          prirazeno_user_id: fkData.case.prirazeno_user_id || null,
        },
        token, username
      );
      setFkData(updated);
      setPendingPriority(updated.case.priorita || 1);
    } catch (e) {
      setErr(e.message || 'Chyba při změně priority');
    } finally {
      setSaving(false);
    }
  }, [pendingPriority, fkData, entity, token, username]);

  // ── Add comment (+ lazy-create case if needed) ───────────────────────────
  const handleAddKomentar = useCallback(async () => {
    const txt = komentarText.trim();
    if (!txt) return;
    setSaving(true);
    setErr('');
    try {
      if (!fkData) {
        // Lazy create: first action creates the case via upsert
        const created = await fkUpsert(
          { objednavkaId: entity.objednavkaId, fakturaId: entity.fakturaId, entityType, sectionKey, stav: pendingStav || 'OPEN' },
          token, username
        );
        setFkData(created);
        setPendingStav(created.case.stav);
        setPendingPriority(created.case.priorita || 1);
      }
      // Now add the comment
      const updated = await fkAddKomentar(entity, txt, token, username);
      setFkData(updated);
      setKomentarText('');
    } catch (e) {
      setErr(e.message || 'Chyba při ukládání komentáře');
    } finally {
      setSaving(false);
    }
  }, [komentarText, fkData, entity, entityType, sectionKey, pendingStav, token, username]);

  // ── Create case via quick state change ───────────────────────────────────
  const handleQuickCreate = useCallback(async (stav) => {
    setSaving(true);
    setErr('');
    try {
      const created = await fkUpsert(
        { objednavkaId: entity.objednavkaId, fakturaId: entity.fakturaId, entityType, sectionKey, stav },
        token, username
      );
      setFkData(created);
      setPendingStav(created.case.stav);
      setPendingPriority(created.case.priorita || 1);
      // Aktualizuj ref v rodiči → přepočítá filtry
      if (onFkLoad) onFkLoad(`${sectionKey}_${objednavkaId}_${fakturaId}`, created.case.stav || null);
    } catch (e) {
      setErr(e.message || 'Chyba při vytváření případu');
    } finally {
      setSaving(false);
    }
  }, [entity, entityType, sectionKey, token, username, onFkLoad, objednavkaId, fakturaId]);

  // ── Trigger badge ─────────────────────────────────────────────────────────
  const renderTrigger = () => {
    if (!loaded && !fkData) {
      // Initial state — show neutral "FK" button
      return (
        <TriggerBtn ref={btnRef} onClick={handleOpen} title="Finanční kontrola – klikněte pro přidání záznamu">
          FK
        </TriggerBtn>
      );
    }
    if (!fkData) {
      return (
        <TriggerBtn ref={btnRef} onClick={handleOpen} $bgcolor="#f8fafc" $textcolor="#94a3b8" $color="#e2e8f0" title="Žádný záznam – klikněte pro přidání">
          + FK
        </TriggerBtn>
      );
    }
    const stav = fkData.case.stav;
    const bg = FK_STAV_COLORS[stav] || '#90a4ae';
    const commentCount = (fkData.udalosti || []).filter(u => u.typ === 'KOMENTAR').length;
    return (
      <TriggerBtn
        ref={btnRef}
        onClick={handleOpen}
        $bgcolor={bg + '22'}
        $textcolor={bg}
        $color={bg + '66'}
        title={`FK: ${FK_STAV_LABELS[stav] || stav}${commentCount ? ` · ${commentCount} komentář/ů` : ''}`}
      >
        {FK_STAV_LABELS[stav] || stav}
        {commentCount > 0 && <span style={{ background: bg + '44', borderRadius: '3px', padding: '0 4px', fontSize: '0.68rem' }}>{commentCount}</span>}
      </TriggerBtn>
    );
  };

  // ── Popover ───────────────────────────────────────────────────────────────
  const renderPopover = () => {
    if (!open) return null;
    return (
      <>
        <PopoverOverlay onClick={handleClose} />
        <Popover ref={popoverRef} style={popoverStyle}>
          <PopoverTitle>
            <span>FK Sledování</span>
            <CloseBtn onClick={handleClose}>✕</CloseBtn>
          </PopoverTitle>

          {loading && <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Načítám…</div>}

          {!loading && fkData && (
            <>
              <Row>
                <Label>Stav:</Label>
                <StavSelect
                  value={pendingStav}
                  onChange={e => setPendingStav(e.target.value)}
                >
                  {Object.entries(FK_STAV_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </StavSelect>
                {pendingStav !== fkData.case.stav && (
                  <BtnPrimary onClick={handleSaveStav} disabled={saving}>
                    {saving ? '…' : 'Uložit'}
                  </BtnPrimary>
                )}
              </Row>
              <Row>
                <Label>Priorita:</Label>
                <StavSelect
                  value={pendingPriority}
                  onChange={e => setPendingPriority(Number(e.target.value))}
                  style={{ color: FK_PRIORITA_COLORS[pendingPriority] }}
                >
                  {Object.entries(FK_PRIORITA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </StavSelect>
                {Number(pendingPriority) !== Number(fkData.case.priorita) && (
                  <BtnPrimary onClick={handleSavePriority} disabled={saving}>
                    {saving ? '…' : 'Uložit'}
                  </BtnPrimary>
                )}
              </Row>
            </>
          )}

          {!loading && !fkData && loaded && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Žádný záznam. Rychlé vytvoření:</div>
              <Row>
                {['OPEN', 'IN_PROGRESS'].map(s => (
                  <TriggerBtn
                    key={s}
                    onClick={() => handleQuickCreate(s)}
                    $bgcolor={FK_STAV_COLORS[s] + '22'}
                    $textcolor={FK_STAV_COLORS[s]}
                    $color={FK_STAV_COLORS[s] + '66'}
                    disabled={saving}
                  >
                    {FK_STAV_LABELS[s]}
                  </TriggerBtn>
                ))}
              </Row>
            </div>
          )}

          {fkData && fkData.udalosti && fkData.udalosti.length > 0 && (
            <>
              <Divider />
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>
                Historie ({fkData.udalosti.length}):
              </div>
              <JournalList>
                {[...fkData.udalosti].reverse().map(u => (
                  <JournalItem key={u.id}>
                    <JournalMeta>
                      {typLabel(u.typ)} {formatDt(u.dt_vytvoreni)}{u.prijmeni || u.jmeno ? ` · ${[u.prijmeni, u.jmeno].filter(Boolean).join(' ')}` : ''}
                    </JournalMeta>
                    {u.typ === 'ZMENA_STAVU' && (
                      <span>{FK_STAV_LABELS[u.stav_pred] || u.stav_pred} → {FK_STAV_LABELS[u.stav_po] || u.stav_po}</span>
                    )}
                    {u.typ === 'KOMENTAR' && <span>{u.text_zprava}</span>}
                    {u.typ === 'AUTO_SYSTEM' && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{u.text_zprava}</span>}
                    {u.typ === 'ZMENA_PRIORITY' && <span>Priorita: {FK_PRIORITA_LABELS[u.stav_pred] || u.stav_pred} → {FK_PRIORITA_LABELS[u.stav_po] || u.stav_po}</span>}
                    {u.typ === 'PRIRAZENI' && <span>Přiřazení: {u.stav_pred} → {u.stav_po}</span>}
                    {u.typ === 'ZMENA_VYZADUJE_AKCI' && <span>Vyžaduje akci: {u.stav_pred} → {u.stav_po}</span>}
                  </JournalItem>
                ))}
              </JournalList>
            </>
          )}

          <Divider />
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>Přidat komentář:</div>
          <KomentarInput
            value={komentarText}
            onChange={e => setKomentarText(e.target.value)}
            placeholder="Napište komentář…"
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAddKomentar(); } }}
          />
          {err && <ErrMsg>{err}</ErrMsg>}
          <ActionRow>
            <BtnPrimary onClick={handleAddKomentar} disabled={saving || !komentarText.trim()}>
              {saving ? 'Ukládám…' : 'Uložit komentář'}
            </BtnPrimary>
          </ActionRow>
        </Popover>
      </>
    );
  };

  return (
    <CellWrap>
      {renderTrigger()}
      {renderPopover()}
    </CellWrap>
  );
}

export default FkInlineCell;
