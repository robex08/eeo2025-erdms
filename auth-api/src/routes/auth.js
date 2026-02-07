/**
 * Auth Routes - EntraID OAuth autentizace
 */

const express = require('express');
const router = express.Router();
const msal = require('@azure/msal-node');
const crypto = require('crypto');
const { msalConfig, REDIRECT_URI, POST_LOGOUT_REDIRECT_URI, SCOPES } = require('../config/entraConfig');
const authService = require('../services/authService');
const db = require('../db/connection');

// In-memory store pro PKCE verifiers (v produkci použít Redis)
const pkceStore = new Map();

// MSAL Confidential Client
const msalClient = new msal.ConfidentialClientApplication(msalConfig);

/**
 * GET /auth/login
 * Zahájí OAuth flow - redirect na Microsoft
 */
router.get('/login', async (req, res) => {
  console.log('🟢 SERVER: /auth/login endpoint CALLED');
  try {
    // Generuj PKCE code verifier a challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    console.log('🟢 SERVER: PKCE verifier generated');
    
    // State pro CSRF ochranu
    const state = crypto.randomBytes(16).toString('base64url');
    console.log('🟢 SERVER: State generated:', state);
    
    // Ulož code verifier pro pozdější použití
    pkceStore.set(state, codeVerifier);
    
    // Vyčisti staré verifiery (starší než 10 minut)
    setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000);

    const authCodeUrlParameters = {
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      codeChallenge,
      codeChallengeMethod: 'S256',
      state,
    };
    console.log('🟢 SERVER: Auth params:', authCodeUrlParameters);

    console.log('🟢 SERVER: Calling msalClient.getAuthCodeUrl()...');
    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    console.log('🟢 SERVER: Got authUrl:', authUrl);
    console.log('🟢 SERVER: Sending authUrl as JSON...');
    
    // Vrátíme JSON s URL místo redirect
    res.json({ authUrl });
  } catch (error) {
    console.error('🔴 SERVER: Login error:', error);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

/**
 * GET /auth/callback
 * Zpracuje odpověď od Microsoftu
 */
router.get('/callback', async (req, res) => {
  console.log('🟣 SERVER: /auth/callback CALLED');
  console.log('🟣 SERVER: Query params:', req.query);
  
  const { code, state, error, error_description } = req.query;

  // Chyba od Microsoftu
  if (error) {
    console.error('🔴 Auth error from Microsoft:', error, error_description);
    return res.redirect(`${process.env.CLIENT_URL}/login?error=${error}`);
  }

  // Kontrola povinných parametrů
  if (!code || !state) {
    console.error('🔴 Missing required parameters - code:', !!code, 'state:', !!state);
    console.error('🔴 This callback was called WITHOUT proper OAuth response!');
    return res.status(400).json({ 
      error: 'Missing required parameters',
      details: 'This endpoint should only be called by Microsoft OAuth redirect'
    });
  }

  try {
    console.log('🟣 SERVER: Looking for PKCE verifier for state:', state);
    // Získej code verifier ze store
    const codeVerifier = pkceStore.get(state);
    if (!codeVerifier) {
      console.error('🔴 PKCE verifier not found or expired for state:', state);
      return res.redirect(`${process.env.CLIENT_URL}/login?error=invalid_state`);
    }
    
    // Smaž použitý verifier
    pkceStore.delete(state);

    // Výměna authorization code za tokeny
    const tokenRequest = {
      code,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      codeVerifier,
    };

    console.log('🟣 SERVER: Exchanging code for tokens...');
    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
    const { account, accessToken, idToken, expiresOn } = tokenResponse;
    console.log('🟣 SERVER: ✅ Got tokens from Microsoft');
    console.log('🟣 SERVER: Account:', account.username, 'ID:', account.homeAccountId);

    // Extrahuj username z Microsoft UPN (např. u03924 z u03924@zachranka.cz)
    const msUsername = account.username.includes('@') 
      ? account.username.split('@')[0] 
      : account.username;
    
    console.log('🟣 SERVER: Přihlášen MS uživatel:', account.username);
    console.log('🟣 SERVER: Username:', msUsername);
    console.log('🟣 SERVER: EntraID:', account.homeAccountId);
    
    // DOČASNĚ: Neověřujeme existenci uživatele v DB
    // Vytvoříme user objekt s daty z Entra ID
    const user = {
      id: account.homeAccountId, // Použijeme EntraID jako user ID
      username: msUsername,
      entra_id: account.homeAccountId,
      upn: account.username,
      email: account.username,
      name: account.name || msUsername,
      auth_source: 'entra_id',
      // Další data z account
      localAccountId: account.localAccountId,
      environment: account.environment,
      tenantId: account.tenantId
    };
    
    console.log('🟣 SERVER: ✅ User created from Entra data');

    // Vytvoř session s uživatelskými daty
    console.log('🟣 SERVER: Creating session for user:', user.username);
    const sessionId = await authService.createSession(
      user,
      {
        accessToken,
        idToken,
        expiresIn: Math.floor((expiresOn - Date.now()) / 1000)
      },
      req.ip,
      req.get('user-agent')
    );
    console.log('🟣 SERVER: ✅ Session created:', sessionId);

    // Log úspěšného přihlášení (bez user_id, protože není v DB)
    await authService.logAuthEvent(
      null, // user_id je null, protože neověřujeme DB
      account.username,
      'login_success',
      'entra_id',
      req.ip,
      req.get('user-agent')
    );

    // Nastav session cookie
    res.cookie('erdms_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hodin
    });
    console.log('🟣 SERVER: ✅ Cookie set');

    // Redirect zpět na klienta
    const redirectUrl = `${process.env.CLIENT_URL}/dashboard`;
    console.log('🟣 SERVER: 🚀 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
});

/**
 * POST /auth/logout
 * Odhlásí uživatele
 */
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies.erdms_session;
    
    if (sessionId) {
      const session = await authService.findSession(sessionId);
      
      if (session) {
        // Log odhlášení
        await authService.logAuthEvent(
          session.user_id,
          session.username,
          'logout',
          'entra_id',
          req.ip,
          req.get('user-agent')
        );
        
        // Smaž session
        await authService.deleteSession(sessionId);
      }
    }

    // Smaž cookie
    res.clearCookie('erdms_session');

    // Microsoft Entra logout URL
    // Použijeme GET s parametrem post_logout_redirect_uri
    const logoutUrl = `${msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_REDIRECT_URI)}`;
    
    res.json({ success: true, logoutUrl });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /auth/me
 * Vrátí info o přihlášeném uživateli + data z EntraID
 */
router.get('/me', async (req, res) => {
  try {
    const sessionId = req.cookies.erdms_session;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = await authService.findSession(sessionId);
    
    if (!session) {
      res.clearCookie('erdms_session');
      return res.status(401).json({ error: 'Session not found' });
    }

    // Aktualizuj aktivitu
    await authService.updateSessionActivity(sessionId);

    // Základní data ze session (Entra ID)
    const userData = {
      id: session.userId,
      username: session.username,
      email: session.email,
      name: session.name,
      upn: session.upn,
      entra_id: session.entra_id,
      auth_source: session.auth_source,
      tenantId: session.tenantId
    };

    // Pokud je přihlášen přes EntraID, stáhni aktuální data z Graph API
    if (session.auth_source === 'entra_id' && session.entra_access_token) {
      console.log('📊 Fetching Graph API data for user:', session.username);
      try {
        // Základní profil (včetně department, companyName, city)
        const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,mobilePhone,businessPhones,companyName,city,accountEnabled', {
          headers: {
            'Authorization': `Bearer ${session.entra_access_token}`,
          },
        });

        console.log('📊 Graph API response status:', graphResponse.status);

        if (graphResponse.ok) {
          const graphData = await graphResponse.json();
          console.log('✅ Graph API data loaded:', Object.keys(graphData));
          userData.entraData = graphData;
          
          // Mapuj Graph API data na běžná pole pro kompatibilitu
          userData.jmeno = graphData.givenName || '';
          userData.prijmeni = graphData.surname || '';
          userData.displayName = graphData.displayName || '';
          userData.jobTitle = graphData.jobTitle || '';
          userData.department = graphData.department || '';
          userData.telefon = graphData.mobilePhone || graphData.businessPhones?.[0] || '';
          userData.officeLocation = graphData.officeLocation || '';

          // Pokus o získání skupin
          try {
            const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
              headers: {
                'Authorization': `Bearer ${session.entra_access_token}`,
              },
            });
            if (groupsResponse.ok) {
              const groupsData = await groupsResponse.json();
              userData.entraData.memberOf = groupsData.value;
            }
          } catch (e) {
            console.log('Groups not available');
          }

          // Pokus o získání manažera
          try {
            const managerResponse = await fetch('https://graph.microsoft.com/v1.0/me/manager', {
              headers: {
                'Authorization': `Bearer ${session.entra_access_token}`,
              },
            });
            if (managerResponse.ok) {
              const managerData = await managerResponse.json();
              userData.entraData.manager = managerData;
            }
          } catch (e) {
            console.log('Manager not available:', e.message);
          }
        } else {
          const errorText = await graphResponse.text();
          console.error('❌ Graph API error:', graphResponse.status, errorText);
        }
      } catch (graphError) {
        console.error('❌ Failed to fetch Graph API data:', graphError);
        // Pokračuj bez EntraID dat
      }
    } else {
      console.log('⚠️ No Entra token available. auth_source:', session.auth_source, 'has_token:', !!session.entra_access_token);
    }

    res.json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;
