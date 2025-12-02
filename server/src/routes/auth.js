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
    
    // TEST: Rychlý DB test před hlavní query
    console.log('🟣 SERVER: Testing DB connection...');
    try {
      const testResult = await db.query('SELECT 1 as test');
      console.log('🟣 SERVER: ✅ DB connection OK, test result:', testResult[0][0]);
    } catch (testErr) {
      console.error('🔴 SERVER: ❌ DB test FAILED:', testErr.message);
    }
    
    // Najdi nebo synchronizuj uživatele
    // NEJDŘÍV podle username (rychlé), pak teprve podle EntraID
    console.log('🟣 SERVER: Looking for user by username:', msUsername);
    let user = await authService.findUserByUsername(msUsername);
    
    if (!user) {
      // Zkus ještě podle EntraID (pro případ že už byl synchronizován)
      console.log('🟣 SERVER: User not found by username, trying EntraID:', account.homeAccountId);
      user = await authService.findUserByEntraId(account.homeAccountId);
    }
    
    if (user) {
      console.log('🟣 SERVER: ✅ User found:', user.username, 'ID:', user.id);
      
      // Pokud uživatel nemá EntraID nebo je jiné, synchronizuj
      if (!user.entra_id || user.entra_id !== account.homeAccountId) {
        console.log('🟣 SERVER: Syncing with EntraID...');
        await authService.syncUserWithEntra(user.id, {
          id: account.homeAccountId,
          userPrincipalName: account.username
        });
        console.log('🟣 SERVER: ✅ EntraID sync completed');
      } else {
        console.log('🟣 SERVER: EntraID already synced');
      }
    } else {
      console.error('🔴 SERVER: ❌ User NOT found in database!');
      console.error('🔴 SERVER: Tried username:', msUsername);
      console.error('🔴 SERVER: Tried EntraID:', account.homeAccountId);
      // Uživatel neexistuje v databázi
      await authService.logAuthEvent(
        null,
        account.username,
        'login_failed',
        'entra_id',
        req.ip,
        req.get('user-agent'),
        'User not found in database'
      );
      return res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
    }

    // Vytvoř session
    console.log('🟣 SERVER: Creating session for user:', user.username);
    const sessionId = await authService.createSession(
      user.id,
      {
        accessToken,
        idToken,
        expiresIn: Math.floor((expiresOn - Date.now()) / 1000)
      },
      req.ip,
      req.get('user-agent')
    );
    console.log('🟣 SERVER: ✅ Session created:', sessionId);

    // Log úspěšného přihlášení
    await authService.logAuthEvent(
      user.id,
      user.username,
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

    // Microsoft logout URL
    const logoutUrl = `${msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_REDIRECT_URI)}`;
    
    res.json({ logoutUrl });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /auth/me
 * Vrátí info o přihlášeném uživateli
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

    // Vrať uživatelská data (bez tokenů a hesel)
    res.json({
      id: session.id,
      username: session.username,
      email: session.email,
      jmeno: session.jmeno,
      prijmeni: session.prijmeni,
      titul_pred: session.titul_pred,
      titul_za: session.titul_za,
      role: session.role,
      auth_source: session.auth_source
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;
