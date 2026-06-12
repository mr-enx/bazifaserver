import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'idle' || status === 'loading') {
    return null;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
