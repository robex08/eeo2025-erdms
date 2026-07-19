import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <div className="center-panel">Načítám autentizaci...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.must_change_password && String(user?.auth_source || '').toLowerCase() === 'local') {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const currentRole = String(user?.role || '').toLowerCase();
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
