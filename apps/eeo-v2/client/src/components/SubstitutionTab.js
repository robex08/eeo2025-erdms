import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { UserCheck, Plus, Trash2, Calendar, RefreshCw, AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import {
  fetchMySubstitutions,
  createSubstitution,
  deactivateSubstitution,
  fetchSubstitutionCandidates,
  fetchCurrentlySubstituting,
} from '../services/apiSubstitution';

// ─── Animace ───────────────────────────────────────────────────────────────────
const spinAnim = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;

// ─── Styled komponenty ──────────────────────────────────────────────────────────
const Container = styled.div`width: 100%;`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  animation: ${fadeIn} 0.3s ease;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $variant }) => $variant === 'danger' ? '#ef4444' : $variant === 'secondary' ? '#f1f5f9' : '#3b82f6'};
  color: ${({ $variant }) => $variant === 'secondary' ? '#64748b' : 'white'};
  &:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const Spin = styled(RefreshCw)`
  animation: ${spinAnim} 1s linear infinite;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.95rem;
`;

const SubstList = styled.div`display: flex; flex-direction: column; gap: 0.75rem;`;

const SubstCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${({ $active }) => $active ? '#f0fdf4' : '#fafafa'};
  border-left: 4px solid ${({ $active }) => $active ? '#22c55e' : '#cbd5e1'};
`;

const SubstInfo = styled.div`flex: 1;`;

const SubstName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
`;

const SubstMeta = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $color }) => $color || '#e2e8f0'};
  color: ${({ $textColor }) => $textColor || '#475569'};
`;

// ─── Form ──────────────────────────────────────────────────────────────────────
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Input = styled.input`
  padding: 0.6rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1e293b;
  transition: border-color 0.2s;
  &:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
`;

const Select = styled.select`
  padding: 0.6rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1e293b;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
`;

const Textarea = styled.textarea`
  padding: 0.6rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1e293b;
  resize: vertical;
  min-height: 70px;
  &:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  input { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
`;

const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  background: ${({ $type }) => $type === 'error' ? '#fef2f2' : $type === 'success' ? '#f0fdf4' : '#eff6ff'};
  color: ${({ $type }) => $type === 'error' ? '#dc2626' : $type === 'success' ? '#16a34a' : '#2563eb'};
  border: 1px solid ${({ $type }) => $type === 'error' ? '#fecaca' : $type === 'success' ? '#bbf7d0' : '#bfdbfe'};
`;

const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
  justify-content: flex-end;
`;

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('cs-CZ');
  } catch {
    return dateStr;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isActiveSubstitution(sub) {
  const now = today();
  return sub.aktivni === 1 && sub.dt_od <= now && sub.dt_do >= now;
}

function isFutureSubstitution(sub) {
  return sub.aktivni === 1 && sub.dt_od > today();
}

const OPRAVNENI_LABELS = {
  view: 'Zobrazit doklady',
  approve: 'Schvalovat',
  confirm: 'Potvrzovat',
};

// ─── Hlavní komponenta ──────────────────────────────────────────────────────────
/**
 * SubstitutionTab – záložka zastupování v ProfilePage
 * Zobrazí:
 *   - Moje nastavená zastupování (kde jsem zastupovaný)
 *   - Koho aktuálně zastupuji já (informační)
 *   - Formulář pro přidání nového zastupování
 */
export default function SubstitutionTab({ token, username, showToast }) {
  const [substitutions, setSubstitutions] = useState([]);
  const [currentlySub, setCurrentlySub] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(null);

  const [form, setForm] = useState({
    zastupce_id: '',
    dt_od: today(),
    dt_do: '',
    opravneni: { view: true, approve: false, confirm: false },
    popis: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, curr, cands] = await Promise.all([
        fetchMySubstitutions({ token, username }),
        fetchCurrentlySubstituting({ token, username }),
        fetchSubstitutionCandidates({ token, username }),
      ]);
      setSubstitutions(subs);
      setCurrentlySub(curr);
      setCandidates(cands);
    } catch (e) {
      showToast && showToast('error', 'Nepodařilo se načíst data zastupování: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [token, username, showToast]);

  useEffect(() => { load(); }, [load]);

  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleOpravneniChange(key, checked) {
    setForm(prev => ({
      ...prev,
      opravneni: { ...prev.opravneni, [key]: checked },
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');

    if (!form.zastupce_id) { setFormError('Vyberte zástupce.'); return; }
    if (!form.dt_od || !form.dt_do) { setFormError('Vyplňte datum od a do.'); return; }
    if (form.dt_od >= form.dt_do) { setFormError('Datum od musí být před datem do.'); return; }
    const opravneni = {};
    Object.keys(form.opravneni).forEach(k => { opravneni[k] = form.opravneni[k] ? 1 : 0; });
    if (!Object.values(opravneni).some(v => v === 1)) {
      setFormError('Vyberte alespoň jedno oprávnění pro zástupce.');
      return;
    }

    setFormSaving(true);
    try {
      await createSubstitution({
        token,
        username,
        zastupce_id: parseInt(form.zastupce_id, 10),
        dt_od: form.dt_od,
        dt_do: form.dt_do,
        opravneni,
        popis: form.popis || null,
      });
      showToast && showToast('success', 'Zastupování bylo úspěšně nastaveno.');
      setShowForm(false);
      setForm({ zastupce_id: '', dt_od: today(), dt_do: '', opravneni: { view: true, approve: false, confirm: false }, popis: '' });
      await load();
    } catch (e) {
      setFormError(e.message || 'Nepodařilo se uložit zastupování.');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeactivate(sub) {
    if (!window.confirm(`Opravdu zrušit zastupování?`)) return;
    setDeactivating(sub.id);
    try {
      await deactivateSubstitution({ token, username, id: sub.id });
      showToast && showToast('success', 'Zastupování bylo zrušeno.');
      await load();
    } catch (e) {
      showToast && showToast('error', 'Chyba při rušení zastupování: ' + e.message);
    } finally {
      setDeactivating(null);
    }
  }

  if (loading) {
    return (
      <Section style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
        <Spin size={28} />
        <div style={{ marginTop: '0.75rem' }}>Načítám data zastupování…</div>
      </Section>
    );
  }

  const activeAndFuture = substitutions.filter(s => s.aktivni === 1);
  const past = substitutions.filter(s => s.aktivni === 0);

  return (
    <Container>

      {/* ── Kdo aktuálně zastupuje mě ─────────────────────────────────────── */}
      {currentlySub.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>
              <UserCheck size={18} color="#22c55e" />
              Kdo mě nyní zastupuje
            </SectionTitle>
          </SectionHeader>
          <SubstList>
            {currentlySub.map(s => (
              <SubstCard key={s.id} $active={true}>
                <UserCheck size={22} color="#22c55e" />
                <SubstInfo>
                  <SubstName>{s.zastupce_jmeno} {s.zastupce_prijmeni}</SubstName>
                  <SubstMeta>
                    <span><Calendar size={12} /> {formatDate(s.dt_od)} – {formatDate(s.dt_do)}</span>
                    {Object.entries(_substitution_decode_opravneni_fe(s.opravneni)).filter(([,v]) => v).map(([k]) => (
                      <Badge key={k} $color="#dcfce7" $textColor="#15803d">{OPRAVNENI_LABELS[k] || k}</Badge>
                    ))}
                  </SubstMeta>
                </SubstInfo>
                <Badge $color="#dcfce7" $textColor="#15803d">Aktivní</Badge>
              </SubstCard>
            ))}
          </SubstList>
        </Section>
      )}

      {/* ── Moje nastavená zastupování ────────────────────────────────────── */}
      <Section>
        <SectionHeader>
          <SectionTitle>
            <UserCheck size={18} color="#3b82f6" />
            Moje zastupování
          </SectionTitle>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ActionBtn $variant="secondary" onClick={load} title="Obnovit">
              <RefreshCw size={15} />
            </ActionBtn>
            {!showForm && (
              <ActionBtn onClick={() => setShowForm(true)}>
                <Plus size={15} />
                Přidat zastupování
              </ActionBtn>
            )}
          </div>
        </SectionHeader>

        {/* Formulář pro přidání */}
        {showForm && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
            <SectionTitle style={{ marginBottom: '1rem' }}>
              <Plus size={16} /> Nové zastupování
            </SectionTitle>
            {formError && (
              <Alert $type="error">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {formError}
              </Alert>
            )}
            <form onSubmit={handleCreate}>
              <FormGrid>
                <FormGroup style={{ gridColumn: '1 / -1' }}>
                  <Label>Zástupce *</Label>
                  <Select
                    value={form.zastupce_id}
                    onChange={e => handleFormChange('zastupce_id', e.target.value)}
                  >
                    <option value="">— Vyberte zástupce —</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.cele_jmeno || `${c.jmeno} ${c.prijmeni}`} ({c.username})
                      </option>
                    ))}
                  </Select>
                  {candidates.length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: 4 }}>
                      <AlertCircle size={12} style={{ marginRight: 4 }} />
                      Žádní uživatelé s oprávněním být zástupcem nejsou k dispozici.
                    </div>
                  )}
                </FormGroup>

                <FormGroup>
                  <Label>Datum od *</Label>
                  <Input
                    type="date"
                    value={form.dt_od}
                    min={today()}
                    onChange={e => handleFormChange('dt_od', e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Datum do *</Label>
                  <Input
                    type="date"
                    value={form.dt_do}
                    min={form.dt_od || today()}
                    onChange={e => handleFormChange('dt_do', e.target.value)}
                  />
                </FormGroup>

                <FormGroup style={{ gridColumn: '1 / -1' }}>
                  <Label>Oprávnění zástupce *</Label>
                  <CheckboxGroup>
                    {Object.keys(form.opravneni).map(key => (
                      <CheckboxLabel key={key}>
                        <input
                          type="checkbox"
                          checked={!!form.opravneni[key]}
                          onChange={e => handleOpravneniChange(key, e.target.checked)}
                        />
                        {OPRAVNENI_LABELS[key] || key}
                      </CheckboxLabel>
                    ))}
                  </CheckboxGroup>
                </FormGroup>

                <FormGroup style={{ gridColumn: '1 / -1' }}>
                  <Label>Poznámka (volitelně)</Label>
                  <Textarea
                    value={form.popis}
                    onChange={e => handleFormChange('popis', e.target.value)}
                    placeholder="Např. dovolená, nemoc, pracovní cesta…"
                  />
                </FormGroup>
              </FormGrid>

              <FormActions>
                <ActionBtn
                  type="button"
                  $variant="secondary"
                  onClick={() => { setShowForm(false); setFormError(''); }}
                  disabled={formSaving}
                >
                  <X size={15} /> Zrušit
                </ActionBtn>
                <ActionBtn type="submit" disabled={formSaving}>
                  {formSaving ? <Spin size={15} /> : <CheckCircle size={15} />}
                  Uložit zastupování
                </ActionBtn>
              </FormActions>
            </form>
          </div>
        )}

        {/* Aktivní a budoucí */}
        {activeAndFuture.length === 0 && !showForm && (
          <EmptyState>
            <UserCheck size={36} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <div>Nemáte nastaveno žádné zastupování.</div>
            <div style={{ marginTop: 4, fontSize: '0.8rem' }}>
              Zastupující uživatel získá přístup k vašim dokladům po dobu vaší nepřítomnosti.
            </div>
          </EmptyState>
        )}

        {activeAndFuture.length > 0 && (
          <SubstList>
            {activeAndFuture.map(sub => {
              const isAct = isActiveSubstitution(sub);
              const isFut = isFutureSubstitution(sub);
              const opravneni = sub.opravneni || {};
              return (
                <SubstCard key={sub.id} $active={isAct}>
                  <UserCheck size={22} color={isAct ? '#22c55e' : '#94a3b8'} />
                  <SubstInfo>
                    <SubstName>
                      {sub.zastupce?.jmeno} {sub.zastupce?.prijmeni}
                      {sub.zastupce?.username && (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                          ({sub.zastupce.username})
                        </span>
                      )}
                    </SubstName>
                    <SubstMeta>
                      <span><Calendar size={12} /> {formatDate(sub.dt_od)} – {formatDate(sub.dt_do)}</span>
                      {Object.entries(opravneni).filter(([,v]) => v).map(([k]) => (
                        <Badge key={k} $color="#dbeafe" $textColor="#1d4ed8">{OPRAVNENI_LABELS[k] || k}</Badge>
                      ))}
                      {sub.popis && <span style={{ fontStyle: 'italic' }}>{sub.popis}</span>}
                    </SubstMeta>
                  </SubstInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isAct && <Badge $color="#dcfce7" $textColor="#15803d">Aktivní</Badge>}
                    {isFut && <Badge $color="#fef9c3" $textColor="#a16207">Plánované</Badge>}
                    <ActionBtn
                      $variant="danger"
                      onClick={() => handleDeactivate(sub)}
                      disabled={deactivating === sub.id}
                      title="Zrušit zastupování"
                      style={{ padding: '0.4rem 0.6rem' }}
                    >
                      {deactivating === sub.id ? <Spin size={14} /> : <Trash2 size={14} />}
                    </ActionBtn>
                  </div>
                </SubstCard>
              );
            })}
          </SubstList>
        )}
      </Section>

      {/* ── Historická zastupování ─────────────────────────────────────────── */}
      {past.length > 0 && (
        <Section>
          <SectionTitle style={{ marginBottom: '1rem', color: '#64748b' }}>
            <Info size={16} /> Ukončená zastupování
          </SectionTitle>
          <SubstList>
            {past.map(sub => (
              <SubstCard key={sub.id} $active={false}>
                <UserCheck size={20} color="#94a3b8" />
                <SubstInfo>
                  <SubstName style={{ color: '#64748b' }}>
                    {sub.zastupce?.jmeno} {sub.zastupce?.prijmeni}
                  </SubstName>
                  <SubstMeta>
                    <span><Calendar size={11} /> {formatDate(sub.dt_od)} – {formatDate(sub.dt_do)}</span>
                    {sub.popis && <span style={{ fontStyle: 'italic' }}>{sub.popis}</span>}
                  </SubstMeta>
                </SubstInfo>
                <Badge $color="#f1f5f9" $textColor="#94a3b8">Ukončeno</Badge>
              </SubstCard>
            ))}
          </SubstList>
        </Section>
      )}
    </Container>
  );
}

/** Pomocná FE funkce pro dekódování opravneni (může přijít jako string nebo object) */
function _substitution_decode_opravneni_fe(opravneni) {
  if (!opravneni) return {};
  if (typeof opravneni === 'string') {
    try { return JSON.parse(opravneni); } catch { return {}; }
  }
  return opravneni;
}
