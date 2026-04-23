// Layout komponenta s hamburger menu
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaBarcode, FaClipboardList, FaBoxOpen, FaList } from 'react-icons/fa';
import './Layout.css';

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  
  // Full width pages
  const isFullWidth = ['/inventura', '/prehled', '/ciselniky'].includes(location.pathname);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Domů', icon: <FaBoxOpen /> },
    { path: '/sken', label: 'Sken čárového kódu', icon: <FaBarcode /> },
    { path: '/inventura', label: 'Inventura majetku', icon: <FaClipboardList /> },
    { path: '/prehled', label: 'Přehled majetku', icon: <FaList /> },
    { path: '/ciselniky', label: 'Číselníky', icon: <FaList /> },
  ];

  return (
    <div className="layout">
      {/* Header s hamburger ikonou */}
      <header className="layout-header">
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <div className="app-title-wrapper">
          <h1 className="app-title">Inventík</h1>
          <span className="app-subtitle">Pomocník při inventarizaci majetku</span>
        </div>
      </header>

      {/* Mobilní menu overlay */}
      {menuOpen && (
        <div className="menu-overlay" onClick={closeMenu}></div>
      )}

      {/* Sidebar menu */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h2>Menu</h2>
          <button className="menu-close" onClick={closeMenu}>
            <FaTimes />
          </button>
        </div>
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.path} className={isActive(item.path) ? 'active' : ''}>
              <Link to={item.path} onClick={closeMenu}>
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <main className={`layout-content ${isFullWidth ? 'content-full-width' : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
