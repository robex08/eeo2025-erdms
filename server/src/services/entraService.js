const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');

/**
 * Microsoft Entra ID (Azure AD) Service
 * Pro práci s Microsoft Graph API - uživatelé, skupiny, organizační struktura
 */
class EntraService {
  constructor() {
    this.credential = null;
    this.client = null;
    this.initialized = false;
  }

  /**
   * Inicializace Graph API klienta
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Credential pro Graph API
      this.credential = new ClientSecretCredential(
        process.env.ENTRA_TENANT_ID || process.env.ENTRA_AUTHORITY?.split('/').pop(),
        process.env.ENTRA_CLIENT_ID,
        process.env.ENTRA_CLIENT_SECRET
      );

      // Graph API client
      this.client = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await this.credential.getToken('https://graph.microsoft.com/.default');
            return token.token;
          }
        }
      });

      this.initialized = true;
      console.log('✅ EntraService initialized');
    } catch (err) {
      console.error('🔴 EntraService initialization failed:', err.message);
      throw err;
    }
  }

  /**
   * Zajistí, že je service inicializovaná
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Získat uživatele podle Entra ID (GUID)
   */
  async getUserById(userId) {
    await this.ensureInitialized();
    try {
      return await this.client
        .api(`/users/${userId}`)
        .select('id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,mobilePhone,businessPhones')
        .get();
    } catch (err) {
      console.error('🔴 getUserById ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat skupiny uživatele (včetně GUID)
   * @param {string} userId - Entra ID (GUID) uživatele
   * @returns {Array} Seznam skupin s GUID, názvem, typem
   */
  async getUserGroups(userId) {
    await this.ensureInitialized();
    try {
      const response = await this.client
        .api(`/users/${userId}/memberOf`)
        .select('id,displayName,description,mailEnabled,securityEnabled,mail,groupTypes')
        .top(999)
        .get();
      
      return response.value || [];
    } catch (err) {
      console.error('🔴 getUserGroups ERROR:', err.message);
      if (err.statusCode === 404) return [];
      throw err;
    }
  }

  /**
   * Získat detaily skupiny podle GUID
   */
  async getGroupById(groupId) {
    await this.ensureInitialized();
    try {
      return await this.client
        .api(`/groups/${groupId}`)
        .select('id,displayName,description,createdDateTime,groupTypes,securityEnabled,mailEnabled,mail,proxyAddresses,visibility')
        .get();
    } catch (err) {
      console.error('🔴 getGroupById ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat členy skupiny
   */
  async getGroupMembers(groupId) {
    await this.ensureInitialized();
    try {
      const response = await this.client
        .api(`/groups/${groupId}/members`)
        .select('id,userPrincipalName,displayName,mail,jobTitle')
        .top(999)
        .get();
      
      return response.value || [];
    } catch (err) {
      console.error('🔴 getGroupMembers ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat managera (nadřízeného) uživatele
   */
  async getUserManager(userId) {
    await this.ensureInitialized();
    try {
      return await this.client
        .api(`/users/${userId}/manager`)
        .select('id,displayName,userPrincipalName,jobTitle,mail')
        .get();
    } catch (err) {
      if (err.statusCode === 404) {
        return null; // Uživatel nemá managera
      }
      console.error('🔴 getUserManager ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat podřízené (direct reports) uživatele
   */
  async getUserDirectReports(userId) {
    await this.ensureInitialized();
    try {
      const response = await this.client
        .api(`/users/${userId}/directReports`)
        .select('id,displayName,userPrincipalName,jobTitle,mail')
        .top(999)
        .get();
      
      return response.value || [];
    } catch (err) {
      console.error('🔴 getUserDirectReports ERROR:', err.message);
      if (err.statusCode === 404) return [];
      throw err;
    }
  }

  /**
   * Vyhledat uživatele podle emailu
   */
  async searchUserByEmail(email) {
    await this.ensureInitialized();
    try {
      const response = await this.client
        .api('/users')
        .filter(`mail eq '${email}' or userPrincipalName eq '${email}'`)
        .select('id,userPrincipalName,displayName,mail,jobTitle')
        .get();
      
      return response.value[0] || null;
    } catch (err) {
      console.error('🔴 searchUserByEmail ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat všechny skupiny v tenantovi
   */
  async getAllGroups() {
    await this.ensureInitialized();
    try {
      const response = await this.client
        .api('/groups')
        .select('id,displayName,description,mailEnabled,securityEnabled,groupTypes')
        .top(999)
        .get();
      
      return response.value || [];
    } catch (err) {
      console.error('🔴 getAllGroups ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat seznam uživatelů (max 50)
   * @param {number} limit - Maximální počet uživatelů (default 50)
   */
  async getUsers(limit = 50) {
    await this.ensureInitialized();
    try {
      const response = await this.client
        .api('/users')
        .select('id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,accountEnabled')
        .top(limit)
        .orderby('displayName')
        .get();
      
      return response.value || [];
    } catch (err) {
      console.error('🔴 getUsers ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat kompletní profil uživatele včetně skupin a managera
   * @param {string} userId - Entra ID (GUID)
   */
  async getUserFullProfile(userId) {
    await this.ensureInitialized();
    try {
      const [user, groups, manager, directReports] = await Promise.allSettled([
        this.getUserById(userId),
        this.getUserGroups(userId),
        this.getUserManager(userId),
        this.getUserDirectReports(userId)
      ]);

      return {
        user: user.status === 'fulfilled' ? user.value : null,
        groups: groups.status === 'fulfilled' ? groups.value : [],
        manager: manager.status === 'fulfilled' ? manager.value : null,
        directReports: directReports.status === 'fulfilled' ? directReports.value : [],
        errors: {
          user: user.status === 'rejected' ? user.reason.message : null,
          groups: groups.status === 'rejected' ? groups.reason.message : null,
          manager: manager.status === 'rejected' ? manager.reason.message : null,
          directReports: directReports.status === 'rejected' ? directReports.reason.message : null
        }
      };
    } catch (err) {
      console.error('🔴 getUserFullProfile ERROR:', err.message);
      throw err;
    }
  }
}

// Singleton instance
module.exports = new EntraService();
