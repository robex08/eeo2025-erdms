import React, { useEffect, useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faMessage, faPlus, faEdit, faTrash, faSave, faTimes,
  faUsers, faUserTie, faSitemap, faCheckSquare, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import * as planningApi from '../services/planningApi';
import { prettyDate } from '../utils/format';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const TabContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1rem;
`;

const TabHeader = styled.div`
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;

  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button`
  flex: 0 0 auto;
  min-width: 160px;
  padding: 0.6rem 1.2rem;
  background: ${props => props.$active ? 'white' : 'transparent'};
  border: none;
  border-bottom: 3px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;

  &:hover {
    background: ${props => props.$active ? 'white' : '#f1f5f9'};
    color: ${props => props.$active ? '#3b82f6' : '#3b82f6'};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
`;

const ContentArea = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: ${props => props.$variant === 'danger' ? '#dc2626' : props.$variant === 'secondary' ? '#6b7280' : '#3b82f6'};
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$variant === 'danger' ? '#b91c1c' : props.$variant === 'secondary' ? '#4b5563' : '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  thead {
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
    text-transform: uppercase;
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    color: #4b5563;
  }

  tbody tr:hover {
    background: #f9fafb;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    if (props.$type === 'role') return '#dbeafe';
    if (props.$type === 'user') return '#dcfce7';
    return '#f3f4f6';
  }};
  color: ${props => {
    if (props.$type === 'role') return '#1e40af';
    if (props.$type === 'user') return '#166534';
    return '#374151';
  }};
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$variant === 'danger' ? '#dc2626' : '#6b7280'};
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.$variant === 'danger' ? '#fef2f2' : '#f3f4f6'};
    color: ${props => props.$variant === 'danger' ? '#b91c1c' : '#374151'};
  }
`;

// Animace
const fadeInBg = `
  @keyframes fadeInBg {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const slideInUp = `
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeInBg 0.2s ease;

  @keyframes fadeInBg {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 620px;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.15);
  animation: slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
`;

const ModalTitle = styled.div`
  h3 {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
    font-weight: 700;
  }
  p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.82;
  }
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  background: #fafafa;
  flex-shrink: 0;
`;

const FormGroup = styled.div`
  margin-bottom: 1.1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.875rem;
  color: #1e293b;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.875rem;
  color: #1e293b;
  resize: vertical;
  min-height: 68px;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.875rem;
  color: #1e293b;
  background: white;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
`;

// Recipients Selection Components
const RecipientsList = styled.div`
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background: #fafafa;
`;

const RecipientItem = styled.label`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.875rem;
  color: #1e293b;

  &:hover {
    background: #f3f4f6;
  }

  input[type="checkbox"] {
    margin-right: 0.5rem;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const RecipientName = styled.span`
  flex: 1;
  font-weight: 500;
`;

const RecipientDetail = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  margin-left: 0.5rem;
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PlanningAdminPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'events'
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Seznamy pro výběr příjemců
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    nazev: '',
    obsah: '', // pro zprávy
    popis: '', // pro události
    dt_od: '',
    dt_do: '',
    prijemci: []
  });
  
  // Vybraní příjemci (separátní state pro lepší UX)
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Kontrola oprávnění
  useEffect(() => {
    if (!hasPermission('PLANNING_MANAGE')) {
      showToast('Nemáte oprávnění ke správě plánování', 'error');
      return;
    }
  }, [hasPermission, showToast]);

  // Načtení dat
  useEffect(() => {
    if (hasPermission('PLANNING_MANAGE')) {
      loadData();
    }
  }, [activeTab, hasPermission]);

  // Načtení seznamu rolí a uživatelů při otevření modálu
  useEffect(() => {
    if (modalOpen) {
      loadRecipientOptions();
    }
  }, [modalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'messages') {
        const response = await planningApi.getMessagesList();
        setMessages(response.data || []);
      } else {
        const response = await planningApi.getEventsList();
        setEvents(response.data || []);
      }
    } catch (error) {
      console.error('❌ Chyba načítání dat:', error);
      showToast('Chyba při načítání dat', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientOptions = async () => {
    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        planningApi.getActiveRoles(),
        planningApi.getActiveUsers()
      ]);
      
      setAvailableRoles(rolesResponse.data || []);
      setAvailableUsers(usersResponse.data || []);
    } catch (error) {
      console.error('❌ Chyba načítání příjemců:', error);
      showToast('Chyba při načítání seznamu příjemců', 'error');
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      nazev: '',
      obsah: '',
      popis: '',
      dt_od: '',
      dt_do: '',
      prijemci: []
    });
    setSelectedRoles([]);
    setSelectedUsers([]);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nazev: item.nazev || '',
      obsah: item.obsah || '',
      popis: item.popis || '',
      dt_od: item.dt_od || '',
      dt_do: item.dt_do || '',
      prijemci: item.prijemci || []
    });
    
    // TODO: Načíst existující příjemce z DB (pokud jsou v item.prijemci)
    // Pro teď vynulujeme - v další iteraci načteme z DB
    setSelectedRoles([]);
    setSelectedUsers([]);
    
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      // Sestavit pole prijemci z vybraných rolí a uživatelů
      const prijemci = [
        ...selectedRoles.map(roleId => ({
          typ_prijemce: 'role',
          kod_role: availableRoles.find(r => r.id === parseInt(roleId))?.kod_role,
          user_id: null
        })),
        ...selectedUsers.map(userId => ({
          typ_prijemce: 'user',
          kod_role: null,
          user_id: parseInt(userId)
        }))
      ];
      
      const data = { 
        ...formData,
        prijemci 
      };

      if (activeTab === 'messages') {
        if (editingItem) {
          await planningApi.updateMessage(editingItem.id, data);
          showToast('Zpráva aktualizována', 'success');
        } else {
          await planningApi.createMessage(data);
          showToast('Zpráva vytvořena', 'success');
        }
      } else {
        if (editingItem) {
          await planningApi.updateEvent(editingItem.id, data);
          showToast('Událost aktualizována', 'success');
        } else {
          await planningApi.createEvent(data);
          showToast('Událost vytvořena', 'success');
        }
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('❌ Chyba ukládání:', error);
      showToast('Chyba při ukládání', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Opravdu chcete smazat tuto položku?')) {
      return;
    }

    try {
      if (activeTab === 'messages') {
        await planningApi.deleteMessage(id);
        showToast('Zpráva smazána', 'success');
      } else {
        await planningApi.deleteEvent(id);
        showToast('Událost smazána', 'success');
      }
      loadData();
    } catch (error) {
      console.error('❌ Chyba mazání:', error);
      showToast('Chyba při mazání', 'error');
    }
  };

  const currentData = activeTab === 'messages' ? messages : events;

  if (!hasPermission('PLANNING_MANAGE')) {
    return (
      <PageContainer>
        <EmptyState>
          <FontAwesomeIcon icon={faCalendarAlt} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <div>Nemáte oprávnění ke správě plánování</div>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TitlePanel>
        <PageTitle>
          <FontAwesomeIcon icon={faCalendarAlt} />
          Správa plánování a rezervací
        </PageTitle>
      </TitlePanel>

      <TabContainer>
        <TabHeader>
          <Tab $active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>
            <FontAwesomeIcon icon={faMessage} />
            Dashboard zprávy
          </Tab>
          <Tab $active={activeTab === 'events'} onClick={() => setActiveTab('events')}>
            <FontAwesomeIcon icon={faCalendarAlt} />
            Kalendářové události
          </Tab>
        </TabHeader>

        <ContentArea>
          <ActionBar>
            <Button onClick={handleCreate}>
              <FontAwesomeIcon icon={faPlus} />
              {activeTab === 'messages' ? 'Nová zpráva' : 'Nová událost'}
            </Button>
          </ActionBar>

          {loading ? (
            <EmptyState>Načítání...</EmptyState>
          ) : currentData.length === 0 ? (
            <EmptyState>
              {activeTab === 'messages' ? 'Žádné zprávy' : 'Žádné události'}
            </EmptyState>
          ) : (
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Název</th>
                    <th>{activeTab === 'messages' ? 'Obsah' : 'Popis'}</th>
                    <th>Datum od</th>
                    <th>Datum do</th>
                    <th>Příjemci</th>
                    <th>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.nazev}</strong></td>
                  <td>
                    {activeTab === 'messages' 
                      ? (item.obsah || '').substring(0, 50) + (item.obsah?.length > 50 ? '...' : '')
                      : (item.popis || '').substring(0, 50) + (item.popis?.length > 50 ? '...' : '')
                    }
                  </td>
                  <td>{item.dt_od ? prettyDate(item.dt_od) : '-'}</td>
                  <td>{item.dt_do ? prettyDate(item.dt_do) : '-'}</td>
                  <td>
                    <Badge $type="user">{item.pocet_prijemcu || 0}</Badge>
                  </td>
                  <td>
                    <IconButton onClick={() => handleEdit(item)} title="Upravit">
                      <FontAwesomeIcon icon={faEdit} />
                    </IconButton>
                    <IconButton $variant="danger" onClick={() => handleDelete(item.id)} title="Smazat">
                      <FontAwesomeIcon icon={faTrash} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </TableContainer>
        )}
        </ContentArea>
      </TabContainer>

      {/* Modal pro vytváření/editaci */}
      {modalOpen && (
        <ModalOverlay onClick={() => setModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <h3>
                  {editingItem ? 'Upravit' : 'Vytvořit'} {activeTab === 'messages' ? 'zprávu' : 'událost'}
                </h3>
                <p>Vyplňte požadované informace</p>
              </ModalTitle>
              <CloseBtn onClick={() => setModalOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseBtn>
            </ModalHeader>

            <ModalBody>
              <FormGroup>
                <Label>Název *</Label>
                <Input
                  type="text"
                  value={formData.nazev}
                  onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
                  placeholder="Zadejte název"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>{activeTab === 'messages' ? 'Obsah *' : 'Popis'}</Label>
                <Textarea
                  value={activeTab === 'messages' ? formData.obsah : formData.popis}
                  onChange={(e) => 
                    setFormData({ 
                      ...formData, 
                      [activeTab === 'messages' ? 'obsah' : 'popis']: e.target.value 
                    })
                  }
                  placeholder={activeTab === 'messages' ? 'Zadejte obsah zprávy' : 'Zadejte popis události'}
                />
              </FormGroup>

              <FormGroup>
                <Label>Datum od</Label>
                <Input
                  type="datetime-local"
                  value={formData.dt_od}
                  onChange={(e) => setFormData({ ...formData, dt_od: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Datum do</Label>
                <Input
                  type="datetime-local"
                  value={formData.dt_do}
                  onChange={(e) => setFormData({ ...formData, dt_do: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Role (příjemci)</Label>
                <RecipientsList>
                  {availableRoles.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem' }}>
                      Načítání...
                    </div>
                  ) : (
                    availableRoles.map(role => (
                      <RecipientItem key={role.id}>
                        <input
                          type="checkbox"
                          value={role.id}
                          checked={selectedRoles.includes(role.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role.id.toString()]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role.id.toString()));
                            }
                          }}
                        />
                        <RecipientName>{role.nazev_role}</RecipientName>
                        <RecipientDetail>{role.kod_role}</RecipientDetail>
                      </RecipientItem>
                    ))
                  )}
                </RecipientsList>
              </FormGroup>

              <FormGroup>
                <Label>Konkrétní uživatelé (příjemci)</Label>
                <RecipientsList>
                  {availableUsers.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem' }}>
                      Načítání...
                    </div>
                  ) : (
                    availableUsers.map(user => (
                      <RecipientItem key={user.id}>
                        <input
                          type="checkbox"
                          value={user.id}
                          checked={selectedUsers.includes(user.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id.toString()]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(u => u !== user.id.toString()));
                            }
                          }}
                        />
                        <RecipientName>{user.prijmeni} {user.jmeno}</RecipientName>
                        <RecipientDetail>{user.email}</RecipientDetail>
                      </RecipientItem>
                    ))
                  )}
                </RecipientsList>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '0.25rem' }} />
                  Organizační hierarchie je řízena globálním nastavením systému
                </div>
              </FormGroup>
            </ModalBody>

            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={!formData.nazev || (activeTab === 'messages' && !formData.obsah)}>
                <FontAwesomeIcon icon={faSave} />
                Uložit
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default PlanningAdminPage;
