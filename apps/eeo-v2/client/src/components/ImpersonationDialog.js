import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserSecret, 
  faSearch, 
  faTimes, 
  faExclamationTriangle,
  faCheckCircle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import AuthContext from '../context/AuthContext';
import { fetchUsersList } from '../services/usersApi';
import { startImpersonation } from '../services/impersonationService';

/**
 * 🔍 Helper funkce pro odstranění diakritiky (český specifická mapa)
 * @param {string} str - Text s diakritikou
 * @returns {string} - Text bez diakritiky, lowercase
 */
const removeDiacritics = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[áàâäå]/g, 'a')
    .replace(/[čç]/g, 'c')
    .replace(/[ď]/g, 'd')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[ň]/g, 'n')
    .replace(/[óòôöõ]/g, 'o')
    .replace(/[ř]/g, 'r')
    .replace(/[š]/g, 's')
    .replace(/[ť]/g, 't')
    .replace(/[úùûüů]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[ž]/g, 'z');
};

/**
 * �🔐 ImpersonationDialog - Modal pro výběr uživatele k impersonation
 * 
 * Props:
 * @param {boolean} isOpen - Zobrazit/skrýt dialog
 * @param {function} onClose - Callback při zavření
 * @param {function} onSuccess - Callback po úspěšném přepnutí (vrací {id, username, token, userDetail})
 */

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000000;
  animation: fadeIn 0.25s ease-out;
  pointer-events: auto;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Dialog = styled.div`
  background: white;
  border-radius: 18px;
  max-width: 900px;
  width: 90%;
  max-height: 85vh;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-bottom: 3px solid #3730a3;
  padding: 1.25rem 1.75rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`;

const IconWrapper = styled.div`
  font-size: 1.75rem;
  color: white;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
`;

const Title = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.35rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  flex: 1;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.1rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

const SearchBar = styled.div`
  padding: 1.25rem 1.75rem;
  background: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
  flex-shrink: 0;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 3rem;
  border: 2px solid #dee2e6;
  border-radius: 12px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  &::placeholder {
    color: #adb5bd;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #adb5bd;
  font-size: 1rem;
  pointer-events: none;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: #e9ecef;
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: #dee2e6;
    color: #dc2626;
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
`;

const Content = styled.div`
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
  flex: 1;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f3f5;
  }
  &::-webkit-scrollbar-thumb {
    background: #ced4da;
    border-radius: 5px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #adb5bd;
  }
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: ${props => props.$selected ? '#f0f4ff' : 'white'};
  border-left: 3px solid ${props => props.$selected ? '#6366f1' : 'transparent'};
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 1px solid #e9ecef;
  
  &:hover {
    background: ${props => props.$selected ? '#f0f4ff' : '#f8f9fa'};
    border-left-color: ${props => props.$selected ? '#6366f1' : '#cbd5e1'};
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  overflow: hidden;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: #1e293b;
  min-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserMeta = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  overflow: hidden;
  
  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: ${props => {
    if (props.$role === 'SUPERADMIN') return '#dc2626';
    if (props.$role === 'ADMINISTRATOR') return '#f59e0b';
    return '#6b7280';
  }};
  color: white;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
`;

const RecentSection = styled.div`
  margin-bottom: 1.5rem;
`;

const RecentTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.3;
`;

const EmptyText = styled.div`
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #475569;
`;

const EmptyHint = styled.div`
  font-size: 0.9rem;
  color: #94a3b8;
`;

const ConfirmationPanel = styled.div`
  padding: 1.5rem;
  background: #fff7ed;
  border: 2px solid #fed7aa;
  border-radius: 12px;
  margin-bottom: 1.5rem;
`;

const ConfirmationTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 1.05rem;
  color: #c2410c;
  margin-bottom: 0.75rem;
`;

const ConfirmationText = styled.div`
  font-size: 0.95rem;
  color: #9a3412;
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const TargetUserHighlight = styled.div`
  padding: 1rem;
  background: white;
  border: 2px solid #fdba74;
  border-radius: 8px;
  font-weight: 600;
  color: #1e293b;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #6366f1;
`;

const LoadingIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
`;

const ErrorMessage = styled.div`
  padding: 1rem 1.25rem;
  background: #fee2e2;
  border: 2px solid #fecaca;
  border-radius: 12px;
  color: #991b1b;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Footer = styled.div`
  padding: 1.25rem 1.75rem;
  background: #f8f9fa;
  border-top: 2px solid #e9ecef;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-shrink: 0;
`;

const Button = styled.button`
  padding: 0.875rem 1.75rem;
  border: ${props => props.$variant === 'primary' ? 'none' : '2px solid #dee2e6'};
  border-radius: 10px;
  font-weight: 700;
  background: ${props => {
    if (props.$variant === 'primary') return 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
    if (props.$variant === 'danger') return 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
    return 'white';
  }};
  color: ${props => props.$variant === 'primary' || props.$variant === 'danger' ? 'white' : '#6b7280'};
  cursor: pointer;
  font-size: 0.9375rem;
  box-shadow: ${props => {
    if (props.$variant === 'primary') return '0 4px 12px rgba(99, 102, 241, 0.4)';
    if (props.$variant === 'danger') return '0 4px 12px rgba(220, 38, 38, 0.4)';
    return 'none';
  }};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${props => {
      if (props.$variant === 'primary') return '0 6px 16px rgba(99, 102, 241, 0.5)';
      if (props.$variant === 'danger') return '0 6px 16px rgba(220, 38, 38, 0.5)';
      return '0 2px 8px rgba(0, 0, 0, 0.1)';
    }};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ImpersonationDialog = ({ isOpen, onClose, onSuccess }) => {
  const { user, token, user_id, userDetail } = useContext(AuthContext);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);

  // localStorage klíč pro naposledy použité uživatele
  const RECENT_USERS_KEY = 'impersonation_recent_users';

  // Načíst naposledy použité uživatele z localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentUsers(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.warn('⚠️ Chyba při načítání recent users:', err);
    }
  }, []);

  // Uložit uživatele do recent users (max 3)
  const saveToRecentUsers = (user) => {
    try {
      const newRecent = [
        { 
          id: user.id, 
          jmeno: user.jmeno, 
          prijmeni: user.prijmeni, 
          username: user.username, 
          role_name: user.role_name, 
          email: user.email,
          usek_zkr: user.usek_zkr,
          lokalita_nazev: user.lokalita_nazev
        },
        ...recentUsers.filter(u => u.id !== user.id)
      ].slice(0, 3); // Max 3 položky
      
      localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(newRecent));
      setRecentUsers(newRecent);
    } catch (err) {
      console.warn('⚠️ Chyba při ukládání recent users:', err);
    }
  };

  // Načíst seznam uživatelů při otevření dialogu
  useEffect(() => {
    if (isOpen && token && user?.username) {
      setSearchQuery(''); // Vyčistit vyhledávání při otevření
      setError(null);
      loadUsers();
    }
  }, [isOpen, token, user]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchUsersList(token, user.username);
      
      if (result.success && result.data) {
        // Filtrovat - nesmím se přepnout sám na sebe
        let filteredUsers = result.data.filter(u => u.id !== user_id);
        
        // 🔒 BEZPEČNOST: ADMINISTRATOR nesmí vidět SUPERADMIN uživatele
        // Pouze SUPERADMIN může přepnout na jiného SUPERADMIN
        const currentUserIsSuperAdmin = userDetail?.roles?.some(r => r.kod_role === 'SUPERADMIN') || false;
        
        if (!currentUserIsSuperAdmin) {
          // Pokud aktuální user NENÍ SUPERADMIN, odfiltruj všechny SUPERADMIN uživatele
          filteredUsers = filteredUsers.filter(u => u.role_name !== 'SUPERADMIN');
        }
        
        setUsers(filteredUsers);
      } else {
        throw new Error(result.message || 'Nepodařilo se načíst seznam uživatelů');
      }
    } catch (err) {
      console.error('❌ Chyba při načítání uživatelů:', err);
      setError(err.message || 'Nepodařilo se načíst seznam uživatelů');
    } finally {
      setLoading(false);
    }
  };

  // Filtrování uživatelů podle vyhledávacího dotazu (bez diakritiky, case-insensitive)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = removeDiacritics(searchQuery.trim());

    return users.filter(u => {
      const fullName = removeDiacritics(`${u.jmeno || ''} ${u.prijmeni || ''}`);
      const username = removeDiacritics(u.username || '');
      const email = removeDiacritics(u.email || '');
      const role = removeDiacritics(u.role_name || '');

      return (
        fullName.includes(query) ||
        username.includes(query) ||
        email.includes(query) ||
        role.includes(query)
      );
    });
  }, [users, searchQuery]);

  // Handler pro výběr uživatele - rovnou přepnout bez confirm
  const handleUserSelect = async (selectedUser) => {
    if (!selectedUser || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await startImpersonation(selectedUser.id, token, user.username);

      if (result.success && result.data) {
        // Uložit do recent users
        saveToRecentUsers(selectedUser);
        
        // Úspěšné přepnutí
        if (onSuccess) {
          onSuccess(result.data);
        }
        onClose();
      } else {
        throw new Error(result.message || 'Nepodařilo se přepnout na uživatele');
      }
    } catch (err) {
      console.error('❌ Chyba při přepnutí na uživatele:', err);
      setError(err.message || 'Nepodařilo se přepnout na uživatele');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset při zavření
  const handleClose = () => {
    if (!submitting) {
      setSearchQuery('');
      setError(null);
      setLoading(false);
      onClose();
    }
  };

  // Klávesové zkratky
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape' && !submitting) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting]);

  if (!isOpen) return null;

  return createPortal(
    <Overlay>
      <Dialog>
        <Header>
          <IconWrapper>
            <FontAwesomeIcon icon={faUserSecret} />
          </IconWrapper>
          <Title>Přepnout na uživatele</Title>
          <CloseButton onClick={handleClose} disabled={submitting}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </Header>

        <SearchBar>
          <SearchInputWrapper>
            <SearchIcon>
              <FontAwesomeIcon icon={faSearch} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Hledat podle jména, username, emailu nebo role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading || submitting}
            />
            {searchQuery && (
              <ClearButton
                onClick={() => setSearchQuery('')}
                title="Vymazat vyhledávání"
              >
                <FontAwesomeIcon icon={faTimes} />
              </ClearButton>
            )}
          </SearchInputWrapper>
        </SearchBar>

        <Content>
          {error && (
            <ErrorMessage>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {error}
            </ErrorMessage>
          )}

          {loading ? (
            <LoadingState>
              <LoadingIcon>
                <FontAwesomeIcon icon={faSpinner} />
              </LoadingIcon>
              <LoadingText>Načítám uživatele...</LoadingText>
            </LoadingState>
          ) : filteredUsers.length === 0 ? (
            <EmptyState>
              <EmptyIcon>🔍</EmptyIcon>
              <EmptyText>
                {searchQuery ? 'Žádní uživatelé nenalezeni' : 'Nejsou dostupní žádní uživatelé'}
              </EmptyText>
              <EmptyHint>
                {searchQuery ? 'Zkuste změnit vyhledávací dotaz' : 'Kontaktujte administrátora'}
              </EmptyHint>
            </EmptyState>
          ) : (
            <>
              {/* Naposledy použití - zobrazit jen pokud není aktivní vyhledávání a máme recent users */}
              {!searchQuery && recentUsers.length > 0 && (
                <RecentSection>
                  <RecentTitle>⏱️ Naposledy použití</RecentTitle>
                  <RecentList>
                    {recentUsers.map(u => (
                      <UserCard
                        key={u.id}
                        onClick={() => {
                          const fullUser = users.find(usr => usr.id === u.id);
                          if (fullUser) handleUserSelect(fullUser);
                        }}
                      >
                        <UserInfo>
                          <UserName>{u.jmeno} {u.prijmeni}</UserName>
                          <UserMeta>
                            <span>@{u.username}</span>
                            {u.email && <span>{u.email}</span>}
                            {u.usek_zkr && <span>| {u.usek_zkr}</span>}
                            {u.lokalita_nazev && <span>| {u.lokalita_nazev}</span>}
                          </UserMeta>
                        </UserInfo>
                        {u.role_name && (
                          <RoleBadge $role={u.role_name}>
                            {u.role_name}
                          </RoleBadge>
                        )}
                      </UserCard>
                    ))}
                  </RecentList>
                </RecentSection>
              )}

              <UsersList>
                {filteredUsers.map(u => (
                  <UserCard
                    key={u.id}
                    onClick={() => handleUserSelect(u)}
                  >
                    <UserInfo>
                      <UserName>{u.jmeno} {u.prijmeni}</UserName>
                      <UserMeta>
                        <span>@{u.username}</span>
                        {u.email && <span>{u.email}</span>}
                        {u.usek_zkr && <span>| {u.usek_zkr}</span>}
                        {u.lokalita_nazev && <span>| {u.lokalita_nazev}</span>}
                      </UserMeta>
                    </UserInfo>
                    {u.role_name && (
                      <RoleBadge $role={u.role_name}>
                        {u.role_name}
                      </RoleBadge>
                    )}
                  </UserCard>
                ))}
              </UsersList>
            </>
          )}
        </Content>

        <Footer>
          <Button onClick={handleClose} disabled={loading || submitting}>
            <FontAwesomeIcon icon={faTimes} />
            Zrušit
          </Button>
        </Footer>
      </Dialog>
    </Overlay>,
    document.body
  );
};

export default ImpersonationDialog;
