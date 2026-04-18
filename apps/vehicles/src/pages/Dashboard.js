import React from 'react';
import '../styles/pages/Dashboard.css';


import { useNavigate } from 'react-router-dom';

const tilesData = [
  {
    title: 'Přehled vozidel',
    icon: '🚑',
    route: '/prehled',
  },
  {
    title: 'Číselník',
    icon: '📋',
    route: '#',
  },
  {
    title: 'Nastavení',
    icon: '⚙️',
    route: '#',
  },
];


const Dashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-row">
          {/* Barevná ikona dashboardu - grafické panely */}
          <svg className="dashboard-header-icon" width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="12" height="12" rx="3" fill="#2563eb"/>
            <rect x="22" y="6" width="12" height="12" rx="3" fill="#60a5fa"/>
            <rect x="4" y="24" width="12" height="10" rx="3" fill="#fbbf24"/>
            <rect x="22" y="24" width="12" height="10" rx="3" fill="#10b981"/>
          </svg>
          <h1>Dashboard</h1>
        </div>
      </div>
      <div className="dashboard-tiles">
        {tilesData.map((tile) => (
          <div
            className="dashboard-tile"
            key={tile.title}
            onClick={() => tile.route !== '#' && navigate(tile.route)}
            style={{ cursor: tile.route !== '#' ? 'pointer' : 'default' }}
          >
            <div className="tile-content">
              <span className="tile-icon">{tile.icon}</span>
              <span className="tile-title">{tile.title}</span>
            </div>
          </div>
        ))}
      </div>
      <footer className="dashboard-footer">
        <span className="dashboard-version">
          Verze aplikace: {process.env.REACT_APP_VERSION}
        </span>
      </footer>
    </div>
  );
};

export default Dashboard;
