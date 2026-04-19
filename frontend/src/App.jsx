import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import { useAuth } from './context/AuthContext';

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const PUBLIC_PATHS = ['/login', '/register'];

export default function App() {
  const path = usePathname();
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-center">Cargando...</div>;

  if (!user && !PUBLIC_PATHS.includes(path)) {
    navigate('/login');
    return null;
  }

  if (user && PUBLIC_PATHS.includes(path)) {
    navigate('/dashboard');
    return null;
  }

  if (path === '/login') return <LoginPage />;
  if (path === '/register') return <RegisterPage />;
  if (path === '/admin/users') return <AdminUsersPage navigate={navigate} />;
  return <DashboardPage navigate={navigate} />;
}
