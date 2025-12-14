import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import mobileDataService from '../../services/mobileDataService';
import { getStatusIcon } from '../../utils/iconMapping';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faHourglassHalf, 
  faExclamationTriangle, 
  faTimesCircle 
} from '@fortawesome/free-solid-svg-icons';
import './MobileDashboard.css';

/**
 * 📱 Mobilní dashboard s widget dlaždicemi
 * Zobrazuje statistiky dle práv uživatele:
 * - Objednávky (dle stavů workflow)
 * - Faktury (dle stavů)
 * - Pokladna (záznamy v měsíci)
 * 
 * 🎨 Podporuje light/dark mode dle system preference
 */
function MobileDashboard() {
  const { user: authUser, userDetail } = useContext(AuthContext);
  const { theme } = useTheme(); // 🎨 Detekce system theme (light/dark)
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    orders: null,
    invoices: null,
    cashbook: null,
    notifications: null
  });
  const [refreshing, setRefreshing] = useState(false);

  // Sestavíme user objekt pro kompatibilitu
  const user = authUser ? {
    ...authUser,
    displayName: userDetail?.jmeno_prijmeni || authUser.username,
    mail: userDetail?.email || '',
    upn: authUser.username
  } : null;

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const result = await mobileDataService.getAllMobileData();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('MobileDashboard load error:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="mobile-dashboard-loading">
        <div className="spinner-circle"></div>
        <p>Načítání...</p>
      </div>
    );
  }

  // Notifikace - počet nepřečtených
  const notificationCount = data.notifications?.unread || 0;

  // Sestavení widgetů pro objednávky (zobrazovat JEN když count > 0)
  // ✅ IKONY z desktop modulu (Orders25List.js + iconMapping.js)
  const orderWidgets = [];
  if (data.orders) {
    if (data.orders.pending?.count > 0) {
      orderWidgets.push({
        id: 'orders-pending',
        title: 'Ke schválení',
        count: data.orders.pending.count,
        amount: data.orders.pending.amount,
        icon: getStatusIcon('ke_schvaleni'), // ⏳ Desktop: faHourglassHalf
        color: 'orange',
        category: 'orders'
      });
    }
    if (data.orders.approved?.count > 0) {
      orderWidgets.push({
        id: 'orders-approved',
        title: 'Schváleno',
        count: data.orders.approved.count,
        amount: data.orders.approved.amount,
        icon: getStatusIcon('schvalena'), // ✅ Desktop: faCheckCircle
        color: 'green',
        category: 'orders'
      });
    }
    if (data.orders.inProgress?.count > 0) {
      orderWidgets.push({
        id: 'orders-progress',
        title: 'V realizaci',
        count: data.orders.inProgress.count,
        amount: data.orders.inProgress.amount,
        icon: getStatusIcon('rozpracovana'), // 🕐 Desktop: faClock
        color: 'blue',
        category: 'orders'
      });
    }
    if (data.orders.completed?.count > 0) {
      orderWidgets.push({
        id: 'orders-completed',
        title: 'Dokončeno',
        count: data.orders.completed.count,
        amount: data.orders.completed.amount,
        icon: getStatusIcon('dokoncena'), // 🎯 Desktop: faBullseye
        color: 'teal',
        category: 'orders'
      });
    }
    if (data.orders.rejected?.count > 0) {
      orderWidgets.push({
        id: 'orders-rejected',
        title: 'Zamítnuto',
        count: data.orders.rejected.count,
        amount: data.orders.rejected.amount,
        icon: getStatusIcon('zamitnuta'), // ❌ Desktop: faTimesCircle
        color: 'red',
        category: 'orders'
      });
    }
    if (data.orders.cancelled?.count > 0) {
      orderWidgets.push({
        id: 'orders-cancelled',
        title: 'Zrušeno',
        count: data.orders.cancelled.count,
        amount: data.orders.cancelled.amount,
        icon: getStatusIcon('zrusena'), // ❌ Desktop: faTimesCircle
        color: 'gray',
        category: 'orders'
      });
    }
  }

  // Widgety pro faktury - stavy + typy
  // ✅ IKONY z desktop modulu
  const invoiceWidgets = [];
  if (data.invoices) {
    // Stavy zaplací
    if (data.invoices.paid?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-paid',
        title: 'Zaplaceno',
        count: data.invoices.paid.count,
        amount: data.invoices.paid.amount,
        icon: faCheckCircle, // ✅ STEJNÁ ikona jako desktop Invoices25List.js
        color: 'green',
        category: 'invoices'
      });
    }
    if (data.invoices.unpaid?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-unpaid',
        title: 'Nezaplaceno',
        count: data.invoices.unpaid.count,
        amount: data.invoices.unpaid.amount,
        icon: faHourglassHalf, // ✅ STEJNÁ ikona jako desktop Invoices25List.js
        color: 'orange',
        category: 'invoices'
      });
    }
    if (data.invoices.overdue?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-overdue',
        title: 'Po splatnosti',
        count: data.invoices.overdue.count,
        amount: data.invoices.overdue.amount,
        icon: faExclamationTriangle, // ✅ STEJNÁ ikona jako desktop Invoices25List.js
        color: 'red',
        category: 'invoices'
      });
    }
    
    // Typy faktur - všech 5 typů z číselníku
    if (data.invoices.regular?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-regular',
        title: 'Běžná',
        count: data.invoices.regular.count,
        amount: data.invoices.regular.amount,
        icon: getStatusIcon('schvalena'), // ✅ Desktop: faCheckCircle
        color: 'blue',
        category: 'invoices'
      });
    }
    if (data.invoices.advance?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-advance',
        title: 'Zálohová',
        count: data.invoices.advance.count,
        amount: data.invoices.advance.amount,
        icon: getStatusIcon('ke_schvaleni'), // ⏳ Desktop: faHourglassHalf
        color: 'purple',
        category: 'invoices'
      });
    }
    if (data.invoices.corrective?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-corrective',
        title: 'Opravná',
        count: data.invoices.corrective.count,
        amount: data.invoices.corrective.amount,
        icon: getStatusIcon('rozpracovana'), // 🕐 Desktop: faClock
        color: 'teal',
        category: 'invoices'
      });
    }
    if (data.invoices.proforma?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-proforma',
        title: 'Proforma',
        count: data.invoices.proforma.count,
        amount: data.invoices.proforma.amount,
        icon: getStatusIcon('potvrzena'), // ✔️ Desktop: faShield
        color: 'blue',
        category: 'invoices'
      });
    }
    if (data.invoices.creditNote?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-creditnote',
        title: 'Dobropis',
        count: data.invoices.creditNote.count,
        amount: data.invoices.creditNote.amount,
        icon: getStatusIcon('zrusena'), // ❌ Desktop: faTimesCircle
        color: 'gray',
        category: 'invoices'
      });
    }
    // ✅ Bez přiřazení (bez obj. ANI smlouvy)
    if (data.invoices.withoutAssignment?.count > 0) {
      invoiceWidgets.push({
        id: 'invoices-without-assignment',
        title: 'Bez přiřazení',
        count: data.invoices.withoutAssignment.count,
        amount: data.invoices.withoutAssignment.amount,
        icon: faTimesCircle, // ✅ STEJNÁ ikona jako desktop Invoices25List.js
        color: 'gray',
        category: 'invoices'
      });
    }
  }

  // Widget pro pokladnu
  const cashbookWidget = data.cashbook && data.cashbook.count > 0 ? {
    id: 'cashbook',
    title: 'Pokladna',
    count: data.cashbook.count,
    subtitle: 'Záznamy v měsíci',
    amount: data.cashbook.balance,
    icon: getStatusIcon('nova'), // 📝 Desktop: faPlay (nový záznam)
    color: 'purple',
    category: 'cashbook'
  } : null;

  return (
    <div className="mobile-dashboard">
      <MobileHeader 
        onMenuClick={() => setMenuOpen(true)}
        notificationCount={notificationCount}
      />
      
      <MobileMenu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
      />

      <main className="mobile-dashboard-content">
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="mobile-refresh-indicator">
            <div className="spinner-circle small"></div>
            <span>Obnovuji data...</span>
          </div>
        )}

        {/* Sekce objednávky */}
        {orderWidgets.length > 0 && (
          <section className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Objednávky</h2>
              <div className="mobile-section-summary">
                {data.orders.total > 0 && (
                  <>
                    <span className="mobile-summary-count">{data.orders.total} ks</span>
                    {data.orders.totalAmount > 0 && (
                      <span className="mobile-summary-amount">{formatCurrency(data.orders.totalAmount)}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="mobile-widget-grid">
              {orderWidgets.map(widget => (
                <WidgetCard key={widget.id} widget={widget} />
              ))}
            </div>
          </section>
        )}

        {/* Sekce faktury */}
        {invoiceWidgets.length > 0 && (
          <section className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Faktury</h2>
              <div className="mobile-section-summary">
                {data.invoices.total > 0 && (
                  <>
                    <span className="mobile-summary-count">{data.invoices.total} ks</span>
                    {data.invoices.totalAmount > 0 && (
                      <span className="mobile-summary-amount">{formatCurrency(data.invoices.totalAmount)}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="mobile-widget-grid">
              {invoiceWidgets.map(widget => (
                <WidgetCard key={widget.id} widget={widget} />
              ))}
            </div>
          </section>
        )}

        {/* Sekce pokladna */}
        {cashbookWidget && (
          <section className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Pokladna</h2>
              <div className="mobile-section-summary">
                <span className="mobile-summary-count">Aktuální měsíc</span>
              </div>
            </div>
            <div className="mobile-widget-grid">
              <WidgetCard widget={cashbookWidget} />
            </div>
          </section>
        )}

        {/* Prázdný stav */}
        {orderWidgets.length === 0 && invoiceWidgets.length === 0 && !cashbookWidget && (
          <div className="mobile-empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <p>Žádná data k zobrazení</p>
          </div>
        )}

        {/* Tlačítko pro obnovení */}
        <button 
          className="mobile-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>Obnovit data</span>
        </button>
      </main>
    </div>
  );
}

/**
 * Komponenta pro jednotlivou dlaždici
 * ✅ Používá FontAwesome ikony z desktop modulu (stejné jako Orders25List.js)
 */
function WidgetCard({ widget }) {
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`mobile-widget-card ${widget.color}`}>
      <div className="mobile-widget-icon">
        {/* ✅ FontAwesome ikony z desktop modulu */}
        <FontAwesomeIcon icon={widget.icon} />
      </div>
      <div className="mobile-widget-content">
        {/* Zobraz count jako hlavní číslo */}
        {widget.count !== null && widget.count !== undefined && (
          <div className="mobile-widget-count">{widget.count}</div>
        )}
        
        <div className="mobile-widget-title">{widget.title}</div>
        
        {widget.subtitle && (
          <div className="mobile-widget-subtitle">{widget.subtitle}</div>
        )}
        
        {/* Zobraz amount jako sekundární info pod titulem */}
        {widget.amount !== null && widget.amount !== undefined && (
          <div className="mobile-widget-amount">{formatCurrency(widget.amount)}</div>
        )}
      </div>
    </div>
  );
}

export default MobileDashboard;
