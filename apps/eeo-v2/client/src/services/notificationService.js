import api from './api.eeo';

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
      type: 'order_status_schvalena',
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
      type: 'order_status_zamitnuta',
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
      type: 'order_status_ke_schvaleni',
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
      type: 'order_status_ceka_se',
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
      type: 'order_status_odeslana',
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
      type: 'order_status_potvrzena',
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
      type: 'order_status_registr_zverejnena',
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
      type: 'order_status_faktura_pridana',
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
      type: 'order_status_faktura_schvalena',
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
      type: 'order_status_faktura_uhrazena',
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
      type: 'order_status_kontrola_potvrzena',
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
      type: 'order_status_kontrola_zamitnuta',
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
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Export pro explicitní importy
export {
  NotificationService,
  notificationService
};
