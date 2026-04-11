import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faExclamationTriangle, faBell } from '@fortawesome/free-solid-svg-icons';

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 
    0 0 0 1px rgba(220, 38, 38, 0.2),
    0 25px 50px -12px rgba(220, 38, 38, 0.3),
    0 0 100px rgba(220, 38, 38, 0.2);
  animation: ${slideIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 2px solid ${props => props.$isHighPriority ? '#ef4444' : '#3b82f6'};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: ${props => props.$isHighPriority 
      ? 'linear-gradient(90deg, #fca5a5, #ef4444, #dc2626, #ef4444, #fca5a5)'
      : 'linear-gradient(90deg, #93c5fd, #3b82f6, #2563eb, #3b82f6, #93c5fd)'};
    background-size: 200% 100%;
    animation: ${props => props.$isHighPriority ? 'shimmer 3s linear infinite' : 'none'};
  }
  
  @keyframes shimmer {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
  }
`;

const Header = styled.div`
  padding: 1.5rem;
  background: ${props => props.$isHighPriority 
    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'};
  border-bottom: 1px solid ${props => props.$isHighPriority ? '#fecaca' : '#bfdbfe'};
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => props.$isHighPriority 
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, #3b82f6, #2563eb)'};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 8px 16px rgba(220, 38, 38, 0.3);
  animation: ${props => props.$isHighPriority ? pulseAnimation : 'none'} 2s ease-in-out infinite;
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h3`
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PriorityBadge = styled.span`
  background: ${props => props.$isHighPriority ? '#dc2626' : '#3b82f6'};
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const Subtitle = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.15s;
  flex-shrink: 0;
  
  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;

const Body = styled.div`
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
`;

const Message = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Footer = styled.div`
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  
  ${props => props.$primary ? `
    background: ${props.$isHighPriority 
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : 'linear-gradient(135deg, #3b82f6, #2563eb)'};
    color: #fff;
    box-shadow: 0 4px 12px ${props.$isHighPriority 
      ? 'rgba(239, 68, 68, 0.3)'
      : 'rgba(59, 130, 246, 0.3)'};
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px ${props.$isHighPriority 
        ? 'rgba(239, 68, 68, 0.4)'
        : 'rgba(59, 130, 246, 0.4)'};
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

const SenderInfo = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 3px solid #3b82f6;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: #64748b;
  
  strong {
    color: #1e293b;
    font-weight: 600;
  }
`;

export default function HighPriorityNotificationModal({ notification, onClose }) {
  if (!notification) return null;

  const isHighPriority = notification.priorita === 'high' || notification.priority === 'high';
  
  // Parse placeholder data
  let placeholderData = {};
  try {
    if (notification.data_json) {
      placeholderData = typeof notification.data_json === 'string'
        ? JSON.parse(notification.data_json)
        : notification.data_json;
    }
  } catch (e) {
    placeholderData = {};
  }

  // ✅ Jméno odesílatele je přímo v notification.from_user_name
  const senderName = notification.from_user_name || 'Administrátor';

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer 
        $isHighPriority={isHighPriority} 
        onClick={e => e.stopPropagation()}
      >
        <Header $isHighPriority={isHighPriority}>
          <IconCircle $isHighPriority={isHighPriority}>
            <FontAwesomeIcon icon={isHighPriority ? faExclamationTriangle : faBell} />
          </IconCircle>
          <HeaderContent>
            <Title>
              {notification.nadpis || notification.app_title || 'Nová zpráva'}
              {isHighPriority && (
                <PriorityBadge $isHighPriority>
                  ⚠️ VYSOKÁ PRIORITA
                </PriorityBadge>
              )}
            </Title>
            <Subtitle>
              <span>📨 Od: <strong>{senderName}</strong></span>
              {notification.dt_created && (
                <span>• {formatDateTime(notification.dt_created)}</span>
              )}
            </Subtitle>
          </HeaderContent>
          <CloseBtn onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseBtn>
        </Header>

        <Body>
          <Message>
            {notification.zprava || notification.app_message || 'Bez obsahu'}
          </Message>
        </Body>

        <Footer>
          <Button onClick={onClose}>
            Později
          </Button>
          <Button 
            $primary 
            $isHighPriority={isHighPriority}
            onClick={onClose}
          >
            Rozumím
          </Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
