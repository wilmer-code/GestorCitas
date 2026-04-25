import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function PricingPage() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const params = new URLSearchParams(window.location.search);
  const cancelled = params.get('upgrade') === 'cancelled';

  async function handleUpgrade() {
    setError('');
    setLoading(true);
    try {
      const data = await api('/billing/create-checkout', { method: 'POST', token });
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    try {
      const data = await api('/billing/portal', { method: 'POST', token });
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  const isPro = user?.tenant?.plan === 'PRO' || user?.tenant?.plan === 'BUSINESS';

  return (
    <div className="login-wrap" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>Citio</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Planes simples, sin sorpresas</p>
          {cancelled && <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>Pago cancelado. Puedes intentarlo de nuevo cuando quieras.</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Free</h2>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: '1rem 0' }}>0 €<span style={{ fontSize: '1rem', fontWeight: 400, color: '#6b7280' }}>/mes</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0', lineHeight: 2 }}>
              <li>✓ Hasta 50 citas/mes</li>
              <li>✓ Hasta 100 clientes</li>
              <li>✓ Calendario y agenda</li>
              <li>✓ Notas por cliente</li>
              <li>✓ Recordatorios email</li>
              <li style={{ color: '#9ca3af' }}>✗ Soporte prioritario</li>
              <li style={{ color: '#9ca3af' }}>✗ Estadisticas avanzadas</li>
            </ul>
            <button
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: 'white' }}
              onClick={() => navigate('/dashboard')}
            >
              {isPro ? 'Plan anterior' : 'Plan actual'}
            </button>
          </div>

          <div style={{ background: 'white', border: '2px solid #2563eb', borderRadius: '12px', padding: '2rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', padding: '2px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
              MAS POPULAR
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>PRO</h2>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: '1rem 0' }}>9,99 €<span style={{ fontSize: '1rem', fontWeight: 400, color: '#6b7280' }}>/mes</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0', lineHeight: 2 }}>
              <li>✓ Hasta 500 citas/mes</li>
              <li>✓ Hasta 1.000 clientes</li>
              <li>✓ Calendario y agenda</li>
              <li>✓ Notas por cliente</li>
              <li>✓ Recordatorios email</li>
              <li>✓ Soporte prioritario</li>
              <li>✓ Estadisticas avanzadas</li>
            </ul>
            {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '0.5rem' }}>{error}</p>}
            {isPro ? (
              <button
                style={{ width: '100%', padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                onClick={handlePortal}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Gestionar suscripcion'}
              </button>
            ) : (
              <button
                style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? 'Redirigiendo...' : 'Actualizar a PRO'}
              </button>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Business</h2>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: '1rem 0' }}>29,99 €<span style={{ fontSize: '1rem', fontWeight: 400, color: '#6b7280' }}>/mes</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0', lineHeight: 2 }}>
              <li>✓ Citas ilimitadas</li>
              <li>✓ Clientes ilimitados</li>
              <li>✓ Todo lo de PRO</li>
              <li>✓ Multi-sede</li>
              <li>✓ API acceso</li>
              <li>✓ SLA garantizado</li>
              <li>✓ Onboarding personalizado</li>
            </ul>
            <button
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: 'white' }}
              onClick={() => window.open('mailto:hola@citio.app?subject=Plan Business', '_blank')}
            >
              Contactar
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
