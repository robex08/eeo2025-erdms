/**
 * useOrderPermissions.js
 * 
 * 🚀 OPTIMALIZACE: Memoizované permission funkce
 * Eliminuje inline permission checking a 80+ řádků duplicitního kódu
 */

import { useMemo } from 'react';
import ORDERS_V3_CONFIG from '../../constants/ordersV3Config';

const { PERMISSIONS, WORKFLOW_STATES } = ORDERS_V3_CONFIG;

/**
 * Optimalizované permission hooks s memoizací
 * 
 * @param {Function} hasPermission - Permission checking function
 * @param {number} userId - Current user ID
 * @returns {Object} Memoized permission functions
 */
export function useOrderPermissions(hasPermission, userId) {
  // ✅ OPTIMALIZACE: Memoizuj permission funkce - zavolají se pouze při změně hasPermission nebo userId
  const permissionFunctions = useMemo(() => {
    if (!hasPermission) {
      // Fallback když hasPermission není dostupný
      return {
        canEdit: () => false,
        canCreateInvoice: () => false,
        canExportDocument: () => false,
        canDelete: () => false,
        canHardDelete: () => false,
        canViewDetails: () => false,
        canGenerateFinancialControl: () => false,
      };
    }

    // ============================================================================
    // OPTIMALIZED PERMISSION FUNCTIONS
    // ============================================================================

    /**
     * 🔐 Kontrola oprávnění k editaci objednávky
     * Optimalizovaná verze s early returns
     */
    const canEdit = (order) => {
      if (!order) return false;

      // ✅ KONCEPTY: Může editovat každý s ORDER_EDIT_*
      if (order.isDraft || order.je_koncept) {
        return hasPermission(PERMISSIONS.ORDER_EDIT_ALL) || hasPermission(PERMISSIONS.ORDER_EDIT_OWN);
      }

      // ✅ ADMIN RIGHTS: Full access
      if (hasPermission(PERMISSIONS.ORDER_EDIT_ALL) || hasPermission(PERMISSIONS.ORDER_MANAGE)) {
        return true;
      }

      // ✅ DEPARTMENT SUBORDINATE: Can edit subordinate orders
      if (hasPermission(PERMISSIONS.ORDER_EDIT_SUBORDINATE)) {
        return true;
      }

      // ✅ READ-ONLY SUBORDINATE: Check role-based access first
      if (hasPermission(PERMISSIONS.ORDER_READ_SUBORDINATE) && !hasPermission(PERMISSIONS.ORDER_EDIT_SUBORDINATE)) {
        const isInOrderRole = isUserInOrderRole(order, userId);
        if (!isInOrderRole) return false;
      }

      // ✅ OWN ORDERS: Can edit own orders only
      if (hasPermission(PERMISSIONS.ORDER_EDIT_OWN) || hasPermission(PERMISSIONS.ORDER_2025)) {
        return isUserInOrderRole(order, userId);
      }

      return false;
    };

    /**
     * 🧾 Kontrola oprávnění k vytvoření faktury
     */
    const canCreateInvoice = (order) => {
      if (!order) return false;

      // ✅ INVOICE PERMISSIONS: Check base permission first
      const hasInvoicePermission = 
        hasPermission(PERMISSIONS.ADMINI) ||
        hasPermission(PERMISSIONS.INVOICE_MANAGE) ||
        hasPermission(PERMISSIONS.INVOICE_ADD);
      
      if (!hasInvoicePermission) return false;

      // ✅ WORKFLOW STATE: Only specific states allowed
      const workflowStates = parseWorkflowStates(order.stav_workflow_kod);
      
      // ❌ Check for invalid states first (early return)
      if (workflowStates.some(state => WORKFLOW_STATES.INVOICE_INVALID.includes(state))) {
        return false;
      }

      // ✅ Check for at least one allowed state
      return workflowStates.some(state => WORKFLOW_STATES.INVOICE_ALLOWED.includes(state));
    };

    /**
     * 📄 Kontrola oprávnění k exportu dokumentu
     */
    const canExportDocument = (order) => {
      if (!order) return false;

      const workflowStates = parseWorkflowStates(order.stav_workflow_kod);
      return workflowStates.some(state => WORKFLOW_STATES.EXPORT_ALLOWED.includes(state));
    };

    /**
     * 🗑️ Kontrola oprávnění ke smazání (soft delete)
     */
    const canDelete = (order) => {
      if (!order) return false;

      // ❌ Concepts cannot be deleted
      if (order.isDraft || order.je_koncept || order.hasLocalDraftChanges) {
        return false;
      }

      // ✅ ARCHIVED ORDERS: Only high-level permissions
      if (order.stav_objednavky === 'ARCHIVOVANO') {
        return hasPermission(PERMISSIONS.ORDER_MANAGE) || hasPermission(PERMISSIONS.ORDER_DELETE_ALL);
      }

      // ✅ ADMIN DELETE: Can delete all
      if (hasPermission(PERMISSIONS.ORDER_DELETE_ALL) || hasPermission(PERMISSIONS.ORDER_MANAGE)) {
        return true;
      }

      // ✅ DEPARTMENT SUBORDINATE: Can delete subordinate orders
      if (hasPermission(PERMISSIONS.ORDER_EDIT_SUBORDINATE)) {
        return true;
      }

      // ✅ READ-ONLY SUBORDINATE: Check role first
      if (hasPermission(PERMISSIONS.ORDER_READ_SUBORDINATE) && !hasPermission(PERMISSIONS.ORDER_EDIT_SUBORDINATE)) {
        const isInOrderRole = isUserInOrderRole(order, userId);
        if (!isInOrderRole) return false;
      }

      // ✅ OWN ORDERS: Can delete own orders only
      if (hasPermission(PERMISSIONS.ORDER_DELETE_OWN)) {
        return isUserInOrderRole(order, userId);
      }

      return false;
    };

    /**
     * 💥 Kontrola oprávnění k hard delete (permanent removal)
     */
    const canHardDelete = () => {
      return hasPermission(PERMISSIONS.ADMINI);
    };

    /**
     * 👁️ Kontrola oprávnění k zobrazení detailů
     */
    const canViewDetails = () => {
      // Basic read permission check
      return hasPermission('ORDER_READ') || 
             hasPermission(PERMISSIONS.ORDER_READ_OWN) || 
             hasPermission(PERMISSIONS.ORDER_READ_SUBORDINATE) ||
             hasPermission(PERMISSIONS.ORDER_EDIT_ALL) ||
             hasPermission(PERMISSIONS.ORDER_MANAGE);
    };

    /**
     * 💰 Kontrola oprávnění ke generování finanční kontroly
     * Pouze kontroloři, účetní a admin
     */
    const canGenerateFinancialControl = () => {
      return hasPermission(PERMISSIONS.ADMINI) || 
             hasPermission(PERMISSIONS.ORDER_MANAGE) ||
             hasPermission('KONTROLOR') ||
             hasPermission('UCETNI') ||
             hasPermission('ORDER_FINANCIAL_CONTROL');
    };

    return {
      canEdit,
      canCreateInvoice,
      canExportDocument,
      canDelete,
      canHardDelete,
      canViewDetails,
      canGenerateFinancialControl,
    };
  }, [hasPermission, userId]);

  return permissionFunctions;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * ✅ Kontrola zda je uživatel v roli pro objednávku
 * @param {Object} order - Objednávka
 * @param {number} userId - User ID
 * @returns {boolean}
 * 
 * ⚠️ POZOR: Backend API vrací některá pole s jiným názvem než v DB!
 * - DB: garant_uzivatel_id → API: garant_id
 * - Proto kontrolujeme obě varianty (compatibility)
 */
function isUserInOrderRole(order, userId) {
  return (
    order.objednatel_id === userId ||
    order.uzivatel_id === userId ||
    order.garant_uzivatel_id === userId || // ⚠️ Orders25List starý formát
    order.garant_id === userId ||           // ✅ Orders V3 API formát
    order.schvalovatel_id === userId ||
    order.prikazce_id === userId ||
    order.uzivatel_akt_id === userId ||
    order.odesilatel_id === userId ||
    order.dodavatel_potvrdil_id === userId ||
    order.zverejnil_id === userId ||
    order.fakturant_id === userId ||
    order.dokoncil_id === userId ||
    order.potvrdil_vecnou_spravnost_id === userId
  );
}

/**
 * ✅ Parsing workflow states z JSON stringu
 * @param {string|Array} stateValue - Workflow states
 * @returns {Array<string>} Normalized state codes
 */
function parseWorkflowStates(stateValue) {
  try {
    if (!stateValue) return [];
    
    let states = Array.isArray(stateValue) ? stateValue : JSON.parse(stateValue);
    if (!Array.isArray(states)) states = [];
    
    return states.map(state => {
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        return String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      }
      return String(state).toUpperCase().trim();
    });
  } catch {
    return [];
  }
}

export default useOrderPermissions;