/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faUserShield, faCheck, faSpinner, faUser, faSearch,
  faChevronDown, faChevronUp, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { theme } from '../../theme/theme';
import { AuthContext } from '../../context/AuthContext';
import {
  getWidgetPermissions,
  saveWidgetPermissions,
  getUserWidgetPermissions,
  saveUserWidgetPermissions
} from '../../services/apiDashboard';
import { fetchAllUsers } from '../../services/api2auth';

// ============================================================================
// STYLED
// ============================================================================

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
`;

const Panel = styled.div`
  background: #fff; border-radius: 12px;
  width: min(95vw, 900px); max-height: min(80vh, 620px);
  display: flex; flex-direction: column;
  box-shadow: 0 25px 50px rgba(0,0,0,0.25);
`;

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.7rem 1.5rem; border-bottom: 1px solid #e5e7eb;
  h2 { margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
`;

const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #6b7280;
  &:hover { color: #111; }
`;

const TabBar = styled.div`
  display: flex; border-bottom: 1px solid #e5e7eb; padding: 0 1.5rem;
`;

const Tab = styled.button`
  padding: 0.7rem 1.2rem; border: none; background: none; cursor: pointer;
  font-size: 0.85rem; font-weight: 600; color: ${p => p.$active ? theme.colors.primary : '#6b7280'};
  border-bottom: 2px solid ${p => p.$active ? theme.colors.primary : 'transparent'};
  &:hover { color: ${() => theme.colors.primary}; }
`;

const Body = styled.div`
  flex: 1; overflow-y: auto; padding: 0.75rem 1.5rem;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 1.5rem; border-top: 1px solid #e5e7eb;
  background: #f9fafb; border-radius: 0 0 12px 12px;
`;

const InfoText = styled.span`
  font-size: 0.75rem; color: #6b7280; display: flex; align-items: center; gap: 0.4rem;
`;

const SaveBtn = styled.button`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1.2rem; border-radius: 6px; border: none;
  background: ${() => theme.colors.primary}; color: #fff;
  font-weight: 600; cursor: pointer; font-size: 0.85rem;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const CancelBtn = styled.button`
  padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #d1d5db;
  background: #fff; color: #374151; cursor: pointer; font-size: 0.85rem;
  &:hover { background: #f3f4f6; }
`;

// === ROLE TAB ===

const WidgetSection = styled.div`
  margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 8px;
  overflow: hidden;
`;

const WidgetHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 1rem; background: #f9fafb; cursor: pointer;
  &:hover { background: #f3f4f6; }
`;

const WidgetTitle = styled.span`
  font-weight: 600; font-size: 0.85rem; color: #1f2937;
`;

const PermCode = styled.code`
  font-size: 0.68rem; color: #7c3aed; background: #f5f3ff;
  padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace;
  border: 1px solid #ede9fe; margin-left: 0.4rem;
`;

const RoleCount = styled.span`
  font-size: 0.75rem; color: #6b7280; margin-left: 0.5rem;
`;

const RolesGrid = styled.div`
  display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.6rem 1rem;
`;

const RoleChip = styled.label`
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.25rem 0.6rem; border-radius: 6px; cursor: pointer;
  font-size: 0.78rem; font-weight: 500;
  background: ${p => p.$checked ? '#dbeafe' : '#f3f4f6'};
  color: ${p => p.$checked ? '#1d4ed8' : '#6b7280'};
  border: 1px solid ${p => p.$checked ? '#93c5fd' : '#e5e7eb'};
  transition: all 0.15s;
  &:hover { border-color: #93c5fd; }
  input { display: none; }
`;

// === USER TAB ===

const SearchBox = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;
  margin-bottom: 1rem; background: #fff;
  input {
    flex: 1; border: none; outline: none; font-size: 0.85rem;
    &::placeholder { color: #9ca3af; }
  }
`;

const UserList = styled.div`
  display: flex; flex-direction: column; gap: 0.3rem;
  max-height: 180px; overflow-y: auto; margin-bottom: 1rem;
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem;
`;

const UserItem = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer;
  background: ${p => p.$selected ? '#dbeafe' : 'transparent'};
  &:hover { background: ${p => p.$selected ? '#dbeafe' : '#f3f4f6'}; }
  font-size: 0.83rem;
`;

const UserRoleBadge = styled.span`
  font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px;
  background: #f3f4f6; color: #6b7280;
`;

const PermGrid = styled.div`
  display: flex; flex-direction: column; gap: 0.4rem;
`;

const PermRow = styled.label`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; border-radius: 6px;
  border: 1px solid #e5e7eb; cursor: pointer;
  background: ${p => p.$inherited ? '#f0fdf4' : p.$direct ? '#dbeafe' : '#fff'};
  font-size: 0.83rem;
  &:hover { border-color: #93c5fd; }
  input[type="checkbox"] { accent-color: ${() => theme.colors.primary}; }
`;

const PermLabel = styled.span`
  flex: 1; font-weight: 500;
`;

const PermSource = styled.span`
  font-size: 0.7rem; color: ${p => p.$type === 'inherited' ? '#16a34a' : '#2563eb'};
  background: ${p => p.$type === 'inherited' ? '#dcfce7' : '#dbeafe'};
  padding: 0.1rem 0.4rem; border-radius: 4px;
`;

// ============================================================================
// WIDGET LABELS
// ============================================================================

const WIDGET_LABELS = {
  DASHBOARD_ORDERS_STATS:        'Statistiky objednávek',
  DASHBOARD_INVOICES_CONFIRM:    'Faktury k potvrzení',
  DASHBOARD_ORDERS_APPROVE:      'Ke schválení',
  DASHBOARD_INVOICES_OVERDUE:    'Faktury po splatnosti',
  DASHBOARD_INVOICES_DUE_SOON:   'Faktury blížící se spl.',
  DASHBOARD_INVOICES_STATS:      'Statistiky faktur',
  DASHBOARD_ORDERS_REGISTRY:     'Ke zveřejnění (VZ)',
  DASHBOARD_ORDERS_PUBLISHED:    'Zveřejněné objednávky',
  DASHBOARD_SPENDING_CONTRACTS:  'Čerpání smluv',
  DASHBOARD_SPENDING_LP:         'LP přísliby',
  DASHBOARD_CHART_TIMELINE:      'Graf objednávek v čase',
  DASHBOARD_TOP_SUPPLIERS:       'Top dodavatelé',
  DASHBOARD_CHART_MAJETEK:       'Graf majetku podle druhu',
  DASHBOARD_CHART_FEES:          'Graf ročních poplatků'
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function DashboardPermissionsModal({ token, username, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('roles');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Role tab state
  const [prava, setPrava] = useState([]);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [expandedWidgets, setExpandedWidgets] = useState({});

  // User tab state
  const [allUsers, setAllUsers] = useState(null); // cached full list
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPrava, setUserPrava] = useState([]);
  const [userInherited, setUserInherited] = useState([]);
  const [userDirect, setUserDirect] = useState([]);
  const [userDirty, setUserDirty] = useState(false);
  const [userSaving, setUserSaving] = useState(false);

  // Load role matrix
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getWidgetPermissions({ token, username });
        if (res.status === 'success') {
          setPrava(res.data.prava);
          setRoles(res.data.roles);
          setAssignments(res.data.assignments || {});
          // Expand all by default
          const expanded = {};
          (res.data.prava || []).forEach(p => { expanded[p.kod_prava] = true; });
          setExpandedWidgets(expanded);
        }
      } catch (e) {
        console.error('Error loading widget permissions:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, username]);

  // Toggle role for a widget permission
  const toggleRole = useCallback((kodPrava, roleId) => {
    setAssignments(prev => {
      const current = prev[kodPrava] || [];
      const next = current.includes(roleId)
        ? current.filter(id => id !== roleId)
        : [...current, roleId];
      return { ...prev, [kodPrava]: next };
    });
    setDirty(true);
  }, []);

  // Save role matrix
  const handleSaveRoles = useCallback(async () => {
    setSaving(true);
    try {
      const res = await saveWidgetPermissions({ token, username, assignments });
      if (res.status === 'success') {
        setDirty(false);
        if (onSaved) onSaved();
      }
    } catch (e) {
      console.error('Error saving widget permissions:', e);
    } finally {
      setSaving(false);
    }
  }, [token, username, assignments, onSaved]);

  // Search users – load full list once, then filter locally
  const searchUsers = useCallback(async (q) => {
    if (!q || q.length < 2) { setUserResults([]); return; }
    try {
      let users = allUsers;
      if (!users) {
        users = await fetchAllUsers({ token, username });
        setAllUsers(users);
      }
      const lq = q.toLowerCase();
      const filtered = users.filter(u => {
        const name = `${u.jmeno || ''} ${u.prijmeni || ''} ${u.username || ''}`.toLowerCase();
        return name.includes(lq);
      }).slice(0, 20);
      setUserResults(filtered);
    } catch (e) {
      console.error('Error searching users:', e);
      setUserResults([]);
    }
  }, [token, username, allUsers]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [userSearch, searchUsers]);

  // Load user permissions
  const loadUserPerms = useCallback(async (userId) => {
    try {
      const res = await getUserWidgetPermissions({ token, username, target_user_id: userId });
      if (res.status === 'success') {
        setSelectedUser(res.data.user);
        setUserPrava(res.data.prava);
        setUserInherited(res.data.inherited || []);
        setUserDirect(res.data.direct || []);
        setUserDirty(false);
      }
    } catch (e) {
      console.error('Error loading user widget permissions:', e);
    }
  }, [token, username]);

  // Toggle user direct permission
  const toggleUserPerm = useCallback((kodPrava) => {
    setUserDirect(prev => {
      const next = prev.includes(kodPrava)
        ? prev.filter(p => p !== kodPrava)
        : [...prev, kodPrava];
      return next;
    });
    setUserDirty(true);
  }, []);

  // Save user permissions
  const handleSaveUser = useCallback(async () => {
    if (!selectedUser) return;
    setUserSaving(true);
    try {
      const res = await saveUserWidgetPermissions({
        token, username,
        target_user_id: selectedUser.id,
        direct_permissions: userDirect
      });
      if (res.status === 'success') {
        setUserDirty(false);
      }
    } catch (e) {
      console.error('Error saving user widget permissions:', e);
    } finally {
      setUserSaving(false);
    }
  }, [token, username, selectedUser, userDirect]);

  const toggleExpand = (kodPrava) => {
    setExpandedWidgets(prev => ({ ...prev, [kodPrava]: !prev[kodPrava] }));
  };

  // Render
  const portal = document.getElementById('portal-root') || document.body;

  return ReactDOM.createPortal(
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Panel onClick={e => e.stopPropagation()}>
        <Header>
          <h2>
            <FontAwesomeIcon icon={faUserShield} style={{ color: '#7c3aed' }} />
            Správa oprávnění dashboardu
          </h2>
          <CloseBtn onClick={onClose}><FontAwesomeIcon icon={faTimes} /></CloseBtn>
        </Header>

        <TabBar>
          <Tab $active={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>
            Role
          </Tab>
          <Tab $active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            Uživatelé
          </Tab>
        </TabBar>

        <Body>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <FontAwesomeIcon icon={faSpinner} spin /> Načítání...
            </div>
          ) : activeTab === 'roles' ? (
            /* === ROLE TAB === */
            <>
              {prava.map(p => {
                const label = WIDGET_LABELS[p.kod_prava] || p.popis || p.kod_prava;
                const assignedRoles = assignments[p.kod_prava] || [];
                const isExpanded = expandedWidgets[p.kod_prava];
                return (
                  <WidgetSection key={p.kod_prava}>
                    <WidgetHeader onClick={() => toggleExpand(p.kod_prava)}>
                      <div>
                        <WidgetTitle>{label}</WidgetTitle>
                        <PermCode>{p.kod_prava}</PermCode>
                        <RoleCount>({assignedRoles.length} rolí)</RoleCount>
                      </div>
                      <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} style={{ color: '#9ca3af', fontSize: '0.8rem' }} />
                    </WidgetHeader>
                    {isExpanded && (
                      <RolesGrid>
                        {roles.map(r => {
                          const checked = assignedRoles.includes(r.id);
                          return (
                            <RoleChip key={r.id} $checked={checked}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRole(p.kod_prava, r.id)}
                              />
                              {checked && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '0.65rem' }} />}
                              {r.nazev_role}
                            </RoleChip>
                          );
                        })}
                      </RolesGrid>
                    )}
                  </WidgetSection>
                );
              })}
            </>
          ) : (
            /* === USER TAB === */
            <>
              <SearchBox>
                <FontAwesomeIcon icon={faSearch} style={{ color: '#9ca3af' }} />
                <input
                  placeholder="Hledat uživatele..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  autoFocus
                />
              </SearchBox>

              {userResults.length > 0 && !selectedUser && (
                <UserList>
                  {userResults.map(u => (
                    <UserItem key={u.id} onClick={() => loadUserPerms(u.id)}>
                      <FontAwesomeIcon icon={faUser} style={{ color: '#9ca3af', fontSize: '0.8rem' }} />
                      <strong>{u.jmeno} {u.prijmeni}</strong>
                      <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>({u.username})</span>
                    </UserItem>
                  ))}
                </UserList>
              )}

              {selectedUser && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <FontAwesomeIcon icon={faUser} style={{ color: theme.colors.primary }} />
                    <strong>{selectedUser.jmeno} {selectedUser.prijmeni}</strong>
                    <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>({selectedUser.username})</span>
                    {selectedUser.roles?.map(r => (
                      <UserRoleBadge key={r.kod_role}>{r.nazev_role}</UserRoleBadge>
                    ))}
                    <button onClick={() => { setSelectedUser(null); setUserDirect([]); setUserInherited([]); setUserDirty(false); }} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>

                  <PermGrid>
                    {userPrava.map(p => {
                      const label = WIDGET_LABELS[p.kod_prava] || p.popis || p.kod_prava;
                      const isInherited = userInherited.includes(p.kod_prava);
                      const isDirect = userDirect.includes(p.kod_prava);
                      const isActive = isInherited || isDirect;
                      return (
                        <PermRow key={p.kod_prava} $inherited={isInherited && !isDirect} $direct={isDirect}>
                          <input
                            type="checkbox"
                            checked={isDirect}
                            onChange={() => toggleUserPerm(p.kod_prava)}
                          />
                          <PermLabel>{label} <PermCode>{p.kod_prava}</PermCode></PermLabel>
                          {isInherited && <PermSource $type="inherited">z role</PermSource>}
                          {isDirect && <PermSource $type="direct">přímé právo</PermSource>}
                          {!isActive && <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>neaktivní</span>}
                        </PermRow>
                      );
                    })}
                  </PermGrid>
                </>
              )}
            </>
          )}
        </Body>

        <Footer>
          <InfoText>
            <FontAwesomeIcon icon={faInfoCircle} />
            Superadmin a Administrátor vidí vždy všechny widgety.
          </InfoText>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <CancelBtn onClick={onClose}>Zavřít</CancelBtn>
            {activeTab === 'roles' && (
              <SaveBtn onClick={handleSaveRoles} disabled={!dirty || saving}>
                {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                Uložit role
              </SaveBtn>
            )}
            {activeTab === 'users' && selectedUser && (
              <SaveBtn onClick={handleSaveUser} disabled={!userDirty || userSaving}>
                {userSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                Uložit uživatele
              </SaveBtn>
            )}
          </div>
        </Footer>
      </Panel>
    </Overlay>,
    portal
  );
}
