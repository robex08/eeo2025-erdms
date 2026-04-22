import React from 'react';
import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SkenPage from './pages/SkenPage';
import InventuraPage from './pages/InventuraPage';
import PrehledPage from './pages/PrehledPage';
import CiselnikyPage from './pages/CiselnikyPage';

function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      {isHomePage ? (
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/sken" element={<SkenPage />} />
            <Route path="/inventura" element={<InventuraPage />} />
            <Route path="/prehled" element={<PrehledPage />} />
            <Route path="/ciselniky" element={<CiselnikyPage />} />
          </Routes>
        </Layout>
      )}
    </>
  );
}

export default App;
