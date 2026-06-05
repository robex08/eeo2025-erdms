import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedLayout from './components/ProtectedLayout';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  // Pro localhost použij /dev/intranet-web/ base path (Vite base config)
  // Pro produkci také /dev/intranet-web/
  const basename = '/dev/intranet-web';
  
  return (
    <BrowserRouter 
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
