import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, faBell, faEnvelope, faSitemap, faTools, 
  faToggleOn, faSave, faUndo, faExclamationTriangle,
  faInfoCircle, faCodeBranch
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import DatePicker from '../components/DatePicker';

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
  min-height: calc(100vh - var(--app-fixed-offset, 140px));
  background: #f5f7fa;
  padding: 2rem 2rem 4rem 2rem;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 4rem;
`;

const PageHeader = styled.div`
  background: linear-gradient(135deg, ${({theme}) => theme.colors.primary} 0%, ${({theme}) => theme.colors.primaryAccent} 100%);
  color: white;
  padding: 2rem 2.5rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const SettingCard = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid ${props => props.$warning ? '#fbbf24' : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${({theme}) => theme.colors.gray200};
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({theme}) => theme.colors.primary} 0%, ${({theme}) => theme.colors.primaryAccent} 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({theme}) => theme.colors.primary};
  margin: 0;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid ${({theme}) => theme.colors.gray200};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingInfo = styled.div`
  flex: 1;
`;

const SettingLabel = styled.div`
  font-weight: 600;
  color: ${({theme}) => theme.colors.gray700};
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SettingDescription = styled.div`
  font-size: 0.875rem;
  color: ${({theme}) => theme.colors.gray500};
  line-height: 1.4;
`;

const ToggleButton = styled.button`
  width: 64px;
  height: 32px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  background: ${props => props.$active ? 
    'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
    '#cbd5e1'};
  
  &:hover {
    opacity: 0.9;
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToggleThumb = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 4px;
  left: ${props => props.$active ? '36px' : '4px'};
  transition: left 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid ${({theme}) => theme.colors.gray300};
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  color: ${({theme}) => theme.colors.gray700};
  background: white;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
  
  &:hover {
    border-color: ${({theme}) => theme.colors.primaryAccent};
  }
  
  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primaryAccent};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${({theme}) => theme.colors.gray100};
  }
`;

const Select = styled.select`
  padding: 0.625rem 1rem;
  border: 2px solid ${({theme}) => theme.colors.gray300};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${({theme}) => theme.colors.gray700};
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  
  &:hover {
    border-color: ${({theme}) => theme.colors.primaryAccent};
  }
  
  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primaryAccent};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${({theme}) => theme.colors.gray100};
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid ${({theme}) => theme.colors.gray300};
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  color: ${({theme}) => theme.colors.gray700};
  background: white;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({theme}) => theme.colors.primaryAccent};
  }
  
  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primaryAccent};
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${({theme}) => theme.colors.gray100};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  margin-bottom: 3rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.primaryAccent} 100%);
    color: white;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
  ` : `
    background: ${props.theme.colors.gray200};
    color: ${props.theme.colors.gray700};
    &:hover {
      background: ${props.theme.colors.gray300};
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const WarningBox = styled.div`
  background: ${props => props.$type === 'danger' ? '#fee2e2' : '#fef3c7'};
  border-left: 4px solid ${props => props.$type === 'danger' ? '#dc2626' : '#f59e0b'};
  color: ${props => props.$type === 'danger' ? '#7f1d1d' : '#78350f'};
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin: 1rem 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  ${props => props.$active ? `
    background: #d1fae5;
    color: #065f46;
  ` : `
    background: #fee2e2;
    color: #991b1b;
  `}
`;

// ==================== MAIN COMPONENT ====================

const AppSettings = () => {
  const { showToast } = useContext(ToastContext);
  const { userDetail, token, username } = useContext(AuthContext);
  
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    notifications_bell_enabled: true,
    notifications_email_enabled: true,
    hierarchy_enabled: false,
    hierarchy_profile_id: null,
    maintenance_mode: false,
    maintenance_message: 'Systém je momentálně v údržbě. Omlouváme se za komplikace.',
    post_login_modal_enabled: false,
    post_login_modal_title: 'Důležité upozornění',
    post_login_modal_guid: 'modal_init_v1',
    post_login_modal_message_id: '',
    post_login_modal_content: '',
    post_login_modal_valid_from: '',
    post_login_modal_valid_to: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({});
  const [hierarchyProfiles, setHierarchyProfiles] = useState([]);
  const [availableNotifications, setAvailableNotifications] = useState([]);
  const [selectedNotificationPreview, setSelectedNotificationPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const isSuperAdmin = useMemo(() => {
    return userDetail?.roles?.some(role => role.kod_role === 'SUPERADMIN');
  }, [userDetail]);
  
  useEffect(() => {
    loadSettings();
    loadHierarchyProfiles();
    loadAvailableNotifications();
  }, []);
  
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);
  
  const loadSettings = async () => {
    setLoading(true);
    try {
      const { getGlobalSettings } = await import('../services/globalSettingsApi');
      const data = await getGlobalSettings(token, username);
      
      if (!data.maintenance_message) {
        data.maintenance_message = 'Systém je momentálně v údržbě. Omlouváme se za komplikace.';
      }
      
      // Přidat výchozí hodnoty pro post-login modal
      if (data.post_login_modal_enabled === undefined) {
        data.post_login_modal_enabled = false;
      }
      if (!data.post_login_modal_title) {
        data.post_login_modal_title = 'Důležité upozornění';
      }
      if (!data.post_login_modal_guid) {
        data.post_login_modal_guid = 'modal_init_v1';
      }
      
      // Převést boolean hodnoty z API (backend posílá 0/1 string)
      data.post_login_modal_enabled = data.post_login_modal_enabled === '1' || data.post_login_modal_enabled === 1 || data.post_login_modal_enabled === true;
      
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      console.error('Chyba při načítání nastavení:', error);
      showToast('Chyba při načítání globálního nastavení', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const loadHierarchyProfiles = async () => {
    try {
      const { getHierarchyProfiles } = await import('../services/hierarchyProfilesApi');
      const profiles = await getHierarchyProfiles(token, username);
      // Filtrovat pouze aktivní profily pro AppSettings
      const activeProfiles = profiles.filter(p => p.isActive === true);
      setHierarchyProfiles(activeProfiles);
    } catch (error) {
      console.error('Chyba při načítání profilů hierarchie:', error);
      // Tichá chyba - profily nejsou kritické pro načtení stránky
    }
  };

  const loadAvailableNotifications = async () => {
    try {
      // Debug logging - POUŽÍVAT SPRÁVNÝ API_BASE_URL jako ostatní endpointy!
      const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');
      const url = `${API_BASE_URL}/notifications/list-for-select`;
      const requestBody = {
        token: token,
        username: username
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const text = await response.text();
        showToast(`Chyba při načítání notifikací: HTTP ${response.status}`, { type: 'error' });
        return;
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        showToast('API vrátilo prázdnou odpověď', { type: 'error' });
        return;
      }
      
      const data = JSON.parse(text);
      
      if (data.status === 'success') {
        setAvailableNotifications(data.data);
      } else {
        console.error('Error loading notifications:', data.message);
        showToast(data.message || 'Chyba při načítání notifikací', { type: 'error' });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      showToast('Chyba při načítání notifikací: ' + error.message, { type: 'error' });
    }
  };

  const loadNotificationPreview = async (notificationId) => {
    if (!notificationId) {
      setSelectedNotificationPreview('');
      return;
    }

    setLoadingPreview(true);
    try {
      const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');
      const response = await fetch(`${API_BASE_URL}/notifications/get-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          username: username,
          id: notificationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setSelectedNotificationPreview(data.data.zprava || '');
        } else {
          setSelectedNotificationPreview('<p style="color: red;">Chyba při načítání: ' + data.message + '</p>');
        }
      } else {
        setSelectedNotificationPreview('<p style="color: red;">HTTP ' + response.status + ': ' + response.statusText + '</p>');
      }
    } catch (error) {
      console.error('Error loading notification preview:', error);
      setSelectedNotificationPreview('<p style="color: red;">Chyba při načítání náhledu: ' + error.message + '</p>');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    // Validace: pokud je hierarchie povolena, musí být vybrán profil
    if (settings.hierarchy_enabled && !settings.hierarchy_profile_id) {
      console.warn('⚠️ Validation failed: hierarchy enabled but no profile');
      showToast('Při zapnuté hierarchii musíte vybrat aktivní profil', { type: 'error' });
      return;
    }
    
    setSaving(true);
    try {
      const { saveGlobalSettings } = await import('../services/globalSettingsApi');
      await saveGlobalSettings(settings, token, username);
      
      setOriginalSettings({...settings});
      setHasChanges(false);
      showToast('Globální nastavení bylo úspěšně uloženo', { type: 'success' });
    } catch (error) {
      console.error('❌ Chyba při ukládání nastavení:', error);
      showToast('Chyba při ukládání globálního nastavení', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    setSettings({...originalSettings});
    showToast('Změny byly zrušeny', { type: 'info' });
  };
  
  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  if (loading) {
    return (
      <PageContainer>
        <ContentWrapper>
          <PageHeader>
            <PageTitle>
              <FontAwesomeIcon icon={faCog} />
              Načítání...
            </PageTitle>
          </PageHeader>
        </ContentWrapper>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <ContentWrapper>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faCog} />
            Globální nastavení aplikace
          </PageTitle>
          <PageSubtitle>
            Správa celoplošných nastavení systému EEO - notifikace, hierarchie workflow, údržba systému
          </PageSubtitle>
        </PageHeader>
        
        <SettingsGrid>
          {/* NOTIFIKACE */}
          <SettingCard>
            <CardHeader>
              <CardIcon>
                <FontAwesomeIcon icon={faBell} />
              </CardIcon>
              <div>
                <CardTitle>Notifikace</CardTitle>
                <StatusBadge $active={settings.notifications_enabled}>
                  {settings.notifications_enabled ? 'Aktivní' : 'Vypnuto'}
                </StatusBadge>
              </div>
            </CardHeader>
            
            <SettingRow>
              <SettingInfo>
                <SettingLabel>
                  <FontAwesomeIcon icon={faToggleOn} />
                  Povolit notifikace
                </SettingLabel>
                <SettingDescription>
                  Hlavní vypínač pro celý notifikační systém. Má vyšší prioritu než nastavení hierarchie a uživatelů.
                </SettingDescription>
              </SettingInfo>
              <ToggleButton
                $active={settings.notifications_enabled}
                onClick={() => toggleSetting('notifications_enabled')}
              >
                <ToggleThumb $active={settings.notifications_enabled} />
              </ToggleButton>
            </SettingRow>
            
            <SettingRow>
              <SettingInfo>
                <SettingLabel>
                  <FontAwesomeIcon icon={faBell} />
                  Zvoneček (in-app notifikace)
                </SettingLabel>
                <SettingDescription>
                  Zobrazování notifikací ve zvoničku v horní liště aplikace.
                </SettingDescription>
              </SettingInfo>
              <ToggleButton
                $active={settings.notifications_bell_enabled}
                onClick={() => toggleSetting('notifications_bell_enabled')}
                disabled={!settings.notifications_enabled}
              >
                <ToggleThumb $active={settings.notifications_bell_enabled} />
              </ToggleButton>
            </SettingRow>
            
            <SettingRow>
              <SettingInfo>
                <SettingLabel>
                  <FontAwesomeIcon icon={faEnvelope} />
                  E-mailové notifikace
                </SettingLabel>
                <SettingDescription>
                  Zasílání notifikací na e-mailové adresy uživatelů.
                </SettingDescription>
              </SettingInfo>
              <ToggleButton
                $active={settings.notifications_email_enabled}
                onClick={() => toggleSetting('notifications_email_enabled')}
                disabled={!settings.notifications_enabled}
              >
                <ToggleThumb $active={settings.notifications_email_enabled} />
              </ToggleButton>
            </SettingRow>
            
            {!settings.notifications_enabled && (
              <WarningBox $type="warning">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <div>
                  <strong>Notifikace jsou globálně vypnuty!</strong><br />
                  Uživatelé nebudou dostávat žádné upozornění ani e-maily.
                </div>
              </WarningBox>
            )}
          </SettingCard>
          
          {/* HIERARCHIE */}
          <SettingCard>
            <CardHeader>
              <CardIcon>
                <FontAwesomeIcon icon={faSitemap} />
              </CardIcon>
              <div>
                <CardTitle>Hierarchie workflow</CardTitle>
                <StatusBadge $active={settings.hierarchy_enabled}>
                  {settings.hierarchy_enabled ? 'Aktivní' : 'Vypnuto'}
                </StatusBadge>
              </div>
            </CardHeader>
            
            <SettingRow>
              <SettingInfo>
                <SettingLabel>
                  <FontAwesomeIcon icon={faToggleOn} />
                  Povolit hierarchii
                </SettingLabel>
                <SettingDescription>
                  Zapnutí/vypnutí celého systému hierarchie workflow. Neovlivňuje stávající přístup na základě rolí a práv.
                </SettingDescription>
              </SettingInfo>
              <ToggleButton
                $active={settings.hierarchy_enabled}
                onClick={() => toggleSetting('hierarchy_enabled')}
              >
                <ToggleThumb $active={settings.hierarchy_enabled} />
              </ToggleButton>
            </SettingRow>
            
            {settings.hierarchy_enabled && (
              <>
                <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                  <SettingInfo>
                    <SettingLabel>
                      <FontAwesomeIcon icon={faSitemap} />
                      Aktivní profil hierarchie
                    </SettingLabel>
                    <SettingDescription>
                      Vyberte profil organizačního řádu, který bude aktivní pro celý systém. Změna profilu ovlivní viditelnost dat pro všechny uživatele.
                    </SettingDescription>
                    <Select
                      value={settings.hierarchy_profile_id || ''}
                      onChange={(e) => {
                        const newValue = e.target.value ? parseInt(e.target.value) : null;
                        setSettings(prev => ({
                          ...prev,
                          hierarchy_profile_id: newValue
                        }));
                        setHasChanges(true);
                      }}
                      disabled={!settings.hierarchy_enabled}
                      style={{marginTop: '0.75rem'}}
                    >
                      <option value="">-- Vyberte profil --</option>
                      {hierarchyProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name} {profile.isActive ? '(aktivní)' : ''} - {profile.relationshipsCount} vztahů
                        </option>
                      ))}
                    </Select>
                  </SettingInfo>
                </SettingRow>
                
                <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                  <SettingInfo>
                    <SettingLabel>
                      <FontAwesomeIcon icon={faCodeBranch} />
                      Logika vyhodnocení
                    </SettingLabel>
                    <SettingDescription>
                      <strong>OR (NEBO):</strong> Uživatel vidí data, pokud má oprávnění alespoň v jedné úrovni hierarchie (liberálnější).<br />
                      <strong>AND (A ZÁROVEŇ):</strong> Uživatel vidí data pouze pokud splňuje všechny požadované úrovně hierarchie současně (restriktivnější).
                    </SettingDescription>
                    <Select
                      value={settings.hierarchy_logic || 'OR'}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        hierarchy_logic: e.target.value
                      }))}
                      disabled={!settings.hierarchy_enabled}
                      style={{marginTop: '0.75rem'}}
                    >
                      <option value="OR">OR (NEBO) - liberální</option>
                      <option value="AND">AND (A ZÁROVEŇ) - restriktivní</option>
                    </Select>
                  </SettingInfo>
                </SettingRow>
              </>
            )}
            
            {!settings.hierarchy_enabled && (
              <WarningBox $type="info">
                <FontAwesomeIcon icon={faInfoCircle} />
                <div>
                  Hierarchie je vypnuta. Systém používá pouze standardní přístup na základě rolí a práv.
                </div>
              </WarningBox>
            )}
          </SettingCard>
          
          {/* ÚDRŽBA SYSTÉMU */}
          <SettingCard $warning={settings.maintenance_mode}>
            <CardHeader>
              <CardIcon>
                <FontAwesomeIcon icon={faTools} />
              </CardIcon>
              <div>
                <CardTitle>Údržba systému</CardTitle>
                <StatusBadge $active={!settings.maintenance_mode}>
                  {settings.maintenance_mode ? 'Režim údržby' : 'Normální provoz'}
                </StatusBadge>
              </div>
            </CardHeader>
            
            <SettingRow>
              <SettingInfo>
                <SettingLabel>
                  <FontAwesomeIcon icon={faTools} />
                  Režim údržby
                </SettingLabel>
                <SettingDescription>
                  Aktivuje údržbový režim - přístup pouze pro SUPERADMIN.
                </SettingDescription>
              </SettingInfo>
              <ToggleButton
                $active={settings.maintenance_mode}
                onClick={() => toggleSetting('maintenance_mode')}
                disabled={!isSuperAdmin}
              >
                <ToggleThumb $active={settings.maintenance_mode} />
              </ToggleButton>
            </SettingRow>
            
            {settings.maintenance_mode && (
              <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                <SettingInfo>
                  <SettingLabel>
                    <FontAwesomeIcon icon={faInfoCircle} />
                    Zpráva pro uživatele
                  </SettingLabel>
                  <SettingDescription>
                    Vlastní text, který uvidí uživatelé na údržbové stránce.
                  </SettingDescription>
                  <TextArea
                    value={settings.maintenance_message}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maintenance_message: e.target.value
                    }))}
                    placeholder="Zadejte zprávu o údržbě..."
                    disabled={!isSuperAdmin}
                  />
                </SettingInfo>
              </SettingRow>
            )}
            
            {settings.maintenance_mode && (
              <WarningBox $type="danger">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <div>
                  <strong>VAROVÁNÍ: Režim údržby je aktivní!</strong><br />
                  Pouze uživatelé s rolí SUPERADMIN mohou přistupovat do systému.
                </div>
              </WarningBox>
            )}
            
            {!isSuperAdmin && (
              <WarningBox $type="warning">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <div>
                  Pouze SUPERADMIN může aktivovat režim údržby.
                </div>
              </WarningBox>
            )}
          </SettingCard>
          
          {/* POST-LOGIN MODAL */}
          <SettingCard style={{gridColumn: '1 / -1'}}>
            <CardHeader>
              <CardIcon>
                <FontAwesomeIcon icon={faInfoCircle} />
              </CardIcon>
              <div>
                <CardTitle>Post-Login Modal Dialog</CardTitle>
                <StatusBadge $active={settings.post_login_modal_enabled}>
                  {settings.post_login_modal_enabled ? 'Aktivní' : 'Neaktivní'}
                </StatusBadge>
              </div>
            </CardHeader>
            
            <SettingRow>
              <SettingInfo>
                <SettingLabel>
                  <FontAwesomeIcon icon={faInfoCircle} />
                  Povolit post-login modal
                </SettingLabel>
                <SettingDescription>
                  Zobrazí modal dialog po přihlášení uživatele s důležitými informacemi.
                </SettingDescription>
              </SettingInfo>
              <ToggleButton
                $active={settings.post_login_modal_enabled}
                onClick={() => toggleSetting('post_login_modal_enabled')}
              >
                <ToggleThumb $active={settings.post_login_modal_enabled} />
              </ToggleButton>
            </SettingRow>
            
            {settings.post_login_modal_enabled && (
              <>
                <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                  <SettingInfo>
                    <SettingLabel>
                      <FontAwesomeIcon icon={faInfoCircle} />
                      Nadpis modalu
                    </SettingLabel>
                    <SettingDescription>
                      Hlavní nadpis, který se zobrazí v modal dialogu.
                    </SettingDescription>
                    <Input
                      type="text"
                      value={settings.post_login_modal_title || ''}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          post_login_modal_title: e.target.value
                        }));
                        setHasChanges(true);
                      }}
                      placeholder="Nadpis modalu..."
                      style={{marginTop: '0.75rem'}}
                    />
                  </SettingInfo>
                </SettingRow>
                
                <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                  <SettingInfo>
                    <SettingLabel>
                      <FontAwesomeIcon icon={faCodeBranch} />
                      GUID pro resetování
                    </SettingLabel>
                    <SettingDescription>
                      Jedinečný identifikátor. Změnou se obnoví zobrazení pro všechny uživatele, kteří si zvolili "Příště nezobrazovat".
                    </SettingDescription>
                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.75rem'}}>
                      <Input
                        type="text"
                        value={settings.post_login_modal_guid || ''}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            post_login_modal_guid: e.target.value
                          }));
                          setHasChanges(true);
                        }}
                        placeholder="modal_guid_v1"
                        style={{flex: 1}}
                      />
                      <Button 
                        type="button"
                        onClick={() => {
                          const newGuid = `modal_${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}`;
                          setSettings(prev => ({
                            ...prev,
                            post_login_modal_guid: newGuid
                          }));
                          setHasChanges(true);
                        }}
                      >
                        Generovat nový
                      </Button>
                    </div>
                  </SettingInfo>
                </SettingRow>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                    <SettingInfo>
                      <SettingLabel>
                        <FontAwesomeIcon icon={faInfoCircle} />
                        Platné od
                      </SettingLabel>
                      <SettingDescription>
                        Datum a čas od kdy se modal zobrazuje.<br/>
                        Pokud není zadáno, platí okamžitě.
                      </SettingDescription>
                      <DatePicker
                        fieldName="post_login_modal_valid_from"
                        value={settings.post_login_modal_valid_from || ''}
                        onChange={(value) => {
                          setSettings(prev => ({
                            ...prev,
                            post_login_modal_valid_from: value
                          }));
                          setHasChanges(true);
                        }}
                        placeholder="Vyberte datum od kdy platí..."
                        variant="standard"
                      />
                    </SettingInfo>
                  </SettingRow>
                  
                  <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                    <SettingInfo>
                      <SettingLabel>
                        <FontAwesomeIcon icon={faInfoCircle} />
                        Platné do
                      </SettingLabel>
                      <SettingDescription>
                        Datum a čas do kdy se modal zobrazuje.<br/>
                        Pokud není zadáno, platí neomezeně.
                      </SettingDescription>
                      <DatePicker
                        fieldName="post_login_modal_valid_to"
                        value={settings.post_login_modal_valid_to || ''}
                        onChange={(value) => {
                          setSettings(prev => ({
                            ...prev,
                            post_login_modal_valid_to: value
                          }));
                          setHasChanges(true);
                        }}
                        placeholder="Vyberte datum do kdy platí..."
                        variant="standard"
                      />
                    </SettingInfo>
                  </SettingRow>
                </div>
                
                <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                  <SettingInfo>
                    <SettingLabel>
                      <FontAwesomeIcon icon={faBell} />
                      Zpráva z notifikačního systému
                    </SettingLabel>
                    <SettingDescription>
                      Vyberte systémovou notifikaci ze které se načte obsah pro modal. Necháte-li prázdné, použije se fallback obsah níže.
                    </SettingDescription>
                    <Select
                      value={settings.post_login_modal_message_id || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          post_login_modal_message_id: newValue
                        }));
                        setHasChanges(true);
                        loadNotificationPreview(newValue);
                      }}
                      style={{marginTop: '0.75rem'}}
                    >
                      <option value="">-- Vyberte notifikaci --</option>
                      {availableNotifications.map(notification => (
                        <option key={notification.id} value={notification.id}>
                          {notification.title} (ID: {notification.id})
                        </option>
                      ))}
                    </Select>
                    
                    {/* HTML Náhled vybrané notifikace */}
                    {settings.post_login_modal_message_id && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          <FontAwesomeIcon icon={faInfoCircle} style={{marginRight: '0.5rem'}} />
                          Náhled obsahu notifikace (ID: {settings.post_login_modal_message_id})
                        </div>
                        
                        {loadingPreview ? (
                          <div style={{padding: '1rem', textAlign: 'center', color: '#6b7280'}}>
                            Načítám náhled...
                          </div>
                        ) : (
                          <div 
                            style={{
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              padding: '1rem',
                              backgroundColor: 'white',
                              maxHeight: '300px',
                              overflow: 'auto',
                              fontSize: '0.875rem',
                              lineHeight: '1.5'
                            }}
                            dangerouslySetInnerHTML={{ __html: selectedNotificationPreview }}
                          />
                        )}
                      </div>
                    )}
                  </SettingInfo>
                </SettingRow>
                
                <SettingRow style={{flexDirection: 'column', alignItems: 'stretch'}}>
                  <SettingInfo>
                    <SettingLabel>
                      <FontAwesomeIcon icon={faInfoCircle} />
                      Fallback HTML obsah
                    </SettingLabel>
                    <SettingDescription>
                      HTML obsah, který se použije pokud není zadané ID zprávy nebo se nepodaří načíst z notifikačního systému. Můžete používat HTML tagy.
                    </SettingDescription>
                    <TextArea
                      value={settings.post_login_modal_content || ''}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          post_login_modal_content: e.target.value
                        }));
                        setHasChanges(true);
                      }}
                      placeholder="<h3>Vítejte!</h3><p>Důležité informace...</p>"
                      style={{marginTop: '0.75rem', minHeight: '120px'}}
                    />
                  </SettingInfo>
                </SettingRow>
              </>
            )}
            
            {!settings.post_login_modal_enabled && (
              <WarningBox $type="info">
                <FontAwesomeIcon icon={faInfoCircle} />
                <div>
                  Post-login modal je vypnut. Uživatelé neuvidí žádný dialog po přihlášení.
                </div>
              </WarningBox>
            )}
          </SettingCard>
        </SettingsGrid>
        
        <ActionButtons>
          <Button onClick={handleReset} disabled={!hasChanges || saving}>
            <FontAwesomeIcon icon={faUndo} />
            Zrušit změny
          </Button>
          <Button $primary onClick={handleSave} disabled={!hasChanges || saving}>
            <FontAwesomeIcon icon={faSave} />
            {saving ? 'Ukládám...' : 'Uložit nastavení'}
          </Button>
        </ActionButtons>
        
        {hasChanges && (
          <WarningBox $type="warning">
            <FontAwesomeIcon icon={faInfoCircle} />
            <div>
              Máte neuložené změny. Nezapomeňte kliknout na "Uložit nastavení".
            </div>
          </WarningBox>
        )}
      </ContentWrapper>
    </PageContainer>
  );
};

export default AppSettings;
