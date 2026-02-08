/**
 * OrderCommentsTooltip.jsx - Version 3.0
 * 
 * ✅ Opravy:
 * - Viewport overflow protection (max-height: 80vh)
 * - Ikona smazat vedle data (bez textu)
 * - Podpora pro odpovědi (parent_comment_id)
 * - Inline confirm dialog pro smazání
 * 
 * Datum: 8. 2. 2026
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComment, 
  faTimes, 
  faSpinner, 
  faTrash,
  faPaperPlane,
  faExclamationTriangle,
  faReply,
  faChevronDown,
  faChevronUp,
  faExpand,
  faCompress,
  faEdit
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
  background: white;
  border-radius: ${props => props.$isFullscreen ? '0' : '8px'};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  
  /* ✅ Fullscreen nebo normální režim */
  ${props => props.$isFullscreen ? `
    top: 0 !important;
    left: 0 !important;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
  ` : `
    width: 450px;
    height: 66vh;
    max-width: calc(100vw - 40px);
    top: ${props.$top}px;
    left: ${props.$left}px;
  `}
  
  animation: ${props => props.$isPositioned ? 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'};
  
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
  
  @media (max-width: 768px) {
    width: 90vw;
    max-width: 450px;
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
  flex-direction: column;
  gap: 0.25rem;
`;

const TooltipTitleMain = styled.div`
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

const TooltipTitleSub = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 400;
  margin-left: 1.75rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
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

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const FullscreenButton = styled.button`
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  
  &:hover {
    background: #e2e8f0;
    color: #3b82f6;
  }
`;

const TooltipContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
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

const CommentDateWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CommentDate = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const DeleteIconButton = styled.button`
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-size: 0.9rem;
  width: 24px;
  height: 24px;
  
  &:hover {
    background: #fee2e2;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EditIconButton = styled.button`
  background: transparent;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-size: 0.9rem;
  width: 24px;
  height: 24px;
  
  &:hover {
    background: #dbeafe;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommentText = styled.div`
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.5rem;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  background: #eff6ff;
  color: #334155;
  line-height: 1.5;
  
  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
`;

const SaveEditButton = styled.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.15s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelEditButton = styled.button`
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.15s ease;
  
  &:hover {
    background: #e2e8f0;
    color: #475569;
  }
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ReplyButton = styled.button`
  background: transparent;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-weight: 500;
  
  &:hover {
    background: #eff6ff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ShowRepliesButton = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-weight: 500;
  
  &:hover {
    background: #f1f5f9;
    color: #475569;
  }
`;

const RepliesWrapper = styled.div`
  margin-top: 0.75rem;
  margin-left: 2rem;
  padding-left: 1.25rem;
  border-left: 3px solid #3b82f6;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: linear-gradient(to right, rgba(59, 130, 246, 0.03), transparent);
  padding-right: 0.5rem;
  border-radius: 0 6px 6px 0;
`;

const ReplyItem = styled.div`
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }
`;

const ReplyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
`;

const ReplyAuthor = styled.div`
  font-weight: 600;
  font-size: 0.8rem;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  
  &:before {
    content: '↳';
    font-size: 1rem;
    color: #3b82f6;
  }
`;

const ReplyDate = styled.div`
  font-size: 0.7rem;
  color: #94a3b8;
`;

const ReplyText = styled.div`
  color: #475569;
  line-height: 1.5;
  font-size: 0.875rem;
`;

const ReplyInputWrapper = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #eff6ff;
  border-radius: 6px;
  border: 2px solid #3b82f6;
`;

const ReplyInputHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ReplyingTo = styled.div`
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 600;
`;

const CancelReplyButton = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.75rem;
  
  &:hover {
    color: #ef4444;
  }
`;

const ReplyTextarea = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.85rem;
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
`;

const SendReplyButton = styled.button`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.15s ease;
  margin-top: 0.5rem;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteConfirmBubble = styled.div`
  position: fixed;
  background: white;
  border: 2px solid #ef4444;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10001;
  min-width: 200px;
  animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const DeleteConfirmText = styled.div`
  font-size: 0.85rem;
  color: #0f172a;
  margin-bottom: 0.75rem;
  font-weight: 500;
`;

const DeleteConfirmButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ConfirmButton = styled.button`
  flex: 1;
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: #dc2626;
  }
`;

const CancelButton = styled.button`
  flex: 1;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
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
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ============================================================================
// KOMPONENTA
// ============================================================================

const OrderCommentsTooltip = ({
  isOpen,
  orderId,
  orderNumber,
  iconRef,
  onClose,
  comments,
  loading,
  error,
  currentUserId,
  onLoadComments,
  onAddComment,
  onDeleteComment,
  showToast = null,
  token = null,
  username = null,
  onUpdateComments = null  // ✅ Nový callback pro optimalizaci
}) => {
  const containerRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const replyTextareaRef = useRef(null);
  
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // ✅ State pro delete confirmation s pozicí
  const [deleteConfirm, setDeleteConfirm] = useState({ id: null, position: null });
  
  // ✅ State pro reply mode
  const [replyToComment, setReplyToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  
  // ✅ State pro editaci komentářů
  const [editingComment, setEditingComment] = useState(null); // { id, originalText }
  const [editText, setEditText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // ✅ Automatický fokus do reply textarea
  useEffect(() => {
    if (replyToComment && replyTextareaRef.current) {
      replyTextareaRef.current.focus();
    }
  }, [replyToComment]);
  
  // ✅ Automatické rozbalení všech odpovědí při načtení
  useEffect(() => {
    if (comments && comments.length > 0) {
      const newExpandedReplies = {};
      const topLevel = comments.filter(c => c && !c.parent_comment_id);
      
      topLevel.forEach(comment => {
        const replies = comments.filter(c => c && c.parent_comment_id === comment.id);
        if (replies.length > 0) {
          newExpandedReplies[comment.id] = true;
        }
      });
      setExpandedReplies(newExpandedReplies);
    }
  }, [comments]);
  
  // Výpočet pozice tooltipu
  useLayoutEffect(() => {
    if (!iconRef || !containerRef.current) return;
    
    const iconElement = iconRef.current || iconRef;
    if (!iconElement || !iconElement.getBoundingClientRect) return;
    
    const iconRect = iconElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const tooltipWidth = Math.min(containerRect.width, window.innerWidth - 40);
    const tooltipHeight = containerRect.height;
    const padding = 20;
    const maxHeight = window.innerHeight * 0.66; // 66vh
    const effectiveHeight = Math.min(tooltipHeight, maxHeight);
    
    // Default: vpravo od ikony
    let left = iconRect.right + padding;
    let top = iconRect.top + (iconRect.height / 2) - (effectiveHeight / 2);
    
    // ✅ Kontrola pravé hrany - pokud přesahuje, přesuň vlevo od ikony
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = iconRect.left - tooltipWidth - padding;
    }
    
    // ✅ Pokud je i vlevo málo místa, vycentruj
    if (left < padding) {
      left = Math.max(padding, (window.innerWidth - tooltipWidth) / 2);
    }
    
    // ✅ Kontrola spodní hrany
    if (top + effectiveHeight > window.innerHeight - padding) {
      top = window.innerHeight - effectiveHeight - padding;
    }
    
    // ✅ Kontrola horní hrany
    if (top < padding) {
      top = padding;
    }
    
    setPosition({ top, left });
    setIsPositioned(true);
  }, [iconRef]); // ✅ OPRAVA: Removed 'comments' dependency to prevent repositioning on comment updates
  
  useEffect(() => {
    if (onLoadComments && !loading && comments.length === 0) {
      onLoadComments();
    }
  }, []);
  
  // Handler pro main comment
  const handleSubmit = useCallback(async () => {
    if (!newCommentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newCommentText.trim());
      setNewCommentText('');
      onLoadComments(); // ✅ Reload comments po přidání
    } catch (err) {
      console.error('Chyba při přidávání komentáře:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newCommentText, onAddComment, onLoadComments]);
  
  // Handler pro reply
  const handleSubmitReply = useCallback(async () => {
    if (!replyText.trim() || !replyToComment) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(replyText.trim(), replyToComment.id);
      setReplyText('');
      setReplyToComment(null);
      onLoadComments(); // Reload comments
    } catch (err) {
      console.error('Chyba při přidávání odpovědi:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [replyText, replyToComment, onAddComment, onLoadComments]);
  
  // Handler pro zobrazení delete confirm
  const handleDeleteClick = useCallback((commentId, event) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    setDeleteConfirm({
      id: commentId,
      position: {
        top: buttonRect.bottom + 5,
        left: buttonRect.left
      }
    });
  }, []);
  
  // Handler pro potvrzení smazání
  const handleConfirmedDelete = useCallback(async (commentId) => {
    setDeleteConfirm({ id: null, position: null });
    setIsDeleting(commentId);
    try {
      await onDeleteComment(commentId);
    } catch (err) {
      console.error('Chyba při mazání komentáře:', err);
    } finally {
      setIsDeleting(null);
    }
  }, [onDeleteComment]);
  
  // Handler pro začátek editace
  const handleStartEdit = useCallback((comment) => {
    setEditingComment({ id: comment.id, originalText: comment.obsah });
    setEditText(comment.obsah);
  }, []);
  
  // Handler pro zrušení editace
  const handleCancelEdit = useCallback(() => {
    setEditingComment(null);
    setEditText('');
  }, []);
  
  // Handler pro uložení editace
  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim() || !editingComment) return;
    
    if (!token || !username) {
      console.error('Missing token or username');
      if (showToast) {
        showToast('Chybí autentizační údaje', 'error');
      }
      return;
    }
    
    setIsUpdating(true);
    try {
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      const response = await fetch(`${apiBase}orders-v3/comments/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username,
          comment_id: editingComment.id,
          obsah: editText.trim()
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Chyba při aktualizaci komentáře');
      }
      
      setEditingComment(null);
      setEditText('');
      
      // ✅ OPTIMALIZACE: Místo celého refresh, aktualizuj pouze lokální stav
      if (comments && comments.length > 0 && onUpdateComments) {
        const updatedComments = comments.map(comment => {
          if (comment && comment.id === editingComment.id) {
            return {
              ...comment,
              obsah: editText.trim(),
              dt_aktualizace: result.data?.dt_aktualizace || new Date().toISOString()
            };
          }
          return comment;
        });
        onUpdateComments(updatedComments); // ✅ Pošli aktualizované komentáře do parent komponenty
      } else {
        // Fallback - reload celých komentářů
        onLoadComments();
      }
      
      if (showToast) {
        showToast('Komentář byl úspěšně upraven', 'success');
      }
    } catch (err) {
      console.error('Chyba při ukládání editace:', err);
      if (showToast) {
        showToast(err.message || 'Nepodařilo se uložit změny', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  }, [editText, editingComment, onLoadComments, showToast, token, username]);
  
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
  
  // Poslední komentář
  const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;
  
  // Filtrování top-level komentářů a odpovědí (ošetření undefined/null)
  const topLevelComments = (comments || []).filter(c => c && !c.parent_comment_id);
  const getReplies = (commentId) => (comments || []).filter(c => c && c.parent_comment_id === commentId);
  
  // Helper pro získání jména autora podle ID
  const getCommentById = (commentId) => (comments || []).find(c => c && c.id === commentId);
  
  // Helper pro získání top-level parent (pro single-level threading)
  const getTopLevelParent = (commentId) => {
    const comment = getCommentById(commentId);
    if (!comment) return commentId;
    // Pokud má comment parenta, vezmi toho parenta (max 1 úroveň)
    return comment.parent_comment_id || commentId;
  };
  
  return (
    <>
      <TooltipOverlay onClick={onClose} />
      <TooltipContainer
        ref={containerRef}
        $top={position.top}
        $left={position.left}
        $isPositioned={isPositioned}
        $isFullscreen={isFullscreen}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          visibility: isPositioned ? 'visible' : 'hidden',
          opacity: isPositioned ? 1 : 0 
        }}
      >
        <TooltipHeader>
          <TooltipTitle>
            <TooltipTitleMain>
              <FontAwesomeIcon icon={faComment} />
              Komentáře k objednávce {orderNumber}
            </TooltipTitleMain>
            {lastComment && (
              <TooltipTitleSub>
                Poslední: {formatDate(lastComment.dt_vytvoreni)} od {lastComment.autor_jmeno || 'Neznámý'}
              </TooltipTitleSub>
            )}
          </TooltipTitle>
          <HeaderButtons>
            <FullscreenButton 
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Zmenšit' : 'Zvětšit na celé okno'}
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </FullscreenButton>
            <CloseButton onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </HeaderButtons>
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
          
          {!loading && !error && topLevelComments.length > 0 && (
            <CommentsTimeline>
              {topLevelComments.map((comment) => {
                const isOwn = (comment.user_id || comment.autor_id) === currentUserId;
                const replies = getReplies(comment.id);
                const isExpanded = expandedReplies[comment.id];
                
                return (
                  <CommentItem key={comment.id} $isOwn={isOwn}>
                    <CommentHeader>
                      <CommentAuthor>{comment.autor_jmeno || 'Neznámý'}</CommentAuthor>
                      <CommentDateWrapper>
                        <CommentDate>{formatDate(comment.dt_vytvoreni)}</CommentDate>
                        {isOwn && (
                          <>
                            <EditIconButton
                              onClick={() => handleStartEdit(comment)}
                              disabled={editingComment?.id === comment.id}
                              title="Upravit komentář"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </EditIconButton>
                            <DeleteIconButton
                              onClick={(e) => handleDeleteClick(comment.id, e)}
                              disabled={isDeleting === comment.id}
                              title="Smazat komentář"
                            >
                              <FontAwesomeIcon 
                                icon={isDeleting === comment.id ? faSpinner : faTrash} 
                                spin={isDeleting === comment.id} 
                              />
                            </DeleteIconButton>
                          </>
                        )}
                      </CommentDateWrapper>
                    </CommentHeader>
                    
                    {editingComment?.id === comment.id ? (
                      <div>
                        <EditTextarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          disabled={isUpdating}
                          autoFocus
                        />
                        <EditActions>
                          <SaveEditButton
                            onClick={handleSaveEdit}
                            disabled={isUpdating || !editText.trim()}
                          >
                            {isUpdating ? 'Ukládám...' : 'Uložit'}
                          </SaveEditButton>
                          <CancelEditButton onClick={handleCancelEdit}>
                            Zrušit
                          </CancelEditButton>
                        </EditActions>
                      </div>
                    ) : (
                      <CommentText>{comment.obsah}</CommentText>
                    )}
                    
                    <CommentActions>
                      <ReplyButton onClick={() => setReplyToComment({ id: comment.id, author: comment.autor_jmeno })}>
                        <FontAwesomeIcon icon={faReply} />
                        Odpovědět
                      </ReplyButton>
                      
                      {replies.length > 0 && (
                        <ShowRepliesButton onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !isExpanded }))}>
                          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                          {replies.length} {replies.length === 1 ? 'odpověď' : replies.length < 5 ? 'odpovědi' : 'odpovědí'}
                        </ShowRepliesButton>
                      )}
                    </CommentActions>
                    
                    {isExpanded && replies.length > 0 && (
                      <RepliesWrapper>
                        {replies.map((reply) => {
                          const isOwnReply = (reply.user_id || reply.autor_id) === currentUserId;
                          const parentComment = getCommentById(reply.parent_comment_id);
                          const replyingToName = parentComment?.autor_jmeno || 'Neznámý';
                          
                          return (
                            <ReplyItem key={reply.id}>
                              <ReplyHeader>
                                <ReplyAuthor>{reply.autor_jmeno || 'Neznámý'}</ReplyAuthor>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <ReplyDate>{formatDate(reply.dt_vytvoreni)}</ReplyDate>
                                  {isOwnReply && (
                                    <>
                                      <EditIconButton
                                        onClick={() => handleStartEdit(reply)}
                                        disabled={editingComment?.id === reply.id}
                                        title="Upravit odpověď"
                                        style={{ fontSize: '0.7rem' }}
                                      >
                                        <FontAwesomeIcon icon={faEdit} />
                                      </EditIconButton>
                                      <DeleteIconButton
                                        onClick={(e) => handleDeleteClick(reply.id, e)}
                                        disabled={isDeleting === reply.id}
                                        title="Smazat odpověď"
                                        style={{ fontSize: '0.7rem' }}
                                      >
                                        <FontAwesomeIcon 
                                          icon={isDeleting === reply.id ? faSpinner : faTrash} 
                                          spin={isDeleting === reply.id} 
                                        />
                                      </DeleteIconButton>
                                    </>
                                  )}
                                </div>
                              </ReplyHeader>
                              <div style={{ fontSize: '0.7rem', color: '#2563eb', marginBottom: '0.3rem', fontStyle: 'italic' }}>
                                Odpověď na {replyingToName}
                              </div>
                              {editingComment?.id === reply.id ? (
                                <div>
                                  <EditTextarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    disabled={isUpdating}
                                    autoFocus
                                    style={{ minHeight: '60px', fontSize: '0.85rem' }}
                                  />
                                  <EditActions>
                                    <SaveEditButton
                                      onClick={handleSaveEdit}
                                      disabled={isUpdating || !editText.trim()}
                                    >
                                      {isUpdating ? 'Ukládám...' : 'Uložit'}
                                    </SaveEditButton>
                                    <CancelEditButton onClick={handleCancelEdit}>
                                      Zrušit
                                    </CancelEditButton>
                                  </EditActions>
                                </div>
                              ) : (
                                <ReplyText>{reply.obsah}</ReplyText>
                              )}
                              <div style={{ marginTop: '0.5rem' }}>
                                <ReplyButton 
                                  onClick={() => setReplyToComment({ 
                                    id: getTopLevelParent(reply.parent_comment_id), 
                                    author: reply.autor_jmeno 
                                  })}
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                >
                                  <FontAwesomeIcon icon={faReply} />
                                  Odpovědět
                                </ReplyButton>
                              </div>
                            </ReplyItem>
                          );
                        })}
                      </RepliesWrapper>
                    )}
                    
                    {replyToComment?.id === comment.id && (
                      <ReplyInputWrapper>
                        <ReplyInputHeader>
                          <ReplyingTo>Odpověď pro {replyToComment.author}</ReplyingTo>
                          <CancelReplyButton onClick={() => { setReplyToComment(null); setReplyText(''); }}>
                            Zrušit
                          </CancelReplyButton>
                        </ReplyInputHeader>
                        <ReplyTextarea
                          ref={replyTextareaRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Napište odpověď..."
                          disabled={isSubmitting}
                        />
                        <SendReplyButton
                          onClick={handleSubmitReply}
                          disabled={isSubmitting || !replyText.trim()}
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
                        </SendReplyButton>
                      </ReplyInputWrapper>
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
      
      {deleteConfirm.id && deleteConfirm.position && (
        <DeleteConfirmBubble 
          style={{ 
            top: deleteConfirm.position.top, 
            left: deleteConfirm.position.left 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DeleteConfirmText>
            Smazat komentář?
          </DeleteConfirmText>
          <DeleteConfirmButtons>
            <CancelButton onClick={() => setDeleteConfirm({ id: null, position: null })}>
              Ne
            </CancelButton>
            <ConfirmButton onClick={() => handleConfirmedDelete(deleteConfirm.id)}>
              Ano, smazat
            </ConfirmButton>
          </DeleteConfirmButtons>
        </DeleteConfirmBubble>
      )}
    </>
  );
};

export default OrderCommentsTooltip;
