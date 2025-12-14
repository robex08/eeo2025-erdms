import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useThemeMode from '../../theme/useThemeMode';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import SplashScreen from '../SplashScreen';
import mobileDataService from '../../services/mobileDataService';
import { fetchActiveUsersWithStats } from '../../services/api2auth';
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
  // ✅ Inicializace theme mode - automatická detekce systémového režimu + ruční přepínač v menu
  const { mode } = useThemeMode();
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
  const [activeUsers, setActiveUsers] = useState([]);

  // Sestavíme user objekt pro kompatibilitu
  const user = authUser ? {
    ...authUser,
    displayName: userDetail?.jmeno_prijmeni || authUser.username,
    mail: userDetail?.email || '',
    upn: authUser.username
  } : null;

  // Kontrola admin funkce role
  const isAdmin = userDetail?.roles?.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  ) || false;

  // Scroll s offsetem pro fixní hlavičku (60px) + nav bar (48px) + 8px mezera = 116px
  const scrollToSection = (sectionName) => {
    const element = document.querySelector(`[data-section="${sectionName}"]`);
    if (element) {
      const remInPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const extraSpace = 0.5 * remInPx; // 0.5em v pixelech
      const offsetTop = element.offsetTop - 108 - extraSpace;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

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

  const loadActiveUsers = async () => {
    if (!token || !username || !isAdmin) return;
    
    try {
      const users = await fetchActiveUsersWithStats({ token, username });
      setActiveUsers(users || []);
    } catch (error) {
      console.error('[MobileDashboard] Error loading active users:', error);
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
        // Načti aktivní uživatele pro adminy
        if (isAdmin) {
          await loadActiveUsers();
        }
      } else {
        console.error('[MobileDashboard] Result not successful:', result);
      }
    } catch (error) {
      console.error('[MobileDashboard] Load error:', error);
    }
  };

  const handleManualRefresh = async () => {
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

  // Během načítání zobrazíme SplashScreen
  if (loading) {
    return <SplashScreen message={refreshing ? "Obnovuji data..." : "Načítám dashboard..."} />;
  }

  // Notifikace - počet nepřečtených
  const notificationCount = data.notifications?.unread || 0;

  // Sestavení widgetů pro objednávky
  // ✅ IKONY z desktop modulu (Orders25List.js + iconMapping.js)
  const orderWidgets = [];
  if (data.orders) {
    // KE SCHVÁLENÍ - vždy zobrazit (i když 0)
    orderWidgets.push({
      id: 'orders-pending',
      title: 'Ke schválení',
      count: data.orders.pending?.count || 0,
      amount: data.orders.pending?.amount || 0,
      icon: getStatusIcon('ke_schvaleni'), // ⏳ Desktop: faHourglassHalf
      color: 'orange',
      category: 'orders'
    });
    
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
    
    // MÁ BÝT ZVEŘEJNĚNA - vždy zobrazit (i když 0)
    orderWidgets.push({
      id: 'orders-ma-byt-zverejnena',
      title: 'Má být zveřejněna',
      count: data.orders.maBytZverejnena?.count || 0,
      amount: data.orders.maBytZverejnena?.amount || 0,
      icon: getStatusIcon('k_uverejneni_do_registru'), // Desktop icon
      color: 'teal',
      category: 'orders'
    });
    
    // UVEŘEJNĚNÁ - vždy zobrazit (i když 0)
    orderWidgets.push({
      id: 'orders-uverejnena',
      title: 'Uveřejněná',
      count: data.orders.uverejnena?.count || 0,
      amount: data.orders.uverejnena?.amount || 0,
      icon: getStatusIcon('uverejnena'), // Desktop icon
      color: 'blue',
      category: 'orders'
    });
    
    // VĚCNÁ SPRÁVNOST
    if (data.orders.vecnaSpravnost?.count > 0) {
      orderWidgets.push({
        id: 'orders-vecna-spravnost',
        title: 'Věcná správnost',
        count: data.orders.vecnaSpravnost.count,
        amount: data.orders.vecnaSpravnost.amount,
        icon: getStatusIcon('vecna_spravnost'), // Desktop icon
        color: 'purple',
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

  // Pokladny - speciální komponenta s 2x2 gridem
  const cashbookData = [];
  if (data.cashbook && data.cashbook.pokladny && data.cashbook.pokladny.length > 0) {
    const pokladny = data.cashbook.pokladny;
    
    pokladny.forEach(pokladna => {
      if (pokladna.aktivni) {
        cashbookData.push({
          id: pokladna.id,
          cislo: pokladna.cislo_pokladny,
          nazev: pokladna.nazev || '',
          zaznamy: pokladna.pocet_zaznamu || 0,
          prevod: pokladna.prevod || 0,
          zustatek: pokladna.koncovy_stav || 0,
          prijmy: pokladna.prijmy_pocet || 0,
          prijmyCastka: pokladna.prijmy_castka || 0,
          vydaje: pokladna.vydaje_pocet || 0,
          vydajeCastka: pokladna.vydaje_castka || 0
        });
      }
    });
  }

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

      {/* Fixní rychlá navigace */}
      <nav className="mobile-quick-nav">
        {isAdmin && activeUsers.length > 0 && (
          <button 
            className="mobile-quick-nav-btn"
            onClick={() => scrollToSection('users')}
          >
            USR
          </button>
        )}
        <button 
          className="mobile-quick-nav-btn"
          onClick={() => scrollToSection('orders')}
        >
          OBJ
        </button>
        <button 
          className="mobile-quick-nav-btn"
          onClick={() => scrollToSection('invoices')}
        >
          FA
        </button>
        <button 
          className="mobile-quick-nav-btn"
          onClick={() => scrollToSection('cashbook')}
        >
          POKL
        </button>
      </nav>

      <main className="mobile-dashboard-content">
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="mobile-refresh-indicator">
            <div className="spinner-circle small"></div>
            <span>Obnovuji data...</span>
          </div>
        )}

        {/* 👥 AKTIVNÍ UŽIVATELÉ - Pouze pro ADMIN */}
        {isAdmin && activeUsers.length > 0 && (
          <section data-section="users" className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Aktivní uživatelé</h2>
              <div className="mobile-section-summary">
                <span className="mobile-summary-count">{activeUsers.length} online</span>
              </div>
            </div>
            
            {/* Jedna velká dlaždice se seznamem */}
            <div className="mobile-users-card">
              {/* Detail prvních 5 uživatelů */}
              <div className="mobile-users-list">
                {activeUsers.slice(0, 5).map((user, index) => {
                  const now = new Date();
                  const activityTime = new Date(user.dt_posledni_aktivita);
                  const diffSec = Math.floor((now - activityTime) / 1000);
                  const diffMin = Math.floor(diffSec / 60);
                  
                  // Formátování času
                  let timeText = '';
                  if (diffSec < 60) {
                    timeText = `${diffSec}s`;
                  } else if (diffMin < 60) {
                    timeText = `${diffMin}m`;
                  } else {
                    const hours = Math.floor(diffMin / 60);
                    timeText = `${hours}h`;
                  }
                  
                  // Status color
                  const statusColor = diffSec < 270 ? '#22c55e' : diffSec < 300 ? '#f59e0b' : '#ef4444';
                  
                  // Formátování data a času
                  const dateTimeText = activityTime.toLocaleString('cs-CZ', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  // Formátování statistik
                  const stats = user.stats || {};
                  const statsText = [];
                  if (stats.objednavky > 0) statsText.push(`OBJ: ${stats.objednavky}`);
                  if (stats.faktury > 0) statsText.push(`FA: ${stats.faktury}`);
                  if (stats.pokladna_zustatek !== null) {
                    const zustatek = new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: 'CZK',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(stats.pokladna_zustatek);
                    statsText.push(`POKL: ${zustatek}`);
                  }
                  
                  return (
                    <div key={index} className="mobile-user-item">
                      <div 
                        className="mobile-user-status" 
                        style={{ background: statusColor }}
                      />
                      <div className="mobile-user-info">
                        <div className="mobile-user-row">
                          <span className="mobile-user-name">{user.cele_jmeno || user.username}</span>
                          <span className="mobile-user-time">{dateTimeText} ({timeText})</span>
                        </div>
                        {statsText.length > 0 && (
                          <span className="mobile-user-stats">({statsText.join(', ')})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Zbytek jako prostý seznam */}
              {activeUsers.length > 5 && (
                <div className="mobile-users-more">
                  <div className="mobile-users-more-title">
                    +{activeUsers.length - 5} dalších aktivních
                  </div>
                  <div className="mobile-users-more-list">
                    {activeUsers.slice(5).map((user, index) => (
                      <span key={index} className="mobile-users-more-name">
                        {user.cele_jmeno || user.username}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sekce objednávky */}
        {orderWidgets.length > 0 && (
          <section data-section="orders" className="mobile-widget-section">
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
          <section data-section="invoices" className="mobile-widget-section">
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

        {/* Sekce pokladna - speciální 2x2 grid */}
        {cashbookData.length > 0 && (
          <section data-section="cashbook" className="mobile-widget-section">
            <div className="mobile-section-header">
              <h2>Pokladna</h2>
              <div className="mobile-section-summary">
                <span className="mobile-summary-count">Aktuální měsíc</span>
              </div>
            </div>
            {cashbookData.map(pokladna => (
              <CashbookCard key={pokladna.id} cashbook={pokladna} formatCurrency={formatCurrency} />
            ))}
          </section>
        )}

        {/* Prázdný stav */}
        {orderWidgets.length === 0 && invoiceStatusWidgets.length === 0 && invoiceTypeWidgets.length === 0 && cashbookData.length === 0 && (
          <div className="mobile-empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <p>Žádná data k zobrazení</p>
          </div>
        )}

      </main>

      {/* Fixní patička s tlačítkem obnovit */}
      <footer className="mobile-footer">
        <button 
          className="mobile-footer-refresh-btn"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className={refreshing ? 'spinning' : ''}>
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>{refreshing ? 'Obnovuji...' : 'Obnovit data'}</span>
        </button>
      </footer>
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
      
      {/* Název stavu a částka - bez mezery */}
      <div className="mobile-widget-info">
        <div className="mobile-widget-title">{widget.title}</div>
        {widget.amount !== null && widget.amount !== undefined && (
          <div className="mobile-widget-amount">{formatCurrency(widget.amount)}</div>
        )}
      </div>
      {widget.subtitle && (
        <div className="mobile-widget-subtitle">{widget.subtitle}</div>
      )}
    </div>
  );
}

/**
 * Speciální komponenta pro pokladnu - 2x2 grid s přehledem
 */
function CashbookCard({ cashbook, formatCurrency }) {
  const title = cashbook.cislo ? `Pokladna ${cashbook.cislo}` : 'Pokladna';
  
  return (
    <div className="mobile-cashbook-card">
      {cashbook.nazev && (
        <div className="mobile-cashbook-title">{title} - {cashbook.nazev}</div>
      )}
      <div className="mobile-cashbook-grid">
        {/* Převod */}
        <div className="mobile-cashbook-item">
          <div className="mobile-cashbook-label">Převod</div>
          <div className="mobile-cashbook-value">{formatCurrency(cashbook.prevod)}</div>
        </div>
        
        {/* Zůstatek */}
        <div className="mobile-cashbook-item highlight">
          <div className="mobile-cashbook-label">Zůstatek</div>
          <div className="mobile-cashbook-value">{formatCurrency(cashbook.zustatek)}</div>
        </div>
        
        {/* Příjmy */}
        <div className="mobile-cashbook-item">
          <div className="mobile-cashbook-label">Příjmy</div>
          <div className="mobile-cashbook-count">{cashbook.prijmy} ks</div>
          <div className="mobile-cashbook-amount">{formatCurrency(cashbook.prijmyCastka)}</div>
        </div>
        
        {/* Výdaje */}
        <div className="mobile-cashbook-item">
          <div className="mobile-cashbook-label">Výdaje</div>
          <div className="mobile-cashbook-count">{cashbook.vydaje} ks</div>
          <div className="mobile-cashbook-amount">{formatCurrency(cashbook.vydajeCastka)}</div>
        </div>
      </div>
    </div>
  );
}

export default MobileDashboard;
