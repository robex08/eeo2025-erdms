import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo',
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Notifikační service pro komunikaci s backend API
 *
 * Backend commit: 3a28a99 - FEATURE: Rozsireni notifikacniho systemu
 * Automaticky naplňuje 50+ placeholderů z order_id
 */
class NotificationService {

  /**
   * Vytvoří notifikaci s automatickým naplněním placeholderů z objednávky
   *
   * @param {Object} params
   * @param {string} params.token - User token
   * @param {string} params.username - Username
   * @param {string} params.type - Typ notifikace (z NOTIFICATION_TYPES)
   * @param {number} params.order_id - ID objednávky (automaticky naplní placeholdery)
   * @param {number} params.action_user_id - ID uživatele, který provedl akci
   * @param {number} [params.to_user_id] - ID příjemce (nebo použij to_users)
   * @param {number[]} [params.to_users] - Pole ID příjemců
   * @param {Object} [params.additional_data] - Dodatečná data (rejection_reason, atd.)
   * @param {string} [params.priority] - Přepíše default prioritu (urgent/high/normal/low)
   * @param {boolean} [params.send_email] - Přepíše default email nastavení
   * @param {Object} [params.template_override] - Přepíše části templatu
   * @returns {Promise<Object>} Response s notification_id a recipients_count
   */
  async create({
    token,
    username,
    type,
    order_id,
    action_user_id,
    to_user_id,
    to_users,
    additional_data = {},
    priority,
    send_email,
    template_override
  }) {
    try {
      const payload = {
        token,
        username,
        type,
        order_id,
        action_user_id
      };

      // Příjemci
      if (to_user_id) payload.to_user_id = to_user_id;
      if (to_users) payload.to_users = to_users;

      // Volitelné parametry
      if (Object.keys(additional_data).length > 0) {
        payload.additional_data = additional_data;
      }
      if (priority) payload.priority = priority;
      if (send_email !== undefined) payload.send_email = send_email;
      if (template_override) payload.template_override = template_override;

      const response = await api.post('/notifications/create', payload);


      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Náhled notifikace PŘED odesláním (pro testování)
   *
   * @param {Object} params
   * @param {string} params.token - User token
   * @param {string} params.username - Username
   * @param {string} params.type - Typ notifikace
   * @param {number} params.order_id - ID objednávky
   * @param {number} params.action_user_id - ID uživatele
   * @param {Object} [params.additional_data] - Dodatečná data
   * @returns {Promise<Object>} Preview s naplněnými placeholdery
   */
  async preview({
    token,
    username,
    type,
    order_id,
    action_user_id,
    additional_data = {}
  }) {
    try {
      const response = await api.post('/notifications/preview', {
        token,
        username,
        type,
        order_id,
        action_user_id,
        additional_data
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Seznam všech dostupných notification templates (pro admin)
   *
   * @param {Object} params
   * @param {string} params.token - User token
   * @param {string} params.username - Username
   * @param {boolean} [params.active_only=true] - Jen aktivní templates
   * @returns {Promise<Array>} Seznam templates
   */
  async getTemplates({
    token,
    username,
    active_only = true
  }) {
    try {
      const response = await api.post('/notifications/templates', {
        token,
        username,
        active_only
      });

      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hromadné odeslání notifikace více uživatelům
   *
   * @param {Object} params
   * @param {string} params.token - User token
   * @param {string} params.username - Username
   * @param {string} params.type - Typ notifikace
   * @param {number} params.order_id - ID objednávky
   * @param {number} params.action_user_id - ID uživatele
   * @param {number[]} params.recipients - Pole ID příjemců
   * @param {Object} [params.additional_data] - Dodatečná data
   * @returns {Promise<Object>} Response s notification_id a recipients_count
   */
  async sendBulk({
    token,
    username,
    type,
    order_id,
    action_user_id,
    recipients,
    additional_data = {}
  }) {
    try {
      const response = await api.post('/notifications/send-bulk', {
        token,
        username,
        type,
        order_id,
        action_user_id,
        recipients,
        additional_data
      });


      return response;
    } catch (error) {
      throw error;
    }
  }

  // =====================================================================
  // HELPER FUNKCE PRO WORKFLOW - READY TO USE
  // =====================================================================

  /**
   * Odeslat notifikaci při schválení objednávky
   */
  async notifyOrderApproved({
    token,
    username,
    order_id,
    action_user_id,
    creator_id
  }) {
    return this.create({
      token,
      username,
      type: 'ORDER_APPROVED',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při zamítnutí objednávky
   */
  async notifyOrderRejected({
    token,
    username,
    order_id,
    action_user_id,
    creator_id,
    rejection_reason
  }) {
    return this.create({
      token,
      username,
      type: 'ORDER_REJECTED',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      additional_data: {
        rejection_reason: rejection_reason || 'Bez uvedení důvodu'
      },
      send_email: true,
      priority: 'high'
    });
  }

  /**
   * Odeslat notifikaci při odeslání ke schválení
   */
  async notifyPendingApproval({
    token,
    username,
    order_id,
    action_user_id,
    garant_id
  }) {
    return this.create({
      token,
      username,
      type: 'ORDER_PENDING_APPROVAL',
      order_id,
      action_user_id,
      to_user_id: garant_id,
      send_email: true,
      priority: 'high'
    });
  }

  /**
   * Odeslat notifikaci při vrácení k přepracování
   */
  async notifyWaitingForChanges({
    token,
    username,
    order_id,
    action_user_id,
    creator_id,
    waiting_reason
  }) {
    return this.create({
      token,
      username,
      type: 'ORDER_AWAITING_CHANGES',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      additional_data: {
        waiting_reason: waiting_reason || 'Požadováno doplnění údajů'
      },
      send_email: true,
      priority: 'normal'
    });
  }

  /**
   * Odeslat notifikaci při odeslání dodavateli
   */
  async notifySentToSupplier({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // creator, garant
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'ORDER_SENT_TO_SUPPLIER',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při potvrzení dodavatelem
   */
  async notifyConfirmedBySupplier({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // creator, garant
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'ORDER_CONFIRMED_BY_SUPPLIER',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při zveřejnění v registru smluv (NOVÁ FÁZE)
   */
  async notifyRegistryPublished({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // creator, garant, příkazce
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'ORDER_REGISTRY_PUBLISHED',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při přidání faktury (NOVÁ FÁZE)
   */
  async notifyInvoiceAdded({
    token,
    username,
    order_id,
    action_user_id,
    garant_id
  }) {
    return this.create({
      token,
      username,
      type: 'ORDER_INVOICE_ADDED',
      order_id,
      action_user_id,
      to_user_id: garant_id,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při schválení faktury (NOVÁ FÁZE)
   */
  async notifyInvoiceApproved({
    token,
    username,
    order_id,
    action_user_id,
    creator_id
  }) {
    return this.create({
      token,
      username,
      type: 'ORDER_INVOICE_APPROVED',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při uhrazení faktury (NOVÁ FÁZE)
   */
  async notifyInvoicePaid({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // creator, garant
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'ORDER_INVOICE_PAID',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při potvrzení věcné správnosti (NOVÁ FÁZE)
   */
  async notifyVecnaSpravnostConfirmed({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // garant, příkazce
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'INVOICE_MATERIAL_CHECK_APPROVED',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }

  /**
   * Odeslat notifikaci při zamítnutí věcné správnosti - reklamace (NOVÁ FÁZE)
   */
  async notifyVecnaSpravnostRejected({
    token,
    username,
    order_id,
    action_user_id,
    recipients,  // creator, garant, příkazce
    rejection_reason
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'INVOICE_MATERIAL_CHECK_REJECTED', // TODO: implementovat nebo odstranit
      order_id,
      action_user_id,
      recipients,
      additional_data: {
        rejection_reason: rejection_reason || 'Vadné plnění - nutná reklamace'
      },
      send_email: true,
      priority: 'high'
    });
  }

  /**
   * @deprecated ⚠️ DEPRECATED - Use triggerNotification() from notificationsApi.js instead
   * This function bypasses organizational hierarchy and ignores edge sendEmail settings
   * 
   * Odeslat DUAL-TEMPLATE notifikace při odeslání ke schválení
   * 
   * @param {Object} params
   * @param {string} params.token - User token
   * @param {string} params.username - Username
   * @param {Object} params.orderData - Data objednávky z OrderForm25
   * @returns {Promise<Object>} Response s počtem odeslaných emailů
   */
  async sendOrderApprovalNotifications({
    token,
    username,
    orderData
  }) {
    console.error('════════════════════════════════════════════════════════════════');
    console.error('⚠️ DEPRECATED: sendOrderApprovalNotifications()');
    console.error('   This function bypasses organizational hierarchy');
    console.error('   Use: triggerNotification() from notificationsApi.js');
    console.error('   Event: order_status_ke_schvaleni');
    console.error('════════════════════════════════════════════════════════════════');
    
    try {
      // Sestavit FROM (SUBMITTER - zelená šablona) a TO (APPROVER - červená šablona)
      const fromSet = new Set();
      const toSet = new Set();
      
      // TO = APPROVER: příkazce (červená šablona ke schválení)
      if (orderData.prikazce_id) {
        toSet.add(orderData.prikazce_id);
      }
      
      // FROM = SUBMITTER: garant, vytvořil, objednatel (zelená informační šablona)
      if (orderData.garant_id && orderData.garant_id !== orderData.prikazce_id) {
        fromSet.add(orderData.garant_id);
      }
      if (orderData.vytvoril && orderData.vytvoril !== orderData.prikazce_id) {
        fromSet.add(orderData.vytvoril);
      }
      if (orderData.objednatel_id && orderData.objednatel_id !== orderData.prikazce_id) {
        fromSet.add(orderData.objednatel_id);
      }

      const from = Array.from(fromSet);
      const to = Array.from(toSet);

      if (from.length === 0 && to.length === 0) {
        console.warn('sendOrderApprovalNotifications: Žádní příjemci k odeslání');
        return { status: 'warning', message: 'No recipients', sent: 0 };
      }

      // Formátovat data pro API (nový formát s from/to + střediska + financování JSON)
      const payload = {
        token,
        username,
        order_id: orderData.id,
        order_number: orderData.ev_cislo,
        order_subject: orderData.predmet,
        commander_id: orderData.prikazce_id,
        garant_id: orderData.garant_id,
        creator_id: orderData.vytvoril,
        supplier_name: orderData.dodavatel_nazev || 'Neuvedeno',
        // 💰 FINANCOVÁNÍ - celý JSON objekt (backend ho parsuje)
        financovani_json: orderData.financovani_json || '{}',
        strediska_names: orderData.strediska_nazvy || [],          // Array názvů středisek (už převedeno ve FE)
        max_price: orderData.max_price_with_dph ? `${orderData.max_price_with_dph.toLocaleString('cs-CZ')} Kč` : 'Neuvedeno',
        is_urgent: orderData.is_urgent || false,                   // 🚨 Mimořádná událost (červená vs oranžová)
        from,  // SUBMITTER recipients (zelená šablona)
        to     // APPROVER recipients (červená/oranžová šablona)
      };
      
      console.log('Dual notification payload:', { fromCount: from.length, toCount: to.length, strediska: payload.strediska_names.length, urgent: payload.is_urgent });

      // Volat backend API pro dual-template odeslání
      const response = await api.post('/notifications/send-dual', payload);

      console.log('sendOrderApprovalNotifications SUCCESS:', response);
      return response;

    } catch (error) {
      // Non-blocking error - logovat ale nepřerušovat workflow
      console.error('sendOrderApprovalNotifications ERROR:', error);
      return { 
        status: 'error', 
        message: error.message || 'Failed to send notifications',
        sent: 0 
      };
    }
  }

  /**
   * Načte notifikace pro výběr v admin rozhraní (pro post-login modal)
   * @param {string} token - Auth token
   * @param {string} username - Username
   * @returns {Promise<Array>} Seznam notifikací pro select
   */
  async getNotificationsForSelect(token, username) {
    try {
      const payload = {
        token,
        username,
        for_select: true
      };

      const response = await api.post('/notifications/list-for-select', payload);
      
      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.warn('Chyba při načítání notifikací pro select:', error);
      return [];
    }
  }

  /**
   * Načte notifikaci podle ID (pro post-login modal)
   * @param {number} id - ID notifikace
   * @param {string} token - Auth token
   * @param {string} username - Username
   * @returns {Promise<Object>} Notifikace s obsahem
   */
  async getNotificationById(id, token, username) {
    try {
      const payload = {
        token,
        username,
        id: id
      };

      const response = await api.post('/notifications/get-by-id', payload);
      
      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.warn('Chyba při načítání notifikace ID', id, ':', error);
      return null;
    }
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Export pro explicitní importy
export {
  NotificationService,
  notificationService
};
