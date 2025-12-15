import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faTimesCircle, 
  faHourglassHalf, 
  faPlusCircle,
  faEdit,
  faTrash,
  faInfoCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { 
  getActivities, 
  clearActivities, 
  getActivityColorClass, 
  formatTimeAgo,
  ENTITY_TYPES 
} from '../../services/activityLogService';
import './MobileActivityLog.css';

/**
 * 📋 Mobilní Activity Log
 * Zobrazuje historii posledních aktivit uživatele (24h)
 * - Schválení/zamítnutí objednávek
 * - Vytváření/úpravy faktur, pokladny atd.
 * 
 * Design: Podobný jako OrderApprovalCard
 */
function MobileActivityLog({ isOpen, onClose }) {
  const [activities, setActivities] = useState([]);

  // Načíst aktivity při otevření
  useEffect(() => {
    if (isOpen) {
      loadActivities();
    }
  }, [isOpen]);

  const loadActivities = () => {
    const loadedActivities = getActivities();
    setActivities(loadedActivities);
  };

  const handleClearAll = () => {
    if (window.confirm('Opravdu smazat celou historii aktivit?')) {
      clearActivities();
      setActivities([]);
    }
  };

  const getIconComponent = (activityType) => {
    if (activityType.includes('approved')) return faCheckCircle;
    if (activityType.includes('rejected')) return faTimesCircle;
    if (activityType.includes('waiting')) return faHourglassHalf;
    if (activityType.includes('created')) return faPlusCircle;
    if (activityType.includes('updated')) return faEdit;
    if (activityType.includes('deleted')) return faTrash;
    return faInfoCircle;
  };

  const getEntityLabel = (entityType) => {
    const labels = {
      [ENTITY_TYPES.ORDER]: 'Objednávka',
      [ENTITY_TYPES.INVOICE]: 'Faktura',
      [ENTITY_TYPES.CASHBOOK]: 'Pokladna',
    };
    return labels[entityType] || entityType;
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-activity-overlay" onClick={onClose}>
      <div className="mobile-activity-panel" onClick={(e) => e.stopPropagation()}>
        {/* Hlavička */}
        <div className="mobile-activity-header">
          <h2>
            📋 Historie aktivit
            <span className="mobile-activity-count">{activities.length}</span>
          </h2>
          <button className="mobile-activity-close" onClick={onClose} aria-label="Zavřít">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Subtitle */}
        <div className="mobile-activity-subtitle">
          Poslední aktivity za 24 hodin
        </div>

        {/* Seznam aktivit */}
        <div className="mobile-activity-list">
          {activities.length === 0 ? (
            <div className="mobile-activity-empty">
              <FontAwesomeIcon icon={faInfoCircle} className="empty-icon" />
              <p>Zatím žádné aktivity</p>
              <span className="empty-hint">Schválení a další akce se zobrazí zde</span>
            </div>
          ) : (
            activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`mobile-activity-card ${getActivityColorClass(activity.activityType)}`}
                data-entity-id={activity.metadata?.orderId || activity.id}
              >
                {/* Ikona aktivity */}
                <div className="activity-icon">
                  <FontAwesomeIcon icon={getIconComponent(activity.activityType)} />
                </div>

                {/* Obsah */}
                <div className="activity-content">
                  {/* Typ entity + časové razítko */}
                  <div className="activity-meta">
                    <span className="activity-entity">{getEntityLabel(activity.entityType)}</span>
                    <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                  </div>

                  {/* Evidenční číslo objednávky */}
                  <div className="activity-title">
                    Ev. číslo: {activity.metadata?.orderNumber || activity.entityId}
                  </div>
                  
                  {/* Název objednávky */}
                  {activity.title && !activity.title.startsWith('Objednávka') && (
                    <div className="activity-description" style={{ fontWeight: 600, color: '#212529', marginBottom: '0.25rem' }}>
                      {activity.title}
                    </div>
                  )}
                  
                  {/* Popis akce */}
                  <div className="activity-description">{activity.description}</div>

                  {/* Částka (pokud je) */}
                  {activity.amount && (
                    <div className="activity-amount">
                      {new Intl.NumberFormat('cs-CZ', {
                        style: 'currency',
                        currency: 'CZK',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(activity.amount)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer s tlačítkem vymazat */}
        {activities.length > 0 && (
          <div className="mobile-activity-footer">
            <button className="mobile-activity-clear-btn" onClick={handleClearAll}>
              <FontAwesomeIcon icon={faTrash} />
              Vymazat historii
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileActivityLog;
