/**
 * 📱 Mobile Data Service
 * Servis pro získávání dat pro mobilní dashboard
 * 
 * ✅ Používá centrální hierarchyService pro konzistentní chování s desktop verzí
 */

import { listOrdersV2 } from './apiOrderV2';
import { listInvoices25 } from './api25invoices';
import cashbookAPI from './cashbookService';
import hierarchyService, { HierarchyModules } from './hierarchyService';

const mobileDataService = {
  /**
   * Hlavní metoda pro načtení všech dat pro mobilní dashboard
   * @param {Object} params - { token, username, year, userId, isAdmin }
   * 
   * DůLEŽITÉ: Používáme STEJNÉ API jako desktop (listOrdersV2, listInvoices25, cashbookAPI).
   * Počítáme statistiky lokálně ze seznamů.
   * 
   * @param {number} userId - ID aktuálního uživatele (pro filtrování objednávek dle přikázce)
   * @param {boolean} isAdmin - Pokud true, zobrazí všechny objednávky; jinak jen ty, kde je userId přikázce
   */
  async getAllMobileData({ token, username, year = new Date().getFullYear(), userId = null, isAdmin = false }) {
    try {
      // Načti data paralelně pro rychlejší načítání
      const currentMonth = new Date().getMonth() + 1; // 1-12
      
      console.log('[MobileData] Loading data for year:', year, 'token:', token ? 'present' : 'MISSING', 'username:', username);
      
      // 🏢 Načtení hierarchie (pro metadata)
      const hierarchyConfig = await hierarchyService.getHierarchyConfigCached(token, username);
      console.log('[MobileData] 🏢 Hierarchy status:', hierarchyConfig.status, 'for orders:', hierarchyConfig.modules.orders);
      
      const [ordersResult, invoicesResult, cashbookResult] = await Promise.allSettled([
        // 1. Objednávky pro daný rok - SPRÁVNÉ POŘADÍ PARAMETRŮ!
        // listOrdersV2(filters, token, username, returnFullResponse, enriched)
        listOrdersV2({ rok: year }, token, username, false, true),
        
        // 2. Faktury pro daný rok
        listInvoices25({ token, username, year, page: 1, per_page: 1000 }),
        
        // 3. Pokladní knihy pro aktuální měsíc (pro získání aktivních pokladen)
        cashbookAPI.getCashboxListByPeriod(year, currentMonth, true, true)
      ]);

      console.log('[MobileData] Orders result:', ordersResult.status, ordersResult.status === 'fulfilled' ? `${ordersResult.value?.length || 0} items` : ordersResult.reason);
      console.log('[MobileData] Invoices result:', invoicesResult.status, invoicesResult.status === 'fulfilled' ? `${invoicesResult.value?.faktury?.length || 0} items` : invoicesResult.reason);
      console.log('[MobileData] Cashbook result:', cashbookResult.status, cashbookResult.status === 'fulfilled' ? cashbookResult.value?.status : cashbookResult.reason);

      // === OBJEDNÁVKY ===
      let ordersData = null;
      if (ordersResult.status === 'fulfilled' && Array.isArray(ordersResult.value)) {
        console.log('[MobileData] ✅ Processing orders from API:', ordersResult.value.length);
        ordersData = this.calculateOrdersStats(ordersResult.value, userId, isAdmin);
      } else {
        console.error('[MobileData] ❌ Orders API FAILED! Reason:', ordersResult.reason);
        ordersData = { total: 0, totalAmount: 0, pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, inProgress: { count: 0, amount: 0 }, completed: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 }, cancelled: { count: 0, amount: 0 } };
      }

      // === FAKTURY ===
      let invoicesData = null;
      if (invoicesResult.status === 'fulfilled' && invoicesResult.value?.faktury) {
        console.log('[MobileData] ✅ Processing invoices from API:', invoicesResult.value.faktury.length);
        invoicesData = this.calculateInvoicesStats(invoicesResult.value.faktury);
      } else {
        console.error('[MobileData] ❌ Invoices API FAILED! Reason:', invoicesResult.reason);
        invoicesData = { total: 0, totalAmount: 0, paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 }, regular: { count: 0, amount: 0 }, advance: { count: 0, amount: 0 }, corrective: { count: 0, amount: 0 }, proforma: { count: 0, amount: 0 }, creditNote: { count: 0, amount: 0 }, withoutAssignment: { count: 0, amount: 0 } };
      }

      // === POKLADNA ===
      let cashbookData = null;
      if (cashbookResult.status === 'fulfilled' && cashbookResult.value?.status === 'ok') {
        console.log('[MobileData] ✅ Processing cashbook from API');
        cashbookData = this.calculateCashbookStats(cashbookResult.value.data);
      } else {
        console.error('[MobileData] ❌ Cashbook API FAILED! Reason:', cashbookResult.reason);
        cashbookData = { count: 0, balance: 0, pokladny: [] };
      }

      return {
        success: true,
        data: {
          orders: ordersData,
          invoices: invoicesData,
          cashbook: cashbookData,
          notifications: { unread: 0 }
        },
        // Metadata - informace o zdroji dat a období
        meta: {
          year: year,
          period: `Rok ${year}`,
          dataSource: {
            orders: ordersResult.status === 'fulfilled' ? 'API' : 'MOCK',
            invoices: invoicesResult.status === 'fulfilled' ? 'API' : 'MOCK',
            cashbook: cashbookResult.status === 'fulfilled' ? 'API' : 'MOCK'
          },
          // 🏢 Hierarchie info
          hierarchy: {
            status: hierarchyConfig.status,
            enabled: hierarchyConfig.enabled,
            profileName: hierarchyConfig.profileName,
            logic: hierarchyConfig.logic,
            message: hierarchyService.getHierarchyInfoMessage(hierarchyConfig, HierarchyModules.ORDERS)
          }
        }
      };
    } catch (error) {
      console.error('[MobileData] ❌ CRITICAL ERROR loading mobile data:', error);
      // Vrátit prázdná data místo mock dat
      return {
        success: false,
        error: error.message,
        data: {
          orders: { total: 0, totalAmount: 0, pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, inProgress: { count: 0, amount: 0 }, completed: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 }, cancelled: { count: 0, amount: 0 } },
          invoices: { total: 0, totalAmount: 0, paid: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 }, regular: { count: 0, amount: 0 }, advance: { count: 0, amount: 0 }, corrective: { count: 0, amount: 0 }, proforma: { count: 0, amount: 0 }, creditNote: { count: 0, amount: 0 }, withoutAssignment: { count: 0, amount: 0 } },
          cashbook: { count: 0, balance: 0, pokladny: [] },
          notifications: { unread: 0 }
        },
        meta: {
          year: new Date().getFullYear(),
          period: 'ERROR',
          dataSource: { orders: 'ERROR', invoices: 'ERROR', cashbook: 'ERROR' }
        }
      };
    }
  },

  /**
   * Počítá statistiky ze seznamu objednávek - PŘESNĚ PODLE ORDERS25LIST!
   * @param {Array} orders - Seznam objednávek z API
   * @param {number} userId - ID aktuálního uživatele (pro filtrování objednávek dle přikázce)
   * @param {boolean} isAdmin - Pokud true, zobrazí všechny objednávky; jinak jen ty, kde je userId přikázce
   * @returns {Object} - Statistiky ve formátu { pending: {count, amount}, ... }
   */
  calculateOrdersStats(orders, userId = null, isAdmin = false) {
    // PŘESNĚ KOPIE Z ORDERS25LIST - getOrderTotalPriceWithDPH
    const getOrderAmount = (order) => {
      const status = getOrderSystemStatus(order);
      
      // DOKONČENÁ → součet faktur
      if (status === 'DOKONCENA' || status === 'VYRIZENA' || status === 'COMPLETED') {
        if (order.faktury && Array.isArray(order.faktury) && order.faktury.length > 0) {
          const fakturyTotal = order.faktury.reduce((sum, faktura) => {
            const castka = parseFloat(faktura.fa_castka || 0);
            return sum + (isNaN(castka) ? 0 : castka);
          }, 0);
          if (fakturyTotal > 0) return fakturyTotal;
        }
      }
      
      // DALŠÍ FÁZE → součet položek (pokud existují)
      // 1. Zkus vrácené pole z BE (polozky_celkova_cena_s_dph je již součet)
      if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
        const value = parseFloat(order.polozky_celkova_cena_s_dph);
        if (!isNaN(value) && value > 0) return value;
      }      // 2. Spočítej z položek (Order V2 API vrací polozky přímo v order objektu)
      if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
        const total = order.polozky.reduce((sum, item) => {
          const cena = parseFloat(item.cena_s_dph || 0);
          return sum + (isNaN(cena) ? 0 : cena);
        }, 0);
        if (total > 0) return total;
      }

      // POČÁTEČNÍ FÁZE → max_cena_s_dph (limit)
      if (order.max_cena_s_dph != null && order.max_cena_s_dph !== '') {
        const value = parseFloat(order.max_cena_s_dph);
        if (!isNaN(value)) return value;
      }

      return 0;
    };

    // PŘESNĚ KOPIE Z ORDERS25LIST - getOrderSystemStatus
    const getOrderSystemStatus = (order) => {
      // Speciální případ pro koncepty
      if (order.isDraft || order.je_koncept) {
        return 'NOVA';
      }

      let systemStatus;

      // Získej stav z stav_workflow_kod (je to pole!)
      if (order.stav_workflow_kod) {
        try {
          const workflowStates = Array.isArray(order.stav_workflow_kod) 
            ? order.stav_workflow_kod 
            : JSON.parse(order.stav_workflow_kod);
          systemStatus = Array.isArray(workflowStates) 
            ? workflowStates[workflowStates.length - 1] 
            : order.stav_workflow_kod;
        } catch {
          systemStatus = order.stav_workflow_kod;
        }
      } else {
        systemStatus = 'DRAFT';
      }

      return systemStatus;
    };

    // PŘESNĚ PODLE ORDERS25LIST - vyfiltruj koncepty/drafty (nemají reálné ID) a systémovou obj id=1
    // V Orders25List se koncepty nepočítají do celkového počtu v tabulce
    let validOrders = orders.filter(o => o.id && o.id > 1 && !o.isLocalConcept);
    
    // ⚠️ Filtrování pro non-admin uživatele: zobraz jen objednávky, kde je uživatel přikázce
    if (!isAdmin && userId) {
      validOrders = validOrders.filter(o => o.prikazce_id === userId);
      console.log('[MobileData] Non-admin user', userId, '- filtered to', validOrders.length, 'orders (where prikazce_id matches)');
    }
    
    const total = validOrders.length;
    const byStatus = validOrders.reduce((acc, order) => {
      const systemStatus = getOrderSystemStatus(order);
      acc[systemStatus] = (acc[systemStatus] || 0) + 1;
      return acc;
    }, {});

    const totalAmount = validOrders.reduce((sum, order) => {
      const amount = getOrderAmount(order);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    console.log('[MobileData] Stats:', { total, totalAmount, validOrders: validOrders.length, allOrders: orders.length, byStatus });

    return {
      total,
      totalAmount,
      // Mapování stavů - používáme validOrders pro filtrování
      // ⚠️ KE_SCHVALENI je legacy pozůstatek - vše dle OrderV2 používá ODESLANA_KE_SCHVALENI
      pending: { 
        count: byStatus.ODESLANA_KE_SCHVALENI || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'ODESLANA_KE_SCHVALENI').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      approved: { 
        count: byStatus.SCHVALENA || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'SCHVALENA').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      maBytZverejnena: { 
        count: byStatus.K_UVEREJNENI_DO_REGISTRU || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'K_UVEREJNENI_DO_REGISTRU').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      uverejnena: { 
        count: byStatus.UVEREJNENA || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'UVEREJNENA').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      vecnaSpravnost: { 
        count: byStatus.VECNA_SPRAVNOST || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'VECNA_SPRAVNOST').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      completed: { 
        count: byStatus.DOKONCENA || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'DOKONCENA').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      rejected: { 
        count: byStatus.ZAMITNUTA || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'ZAMITNUTA').reduce((s, o) => s + getOrderAmount(o), 0)
      },
      cancelled: { 
        count: byStatus.ZRUSENA || 0, 
        amount: validOrders.filter(o => getOrderSystemStatus(o) === 'ZRUSENA').reduce((s, o) => s + getOrderAmount(o), 0)
      }
    };
  },

  /**
   * Počítá statistiky ze seznamu faktur (podobně jako desktop Invoices25List)
   * @param {Array} invoices - Seznam faktur z API
   * @returns {Object} - Statistiky ve formátu { paid: {count, amount}, regular: {count, amount}, ... }
   */
  calculateInvoicesStats(invoices) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Pomocná funkce pro určení statusu faktury
    const getInvoiceStatus = (invoice) => {
      if (invoice.fa_zaplacena === 1 || invoice.fa_zaplacena === true) {
        return 'paid';
      }
      if (invoice.fa_datum_splatnosti) {
        const splatnost = new Date(invoice.fa_datum_splatnosti);
        splatnost.setHours(0, 0, 0, 0);
        if (splatnost < now) {
          return 'overdue';
        }
      }
      return 'unpaid';
    };

    // Inicializace statistik
    const stats = {
      total: invoices.length,
      totalAmount: 0,
      // STAVY ZAPLACENÍ
      paid: { count: 0, amount: 0 },
      unpaid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      // TYPY FAKTUR
      regular: { count: 0, amount: 0 },      // BEZNA
      advance: { count: 0, amount: 0 },      // ZALOHA
      corrective: { count: 0, amount: 0 },   // OPRAVNA
      proforma: { count: 0, amount: 0 },     // PROFORMA
      creditNote: { count: 0, amount: 0 },   // DOBROPISY
      withoutAssignment: { count: 0, amount: 0 } // BEZ_PRIRAZENI
    };

    invoices.forEach(invoice => {
      const amount = parseFloat(invoice.fa_castka || 0);
      stats.totalAmount += amount;

      // Status zaplacení - PŘESNĚ PODLE INVOICES25LIST
      const status = getInvoiceStatus(invoice);
      
      // Zaplacené
      if (status === 'paid') {
        stats.paid.count++;
        stats.paid.amount += amount;
      } else {
        // NEZAPLACENO = všechny nezaplacené (včetně po splatnosti)
        stats.unpaid.count++;
        stats.unpaid.amount += amount;
        
        // PO SPLATNOSTI = podmnožina nezaplacených
        if (status === 'overdue') {
          stats.overdue.count++;
          stats.overdue.amount += amount;
        }
      }

      // Typ faktury - bezpečné získání (PŘESNĚ PODLE INVOICES25LIST!)
      const typRaw = invoice.fa_typ;
      const typ = (typRaw && typeof typRaw === 'string') ? typRaw.toUpperCase() : 'BEZNA';
      switch (typ) {
        case 'BEZNA':
          stats.regular.count++;
          stats.regular.amount += amount;
          break;
        case 'ZALOHOVA':
          stats.advance.count++;
          stats.advance.amount += amount;
          break;
        case 'OPRAVNA':
          stats.corrective.count++;
          stats.corrective.amount += amount;
          break;
        case 'PROFORMA':
          stats.proforma.count++;
          stats.proforma.amount += amount;
          break;
        case 'DOBROPIS':
          stats.creditNote.count++;
          stats.creditNote.amount += amount;
          break;
        default:
          stats.regular.count++;
          stats.regular.amount += amount;
      }
      
      // BEZ PŘIŘAZENÍ = faktury bez objednávky ANI smlouvy
      if (!invoice.objednavka_id && !invoice.smlouva_id) {
        stats.withoutAssignment.count++;
        stats.withoutAssignment.amount += amount;
      }
    });

    return stats;
  },

  /**
   * Počítá statistiky z pokladních knih
   * @param {Object} cashboxData - Data z API (response.data)
   * @returns {Object} - Statistiky ve formátu { count, balance, pokladny: [...] }
   */
  calculateCashbookStats(cashboxData) {
    // cashboxData.pokladny obsahuje pole pokladen s přiřazenými uživateli
    const pokladny = cashboxData?.pokladny || [];
    
    if (pokladny.length === 0) {
      return {
        count: 0,
        balance: 0,
        pokladny: []
      };
    }

    // Agreguj statistiky z všech pokladen
    let totalCount = 0;
    let totalBalance = 0;

    const pokladnyList = pokladny.map(pokladna => {
      const pocetZaznamu = parseInt(pokladna.pocet_zaznamu || 0, 10);
      const koncovyStav = parseFloat(pokladna.koncovy_stav || 0);
      const pocatecniStav = parseFloat(pokladna.pocatecni_stav || 0);
      
      // ✅ API VRACÍ celkove_prijmy, celkove_vydaje, prijmy_pocet, vydaje_pocet z DB
      const celkovePrijmy = parseFloat(pokladna.celkove_prijmy || 0);
      const celkoveVydaje = parseFloat(pokladna.celkove_vydaje || 0);
      const prijmyPocet = parseInt(pokladna.prijmy_pocet || 0, 10);
      const vydajePocet = parseInt(pokladna.vydaje_pocet || 0, 10);
      
      totalCount += pocetZaznamu;
      totalBalance += koncovyStav;

      // ✅ Převod z předchozího měsíce (přichází z DB)
      const prevod = parseFloat(pokladna.prevod_z_predchoziho || 0);
      
      return {
        id: pokladna.id,
        cislo_pokladny: pokladna.cislo_pokladny,
        nazev: pokladna.nazev,
        pocet_zaznamu: pocetZaznamu,
        koncovy_stav: koncovyStav,
        pocatecni_stav: pocatecniStav,
        prevod: prevod,
        aktivni: pokladna.aktivni === 1 || pokladna.aktivni === '1',
        // ✅ PŘÍJMY A VÝDAJE - počty i částky z DB
        prijmy_castka: celkovePrijmy,
        prijmy_pocet: prijmyPocet,
        vydaje_castka: celkoveVydaje,
        vydaje_pocet: vydajePocet
      };
    });

    return {
      count: totalCount,
      balance: totalBalance,
      pokladny: pokladnyList
    };
  }
};

export default mobileDataService;
