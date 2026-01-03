/**
 * 📋 Activity Log Service
 * 
 * Spravuje historii uživatelských aktivit (schválení, zamítnutí, atd.)
 * - Ukládá do localStorage
 * - Drží pouze záznamy z posledního dne
 * - Univerzální pro různé typy objektů (objednávky, faktury, pokladna, ...)
 */

const STORAGE_KEY = 'eeo_activity_log';
const MAX_AGE_HOURS = 24; // Historie pouze z posledních 24 hodin

/**
 * Typy aktivit
 */
export const ACTIVITY_TYPES = {
  // Objednávky - používáme nové české názvy
  ORDER_APPROVED: 'order_status_schvalena',
  ORDER_REJECTED: 'order_status_zamitnuta',
  ORDER_WAITING: 'order_status_ceka_se',
  ORDER_CREATED: 'order_status_ke_schvaleni',
  ORDER_UPDATED: 'order_updated',
  ORDER_DELETED: 'order_deleted',
  
  // Faktury (připraveno do budoucna)
  INVOICE_APPROVED: 'invoice_approved',
  INVOICE_REJECTED: 'invoice_rejected',
  INVOICE_CREATED: 'invoice_created',
  INVOICE_UPDATED: 'invoice_updated',
  
  // Pokladna (připraveno do budoucna)
  CASHBOOK_CREATED: 'cashbook_created',
  CASHBOOK_UPDATED: 'cashbook_updated',
  CASHBOOK_DELETED: 'cashbook_deleted',
};

/**
 * Typ entity
 */
export const ENTITY_TYPES = {
  ORDER: 'order',
  INVOICE: 'invoice',
  CASHBOOK: 'cashbook',
};

/**
 * Struktura aktivity:
 * {
 *   id: string,              // Unikátní ID aktivity
 *   timestamp: number,       // Unix timestamp
 *   entityType: string,      // Typ entity (order, invoice, cashbook, ...)
 *   entityId: number|string, // ID entity
 *   activityType: string,    // Typ aktivity (approved, rejected, ...)
 *   title: string,           // Název/popis entity
 *   amount: number,          // Částka (volitelné)
 *   userName: string,        // Jméno uživatele
 *   description: string,     // Popis aktivity
 *   metadata: object         // Další metadata (volitelné)
 * }
 */

/**
 * Načte všechny aktivity z localStorage a vyfiltruje staré
 */
export const getActivities = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const activities = JSON.parse(stored);
    const now = Date.now();
    const maxAge = MAX_AGE_HOURS * 60 * 60 * 1000; // 24h v ms
    
    // Filtrovat pouze aktivity z posledních 24 hodin
    const recentActivities = activities.filter(activity => {
      return (now - activity.timestamp) < maxAge;
    });
    
    // Uložit zpět vyfiltrovaný seznam
    if (recentActivities.length !== activities.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentActivities));
    }
    
    // Vrátit seřazené od nejnovějších
    return recentActivities.sort((a, b) => b.timestamp - a.timestamp);
    
  } catch (error) {
    console.error('[ActivityLog] Chyba při načítání aktivit:', error);
    return [];
  }
};

/**
 * Přidá novou aktivitu
 */
export const addActivity = ({
  entityType,
  entityId,
  activityType,
  title,
  amount = null,
  userName,
  description,
  metadata = {}
}) => {
  try {
    const activities = getActivities();
    
    const newActivity = {
      id: `${entityType}_${entityId}_${Date.now()}`,
      timestamp: Date.now(),
      entityType,
      entityId,
      activityType,
      title,
      amount,
      userName,
      description,
      metadata
    };
    
    activities.unshift(newActivity); // Přidat na začátek
    
    // Omezit počet aktivit (max 100)
    const limitedActivities = activities.slice(0, 100);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedActivities));
    
    console.log('[ActivityLog] Aktivita přidána:', newActivity);
    return newActivity;
    
  } catch (error) {
    console.error('[ActivityLog] Chyba při přidávání aktivity:', error);
    return null;
  }
};

/**
 * Vymaže všechny aktivity
 */
export const clearActivities = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[ActivityLog] Všechny aktivity vymazány');
    return true;
  } catch (error) {
    console.error('[ActivityLog] Chyba při mazání aktivit:', error);
    return false;
  }
};

/**
 * Získá ikonu pro typ aktivity
 */
export const getActivityIcon = (activityType) => {
  const iconMap = {
    // Schválení
    [ACTIVITY_TYPES.ORDER_APPROVED]: 'faCheckCircle',
    [ACTIVITY_TYPES.INVOICE_APPROVED]: 'faCheckCircle',
    
    // Zamítnutí
    [ACTIVITY_TYPES.ORDER_REJECTED]: 'faTimesCircle',
    [ACTIVITY_TYPES.INVOICE_REJECTED]: 'faTimesCircle',
    
    // Čekání
    [ACTIVITY_TYPES.ORDER_WAITING]: 'faHourglassHalf',
    
    // Vytvoření
    [ACTIVITY_TYPES.ORDER_CREATED]: 'faPlusCircle',
    [ACTIVITY_TYPES.INVOICE_CREATED]: 'faPlusCircle',
    [ACTIVITY_TYPES.CASHBOOK_CREATED]: 'faPlusCircle',
    
    // Úprava
    [ACTIVITY_TYPES.ORDER_UPDATED]: 'faEdit',
    [ACTIVITY_TYPES.INVOICE_UPDATED]: 'faEdit',
    [ACTIVITY_TYPES.CASHBOOK_UPDATED]: 'faEdit',
    
    // Smazání
    [ACTIVITY_TYPES.ORDER_DELETED]: 'faTrash',
    [ACTIVITY_TYPES.CASHBOOK_DELETED]: 'faTrash',
  };
  
  return iconMap[activityType] || 'faInfoCircle';
};

/**
 * Získá CSS třídu pro typ aktivity (pro barvu)
 */
export const getActivityColorClass = (activityType) => {
  if (activityType.includes('approved')) return 'activity-success';
  if (activityType.includes('rejected')) return 'activity-danger';
  if (activityType.includes('waiting')) return 'activity-warning';
  if (activityType.includes('created')) return 'activity-info';
  if (activityType.includes('updated')) return 'activity-info';
  if (activityType.includes('deleted')) return 'activity-danger';
  return 'activity-default';
};

/**
 * Formátuje časový rozdíl (např. "před 5 minutami")
 */
export const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'právě teď';
  if (minutes < 60) return `před ${minutes} min`;
  if (hours < 24) return `před ${hours} h`;
  return 'před 1 dnem';
};

export default {
  getActivities,
  addActivity,
  clearActivities,
  getActivityIcon,
  getActivityColorClass,
  formatTimeAgo,
  ACTIVITY_TYPES,
  ENTITY_TYPES
};
