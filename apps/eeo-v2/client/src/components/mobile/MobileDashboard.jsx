import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useThemeMode from '../../theme/useThemeMode';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import MobileActivityLog from './MobileActivityLog';
import MobileSuccessAnimation from './MobileSuccessAnimation';
import OrderApprovalCard from './OrderApprovalCard';
import MobileConfirmDialog from './MobileConfirmDialog';
import SplashScreen from '../SplashScreen';
import mobileDataService from '../../services/mobileDataService';
import { fetchActiveUsersWithStats } from '../../services/api2auth';
import { listOrdersV2, getOrderV2, updateOrderV2 } from '../../services/apiOrderV2';
import { getStavyWorkflow25 } from '../../services/api25orders';
import { getActivities, addActivity, ACTIVITY_TYPES, ENTITY_TYPES } from '../../services/activityLogService';
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
  const [pendingApprovalOrders, setPendingApprovalOrders] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [showApprovalDetail, setShowApprovalDetail] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all' | 'normal' | 'urgent'
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [waitDialogOpen, setWaitDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [stavyWorkflowMap, setStavyWorkflowMap] = useState({});
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const [successAnimation, setSuccessAnimation] = useState({ show: false, type: 'approved', message: '' });
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '' });

  // Načíst číselník stavů workflow z DB
  useEffect(() => {
    const loadStavy = async () => {
      if (!token || !username) return;
      
      // Guard - zkontrolovat, že funkce existuje
      if (typeof getStavyWorkflow25 !== 'function') {
        console.error('[MobileDashboard] getStavyWorkflow25 není dostupná funkce!');
        return;
      }
      
      try {
        const stavy = await getStavyWorkflow25({ token, username });
        setStavyWorkflowMap(stavy || {});
      } catch (error) {
        console.error('[MobileDashboard] Chyba načítání číselníku stavů:', error);
      }
    };
    loadStavy();
  }, [token, username]);

  // Helper funkce pro získání názvu stavu z číselníku
  const getStavObjednavky = (workflowKod) => {
    const stavZCiselniku = stavyWorkflowMap[workflowKod];
    if (stavZCiselniku) {
      return stavZCiselniku.nazev;
    }
    // Fallback hodnoty - MĚLY BY SE POUŽÍVAT POUZE PŘI CHYBĚ NAČTENÍ
    const fallbackMap = {
      'SCHVALENA': 'Schválená',
      'ZAMITNUTA': 'Zamítnutá',
      'CEKA_SE': 'Čeká se',
      'ODESLANA_KE_SCHVALENI': 'Ke schválení',
      'NOVA': 'Nová'
    };
    return fallbackMap[workflowKod] || workflowKod;
  };

  // Helper funkce pro MySQL datetime formát
  const toMySQLDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Sestavíme user objekt pro kompatibilitu
  const user = authUser ? {
    ...authUser,
    displayName: userDetail?.jmeno_prijmeni_titul || userDetail?.jmeno_prijmeni || authUser.username,
    mail: userDetail?.email || '',
    upn: authUser.username
  } : null;

  // Kontrola admin funkce role
  const isAdmin = userDetail?.roles?.some(role => 
    role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
  ) || false;

  // Kontrola oprávnění ke schvalování (ADMIN nebo má právo APPROVE)
  const canApprove = isAdmin || userDetail?.permissions?.some(p => 
    p.kod_opravneni === 'ORDER_APPROVE'
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
    loadActivityCount();
  }, [selectedYear]); // Tento useEffect se spustí při změně roku

  useEffect(() => {
    // Samostatný useEffect pro loadPendingApprovals - zajistí, že se spustí při změně roku nebo userDetail
    if (canApprove && userDetail?.id) {
      loadPendingApprovals();
    }
  }, [selectedYear, canApprove, userDetail?.id]); // Přidáno: reaguje na změnu roku

  // Načíst počet aktivit
  const loadActivityCount = () => {
    const activities = getActivities();
    setActivityCount(activities.length);
  };

  // Navigace z menu
  const handleNavigate = (target) => {
    if (target === 'dashboard') {
      // Zavřít approval detail pokud je otevřený a vrátit na dashboard
      setShowApprovalDetail(false);
      // Scroll na začátek
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Refresh dat BEZ loading gate (na pozadí)
      loadDashboardData();
      loadActivityCount();
    } else if (target === 'activity') {
      // Otevřít historii aktivit
      setActivityLogOpen(true);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadDashboardData();
    } catch (error) {
      // Error handled silently
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

  // Načíst objednávky ke schválení (pouze pro uživatele s právy)
  const loadPendingApprovals = async () => {
    if (!token || !username || !canApprove) {
      return;
    }
    
    if (!userDetail?.id) {
      return;
    }
    
    try {
      setLoadingApprovals(true);
      // Načti objednávky z aktuálního roku
      // Backend automaticky filtruje podle oprávnění (aktivni=1 + role-based filter nebo hierarchie)
      const orders = await listOrdersV2({ rok: selectedYear }, token, username, false, true);
      
      if (Array.isArray(orders)) {
        // Debug: kolik objednávek má ODESLANA_KE_SCHVALENI
        const allPending = orders.filter(order => {
          if (!order.id || order.id <= 1) return false;
          try {
            const workflowStates = Array.isArray(order.stav_workflow_kod) 
              ? order.stav_workflow_kod 
              : JSON.parse(order.stav_workflow_kod || '[]');
            return Array.isArray(workflowStates) && workflowStates.includes('ODESLANA_KE_SCHVALENI');
          } catch {
            return false;
          }
        });
        
        // Vyfiltruj pouze objednávky ve stavu ODESLANA_KE_SCHVALENI
        // A kde je aktuální uživatel přikázce (prikazce_id == userDetail.id)
        const pending = allPending.filter(order => {
          return order.prikazce_id === userDetail?.id;
        });
        
        setPendingApprovalOrders(pending);
      }
    } catch (error) {
      setPendingApprovalOrders([]);
    } finally {
      setLoadingApprovals(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Pokud nemáme token, zobraz prázdná data
      if (!token || !username) {
        setData({
          orders: null,
          invoices: null,
          cashbook: null,
          notifications: { unread: 0 }
        });
        return;
      }

      // Načti ostrá data s tokenem
      const result = await mobileDataService.getAllMobileData({ 
        token, 
        username,
        year: selectedYear,
        userId: isAdmin ? null : userDetail?.id,  // ✅ FIX: Admin nemá userId (vidí všechny), non-admin má userId (vidí jen své)
        isAdmin: isAdmin,        // Admin vidí všechny objednávky
        showArchived: false      // 🔧 FIX: Mobile vždy filtruje archivované objednávky
      });
      
      if (result.success) {
        setData(result.data);
        // Načti aktivní uživatele pro adminy
        if (isAdmin) {
          await loadActiveUsers();
        }
        // Načti objednávky ke schválení (pokud má práva)
        if (canApprove) {
          await loadPendingApprovals();
        }
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Schválení objednávky
  const handleApproveOrder = async (order) => {
    if (!token || !username || !order.id) return;
    
    try {
      // Načti aktuální objednávku
      const currentOrder = await getOrderV2(order.id, token, username, true);
      if (!currentOrder) {
        setErrorDialog({ isOpen: true, title: 'Chyba', message: 'Objednávku se nepodařilo načíst' });
        return;
      }

      // 🔒 VALIDACE ÚSEKU: Kontrola zda může uživatel schvalovat objednávku
      const isPrikazce = String(currentOrder.prikazce_id) === String(userDetail?.id);
      
      if (!isPrikazce && !isAdmin) {
        // Uživatel není přímo příkazce ani admin - zkontroluj úsek
        const myUsekId = userDetail?.usek_id || userDetail?.usek;
        const prikazceUsekId = currentOrder?.prikazce_usek_id || currentOrder?.prikazce?.usek_id;
        
        if (!myUsekId || !prikazceUsekId || String(myUsekId) !== String(prikazceUsekId)) {
          setErrorDialog({ 
            isOpen: true, 
            title: 'Nemáte oprávnění', 
            message: 'Můžete schvalovat pouze objednávky příkazců ze svého úseku.' 
          });
          return;
        }
      }

      // Zpracuj workflow stavy
      let workflowStates = [];
      try {
        workflowStates = Array.isArray(currentOrder.stav_workflow_kod)
          ? currentOrder.stav_workflow_kod
          : JSON.parse(currentOrder.stav_workflow_kod || '[]');
      } catch {
        workflowStates = [];
      }

      // Odstraň ODESLANA_KE_SCHVALENI, CEKA_SE, ZAMITNUTA
      workflowStates = workflowStates.filter(s => 
        !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA'].includes(s)
      );

      // Přidej SCHVALENA
      if (!workflowStates.includes('SCHVALENA')) {
        workflowStates.push('SCHVALENA');
      }

      // Aktualizuj objednávku
      const updateData = {
        stav_workflow_kod: JSON.stringify(workflowStates),
        stav_objednavky: getStavObjednavky('SCHVALENA'),
        schvalovatel_id: userDetail?.id || null,
        dt_schvaleni: toMySQLDateTime(),
        schvaleni_komentar: '' // Vymazat komentář při schválení
      };

      await updateOrderV2(order.id, updateData, token, username);
      
      // Zaznamenat aktivitu
      addActivity({
        entityType: ENTITY_TYPES.ORDER,
        entityId: order.ev_cislo || order.cislo_objednavky || order.id,
        activityType: ACTIVITY_TYPES.ORDER_APPROVED,
        title: order.nazev_obj || `Objednávka ${order.ev_cislo || order.cislo_objednavky || order.id}`,
        amount: order.castka_obj || null,
        userName: username,
        description: '✅ Objednávka byla schválena',
        metadata: { 
          orderNumber: order.ev_cislo || order.cislo_objednavky,
          orderId: order.id 
        }
      });
      
      // Zobrazit success animaci
      setSuccessAnimation({
        show: true,
        type: 'approved',
        message: '✅ Objednávka schválena!'
      });
      
      // Obnovit seznam a počet aktivit na pozadí (bez loading stavu)
      loadPendingApprovals();
      loadActivityCount();
    } catch (error) {
      setErrorDialog({ isOpen: true, title: 'Chyba schválení', message: error.message || 'Nepodařilo se schválit objednávku' });
    }
  };

  // Zamítnutí objednávky - otevření dialogu
  const handleRejectOrder = (order) => {
    setCurrentOrder(order);
    setRejectDialogOpen(true);
  };

  // Potvrzení zamítnutí
  const confirmRejectOrder = async (reason) => {
    if (!token || !username || !currentOrder?.id) {
      setRejectDialogOpen(false);
      return;
    }
    
    try {
      // Načti aktuální objednávku pro získání fresh dat
      const freshOrder = await getOrderV2(currentOrder.id, token, username, true);
      if (!freshOrder) {
        setErrorDialog({ isOpen: true, title: 'Chyba', message: 'Objednávku se nepodařilo načíst' });
        setRejectDialogOpen(false);
        return;
      }

      // Zpracuj workflow stavy
      let workflowStates = [];
      try {
        workflowStates = Array.isArray(freshOrder.stav_workflow_kod)
          ? freshOrder.stav_workflow_kod
          : JSON.parse(freshOrder.stav_workflow_kod || '[]');
      } catch {
        workflowStates = [];
      }

      // Odstraň ODESLANA_KE_SCHVALENI, CEKA_SE, SCHVALENA
      workflowStates = workflowStates.filter(s => 
        !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'SCHVALENA'].includes(s)
      );

      // Přidej ZAMITNUTA
      if (!workflowStates.includes('ZAMITNUTA')) {
        workflowStates.push('ZAMITNUTA');
      }

      // Aktualizuj objednávku
      const updateData = {
        stav_workflow_kod: JSON.stringify(workflowStates),
        stav_objednavky: getStavObjednavky('ZAMITNUTA'),
        schvalovatel_id: userDetail?.id || null,
        dt_schvaleni: toMySQLDateTime(),
        schvaleni_komentar: reason
      };

      await updateOrderV2(currentOrder.id, updateData, token, username);
      
      // Zaznamenat aktivitu
      addActivity({
        entityType: ENTITY_TYPES.ORDER,
        entityId: currentOrder.ev_cislo || currentOrder.cislo_objednavky || currentOrder.id,
        activityType: ACTIVITY_TYPES.ORDER_REJECTED,
        title: currentOrder.nazev_obj || `Objednávka ${currentOrder.ev_cislo || currentOrder.cislo_objednavky || currentOrder.id}`,
        amount: currentOrder.castka_obj || null,
        userName: username,
        description: `❌ Objednávka byla zamítnuta${reason ? `: ${reason}` : ''}`,
        metadata: { 
          orderNumber: currentOrder.ev_cislo || currentOrder.cislo_objednavky,
          orderId: currentOrder.id 
        }
      });
      
      // Zobrazit success animaci
      setSuccessAnimation({
        show: true,
        type: 'rejected',
        message: '❌ Objednávka zamítnuta'
      });
      
      // Zavřít dialog a obnovit seznam na pozadí
      setRejectDialogOpen(false);
      setCurrentOrder(null);
      loadPendingApprovals();
      loadActivityCount();
    } catch (error) {
      setErrorDialog({ isOpen: true, title: 'Chyba zamítnutí', message: error.message || 'Nepodařilo se zamítnout objednávku' });
      setRejectDialogOpen(false);
    }
  };

  // Označit jako "Čeká se" - otevření dialogu
  const handleWaitOrder = (order) => {
    setCurrentOrder(order);
    setWaitDialogOpen(true);
  };

  // Potvrzení pozastavení
  const confirmWaitOrder = async (reason) => {
    if (!token || !username || !currentOrder?.id) {
      setWaitDialogOpen(false);
      return;
    }
    
    try {
      // Načti aktuální objednávku pro získání fresh dat
      const freshOrder = await getOrderV2(currentOrder.id, token, username, true);
      if (!freshOrder) {
        setErrorDialog({ isOpen: true, title: 'Chyba', message: 'Objednávku se nepodařilo načíst' });
        setWaitDialogOpen(false);
        return;
      }

      // Zpracuj workflow stavy
      let workflowStates = [];
      try {
        workflowStates = Array.isArray(freshOrder.stav_workflow_kod)
          ? freshOrder.stav_workflow_kod
          : JSON.parse(freshOrder.stav_workflow_kod || '[]');
      } catch {
        workflowStates = [];
      }

      // Odstraň ODESLANA_KE_SCHVALENI, SCHVALENA, ZAMITNUTA
      workflowStates = workflowStates.filter(s => 
        !['ODESLANA_KE_SCHVALENI', 'SCHVALENA', 'ZAMITNUTA'].includes(s)
      );

      // Přidej CEKA_SE
      if (!workflowStates.includes('CEKA_SE')) {
        workflowStates.push('CEKA_SE');
      }

      // Aktualizuj objednávku
      const updateData = {
        stav_workflow_kod: JSON.stringify(workflowStates),
        stav_objednavky: getStavObjednavky('CEKA_SE'),
        schvalovatel_id: userDetail?.id || null,
        dt_schvaleni: toMySQLDateTime(),
        schvaleni_komentar: reason
      };
      // Zaznamenat aktivitu
      addActivity({
        entityType: ENTITY_TYPES.ORDER,
        entityId: currentOrder.ev_cislo || currentOrder.cislo_objednavky || currentOrder.id,
        activityType: ACTIVITY_TYPES.ORDER_WAITING,
        title: currentOrder.nazev_obj || `Objednávka ${currentOrder.ev_cislo || currentOrder.cislo_objednavky || currentOrder.id}`,
        amount: currentOrder.castka_obj || null,
        userName: username,
        description: `⏳ Objednávka označena jako "Čeká se"${reason ? `: ${reason}` : ''}`,
        metadata: { 
          orderNumber: currentOrder.ev_cislo || currentOrder.cislo_objednavky,
          orderId: currentOrder.id 
        }
      });
      
      // Zobrazit success animaci
      setSuccessAnimation({
        show: true,
        type: 'waiting',
        message: '⏳ Objednávka pozastavena'
      });
      
      // Zavřít dialog a obnovit seznam na pozadí
      setWaitDialogOpen(false);
      setCurrentOrder(null);
      loadPendingApprovals();
      loadActivityCount();
    } catch (error) {
      setErrorDialog({ isOpen: true, title: 'Chyba pozastavení', message: error.message || 'Nepodařilo se pozastavit objednávku' });
      setWaitDialogOpen(false);
    }
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
      {/* Fixní hlavička - vždy viditelná */}
      <MobileHeader 
        onMenuClick={() => setMenuOpen(true)}
        notificationCount={notificationCount}
        onActivityClick={() => setActivityLogOpen(true)}
        activityCount={activityCount}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
      
      {/* Subheader pro approval screen */}
      {showApprovalDetail && (
        <div className="mobile-subheader">
          <button 
            className="mobile-subheader-back"
            onClick={() => setShowApprovalDetail(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Zpět
          </button>
          <h2 className="mobile-subheader-title">
            Ke schválení ({(() => {
              const total = pendingApprovalOrders.length;
              const normal = pendingApprovalOrders.filter(o => !o.mimoradna_udalost).length;
              const urgent = pendingApprovalOrders.filter(o => o.mimoradna_udalost).length;
              
              if (approvalFilter === 'all') {
                return `${total}/${normal}/${urgent}`;
              } else if (approvalFilter === 'normal') {
                return normal;
              } else {
                return urgent;
              }
            })()})
          </h2>
          <div className="mobile-subheader-filters">
            <button
              className={`mobile-filter-btn ${approvalFilter === 'all' ? 'active' : ''}`}
              onClick={() => setApprovalFilter('all')}
              title="Všechny objednávky"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </button>
            <button
              className={`mobile-filter-btn ${approvalFilter === 'normal' ? 'active' : ''}`}
              onClick={() => setApprovalFilter('normal')}
              title="Normální objednávky"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </button>
            <button
              className={`mobile-filter-btn ${approvalFilter === 'urgent' ? 'active' : ''}`}
              onClick={() => setApprovalFilter('urgent')}
              title="Mimořádné objednávky"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <MobileMenu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        userDetail={userDetail}
        authUser={authUser}
        onNavigate={handleNavigate}
      />

      {/* Obsah pod fixní hlavičkou */}
      {showApprovalDetail ? (
        <>
          {loadingApprovals ? (
            <div className="mobile-dashboard-content">
              <div className="mobile-refresh-indicator">
                <div className="spinner-circle small"></div>
                <span>Načítám objednávky...</span>
              </div>
            </div>
          ) : pendingApprovalOrders.length > 0 ? (
            <div className="mobile-approval-list">
              <div className="mobile-approval-search">
                <div className="mobile-approval-search-wrapper">
                  <input
                    type="text"
                    placeholder="Vyhledat objednávku..."
                    value={approvalSearchQuery}
                    onChange={(e) => setApprovalSearchQuery(e.target.value)}
                  />
                  {approvalSearchQuery && (
                    <button
                      className="mobile-approval-search-clear"
                      onClick={() => setApprovalSearchQuery('')}
                      title="Vymazat vyhledávání"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
                {pendingApprovalOrders
                  .filter(order => {
                    // Filtr podle typu (normal/urgent)
                    if (approvalFilter === 'urgent' && !order.mimoradna_udalost) return false;
                    if (approvalFilter === 'normal' && order.mimoradna_udalost) return false;
                    
                    // Filtr podle vyhledávacího řetězce
                    if (approvalSearchQuery.trim()) {
                      const query = approvalSearchQuery.toLowerCase();
                      const orderNumber = (order.cislo_objednavky || order.ev_cislo || '').toLowerCase();
                      const predmet = (order.predmet || '').toLowerCase();
                      const objednatel = (order.objednatel?.cele_jmeno || '').toLowerCase();
                      const garant = (order.garant_uzivatel?.cele_jmeno || '').toLowerCase();
                      
                      return orderNumber.includes(query) || 
                             predmet.includes(query) || 
                             objednatel.includes(query) ||
                             garant.includes(query);
                    }
                    
                    return true;
                  })
                  .map(order => (
                  <OrderApprovalCard
                    key={order.id}
                    order={order}
                    onApprove={async (order) => {
                      await handleApproveOrder(order);
                      if (pendingApprovalOrders.length === 1) {
                        setShowApprovalDetail(false);
                      }
                    }}
                    onReject={async (order) => {
                      await handleRejectOrder(order);
                      if (pendingApprovalOrders.length === 1) {
                        setShowApprovalDetail(false);
                      }
                    }}
                    onWait={async (order) => {
                      await handleWaitOrder(order);
                      if (pendingApprovalOrders.length === 1) {
                        setShowApprovalDetail(false);
                      }
                    }}
                    loading={loadingApprovals}
                  />
                ))}
          </div>
          ) : (
            <div className="mobile-dashboard-content">
              <div className="mobile-empty-state-inline">
                <p>✅ Žádné objednávky ke schválení</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Normální dashboard obsah */}

          {/* Fixní rychlá navigace */}
      <nav className="mobile-quick-nav">
        {isAdmin && activeUsers.length > 0 && (
          <button 
            className="mobile-quick-nav-btn"
            onClick={() => scrollToSection('users')}
          >
            UZI
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
          FAK
        </button>
        <button 
          className="mobile-quick-nav-btn"
          onClick={() => scrollToSection('cashbook')}
        >
          POK
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

        {/* ✅ KE SCHVÁLENÍ - Široká dlaždice 2x1 pro ADMIN nebo uživatele s právy APPROVE */}
        {canApprove && (loadingApprovals || pendingApprovalOrders.length > 0) && (() => {
          const normalniCount = pendingApprovalOrders.filter(o => !o.mimoradna_udalost).length;
          const mimoradneCount = pendingApprovalOrders.filter(o => o.mimoradna_udalost).length;
          
          // Výpočet celkové max ceny s DPH
          const totalMaxPrice = pendingApprovalOrders.reduce((sum, order) => {
            const maxPrice = parseFloat(order.max_cena_s_dph || 0);
            return sum + (isNaN(maxPrice) ? 0 : maxPrice);
          }, 0);
          
          return (
            <section data-section="approvals" className="mobile-widget-section">
              <div className="mobile-section-header">
                <h2>Objednávky čekají na mé schválení</h2>
              </div>
              <div 
                className="mobile-approval-widget"
                onClick={() => !loadingApprovals && pendingApprovalOrders.length > 0 && setShowApprovalDetail(true)}
              >
                <div className="mobile-approval-widget-header">
                  <div className="mobile-approval-widget-count">
                    {loadingApprovals ? '...' : pendingApprovalOrders.length}
                  </div>
                  <div className="mobile-approval-widget-breakdown">
                    {loadingApprovals ? (
                      <div className="mobile-approval-loading">Načítám...</div>
                    ) : (
                      <>
                        <div className="mobile-approval-normal">
                          {normalniCount} normálních
                        </div>
                        {mimoradneCount > 0 && (
                          <div className="mobile-approval-urgent">
                            {mimoradneCount} mimořádných ⚠️
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mobile-approval-widget-icon">
                    <FontAwesomeIcon icon={getStatusIcon('ke_schvaleni')} />
                  </div>
                </div>
                <div className="mobile-approval-widget-info">
                  <div className="mobile-approval-widget-title-row">
                    <div className="mobile-approval-widget-title">Ke schválení</div>
                    <div className="mobile-approval-widget-action">Klikněte pro schválení</div>
                  </div>
                  <div className="mobile-approval-widget-title-row">
                    <div className="mobile-approval-widget-subtitle">Max. celkem s DPH</div>
                    <div className="mobile-approval-widget-price">{formatCurrency(totalMaxPrice)}</div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

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
        </>
      )}

      {/* Dialogy pro schvalování */}
      <MobileConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={confirmRejectOrder}
        title="Zamítnout objednávku"
        message={`Opravdu chcete zamítnout objednávku ${currentOrder?.cislo_objednavky || currentOrder?.ev_cislo || ''}?`}
        confirmText="Zamítnout"
        cancelText="Zrušit"
        requireReason={true}
        reasonPlaceholder="Zadejte důvod zamítnutí (povinné)..."
        variant="danger"
      />

      <MobileConfirmDialog
        isOpen={waitDialogOpen}
        onClose={() => setWaitDialogOpen(false)}
        onConfirm={confirmWaitOrder}
        title="Pozastavit objednávku"
        message={`Objednávka ${currentOrder?.cislo_objednavky || currentOrder?.ev_cislo || ''} bude označena jako "Čeká se".`}
        confirmText="Pozastavit"
        cancelText="Zrušit"
        requireReason={true}
        reasonPlaceholder="Zadejte důvod pozastavení (povinné)..."
        variant="warning"
      />

      {/* Activity Log Panel */}
      <MobileActivityLog 
        isOpen={activityLogOpen}
        onClose={() => {
          setActivityLogOpen(false);
          loadActivityCount(); // Aktualizovat počet při zavření
        }}
      />

      {/* Success Animation */}
      <MobileSuccessAnimation
        show={successAnimation.show}
        type={successAnimation.type}
        message={successAnimation.message}
        onComplete={() => setSuccessAnimation({ show: false, type: 'approved', message: '' })}
      />

      {/* Error dialog místo nativního alert() */}
      <MobileConfirmDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
        onConfirm={() => setErrorDialog({ ...errorDialog, isOpen: false })}
        title={errorDialog.title}
        message={errorDialog.message}
        confirmText="OK"
        variant="danger"
      />
    </div>
  );
}

/**
 * Komponenta pro jednotlivou dlaždici
 * ✅ Používá FontAwesome ikony z desktop modulu (stejné jako Orders25List.js)
 */

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
