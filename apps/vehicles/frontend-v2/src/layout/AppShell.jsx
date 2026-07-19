import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import AppIcon from '../components/ui/AppIcon';
import { fetchHealth } from '../services/apiClient';

const assetBase = import.meta.env.BASE_URL || '/';

const baseNavItems = [
  { to: '/', label: 'Nástěnka', icon: 'dashboard' },
  { to: '/vehicles', label: 'Přehled vozidel', icon: 'vehicles' },
  { to: '/stations', label: 'Seznam stanovišť', icon: 'map' },
  { to: '/map', label: 'Vozidla na mapě', icon: 'map' },
];

const stationSubmenuItems = [
  { hash: '#stations-main', label: 'Seznam stanovišť' },
  { hash: '#stations-webdispecink', label: 'Seznam adres z Webdispečinku' },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const appName = 'Auta ZZS';

  useEffect(() => {
    fetchHealth()
      .then((response) => setHealth(response))
      .catch(() => {
        setHealth({
          status: 'degraded',
          data: { appVersion: '0.90', database: 'vehicles-zzs-dev' },
        });
      });
  }, []);

  const apiStatus = health?.status || 'nacitam';
  const appVersion = health?.data?.appVersion || '0.90';
  const environment = health?.data?.environment || 'development';

  function formatAppVersion(version, env) {
    const cleanVersion = String(version || '').trim().replace(/^v\s*/i, '') || '0.90';
    const displayVersion = `v${cleanVersion}`;
    const normalizedEnv = String(env || '').toLowerCase();
    return normalizedEnv === 'production' ? displayVersion : `${displayVersion} DEV`;
  }

  function formatServiceStatus(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'ok') {
      return 'V pořádku';
    }
    if (normalized === 'degraded') {
      return 'Omezený provoz';
    }
    if (normalized === 'error' || normalized === 'failed') {
      return 'Nedostupné';
    }
    return 'Načítám';
  }

  const displayVersion = formatAppVersion(appVersion, environment);
  const serviceStatus = formatServiceStatus(apiStatus);
  const currentRole = String(user?.role || '').toLowerCase();
  const canManageUsers = currentRole === 'superadmin' || currentRole === 'administrator';
  const navItems = canManageUsers
    ? [...baseNavItems, { to: '/users', label: 'Správa uživatelů', icon: 'users' }]
    : baseNavItems;

  function scrollToStationAnchor(hash) {
    const targetId = String(hash || '').replace(/^#/, '');
    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleStationSubmenuClick(hash) {
    setMobileOpen(false);

    const searchPart = location.search || '';

    if (location.pathname !== '/stations') {
      navigate(`/stations${searchPart}${hash}`);
      return;
    }

    if (location.hash !== hash) {
      navigate(`/stations${searchPart}${hash}`, { replace: true });
    }

    // Scroll immediately for same-hash repeated clicks and as fallback when hash does not change.
    scrollToStationAnchor(hash);
    window.requestAnimationFrame(() => scrollToStationAnchor(hash));
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="brand-heading">
            <h1>{appName}</h1>
            <span className="brand-version">{displayVersion}</span>
          </div>

          <div className="sidebar-profile-card">
            <div className="sidebar-profile-head">
              <div className="sidebar-profile-eyebrow">Přihlášený uživatel</div>
              <button
                className="theme-toggle icon-only-btn sidebar-theme-icon-btn"
                type="button"
                onClick={toggleTheme}
                aria-label="Přepnout barevné schéma"
                title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
              >
                <AppIcon name={isDark ? 'themeLight' : 'themeDark'} size={17} weight="duotone" />
              </button>
            </div>
            <div className="sidebar-profile-name">{user?.display_name || user?.username || 'Neznámý uživatel'}</div>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const showStationSubmenu = item.to === '/stations' && location.pathname === '/stations';

            return (
              <div key={item.to} className="nav-item-group">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="nav-item-content">
                    <AppIcon name={item.icon} size={18} weight="duotone" />
                    <span>{item.label}</span>
                  </span>
                </NavLink>

                {showStationSubmenu ? (
                  <div className="nav-submenu" aria-label="Podmenu stanovišť">
                    {stationSubmenuItems.map((subItem) => (
                      <button
                        key={subItem.hash}
                        type="button"
                        className={`nav-subitem${location.hash === subItem.hash ? ' active' : ''}`}
                        onClick={() => handleStationSubmenuClick(subItem.hash)}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-meta">
          <button className="btn btn-ghost btn-sidebar-logout" type="button" onClick={handleLogout}>
            <AppIcon name="logout" size={16} weight="duotone" />
            Odhlásit
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-brand" aria-label="ZZS identita">
            <img className="topbar-logo" src={`${assetBase}logo_zzs_main.png`} alt="ZZS SK Logo" />
            <div className="topbar-brand-text">
              <strong>Zdravotnická záchranná služba Středočeského kraje, p.o.</strong>
              <span>správa vozového parku</span>
            </div>
          </div>

          <button
            className="mobile-toggle"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Přepnout menu"
          >
            <AppIcon name="menu" size={18} weight="duotone" />
            <span>Nabídka</span>
          </button>
        </header>

        <main className="content-panel">
          <Outlet />
        </main>

        <footer className="footer-note">
          <span className="footer-note-line">
            Verze aplikace: {displayVersion} | Stav služby: {serviceStatus}
          </span>
        </footer>
      </div>
    </div>
  );
}
