import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchEntraLoginUrl } from '../services/apiClient';
import { useTheme } from '../theme/ThemeContext';
import AppIcon from '../components/ui/AppIcon';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithEntra, loginWithLocal } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithLocal(username.trim(), password);
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
      navigate('/', { replace: true });
      return;
    } catch {
      // Session not available yet, continue with redirect flow.
    }

    try {
      const redirectUrl = window.location.origin + '/dev/vehicles-v2';
      const response = await fetchEntraLoginUrl(redirectUrl);
      const authUrl = response?.data?.authUrl;
      if (authUrl) {
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

  return (
    <div className="login-screen">
      <div className="login-grid">
        <aside className="login-hero-card">
          <p className="eyebrow">Workspace Vehicles</p>
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
              <h2>Bezpečný přístup pro DEV</h2>
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
            Lokální přihlášení je povoleno pouze rolím superadmin a administrator. Ostatní uživatelé používají Entra ID
            podle autorizace.
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
    </div>
  );
}
