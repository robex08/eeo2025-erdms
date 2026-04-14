
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff, ArrowLeft, Home, Phone } from 'lucide-react';
import MD5 from 'crypto-js/md5';
import ForcePasswordChangeDialog from '../components/ForcePasswordChangeDialog';
import { saveAuthData, loadAuthData } from '../utils/authStorage';

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');
// Relativní cesta - webpack dev server proxy to přesměruje na https://erdms.zachranka.cz/auth
const CENTRAL_AUTH_URL = '/auth';

// Modern animations
const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Emotion styled komponenty mimo funkci Login
const Wrapper = styled.div`
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  height: 100dvh; /* avoid mobile browser UI issues */
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden; /* no outer scrollbars for login */

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const Container = styled.div`
  background: white;
  border-radius: 15px; /* změnšeno z 20px */
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1); /* změnšeno z 20px 40px */
  overflow: hidden;
  /* Zmenšeno o 25% */
  width: min(378px, 50vw); /* změnšeno z 504px */
  min-height: 155px; /* změnšeno z 206px */
  animation: ${slideInUp} 0.6s ease-out;
  border: 1px solid #e2e8f0;

  @media (max-width: 768px) {
    width: 64vw;
    min-height: 191px; /* změnšeno z 255px */
  }
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  padding: 0.94rem 1.13rem; /* změnšeno o 25% z 1.25rem 1.5rem */
  text-align: center;
`;

const Title = styled.h1`
  margin: 0 0 0.26rem 0; /* změnšeno z 0.35rem */
  font-size: 1.4rem; /* mírně změnšeno z 1.65rem pro čitelnost */
  font-weight: 700;
  position: relative;
  z-index: 1;
`;

const Subtitle = styled.p`
  margin: 0;
  opacity: 0.9;
  font-size: 0.85rem; /* mírně změnšeno z 0.95rem */
  position: relative;
  z-index: 1;
`;

const CardBody = styled.div`
  padding: 0.94rem 1.13rem 1.13rem; /* změnšeno o 25% */
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.13rem; /* změnšeno z 1.5rem */
`;

const InputGroup = styled.div`
  margin-bottom: 0.75rem; /* změnšeno z 1rem */
  position: relative;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 0.3rem; /* změnšeno z 0.4rem */
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem; /* mírně změnšeno z 0.85rem */
`;

const InputWrapper = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 0.75rem; /* změnšeno z 1rem */
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;

  &:hover {
    color: #667eea;
  }

  &:focus {
    outline: none;
    color: #667eea;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.59rem 0.68rem 0.59rem 2.5rem; /* sladeno s OrderForm25.js - zvětšen padding-left */
  border: 2px solid #e5e7eb;
  border-radius: 8px; /* změnšeno z 10px */
  font-size: 0.95rem; /* mírně změnšeno z 1rem pro čitelnost */
  transition: all 0.2s ease;
  background: #ffffff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const PasswordInput = styled(Input)`
  padding-right: 2.5rem; /* Extra prostor pro toggle ikonu */
`;

const Button = styled.button`
  width: 100%;
  padding: 0.94rem; /* změnšeno z 1.25rem */
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 9px; /* změnšeno z 12px */
  font-size: 1.05rem; /* mírně změnšeno z 1.1rem */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem; /* změnšeno z 0.5rem */
  margin-top: 1.5rem; /* změnšeno z 2rem */

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  ${css`animation: ${spinAnimation} 1s linear infinite;`}
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem; /* zmenšeno z 1rem */
  border-radius: 6px; /* zmenšeno z 8px */
  margin-top: 0.75rem; /* zmenšeno z 1rem */
  display: flex;
  align-items: center;
  gap: 0.38rem; /* zmenšeno z 0.5rem */
  font-size: 0.8rem; /* mírně zmenšeno z 0.875rem */
`;

// === AccessDenied stránka - znovupoužívá styly login karty ===
const AccessDeniedCard = styled(Container)`
  border: 1px solid #fecaca;
`;

const AccessDeniedHeader = styled(CardHeader)`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 70%, #991b1b 100%);
`;

const AccessDeniedMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  color: #991b1b;
  font-size: 0.85rem;
  line-height: 1.5;
  text-align: center;
`;

const AccessDeniedButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
`;

const AccessDeniedBtn = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-radius: 9px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const BtnPrimary = styled(AccessDeniedBtn)`
  background: #f0f4ff;
  color: #1e40af;
  border: 2px solid #3b82f6;

  &:hover {
    background: #dbeafe;
  }
`;

const BtnSecondary = styled(AccessDeniedBtn)`
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;

  &:hover {
    background: #e2e8f0;
  }
`;

const SupportSection = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
`;

const SupportTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SupportContact = styled.div`
  font-size: 0.85rem;
  color: #334155;
  font-weight: 600;
  margin-bottom: 0.2rem;
`;

const SupportPhone = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 500;
  margin: 0.1rem 0;

  &:hover {
    text-decoration: underline;
  }
`;

const SupportHotline = styled.div`
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 0.2rem;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0 1rem 0;
  color: #9ca3af;
  font-size: 0.875rem;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e5e7eb;
  }
  
  &::before {
    margin-right: 0.75rem;
  }
  
  &::after {
    margin-left: 0.75rem;
  }
`;

const EntraButton = styled.button`
  width: 100%;
  padding: 0.94rem;
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
  border-radius: 9px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.75rem;

  &:hover {
    border-color: #667eea;
    background: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const MicrosoftIcon = () => (
  <svg viewBox="0 0 23 23" fill="none">
    <rect width="11" height="11" fill="#F25022"/>
    <rect y="12" width="11" height="11" fill="#00A4EF"/>
    <rect x="12" width="11" height="11" fill="#7FBA00"/>
    <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
  </svg>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, needsPasswordChange } = useContext(AuthContext);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  
  // EntraID authentication states
  const [authConfig, setAuthConfig] = useState(null);
  const [loadingAuthConfig, setLoadingAuthConfig] = useState(true);
  const [entraLoading, setEntraLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(null); // { message: string } nebo null
  // 🔐 Pokud se vracíme z Microsoft přihlašování, OKAMŽitě zobrazit loading (ne login formulář)
  const [ssoInProgress, setSsoInProgress] = useState(
    () => sessionStorage.getItem('entra_login_pending') === '1'
  );

  // Load authentication configuration on mount
  useEffect(() => {
    const loadAuthConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/v2.0/system/auth-config`);
        if (response.ok) {
          const data = await response.json();
          setAuthConfig(data);
        }
      } catch (error) {
        console.error('Failed to load auth config:', error);
      } finally {
        setLoadingAuthConfig(false);
      }
    };
    
    loadAuthConfig();
  }, []);

  // 🔄 Reset entraLoading pokud se uživatel vrátí přes Back (bfcache)
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted) {
        setEntraLoading(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);
  
  // ============================================================
  // 🔐 SSO CHECK - automatické přihlášení přes EntraID session
  // ============================================================
  // Spouští se POUZE ve 2 případech:
  //   1) ?sso=auto v URL → příchod z ERDMS Dashboardu
  //   2) entra_login_pending v sessionStorage → návrat po kliknutí na M365 tlačítko
  // NIKDY se nespouští: po odhlášení, po refreshi, při přímém přístupu na URL
  // ============================================================
  useEffect(() => {
    // Zjisti, jestli existuje trigger pro SSO check
    const urlParams = new URLSearchParams(window.location.search);
    const ssoFromDashboard = urlParams.get('sso') === 'auto';
    const ssoFromM365Click = sessionStorage.getItem('entra_login_pending') === '1';
    const hasTrigger = ssoFromDashboard || ssoFromM365Click;

    // Žádný trigger → nic nedělej (odhlášení, refresh, přímý přístup)
    if (!hasTrigger) {
      return;
    }

    // Trigger existuje, ale authConfig ještě není načtený → POČKEJ (effect se spustí znovu)
    if (!authConfig) {
      console.log('🔍 SSO check: trigger found, waiting for authConfig...');
      return;
    }

    // authConfig načtený ale EntraID není povolená → vyčisti triggery a skonči
    if (authConfig.entra_enabled !== '1' || authConfig.auth_mode === 'local_only') {
      console.log('🔍 SSO check: EntraID is disabled in config, skipping');
      if (ssoFromDashboard) {
        urlParams.delete('sso');
        const cleanUrl = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
      sessionStorage.removeItem('entra_login_pending');
      return;
    }

    // Vše ready → spusť SSO check
    const runSsoCheck = async () => {
      console.log('🔍 SSO check: Running...', { ssoFromDashboard, ssoFromM365Click });

      // Vyčisti triggery TĚSNĚ PŘED provedením (authConfig je ready, check poběží)
      if (ssoFromDashboard) {
        urlParams.delete('sso');
        const cleanUrl = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
      sessionStorage.removeItem('entra_login_pending');

      // Pokud už máme token, přesměruj do aplikace (prevence infinite loop)
      const existingToken = await loadAuthData.token();
      if (existingToken) {
        console.log('🔍 SSO check: Already have token, redirecting to app...');
        const homepage = process.env.PUBLIC_URL || '/dev/eeo-v2';
        window.location.href = homepage;
        return;
      }

      // Zkontroluj existující EntraID session na auth-api
      try {
        console.log('🔍 SSO check: Fetching /auth/me...');
        const response = await fetch(`${CENTRAL_AUTH_URL}/me`, {
          credentials: 'include'
        });

        if (response.ok) {
          const sessionData = await response.json();
          console.log('🔍 SSO check: Active session found for:', sessionData.username);
          // Session existuje → zkus přihlásit do EEO
          await handleEntraCallback(sessionData);
        } else {
          console.log('🔍 SSO check: No active EntraID session (status:', response.status, ')');
          setSsoInProgress(false);
          // Žádná session → zobraz normální login stránku
        }
      } catch (err) {
        console.error('🔍 SSO check: Error checking session:', err);
        setSsoInProgress(false);
        // Chyba → zobraz normální login stránku
      }
    };

    runSsoCheck();
  }, [authConfig]);
  
  // Handle EntraID callback after successful authentication
  const handleEntraCallback = async (sessionData) => {
    console.log('🔐 EntraID callback: Processing login...', sessionData.username);
    setEntraLoading(true);
    
    try {
      // Call EEO backend to process EntraID login
      console.log('🔐 EntraID callback: Calling EEO backend /auth/entra-callback');
      const response = await fetch(`${API_BASE_URL}/v2.0/auth/entra-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Forward session cookies
        body: JSON.stringify({
          session_data: sessionData
        })
      });
      
      console.log('🔐 EntraID callback: Backend response:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('🔐 EntraID callback: Backend error:', error);
        throw new Error(error.message || 'EntraID přihlášení selhalo');
      }
      
      const userData = await response.json();
      console.log('🔐 EntraID callback: User data received:', userData.username);
      
      // 🔐 Zajistit, že auth_method je vždy nastaven pro EntraID přihlášení
      userData.auth_method = 'entra_id';

      // Store user data and token in AuthContext
      // This should trigger automatic redirect to app
      if (userData.token) {
        console.log('🔐 EntraID callback: Saving token and redirecting...');
        
        // Use authStorage API to save data with proper encryption and format
        await saveAuthData.token(userData.token);
        await saveAuthData.user({ id: userData.id, username: userData.username });
        await saveAuthData.userDetail(userData);
        
        // Extract permissions in the format AuthContext expects
        const permissions = (userData.permissions || []).map(p => p.kod_prava || p);
        await saveAuthData.userPermissions(permissions);
        
        // Also save username separately for easy access (authStorage.js does this internally)
        // localStorage.setItem('username', userData.username); // Already done by saveAuthData.user()
        
        // Reload to trigger AuthContext initialization
        // Use homepage from package.json or fallback to /dev/eeo-v2
        const homepage = process.env.PUBLIC_URL || '/dev/eeo-v2';
        window.location.href = homepage;
      } else {
        console.error('🔐 EntraID callback: No token in response!');
        throw new Error('Chybí přihlašovací token');
      }
    } catch (error) {
      console.error('🔐 EntraID callback error:', error);
      setAccessDenied({ message: error.message || 'Přihlášení přes Microsoft selhalo' });
      setSsoInProgress(false);
    } finally {
      setEntraLoading(false);
    }
  };
  
  // Handle EntraID login button click
  const handleEntraLogin = async () => {
    setEntraLoading(true);
    
    try {
      // Get auth URL from central Auth API
      // Redirect zpět na homepage aplikace (ne na /login) po úspěšném přihlášení
      const homepage = process.env.PUBLIC_URL || '/dev/eeo-v2';
      
      const response = await fetch(`${CENTRAL_AUTH_URL}/login?redirect=${encodeURIComponent(homepage)}`, {
        credentials: 'include' // Include cookies
      });
      
      if (!response.ok) {
        throw new Error('Nepodařilo se získat přihlašovací URL');
      }
      
      const data = await response.json();
      
      // Redirect to Microsoft login page
      if (data.authUrl) {
        // Nastavit flag, aby SSO check po návratu z Microsoftu věděl že má zkontrolovat session
        sessionStorage.setItem('entra_login_pending', '1');
        window.location.href = data.authUrl;
      } else {
        throw new Error('Chybí přihlašovací URL v odpovědi');
      }
    } catch (error) {
      console.error('EntraID login error:', error);
      setAccessDenied({ message: error.message || 'Nepodařilo se zahájit přihlášení přes Microsoft' });
      setEntraLoading(false);
    }
  };

  // Autofill detection: some browsers don't fire onChange for saved credentials
  useEffect(() => {
    const syncAutofill = () => {
      const currentUsername = usernameRef.current?.value || '';
      const currentPassword = passwordRef.current?.value || '';

      if (!username && currentUsername) {
        setUsername(currentUsername);
      }
      if (!password && currentPassword) {
        setPassword(currentPassword);
      }
    };

    const rafId = requestAnimationFrame(syncAutofill);
    const timeoutId = setTimeout(syncAutofill, 300);

    // Short polling window to catch late autofill
    let attempts = 0;
    const intervalId = setInterval(() => {
      attempts += 1;
      syncAutofill();
      if ((usernameRef.current?.value && passwordRef.current?.value) || attempts >= 20) {
        clearInterval(intervalId);
      }
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [username, password]);

  // Zachycení kritických chyb z AuthContext (neaktivní účet, nedostatečná oprávnění)
  // a jejich zobrazení na AccessDenied stránce místo inline ErrorMessage
  useEffect(() => {
    if (error && (
      error.includes('neaktivní') ||
      error.includes('deaktivován') ||
      error.includes('nemá oprávnění') ||
      error.includes('nenalezen')
    )) {
      setAccessDenied({ message: error });
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      const currentUsername = usernameRef.current?.value || username;
      const currentPassword = passwordRef.current?.value || password;

      if (!currentUsername || !currentPassword) {
        return;
      }

      if (currentUsername !== username) {
        setUsername(currentUsername);
      }
      if (currentPassword !== password) {
        setPassword(currentPassword);
      }

      setLoading(true);
      await login(currentUsername, currentPassword); // Nové API2 očekává raw password, hashování řeší backend
    } catch (err) {
      // Error was normalized and set in AuthContext; no raw message logging here to avoid showing English/technical text to user.
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && (username || usernameRef.current?.value) && (password || passwordRef.current?.value);

  // 🔐 SSO probíhá – celostránkový loading (žádný blik login formuláře)
  if (ssoInProgress) {
    return (
      <Wrapper>
        <Container>
          <CardHeader>
            <Title>Ověřování</Title>
            <Subtitle>Probíhá přihlášení přes Microsoft 365</Subtitle>
          </CardHeader>
          <CardBody style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <LoadingSpinner style={{ width: 32, height: 32, margin: '0 auto 1rem', borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563eb' }} />
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Ověřuji identitu a oprávnění...</div>
          </CardBody>
        </Container>
      </Wrapper>
    );
  }

  // AccessDenied stránka - zobrazí se místo login formuláře
  if (accessDenied) {
    return (
      <Wrapper>
        <AccessDeniedCard>
          <AccessDeniedHeader>
            <Title>Přístup zamítnut</Title>
            <Subtitle>Do systému se nelze přihlásit</Subtitle>
          </AccessDeniedHeader>
          <CardBody>
            <AccessDeniedMessage>
              {accessDenied.message}
            </AccessDeniedMessage>
            <AccessDeniedButtons>
              <BtnPrimary
                href="#"
                onClick={(e) => { e.preventDefault(); setAccessDenied(null); }}
              >
                <ArrowLeft size={18} />
                Zpět na přihlášení EEO
              </BtnPrimary>
              <BtnSecondary
                href="https://erdms.zachranka.cz/dashboard"
              >
                <Home size={18} />
                Zpět na ERDMS rozcestník
              </BtnSecondary>
            </AccessDeniedButtons>
            <SupportSection>
              <SupportTitle>Technická podpora</SupportTitle>
              <SupportContact>Robert Holovský</SupportContact>
              <div>
                <SupportPhone href="tel:+420731137077">
                  <Phone size={14} />
                  731 137 077
                </SupportPhone>
              </div>
              <div>
                <SupportPhone href="tel:+420731137100">
                  <Phone size={14} />
                  731 137 100
                </SupportPhone>
              </div>
              <SupportHotline>Nonstop hotline</SupportHotline>
            </SupportSection>
          </CardBody>
        </AccessDeniedCard>
      </Wrapper>
    );
  }

  return (
    <>
      <Wrapper>
        <Container>
        <CardHeader>
          <Title>Přihlášení</Title>
          <Subtitle>Zadejte své přihlašovací údaje</Subtitle>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit}>
            <InputGroup>
              <InputLabel>Uživatelské jméno</InputLabel>
              <InputWrapper>
                <InputIcon>
                  <User size={20} />
                </InputIcon>
                <Input
                  type="text"
                  placeholder="Zadejte uživatelské jméno"
                  defaultValue={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onInput={(e) => setUsername(e.target.value)}
                  onFocus={() => {
                    const currentUsername = usernameRef.current?.value || '';
                    if (currentUsername && currentUsername !== username) {
                      setUsername(currentUsername);
                    }
                  }}
                  required
                  disabled={loading}
                  autoComplete="username"
                  ref={usernameRef}
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel>Heslo</InputLabel>
              <InputWrapper>
                <InputIcon>
                  <Lock size={20} />
                </InputIcon>
                <PasswordInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Zadejte heslo"
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={(e) => setPassword(e.target.value)}
                  onFocus={() => {
                    const currentPassword = passwordRef.current?.value || '';
                    if (currentPassword && currentPassword !== password) {
                      setPassword(currentPassword);
                    }
                  }}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  ref={passwordRef}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  title={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </PasswordToggle>
              </InputWrapper>
            </InputGroup>

            <Button type="submit" disabled={!canSubmit}>
              {loading ? (
                <>
                  <LoadingSpinner />
                  Přihlašuje se...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Přihlásit se
                </>
              )}
            </Button>

            {error && (
              <ErrorMessage>
                <AlertCircle size={16} />
                {error}
              </ErrorMessage>
            )}
          </form>
          
          {/* EntraID Login Button - conditional display */}
          {/* Show only if EntraID is enabled AND auth_mode is NOT 'local_only' */}
          {authConfig && authConfig.entra_enabled === '1' && authConfig.auth_mode !== 'local_only' && (
            <>
              <Divider>nebo</Divider>
              <EntraButton
                type="button"
                onClick={handleEntraLogin}
                disabled={loading || entraLoading}
              >
                {entraLoading ? (
                  <>
                    <LoadingSpinner />
                    Ověřování...
                  </>
                ) : (
                  <>
                    <MicrosoftIcon />
                    Přihlášení přes M365
                  </>
                )}
              </EntraButton>
            </>
          )}
        </CardBody>
      </Container>
      {needsPasswordChange && <ForcePasswordChangeDialog />}
    </Wrapper>
    </>
  );
};

export default Login;
