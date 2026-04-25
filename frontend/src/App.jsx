import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PricingPage from './pages/PricingPage';
import { useAuth } from './context/AuthContext';
import { api } from './api';

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

const PUBLIC_PATHS = ['/login', '/register', '/pricing'];

function UpgradeBanner({ token }) {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    async function check() {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const data = await api('/appointments?start=' + start + '&end=' + end, { token });
        const n = data.length;
        setCount(n);
        if (n >= LIMIT * 0.8) setShow(true);
      } catch (e) {}
    }
    if (token) check();
  }, [token]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 1000,
      background: count >= LIMIT ? '#ef4444' : '#f59e0b',
      color: 'white', padding: '1rem 1.5rem', borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: '320px'
    }}>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
        {count >= LIMIT ? 'Limite alcanzado' : 'Acercandote al limite'}
      </p>
      <p style={{ margin: '4px 0 12px', fontSize: '13px', opacity: 0.9 }}>
        {count} de {LIMIT} citas usadas este mes.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          style={{ flex: 1, padding: '6px 12px', background: 'white', color: count >= LIMIT ? '#ef4444' : '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
          onClick={() => navigate('/pricing')}
        >
          Ver planes
        </button>
        <button
          style={{ padding: '6px 10px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          onClick={() => setShow(false)}
        >
          X
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const path = usePathname();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      alert('Bienvenido a Citio PRO! Tu plan ha sido actualizado.');
    }
  }, []);

  if (loading) return <div className="p-6 text-center">Cargando...</div>;

  if (!user && !PUBLIC_PATHS.includes(path)) {
    navigate('/login');
    return null;
  }

  if (user && (path === '/login' || path === '/register')) {
    navigate('/dashboard');
    return null;
  }

  return (
    <>
      {path === '/login' && <LoginPage />}
      {path === '/register' && <RegisterPage />}
      {path === '/pricing' && <PricingPage />}
      {path === '/admin/users' && user && <AdminUsersPage navigate={navigate} />}
      {path === '/dashboard' && user && <DashboardPage navigate={navigate} />}
      {user && path === '/dashboard' && <UpgradeBanner token={token} />}
    </>
  );
}
