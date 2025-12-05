import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faPaperPlane, faTrash, faUser, faRobot } from '@fortawesome/free-solid-svg-icons';
import { PanelBase, PanelHeader, TinyBtn, edgeHandles } from './PanelPrimitives';
import styled from '@emotion/styled';

const ChatWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  border: 1px solid #059669;
  background: #f0fdf4;
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  scrollbar-width: thin;
  scrollbar-color: #059669 #f0fdf4;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f0fdf4;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #059669;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #047857;
  }
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 0.4rem 0.6rem;
  border-radius: 12px;
  word-wrap: break-word;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  background: ${props => props.isOwn ? '#16a34a' : '#e5e7eb'};
  color: ${props => props.isOwn ? 'white' : '#1f2937'};
  border: 1px solid ${props => props.isOwn ? '#15803d' : '#d1d5db'};
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.81em;
  opacity: 0.8;
  font-weight: 500;
`;

const MessageText = styled.div`
  font-size: 0.94em;
  line-height: 1.3;
`;

const MessageTime = styled.div`
  font-size: 0.75em;
  opacity: 0.7;
  text-align: ${props => props.isOwn ? 'right' : 'left'};
  margin-top: 0.1rem;
`;

const ChatInput = styled.div`
  display: flex;
  gap: 0.4rem;
  align-items: flex-end;
  padding: 0.4rem;
  background: #ecfdf5;
  border: 1px solid #059669;
  border-radius: 8px;
`;

const MessageTextarea = styled.textarea`
  flex: 1;
  resize: none;
  border: 1px solid #10b981;
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  font-size: 0.94em;
  line-height: 1.3;
  background: white;
  color: #1f2937;
  outline: none;
  min-height: 34px;
  max-height: 80px;
  font-family: inherit;

  &:focus {
    border-color: #059669;
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
  }

  &::placeholder {
    color: #6b7280;
    opacity: 0.8;
  }
`;

const SendButton = styled.button`
  background: #16a34a;
  color: white;
  border: 1px solid #15803d;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.88em;
  font-weight: 500;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #15803d;
  }

  &:active {
    background: #166534;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.3);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  gap: 0.5rem;

  .icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .text {
    font-size: 0.94em;
    line-height: 1.4;
  }
`;

export const ChatPanel = ({
  state,
  font,
  chatMessages,
  newChatMessage,
  setNewChatMessage,
  addChatMessage,
  clearChatMessages,
  markChatMessagesRead,
  onClose,
  adjustFont,
  bringFront,
  beginDrag,
  panelZ,
  isActive,
  hovered,
  opacityConfig,
  onHoverEnter,
  onHoverLeave
}) => {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Mark messages as read when panel is displayed
  useEffect(() => {
    if (markChatMessagesRead) {
      markChatMessagesRead();
    }
  }, [markChatMessagesRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (newChatMessage.trim()) {
      addChatMessage(newChatMessage.trim(), 'user');
      setNewChatMessage('');

      // Focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const renderMessage = (message) => {
    const isOwn = message.sender === 'user';

    return (
      <MessageBubble key={message.id} isOwn={isOwn}>
        <MessageHeader>
          <FontAwesomeIcon icon={isOwn ? faUser : faRobot} />
          {isOwn ? 'Já' : 'Systém'}
        </MessageHeader>
        <MessageText>{message.text}</MessageText>
        <MessageTime isOwn={isOwn}>
          {formatTime(message.timestamp)}
        </MessageTime>
      </MessageBubble>
    );
  };

  return (
    <PanelBase
      style={{
        left: state.x,
        top: state.y,
        width: state.w,
        height: state.h,
        zIndex: panelZ,
        opacity: isActive ? 1 : hovered ? opacityConfig.hover : opacityConfig.base,
        fontSize: `${font}rem`,
        background: 'linear-gradient(145deg, rgba(240, 253, 244, 0.96), rgba(220, 252, 231, 0.94))',
        border: '1px solid #16a34a',
        color: '#1f2937'
      }}
      onMouseDown={(e) => { if(!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) { bringFront(); } }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {edgeHandles(beginDrag, 'chat')}
      <PanelHeader
        onMouseDown={(e) => { if(e.target.closest('button')) return; beginDrag(e, 'chat', 'move'); }}
        style={{ background: '#16a34a', color: 'white', cursor: 'move', userSelect: 'none' }}
      >
        <FontAwesomeIcon icon={faComments} style={{ marginRight: '0.5rem' }} />
        Chat
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.2rem' }}>
          <TinyBtn
            title="Zmenšit font"
            onClick={() => adjustFont(-0.05)}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            A⁻
          </TinyBtn>
          <TinyBtn
            title="Zvětšit font"
            onClick={() => adjustFont(0.05)}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            A⁺
          </TinyBtn>
          <TinyBtn
            title="Vymazat všechny zprávy"
            onClick={clearChatMessages}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </TinyBtn>
          <TinyBtn
            title="Zavřít"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            ×
          </TinyBtn>
        </div>
      </PanelHeader>

      <ChatWrapper>
        <MessagesContainer>
          {chatMessages.length === 0 ? (
            <EmptyState>
              <FontAwesomeIcon icon={faComments} className="icon" />
              <div className="text">
                Žádné zprávy.<br />
                Napište první zprávu níže.
              </div>
            </EmptyState>
          ) : (
            <>
              {chatMessages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}
        </MessagesContainer>

        <ChatInput>
          <MessageTextarea
            ref={textareaRef}
            value={newChatMessage}
            onChange={(e) => setNewChatMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Napište zprávu..."
            rows={1}
          />
          <SendButton
            onClick={handleSendMessage}
            disabled={!newChatMessage.trim()}
            title="Odeslat zprávu (Enter)"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
            Odeslat
          </SendButton>
        </ChatInput>
      </ChatWrapper>
    </PanelBase>
  );
};