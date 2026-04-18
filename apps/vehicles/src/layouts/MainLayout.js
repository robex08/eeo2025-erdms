
import React, { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/layouts/MainLayout.css';

const MainLayout = ({ children, username, onLogout }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const navigate = useNavigate();
  const location = useLocation();
  // true pokud jsme na dashboardu nebo login page
  const isDashboard = location.pathname === '/';

  return (
    <div className="main-layout">
      <header className="main-header">
        {isMobile ? (
          <div style={{width:'100%'}}>
            <div style={{display:'flex',width:'100%',justifyContent:'space-between',alignItems:'center'}}>
              <div className="app-title" style={{display:'flex',alignItems:'center',gap:'0.6em'}}>
                <img src={`${process.env.PUBLIC_URL}/logo_zzs_main.png`} alt="ZZS SK Logo" style={{height:'42px',width:'auto'}} />
                <span>Vozidla ZZS SK, p.o.</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'0.2em'}}>
                {!isDashboard && (
                  <button className="back-btn" onClick={() => navigate('/')} title="Zpět na dashboard" aria-label="Zpět na dashboard">
                    <FiArrowLeft size={24} />
                  </button>
                )}
                <button className="logout-btn" onClick={onLogout} title="Odhlásit se">
                  <svg className="logout-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#2d3a4b" strokeWidth="2" fill="none"/>
                    <path d="M12 8V16" stroke="#2d3a4b" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 12H16" stroke="#2d3a4b" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M15 9L16 12L15 15" stroke="#2d3a4b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="user-name" style={{width:'100%',textAlign:'left',marginTop:'0.5em'}}>{username}</div>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',width:'100%'}}>
            <div className="app-title" style={{flex: '1 1 auto',display:'flex',alignItems:'center',gap:'0.8em'}}>
              <img src={`${process.env.PUBLIC_URL}/logo_zzs_main.png`} alt="ZZS SK Logo" style={{height:'50px',width:'auto'}} />
              <span>Vozidla ZZS SK, p.o.</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'1em'}}>
              <div className="user-name" style={{textAlign:'right',minWidth:'7em'}}>{username}</div>
              <button className="logout-btn" onClick={onLogout} title="Odhlásit se">
                <svg className="logout-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#2d3a4b" strokeWidth="2" fill="none"/>
                  <path d="M12 8V16" stroke="#2d3a4b" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 12H16" stroke="#2d3a4b" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M15 9L16 12L15 15" stroke="#2d3a4b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default MainLayout;
