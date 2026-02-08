/**
 * OrderCommentsTooltip.jsx
 * 
 * Floating tooltip panel pro zobrazení a správu komentářů k objednávce.
 * Zobrazuje se jako floating panel vedle ikony komentáře.
 * 
 * Verze: 1.0
 * Datum: 8. 2. 2026
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComment, 
  faTimes, 
  faSpinner, 
  faTrash,
  faPaperPlane,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const TooltipOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9998;
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const TooltipContainer = styled.div`
  position: fixed;
  width: 400px;
  max-height: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  /* Dynamická pozice - nastaví se přes inline styles */
  top: ${props => props.$top}px;
  left: ${props => props.$left}px;
  
  /* Responsive pro malé obrazovky */
  @media (max-width: 768px) {
    width: 90vw;
    max-width: 400px;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
  }
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 2px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
`;

const TooltipTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.95rem;
  color: #0f172a;
  
  > svg {
    color: #3b82f6;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  
  &:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
`;

const TooltipContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  max-height: 320px;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    
    &:hover {
      background: #94a3b8;
    }
  }
`;

const CommentsTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CommentItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: ${props => props.$isOwn ? '#eff6ff' : '#f8fafc'};
  border-left: 3px solid ${props => props.$isOwn ? '#3b82f6' : '#cbd5e1'};
  border-radius: 6px;
  transition: all 0.15s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const CommentAuthor = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: #0f172a;
`;

const CommentDate = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const CommentText = styled.div`
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${props => props.$isOwn ? '#dbeafe' : '#e2e8f0'};
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 4px;
  transition: all 0.15s ease;
  
  &:hover {
    background: #fee2e2;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #94a3b8;
  text-align: center;
  
  > svg {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  > p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #64748b;
  
  > svg {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #3b82f6;
  }
  
  > p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #ef4444;
  text-align: center;
  
  > svg {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  > p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const TooltipFooter = styled.div`
  padding: 1rem;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
`;

const CommentInputWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
`;

const CommentTextarea = styled.textarea`
  flex: 1;
  min-height: 60px;
  max-height: 120px;
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.15s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  &::placeholder {
    color: #94a3b8;
  }
  
  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.625rem 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.15s ease;
  min-width: 80px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OrderCommentsTooltip = ({
  orderId,
  orderNumber,
  iconRef,
  onClose,
  comments = [],
  commentsCount = 0,
  loading = false,
  error = null,
  currentUserId,
  onLoadComments,
  onAddComment,
  onDeleteComment,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  
  // Vypočítat pozici tooltipu vedle ikony
  useEffect(() => {
    if (iconRef?.current && containerRef?.current) {
      const iconRect = iconRef.current.getBoundingClientRect();
      const tooltipWidth = 400;
      const tooltipHeight = containerRef.current.offsetHeight || 500;
      const padding = 10;
      
      let top = iconRect.top;
      let left = iconRect.right + padding;
      
      // Kontrola pravé hranice viewport
      if (left + tooltipWidth > window.innerWidth) {
        left = iconRect.left - tooltipWidth - padding;
      }
      
      // Kontrola dolní hranice viewport
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - padding;
      }
      
      // Kontrola horní hranice viewport
      if (top < padding) {
        top = padding;
      }
      
      setPosition({ top, left });
    }
  }, [iconRef, comments]);
  
  // Načíst komentáře při otevření
  useEffect(() => {
    if (onLoadComments && !loading && comments.length === 0) {
      onLoadComments();
    }
  }, []);
  
  // Handler pro odeslání nového komentáře
  const handleSubmit = useCallback(async () => {
    if (!newCommentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newCommentText.trim());
      setNewCommentText('');
    } catch (err) {
      console.error('Chyba při přidávání komentáře:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newCommentText, onAddComment]);
  
  // Handler pro smazání komentáře
  const handleDelete = useCallback(async (commentId) => {
    if (!window.confirm('Opravdu chcete smazat tento komentář?')) return;
    
    setIsDeleting(commentId);
    try {
      await onDeleteComment(commentId);
    } catch (err) {
      console.error('Chyba při mazání komentáře:', err);
    } finally {
      setIsDeleting(null);
    }
  }, [onDeleteComment]);
  
  // Formátování data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <>
      <TooltipOverlay onClick={onClose} />
      <TooltipContainer
        ref={containerRef}
        $top={position.top}
        $left={position.left}
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipHeader>
          <TooltipTitle>
            <FontAwesomeIcon icon={faComment} />
            Komentáře k objednávce {orderNumber}
          </TooltipTitle>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </TooltipHeader>
        
        <TooltipContent>
          {loading && (
            <LoadingState>
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Načítání komentářů...</p>
            </LoadingState>
          )}
          
          {error && (
            <ErrorState>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <p>Chyba při načítání komentářů.</p>
            </ErrorState>
          )}
          
          {!loading && !error && comments.length === 0 && (
            <EmptyState>
              <FontAwesomeIcon icon={faComment} />
              <p>Zatím žádné komentáře.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Buďte první, kdo přidá komentář.
              </p>
            </EmptyState>
          )}
          
          {!loading && !error && comments.length > 0 && (
            <CommentsTimeline>
              {comments.map((comment) => {
                const isOwn = comment.autor_id === currentUserId;
                
                return (
                  <CommentItem key={comment.id} $isOwn={isOwn}>
                    <CommentHeader>
                      <CommentAuthor>{comment.autor_jmeno || 'Neznámý'}</CommentAuthor>
                      <CommentDate>{formatDate(comment.dt_vytvoreni)}</CommentDate>
                    </CommentHeader>
                    <CommentText>{comment.obsah}</CommentText>
                    {isOwn && (
                      <CommentActions $isOwn={isOwn}>
                        <DeleteButton
                          onClick={() => handleDelete(comment.id)}
                          disabled={isDeleting === comment.id}
                        >
                          <FontAwesomeIcon icon={isDeleting === comment.id ? faSpinner : faTrash} spin={isDeleting === comment.id} />
                          Smazat
                        </DeleteButton>
                      </CommentActions>
                    )}
                  </CommentItem>
                );
              })}
            </CommentsTimeline>
          )}
        </TooltipContent>
        
        <TooltipFooter>
          <CommentInputWrapper>
            <CommentTextarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Napište komentář..."
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmit();
                }
              }}
            />
            <SendButton
              onClick={handleSubmit}
              disabled={isSubmitting || !newCommentText.trim()}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Odesílám
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Odeslat
                </>
              )}
            </SendButton>
          </CommentInputWrapper>
        </TooltipFooter>
      </TooltipContainer>
    </>
  );
};

export default OrderCommentsTooltip;
