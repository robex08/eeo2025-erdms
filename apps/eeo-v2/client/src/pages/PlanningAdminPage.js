import React, { useEffect, useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faMessage, faPlus, faEdit, faTrash, faSave, faTimes,
  faUsers, faUserTie, faSitemap, faCheckSquare
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

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

  // Form state
  const [formData, setFormData] = useState({
    nazev: '',
    obsah: '', // pro zprávy
    popis: '', // pro události
    dt_od: '',
    dt_do: '',
    pouzit_hierarchii: false,
    hierarchy_profile_id: null,
    prijemci: []
  });

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

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      nazev: '',
      obsah: '',
      popis: '',
      dt_od: '',
      dt_do: '',
      pouzit_hierarchii: false,
      hierarchy_profile_id: null,
      prijemci: []
    });
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
      pouzit_hierarchii: item.pouzit_hierarchii === 1,
      hierarchy_profile_id: item.hierarchy_profile_id || null,
      prijemci: item.prijemci || []
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        pouzit_hierarchii: formData.pouzit_hierarchii ? 1 : 0
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
                    <th>Hierarchie</th>
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
                    {item.pouzit_hierarchii === 1 ? (
                      <Badge $type="role">
                        <FontAwesomeIcon icon={faSitemap} /> {item.hierarchy_profile_nazev || 'Ano'}
                      </Badge>
                    ) : (
                      '-'
                    )}
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
                {editingItem ? 'Upravit' : 'Vytvořit'} {activeTab === 'messages' ? 'zprávu' : 'událost'}
              </ModalTitle>
              <IconButton onClick={() => setModalOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </IconButton>
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
                <CheckboxLabel>
                  <Checkbox
                    type="checkbox"
                    checked={formData.pouzit_hierarchii}
                    onChange={(e) => setFormData({ ...formData, pouzit_hierarchii: e.target.checked })}
                  />
                  <FontAwesomeIcon icon={faSitemap} style={{ marginRight: '0.25rem' }} />
                  Použít organizační hierarchii
                </CheckboxLabel>
              </FormGroup>

              {formData.pouzit_hierarchii && (
                <FormGroup>
                  <Label>Hierarchický profil</Label>
                  <Select
                    value={formData.hierarchy_profile_id || ''}
                    onChange={(e) => setFormData({ ...formData, hierarchy_profile_id: parseInt(e.target.value) || null })}
                  >
                    <option value="">-- Vyberte profil --</option>
                    {/* TODO: Načíst seznam hierarchických profilů z API */}
                  </Select>
                </FormGroup>
              )}

              <FormGroup>
                <Label>Explicitní příjemci</Label>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Výběr konkrétních uživatelů nebo rolí bude implementován v další verzi
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
