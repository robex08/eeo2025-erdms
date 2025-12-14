import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useThemeMode from '../../theme/useThemeMode';
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
  const { user: authUser, userDetail, token, username } = useContext(AuthContext);
  // ✅ Inicializace theme mode - zapne detekci system preference
  useThemeMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    orders: null,
    invoices: null,
    cashbook: null,
    notifications: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Sestavíme user objekt pro kompatibilitu
  const user = authUser ? {
    ...authUser,
    displayName: userDetail?.jmeno_prijmeni || authUser.username,
    mail: userDetail?.email || '',
    upn: authUser.username
  } : null;

  useEffect(() => {
    loadInitialData();
  }, [selectedYear]);

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
      // Pokud nemáme token, zobraz prázdná data
      if (!token || !username) {
        console.error('[MobileDashboard] ❌ No token/username - cannot load data!');
        setData({
          orders: null,
          invoices: null,
          cashbook: null,
          notifications: { unread: 0 }
        });
        return;
      }

      console.log('[MobileDashboard] Loading real data for year:', selectedYear, 'token:', token ? 'present' : 'MISSING', 'username:', username);

      // Načti ostrá data s tokenem
      const result = await mobileDataService.getAllMobileData({ 
        token, 
        username,
        year: selectedYear 
      });
      
      console.log('[MobileDashboard] Result received:', result);
      console.log('[MobileDashboard] Data sources:', result.meta?.dataSource);
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('[MobileDashboard] Result not successful:', result);
      }
    } catch (error) {
      console.error('[MobileDashboard] Load error:', error);
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

  // Během načítání nic nevracíme - SplashScreen zůstane viditelný
  if (loading) {
    return null;
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

  // Widgety pro faktury - STAVY (zaplacení)
  // ✅ IKONY z desktop modulu
  const invoiceStatusWidgets = [];
  const invoiceTypeWidgets = [];
  
  if (data.invoices) {
    // === STAVY ZAPLACENÍ ===
    if (data.invoices.paid?.count > 0) {
      invoiceStatusWidgets.push({
        id: 'invoices-paid',
        title: 'Zaplaceno',
        count: data.invoices.paid.count,
        amount: data.invoices.paid.amount,
        icon: faCheckCircle,
        color: 'green',
        category: 'invoices-status'
      });
    }
    if (data.invoices.unpaid?.count > 0) {
      invoiceStatusWidgets.push({
        id: 'invoices-unpaid',
        title: 'Nezaplaceno',
        count: data.invoices.unpaid.count,
        amount: data.invoices.unpaid.amount,
        icon: faHourglassHalf,
        color: 'orange',
        category: 'invoices-status'
      });
    }
    if (data.invoices.overdue?.count > 0) {
      invoiceStatusWidgets.push({
        id: 'invoices-overdue',
        title: 'Po splatnosti',
        count: data.invoices.overdue.count,
        amount: data.invoices.overdue.amount,
        icon: faExclamationTriangle,
        color: 'red',
        category: 'invoices-status'
      });
    }
    
    // === TYPY FAKTUR ===
    if (data.invoices.regular?.count > 0) {
      invoiceTypeWidgets.push({
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
      invoiceTypeWidgets.push({
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
      invoiceTypeWidgets.push({
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
      invoiceTypeWidgets.push({
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
      invoiceTypeWidgets.push({
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
      invoiceTypeWidgets.push({
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

  // Widget pro pokladnu (pokud má uživatel více pokladen, zobrazí dropdown)
  const cashbookWidgets = [];
  if (data.cashbook && data.cashbook.pokladny && data.cashbook.pokladny.length > 0) {
    const pokladny = data.cashbook.pokladny;
    
    // Pokud má uživatel více než 1 pokladnu, vytvoř widget pro každou
    if (pokladny.length > 1) {
      pokladny.forEach(pokladna => {
        if (pokladna.aktivni && pokladna.pocet_zaznamu > 0) {
          cashbookWidgets.push({
            id: `cashbook-${pokladna.id}`,
            title: `Pokladna ${pokladna.cislo_pokladny}`,
            subtitle: pokladna.nazev || '',
            count: pokladna.pocet_zaznamu,
            amount: pokladna.koncovy_stav,
            icon: getStatusIcon('nova'),
            color: 'purple',
            category: 'cashbook'
          });
        }
      });
    } else if (pokladny.length === 1) {
      // Pokud má jen 1 pokladnu, zobraz ji jako jeden widget
      const pokladna = pokladny[0];
      if (pokladna.aktivni) {
        cashbookWidgets.push({
          id: 'cashbook',
          title: 'Pokladna',
          count: pokladna.pocet_zaznamu,
          subtitle: 'Záznamy v měsíci',
          amount: pokladna.koncovy_stav,
          icon: getStatusIcon('nova'),
          color: 'purple',
          category: 'cashbook'
        });
      }
    }
  }
  
  // Pro zpětnou kompatibilitu - pokud cashbook nemá strukturu pokladny[], použij staré API
  const cashbookWidget = cashbookWidgets.length === 0 && data.cashbook && data.cashbook.count > 0 ? {
    id: 'cashbook',
    title: 'Pokladna',
    count: data.cashbook.count,
    subtitle: 'Záznamy v měsíci',
    amount: data.cashbook.balance,
    icon: getStatusIcon('nova'),
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

        {/* Sekce faktury - STAVY */}
        {invoiceStatusWidgets.length > 0 && (
          <section className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Faktury - stavy</h2>
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
              {invoiceStatusWidgets.map(widget => (
                <WidgetCard key={widget.id} widget={widget} />
              ))}
            </div>
          </section>
        )}

        {/* Sekce faktury - TYPY */}
        {invoiceTypeWidgets.length > 0 && (
          <section className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Faktury - typy</h2>
            </div>
            <div className="mobile-widget-grid">
              {invoiceTypeWidgets.map(widget => (
                <WidgetCard key={widget.id} widget={widget} />
              ))}
            </div>
          </section>
        )}

        {/* Sekce pokladna */}
        {(cashbookWidgets.length > 0 || cashbookWidget) && (
          <section className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Pokladna</h2>
              <div className="mobile-section-summary">
                <span className="mobile-summary-count">Aktuální měsíc</span>
              </div>
            </div>
            <div className="mobile-widget-grid">
              {/* Zobraz buď jednotlivé pokladny nebo souhrnný widget */}
              {cashbookWidgets.length > 0 ? (
                cashbookWidgets.map(widget => (
                  <WidgetCard key={widget.id} widget={widget} />
                ))
              ) : (
                cashbookWidget && <WidgetCard widget={cashbookWidget} />
              )}
            </div>
          </section>
        )}

        {/* Prázdný stav */}
        {orderWidgets.length === 0 && invoiceStatusWidgets.length === 0 && invoiceTypeWidgets.length === 0 && cashbookWidgets.length === 0 && !cashbookWidget && (
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
      {/* Horní řada: Číslo + Ikona */}
      <div className="mobile-widget-header">
        {widget.count !== null && widget.count !== undefined && (
          <div className="mobile-widget-count">{widget.count}</div>
        )}
        <div className="mobile-widget-icon">
          <FontAwesomeIcon icon={widget.icon} />
        </div>
      </div>
      
      {/* Název stavu */}
      <div className="mobile-widget-title">{widget.title}</div>
      
      {widget.subtitle && (
        <div className="mobile-widget-subtitle">{widget.subtitle}</div>
      )}
      
      {/* Částka (pokud existuje) */}
      {widget.amount !== null && widget.amount !== undefined && (
        <div className="mobile-widget-amount">{formatCurrency(widget.amount)}</div>
      )}
    </div>
  );
}

export default MobileDashboard;
