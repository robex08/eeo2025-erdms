/**
 * KeSchvaleniDrawer.jsx - Sdílená komponenta pro popup "Ke schválení"
 * Používá se v OrdersTableV3 (rychlé schvalování) i OrderForm25 (editace objednávky).
 * 
 * Props:
 *   open, title, data, loading, anchorRect, onClose
 *   onLoadComments, onAddComment, onDeleteComment
 *   currentUserId, token, username, showToast
 *   variant: 'upward' (default) | 'centered'
 */
import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import OrderCommentsTooltip from './OrderCommentsTooltip';

const KeSchvaleniDrawer = ({
  open,
  title,
  data,
  loading,
  anchorRect,
  onClose,
  onLoadComments,
  onAddComment,
  onDeleteComment,
  currentUserId,
  token,
  username,
  showToast,
}) => {
  // Comment tooltip state
  const [commentsTooltip, setCommentsTooltip] = useState({
    isOpen: false,
    orderId: null,
    orderNumber: null,
    orderInfo: null,
    iconRef: null,
    comments: [],
    commentsCount: 0,
    loading: false,
    error: null,
  });

  const closeCommentsTooltip = useCallback(() => {
    setCommentsTooltip({
      isOpen: false, orderId: null, orderNumber: null, orderInfo: null,
      iconRef: null, comments: [], commentsCount: 0, loading: false, error: null,
    });
  }, []);

  const handleOpenComments = useCallback(async (order, iconRef) => {
    if (commentsTooltip.isOpen && commentsTooltip.orderId === order.id) {
      closeCommentsTooltip();
      return;
    }
    setCommentsTooltip({
      isOpen: true,
      orderId: order.id,
      orderNumber: order.cislo_objednavky || `#${order.id}`,
      orderInfo: { objednatel: order.objednatel, castka: order.castka },
      iconRef,
      comments: [],
      commentsCount: order.comments_count || 0,
      loading: true,
      error: null,
    });
    if (onLoadComments) {
      try {
        const result = await onLoadComments(order.id);
        setCommentsTooltip(prev => ({
          ...prev,
          comments: result.data || result.comments || [],
          commentsCount: result.comments_count || 0,
          loading: false,
        }));
      } catch (err) {
        setCommentsTooltip(prev => ({ ...prev, loading: false, error: 'Chyba načítání komentářů' }));
      }
    }
  }, [commentsTooltip.isOpen, commentsTooltip.orderId, onLoadComments, closeCommentsTooltip]);

  // Local comment count overrides (po přidání/smazání)
  const [commentCountOverrides, setCommentCountOverrides] = useState({});

  const handleAddCommentInternal = useCallback(async (text, parentCommentId = null) => {
    if (!commentsTooltip.orderId || !onAddComment) return;
    try {
      const result = await onAddComment(commentsTooltip.orderId, text, parentCommentId);
      const newCount = result?.comments_count;
      if (newCount !== undefined) {
        setCommentsTooltip(prev => ({ ...prev, commentsCount: newCount }));
        setCommentCountOverrides(prev => ({ ...prev, [commentsTooltip.orderId]: newCount }));
      }
      if (showToast) showToast(parentCommentId ? 'Odpověď přidána' : 'Komentář přidán', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Chyba při přidávání komentáře', 'error');
      throw err;
    }
  }, [commentsTooltip.orderId, onAddComment, showToast]);

  const handleDeleteCommentInternal = useCallback(async (commentId) => {
    if (!onDeleteComment) return;
    try {
      const result = await onDeleteComment(commentId);
      const newCount = result?.comments_count;
      const updatedCount = newCount !== undefined ? newCount : Math.max(0, commentsTooltip.commentsCount - 1);
      setCommentsTooltip(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId),
        commentsCount: updatedCount,
      }));
      setCommentCountOverrides(prev => ({ ...prev, [commentsTooltip.orderId]: updatedCount }));
      if (showToast) showToast('Komentář smazán', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Chyba při mazání komentáře', 'error');
    }
  }, [onDeleteComment, commentsTooltip.orderId, commentsTooltip.commentsCount, showToast]);

  if (!open || !anchorRect) return null;

  const formatCZK = (v) => new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v) + ' Kč';

  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={() => { closeCommentsTooltip(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.08)' }}
      />
      {/* Drawer */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: window.innerHeight - anchorRect.top + 6,
          width: '94vw',
          maxWidth: 960,
          maxHeight: Math.min(anchorRect.top - 40, 420),
          background: '#fff',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          border: '2px solid #fca5a5',
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99999,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 1rem 0.6rem 10px',
          borderBottom: '2px solid #fecaca',
          background: '#fef2f2',
          flexShrink: 0,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#991b1b' }}>
            {title}
          </div>
          <button
            onClick={() => { closeCommentsTooltip(); onClose(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#64748b', lineHeight: 1, padding: '0 4px' }}
            title="Zavřít"
          >×</button>
        </div>
        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin', scrollbarColor: '#fecaca #fff' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Načítám...</div>
          ) : !data || data.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Žádné objednávky ke schválení</div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fef2f2', borderBottom: '2px solid #fecaca', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#991b1b', whiteSpace: 'nowrap' }}>Č. objednávky</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#991b1b', width: '36px' }}>💬</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>Datum</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>Objednatel</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>Schvalovatel</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>Stav</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#991b1b', whiteSpace: 'nowrap' }}>Částka</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o, i) => {
                  const oCount = commentCountOverrides[o.id] ?? o.comments_count ?? 0;
                  return (
                    <tr key={o.id} style={{ background: i % 2 === 0 ? '#fff' : '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
                      <td style={{ padding: '6px 10px', maxWidth: '200px' }}>
                        <a href={`${process.env.PUBLIC_URL}/order-form-25?edit=${o.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                          onMouseOver={e => e.target.style.textDecoration = 'underline'}
                          onMouseOut={e => e.target.style.textDecoration = 'none'}>
                          {o.cislo_objednavky}
                        </a>
                        {o.predmet && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: '180px' }} title={o.predmet}>
                            {o.predmet}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenComments(
                              { id: o.id, cislo_objednavky: o.cislo_objednavky, comments_count: oCount, objednatel: o.objednatel, castka: o.castka },
                              { current: e.currentTarget }
                            );
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid',
                            borderColor: oCount > 0 ? '#3b82f6' : '#94a3b8',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '2px 5px',
                            color: oCount > 0 ? '#3b82f6' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = oCount > 0 ? '#eff6ff' : '#f1f5f9';
                            e.currentTarget.style.borderColor = oCount > 0 ? '#2563eb' : '#475569';
                            e.currentTarget.style.color = oCount > 0 ? '#2563eb' : '#334155';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.borderColor = oCount > 0 ? '#3b82f6' : '#94a3b8';
                            e.currentTarget.style.color = oCount > 0 ? '#3b82f6' : '#64748b';
                          }}
                          title={oCount > 0 ? `${oCount} komentářů` : 'Přidat komentář'}
                        >
                          <FontAwesomeIcon icon={faComment} style={{ fontSize: '0.75rem' }} />
                          {oCount > 0 && <span style={{ fontSize: '0.65rem' }}>{oCount}</span>}
                        </button>
                      </td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{o.dt_vytvoreni ? new Date(o.dt_vytvoreni).toLocaleDateString('cs-CZ') : '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#374151' }}>{o.objednatel || '—'}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#374151' }}>{o.schvalovatel || '—'}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, background: '#ffedd5', color: '#9a3412' }}>{o.stav || 'Ke schválení'}</span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#0f172a' }}>
                        {o.castka ? formatCZK(o.castka) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fef2f2', borderTop: '2px solid #fecaca' }}>
                  <td colSpan={6} style={{ padding: '6px 10px', fontWeight: 700, color: '#991b1b', fontSize: '0.75rem' }}>
                    Celkem {data.length} {data.length === 1 ? 'objednávka' : data.length < 5 ? 'objednávky' : 'objednávek'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#991b1b' }}>
                    {formatCZK(data.reduce((s, o) => s + (o.castka || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Comments Tooltip */}
      {commentsTooltip.isOpen && (
        <OrderCommentsTooltip
          orderId={commentsTooltip.orderId}
          orderNumber={commentsTooltip.orderNumber}
          orderInfo={commentsTooltip.orderInfo}
          iconRef={commentsTooltip.iconRef}
          onClose={closeCommentsTooltip}
          comments={commentsTooltip.comments}
          commentsCount={commentsTooltip.commentsCount}
          loading={commentsTooltip.loading}
          error={commentsTooltip.error}
          currentUserId={currentUserId}
          onLoadComments={async () => {
            if (onLoadComments) {
              const result = await onLoadComments(commentsTooltip.orderId);
              setCommentsTooltip(prev => ({
                ...prev,
                comments: result.data || result.comments || [],
                commentsCount: result.comments_count || 0,
              }));
            }
          }}
          onAddComment={handleAddCommentInternal}
          onDeleteComment={handleDeleteCommentInternal}
          onUpdateComments={(updatedComments) => {
            setCommentsTooltip(prev => ({
              ...prev,
              comments: updatedComments,
              commentsCount: updatedComments.length || prev.commentsCount,
            }));
          }}
          showToast={showToast}
          token={token}
          username={username}
          zIndexBase={100000}
        />
      )}
    </>,
    document.body
  );
};

export default KeSchvaleniDrawer;
