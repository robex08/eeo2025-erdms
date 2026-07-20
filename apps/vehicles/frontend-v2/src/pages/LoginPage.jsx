import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchEntraLoginUrl, fetchHealth } from '../services/apiClient';
import { useTheme } from '../theme/ThemeContext';
import AppIcon from '../components/ui/AppIcon';

const ENTRA_LOGIN_PENDING_KEY = 'vehicles_v2_entra_login_pending';

function resolveEntraRedirectUrl() {
  const configuredPath = String(
    import.meta.env.VITE_ENTRA_REDIRECT_PATH || import.meta.env.VITE_APP_BASE_PATH || '/dev/vehicles-v2/'
  ).trim();
  const normalizedPath = configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`;

  return window.location.origin + normalizedPath.replace(/\/$/, '');
}

function formatAppVersion(version, env) {
  const cleanVersion = String(version || '').trim().replace(/^v\s*/i, '') || '0.91';
  const displayVersion = `v${cleanVersion}`;
  return String(env || '').toLowerCase() === 'production' ? displayVersion : `${displayVersion} DEV`;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appVersion, setAppVersion] = useState('v0.91');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordDialogError, setPasswordDialogError] = useState('');
  const [passwordDialogSaving, setPasswordDialogSaving] = useState(false);
  const { user, isLoading, isAuthenticated, changeLocalPassword, loginWithEntra, loginWithLocal, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const entraAutoLoginAttemptedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    fetchHealth()
      .then((response) => {
        if (!alive) {
          return;
        }

        setAppVersion(formatAppVersion(response?.data?.appVersion, response?.data?.environment));
      })
      .catch(() => {
        if (!alive) {
          return;
        }

        setAppVersion('v0.91');
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const shouldForcePasswordChange = Boolean(
      isAuthenticated
      && user?.must_change_password
      && String(user?.auth_source || '').toLowerCase() === 'local'
    );

    setPasswordDialogOpen(shouldForcePasswordChange);
    if (!shouldForcePasswordChange) {
      setPasswordDialogError('');
      setNewPassword('');
      setNewPasswordConfirm('');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasPendingEntraLogin = sessionStorage.getItem(ENTRA_LOGIN_PENDING_KEY) === '1';
    if (!hasPendingEntraLogin || isLoading || isAuthenticated || entraAutoLoginAttemptedRef.current) {
      return;
    }

    entraAutoLoginAttemptedRef.current = true;
    setError('');
    setLoading(true);

    loginWithEntra()
      .then(() => {
        sessionStorage.removeItem(ENTRA_LOGIN_PENDING_KEY);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        sessionStorage.removeItem(ENTRA_LOGIN_PENDING_KEY);
        const apiMessage = err?.response?.data?.error?.message;
        setError(apiMessage || 'Přihlášení přes Entra ID se po návratu nedokončilo. Klikněte prosím znovu.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, isLoading, loginWithEntra, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginWithLocal(username.trim(), password);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ENTRA_LOGIN_PENDING_KEY);
      }
      if (response?.data?.user?.must_change_password) {
        setPasswordDialogOpen(true);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Přihlášení se nepodařilo. Zkontrolujte údaje nebo použijte Entra ID z Dashboardu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEntraLogin() {
    setError('');
    setLoading(true);

    try {
      await loginWithEntra();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ENTRA_LOGIN_PENDING_KEY);
      }
      navigate('/', { replace: true });
      return;
    } catch {
      // Session not available yet, continue with redirect flow.
    }

    try {
      const redirectUrl = resolveEntraRedirectUrl();
      const response = await fetchEntraLoginUrl(redirectUrl);
      const authUrl = response?.data?.authUrl;
      if (authUrl) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(ENTRA_LOGIN_PENDING_KEY, '1');
        }
        window.location.href = authUrl;
        return;
      }

      setError('Nepodařilo se získat Entra přihlašovací URL.');
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setError(apiMessage || 'Přihlášení přes Entra ID se nepodařilo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForcedPasswordChangeSubmit(event) {
    event.preventDefault();
    setPasswordDialogError('');

    if (newPassword.trim().length < 8) {
      setPasswordDialogError('Nové heslo musí mít alespoň 8 znaků.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordDialogError('Nové heslo a potvrzení hesla se neshodují.');
      return;
    }

    setPasswordDialogSaving(true);
    try {
      await changeLocalPassword(newPassword);
      setPasswordDialogOpen(false);
      setNewPassword('');
      setNewPasswordConfirm('');
      navigate('/', { replace: true });
    } catch (err) {
      const apiMessage = err?.response?.data?.error?.message;
      setPasswordDialogError(apiMessage || 'Změna hesla se nepodařila.');
    } finally {
      setPasswordDialogSaving(false);
    }
  }

  async function handleForcedPasswordChangeCancel() {
    if (passwordDialogSaving) {
      return;
    }

    await signOut();
    setPasswordDialogOpen(false);
    setNewPassword('');
    setNewPasswordConfirm('');
    setPasswordDialogError('');
  }

  return (
    <div className="login-screen">
      <div className="login-grid">
        <aside className="login-hero-card">
          <div className="login-hero-head">
            <p className="eyebrow">Workspace Vehicles V2</p>
            <span className="login-version-badge">{appVersion}</span>
          </div>
          <h1>Moderní správa vozidel</h1>
          <p className="muted">
            Jednotný vstup do nové verze aplikace. Rozhraní je připravené pro postupné rozšíření agendy vozidel.
          </p>
          <ul className="login-bullets">
            <li><AppIcon name="sync" size={16} weight="duotone" />Průběžná aktualizace dat</li>
            <li><AppIcon name="vehicles" size={16} weight="duotone" />Detailní karta vozidla</li>
            <li><AppIcon name="warning" size={16} weight="duotone" />Hybridní autentizace Entra ID + lokální administrace</li>
          </ul>
        </aside>

        <div className="login-card">
          <div className="login-card-head">
            <div>
              <p className="eyebrow">Přihlášení</p>
              <h2>Bezpečný přístup</h2>
            </div>
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label="Přepnout barevné schéma"
              title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
            >
              {isDark ? 'Světlý' : 'Tmavý'}
            </button>
          </div>

          <p className="muted">
            Uživatel s lokálním účtem a heslem se může přihlásit jménem a heslem. Nový uživatel přes Entra ID se po prvním
            pokusu založí do systému a čeká na schválení správcem.
          </p>

          <button className="btn btn-ghost" type="button" onClick={handleEntraLogin} disabled={loading}>
            Přihlásit přes Entra ID
          </button>

          <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">Uživ. jméno</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Uživ. jméno"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Heslo</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            autoComplete="current-password"
            required
          />

          {error ? <div className="error-box">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Přihlašuji...' : 'Přihlásit'}
          </button>
          </form>
        </div>
      </div>

      {passwordDialogOpen ? (
        <div className="station-edit-modal-backdrop" role="presentation">
          <div className="station-edit-modal login-password-modal" role="dialog" aria-modal="true" aria-label="Vynucená změna hesla" onClick={(event) => event.stopPropagation()}>
            <div className="station-edit-modal-head">
              <h3 className="title-with-icon">
                <AppIcon name="warning" size={18} weight="duotone" />
                <span>Vynucená změna hesla</span>
              </h3>
            </div>

            <p className="muted">Při lokálním přihlášení je pro tento účet povinné nastavit nové heslo. Po úspěšné změně se požadavek automaticky zruší.</p>

            <form className="station-edit-form-grid user-admin-form-grid" onSubmit={handleForcedPasswordChangeSubmit}>
              <label className="station-edit-grid-full">
                Nové heslo
                <input
                  className="search-input"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={passwordDialogSaving}
                  autoComplete="new-password"
                />
              </label>

              <label className="station-edit-grid-full">
                Potvrzení nového hesla
                <input
                  className="search-input"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  disabled={passwordDialogSaving}
                  autoComplete="new-password"
                />
              </label>

              {passwordDialogError ? <div className="status-box station-edit-grid-full">{passwordDialogError}</div> : null}

              <div className="station-edit-modal-actions station-edit-grid-full">
                <button className="table-pager-btn" type="button" onClick={() => void handleForcedPasswordChangeCancel()} disabled={passwordDialogSaving}>
                  Odhlásit
                </button>
                <button className="table-pager-btn station-edit-save-btn" type="submit" disabled={passwordDialogSaving}>
                  {passwordDialogSaving ? 'Ukládám...' : 'Uložit nové heslo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
