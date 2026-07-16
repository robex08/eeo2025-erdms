import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import DashboardPage from '../pages/DashboardPage';
import LegacyPage from '../pages/LegacyPage';
import LoginPage from '../pages/LoginPage';
import VehicleDetailPage from '../pages/VehicleDetailPage';
import VehiclesOverviewPage from '../pages/VehiclesOverviewPage';
import ProtectedRoute from '../auth/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesOverviewPage />} />
        <Route path="vehicles/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="legacy" element={<LegacyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
