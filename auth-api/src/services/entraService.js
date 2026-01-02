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
  async getUsers(limit = 2000) {
    await this.ensureInitialized();
    try {
      let allUsers = [];
      let pageCount = 0;
      const maxPages = Math.ceil(limit / 999); // Graph API max je 999 per page
      
      console.log(`📊 Načítám uživatele, max ${limit}, očekávám ${maxPages} stránek...`);
      
      // První stránka s $count pro zjištění celkového počtu
      let response = await this.client
        .api('/users')
        .select('id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,accountEnabled,createdDateTime,employeeHireDate,employeeId')
        .top(999)
        .orderby('displayName')
        .header('ConsistencyLevel', 'eventual')
        .count(true)
        .get();
      
      const totalCount = response['@odata.count'];
      console.log(`📊 Celkový počet uživatelů v Entra: ${totalCount}`);
      
      allUsers = response.value || [];
      pageCount++;
      console.log(`📄 Stránka ${pageCount}: načteno ${allUsers.length} uživatelů`);
      
      // Načti další stránky přes @odata.nextLink
      while (response['@odata.nextLink'] && allUsers.length < limit && pageCount < maxPages) {
        response = await this.client
          .api(response['@odata.nextLink'])
          .get();
        
        const newUsers = response.value || [];
        allUsers = allUsers.concat(newUsers);
        pageCount++;
        console.log(`📄 Stránka ${pageCount}: načteno ${newUsers.length} uživatelů, celkem ${allUsers.length}`);
      }
      
      console.log(`✅ Načítání dokončeno: ${allUsers.length} uživatelů z ${totalCount} celkem`);
      
      // Ořízni na požadovaný limit a vrať objekt s totalCount
      const finalUsers = allUsers.slice(0, limit);
      return {
        users: finalUsers,
        totalCount: totalCount,
        loadedCount: finalUsers.length
      };
    } catch (err) {
      console.error('🔴 getUsers ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Fulltextové vyhledávání uživatelů
   * Hledá v: displayName, givenName, surname, mail, userPrincipalName, jobTitle, department, officeLocation
   * @param {string} searchQuery - Vyhledávací dotaz (min 3 znaky)
   * @param {number} limit - Max výsledků (default 50, max 999)
   * @returns {Array} Seznam nalezených uživatelů
   */
  async searchUsers(searchQuery, limit = 50) {
    await this.ensureInitialized();
    
    if (!searchQuery || searchQuery.trim().length < 3) {
      return [];
    }

    try {
      // Normalizace pro český vyhledávání - odstranění diakritiky
      const normalize = (text) => {
        if (!text) return '';
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Odstraní diakritiku (čárky, háčky atd.)
      };
      
      const query = normalize(searchQuery.trim());
      
      // POZNÁMKA: Graph API $search podporuje jen: displayName, givenName, surname, mail, userPrincipalName
      // Pro jobTitle, department, officeLocation musíme filtrovat na serveru
      
      // Načteme více uživatelů (až 999) a filtrujeme lokálně
      const response = await this.client
        .api('/users')
        .select('id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,accountEnabled')
        .top(999)
        .orderby('displayName')
        .get();
      
      const allUsers = response.value || [];
      
      console.log(`🔍 Search query: "${searchQuery}" -> normalized: "${query}"`);
      console.log(`📊 Total users to search: ${allUsers.length}`);
      
      // Filtrování na serveru - hledáme ve všech relevantních polích
      // Porovnávání BEZ diakritiky pro český text
      let matchCount = 0;
      const filtered = allUsers.filter(user => {
        const fields = [
          user.displayName,
          user.givenName,
          user.surname,
          user.mail,
          user.userPrincipalName,
          user.jobTitle,
          user.department,
          user.officeLocation
        ];
        
        const match = fields.some(field => 
          field && normalize(field).includes(query)
        );
        
        // Debug: Vypsat prvních 5 matchů
        if (match && matchCount < 5) {
          console.log(`✅ Match: ${user.displayName} | JobTitle: "${user.jobTitle}"`);
          matchCount++;
        }
        
        return match;
      });
      
      console.log(`✅ Found ${filtered.length} matches`);
      
      // Omezení počtu výsledků
      return filtered.slice(0, Math.min(limit, 999));
    } catch (err) {
      console.error('🔴 searchUsers ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Získat seznam uživatelů s paginací
   * @param {number} pageSize - Počet uživatelů na stránku (default 25)
   * @param {string} skipToken - Token pro další stránku (z předchozího requestu)
   * @returns {Object} { users: [], nextLink: string|null, hasMore: boolean }
   */
  async getUsersPaginated(pageSize = 25, skipToken = null) {
    await this.ensureInitialized();
    try {
      let query = this.client
        .api('/users')
        .select('id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,accountEnabled')
        .top(pageSize)
        .orderby('displayName');

      // Pokud máme skipToken, použij ho
      if (skipToken) {
        query = query.skipToken(skipToken);
      }

      const response = await query.get();
      
      return {
        users: response.value || [],
        nextLink: response['@odata.nextLink'] || null,
        skipToken: response['@odata.nextLink'] ? this.extractSkipToken(response['@odata.nextLink']) : null,
        hasMore: !!response['@odata.nextLink'],
        count: (response.value || []).length
      };
    } catch (err) {
      console.error('🔴 getUsersPaginated ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Extrahuj skipToken z @odata.nextLink URL
   * @param {string} nextLink - URL s $skiptoken
   * @returns {string|null} skipToken
   */
  extractSkipToken(nextLink) {
    try {
      const url = new URL(nextLink);
      return url.searchParams.get('$skiptoken');
    } catch (err) {
      console.error('🔴 extractSkipToken ERROR:', err.message);
      return null;
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

  /**
   * DEBUG: Zkusit všechny možné varianty Graph API pro kalendář
   */
  async debugCalendarAPIs(userAccessToken, limit = 3) {
    if (!userAccessToken) {
      throw new Error('User access token is required');
    }

    const userClient = Client.init({
      authProvider: (done) => {
        done(null, userAccessToken);
      }
    });

    const now = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const results = {};

    // 1. /me/calendar/events BEZ select
    try {
      console.log('\n📅 === TEST 1: /me/calendar/events BEZ select ===');
      const r1 = await userClient.api('/me/calendar/events').top(limit).get();
      results.test1_events_no_select = r1.value;
      console.log('✅ Test 1 SUCCESS:', JSON.stringify(r1.value[0], null, 2));
    } catch (err) {
      results.test1_events_no_select = { error: err.message };
      console.log('❌ Test 1 ERROR:', err.message);
    }

    // 2. /me/calendar/events SE select categories
    try {
      console.log('\n📅 === TEST 2: /me/calendar/events SE select categories ===');
      const r2 = await userClient.api('/me/calendar/events')
        .select('subject,start,end,categories')
        .top(limit).get();
      results.test2_events_with_select = r2.value;
      console.log('✅ Test 2 SUCCESS:', JSON.stringify(r2.value[0], null, 2));
    } catch (err) {
      results.test2_events_with_select = { error: err.message };
      console.log('❌ Test 2 ERROR:', err.message);
    }

    // 3. /me/calendarview BEZ select
    try {
      console.log('\n📅 === TEST 3: /me/calendarview BEZ select ===');
      const r3 = await userClient.api('/me/calendarview')
        .query({ startDateTime: now, endDateTime: endDate })
        .top(limit).get();
      results.test3_calendarview_no_select = r3.value;
      console.log('✅ Test 3 SUCCESS:', JSON.stringify(r3.value[0], null, 2));
    } catch (err) {
      results.test3_calendarview_no_select = { error: err.message };
      console.log('❌ Test 3 ERROR:', err.message);
    }

    // 4. /me/calendarview SE select categories
    try {
      console.log('\n📅 === TEST 4: /me/calendarview SE select categories ===');
      const r4 = await userClient.api('/me/calendarview')
        .query({ startDateTime: now, endDateTime: endDate })
        .select('subject,start,end,categories')
        .top(limit).get();
      results.test4_calendarview_with_select = r4.value;
      console.log('✅ Test 4 SUCCESS:', JSON.stringify(r4.value[0], null, 2));
    } catch (err) {
      results.test4_calendarview_with_select = { error: err.message };
      console.log('❌ Test 4 ERROR:', err.message);
    }

    // 5. /me/events BEZ select
    try {
      console.log('\n📅 === TEST 5: /me/events BEZ select ===');
      const r5 = await userClient.api('/me/events').top(limit).get();
      results.test5_me_events_no_select = r5.value;
      console.log('✅ Test 5 SUCCESS:', JSON.stringify(r5.value[0], null, 2));
    } catch (err) {
      results.test5_me_events_no_select = { error: err.message };
      console.log('❌ Test 5 ERROR:', err.message);
    }

    // 6. /me/events SE select categories
    try {
      console.log('\n📅 === TEST 6: /me/events SE select categories ===');
      const r6 = await userClient.api('/me/events')
        .select('subject,start,end,categories')
        .top(limit).get();
      results.test6_me_events_with_select = r6.value;
      console.log('✅ Test 6 SUCCESS:', JSON.stringify(r6.value[0], null, 2));
    } catch (err) {
      results.test6_me_events_with_select = { error: err.message };
      console.log('❌ Test 6 ERROR:', err.message);
    }

    // 7. S Prefer header timezone
    try {
      console.log('\n📅 === TEST 7: /me/calendarview S Prefer timezone ===');
      const r7 = await userClient.api('/me/calendarview')
        .query({ startDateTime: now, endDateTime: endDate })
        .header('Prefer', 'outlook.timezone="Europe/Prague"')
        .top(limit).get();
      results.test7_with_prefer_timezone = r7.value;
      console.log('✅ Test 7 SUCCESS:', JSON.stringify(r7.value[0], null, 2));
    } catch (err) {
      results.test7_with_prefer_timezone = { error: err.message };
      console.log('❌ Test 7 ERROR:', err.message);
    }

    console.log('\n📊 === SUMMARY ===');
    console.log('Total tests:', Object.keys(results).length);
    Object.keys(results).forEach(key => {
      const hasError = results[key].error;
      const hasCategories = !hasError && results[key][0] && results[key][0].categories;
      console.log(`${key}: ${hasError ? '❌ ERROR' : hasCategories ? '✅ HAS CATEGORIES' : '⚠️ NO CATEGORIES'}`);
    });

    return results;
  }

  /**
   * Získat nadcházející události z kalendáře přihlášeného uživatele
   * @param {string} userAccessToken - Access token uživatele (delegated)
   * @param {number} days - Počet dní dopředu (výchozí 7)
   * @returns {Promise<Array>} - Pole událostí z kalendáře
   */
  async getMyCalendarEvents(userAccessToken, days = 7) {
    if (!userAccessToken) {
      throw new Error('User access token is required for calendar access');
    }

    try {
      // Vytvoř Graph API klienta s uživatelským tokenem (delegated permissions)
      const userClient = Client.init({
        authProvider: (done) => {
          done(null, userAccessToken);
        }
      });

      // Načti události od DNES do DNES + X dní
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Začátek dnešního dne
      const startDate = now.toISOString();
      
      const endDateObj = new Date(now);
      endDateObj.setDate(endDateObj.getDate() + days);
      endDateObj.setHours(23, 59, 59, 999); // Konec posledního dne
      const endDate = endDateObj.toISOString();
      
      console.log(`📅 Fetching calendar events for next ${days} days: ${startDate} to ${endDate}`);
      
      const response = await userClient
        .api('/me/calendarview')
        .query({
          startDateTime: startDate,
          endDateTime: endDate
        })
        .header('Prefer', 'outlook.timezone="Europe/Prague"')
        .orderby('start/dateTime')
        .top(999) // Načteme všechny události v rozsahu (ne jen prvních X)
        .get();
      
      console.log('📅 Graph API response (first event):', JSON.stringify(response.value[0], null, 2));
      console.log('📅 Total events in next', days, 'days:', response.value.length);
      
      return response.value || [];
    } catch (err) {
      console.error('🔴 getMyCalendarEvents ERROR:', err.message);
      throw err;
    }
  }
}

// Singleton instance
module.exports = new EntraService();

// Singleton instance
module.exports = new EntraService();
