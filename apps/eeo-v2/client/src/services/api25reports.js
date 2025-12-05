/* eslint-disable no-unused-vars */
import axios from 'axios';
import { listOrdersV2 } from './apiOrderV2';

/**
 * REPORTS API Service
 * Service pro získávání dat pro reporty a statistiky
 * Využívá Order V2 API (listOrdersV2) stejně jako Orders25List
 * 
 * Datum: 27. listopadu 2025
 */

const api25reports = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Intercept requests to add auth token
api25reports.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Získání všech objednávek pro reporty
 * Používá Order V2 API (listOrdersV2) stejně jako Orders25List
 * @param {Object} filters - Filtry pro dotaz
 * @param {string} token - Auth token z AuthContext
 * @param {string} username - Username z AuthContext
 */
export const fetchAllOrders = async (filters = {}, token, username) => {
  try {
    // Použít stejný endpoint jako Orders25List - listOrdersV2 s enriched=true
    const apiResult = await listOrdersV2(filters, token, username, true, true);

    // Přistupovat k datům stejně jako Orders25List
    const orders = apiResult?.data || [];

    return {
      success: true,
      data: orders,
      count: orders.length
    };
  } catch (error) {
    console.error('❌ [REPORTS API] Error fetching orders:', error);
    return {
      success: false,
      error: error.message || 'Neznámá chyba',
      data: []
    };
  }
};

/**
 * Získání statistik objednávek
 * Používá existující endpoint orders25/stats
 * @param {Object} filters - Filtry pro dotaz
 * @param {string} token - Auth token z AuthContext
 * @param {string} username - Username z AuthContext
 */
export const fetchOrdersStats = async (filters = {}, token, username) => {
  try {
    const response = await api25reports.post('/orders25/stats', {
      token,
      username,
      rok: filters.rok || null,
      utvar: filters.utvar || null,
      obdobi_od: filters.obdobi_od || null,
      obdobi_do: filters.obdobi_do || null
    });

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data || {}
      };
    }

    throw new Error(response.data?.message || 'Chyba při načítání statistik');
  } catch (error) {
    console.error('Error fetching orders stats:', error);
    return {
      success: false,
      error: error.message || 'Neznámá chyba',
      data: {}
    };
  }
};

/**
 * Helper funkce pro získání celkové ceny s DPH Z POLOŽEK OBJEDNÁVKY
 * Počítá POUZE ze součtu položek (cena_s_dph), NIKDY z max_cena_s_dph
 * Stejná logika jako Orders25List.getOrderTotalPriceWithDPH
 */
const getOrderTotalPriceWithDPH = (order) => {
  // 1. Zkus vrácené pole z BE (polozky_celkova_cena_s_dph je již součet)
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value)) return value;
  }

  // 2. Spočítej z položek (Order V2 API vrací polozky přímo v order objektu)
  if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    const total = order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
    return total;
  }

  // 3. Pokud nejsou položky, vrať 0 (NE max_cena_s_dph!)
  // max_cena_s_dph je limit, ne skutečná cena
  return 0;
};

/**
 * REPORT 1: Objednávky nad určitou částku
 */
export const fetchOrdersAboveAmount = async (amount, filters = {}, token, username) => {
  try {
    const result = await fetchAllOrders(filters, token, username);
    
    if (!result.success) {
      return result;
    }

    // Filtrovat objednávky s cenou nad threshold
    // Vynechat objednávky s nulovou cenou
    const filteredData = result.data.filter(order => {
      const cena = getOrderTotalPriceWithDPH(order);
      // Vynechat objednávky s nulovou nebo null cenou
      if (!cena || cena === 0) return false;
      return cena > amount;
    });


    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        ),
        threshold: amount
      }
    };
  } catch (error) {
    console.error('Error in fetchOrdersAboveAmount:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 2: Objednávky podle dodavatele
 */
export const fetchOrdersBySupplier = async (dodavatel, filters = {}, token, username) => {
  try {
    // Získat všechny objednávky (bez BE filtru dodavatele)
    const result = await fetchAllOrders(filters, token, username);
    
    if (!result.success) {
      return result;
    }

    // Filtrovat na FE podle enriched pole dodavatel_nazev NEBO dodavatel_ico
    const filteredData = result.data.filter(order => {
      const orderSupplier = order.dodavatel_nazev || '';
      const orderIco = order.dodavatel_ico || '';
      const searchTerm = dodavatel.toLowerCase();
      
      // Case-insensitive partial match - NÁZEV nebo IČO
      return orderSupplier.toLowerCase().includes(searchTerm) || 
             orderIco.toLowerCase().includes(searchTerm);
    });


    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        ),
        supplier: dodavatel
      }
    };
  } catch (error) {
    console.error('Error in fetchOrdersBySupplier:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 3: Objednávky podle stavu
 */
export const fetchOrdersByStatus = async (stav, filters = {}, token, username) => {
  try {
    // Backend očekává parametr stav_objednavky (ne stav)
    const result = await fetchAllOrders({ ...filters, stav_objednavky: stav }, token, username);
    
    if (!result.success) {
      return result;
    }

    // 🔍 DŮLEŽITÉ: Dodatečné FE filtrování pro zaručení správnosti
    // Backend někdy nefiltruje správně, tak ověříme na FE
    const filteredData = result.data.filter(order => {
      // Zkontrolovat všechny možné formy stavu
      const orderStatus = order.stav_objednavky || order.stav || '';
      
      // Přesná shoda
      if (orderStatus === stav) return true;
      
      // Pokud je stav_workflow objekt, zkontroluj i tam
      if (order.stav_workflow) {
        if (typeof order.stav_workflow === 'object') {
          const workflowStatus = order.stav_workflow.kod_stavu || order.stav_workflow.nazev_stavu || '';
          if (workflowStatus === stav) return true;
        } else if (order.stav_workflow === stav) {
          return true;
        }
      }
      
      return false;
    });

    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        ),
        status: stav
      }
    };
  } catch (error) {
    console.error('Error in fetchOrdersByStatus:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 4: Objednávky za období
 */
export const fetchOrdersByPeriod = async (datum_od, datum_do, filters = {}, token, username) => {
  try {
    const result = await fetchAllOrders({ ...filters, datum_od, datum_do }, token, username);
    
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data,
      count: result.data.length,
      summary: {
        total_amount: result.data.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        ),
        period_from: datum_od,
        period_to: datum_do
      }
    };
  } catch (error) {
    console.error('Error in fetchOrdersByPeriod:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 5: Neschválené objednávky déle než X dní
 * Porovnává datum vytvoření objednávky (dt_vytvoreni) s aktuálním datem
 * POUZE pro objednávky ve stavu ODESLANA_KE_SCHVALENI
 */
export const fetchPendingOrders = async (days = 5, filters = {}, token, username) => {
  try {
    // Správný kód stavu z číselníku: ODESLANA_KE_SCHVALENI
    const TARGET_STATUS = 'ODESLANA_KE_SCHVALENI';
    
    // Backend filtr - získat VŠECHNY objednávky, filtrujeme na FE
    const result = await fetchAllOrders({ ...filters }, token, username);
    
    if (!result.success) {
      return result;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Nastavit na začátek dne pro správné porovnání
    
    
    const filteredData = result.data.filter((order, index) => {
      const orderNum = order.cislo_objednavky || `order-${index}`;
      
      // DŮLEŽITÉ: stav_objednavky obsahuje NÁZEV (např. "Ke schválení")
      // stav_workflow_kod obsahuje KÓD (např. "ODESLANA_KE_SCHVALENI")
      const orderStatus = order.stav_objednavky || order.stav || '';
      const workflowCode = order.stav_workflow_kod || '';
      
      
      let statusMatch = false;
      
      // PRIMÁRNĚ: Kontroluj stav_workflow_kod (obsahuje KÓD)
      if (workflowCode && workflowCode.includes(TARGET_STATUS)) {
        statusMatch = true;
      }
      // FALLBACK: Kontroluj stav_objednavky (obsahuje NÁZEV, ale může být i KÓD)
      else if (orderStatus && orderStatus.includes(TARGET_STATUS)) {
        statusMatch = true;
      } else {
      }
      
      if (!statusMatch) {
        return false;
      }
      
      // Použít datum VYTVOŘENÍ objednávky (dt_vytvoreni)
      const dateField = order.datum_vytvoreni || order.dt_vytvoreni || order.dt_objednavky;
      
      if (!dateField) {
        return false;
      }
      
      const created = new Date(dateField);
      created.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      // >= (5 a více dní, ne jen více než 5)
      const shouldInclude = daysDiff >= days;
      
      
      return shouldInclude;
    });


    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        ),
        days_threshold: days
      }
    };
  } catch (error) {
    console.error('Error in fetchPendingOrders:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 6: Majetkové objednávky
 * Filtruje podle stavu (ZKONTROLOVANA nebo DOKONCENA) a vyplněného pole Umístění majetku
 */
export const fetchAssetOrders = async (filters = {}, token, username) => {
  try {
    const result = await fetchAllOrders(filters, token, username);
    
    if (!result.success) {
      return result;
    }

    const filteredData = result.data.filter(order => {
      // 1. Kontrola stavu objednávky - musí být ZKONTROLOVANA nebo DOKONCENA
      let isCorrectStatus = false;
      
      // Enriched: order.stav_workflow_kod obsahuje KÓD
      if (order.stav_workflow_kod) {
        const stav = String(order.stav_workflow_kod).toUpperCase();
        isCorrectStatus = stav.includes('ZKONTROLOVANA') || stav.includes('DOKONCENA');
      }
      // String field: order.stav
      else if (order.stav) {
        const stav = String(order.stav).toUpperCase();
        isCorrectStatus = stav.includes('ZKONTROLOVANA') || stav.includes('DOKONCENA');
      }

      if (!isCorrectStatus) return false;

      // 2. Kontrola pole "Umístění majetku" - musí být vyplněno (neprázdné)
      const umisteniMajetku = order.vecna_spravnost_umisteni_majetku || order.umisteni_majetku || '';
      const hasUmisteni = umisteniMajetku.trim() !== '';

      return hasUmisteni;
    });


    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        )
      }
    };
  } catch (error) {
    console.error('Error in fetchAssetOrders:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 7: Objednávky po termínu dodání
 * Pokud objednávka není DOKONCENA a má faktury, kontroluje splatnost faktur
 * Jinak kontroluje termin_dodani objednávky
 */
export const fetchOverdueOrders = async (filters = {}, token, username) => {
  try {
    const result = await fetchAllOrders(filters, token, username);
    
    if (!result.success) {
      return result;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizace na půlnoc pro porovnání datumů

    const filteredData = result.data.filter(order => {
      // Kontrola stavu objednávky - různé formáty
      let isDokoncena = false;
      
      // 1. Enriched: order.stav_workflow_kod obsahuje KÓD
      if (order.stav_workflow_kod) {
        isDokoncena = String(order.stav_workflow_kod).includes('DOKONCENA');
      }
      // 2. String field: order.stav
      else if (order.stav) {
        const stavUpper = String(order.stav).toUpperCase();
        isDokoncena = stavUpper.includes('DOKONCENA') || stavUpper.includes('ZRUSENA');
      }

      // Pokud je objednávka dokončená nebo zrušená, není po termínu
      if (isDokoncena) return false;

      // PRIORITA 1: Pokud objednávka obsahuje faktury, kontroluj jejich splatnost
      const faktury = order.faktury || [];
      if (faktury.length > 0) {
        // Kontrola zda alespoň jedna faktura má splatnost po dnešním dni
        const hasOverdueInvoice = faktury.some(faktura => {
          const splatnost = faktura.fa_datum_splatnosti || faktura.fa_splatnost;
          if (!splatnost) return false;
          
          const splatnostDate = new Date(splatnost);
          splatnostDate.setHours(0, 0, 0, 0);
          
          // Faktura je po splatnosti, pokud splatnost < dnes
          return splatnostDate < now;
        });

        if (hasOverdueInvoice) {
          return true;
        }
        
        // Má faktury, ale žádná není po splatnosti
        return false;
      }

      // PRIORITA 2: Pokud nemá faktury, kontroluj termin_dodani objednávky
      if (!order.termin_dodani) return false;
      
      const terminDodani = new Date(order.termin_dodani);
      terminDodani.setHours(0, 0, 0, 0);
      
      // Objednávka je po termínu, pokud termin_dodani < dnes
      const isOverdue = terminDodani < now;
      
      if (isOverdue) {
      }
      
      return isOverdue;
    });


    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        )
      }
    };
  } catch (error) {
    console.error('Error in fetchOverdueOrders:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * REPORT 8: Objednávky podle druhu (kategorie/typu)
 * Filtruje podle druh_objednavky (KÓD z číselníku)
 */
export const fetchOrdersByCategory = async (druhKod, filters = {}, token, username) => {
  try {
    // Načíst všechny objednávky BEZ BE filtru (BE filtr nefunguje správně)
    const result = await fetchAllOrders(filters, token, username);
    
    if (!result.success) {
      return result;
    }


    // FE filtrování podle různých formátů druh_objednavky
    const filteredData = result.data.filter(order => {
      // 1. Enriched: order.druh_objednavky = {kod, nazev}
      if (order.druh_objednavky?.kod) {
        return String(order.druh_objednavky.kod) === String(druhKod);
      }
      // 2. Code field: order.druh_objednavky_kod
      if (order.druh_objednavky_kod) {
        return String(order.druh_objednavky_kod) === String(druhKod);
      }
      // 3. Direct value: order.druh_objednavky (string/number)
      if (order.druh_objednavky) {
        return String(order.druh_objednavky) === String(druhKod);
      }
      return false;
    });


    return {
      success: true,
      data: filteredData,
      count: filteredData.length,
      summary: {
        total_amount: filteredData.reduce((sum, order) => 
          sum + getOrderTotalPriceWithDPH(order), 0
        ),
        category: druhKod
      }
    };
  } catch (error) {
    console.error('Error in fetchOrdersByCategory:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Export dat do CSV
 */
export const exportToCSV = (data, filename = 'report.csv') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Získat všechny klíče z prvního objektu
  const headers = Object.keys(data[0]);
  
  // Vytvoří CSV header
  let csv = headers.join(';') + '\n';
  
  // Přidat řádky
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Ošetřit hodnoty obsahující středník, čárku nebo nový řádek
      if (value && typeof value === 'string' && (value.includes(';') || value.includes(',') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csv += values.join(';') + '\n';
  });

  // Stáhnout soubor
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default api25reports;
