import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../layout/AppShell';
import DashboardPage from '../pages/DashboardPage';
import VehicleMapPage from '../pages/VehicleMapPage';
import StationAddressesPage from '../pages/StationAddressesPage';
import LoginPage from '../pages/LoginPage';
import VehicleDetailPage from '../pages/VehicleDetailPage';
import VehiclesOverviewPage from '../pages/VehiclesOverviewPage';
import UsersManagementPage from '../pages/UsersManagementPage';
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
        <Route path="stations" element={<StationAddressesPage />} />
        <Route
          path="users"
          element={(
            <ProtectedRoute allowedRoles={['superadmin', 'administrator']}>
              <UsersManagementPage />
            </ProtectedRoute>
          )}
        />
        <Route path="vehicles/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="map" element={<VehicleMapPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
