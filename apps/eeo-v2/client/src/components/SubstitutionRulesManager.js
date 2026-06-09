import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, X, Info, Users, Shield, Loader, Edit2
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { CustomSelect } from './CustomSelect';
import {
  fetchAllSubstitutionRules,
  createSubstitutionRule,
  deleteSubstitutionRule,
} from '../services/apiSubstitutionRules';
import { fetchManageableUsers } from '../services/apiSubstitution';

// ─── Animace ──────────────────────────────────────────────────────────────────
const spinAnim   = keyframes`from{transform:rotate(0deg);}to{transform:rotate(360deg);}`;
const fadeInUp   = keyframes`from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}`;

// ─── Layout ───────────────────────────────────────────────────────────────────
const Container = styled.div`
  width: 100%;
  animation: ${fadeInUp} 0.3s ease;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PageTitle = styled.div`
  h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    letter-spacing: -0.02em;
  }
  p {
    margin: 0;
    font-size: 0.82rem;
    color: #64748b;
    line-height: 1.5;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardBody = styled.div`
  padding: ${({ $noPadding }) => $noPadding ? '0' : '1.25rem'};
`;

// ─── Tabulka ──────────────────────────────────────────────────────────────────
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const Thead = styled.thead`
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.8rem 1rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
`;

const Td = styled.td`
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
`;

const Tr = styled.tr`
  &:hover { background: #f8fafc; }
  &:last-child td { border-bottom: none; }
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────
const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  border: 1px solid transparent;
  white-space: nowrap;

  ${({ $variant }) => {
    if ($variant === 'primary') return `
      background: #3b82f6;
      color: white;
      &:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.25); }
    `;
    if ($variant === 'danger') return `
      background: #ef4444;
      color: white;
      &:hover:not(:disabled) { background: #dc2626; }
    `;
    if ($variant === 'ghost') return `
      background: transparent;
      color: #64748b;
      &:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
    `;
    return `
      background: white;
      color: #0f172a;
      border-color: #e2e8f0;
      &:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.18s;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    color: #0f172a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// ─── Form ─────────────────────────────────────────────────────────────────────
const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.18s;
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: all 0.18s;
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #334155;
  input {
    cursor: pointer;
  }
`;

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  ${({ $type }) => {
    if ($type === 'user') return 'background: #dbeafe; color: #1e40af;';
    if ($type === 'role') return 'background: #fce7f3; color: #9f1239;';
    if ($type === 'usek') return 'background: #fef3c7; color: #92400e;';
    if ($type === 'lokalita') return 'background: #d1fae5; color: #065f46;';
    return 'background: #f1f5f9; color: #64748b;';
  }}
`;

// ─── Messages ─────────────────────────────────────────────────────────────────
const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: #94a3b8;
  font-size: 0.9rem;
  svg {
    width: 48px;
    height: 48px;
    margin: 0 auto 1rem;
    opacity: 0.3;
  }
`;

const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;

  ${({ $type }) => {
    if ($type === 'error') return `
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    `;
    if ($type === 'success') return `
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    `;
    return `
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    `;
  }}

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const Spinner = styled(Loader)`
  animation: ${spinAnim} 1s linear infinite;
`;

// ─── Komponenta ───────────────────────────────────────────────────────────────
export default function SubstitutionRulesManager({ token, username }) {
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [useky, setUseky] = useState([]);
  const [lokality, setLokality] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    zastupovany_id: '',
    typ_zastupce: 'user',
    zastupce_user_id: '',
    zastupce_role_id: '',
    zastupce_usek_id: '',
    zastupce_lokalita_id: '',
    poznamka: ''
  });

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllSubstitutionRules({ token, username });
      setRules(data);
    } catch (err) {
      setError(err.message || 'Chyba při načítání pravidel');
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  const loadAuxiliaryData = useCallback(async () => {
    try {
      // Načíst uživatele
      const usersData = await fetchManageableUsers({ token, username });
      setUsers(usersData);

      // Načíst role, úseky, lokality (TODO: implement API endpoints)
      // Pro demo použijeme prázdné pole nebo mockdata
      setRoles([]);
      setUseky([]);
      setLokality([]);
    } catch (err) {
      console.error('Chyba při načítání pomocných dat:', err);
    }
  }, [token, username]);

  useEffect(() => {
    loadRules();
    loadAuxiliaryData();
  }, [loadRules, loadAuxiliaryData]);

  // ─── Handle form ──────────────────────────────────────────────────────────
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validace
    if (!formData.zastupovany_id) {
      setError('Vyberte zastupovaného uživatele');
      return;
    }

    let targetId = null;
    if (formData.typ_zastupce === 'user') targetId = formData.zastupce_user_id;
    if (formData.typ_zastupce === 'role') targetId = formData.zastupce_role_id;
    if (formData.typ_zastupce === 'usek') targetId = formData.zastupce_usek_id;
    if (formData.typ_zastupce === 'lokalita') targetId = formData.zastupce_lokalita_id;

    if (!targetId) {
      setError('Vyberte zástupce/skupinu');
      return;
    }

    try {
      await createSubstitutionRule({
        token,
        username,
        ruleData: {
          zastupovany_id: parseInt(formData.zastupovany_id),
          typ_zastupce: formData.typ_zastupce,
        zastupce_user_id: formData.typ_zastupce === 'user' ? parseInt(formData.zastupce_user_id) : null,
          zastupce_role_id: formData.typ_zastupce === 'role' ? parseInt(formData.zastupce_role_id) : null,
          zastupce_usek_id: formData.typ_zastupce === 'usek' ? parseInt(formData.zastupce_usek_id) : null,
          zastupce_lokalita_id: formData.typ_zastupce === 'lokalita' ? parseInt(formData.zastupce_lokalita_id) : null,
          poznamka: formData.poznamka
        }
      });

      setSuccess('Možnost zastupování byla úspěšně vytvořena');
      setShowForm(false);
      setFormData({
        zastupovany_id: '',
        typ_zastupce: 'user',
        zastupce_user_id: '',
        zastupce_role_id: '',
        zastupce_usek_id: '',
        zastupce_lokalita_id: '',
        poznamka: ''
      });
      loadRules();
    } catch (err) {
      setError(err.message || 'Chyba při vytváření možnosti zastupování');
    }
  };

  const handleDelete = (ruleId) => {
    setConfirmDialog({
      open: true,
      title: 'Smazat možnost zastupování?',
      message: 'Tato akce je nevratná. Opravdu chcete smazat tuto možnost zastupování?',
      onConfirm: async () => {
        try {
          await deleteSubstitutionRule({ token, username, ruleId });
          setSuccess('Možnost zastupování byla smazána');
          loadRules();
        } catch (err) {
          setError(err.message || 'Chyba při mazání možnosti zastupování');
        } finally {
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      }
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const userOptions = users.map(u => ({ value: u.id, label: u.cele_jmeno || `${u.jmeno} ${u.prijmeni}` }));
  const roleOptions = roles.map(r => ({ value: r.id, label: r.nazev_role }));
  const usekOptions = useky.map(u => ({ value: u.id, label: u.usek_nazev }));
  const lokalitaOptions = lokality.map(l => ({ value: l.id, label: l.nazev }));

  return (
    <Container>
      <PageHeader>
        <PageTitle>
          <h2>
            <Shield size={24} />
            Možnosti zastupování
          </h2>
          <p>Správa pravidel "kdo může koho zastupovat" na základě uživatelů, rolí, úseků nebo lokalit</p>
        </PageTitle>
        <HeaderActions>
          <Btn $variant="ghost" onClick={loadRules} disabled={loading}>
            <RefreshCw size={16} />
            Obnovit
          </Btn>
          <Btn $variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Zrušit' : 'Nové pravidlo'}
          </Btn>
        </HeaderActions>
      </PageHeader>

      {error && (
        <Alert $type="error">
          <AlertCircle />
          <span>{error}</span>
        </Alert>
      )}

      {success && (
        <Alert $type="success">
          <CheckCircle />
          <span>{success}</span>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Edit2 size={18} />
              Nová možnost zastupování
            </CardTitle>
          </CardHeader>
          <CardBody>
            <FormGroup>
              <Label>Zastupovaný uživatel *</Label>
              <CustomSelect
                value={formData.zastupovany_id}
                onChange={(val) => handleInputChange('zastupovany_id', val)}
                options={userOptions}
                placeholder="Vyberte uživatele"
              />
            </FormGroup>

            <FormGroup>
              <Label>Typ zástupce *</Label>
              <RadioGroup>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="user"
                    checked={formData.typ_zastupce === 'user'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Konkrétní uživatel
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="role"
                    checked={formData.typ_zastupce === 'role'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Celá role
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="usek"
                    checked={formData.typ_zastupce === 'usek'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Celý úsek
                </RadioLabel>
                <RadioLabel>
                  <input
                    type="radio"
                    name="typ_zastupce"
                    value="lokalita"
                    checked={formData.typ_zastupce === 'lokalita'}
                    onChange={(e) => handleInputChange('typ_zastupce', e.target.value)}
                  />
                  Celá lokalita
                </RadioLabel>
              </RadioGroup>
            </FormGroup>

            {formData.typ_zastupce === 'user' && (
              <FormGroup>
                <Label>Zástupce - uživatel *</Label>
                <CustomSelect
                  value={formData.zastupce_user_id}
                  onChange={(val) => handleInputChange('zastupce_user_id', val)}
                  options={userOptions}
                  placeholder="Vyberte uživatele"
                />
              </FormGroup>
            )}

            {formData.typ_zastupce === 'role' && (
              <FormGroup>
                <Label>Zástupce - role *</Label>
                <Alert $type="info">
                  <Info />
                  <span>Endpoint pro načtení rolí zatím není implementován</span>
                </Alert>
              </FormGroup>
            )}

            {formData.typ_zastupce === 'usek' && (
              <FormGroup>
                <Label>Zástupce - úsek *</Label>
                <Alert $type="info">
                  <Info />
                  <span>Endpoint pro načtení úseků zatím není implementován</span>
                </Alert>
              </FormGroup>
            )}

            {formData.typ_zastupce === 'lokalita' && (
              <FormGroup>
                <Label>Zástupce - lokalita *</Label>
                <Alert $type="info">
                  <Info />
                  <span>Endpoint pro načtení lokalit zatím není implementován</span>
                </Alert>
              </FormGroup>
            )}

            <FormGroup>
              <Label>Poznámka</Label>
              <Textarea
                value={formData.poznamka}
                onChange={(e) => handleInputChange('poznamka', e.target.value)}
                placeholder="Volitelná poznámka k tomuto pravidlu"
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Btn onClick={() => setShowForm(false)}>Zrušit</Btn>
              <Btn $variant="primary" onClick={handleSubmit}>
                <Plus size={16} />
                Vytvořit
              </Btn>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <Users size={18} />
            Přehled pravidel ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardBody $noPadding>
          {loading ? (
            <EmptyState>
              <Spinner size={48} />
              <div>Načítání...</div>
            </EmptyState>
          ) : rules.length === 0 ? (
            <EmptyState>
              <Shield />
              <div>Zatím nejsou definována žádná pravidla zastupování</div>
            </EmptyState>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Zastupovaný</Th>
                  <Th>Typ</Th>
                  <Th>Zástupce/Skupina</Th>
                  <Th>Poznámka</Th>
                  <Th style={{ width: '100px', textAlign: 'center' }}>Akce</Th>
                </Tr>
              </Thead>
              <tbody>
                {rules.map((rule) => (
                  <Tr key={rule.id}>
                    <Td>{rule.zastupovany_display}</Td>
                    <Td>
                      <Badge $type={rule.typ_zastupce}>
                        {rule.typ_zastupce === 'user' && 'Uživatel'}
                        {rule.typ_zastupce === 'role' && 'Role'}
                        {rule.typ_zastupce === 'usek' && 'Úsek'}
                        {rule.typ_zastupce === 'lokalita' && 'Lokalita'}
                      </Badge>
                    </Td>
                    <Td>{rule.zastupce_display}</Td>
                    <Td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {rule.poznamka || '—'}
                    </Td>
                    <Td style={{ textAlign: 'center' }}>
                      <IconBtn onClick={() => handleDelete(rule.id)} title="Smazat">
                        <Trash2 />
                      </IconBtn>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {confirmDialog.open && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
          confirmText="Smazat"
          cancelText="Zrušit"
        />
      )}
    </Container>
  );
}
