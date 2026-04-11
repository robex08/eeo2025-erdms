import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPaperPlane, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { createNotification, getAdminMessagesUnreadCount } from '../../services/notificationsApi';
import { AuthContext } from '../../context/AuthContext';

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
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const ModalBody = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s;

  &:hover {
    background: #e2e8f0;
    color: #334155;
  }
`;

const ModalContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 10px;
  border: 1px solid #bfdbfe;
`;

const UserAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-weight: 700;
  color: #1e293b;
  font-size: 1rem;
`;

const UserMeta = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.15rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #334155;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.15s;
  background: #fff;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Textarea = styled.textarea`
  padding: 0.75rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: all 0.15s;
  background: #fff;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: ${props => props.$isChecked ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : '#f8fafc'};
  border: 1.5px solid ${props => props.$isChecked ? '#f87171' : '#e2e8f0'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${props => props.$isChecked ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : '#f1f5f9'};
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const CheckboxLabel = styled.div`
  flex: 1;
  font-weight: 600;
  color: ${props => props.$isChecked ? '#dc2626' : '#334155'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
`;

const CheckboxDesc = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s;

  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    &:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    &:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      transform: none;
    }
  ` : `
    background: #fff;
    color: #64748b;
    border: 1.5px solid #cbd5e1;
    &:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
  `}
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function SendQuickMessageModal({ user, onClose, onSuccess }) {
  const { userDetail } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(null);

  // Načti počet nepřečtených zpráv při otevření
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await getAdminMessagesUnreadCount(user.id);
        setUnreadCount(count);
      } catch (error) {
        console.error('Chyba při načítání počtu nepřečtených zpráv:', error);
        setUnreadCount(0);
      }
    };
    fetchUnreadCount();
  }, [user.id]);

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      alert('Vyplňte nadpis i zprávu');
      return;
    }

    setSending(true);

    try {
      // ✅ Priorita: cele_jmeno (Ing. Jan Novák) > username > fallback
      const senderName = userDetail?.cele_jmeno || userDetail?.username || 'Administrátor';
      
      await createNotification({
        type: 'ADMIN_MESSAGE',
        title: title.trim(),
        message: message.trim(),
        to_user_id: user.id,
        priority: isHighPriority ? 'urgent' : 'normal',
        category: 'system',
        send_email: false,
        placeholder_data: {
          sender_name: senderName,
          sender_username: userDetail?.username || '',
          recipient_name: user.cele_jmeno || user.username,
          sent_at: new Date().toISOString()
        }
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Chyba při odesílání zprávy:', error);
      alert('Chyba při odesílání zprávy. Zkuste to znovu.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBody onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FontAwesomeIcon icon={faPaperPlane} style={{ color: '#3b82f6' }} />
            Odeslat zprávu uživateli
          </ModalTitle>
          <CloseBtn onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseBtn>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalContent>
            <UserInfo>
              <UserAvatar>{getUserInitials(user.cele_jmeno)}</UserAvatar>
              <UserDetails>
                <UserName>
                  {user.cele_jmeno}
                  {unreadCount !== null && unreadCount > 0 && (
                    <span style={{
                      marginLeft: '0.5rem',
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      verticalAlign: 'middle'
                    }}>
                      {unreadCount} nepřečteno
                    </span>
                  )}
                </UserName>
                <UserMeta>
                  @{user.username} • {user.usek_zkr || 'N/A'}
                  {user.email && ` • ${user.email}`}
                </UserMeta>
              </UserDetails>
            </UserInfo>

            <FormGroup>
              <Label>
                Nadpis zprávy
              </Label>
              <Input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Stručný nadpis..."
                maxLength={100}
                required
                autoFocus
              />
            </FormGroup>

            <FormGroup>
              <Label>
                Text zprávy
              </Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Sem napište zprávu pro uživatele..."
                maxLength={500}
                required
              />
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                {message.length}/500 znaků
              </div>
            </FormGroup>

            <CheckboxWrapper 
              $isChecked={isHighPriority}
              onClick={() => setIsHighPriority(!isHighPriority)}
            >
              <Checkbox
                type="checkbox"
                checked={isHighPriority}
                onChange={e => setIsHighPriority(e.target.checked)}
              />
              <div style={{ flex: 1 }}>
                <CheckboxLabel $isChecked={isHighPriority}>
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  VYSOKÁ PRIORITA (HIGH ALERT)
                </CheckboxLabel>
                <CheckboxDesc>
                  Zobrazí se popup dialog, který vyžaduje pozornost uživatele
                </CheckboxDesc>
              </div>
            </CheckboxWrapper>
          </ModalContent>

          <ModalFooter>
            <Button type="button" onClick={onClose} disabled={sending}>
              Zrušit
            </Button>
            <Button type="submit" $variant="primary" disabled={sending || !title.trim() || !message.trim()}>
              {sending ? (
                <>
                  <LoadingSpinner />
                  Odesílám...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Odeslat zprávu
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalBody>
    </ModalOverlay>
  );
}
