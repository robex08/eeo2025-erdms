# 🤖 Microsoft Copilot Integration - MVP Implementation Plan

**Date:** 2026-06-22  
**Status:** 🚧 In Progress  
**Goal:** Integrate Microsoft Copilot chat into ERDMS Dashboard for licensed users

---

## 📋 Scope & Requirements

### ✅ What We're Building
- Copilot chat widget in ERDMS Dashboard header
- Available ONLY for users with Microsoft Copilot Business license
- General AI assistant (NO EEO data integration)
- Clean, modern UI matching ERDMS design

### ❌ Out of Scope (MVP)
- No EEO data integration
- No access to orders/contracts
- No custom business logic
- No mobile app integration

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  ERDMS Dashboard (React)                    │
│  ┌──────────────────┐                       │
│  │ CopilotWidget    │ ←─ 💬 Icon in header │
│  │ ┌──────────────┐ │                       │
│  │ │ Chat UI      │ │                       │
│  │ │ - Input      │ │                       │
│  │ │ - Messages   │ │                       │
│  │ └──────────────┘ │                       │
│  └────────┬─────────┘                       │
└───────────┼─────────────────────────────────┘
            │ POST /api/copilot/chat
            │ Authorization: Bearer token
            ↓
┌─────────────────────────────────────────────┐
│  Auth API (Node.js)                         │
│  ┌──────────────────────────────┐           │
│  │ copilotRoutes.js             │           │
│  │ 1. Verify session            │           │
│  │ 2. Check Copilot license  ──→│─ MS Graph│
│  │ 3. Forward to Copilot API    │           │
│  └──────────────────────────────┘           │
└───────────┼─────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────┐
│  Microsoft Copilot / Azure OpenAI           │
│  - Process query                            │
│  - Return response                          │
└─────────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### Phase 1: Backend - License Check (Day 1)

**File:** `/var/www/erdms-dev/auth-api/src/services/entraService.js`

```javascript
/**
 * Check if user has Microsoft Copilot Business license
 * @param {string} userId - Entra ID (GUID)
 * @returns {boolean}
 */
async hasCopilotLicense(userId) {
  await this.ensureInitialized();
  try {
    const response = await this.client
      .api(`/users/${userId}/licenseDetails`)
      .get();
    
    const licenses = response.value || [];
    
    // Check for Copilot Business SKU
    return licenses.some(l => 
      l.skuPartNumber === 'MICROSOFT_365_COPILOT' ||
      l.skuPartNumber === 'COPILOT_BUSINESS' ||
      l.servicePlans?.some(sp => 
        sp.servicePlanName?.includes('COPILOT')
      )
    );
  } catch (err) {
    console.error('🔴 hasCopilotLicense ERROR:', err.message);
    return false;
  }
}
```

---

### Phase 2: Backend - Copilot API Routes (Day 2)

**New File:** `/var/www/erdms-dev/auth-api/src/routes/copilot.js`

```javascript
const express = require('express');
const router = express.Router();

/**
 * POST /api/copilot/chat
 * Send message to Copilot
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const session = req.session;
    
    // 1. Verify session
    if (!session?.user_id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // 2. Check Copilot license
    const entraService = require('../services/entraService');
    const hasLicense = await entraService.hasCopilotLicense(
      session.entra_user_id
    );
    
    if (!hasLicense) {
      return res.status(403).json({ 
        error: 'Copilot license required',
        message: 'Nemáte přiřazenou licenci Microsoft Copilot Business'
      });
    }
    
    // 3. Forward to Copilot API (TODO: Microsoft API integration)
    // For MVP: Mock response or OpenAI fallback
    const response = await callCopilotAPI(message, session.entra_access_token);
    
    res.json({
      success: true,
      response: response,
      conversationId: conversationId || generateConversationId()
    });
    
  } catch (error) {
    console.error('Copilot chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * GET /api/copilot/check-license
 * Check if current user has Copilot license
 */
router.get('/check-license', async (req, res) => {
  try {
    const session = req.session;
    
    if (!session?.user_id || !session?.entra_user_id) {
      return res.json({ hasLicense: false });
    }
    
    const entraService = require('../services/entraService');
    const hasLicense = await entraService.hasCopilotLicense(
      session.entra_user_id
    );
    
    res.json({ hasLicense });
    
  } catch (error) {
    console.error('Check license error:', error);
    res.json({ hasLicense: false });
  }
});

module.exports = router;
```

---

### Phase 3: Frontend - React Component (Day 3-4)

**New File:** `/var/www/erdms-dev/dashboard/src/components/CopilotWidget.jsx`

```jsx
import { useState, useEffect } from 'react';
import './CopilotWidget.css';

function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const response = await fetch('/api/copilot/check-license', {
        credentials: 'include'
      });
      const data = await response.json();
      setHasLicense(data.hasLicense);
    } catch (err) {
      console.error('Failed to check license:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: input })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'error',
          content: data.message || 'Chyba při komunikaci s Copilotem'
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Nepodařilo se odeslat zprávu'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no license
  if (!hasLicense) return null;

  return (
    <>
      {/* Chat icon in header */}
      <button 
        className="copilot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Copilot Chat"
      >
        💬
      </button>

      {/* Chat modal */}
      {isOpen && (
        <div className="copilot-modal">
          <div className="copilot-header">
            <h3>🤖 Microsoft Copilot</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="copilot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="message loading">Píšu...</div>}
          </div>
          
          <div className="copilot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Zeptejte se Copilota..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              Odeslat
            </button>
          </div>
          
          <div className="copilot-footer">
            <small>Powered by Microsoft Copilot</small>
          </div>
        </div>
      )}
    </>
  );
}

export default CopilotWidget;
```

---

### Phase 4: Integration & Testing (Day 5)

1. **Add to Dashboard:**
   - Import CopilotWidget in Dashboard.jsx
   - Place icon next to calendar (📅 → 💬)

2. **Test scenarios:**
   - ✅ User with Copilot license → widget visible
   - ✅ User without license → widget hidden
   - ✅ Chat functionality works
   - ✅ Error handling
   - ✅ Loading states

3. **Deploy:**
   - Test on dev
   - Deploy to production

---

## 🔍 Research Needed

### Microsoft Copilot API
- [ ] Check if Microsoft Copilot Chat API is available
- [ ] Request API access from Microsoft
- [ ] Verify SKU names for Copilot Business license
- [ ] Check rate limits and pricing

### Alternative: Azure OpenAI (Fallback)
If Microsoft Copilot API is not available:
- Use Azure OpenAI Service
- GPT-4 model
- Requires separate Azure OpenAI resource

---

## 📊 License Detection

### Method 1: MS Graph API (Primary)
```
GET https://graph.microsoft.com/v1.0/users/{id}/licenseDetails
```

**Expected SKU names:**
- `MICROSOFT_365_COPILOT`
- `COPILOT_BUSINESS`
- `M365_COPILOT`

### Method 2: Token Claims (Fallback)
Check if token contains Copilot role/claim

---

## 🎨 UI/UX Design

### Header Icon
```
[📅 Calendar] [💬 Copilot] [👤 Profile]
```

### Chat Modal
- Modern, clean design
- ERDMS color scheme
- Responsive
- Smooth animations
- Clear error messages

---

## ⚠️ Error Handling

| Scenario | Response | UI Message |
|----------|----------|------------|
| No license | 403 | "Nemáte licenci Copilot Business" |
| API error | 500 | "Služba momentálně není dostupná" |
| Network error | - | "Nelze se připojit k serveru" |
| Rate limit | 429 | "Příliš mnoho dotazů, zkuste později" |

---

## 🔒 Security

- ✅ Session verification required
- ✅ License check on every request
- ✅ No data persistence (GDPR compliant)
- ✅ HTTPS only
- ✅ CORS properly configured

---

## 📝 TODO List

### Backend
- [ ] Add `hasCopilotLicense()` to EntraService
- [ ] Create `/api/copilot/chat` endpoint
- [ ] Create `/api/copilot/check-license` endpoint
- [ ] Implement Copilot API integration (or mock)
- [ ] Add error handling
- [ ] Add rate limiting

### Frontend
- [ ] Create CopilotWidget component
- [ ] Create CopilotWidget CSS
- [ ] Integrate into Dashboard header
- [ ] Add loading states
- [ ] Add error messages
- [ ] Test responsive design

### Testing
- [ ] Test license check
- [ ] Test chat functionality
- [ ] Test error scenarios
- [ ] Test with/without license
- [ ] Performance testing

### Deployment
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor logs
- [ ] Collect user feedback

---

## 📈 Success Metrics

- ✅ Widget loads only for licensed users
- ✅ Response time < 3 seconds
- ✅ Zero unauthorized access
- ✅ Error rate < 1%
- ✅ User satisfaction > 4/5

---

## 🚀 Launch Plan

1. **Soft launch:** Enable for u03924 (you) only
2. **Beta:** Enable for IT team
3. **Full launch:** Enable for all licensed users
4. **Monitoring:** Track usage and errors

---

**Next Steps:** Start with Phase 1 - Backend License Check
