import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';

const USER_FULLNAMES = {
  spravce: 'Správce vozového parku',
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
  const [username, setUsername] = useState(() => sessionStorage.getItem('username') || '');

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
  };

  const fullname = USER_FULLNAMES[username] || username;

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <MainLayout username={fullname} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/prehled" element={<Vehicles />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
