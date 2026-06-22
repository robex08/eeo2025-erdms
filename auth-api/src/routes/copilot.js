const express = require('express');
const router = express.Router();
const entraService = require('../services/entraService');
const authService = require('../services/authService');

/**
 * Copilot API Routes
 * - Check license
 * - Chat with Copilot
 * 
 * DŮLEŽITÉ: Všechny endpointy vyžadují aktivní session (cookie-based)
 * LAST UPDATE: 2026-06-22 11:26:30 - Groups-based license check
 */

console.log('🚀 Copilot routes loaded at:', new Date().toISOString());

/**
 * Helper: Ověření Copilot licence přes Entra groups (M365-License-Copilot)
 * @param {string} accessToken - Entra access token
 * @returns {Promise<boolean>}
 */
async function checkCopilotLicenseViaGroups(accessToken) {
  try {
    const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!groupsResponse.ok) {
      console.log('⚠️ Failed to fetch groups:', groupsResponse.status);
      return false;
    }
    
    const groupsData = await groupsResponse.json();
    const groups = groupsData.value || [];
    
    const copilotGroup = groups.find(g => 
      g.displayName && g.displayName === 'M365-License-Copilot'
    );
    
    return !!copilotGroup;
  } catch (error) {
    console.error('🔴 Error checking license via groups:', error);
    return false;
  }
}

/**
 * GET /api/copilot/check-license
 * Ověření zda má uživatel Microsoft Copilot Business licenci
 */
router.get('/check-license', async (req, res) => {
  try {
    // NO CACHE - musí se volat pokaždé
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    res.removeHeader('ETag'); // Zakázat ETag
    
    // 1. Získat session z cookie (stejně jako /auth/me)
    const sessionId = req.cookies.erdms_session;
    
    console.log('🔍 /api/copilot/check-license called');
    console.log('   - All cookies:', req.cookies);
    console.log('   - erdms_session:', sessionId);
    
    if (!sessionId) {
      console.log('⚠️ Check license: No erdms_session cookie');
      return res.json({ hasLicense: false, reason: 'no_session' });
    }
    
    const session = await authService.findSession(sessionId);
    
    console.log('   - Session from DB:', session ? 'found' : 'NOT FOUND');
    if (session) {
      console.log('   - Session.username:', session.username);
      console.log('   - Session.entra_id:', session.entra_id);
      console.log('   - Session.auth_source:', session.auth_source);
    }
    
    if (!session) {
      console.log('⚠️ Check license: Session not found in DB');
      return res.json({ hasLicense: false, reason: 'session_not_found' });
    }
    
    if (!session.entra_id || !session.entra_access_token) {
      console.log('⚠️ Check license: No Entra ID or access token in session');
      return res.json({ hasLicense: false, reason: 'no_entra_data' });
    }
    
    console.log(`🔍 Checking Copilot license for user ${session.username} via groups`);
    
    // 2. Zjistit licenci z Entra groups (jako Dashboard)
    // Hledáme skupinu M365-License-Copilot
    try {
      const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
        headers: {
          'Authorization': `Bearer ${session.entra_access_token}`,
        },
      });
      
      if (!groupsResponse.ok) {
        console.log('⚠️ Failed to fetch groups:', groupsResponse.status);
        return res.json({ hasLicense: false, reason: 'groups_fetch_failed' });
      }
      
      const groupsData = await groupsResponse.json();
      const groups = groupsData.value || [];
      
      console.log(`📋 User has ${groups.length} groups`);
      
      // Hledat M365-License-Copilot skupinu
      const copilotGroup = groups.find(g => 
        g.displayName && g.displayName === 'M365-License-Copilot'
      );
      
      const hasLicense = !!copilotGroup;
      
      if (copilotGroup) {
        console.log(`✅ Found Copilot license group: ${copilotGroup.displayName}`);
      } else {
        console.log('❌ Copilot license group not found');
        // Debug: vypsat všechny M365-License skupiny
        const m365Groups = groups.filter(g => g.displayName && g.displayName.startsWith('M365-License'));
        console.log('   M365 groups:', m365Groups.map(g => g.displayName).join(', '));
      }
      
      console.log(`🎯 License check result: ${hasLicense}`);
      
      res.json({ 
        hasLicense,
        userId: session.username,
        userName: session.name || session.username,
        timestamp: new Date().toISOString() // Dynamický timestamp pro cache busting
      });
      
    } catch (error) {
      console.error('🔴 Error fetching groups:', error);
      return res.json({ hasLicense: false, reason: 'error', error: error.message });
    }
    
  } catch (error) {
    console.error('🔴 Check license error:', error);
    res.json({ 
      hasLicense: false, 
      reason: 'error',
      error: error.message 
    });
  }
});

/**
 * POST /api/copilot/chat
 * Odeslat zprávu Copilotovi a získat odpověď
 * 
 * Body: {
 *   message: string,
 *   conversationId?: string,
 *   context?: object
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    // 1. Validace vstupu
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({ 
        success: false,
        error: 'Message too long (max 2000 characters)' 
      });
    }
    
    // 2. Získat session z cookie
    const sessionId = req.cookies.erdms_session;
    
    if (!sessionId) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }
    
    const session = await authService.findSession(sessionId);
    
    if (!session || !session.entra_access_token) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }
    
    console.log(`💬 Copilot chat request from user ${session.username}: "${message.substring(0, 50)}..."`);
    
    // 3. Ověření Copilot licence (přes groups)
    const hasLicense = await checkCopilotLicenseViaGroups(session.entra_access_token);
    
    if (!hasLicense) {
      console.log('⚠️ User does not have Copilot license');
      return res.status(403).json({ 
        success: false,
        error: 'Copilot license required',
        message: 'Nemáte přiřazenou licenci Microsoft Copilot Business. Pro použití této funkce kontaktujte IT oddělení.'
      });
    }
    
    console.log('✅ User has Copilot license, processing request...');
    
    // 4. Zavolat Copilot API
    // TODO: Implementace integrace s Microsoft Copilot API
    // Pro MVP: mock response nebo Azure OpenAI fallback
    
    const response = await callCopilotAPI(message, {
      userId: session.username,
      userName: session.name || session.username,
      conversationId: conversationId,
      accessToken: session.entra_access_token
    });
    
    res.json({
      success: true,
      response: response.message,
      conversationId: response.conversationId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔴 Copilot chat error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process request',
      message: 'Nepodařilo se zpracovat Váš dotaz. Zkuste to prosím znovu.'
    });
  }
});

/**
 * Volání Microsoft Copilot API
 * @param {string} message - Zpráva od uživatele
 * @param {object} context - Kontext (userId, conversationId, accessToken)
 * @returns {Promise<{message: string, conversationId: string}>}
 */
async function callCopilotAPI(message, context) {
  // TODO: Implementace integrace s Microsoft Copilot API
  // Možnosti:
  // 1. Microsoft Copilot for Microsoft 365 API (pokud je dostupné)
  // 2. Azure OpenAI Service (fallback)
  // 3. Mock response (pro testování)
  
  console.log('🤖 Calling Copilot API...');
  
  // MVP: Mock response pro testování
  // DŮLEŽITÉ: Nahradit skutečnou integrací!
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        message: `[MOCK RESPONSE] Děkuji za Vaši zprávu: "${message}". Toto je testovací odpověď. Reálná integrace s Microsoft Copilotem bude implementována v další fázi.`,
        conversationId: context.conversationId || generateConversationId()
      });
    }, 1000); // Simulace API latence
  });
  
  // REAL IMPLEMENTATION (placeholder):
  /*
  try {
    const response = await fetch('https://api.copilot.microsoft.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        conversationId: context.conversationId,
        userId: context.userId
      })
    });
    
    const data = await response.json();
    return {
      message: data.response,
      conversationId: data.conversationId
    };
  } catch (err) {
    console.error('Copilot API error:', err);
    throw err;
  }
  */
}

/**
 * Generovat nové conversation ID
 */
function generateConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;
