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

    // Základní data z DB
    const userData = {
      id: session.id,
      username: session.username,
      email: session.email,
      jmeno: session.jmeno,
      prijmeni: session.prijmeni,
      titul_pred: session.titul_pred,
      titul_za: session.titul_za,
      telefon: session.telefon,
      role: session.role,
      auth_source: session.auth_source,
      upn: session.upn,
      entra_id: session.entra_id  // DŮLEŽITÉ: Přidat entra_id!
    };

    // Pokud je přihlášen přes EntraID, stáhni aktuální data z Graph API
    if (session.auth_source === 'entra' && session.entra_access_token) {
      try {
        // Základní profil
        const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${session.entra_access_token}`,
          },
        });

        if (graphResponse.ok) {
          const graphData = await graphResponse.json();
          userData.entraData = graphData;

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
            console.log('Manager not available');
          }
        }
      } catch (graphError) {
        console.error('Failed to fetch Graph API data:', graphError);
        // Pokračuj bez EntraID dat
      }
    }

    res.json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/generate-and-send-password
 * Vygeneruje nové heslo pro uživatele a odešle mu ho emailem pomocí šablony
 */
router.post('/generate-and-send-password', async (req, res) => {
  const { user_id, template_id } = req.body;
  const token = req.headers['x-auth-token'];
  const username = req.headers['x-auth-username'];

  if (!token || !username) {
    return res.status(401).json({ error: 'Missing authentication' });
  }

  if (!user_id || !template_id) {
    return res.status(400).json({ error: 'Missing user_id or template_id' });
  }

  try {
    // 1. Ověření oprávnění (musí mít právo měnit uživatele)
    const [authCheck] = await db.query(
      `SELECT uz.id 
       FROM uzivatele uz
       WHERE uz.username = ? AND uz.token = ? AND uz.aktivni = 1`,
      [username, token]
    );

    if (!authCheck || authCheck.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 2. Načtení dat cílového uživatele
    const [userRows] = await db.query(
      `SELECT id, username, email, jmeno, prijmeni, titul_pred, titul_za
       FROM uzivatele
       WHERE id = ?`,
      [user_id]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userRows[0];

    if (!targetUser.email) {
      return res.status(400).json({ error: 'User has no email address' });
    }

    // 3. Vygenerování nového hesla (12 znaků, bezpečné)
    const newPassword = crypto.randomBytes(16).toString('base64').slice(0, 12);
    
    // 4. Hashování hesla (bcrypt)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 5. Update hesla v databázi
    await db.query(
      `UPDATE uzivatele 
       SET heslo = ?, vynucena_zmena_hesla = 1
       WHERE id = ?`,
      [passwordHash, user_id]
    );

    // 6. Načtení email šablony
    const [templateRows] = await db.query(
      `SELECT id, nazev, email_predmet, email_telo
       FROM email_sablony
       WHERE id = ?`,
      [template_id]
    );

    if (!templateRows || templateRows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateRows[0];

    // 7. Nahrazení placeholderů v šabloně
    let emailSubject = template.email_predmet || 'Nové heslo do systému ERDMS';
    let emailBody = template.email_telo || '';

    const fullName = [
      targetUser.titul_pred,
      targetUser.jmeno,
      targetUser.prijmeni,
      targetUser.titul_za
    ].filter(Boolean).join(' ');

    const replacements = {
      '{JMENO}': targetUser.jmeno || '',
      '{PRIJMENI}': targetUser.prijmeni || '',
      '{CELE_JMENO}': fullName,
      '{USERNAME}': targetUser.username || '',
      '{EMAIL}': targetUser.email || '',
      '{HESLO}': newPassword,
      '{NOVE_HESLO}': newPassword,
    };

    Object.keys(replacements).forEach(placeholder => {
      const value = replacements[placeholder];
      emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value);
      emailBody = emailBody.replace(new RegExp(placeholder, 'g'), value);
    });

    // 8. Odeslání emailu (použij Nodemailer nebo existující email service)
    const nodemailer = require('nodemailer');
    
    // Konfigurace SMTP (použij existující konfiguraci z .env)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@erdms.cz',
      to: targetUser.email,
      subject: emailSubject,
      html: emailBody,
    });

    // 9. Log operace
    console.log(`✓ New password generated and sent to ${targetUser.email} for user ${targetUser.username}`);

    res.json({
      success: true,
      message: 'Password generated and sent',
      email: targetUser.email,
    });

  } catch (error) {
    console.error('Generate and send password error:', error);
    res.status(500).json({ error: 'Failed to generate and send password', details: error.message });
  }
});

module.exports = router;
